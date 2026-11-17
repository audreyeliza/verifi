// Eligibility estimates from published program rules (Ohio).
//
// Pure functions, no I/O — safe to call from any page (Results, a raise
// calculator, change alerts). Everything is an ESTIMATE: final decisions are
// made by each agency. Numbers below are annual figures that change every year;
// update them when the new tables are published and bump RULES_YEAR.
//
// When each table rolls over (update these, then run `npm test`):
// - HHS poverty guidelines: published each January.
//   https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines
//   Ohio Medicaid adopts them ~March, WIC on July 1, Ohio HEAP for the July–May season,
//   SNAP on October 1 (SNAP FY2027 limits use the 2026 guidelines).
// - SNAP max allotments + deductions: USDA COLA memo, effective each October 1.
//   https://www.fns.usda.gov/snap/allotment/cola
// - Ohio Medicaid MAGI limits: https://medicaid.ohio.gov (eligibility chart)
// - Ohio HEAP (175% FPL): https://development.ohio.gov / ODJFS Energy Assistance
// - WIC (185% FPL): https://www.fns.usda.gov/wic/eligibility

// Shown to users next to every estimate.
export const RULES_YEAR = '2026 poverty guidelines · SNAP FY2027';

// HHS 2026 poverty guideline, 48 contiguous states + DC:
// $15,960 for 1 person, +$5,680 per additional person (household of 4 = $33,000).
const FPL_BASE = 15960;
const FPL_PER_PERSON = 5680;

// SNAP FY2027 (Oct 1, 2026 – Sep 30, 2027), 48 states + DC.
const SNAP_MAX_ALLOTMENT = [306, 562, 808, 1023, 1217, 1463, 1616, 1841];
const SNAP_MAX_EXTRA_PERSON = 225;
const SNAP_STANDARD_DEDUCTION = [217, 217, 217, 229, 268, 308];
// Minimum benefit for 1–2 person households = 8% of the 1-person max, rounded down.
const SNAP_MIN_BENEFIT = Math.floor(SNAP_MAX_ALLOTMENT[0] * 0.08);
const SNAP_GROSS_LIMIT = 1.3; // 130% FPL
const SNAP_EARNED_INCOME_DEDUCTION = 0.2;

const MEDICAID_ADULT_LIMIT = 1.38; // Ohio expansion adults
const MEDICAID_CHILD_LIMIT = 2.06; // Ohio children (Medicaid + CHIP)
const WIC_LIMIT = 1.85;
const HEAP_LIMIT = 1.75; // Ohio HEAP

// Within this fraction above a limit we say "Needs review" instead of "Not eligible":
// deductions we can't see (childcare, rent, medical) may still bring them under.
const REVIEW_BAND = 0.05;

export const annualFpl = (householdSize) =>
  FPL_BASE + FPL_PER_PERSON * Math.max(0, householdSize - 1);

export const monthlyFpl = (householdSize) => annualFpl(householdSize) / 12;

const pick = (table, size, extraPerPerson = 0) => {
  if (size <= table.length) return table[Math.max(0, size - 1)];
  return table[table.length - 1] + extraPerPerson * (size - table.length);
};

const round = (n) => Math.round(n);
const money = (n) => `$${round(n).toLocaleString('en-US')}`;

// Compare income to a percent-of-FPL limit and classify.
function testLimit(income, size, limitPct) {
  const limit = monthlyFpl(size) * limitPct;
  if (income <= limit) return { result: 'Likely eligible', limit };
  if (income <= limit * (1 + REVIEW_BAND)) return { result: 'Needs review', limit };
  return { result: 'Not eligible', limit };
}

function snap({ income, size }) {
  const gross = testLimit(income, size, SNAP_GROSS_LIMIT);
  if (gross.result === 'Not eligible') {
    return {
      ...gross,
      amount: 0,
      benefit: 'Over the limit',
      reason: `Gross income ${money(income)}/mo is above SNAP's limit of ${money(gross.limit)}/mo for ${size}.`,
    };
  }
  // Net income approximation: earned income deduction + standard deduction.
  // Shelter, childcare and medical deductions would raise the benefit further.
  const standard = pick(SNAP_STANDARD_DEDUCTION, size);
  const net = Math.max(0, income * (1 - SNAP_EARNED_INCOME_DEDUCTION) - standard);

  // Second test: net income must be at or under 100% of the poverty line. We can't
  // see shelter/childcare deductions, which often bring people under it, so a
  // failure here is "Needs review" rather than a flat no.
  const netLimit = monthlyFpl(size);
  if (net > netLimit) {
    return {
      result: 'Needs review',
      limit: gross.limit,
      amount: 0,
      benefit: 'Depends on rent and childcare',
      reason: `Gross income passes, but net income (~${money(net)}/mo) is above SNAP's net limit of ${money(netLimit)}/mo before rent and childcare deductions. A caseworker will check those.`,
    };
  }

  const max = pick(SNAP_MAX_ALLOTMENT, size, SNAP_MAX_EXTRA_PERSON);
  let amount = round(max - net * 0.3);
  if (size <= 2) amount = Math.max(amount, SNAP_MIN_BENEFIT);
  amount = Math.max(0, amount);
  return {
    ...gross,
    amount,
    benefit: amount > 0 ? `~${money(amount)}/mo` : '$0 estimated',
    reason: `Income is under SNAP's limit of ${money(gross.limit)}/mo for ${size}. Estimate before rent and childcare deductions, which can raise it.`,
  };
}

