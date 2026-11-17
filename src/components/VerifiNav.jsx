import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { isCaseworker } from '@/lib/verifi';
import { cn } from '@/lib/utils';

const APPLICANT_PATHS = ['/', '/consent', '/connect', '/profile', '/results', '/applications'];

function Tab({ to, active, children }) {
  return (
    <Link
      to={to}
      className={cn(
        'rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors sm:px-4',
        active ? 'bg-white text-navy shadow-sm' : 'text-muted-foreground hover:text-navy'
      )}
    >
      {children}
    </Link>
  );
}

export default function VerifiNav({ compact = false }) {
  const { pathname } = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const inCaseworker = pathname.startsWith('/caseworker');
  const staff = isCaseworker(user);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-white/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-8 md:h-16">
        <Link to="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-white transition-transform group-hover:-translate-y-0.5">
            <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-heading text-[17px] font-semibold tracking-tight text-navy">Verifi</span>
            {!compact && (
              <span className="mt-1 hidden text-[11px] font-medium text-muted-foreground sm:block">
                Verify once. Apply everywhere.
              </span>
            )}
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-2">
          {isAuthenticated && (
            <nav className="hidden items-center gap-1 rounded-full bg-secondary p-1 md:flex">
              <Tab to="/applications" active={!inCaseworker && pathname !== '/'}>
                {staff ? 'Applicant' : 'My applications'}
              </Tab>
              {staff && (
                <Tab to="/caseworker" active={inCaseworker}>
                  Caseworker
                </Tab>
              )}
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
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-navy"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-[13px] font-semibold text-navy hover:bg-secondary"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="hidden rounded-lg bg-navy px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-navy-deep sm:block"
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

export { APPLICANT_PATHS };
