import { Link, useLocation } from 'react-router-dom';
import { House, ListChecks, UserRound, ClipboardList, Landmark } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { isCaseworker } from '@/lib/verifi';
import { APPLICANT_TABS, CASEWORKER_TABS, isTabActive } from '@/components/VerifiNav';
import { cn } from '@/lib/utils';

// Hide on full-screen auth pages and the public landing page.
const HIDDEN_ON = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/mfa'];

const ICONS = {
  '/home': House,
  '/applications': ListChecks,
  '/profile': UserRound,
  '/caseworker': ClipboardList,
  '/caseworker/updates': Landmark,
};

// Floating pill navigation, phones only (md:hidden). Tabs come from VerifiNav so
// desktop and phone stay in sync. Add a tab there; keep it to 5 max.
export default function MobileTabBar() {
  const { pathname } = useLocation();
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated || HIDDEN_ON.includes(pathname)) return null;

  const tabs = isCaseworker(user) ? CASEWORKER_TABS : APPLICANT_TABS;

  return (
    <>
      {/* Spacer so page content isn't hidden behind the bar */}
      <div className="h-[calc(6rem+env(safe-area-inset-bottom))] md:hidden" aria-hidden="true" />
      <nav
        className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:hidden"
        aria-label="Main"
      >
        <div className="mx-auto flex max-w-sm items-center gap-1 rounded-full bg-white p-1.5 shadow-[0_12px_40px_-12px_rgba(16,32,73,0.35)] ring-1 ring-border/70">
          {tabs.map((tab) => {
            const active = isTabActive(tab, pathname);
            const Icon = ICONS[tab.to] ?? House;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium transition-colors',
                  active ? 'bg-brand text-white' : 'text-navy-muted'
                )}
              >
                <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.4 : 2} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