function medicaid({ income, size, children }) {
  const adult = testLimit(income, size, MEDICAID_ADULT_LIMIT);
  const child = testLimit(income, size, MEDICAID_CHILD_LIMIT);
  const adults = Math.max(1, size - children);

  if (adult.result !== 'Not eligible') {
    const who = children > 0 ? `${adults} adult${adults > 1 ? 's' : ''} + ${children} child${children > 1 ? 'ren' : ''}` : 'Adults in household';
    return {
      result: adult.result,
      limit: adult.limit,
      amount: 0,
      benefit: `Covered: ${who}`,
      reason: `Income is under Ohio Medicaid's adult limit of ${money(adult.limit)}/mo.`,
    };
  }
  if (children > 0 && child.result !== 'Not eligible') {
    return {
      result: child.result,
      limit: child.limit,
      amount: 0,
      benefit: `Covered: ${children} child${children > 1 ? 'ren' : ''}`,
      reason: `Adults are over the limit, but children qualify up to ${money(child.limit)}/mo.`,
    };
  }
  return {
    result: 'Not eligible',
    limit: children > 0 ? child.limit : adult.limit,
    amount: 0,
    benefit: 'Over the limit',
    reason: `Income is above Ohio Medicaid's limit of ${money(children > 0 ? child.limit : adult.limit)}/mo for ${size}.`,
  };
}

function wic({ income, size, youngChildOrPregnant }) {
  if (!youngChildOrPregnant) {
    return {
      result: 'Not eligible',
      limit: monthlyFpl(size) * WIC_LIMIT,
      amount: 0,
      benefit: 'Not applicable',
      reason: 'WIC is for pregnant or postpartum people and children under 5.',
    };
  }
  const test = testLimit(income, size, WIC_LIMIT);
  return {
    ...test,
    amount: 0,
    benefit: test.result === 'Not eligible' ? 'Over the limit' : 'Monthly food package',
    reason:
      test.result === 'Not eligible'
        ? `Income is above WIC's limit of ${money(test.limit)}/mo for ${size}.`
        : `Income is under WIC's limit of ${money(test.limit)}/mo for ${size}.`,
  };
}

function heap({ income, size }) {
  const test = testLimit(income, size, HEAP_LIMIT);
  return {
    ...test,
    amount: 0,
    benefit: test.result === 'Not eligible' ? 'Over the limit' : 'Help with energy bills',
    reason:
      test.result === 'Not eligible'
        ? `Income is above Ohio HEAP's limit of ${money(test.limit)}/mo for ${size}.`
        : `Income is under Ohio HEAP's limit of ${money(test.limit)}/mo for ${size}.`,
  };
}

export const PROGRAM_INFO = {
  SNAP: { label: 'SNAP', name: 'Food assistance', check: snap },
  WIC: { label: 'WIC', name: 'Women, Infants & Children', check: wic },
  LIHEAP: { label: 'HEAP', name: 'Home energy assistance', check: heap },
  Medicaid: { label: 'Medicaid', name: 'Health coverage', check: medicaid },
};

export const PROGRAM_KEYS = Object.keys(PROGRAM_INFO);

// Which profile fields are required before we can estimate anything.
export function missingFields(applicant) {
  const missing = [];
  if (!(applicant?.household_size >= 1)) missing.push('household size');
  if (applicant?.monthly_income == null || applicant.monthly_income === '') missing.push('monthly income');
  return missing;
}

// Main entry point. `overrides` lets callers ask "what if" (e.g. a raise):
//   checkEligibility(applicant, { monthly_income: applicant.monthly_income + 300 })
// Returns one result per program:
//   { key, label, name, result: 'Likely eligible'|'Needs review'|'Not eligible',
//     amount (monthly $ where estimable, else 0), benefit (display text), reason, limit }
export function checkEligibility(applicant, overrides = {}) {
  const profile = { ...applicant, ...overrides };
  const input = {
    income: Number(profile.monthly_income) || 0,
    size: Math.max(1, Number(profile.household_size) || 1),
    children: Math.max(0, Number(profile.children_count) || 0),
    youngChildOrPregnant: Boolean(profile.has_young_child_or_pregnant),
  };
  return PROGRAM_KEYS.map((key) => {
    const info = PROGRAM_INFO[key];
    return { key, label: info.label, name: info.name, ...info.check(input) };
  });
}
