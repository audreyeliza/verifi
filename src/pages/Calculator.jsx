import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import VerifiNav from '@/components/VerifiNav';
import { useAuth } from '@/lib/AuthContext';
import { getMyApplicant, money } from '@/lib/verifi';
import { checkEligibility, missingFields } from '@/lib/eligibility';
import { incomeFromHours, raiseOutcome, raiseSummary } from '@/lib/raise';
import { cn } from '@/lib/utils';

const input =
  'w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[14px] text-navy outline-none transition-colors focus:border-brand/50';

function amountLabel(row) {
  if (row.key === 'SNAP') return row.amount > 0 ? `~${money(row.amount)}/mo` : '$0 estimated';
  return row.benefit;
}

export default function Calculator() {
  const { user } = useAuth();
  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('income');
  const [incomeInput, setIncomeInput] = useState('');
  const [hours, setHours] = useState('');
  const [rate, setRate] = useState('');

  useEffect(() => {
    let alive = true;
    getMyApplicant(user)
      .then((row) => {
        if (alive) setApplicant(row);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [user]);

  const missing = !applicant || missingFields(applicant).length > 0;
  const current = Number(applicant?.monthly_income) || 0;

  let newIncome = null;
  if (!missing && mode === 'income' && incomeInput !== '') {
    const value = Number(incomeInput);
    if (Number.isFinite(value) && value >= 0) newIncome = value;
  }
  if (!missing && mode === 'hours' && hours !== '' && rate !== '') {
    const weeklyHours = Number(hours);
    const hourly = Number(rate);
    if (Number.isFinite(weeklyHours) && Number.isFinite(hourly) && weeklyHours >= 0 && hourly >= 0) {
      newIncome = incomeFromHours(current, weeklyHours, hourly).newIncome;
    }
  }

  const before = applicant ? checkEligibility(applicant) : [];
  const after = newIncome == null ? [] : checkEligibility(applicant, { monthly_income: newIncome });
  const outcome = newIncome == null
    ? null
    : raiseOutcome({ currentIncome: current, newIncome, before, after });

  return (
    <div className="min-h-screen bg-canvas">
      <VerifiNav />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <h1 className="font-heading text-[30px] font-semibold leading-tight tracking-tight text-navy sm:text-[34px]">
          What if you earned more?
        </h1>
        <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-navy-muted">
          See today&apos;s estimate next to a new one. These are estimates. They do not mean you will get a benefit.
        </p>

        {loading ? (
          <p className="py-16 text-center text-[14px] text-muted-foreground">Loading…</p>
        ) : missing ? (
          <div className="mt-6 rounded-3xl border border-border/70 bg-white p-6">
            <p className="font-heading text-[18px] font-semibold text-navy">We need your income and household size first.</p>
            <p className="mt-2 text-[14px] text-navy-muted">Add them on your profile, then come back.</p>
            <Link
              to="/connect"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 text-[14px] font-semibold text-white hover:bg-brand-deep"
            >
              Finish my profile
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-3xl border border-border/70 bg-white p-5">
              <p className="text-[13px] text-navy-muted">
                Today&apos;s pay, before taxes: <span className="font-semibold text-navy">{money(current)}/mo</span>
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-canvas p-1">
                {[
                  ['income', 'New monthly pay'],
                  ['hours', 'Extra hours'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    className={cn(
                      'rounded-xl px-3 py-2 text-[13px] font-semibold',
                      mode === key ? 'bg-brand text-white' : 'text-navy'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === 'income' ? (
                <label className="mt-4 block">
                  <span className="text-[12.5px] font-medium text-navy">New monthly income, before taxes</span>
                  <div className="relative mt-1.5">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-muted-foreground">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      className={`${input} pl-7`}
                      value={incomeInput}
                      onChange={(e) => setIncomeInput(e.target.value)}
                    />
                  </div>
                </label>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[12.5px] font-medium text-navy">Extra hours each week</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      className={`${input} mt-1.5`}
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12.5px] font-medium text-navy">Hourly pay, before taxes</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      className={`${input} mt-1.5`}
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                    />
                  </label>
                </div>
              )}
            </div>

            {outcome && (
              <>
                <div className="mt-3 rounded-3xl bg-brand p-5 text-white">
                  <p className="font-heading text-[18px] font-semibold leading-snug">
                    {raiseSummary(outcome)}
                  </p>
                  <p className="mt-2 text-[13px] text-white/80">
                    {`Extra pay about ${money(outcome.extra)}/mo${
                      outcome.snapLost > 0 ? ` · SNAP down about ${money(outcome.snapLost)}` : ''
                    }${
                      outcome.snapGained > 0 ? ` · SNAP up about ${money(outcome.snapGained)}` : ''
                    }. This is an estimate.`}
                  </p>
                </div>

                {(outcome.lost.length > 0 || outcome.adultsLostMedicaid) && (
                  <div className="mt-3 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4">
                    <p className="flex items-start gap-2 text-[14px] font-semibold text-amber-950">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      {outcome.lost.some((row) => row.key === 'Medicaid')
                        ? 'Medicaid would be lost.'
                        : [
                            outcome.lost.length > 0
                              ? `${outcome.lost.map((row) => row.label).join(' and ')} would be lost.`
                              : null,
                            outcome.adultsLostMedicaid ? 'Adults would lose Medicaid.' : null,
                          ].filter(Boolean).join(' ')}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-amber-950">
                      {outcome.lost.length > 0 && (
                        <>
                          {outcome.lost.map((row) => row.label).join(', ')}
                          {' '}
                          would go from likely to over the limit.{' '}
                        </>
                      )}
                      {outcome.adultsLostMedicaid && !outcome.lost.some((row) => row.key === 'Medicaid') && (
                        <>Adults would be over the limit. Children may still be covered.</>
                      )}
                      {(outcome.adultsLostMedicaid || outcome.lost.some((row) => row.key === 'Medicaid')) && (
                        <> Health coverage is the one to be careful about.</>
                      )}
                      {' '}
                      This is an estimate, not a decision from the state.
                    </p>
                  </div>
                )}

                <div className="mt-3 space-y-2">
                  {outcome.rows.map((row) => (
                    <div
                      key={row.key}
                      className={cn(
                        'rounded-3xl border bg-white p-4',
                        row.changed ? 'border-brand/40 bg-brand-soft' : 'border-border/70'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-heading text-[15px] font-semibold text-navy">{row.label}</p>
                        {row.changed && (
                          <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
                            Would change
                          </span>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Today</p>
                          <p className="mt-1 text-[13px] text-navy">{row.before?.result}</p>
                          <p className="text-[12.5px] text-navy-muted">{row.before ? amountLabel(row.before) : ''}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">New pay</p>
                          <p className="mt-1 text-[13px] text-navy">{row.result}</p>
                          <p className="text-[12.5px] text-navy-muted">{amountLabel(row)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
