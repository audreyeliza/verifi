import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { homePathFor } from '@/components/RoleRoute';
import { ArrowRight, ShieldCheck, FileStack, BadgeDollarSign, CalendarClock } from 'lucide-react';
import VerifiNav from '@/components/VerifiNav';

const STATS = [
  {
    icon: FileStack,
    figure: '4 portals',
    title: '4 times the paperwork',
    copy: 'The same pay stub, uploaded again for SNAP, WIC, HEAP and Medicaid.',
  },
  {
    icon: BadgeDollarSign,
    figure: 'Up to $500B',
    title: 'lost to fraud yearly',
    copy: 'Self-reported income is slow to check, so errors go undetected for months.',
  },
  {
    icon: CalendarClock,
    figure: 'Every 6 months',
    title: 'Medicaid checks starting 2027',
    copy: 'New federal eligibility checks mean far more verification work per household.',
  },
];

const PROGRAMS = [
  { name: 'SNAP', value: '~$369/mo' },
  { name: 'WIC', value: 'Food package' },
  { name: 'HEAP', value: 'Energy help' },
  { name: 'Medicaid', value: 'Covered' },
];

function VerifiedPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-verify-soft/70 blur-2xl" />
      <div className="rounded-3xl border border-border bg-white p-6 shadow-card sm:p-7">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Example profile
        </p>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary font-heading text-sm font-semibold text-navy">
              ML
            </span>
            <div>
              <p className="font-heading text-[15px] font-semibold text-navy">Maria Lopez</p>
              <p className="text-[13px] text-muted-foreground">Columbus, OH · Household of 3</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-verify-soft px-2.5 py-1 text-[11px] font-semibold text-verify">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.4} />
            Verified
          </span>
        </div>

        <dl className="mt-6 space-y-0.5">
          {[
            ['Income', '$2,100/mo', 'Pay stub'],
            ['Household', '3 people', 'Profile'],
            ['Address', 'Columbus, OH', 'Profile'],
          ].map(([label, value, source]) => (
            <div
              key={label}
              className="flex items-center justify-between border-b border-border/60 py-2.5 last:border-0"
            >
              <dt className="text-[13px] text-muted-foreground">{label}</dt>
              <dd className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-navy">{value}</span>
                <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy-muted">
                  {source}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {PROGRAMS.map((p) => (
            <div
              key={p.name}
              className="rounded-xl border border-border/80 bg-canvas px-3 py-2.5"
            >
              <p className="text-[13px] font-semibold text-navy">{p.name}</p>
              <p className="text-[11px] text-verify">{p.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { isAuthenticated, user } = useAuth();
  // Signed-in people go straight to their own side of the app.
  if (isAuthenticated) return <Navigate to={homePathFor(user)} replace />;

  return (
    <div className="min-h-screen bg-white">
      <VerifiNav />

      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        <section className="grid items-center gap-14 pt-14 pb-16 lg:grid-cols-[1.15fr_0.85fr] lg:pt-24 lg:pb-24">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-[12px] font-medium text-navy">
              <span className="h-1.5 w-1.5 rounded-full bg-verify" />
              Consent-based verification for safety-net programs
            </span>

            <h1 className="mt-6 font-heading text-[40px] font-semibold leading-[1.04] text-navy sm:text-[56px] lg:text-[64px]">
              Verify once.
              <br />
              <span className="text-verify">Apply everywhere.</span>
            </h1>

            <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-navy-muted sm:text-[17px]">
              Families prove the same income 4 times for 4 programs. Verifi pulls verified records
              from the source—with consent—into every application at once.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/register"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-brand-deep hover:shadow-lg hover:shadow-brand/25"
              >
                Get started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-white px-6 py-3.5 text-[15px] font-semibold text-navy transition-colors hover:border-navy/30 hover:bg-canvas"
              >
                Log in
              </Link>
            </div>

            <p className="mt-5 text-[13px] text-muted-foreground">
              You control what&apos;s shared and can revoke access anytime.
            </p>
          </div>

          <div className="animate-rise" style={{ animationDelay: '120ms' }}>
            <VerifiedPreview />
          </div>
        </section>

        <section className="pb-20">
          <div className="grid gap-4 sm:grid-cols-3">
            {STATS.map((stat, i) => (
              <div
                key={stat.title}
                className="animate-rise rounded-2xl border border-border bg-white p-6 transition-shadow hover:shadow-card"
                style={{ animationDelay: `${180 + i * 90}ms` }}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-navy">
                  <stat.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                </span>
                <p className="mt-5 font-heading text-[26px] font-semibold leading-tight text-navy">
                  {stat.figure}
                </p>
                <p className="mt-1 font-heading text-[15px] font-medium text-navy">{stat.title}</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{stat.copy}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[12px] text-muted-foreground">
            Eligibility results are estimates from published Ohio program rules. Final decisions are made by each agency.
          </p>
        </section>
      </main>

      <footer className="border-t border-border/70 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 text-[12.5px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Verifi · Consent-based verification layer</p>
          <p>Estimates only. Not affiliated with any government agency.</p>
        </div>
      </footer>
    </div>
  );
}