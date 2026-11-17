// Pay-stub math shared by the income form and the caseworker case page.
// The same multipliers live in base44/functions/extractPayStub/entry.ts.
// Functions cannot import this file.

export const PAY_FREQUENCIES = [
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'semimonthly', label: 'Twice a month' },
  { value: 'monthly', label: 'Every month' },
];

const FACTORS = { weekly: 52 / 12, biweekly: 26 / 12, semimonthly: 2, monthly: 1 };

export const MAX_STUB_BYTES = 8 * 1024 * 1024;

export const STUB_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

export function frequencyLabel(value) {
  return PAY_FREQUENCIES.find((item) => item.value === value)?.label || value || '—';
}

export function monthlyEquivalent(gross, frequency) {
  const amount = Number(gross);
  const factor = FACTORS[frequency];
  if (!factor || !Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * factor);
}

function stamp(doc) {
  return String(doc?.pay_date || doc?.created_date || '');
}

// Newest stub per employer (blank employer is one group), then add those jobs.
export function combineStubs(docs) {
  const groups = new Map();
  docs.forEach((doc) => {
    const key = (doc.employer || '').trim().toLowerCase();
    const prev = groups.get(key);
    if (!prev || stamp(doc) >= stamp(prev)) groups.set(key, doc);
  });
  const chosen = [...groups.values()];
  const monthly_income = Math.round(
    chosen.reduce((sum, doc) => sum + (Number(doc.monthly_equivalent) || 0), 0)
  );
  const employer = [...new Set(chosen.map((doc) => (doc.employer || '').trim()).filter(Boolean))].join(', ');
  return { monthly_income, employer, chosen };
}

export function formatPayDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
  if (!match) return '—';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function omitEmpty(fields) {
  return Object.fromEntries(
    Object.entries(fields).filter(([, fieldValue]) => fieldValue !== null && fieldValue !== undefined && fieldValue !== '')
  );
}

export async function fileToBase64(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const size = 0x8000;
  for (let i = 0; i < bytes.length; i += size) {
    binary += String.fromCharCode(...bytes.subarray(i, i + size));
  }
  return btoa(binary);
}
