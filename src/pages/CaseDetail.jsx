import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Users, Wallet, MapPin, Baby, Check, Loader2, CheckCheck } from 'lucide-react';
import VerifiNav from '@/components/VerifiNav';
import StatusPill from '@/components/StatusPill';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import {
  PROGRAM_LABELS,
  initials,
  money,
  shortDate,
  shortDateTime,
  toList,
} from '@/lib/verifi';

function ApplicationActions({ application, onUpdate, busy }) {
  const [denying, setDenying] = useState(false);
  const [reason, setReason] = useState('');
  const closed = application.status === 'Approved' || application.status === 'Denied';
  const btn =
    'rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';

  if (closed) return null;

  if (denying) {
    return (
      <form
        className="mt-3 flex w-full flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (reason.trim()) onUpdate(application, 'Denied', reason.trim());
        }}
      >
        <input
          autoFocus
          required
          placeholder="Reason for denial (the applicant will see this)"
          className="flex-1 rounded-lg border border-border px-3 py-2 text-[13px] outline-none focus:border-navy/40"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex gap-2">
          <button type="submit" disabled={busy || !reason.trim()} className={`${btn} border-rose-200 bg-rose-600 text-white`}>
            Confirm denial
          </button>
          <button type="button" onClick={() => setDenying(false)} className={`${btn} border-border text-navy`}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex gap-1.5">
      {application.status === 'Submitted' && (
        <button type="button" disabled={busy} onClick={() => onUpdate(application, 'Under review')} className={`${btn} border-border text-navy hover:bg-canvas`}>
          Start review
        </button>
      )}
      <button type="button" disabled={busy} onClick={() => onUpdate(application, 'Approved')} className={`${btn} border-verify/30 text-verify hover:bg-verify-soft`}>
        Approve
      </button>
      <button type="button" disabled={busy} onClick={() => setDenying(true)} className={`${btn} border-rose-200 text-rose-600 hover:bg-rose-50`}>
        Deny
      </button>
    </div>
  );
}

