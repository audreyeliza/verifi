import { base44 } from '@/api/base44Client';

export const PROGRAM_LABELS = {
  SNAP: 'SNAP',
  WIC: 'WIC',
  LIHEAP: 'HEAP',
  Medicaid: 'Medicaid',
};

// Order an application moves through. Denied is a terminal alternative to Approved.
export const APPLICATION_STEPS = ['Submitted', 'Under review', 'Approved'];

export const isCaseworker = (user) => user?.role === 'admin';

export const money = (value) => `$${Number(value || 0).toLocaleString('en-US')}`;

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const shortDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const shortDateTime = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

// NOTE: pass sort/limit positionally — filter(query, '-created_date', 50).
// The options-object form ({ sort, limit }) returns no rows on the local dev backend.
export const toList = (result) => {
  if (Array.isArray(result)) return result;
  return result?.items ?? [];
};

// The signed-in user's own Applicant profile, or null if they haven't started.
// Filter by owner explicitly: caseworkers (admins) can read every profile.
export const getMyApplicant = async (user) => {
  if (!user?.id) return null;
  const rows = toList(
    await base44.entities.Applicant.filter({ created_by_id: user.id }, '-created_date', 1)
  );
  return rows[0] ?? null;
};

// Get the user's profile, creating an empty one on first use. Concurrent calls
// (React StrictMode runs effects twice in dev) share one request so we never
// create duplicate profiles.
let pendingCreate = null;
export const getOrCreateMyApplicant = (user) => {
  if (pendingCreate) return pendingCreate;
  pendingCreate = (async () => {
    const existing = await getMyApplicant(user);
    if (existing) return existing;
    return base44.entities.Applicant.create({
      name: user.full_name || user.email,
      state: 'OH',
      status: 'Not started',
    });
  })().finally(() => {
    pendingCreate = null;
  });
  return pendingCreate;
};

export const getMyApplications = async (user) => {
  if (!user?.id) return [];
  return toList(
    await base44.entities.Application.filter({ created_by_id: user.id }, '-submitted_at', 50)
  );
};
