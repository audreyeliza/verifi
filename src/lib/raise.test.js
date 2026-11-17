import { test } from 'node:test';
import assert from 'node:assert/strict';
import { incomeFromHours, raiseOutcome, raiseSummary } from './raise.js';

const row = (key, result, amount, benefit = '') => ({ key, result, amount, benefit });

test('extra hours become monthly pay', () => {
  const result = incomeFromHours(2000, 10, 15);
  assert.equal(result.extra, Math.round(10 * 15 * 52 / 12));
  assert.equal(result.newIncome, 2000 + result.extra);
});

test('net is extra pay minus SNAP dollars lost', () => {
  const before = [
    row('SNAP', 'Likely eligible', 400, '~$400/mo'),
    row('Medicaid', 'Likely eligible', 0, 'Covered: 2 adults + 1 child'),
  ];
  const after = [
    row('SNAP', 'Likely eligible', 250, '~$250/mo'),
    row('Medicaid', 'Likely eligible', 0, 'Covered: 1 child'),
  ];
  const outcome = raiseOutcome({ currentIncome: 1800, newIncome: 2300, before, after });
  assert.equal(outcome.extra, 500);
  assert.equal(outcome.snapLost, 150);
  assert.equal(outcome.net, 350);
  assert.equal(outcome.lost.length, 0);
  assert.equal(outcome.adultsLostMedicaid, true);
  assert.equal(outcome.rows.find((item) => item.key === 'Medicaid').changed, true);
  assert.match(raiseSummary(outcome), /\$350 more/);
  assert.match(raiseSummary(outcome), /SNAP goes down by \$150/);
});