export default function CaseDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [applicant, setApplicant] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  const load = async () => {
    const [applicantRow, applicationsResult] = await Promise.all([
      base44.entities.Applicant.get(id),
      base44.entities.Application.filter({ applicant: id }, '-submitted_at', 50),
    ]);
    setApplicant(applicantRow ?? null);
    setApplications(toList(applicationsResult));
    setLoading(false);
  };

  useEffect(() => {
    let alive = true;
    load().catch(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openApps = applications.filter((application) =>
    ['Submitted', 'Under review'].includes(application.status)
  );
  const submittedCount = openApps.length;

  const approveAll = async () => {
    setApproving(true);
    try {
      const now = new Date().toISOString();
      await base44.entities.Application.bulkUpdate(
        openApps.map((application) => ({ id: application.id, status: 'Approved', status_updated_at: now }))
      );
      await base44.entities.Applicant.update(id, { status: 'Approved' });
      await load();
      toast({
        title: `Approved ${openApps.length} application${openApps.length === 1 ? '' : 's'}.`,
        description: 'The applicant can see the update in their tracker.',
        duration: 6000,
      });
    } catch (err) {
      toast({ title: 'Could not approve', description: err.message, variant: 'destructive' });
    } finally {
      setApproving(false);
    }
  };

  const updateApplication = async (application, status, reason) => {
    setApproving(true);
    try {
      await base44.entities.Application.update(application.id, {
        status,
        status_updated_at: new Date().toISOString(),
        ...(status === 'Denied' ? { decision_reason: reason } : {}),
      });
      await load();
      toast({ title: `${PROGRAM_LABELS[application.program] ?? application.program}: ${status}` });
    } catch (err) {
      toast({ title: 'Could not update', description: err.message, variant: 'destructive' });
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas">
        <VerifiNav />
        <p className="py-24 text-center text-[14px] text-muted-foreground">Loading case…</p>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="min-h-screen bg-canvas">
        <VerifiNav />
        <div className="mx-auto max-w-lg px-5 py-24 text-center">
          <p className="font-heading text-[18px] font-semibold text-navy">Case not found</p>
          <Link
            to="/caseworker"
            className="mt-4 inline-flex items-center gap-2 text-[14px] font-medium text-navy underline-offset-4 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to the queue
          </Link>
        </div>
      </div>
    );
  }

  const fields = [
    {
      icon: Wallet,
      label: 'Monthly income',
      value: applicant.monthly_income != null ? `${money(applicant.monthly_income)}/mo` : '—',
      source: applicant.income_source || 'Self-reported',
      at: applicant.income_updated_at || applicant.verified_at,
    },
    {
      icon: Users,
      label: 'Household',
      value: applicant.household_size
        ? `${applicant.household_size} people${applicant.children_count ? ` · ${applicant.children_count} under 19` : ''}`
        : '—',
      source: 'Self-reported',
      at: applicant.verified_at,
    },
    {
      icon: Baby,
      label: 'Pregnant / child under 5',
      value: applicant.has_young_child_or_pregnant ? 'Yes' : 'No',
      source: 'Self-reported',
      at: applicant.verified_at,
    },
    {
      icon: MapPin,
      label: 'Home address',
      value: applicant.address ? `${applicant.address}, ${applicant.city}, ${applicant.state} ${applicant.zip ?? ''}` : '—',
      source: 'Self-reported',
      at: applicant.verified_at,
    },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <VerifiNav />

      <main className="mx-auto max-w-4xl px-5 pb-24 pt-6 sm:px-8 sm:pt-10">
        <Link
          to="/caseworker"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-navy-muted transition-colors hover:text-navy"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Verification queue
        </Link>

        <div className="mt-4 animate-rise rounded-3xl border border-border bg-white p-6 shadow-card sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary font-heading text-[17px] font-semibold text-navy">
                {initials(applicant.name)}
              </span>
              <div>
                <h1 className="font-heading text-[24px] font-semibold leading-tight text-navy">
                  {applicant.name}
                </h1>
                <p className="mt-1 text-[13.5px] text-navy-muted">
                  {[applicant.age && `Age ${applicant.age}`, applicant.city && `${applicant.city}, ${applicant.state}`, applicant.household_size && `Household of ${applicant.household_size}`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <StatusPill status={applicant.status} />
                  <span className="text-[12.5px] text-muted-foreground">
                    {applicant.employer}
                    {applicant.job_title ? ` · ${applicant.job_title}` : ''}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={approveAll}
              disabled={approving || submittedCount === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-verify px-5 py-3 text-[14.5px] font-semibold text-white transition-all hover:bg-green-700 hover:shadow-lg hover:shadow-verify/25 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {approving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" strokeWidth={2.4} />
              )}
              {submittedCount > 0
                ? 'Approve all'
                : applications.length > 0
                  ? 'All approved'
                  : 'Nothing to approve'}
            </button>
          </div>
        </div>

        <section className="mt-6">
          <h2 className="px-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-navy-muted">
            Profile
          </h2>
          <div className="mt-2.5 overflow-hidden rounded-2xl border border-border bg-white">
            {fields.map((field) => (
              <div
                key={field.label}
                className="flex flex-wrap items-center gap-3 border-b border-border/60 px-5 py-4 last:border-0"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-navy">
                  <field.icon className="h-4 w-4" strokeWidth={2.1} />
                </span>
                <div>
                  <p className="text-[11.5px] uppercase tracking-[0.1em] text-muted-foreground">{field.label}</p>
                  <p className="mt-0.5 font-heading text-[15px] font-semibold text-navy">{field.value}</p>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-3">
                  <StatusPill status={field.source} />
                  <span className="text-[12px] text-muted-foreground">{shortDateTime(field.at)}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 px-1 text-[11.5px] text-muted-foreground">
            Each value shows where it came from. Self-reported values may need a document before final approval.
          </p>
        </section>

        <section className="mt-7">
          <h2 className="px-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-navy-muted">
            Applications
          </h2>
          {applications.length === 0 ? (
            <div className="mt-2.5 rounded-2xl border border-dashed border-border bg-white px-5 py-10 text-center">
              <p className="text-[13.5px] text-muted-foreground">
                No applications submitted yet.
              </p>
            </div>
          ) : (
            <div className="mt-2.5 overflow-hidden rounded-2xl border border-border bg-white">
              {applications.map((application) => (
                <div
                  key={application.id}
                  className="flex flex-wrap items-center gap-3 border-b border-border/60 px-5 py-4 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas text-[11px] font-bold text-navy">
                      {(PROGRAM_LABELS[application.program] ?? application.program).slice(0, 2)}
                    </span>
                    <div>
                      <p className="font-heading text-[14.5px] font-semibold text-navy">
                        {PROGRAM_LABELS[application.program] ?? application.program}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        {application.benefit_label || `${money(application.est_monthly_value)}/mo`}
                      </p>
                    </div>
                  </div>
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <span className="text-[12px] text-muted-foreground">
                      {shortDate(application.submitted_at)}
                    </span>
                    <StatusPill status={application.eligibility} />
                    <StatusPill status={application.status} />
                    <ApplicationActions application={application} onUpdate={updateApplication} busy={approving} />
                  </div>
                  {application.eligibility_reason && (
                    <p className="w-full text-[12px] text-muted-foreground">{application.eligibility_reason}</p>
                  )}
                  {application.status === 'Denied' && application.decision_reason && (
                    <p className="w-full text-[12px] text-rose-700">Denied: {application.decision_reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {applicant.status === 'Approved' && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-verify/25 bg-verify-soft/60 px-5 py-4">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-verify text-white">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            <p className="text-[13px] leading-relaxed text-verify">
              Approved. The applicant sees this in their application tracker.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}