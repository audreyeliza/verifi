// "How does this law change affect me?" — pure functions, no I/O.
//
// Each RuleUpdate may carry an `impact_key`. If there's a matching function here,
// it reads the person's profile and gives a specific answer. Otherwise we fall
// back to "does this touch a program you're in?".
//
// Returns { level: 'affected' | 'maybe' | 'not_affected', message }

const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

// 80 hours × federal minimum wage ($7.25) — Medicaid's income way to meet the rule.
const MEDICAID_WORK_INCOME = 580;

const IMPACTS = {
  // H.R.1: Medicaid work & community engagement, Ohio Group VIII adults 19–64, from Jan 1, 2027.
  medicaid_work_requirement(applicant) {
    const age = Number(applicant.age);
    if (age && (age < 19 || age > 64)) {
      return { level: 'not_affected', message: 'This applies to adults 19–64, so it likely doesn’t apply to you.' };
    }
    if (applicant.has_young_child_or_pregnant) {
      return {
        level: 'maybe',
        message:
          'Pregnant people and parents of young children are exempt. You may not need to do anything, but confirm your exemption at renewal.',
      };
    }
    if (Number(applicant.monthly_income) >= MEDICAID_WORK_INCOME) {
      return {
        level: 'affected',
        message: `Your income of ${money(applicant.monthly_income)}/mo is above ${money(MEDICAID_WORK_INCOME)}/mo, so you likely already meet it. Keep your pay stubs up to date in Verifi.`,
      };
    }
    return {
      level: 'affected',
      message: `You'll need 80 hours a month of work, school, job training or volunteering, or at least ${money(MEDICAID_WORK_INCOME)}/mo in income, to keep Medicaid.`,
    };
  },

  // H.R.1: Medicaid renewals every 6 months for expansion adults, renewals from Jan 2027.
  medicaid_six_month_renewal(applicant) {
    const age = Number(applicant.age);
    if (age && age < 19) {
      return { level: 'not_affected', message: 'This applies to adults, not children’s coverage.' };
    }
    return {
      level: 'affected',
      message: 'You’ll renew Medicaid twice a year instead of once. Verifi will remind you and re-check your info so renewals take less work.',
    };
  },

  // H.R.1 SNAP work rules (Ohio, from Feb 1, 2026): adults 18–64 without a child under 14.
  snap_work_requirement(applicant) {
    const age = Number(applicant.age);
    if (age && (age < 18 || age > 64)) {
      return { level: 'not_affected', message: 'This applies to adults 18–64, so it likely doesn’t apply to you.' };
    }
    if (applicant.has_young_child_or_pregnant) {
      return { level: 'not_affected', message: 'Parents of a child under 14 are exempt, so this likely doesn’t apply to you.' };
    }
    if (Number(applicant.children_count) > 0) {
      return {
        level: 'maybe',
        message:
          'If all your children are 14 or older, you now need 80 hours a month of work or training to keep SNAP longer than 3 months. If any child is under 14, you’re exempt.',
      };
    }
    return {
      level: 'affected',
      message: 'You need 80 hours a month of work, training or volunteering, or SNAP is limited to 3 months every 3 years.',
    };
  },
};

// `programsInUse`: program keys the person applied to or is likely eligible for.
export function personalImpact(update, applicant, programsInUse = []) {
  const touches = (update.programs ?? []).some((p) => programsInUse.includes(p));
  if (!touches) {
    return { level: 'not_affected', message: 'This doesn’t touch any program you’re in right now.' };
  }
  const fn = IMPACTS[update.impact_key];
  if (fn && applicant) return fn(applicant);
  return { level: 'maybe', message: 'This affects a program you’re in. Read what’s changing below.' };
}

export const IMPACT_KEYS = Object.keys(IMPACTS);
