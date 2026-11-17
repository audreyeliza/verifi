import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Bell, Check, ListChecks, Sparkles, Landmark, ChevronRight, ShieldCheck } from 'lucide-react';
import VerifiNav from '@/components/VerifiNav';
import { LawUpdateCard, LawUpdatesPopup, LawUpdatesSheet } from '@/components/LawUpdates';
import { useAuth } from '@/lib/AuthContext';
import { getMyApplicant, getMyApplications, money } from '@/lib/verifi';
import { checkEligibility, missingFields } from '@/lib/eligibility';
import { useLawUpdates } from '@/lib/useLawUpdates';
import { cn } from '@/lib/utils';

const SOURCE_PILL = {
  'Verified at source': 'Verified',
  'Uploaded document': 'Document checked',
  'Self-reported': 'Self-reported',
};

function ProfileCard({ applicant }) {
  const ready = applicant && !missingFields(applicant).length;
  const first = applicant?.name && !applicant.name.includes('@') ? applicant.name : 'Your profile';

  return (
    <div className="relative">
      <Link
        to={ready ? '/profile' : '/consent'}
        className="bg-brand-card relative block overflow-hidden rounded-[1.75rem] p-6 text-white shadow-[0_24px_48px_-24px_rgba(47,79,230,0.7)]"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
            Verifi household profile
          </p>
          {ready && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold text-brand">
              <Check className="h-3 w-3" strokeWidth={3} />
              {SOURCE_PILL[applicant.income_source] ?? 'Self-reported'}
            </span>
          )}
        </div>

        <p className="mt-5 font-heading text-[28px] font-semibold leading-tight">{first}</p>
        <p className="mt-1 text-[13.5px] text-white/80">
          {ready
            ? `Household of ${applicant.household_size} · ${applicant.city || 'Ohio'}, ${applicant.state || 'OH'}`
            : 'Fill this out once to apply everywhere.'}
        </p>

        <div className="mt-8 flex items-end justify-between">
          <p className="text-[13px] text-white/85">
            {ready ? 'Your info, ready for every program.' : 'Takes about 3 minutes.'}
          </p>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand">
            <ArrowUpRight className="h-5 w-5" strokeWidth={2.4} />
          </span>
        </div>
      </Link>

      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-brand shadow-md ring-1 ring-border/60">
          <ShieldCheck className="h-4 w-4" strokeWidth={2.4} />
          {ready ? 'Profile ready' : 'Profile not started'}
        </span>
      </div>
    </div>
  );
}

function Tile({ to, onClick, icon: Icon, title, subtitle, accent }) {
  const body = (
    <>
      <div className="flex items-start justify-between">
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', accent ? 'bg-brand text-white' : 'bg-white/10 text-white')}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <ArrowUpRight className="h-4 w-4 text-white/60" />
      </div>
      <p className="mt-6 font-heading text-[16px] font-semibold text-white">{title}</p>
      <p className="mt-0.5 text-[12px] leading-snug text-white/60">{subtitle}</p>
    </>
  );
  const cls = 'block rounded-3xl bg-white/[0.07] p-4 text-left ring-1 ring-white/10 transition-colors hover:bg-white/[0.12]';
  return to ? (
    <Link to={to} className={cls}>{body}</Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>{body}</button>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [applicant, setApplicant] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [popupClosed, setPopupClosed] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([getMyApplicant(user), getMyApplications(user)])
      .then(([row, apps]) => {
        if (!alive) return;
        setApplicant(row);
        setApplications(apps);
      })
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [user]);

  const law = useLawUpdates(user, applicant, applications);
  const popupUpdate = loaded && !law.loading && !popupClosed && !sheetOpen ? law.unseen[0] : null;

  const ready = applicant && !missingFields(applicant).length;
  const estimate = ready
    ? checkEligibility(applicant).filter((r) => r.result !== 'Not eligible')
    : [];
  const monthly = estimate.reduce((sum, r) => sum + (r.amount || 0), 0);
  const active = applications.filter((a) => ['Submitted', 'Under review'].includes(a.status)).length;
  const approved = applications.filter((a) => a.status === 'Approved').length;

  const firstName = (applicant?.name || user?.full_name || '').split(' ')[0];
  const greeting = firstName && !firstName.includes('@') ? `Hi, ${firstName}` : 'Welcome';

  const openSheet = () => {
    setSheetOpen(true);
    law.markSeen(law.relevant.map((u) => u.id));
  };

  return (
    <div className="min-h-screen bg-canvas">
      <VerifiNav className="hidden md:block" />

      <LawUpdatesPopup
        update={popupUpdate}
        moreCount={Math.max(0, law.unseen.length - 1)}
        onOpen={openSheet}
        onDismiss={() => {
          setPopupClosed(true);
          if (popupUpdate) law.markSeen(popupUpdate.id);
        }}
      />
      <LawUpdatesSheet open={sheetOpen} updates={law.relevant} onClose={() => setSheetOpen(false)} />

      <main className="mx-auto max-w-xl">
        {/* Header (phone) */}
        <div className="flex items-center justify-between px-5 pb-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] md:pt-10">
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">Verifi</p>
            <h1 className="font-heading text-[30px] font-semibold leading-tight text-navy">{greeting}</h1>
          </div>
          <button
            type="button"
            onClick={openSheet}
            aria-label={`Law changes${law.unseen.length ? `, ${law.unseen.length} new` : ''}`}
            className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white text-navy shadow-sm"
          >
            <Bell className="h-5 w-5" />
            {law.unseen.length > 0 && (
              <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-white" />
            )}
          </button>
        </div>

        <div className="px-5">
          {loaded ? <ProfileCard applicant={applicant} /> : <div className="h-[220px] animate-pulse rounded-[1.75rem] bg-brand/20" />}
        </div>

        {/* Dark panel */}
        <section className="mt-10 rounded-t-[2rem] bg-navy px-5 pb-8 pt-7 md:mb-10 md:rounded-[2rem]">
          <h2 className="font-heading text-[18px] font-semibold text-white">Your benefits</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Tile
              to={applications.length ? '/applications' : ready ? '/results' : '/consent'}
              icon={ListChecks}
              accent
              title={applications.length ? `${applications.length} applications` : 'Apply'}
              subtitle={
                applications.length
                  ? `${active} in progress · ${approved} approved`
                  : 'Check all 4 programs at once'
              }
            />
            <Tile
              to={ready ? '/applications' : '/consent'}
              icon={Sparkles}
              title={monthly > 0 ? `~${money(monthly)}/mo` : ready ? `${estimate.length} programs` : 'Estimate'}
              subtitle={ready ? 'Estimated support you may qualify for' : 'See what you could get'}
            />
          </div>

          <button
            type="button"
            onClick={openSheet}
            className="mt-3 flex w-full items-center gap-3 rounded-3xl bg-white/[0.07] px-4 py-3.5 text-left ring-1 ring-white/10 hover:bg-white/[0.12]"
          >
            <Landmark className="h-5 w-5 text-white/80" />
            <span className="flex-1">
              <span className="block text-[14px] font-semibold text-white">Law changes</span>
              <span className="block text-[12px] text-white/60">
                {law.relevant.length
                  ? `${law.relevant.length} may affect you${law.unseen.length ? ` · ${law.unseen.length} new` : ''}`
                  : 'Nothing affecting you right now'}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-white/60" />
          </button>

          {law.relevant.length > 0 && (
            <div className="mt-5 space-y-3">
              {law.relevant.slice(0, 2).map((u) => (
                <LawUpdateCard key={u.id} update={u} compact />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
