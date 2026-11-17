import { Link, useLocation } from 'react-router-dom';
import { ListChecks, UserRound, Sparkles, ClipboardList } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { isCaseworker } from '@/lib/verifi';
import { cn } from '@/lib/utils';

// Hide on full-screen auth pages and the public landing page.
const HIDDEN_ON = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/mfa'];

// App-style bottom navigation, phones only (md:hidden). Desktop keeps the top nav.
// To add a tab for a new feature, add an entry here; keep it to 5 tabs max.
export default function MobileTabBar() {
  const { pathname } = useLocation();
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || HIDDEN_ON.includes(pathname)) return null;

  const tabs = [
    { to: '/applications', label: 'Applications', icon: ListChecks, match: ['/applications'] },
    { to: '/results', label: 'Benefits', icon: Sparkles, match: ['/results'] },
    { to: '/profile', label: 'Profile', icon: UserRound, match: ['/profile', '/connect', '/consent'] },
  ];
  if (isCaseworker(user)) {
    tabs.push({ to: '/caseworker', label: 'Queue', icon: ClipboardList, match: ['/caseworker'] });
  }

  return (
    <>
      {/* Spacer so page content isn't hidden behind the bar */}
      <div className="h-[calc(4.25rem+env(safe-area-inset-bottom))] md:hidden" aria-hidden="true" />
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label="Main"
      >
        <div className="mx-auto flex max-w-md">
          {tabs.map((tab) => {
            const active = tab.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  'flex h-[4.25rem] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                  active ? 'text-navy' : 'text-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    active && 'bg-secondary'
                  )}
                >
                  <tab.icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.4 : 2} />
                </span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
