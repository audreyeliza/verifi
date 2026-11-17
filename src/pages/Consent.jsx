import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, MapPin, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import VerifiNav from '@/components/VerifiNav';
import FlowProgress from '@/components/FlowProgress';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getMyApplicant, getOrCreateMyApplicant } from '@/lib/verifi';

const ITEMS = [
  {
    icon: FileText,
    label: 'Income',
    source: 'Read from the pay stubs you upload',
  },
  {
    icon: Users,
    label: 'Household size',
    source: 'Who lives with you and shares meals',
  },
  {
    icon: MapPin,
    label: 'Address',
    source: 'Your home address in Ohio',
  },
];

const SHARED_WITH = ['Ohio SNAP', 'WIC', 'HEAP', 'Medicaid'];

export default function Consent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [applicant, setApplicant] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    getMyApplicant(user).then((row) => {
      if (alive) setApplicant(row);
    });
    return () => {
      alive = false;
    };
  }, [user]);

  const displayName = applicant?.name || user?.full_name || '';
  const firstName = displayName.includes('@') ? '' : displayName.split(' ')[0];

  const handleConsent = async () => {
    setSaving(true);
    setError('');
    try {
      const row = applicant ?? (await getOrCreateMyApplicant(user));
      await base44.entities.Applicant.update(row.id, {
        consent_at: new Date().toISOString(),
      });
      navigate('/connect');
    } catch (err) {
      setError(err.message || 'Could not save your consent. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <VerifiNav />
      <main className="mx-auto max-w-2xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <FlowProgress current={0} />

        <div className="animate-rise rounded-3xl border border-border bg-white p-6 shadow-card sm:p-9">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-navy-muted">
            Consent request
          </span>
          <h1 className="mt-3 font-heading text-[26px] font-semibold leading-tight text-navy sm:text-[30px]">
            {firstName ? `${firstName}, Verifi` : 'Verifi'} would like to verify:
          </h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-navy-muted">
            Only these three things. Your profile is private to you and the caseworkers who review
            your applications.
          </p>

          <ul className="mt-7 space-y-2.5">
            {ITEMS.map((item) => (
              <li
                key={item.label}
                className="flex items-start gap-3.5 rounded-2xl border border-border/80 bg-canvas px-4 py-3.5"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-navy shadow-sm">
                  <item.icon className="h-4 w-4" strokeWidth={2.1} />
                </span>
                <div>
                  <p className="font-heading text-[14.5px] font-semibold text-navy">{item.label}</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{item.source}</p>
                </div>
                <ShieldCheck className="ml-auto mt-1 h-4 w-4 shrink-0 text-verify" strokeWidth={2.3} />
              </li>
            ))}
          </ul>

          <div className="mt-7 border-t border-border/70 pt-6">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-navy-muted">
              Shared with
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {SHARED_WITH.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-border bg-white px-3 py-1 text-[12.5px] font-medium text-navy"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 rounded-2xl bg-verify-soft/70 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-6">
            <p className="flex items-center gap-2 text-[13px] font-medium text-verify">
              <Clock className="h-4 w-4" strokeWidth={2.2} />
              Access expires in 12 months.
            </p>
            <p className="flex items-center gap-2 text-[13px] font-medium text-verify">
              <ShieldCheck className="h-4 w-4" strokeWidth={2.2} />
              Revoke anytime.
            </p>
          </div>

          {error && <p className="mt-5 text-[13px] text-rose-600">{error}</p>}

          <button
            type="button"
            onClick={handleConsent}
            disabled={saving}
            className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-brand-deep hover:shadow-lg hover:shadow-brand/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving your consent…' : 'I consent'}
            {!saving && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-3 w-full rounded-xl py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-navy"
          >
            Not right now
          </button>
        </div>
      </main>
    </div>
  );
}