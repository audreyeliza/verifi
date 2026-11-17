// Eligibility estimates from published program rules (Ohio).
//
// Pure functions, no I/O — safe to call from any page (Results, a raise
// calculator, change alerts). Everything is an ESTIMATE: final decisions are
// made by each agency. Numbers below are annual figures that change every year;
// update them when the new tables are published and bump RULES_YEAR.
//
// Sources to re-check each year:
// - HHS poverty guidelines (48 contiguous states): https://aspe.hhs.gov/poverty-guidelines
// - SNAP max allotments + standard deduction: https://www.fns.usda.gov/snap/allotment/cola
// - Ohio Medicaid income limits: https://medicaid.ohio.gov
// - Ohio HEAP income limit: https://development.ohio.gov (Home Energy Assistance Program)
// - WIC income limit (185% FPL): https://www.fns.usda.gov/wic/eligibility

export const RULES_YEAR = 'FPL 2025 · SNAP FY2026';

// HHS 2025 poverty guideline: $15,650 for 1 person, +$5,500 per additional person.
const FPL_BASE = 15650;
const FPL_PER_PERSON = 5500;

// SNAP FY2026 (Oct 2025 – Sep 2026), 48 states.
const SNAP_MAX_ALLOTMENT = [298, 546, 785, 994, 1183, 1421, 1571, 1789];
const SNAP_MAX_EXTRA_PERSON = 218;
const SNAP_STANDARD_DEDUCTION = [209, 209, 209, 223, 261, 299];
const SNAP_MIN_BENEFIT = 24; // for 1–2 person households
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
