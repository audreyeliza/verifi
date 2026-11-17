import { Link, Outlet } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { isCaseworker } from '@/lib/verifi';
import VerifiNav from '@/components/VerifiNav';

// Nest under ProtectedRoute. Only users with the app role "admin" (caseworkers) pass.
// This is a UX gate; the real protection is the entity RLS rules, which only let
// admins read other people's records or change application status.
export default function CaseworkerRoute() {
  const { user } = useAuth();
  if (isCaseworker(user)) return <Outlet />;

  return (
    <div className="min-h-screen bg-canvas">
      <VerifiNav />
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-navy">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-heading text-[20px] font-semibold text-navy">Caseworkers only</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-navy-muted">
          This area is for agency staff. If you work for an agency, ask your administrator to give
          your account caseworker access.
        </p>
        <Link
          to="/applications"
          className="mt-6 inline-flex rounded-xl bg-navy px-5 py-3 text-[14px] font-semibold text-white hover:bg-navy-deep"
        >
          Go to my applications
        </Link>
      </div>
    </div>
  );
}
