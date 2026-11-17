import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toList } from '@/lib/verifi';
import { checkEligibility, missingFields } from '@/lib/eligibility';
import { personalImpact } from '@/lib/ruleImpact';

const LEVEL_ORDER = { affected: 0, maybe: 1, not_affected: 2 };

const seenKey = (userId) => `verifi:seen-law-updates:${userId}`;

// Per-viewer convenience only (which popups were dismissed). Storage can be
// unavailable (private mode), so every access is guarded.
function readSeen(userId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(seenKey(userId)) || '[]'));
  } catch {
    return new Set();
  }
}
function writeSeen(userId, ids) {
  try {
    localStorage.setItem(seenKey(userId), JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

// Law/rule changes, each annotated with how it affects this person.
// `applicant` and `applications` come from the page (already loaded there).
export function useLawUpdates(user, applicant, applications) {
  const [updates, setUpdates] = useState([]);
  const [seen, setSeen] = useState(() => (user?.id ? readSeen(user.id) : new Set()));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    base44.entities.RuleUpdate.filter({ published: true }, '-effective_date', 50)
      .then((res) => alive && setUpdates(toList(res)))
      .catch(() => alive && setUpdates([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (user?.id) setSeen(readSeen(user.id));
  }, [user?.id]);

  // Programs the person applied to, plus ones they likely qualify for.
  const programsInUse = new Set((applications ?? []).map((a) => a.program));
  if (applicant && !missingFields(applicant).length) {
    checkEligibility(applicant)
      .filter((r) => r.result !== 'Not eligible')
      .forEach((r) => programsInUse.add(r.key));
  }

  const annotated = updates
    .map((u) => ({ ...u, impact: personalImpact(u, applicant, [...programsInUse]) }))
    .sort(
      (a, b) =>
        LEVEL_ORDER[a.impact.level] - LEVEL_ORDER[b.impact.level] ||
        String(a.effective_date || '').localeCompare(String(b.effective_date || ''))
    );

  const relevant = annotated.filter((u) => u.impact.level !== 'not_affected');
  const unseen = relevant.filter((u) => !seen.has(u.id));

  const markSeen = useCallback(
    (ids) => {
      if (!user?.id) return;
      const next = new Set(seen);
      [].concat(ids).forEach((id) => next.add(id));
      setSeen(next);
      writeSeen(user.id, next);
    },
    [seen, user?.id]
  );

  return { all: annotated, relevant, unseen, markSeen, loading };
}
