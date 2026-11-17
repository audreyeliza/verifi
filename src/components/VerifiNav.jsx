import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { isCaseworker } from '@/lib/verifi';
import { cn } from '@/lib/utils';

// Each role has its own tabs. Caseworkers never see applicant screens and vice versa.
export const APPLICANT_TABS = [
  { to: '/home', label: 'Home', match: ['/home'] },
  { to: '/applications', label: 'Applications', match: ['/applications', '/results', '/calculator'] },
  { to: '/profile', label: 'Profile', match: ['/profile', '/connect', '/consent'] },
];
export const CASEWORKER_TABS = [
  { to: '/caseworker', label: 'Queue', match: ['/caseworker'], exclude: ['/caseworker/updates'] },
  { to: '/caseworker/updates', label: 'Law updates', match: ['/caseworker/updates'] },
];

export const isTabActive = (tab, pathname) =>
  !(tab.exclude ?? []).some((x) => pathname.startsWith(x)) &&
  tab.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));

export default function VerifiNav({ compact = false, className }) {
  const { pathname } = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const staff = isCaseworker(user);
  const tabs = staff ? CASEWORKER_TABS : APPLICANT_TABS;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-border/60 bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-md',
        className
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-8 md:h-16">
        <Link to={isAuthenticated ? (staff ? '/caseworker' : '/home') : '/'} className="group flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand text-white transition-transform group-hover:-translate-y-0.5">
            <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-heading text-[18px] font-semibold tracking-tight text-navy">Verifi</span>
            {!compact && (
              <span className="mt-1 hidden text-[11px] font-medium text-muted-foreground sm:block">
                {staff ? 'Caseworker workspace' : 'Verify once. Apply everywhere.'}
              </span>
            )}
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-2">
          {isAuthenticated && (
            <nav className="hidden items-center gap-1 rounded-full bg-white p-1 shadow-sm md:flex">
              {tabs.map((tab) => (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors',
                    isTabActive(tab, pathname) ? 'bg-brand text-white' : 'text-muted-foreground hover:text-navy'
                  )}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
          )}

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="hidden max-w-[180px] truncate text-[12.5px] text-muted-foreground lg:block">
                {user?.email}
              </span>
              <button
                type="button"
                onClick={() => logout()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-navy shadow-sm transition-colors hover:bg-secondary"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Link to="/login" className="rounded-xl px-3 py-2 text-[13px] font-semibold text-navy hover:bg-white">
                Log in
              </Link>
              <Link
                to="/register"
                className="hidden rounded-xl bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-deep sm:block"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
