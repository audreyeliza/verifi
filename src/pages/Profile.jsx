import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Users, Wallet, MapPin, Pencil, FileText, UserRound } from 'lucide-react';
import VerifiNav from '@/components/VerifiNav';
import FlowProgress from '@/components/FlowProgress';
import { useAuth } from '@/lib/AuthContext';
import { money, initials, shortDate, getMyApplicant } from '@/lib/verifi';
import { missingFields } from '@/lib/eligibility';

// How much to trust each income source, for the tag next to the value.
const SOURCE_STYLE = {
  'Verified at source': { icon: ShieldCheck, className: 'text-verify' },
  'Uploaded document': { icon: FileText, className: 'text-blue-600' },
  'Self-reported': { icon: UserRound, className: 'text-navy-muted' },
};

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getMyApplicant(user)
      .then((row) => {
        if (alive) setApplicant(row);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user]);

  const missing = applicant ? missingFields(applicant) : ['your profile'];
  const household = applicant
    ? `${applicant.household_size ?? '—'} people${applicant.children_count ? ` · ${applicant.children_count} under 19` : ''}`
    : '—';

  const fields = [
    { icon: Users, label: 'Household size', value: household, source: 'Self-reported' },
    {
      icon: Wallet,
      label: 'Monthly income',
      value: applicant?.monthly_income != null ? `${money(applicant.monthly_income)}/mo` : '—',
      source: applicant?.income_source || 'Self-reported',
    },
    {
      icon: MapPin,
      label: 'Home address',
      value: applicant?.address ? `${applicant.address}, ${applicant.city} ${applicant.zip ?? ''}` : '—',
      source: 'Self-reported',
    },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <VerifiNav />
      <main className="mx-auto max-w-2xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <FlowProgress current={2} />

        {!loading && !applicant ? (
          <div className="rounded-3xl border border-border bg-white p-8 text-center">
            <p className="font-heading text-[18px] font-semibold text-navy">You haven&apos;t started yet</p>
            <Link
              to="/consent"
              className="mt-5 inline-flex rounded-2xl bg-brand px-5 py-3 text-[14px] font-semibold text-white hover:bg-brand-deep"
            >
              Start your profile
            </Link>
          </div>
        ) : (
          <>
            <div className="animate-rise bg-brand-card relative overflow-hidden rounded-[1.75rem] p-6 text-white shadow-[0_24px_48px_-24px_rgba(47,79,230,0.7)]">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
                  Verifi household profile
                </p>
                <Link
                  to="/connect"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold text-brand"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Link>
              </div>
              <div className="mt-5 flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15 font-heading text-[18px] font-semibold ring-1 ring-white/30">
                  {initials(applicant?.name)}
                </span>
                <div className="min-w-0">
                  <h1 className="truncate font-heading text-[26px] font-semibold leading-tight">
                    {loading ? 'Loading…' : applicant.name}
                  </h1>
                  <p className="mt-0.5 text-[13px] text-white/80">
                    {applicant?.city ? `${applicant.city}, ${applicant.state} · Updated ${shortDate(applicant.verified_at || applicant.updated_date)}` : ' '}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-3xl border border-border/70 bg-white shadow-card">
              <div className="divide-y divide-border/70">
                {fields.map((field) => {
                  const style = SOURCE_STYLE[field.source] ?? SOURCE_STYLE['Self-reported'];
                  return (
                    <div key={field.label} className="flex items-center gap-3.5 px-6 py-4 sm:px-8">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                        <field.icon className="h-4 w-4" strokeWidth={2.1} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                          {field.label}
                        </p>
                        <p className="mt-0.5 truncate font-heading text-[15.5px] font-semibold text-navy">
                          {field.value}
                        </p>
                      </div>
                      <div className="ml-auto flex shrink-0 items-center gap-2">
                        <span className="rounded-md bg-canvas px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-navy-muted">
                          {field.source}
                        </span>
                        <style.icon className={`h-4 w-4 ${style.className}`} strokeWidth={2.4} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-canvas px-6 py-4 sm:px-8">
                <p className="text-[13px] text-navy-muted">
                  Checked against Ohio SNAP, WIC, HEAP and Medicaid rules.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/results')}
              disabled={loading || missing.length > 0}
              className="group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-4 text-[15.5px] font-semibold text-white transition-all hover:bg-brand-deep hover:shadow-lg hover:shadow-brand/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Check eligibility and apply
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>

            <p className="mt-3 text-center text-[12.5px] text-muted-foreground">
              {!loading && missing.length > 0
                ? `Add ${missing.join(' and ')} to continue.`
                : 'One profile, sent to every program you qualify for.'}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
