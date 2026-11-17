import { test } from 'node:test';
import assert from 'node:assert/strict';
import { combineStubs, monthlyEquivalent } from './income.js';

test('monthly equivalent uses the pay-period multipliers', () => {
  assert.equal(monthlyEquivalent(500, 'weekly'), Math.round(500 * 52 / 12));
  assert.equal(monthlyEquivalent(1000, 'biweekly'), Math.round(1000 * 26 / 12));
  assert.equal(monthlyEquivalent(1200, 'semimonthly'), 2400);
  assert.equal(monthlyEquivalent(3000, 'monthly'), 3000);
  assert.equal(monthlyEquivalent(100, ''), null);
});

test('two stubs from the same job use the newest one, then jobs are added', () => {
  const combined = combineStubs([
    { employer: 'Cafe', pay_date: '2026-01-01', monthly_equivalent: 1800 },
    { employer: 'cafe', pay_date: '2026-02-01', monthly_equivalent: 2000 },
    { employer: 'Warehouse', pay_date: '2026-02-01', monthly_equivalent: 900 },
  ]);
  assert.equal(combined.monthly_income, 2900);
  assert.equal(combined.employer, 'cafe, Warehouse');
});
