import { Wallet } from 'lucide-react';

// Income step of the profile form (/connect).
//
// CONTRACT — keep these props stable; the pay stub upload feature plugs in here:
//   value:    { monthly_income, income_source, employer, job_title } (current form values)
//   onChange: (partial) => void  — merge fields into the form
//   applicant: the saved Applicant record (has .id), for anything that needs it
//
// Right now income is typed in and tagged "Self-reported". The pay stub upload
// replaces/augments this: upload → backend function extracts the numbers →
// onChange({ monthly_income, employer, income_source: 'Uploaded document' }).
// eslint-disable-next-line no-unused-vars
export default function IncomeSection({ value, onChange, applicant }) {
  const input =
    'w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[14px] text-navy outline-none transition-colors focus:border-navy/40';

  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-navy">
          <Wallet className="h-5 w-5" strokeWidth={2} />
        </span>
        <div>
          <h2 className="font-heading text-[15.5px] font-semibold text-navy">Income</h2>
          <p className="text-[13px] text-muted-foreground">
            Total monthly pay before taxes, for everyone in your household.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-[12.5px] font-medium text-navy">Monthly income (before taxes)</span>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-muted-foreground">
              $
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              required
              className={`${input} pl-7`}
              value={value.monthly_income ?? ''}
              onChange={(e) =>
                onChange({
                  monthly_income: e.target.value === '' ? null : Number(e.target.value),
                  income_source: 'Self-reported',
                })
              }
            />
          </div>
        </label>
        <label className="block">
          <span className="text-[12.5px] font-medium text-navy">Employer (optional)</span>
          <input
            className={`${input} mt-1.5`}
            value={value.employer ?? ''}
            onChange={(e) => onChange({ employer: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-[12.5px] font-medium text-navy">Job title (optional)</span>
          <input
            className={`${input} mt-1.5`}
            value={value.job_title ?? ''}
            onChange={(e) => onChange({ job_title: e.target.value })}
          />
        </label>
      </div>

      {value.income_source && (
        <p className="mt-3 text-[12px] text-muted-foreground">Source: {value.income_source}</p>
      )}
    </section>
  );
}
