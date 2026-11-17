import { useEffect } from 'react';
import { Landmark, X, ExternalLink, ArrowRight, CalendarClock } from 'lucide-react';
import { PROGRAM_LABELS, shortDate } from '@/lib/verifi';
import { cn } from '@/lib/utils';

const LEVEL_STYLE = {
  affected: { label: 'Affects you', className: 'bg-amber-100 text-amber-800' },
  maybe: { label: 'May affect you', className: 'bg-blue-100 text-brand-deep' },
  not_affected: { label: 'Not affected', className: 'bg-secondary text-navy-muted' },
};

const STATUS_STYLE = {
  Upcoming: 'bg-brand text-white',
  'In effect': 'bg-verify text-white',
  Passed: 'bg-navy text-white',
};

const dateLine = (u) => {
  if (!u.effective_date) return u.status;
  const when = shortDate(`${u.effective_date}T12:00:00`);
  return u.status === 'In effect' ? `In effect since ${when}` : `Starts ${when}`;
};

export function LawUpdateCard({ update, compact = false }) {
  const level = LEVEL_STYLE[update.impact?.level] ?? LEVEL_STYLE.maybe;
  return (
    <article className="rounded-3xl border border-border bg-white p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn('rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide', STATUS_STYLE[update.status] ?? STATUS_STYLE.Upcoming)}>
          {update.status}
        </span>
        {(update.programs ?? []).map((p) => (
          <span key={p} className="rounded-full bg-secondary px-2.5 py-1 text-[10.5px] font-semibold text-navy">
            {PROGRAM_LABELS[p] ?? p}
          </span>
        ))}
      </div>
      <h3 className="mt-3 font-heading text-[16.5px] font-semibold leading-snug text-navy">{update.title}</h3>
      <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5" />
        {dateLine(update)}
      </p>

      {update.impact && (
        <div className="mt-3 rounded-2xl bg-canvas p-3.5">
          <span className={cn('rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide', level.className)}>
            {level.label}
          </span>
          <p className="mt-2 text-[13.5px] leading-relaxed text-navy">{update.impact.message}</p>
        </div>
      )}

      {!compact && (
        <>
          <p className="mt-3 text-[13.5px] leading-relaxed text-navy-muted">{update.summary}</p>
          {update.what_to_do && (
            <p className="mt-2 text-[13.5px] leading-relaxed text-navy">
              <span className="font-semibold">What to do: </span>
              {update.what_to_do}
            </p>
          )}
          {update.source_url && (
            <a
              href={update.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand hover:underline"
            >
              Source: {update.source_name || 'official notice'}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </>
      )}
    </article>
  );
}

// Slides down from the top when there's a new law change that touches this person.
export function LawUpdatesPopup({ update, moreCount = 0, onOpen, onDismiss }) {
  if (!update) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <div
        role="alertdialog"
        aria-label="New law change"
        className="pointer-events-auto w-full max-w-md animate-slide-down rounded-3xl bg-navy p-4 text-white shadow-2xl shadow-navy/30"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand">
            <Landmark className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/60">
              {update.status === 'In effect' ? 'Law change in effect' : 'Upcoming law change'}
            </p>
            <p className="mt-0.5 font-heading text-[15px] font-semibold leading-snug">{update.title}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/80">{update.impact?.message}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white py-2.5 text-[13.5px] font-semibold text-navy"
        >
          {moreCount > 0 ? `See all ${moreCount + 1} changes` : 'See what to do'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Full list. Bottom sheet on phones, centered dialog on desktop.
export function LawUpdatesSheet({ open, updates, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy-deep/40 backdrop-blur-sm md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Law changes"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-[2rem] bg-canvas md:rounded-[2rem]"
      >
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <div>
            <span className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-border md:hidden" />
            <h2 className="font-heading text-[20px] font-semibold text-navy">Law changes</h2>
            <p className="text-[12.5px] text-muted-foreground">New and upcoming rules, and what they mean for you.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-navy shadow-sm"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          {updates.length === 0 ? (
            <p className="py-10 text-center text-[14px] text-muted-foreground">No law changes right now.</p>
          ) : (
            updates.map((u) => <LawUpdateCard key={u.id} update={u} />)
          )}
          <p className="px-1 pt-1 text-[11.5px] text-muted-foreground">
            Summaries are simplified. Check the source or your county office for details.
          </p>
        </div>
      </div>
    </div>
  );
}
