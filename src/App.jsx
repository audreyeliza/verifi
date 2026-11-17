import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ApplicantRoute, CaseworkerRoute } from '@/components/RoleRoute';
import MobileTabBar from '@/components/MobileTabBar';
// Add page imports here
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Mfa from './pages/Mfa';
import Consent from './pages/Consent';
import Connect from './pages/Connect';
import Profile from './pages/Profile';
import Results from './pages/Results';
import Applications from './pages/Applications';
import Calculator from './pages/Calculator';
import Home from './pages/Home';
import LawUpdatesAdmin from './pages/LawUpdatesAdmin';
import CaseworkerQueue from './pages/CaseworkerQueue';
import CaseDetail from './pages/CaseDetail';

const toLogin = <Navigate to="/login" replace />;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/mfa" element={<Mfa />} />

      <Route element={<ProtectedRoute unauthenticatedElement={toLogin} />}>
        {/* Applicants only — caseworkers are redirected to /caseworker */}
        <Route element={<ApplicantRoute />}>
          <Route path="/home" element={<Home />} />
          <Route path="/consent" element={<Consent />} />
          <Route path="/connect" element={<Connect />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/results" element={<Results />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/calculator" element={<Calculator />} />
        </Route>

        {/* Caseworkers only (app role "admin") — applicants are redirected to /home */}
        <Route element={<CaseworkerRoute />}>
          <Route path="/caseworker" element={<CaseworkerQueue />} />
          <Route path="/caseworker/updates" element={<LawUpdatesAdmin />} />
          <Route path="/caseworker/:id" element={<CaseDetail />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
          <MobileTabBar />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
