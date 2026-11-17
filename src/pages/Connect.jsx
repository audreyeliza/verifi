import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import VerifiNav from '@/components/VerifiNav';
import FlowProgress from '@/components/FlowProgress';
import IncomeSection from '@/components/IncomeSection';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getOrCreateMyApplicant } from '@/lib/verifi';

const FIELDS = [
  'name',
  'age',
  'address',
  'city',
  'state',
  'zip',
  'household_size',
  'children_count',
  'has_young_child_or_pregnant',
  'monthly_income',
  'income_source',
  'employer',
  'job_title',
];

const input =
  'w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[14px] text-navy outline-none transition-colors focus:border-navy/40';

function Field({ label, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[12.5px] font-medium text-navy">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-navy">
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <div>
          <h2 className="font-heading text-[15.5px] font-semibold text-navy">{title}</h2>
          <p className="text-[13px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function Connect() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [applicant, setApplicant] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    getOrCreateMyApplicant(user)
      .then((row) => {
        if (!alive) return;
        setApplicant(row);
        setForm(Object.fromEntries(FIELDS.map((key) => [key, row[key] ?? null])));
      })
      .catch((err) => alive && setError(err.message || 'Could not load your profile.'));
    return () => {
      alive = false;
    };
  }, [user]);

  const set = (partial) => setForm((prev) => ({ ...prev, ...partial }));
  const bind = (key, type = 'text') => ({
    value: form[key] ?? '',
    onChange: (e) =>
      set({ [key]: type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value }),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.children_count > 0 && form.children_count >= form.household_size) {
      setError('Household size must include at least one adult plus the children.');
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const incomeChanged = form.monthly_income !== applicant.monthly_income;
      // The API rejects null for typed fields, so leave blank optional fields out.
      const filled = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== null && v !== undefined)
      );
      await base44.entities.Applicant.update(applicant.id, {
        ...filled,
        income_source: form.income_source || 'Self-reported',
        ...(incomeChanged ? { income_updated_at: now } : {}),
        status: applicant.status === 'Not started' ? 'Verified' : applicant.status,
        verified_at: now,
      });
      navigate('/profile');
    } catch (err) {
      setError(err.message || 'Could not save your profile.');
      setSaving(false);
    }
  };

  if (!applicant) {
    return (
      <div className="min-h-screen bg-canvas">
        <VerifiNav />
        <p className="py-24 text-center text-[14px] text-muted-foreground">
          {error || 'Loading your profile…'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <VerifiNav />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <FlowProgress current={1} />

        <div className="mb-7">
          <h1 className="font-heading text-[26px] font-semibold leading-tight text-navy sm:text-[30px]">
            Tell us about your household
          </h1>
          <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-navy-muted">
            You fill this out once. Verifi uses it for every program, so you never type it in again.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Section icon={MapPin} title="About you" subtitle="Your name and where you live.">
            <Field label="Full name" className="sm:col-span-2">
              <input required className={input} {...bind('name')} />
            </Field>
            <Field label="Age">
              <input type="number" min="0" max="120" required className={input} {...bind('age', 'number')} />
            </Field>
            <Field label="Street address">
              <input required className={input} {...bind('address')} />
            </Field>
            <Field label="City">
              <input required className={input} {...bind('city')} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="State">
                <select className={input} {...bind('state')}>
                  <option value="OH">Ohio</option>
                </select>
              </Field>
              <Field label="ZIP">
                <input inputMode="numeric" pattern="\d{5}" required className={input} {...bind('zip')} />
              </Field>
            </div>
          </Section>

          <Section icon={Users} title="Household" subtitle="Everyone who lives with you and shares meals.">
            <Field label="People in household (including you)">
              <input type="number" min="1" max="20" required className={input} {...bind('household_size', 'number')} />
            </Field>
            <Field label="Children under 19">
              <input type="number" min="0" max="19" className={input} {...bind('children_count', 'number')} />
            </Field>
            <label className="flex items-start gap-3 rounded-xl bg-canvas px-4 py-3 sm:col-span-2">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-navy"
                checked={Boolean(form.has_young_child_or_pregnant)}
                onChange={(e) => set({ has_young_child_or_pregnant: e.target.checked })}
              />
              <span className="text-[13.5px] text-navy">
                Someone in my household is pregnant, recently gave birth, or is a child under 5
              </span>
            </label>
          </Section>

          <IncomeSection value={form} onChange={set} applicant={applicant} />

          {error && <p className="text-[13px] text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="group mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-brand-deep hover:shadow-lg hover:shadow-brand/25 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? 'Saving your profile…' : 'Continue'}
            {!saving && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
          </button>
        </form>
      </main>
    </div>
  );
}
