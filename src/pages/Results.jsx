import { useEffect, useState } from 'react';
import { ShoppingBasket, Baby, Zap, HeartPulse, Loader2, Check, X, ArrowRight, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import VerifiNav from '@/components/VerifiNav';
import FlowProgress from '@/components/FlowProgress';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { money, getMyApplicant, getMyApplications } from '@/lib/verifi';
import { checkEligibility, missingFields, PROGRAM_INFO, PROGRAM_KEYS, RULES_YEAR } from '@/lib/eligibility';
import { cn } from '@/lib/utils';

const ICONS = {
  SNAP: ShoppingBasket,
  WIC: Baby,
  LIHEAP: Zap,
  Medicaid: HeartPulse,
};

const RESULT_STYLE = {
  'Likely eligible': { text: 'text-verify', border: 'border-verify/30', badge: 'bg-verify text-white', icon: Check },
  'Needs review': { text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-500 text-white', icon: AlertCircle },
  'Not eligible': { text: 'text-navy-muted', border: 'border-border', badge: 'bg-slate-300 text-white', icon: X },
};

export default function Results() {
  const { user } = useAuth();
  const [results, setResults] = useState(null);
  const [submitted, setSubmitted] = useState(0);
  const [revealed, setRevealed] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const timers = [];

    const run = async () => {
      const applicant = await getMyApplicant(user);
      if (!alive) return;
      if (!applicant || missingFields(applicant).length) {
        setError('Finish your profile first so we can check eligibility.');
        return;
      }

      const computed = checkEligibility(applicant);
      setResults(computed);

      const existing = await getMyApplications(user);
      const toApply = computed.filter(
        (r) => r.result !== 'Not eligible' && !existing.some((row) => row.program === r.key)
      );

      if (toApply.length) {
        const now = new Date().toISOString();
        await base44.entities.Application.bulkCreate(
          toApply.map((r) => ({
            applicant: applicant.id,
            applicant_name: applicant.name,
            program: r.key,
            est_monthly_value: r.amount,
            benefit_label: r.benefit,
            eligibility: r.result,
            eligibility_reason: r.reason,
            status: 'Submitted',
            submitted_at: now,
            status_updated_at: now,
          }))
        );
      }

      const applyingTo = computed.filter((r) => r.result !== 'Not eligible').length;
      if (applyingTo > 0 && applicant.status !== 'Applied' && applicant.status !== 'Approved') {
        await base44.entities.Applicant.update(applicant.id, { status: 'Applied' });
      }
      if (!alive) return;
      setSubmitted(applyingTo);

      // Short staggered reveal so each program reads as its own check.
      computed.forEach((r, index) => {
        timers.push(
          setTimeout(() => {
            if (alive) setRevealed((prev) => ({ ...prev, [r.key]: true }));
          }, 250 + index * 300)
        );
      });
    };

    run().catch((err) => alive && setError(err.message || 'Something went wrong checking eligibility.'));

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [user]);

  const allRevealed = results && results.every((r) => revealed[r.key]);
  const eligible = results?.filter((r) => r.result !== 'Not eligible') ?? [];
  const monthlyTotal = eligible.reduce((sum, r) => sum + (r.amount || 0), 0);
  const medicaid = eligible.find((r) => r.key === 'Medicaid');

  return (
    <div className="min-h-screen bg-canvas">
      <VerifiNav />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <FlowProgress current={3} />

        <div className="mb-7">
          <h1 className="font-heading text-[30px] font-semibold leading-tight tracking-tight text-navy sm:text-[34px]">
            Checking all 4 programs
          </h1>
          <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-navy-muted">
            Your profile is checked against each program&apos;s published income limits. We apply to
            every program you likely qualify for.
          </p>
        </div>

        {error ? (
          <div className="rounded-3xl border border-border/70 bg-white p-6 text-center">
            <p className="text-[14px] text-navy">{error}</p>
            <Link to="/connect" className="mt-4 inline-flex rounded-2xl bg-brand px-5 py-2.5 text-[14px] font-semibold text-white">
              Go to my profile
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {PROGRAM_KEYS.map((key) => {
                const Icon = ICONS[key];
                const r = results?.find((row) => row.key === key);
                const done = r && revealed[key];
                const style = done ? RESULT_STYLE[r.result] : null;
                return (
                  <div
                    key={key}
                    className={cn(
                      'rounded-3xl border bg-white p-5 transition-all duration-500',
                      done ? `${style.border} shadow-card` : 'border-border'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                            done && r.result !== 'Not eligible' ? 'bg-verify-soft text-verify' : 'bg-brand-soft text-brand/70'
                          )}
                        >
                          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                        </span>
                        <div>
                          <p className="font-heading text-[15px] font-semibold text-navy">{PROGRAM_INFO[key].label}</p>
                          <p className="text-[12.5px] text-muted-foreground">{PROGRAM_INFO[key].name}</p>
                        </div>
                      </div>
                      {done && (
                        <span className={cn('flex h-7 w-7 items-center justify-center rounded-full', style.badge)}>
                          <style.icon className="h-4 w-4" strokeWidth={3} />
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-[13.5px]">
                      {done ? (
                        <>
                          <span className={cn('font-semibold', style.text)}>{r.result}</span>
                          {r.result !== 'Not eligible' && (
                            <>
                              <span className="text-border">·</span>
                              <span className="font-medium text-navy">{r.benefit}</span>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-navy-muted" />
                          <span className="text-navy-muted">Checking…</span>
                        </>
                      )}
                    </div>
                    {done && <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{r.reason}</p>}
                  </div>
                );
              })}
            </div>

            <div
              className={cn(
                'mt-6 rounded-3xl bg-navy p-6 text-white transition-all duration-700 sm:p-8',
                allRevealed ? 'opacity-100' : 'pointer-events-none opacity-40'
              )}
            >
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/60">
                What you could get
              </p>
              {eligible.length === 0 ? (
                <p className="mt-2 font-heading text-[22px] font-semibold leading-tight">
                  You don&apos;t appear to qualify for these programs right now.
                </p>
              ) : (
                <p className="mt-2 font-heading text-[26px] font-semibold leading-tight sm:text-[32px]">
                  {monthlyTotal > 0 ? `~${money(monthlyTotal)}/mo in food support` : `${eligible.length} program${eligible.length > 1 ? 's' : ''}`}
                  {medicaid && (
                    <span className="block text-[17px] font-medium text-verify-soft sm:text-[19px]">
                      + Medicaid health coverage
                    </span>
                  )}
                </p>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-white/15 pt-4 text-[12.5px] text-white/70">
                <span>
                  {submitted} application{submitted === 1 ? '' : 's'} submitted
                </span>
                <span className="text-white/30">·</span>
                <span>One profile, no repeat forms</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center gap-3">
              <Link
                to="/applications"
                className="group inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-white px-5 py-3 text-[14px] font-semibold text-navy transition-colors hover:border-navy/30"
              >
                Track my applications
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <p className="max-w-md text-center text-[11.5px] text-muted-foreground">
                Estimates from published Ohio rules ({RULES_YEAR}). Final eligibility and amounts are set by
                each agency.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
