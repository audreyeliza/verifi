import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, ArrowRight, Pencil } from 'lucide-react';
import VerifiNav from '@/components/VerifiNav';
import { useAuth } from '@/lib/AuthContext';
import {
  APPLICATION_STEPS,
  PROGRAM_LABELS,
  getMyApplicant,
  getMyApplications,
  money,
  shortDate,
} from '@/lib/verifi';
import { PROGRAM_INFO } from '@/lib/eligibility';
import { cn } from '@/lib/utils';

// Package-tracker style progress: Submitted → Under review → Approved (or Denied).
function Tracker({ status }) {
  const denied = status === 'Denied';
  const steps = denied ? ['Submitted', 'Under review', 'Denied'] : APPLICATION_STEPS;
  const currentIndex = denied ? 2 : Math.max(0, steps.indexOf(status));

  return (
    <ol className="mt-4 flex items-center">
      {steps.map((step, i) => {
        const reached = i <= currentIndex;
        const isDeniedStep = denied && i === 2;
        return (
          <li key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-white transition-colors',
                  isDeniedStep ? 'bg-rose-500' : reached ? 'bg-verify' : 'bg-secondary'
                )}
              >
                {isDeniedStep ? (
                  <X className="h-3.5 w-3.5" strokeWidth={3} />
                ) : reached ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                )}
              </span>
              <span
                className={cn(
                  'whitespace-nowrap text-[11.5px] font-medium',
                  isDeniedStep ? 'text-rose-600' : reached ? 'text-navy' : 'text-muted-foreground'
                )}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  'mx-1 mb-5 h-0.5 flex-1 rounded-full',
                  i < currentIndex ? 'bg-verify/50' : 'bg-border'
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function Applications() {
  const { user } = useAuth();
  const [applicant, setApplicant] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([getMyApplicant(user), getMyApplications(user)])
      .then(([row, apps]) => {
        if (!alive) return;
        setApplicant(row);
        setApplications(apps);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-canvas">
      <VerifiNav />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-[30px] font-semibold leading-tight tracking-tight text-navy sm:text-[34px]">
              My applications
            </h1>
            <p className="mt-2 text-[14.5px] text-navy-muted">
              See where each one stands. No calling an office, no waiting on hold.
            </p>
          </div>
          {applicant && (
            <Link
              to="/connect"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-3.5 py-2 text-[13px] font-semibold text-navy hover:border-navy/30"
            >
              <Pencil className="h-3.5 w-3.5" />
              Update my info
            </Link>
          )}
        </div>

        {applicant && (
          <Link
            to="/calculator"
            className="mb-5 flex items-center justify-between gap-3 rounded-3xl border border-border/70 bg-white px-4 py-4"
          >
            <span>
              <span className="block font-heading text-[15px] font-semibold text-navy">
                Thinking about more hours or a new job?
              </span>
              <span className="mt-0.5 block text-[13px] text-navy-muted">
                See how your benefits estimate would change. It is only an estimate.
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-brand" />
          </Link>
        )}

        {loading ? (
          <p className="py-16 text-center text-[14px] text-muted-foreground">Loading…</p>
        ) : !applicant || applications.length === 0 ? (
          <div className="rounded-3xl border border-border bg-white p-8 text-center">
            <p className="font-heading text-[18px] font-semibold text-navy">No applications yet</p>
            <p className="mt-2 text-[14px] text-navy-muted">
              Fill out your profile once and we&apos;ll check SNAP, WIC, HEAP and Medicaid for you.
            </p>
            <Link
              to={applicant?.consent_at ? '/profile' : '/consent'}
              className="group mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 text-[14px] font-semibold text-white hover:bg-brand-deep"
            >
              {applicant?.consent_at ? 'Continue my profile' : 'Get started'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((application) => (
              <div key={application.id} className="rounded-3xl border border-border/70 bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-heading text-[16px] font-semibold text-navy">
                      {PROGRAM_LABELS[application.program] ?? application.program}
                      <span className="ml-2 text-[13px] font-normal text-muted-foreground">
                        {PROGRAM_INFO[application.program]?.name}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {application.benefit_label ||
                        (application.est_monthly_value ? `${money(application.est_monthly_value)}/mo` : '')}
                    </p>
                  </div>
                  <p className="text-[12px] text-muted-foreground">
                    Submitted {shortDate(application.submitted_at)}
                    {application.status_updated_at && application.status !== 'Submitted'
                      ? ` · Updated ${shortDate(application.status_updated_at)}`
                      : ''}
                  </p>
                </div>

                <Tracker status={application.status} />

                {application.status === 'Denied' && application.decision_reason && (
                  <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-[13px] text-rose-800">
                    <span className="font-semibold">Reason given: </span>
                    {application.decision_reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
