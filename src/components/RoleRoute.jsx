import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { isCaseworker } from '@/lib/verifi';

// One account = one experience. Caseworkers (app role "admin") only ever see the
// caseworker workspace; applicants only see their own screens. Each side redirects
// to its own home instead of showing the other. Nest under ProtectedRoute.
//
// This is a UX boundary. Data access is enforced separately by entity RLS rules.
export const homePathFor = (user) => (isCaseworker(user) ? '/caseworker' : '/home');

export function ApplicantRoute() {
  const { user } = useAuth();
  if (isCaseworker(user)) return <Navigate to="/caseworker" replace />;
  return <Outlet />;
}

export function CaseworkerRoute() {
  const { user } = useAuth();
  if (!isCaseworker(user)) return <Navigate to="/home" replace />;
  return <Outlet />;
}
