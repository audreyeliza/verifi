// "What if I earn more?" math. Pure, so the page and the tests share it.
// Every dollar here is an estimate. The agencies make the real decision.

export function incomeFromHours(currentIncome, hours, rate) {
  const extra = Math.round(Number(hours) * Number(rate) * 52 / 12);
  return {
    extra,
    newIncome: Math.round(Number(currentIncome) + extra),
  };
}

export function raiseOutcome({ currentIncome, newIncome, before, after }) {
  const extra = Math.round(Number(newIncome) - Number(currentIncome));
  const oldSnap = before.find((row) => row.key === 'SNAP')?.amount || 0;
  const newSnap = after.find((row) => row.key === 'SNAP')?.amount || 0;
  const snapLost = Math.max(0, oldSnap - newSnap);
  const snapGained = Math.max(0, newSnap - oldSnap);
  const rows = after.map((row) => {
    const prev = before.find((item) => item.key === row.key);
    const changed = !prev
      || prev.result !== row.result
      || prev.amount !== row.amount
      || prev.benefit !== row.benefit;
    const lost = prev && prev.result !== 'Not eligible' && row.result === 'Not eligible';
    // Adults can fall off Medicaid while children stay on. The result stays
    // "Likely eligible", so the warning has to look at who is covered.
    const adultsLost = row.key === 'Medicaid'
      && prev
      && /adult/i.test(prev.benefit || '')
      && !/adult/i.test(row.benefit || '');
    return { ...row, before: prev, changed, lost, adultsLost };
  });
  return {
    extra,
    snapLost,
    snapGained,
    net: extra - snapLost,
    rows,
    lost: rows.filter((row) => row.lost),
    adultsLostMedicaid: rows.some((row) => row.adultsLost),
  };
}

const dollars = (value) => `$${Math.abs(Math.round(value)).toLocaleString('en-US')}`;

export function raiseSummary({ extra, snapLost, snapGained, net }) {
  if (extra === 0 && snapLost === 0 && snapGained === 0) {
    return 'Nothing in this estimate would change.';
  }
  const takeHome = net >= 0
    ? `about ${dollars(net)} more`
    : `about ${dollars(net)} less`;
  if (snapLost > 0) {
    return `You'd take home ${takeHome} per month, even after SNAP goes down by ${dollars(snapLost)}.`;
  }
  if (snapGained > 0) {
    const withSnap = extra + snapGained;
    const direction = withSnap >= 0 ? 'more' : 'less';
    return `You'd take home about ${dollars(withSnap)} ${direction} per month, and SNAP would go up by about ${dollars(snapGained)}.`;
  }
  const payDirection = extra >= 0 ? 'more' : 'less';
  return `You'd take home about ${dollars(extra)} ${payDirection} per month. SNAP would stay about the same.`;
}
