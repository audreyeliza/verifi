import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Building2 } from 'lucide-react';
import VerifiNav from '@/components/VerifiNav';
import StatusPill from '@/components/StatusPill';
import { base44 } from '@/api/base44Client';
import { PROGRAM_LABELS, initials, shortDate, toList } from '@/lib/verifi';

function SourceBadges({ applicant }) {
  if (!applicant.income_source) return <span className="text-[13px] text-muted-foreground">—</span>;
  return <StatusPill status={applicant.income_source} />;
}

function ProgramChips({ applications = [] }) {
  if (!applications.length) return <span className="text-[13px] text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {applications.map((application) => (
        <span
          key={application.id}
          className="rounded-md border border-border bg-white px-1.5 py-1 text-[10.5px] font-semibold text-navy"
        >
          {PROGRAM_LABELS[application.program] ?? application.program}
        </span>
      ))}
    </div>
  );
}

export default function CaseworkerQueue() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [applicantsRes, applicationsRes] = await Promise.all([
        base44.entities.Applicant.list('-created_date', 100),
        base44.entities.Application.list('-submitted_at', 200),
      ]);
      if (!alive) return;

      const applicants = toList(applicantsRes);
      const applications = toList(applicationsRes);

      const built = applicants.map((applicant) => {
        const own = applications.filter((application) => application.applicant === applicant.id);
        const latest = own.reduce(
          (max, application) =>
            Math.max(max, new Date(application.submitted_at || 0).getTime()),
          0
        );
        return { applicant, applications: own, latest };
      });

      // Applicants with something waiting first, then most recent.
      const waiting = (row) => row.applications.some((app) => app.status === 'Submitted' || app.status === 'Under review');
      built.sort((a, b) => Number(waiting(b)) - Number(waiting(a)) || b.latest - a.latest);

      setRows(built);
      setLoading(false);
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  const pending = rows.filter((row) =>
    row.applications.some((application) => ['Submitted', 'Under review'].includes(application.status))
  ).length;

  return (
    <div className="min-h-screen bg-canvas">
      <VerifiNav />

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <div className="animate-rise rounded-3xl bg-navy px-6 py-6 text-white sm:px-8 sm:py-7">
          <p className="flex items-center gap-2 text-[12px] font-medium text-white/60">
            <Building2 className="h-3.5 w-3.5" />
            Caseworker workspace
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-heading text-[26px] font-semibold leading-tight sm:text-[30px]">
                Verification queue
              </h1>
              <p className="mt-1 text-[13.5px] text-white/70">
                Every applicant who has signed up, newest activity first.
              </p>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="font-heading text-[24px] font-semibold leading-none">
                  {pending}
                </p>
                <p className="mt-1 text-[11.5px] uppercase tracking-[0.1em] text-white/60">
                  Awaiting review
                </p>
              </div>
              <div>
                <p className="font-heading text-[24px] font-semibold leading-none">{rows.length}</p>
                <p className="mt-1 text-[11.5px] uppercase tracking-[0.1em] text-white/60">
                  In queue
                </p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="py-16 text-center text-[14px] text-muted-foreground">Loading queue…</p>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-[14px] text-muted-foreground">
            No applicants yet. They&apos;ll appear here as soon as someone signs up and starts a profile.
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="mt-6 hidden overflow-hidden rounded-2xl border border-border bg-white md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-canvas/70 text-[11px] uppercase tracking-[0.1em] text-navy-muted">
                    <th className="px-5 py-3 font-semibold">Applicant</th>
                    <th className="px-5 py-3 font-semibold">Programs</th>
                    <th className="px-5 py-3 font-semibold">Income source</th>
                    <th className="px-5 py-3 font-semibold">Submitted</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ applicant, applications, latest }) => {
                    const isNew = applications.some((application) => application.status === 'Submitted');
                    return (
                      <tr
                        key={applicant.id}
                        className="group border-b border-border/60 transition-colors last:border-0 hover:bg-canvas/60"
                      >
                        <td className="px-5 py-4">
                          <Link to={`/caseworker/${applicant.id}`} className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-[12px] font-semibold text-navy">
                              {initials(applicant.name)}
                            </span>
                            <span>
                              <span className="flex items-center gap-2">
                                <span className="font-heading text-[14px] font-semibold text-navy">
                                  {applicant.name}
                                </span>
                                {isNew && (
                                  <span className="rounded-full bg-navy px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white">
                                    New
                                  </span>
                                )}
                              </span>
                              <span className="mt-0.5 block text-[12px] text-muted-foreground">
                                {applicant.city}, {applicant.state} · {applicant.household_size} in
                                household
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <ProgramChips applications={applications} />
                        </td>
                        <td className="px-5 py-4">
                          <SourceBadges applicant={applicant} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-[13px] text-navy-muted">
                          {latest ? shortDate(latest) : '—'}
                        </td>
                        <td className="px-5 py-4">
                          <StatusPill status={applicant.status} />
                        </td>
                        <td className="px-3 py-4">
                          <Link
                            to={`/caseworker/${applicant.id}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors group-hover:bg-white group-hover:text-navy"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="mt-6 space-y-3 md:hidden">
              {rows.map(({ applicant, applications, latest }) => {
                const isNew = applications.some((application) => application.status === 'Submitted');
                return (
                  <Link
                    key={applicant.id}
                    to={`/caseworker/${applicant.id}`}
                    className="block rounded-2xl border border-border bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-[12px] font-semibold text-navy">
                          {initials(applicant.name)}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-heading text-[14px] font-semibold text-navy">
                              {applicant.name}
                            </p>
                            {isNew && (
                              <span className="rounded-full bg-navy px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white">
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-muted-foreground">
                            {applicant.city}, {applicant.state}
                          </p>
                        </div>
                      </div>
                      <StatusPill status={applicant.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <ProgramChips applications={applications} />
                      <span className="text-[12px] text-muted-foreground">
                        {latest ? shortDate(latest) : '—'}
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <SourceBadges applicant={applicant} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}