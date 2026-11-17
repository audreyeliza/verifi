// Run with: npm test
// Expected values are worked by hand from the 2026 HHS poverty guidelines and the
// SNAP FY2027 COLA tables. When the tables in eligibility.js change, update these.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { annualFpl, monthlyFpl, checkEligibility, missingFields } from './eligibility.js';

const byKey = (results) => Object.fromEntries(results.map((r) => [r.key, r]));

test('2026 poverty guidelines match the HHS table', () => {
  assert.equal(annualFpl(1), 15960);
  assert.equal(annualFpl(3), 27320);
  assert.equal(annualFpl(4), 33000);
  assert.equal(annualFpl(8), 55720);
  assert.equal(annualFpl(9), 55720 + 5680);
});

test('household of 3, $2,100/mo, young child: likely eligible for all four', () => {
  const r = byKey(
    checkEligibility({ household_size: 3, children_count: 2, has_young_child_or_pregnant: true, monthly_income: 2100 })
  );
  for (const key of ['SNAP', 'WIC', 'LIHEAP', 'Medicaid']) assert.equal(r[key].result, 'Likely eligible', key);
  // SNAP: net = 2100*0.8 - 217 = 1463; 808 - 0.3*1463 = 369.1
  assert.equal(r.SNAP.amount, 369);
  assert.equal(r.Medicaid.benefit, 'Covered: 1 adult + 2 children');
});

test('SNAP gross limit is 130% of poverty', () => {
  const limit = monthlyFpl(3) * 1.3; // ~2959.67
  assert.equal(byKey(checkEligibility({ household_size: 3, monthly_income: limit })).SNAP.result, 'Likely eligible');
  // Just over the limit but within the 5% review band
  assert.equal(byKey(checkEligibility({ household_size: 3, monthly_income: limit + 50 })).SNAP.result, 'Needs review');
  // Well over
  assert.equal(byKey(checkEligibility({ household_size: 3, monthly_income: limit * 1.2 })).SNAP.result, 'Not eligible');
});

test('SNAP minimum benefit applies to 1–2 person households', () => {
  // 1 person, $1,600: net = 1280 - 217 = 1063; 306 - 318.9 < 0 → minimum $24
  const r = byKey(checkEligibility({ household_size: 1, monthly_income: 1600 }));
  assert.equal(r.SNAP.result, 'Likely eligible');
  assert.equal(r.SNAP.amount, 24);
});

test('no income gets the full SNAP allotment', () => {
  assert.equal(byKey(checkEligibility({ household_size: 4, monthly_income: 0 })).SNAP.amount, 1023);
  assert.equal(byKey(checkEligibility({ household_size: 10, monthly_income: 0 })).SNAP.amount, 1841 + 2 * 225);
});

test('Medicaid: children can qualify when parents are over the adult limit', () => {
  // Adult limit 138% (~3141.80/mo for 3), child limit 206% (~4689.93/mo)
  const r = byKey(checkEligibility({ household_size: 3, children_count: 2, monthly_income: 3600 }));
  assert.equal(r.Medicaid.result, 'Likely eligible');
  assert.equal(r.Medicaid.benefit, 'Covered: 2 children');

  const noKids = byKey(checkEligibility({ household_size: 3, children_count: 0, monthly_income: 3600 }));
  assert.equal(noKids.Medicaid.result, 'Not eligible');
});

test('WIC requires a pregnant person or child under 5', () => {
  const base = { household_size: 3, children_count: 2, monthly_income: 2100 };
  assert.equal(byKey(checkEligibility(base)).WIC.result, 'Not eligible');
  assert.equal(byKey(checkEligibility({ ...base, has_young_child_or_pregnant: true })).WIC.result, 'Likely eligible');
});

test('HEAP limit is 175% of poverty', () => {
  // 1 person: 15960 * 1.75 / 12 = 2327.50 (OCC lists $27,930/yr)
  assert.equal(byKey(checkEligibility({ household_size: 1, monthly_income: 2327 })).LIHEAP.result, 'Likely eligible');
  assert.equal(byKey(checkEligibility({ household_size: 1, monthly_income: 2600 })).LIHEAP.result, 'Not eligible');
});

test('overrides answer "what if" questions without changing the profile', () => {
  const profile = { household_size: 1, monthly_income: 1500 };
  const now = byKey(checkEligibility(profile));
  const raise = byKey(checkEligibility(profile, { monthly_income: 2500 }));
  assert.equal(now.SNAP.result, 'Likely eligible');
  assert.equal(raise.SNAP.result, 'Not eligible');
  assert.equal(profile.monthly_income, 1500);
});

test('missingFields reports what blocks an estimate', () => {
  assert.deepEqual(missingFields({}), ['household size', 'monthly income']);
  assert.deepEqual(missingFields({ household_size: 2, monthly_income: 0 }), []);
});
