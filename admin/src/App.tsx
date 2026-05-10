import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import PreviewPage from './pages/PreviewPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import MembersPage from './pages/MembersPage';
import InvitesPage from './pages/InvitesPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import ChallengesPage from './pages/ChallengesPage';
import GrowPage from './pages/GrowPage';
import SettingsPage from './pages/SettingsPage';
import SubscriptionPage from './pages/SubscriptionPage';
import Layout from './components/Layout';
import { clearSession, isAllowedRole, needsOnboarding, readStoredUser } from './lib/session';
import { VERCEL_EASE } from '@/lib/motion';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/login" replace />;

  const user = readStoredUser();
  if (!isAllowedRole(user?.role)) {
    // Stale or wrong-role session — wipe and bounce, capturing where we
    // were so a successful re-login lands the user back here.
    clearSession();
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?reason=session_expired&next=${next}`} replace />;
  }

  // Phase C onboarding gate. New trial gyms are pushed through the wizard
  // before they can reach the dashboard. Existing gyms (created pre-feature)
  // are backfilled with onboarding_completed_at = NOW() so they're treated
  // as already-complete and don't see the wizard.
  if (needsOnboarding(user) && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <Layout>{children}</Layout>;
}

// EnrolledRoute — for /onboarding only. Same auth gate as ProtectedRoute
// (must be a logged-in gym_owner) but bypasses the Layout wrapper since
// the wizard renders its own full-screen surface, and short-circuits if
// the wizard is already complete (don't let a power user land on
// /onboarding after they've finished it).
function EnrolledRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/login" replace />;
  const user = readStoredUser();
  if (!isAllowedRole(user?.role)) {
    clearSession();
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?reason=session_expired&next=${next}`} replace />;
  }
  if (!needsOnboarding(user)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// PageShell — every routed page lives inside one of these so framer-motion
// can stage entrance/exit. Keeping the in/out timings asymmetric (180ms exit,
// 240ms entry with a 60ms delay) gives nav a "the next page is arriving"
// rhythm rather than a hard cut. AnimatePresence above swaps them in `wait`
// mode so the outgoing page finishes leaving before the incoming one mounts.
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: 0.24, ease: VERCEL_EASE, delay: 0.06 },
      }}
      exit={{
        opacity: 0,
        y: -8,
        transition: { duration: 0.18, ease: VERCEL_EASE },
      }}
      style={{ minHeight: '100%' }}
    >
      {children}
    </motion.div>
  );
}

// AnimatedRoutes — must live INSIDE <BrowserRouter> so useLocation() works.
// We pass `location` + `key` to <Routes> so AnimatePresence can detect the
// swap and run exit/enter on the wrapper divs.
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageShell><LoginPage /></PageShell>} />
        <Route path="/reset-password" element={<PageShell><ResetPasswordPage /></PageShell>} />
        <Route path="/preview" element={<PageShell><PreviewPage /></PageShell>} />
        <Route path="/onboarding" element={<EnrolledRoute><PageShell><OnboardingPage /></PageShell></EnrolledRoute>} />
        <Route
          path="/dashboard"
          element={<ProtectedRoute><PageShell><DashboardPage /></PageShell></ProtectedRoute>}
        />
        <Route
          path="/members"
          element={<ProtectedRoute><PageShell><MembersPage /></PageShell></ProtectedRoute>}
        />
        <Route
          path="/invites"
          element={<ProtectedRoute><PageShell><InvitesPage /></PageShell></ProtectedRoute>}
        />
        <Route
          path="/announcements"
          element={<ProtectedRoute><PageShell><AnnouncementsPage /></PageShell></ProtectedRoute>}
        />
        <Route
          path="/challenges"
          element={<ProtectedRoute><PageShell><ChallengesPage /></PageShell></ProtectedRoute>}
        />
        <Route
          path="/grow"
          element={<ProtectedRoute><PageShell><GrowPage /></PageShell></ProtectedRoute>}
        />
        <Route
          path="/settings"
          element={<ProtectedRoute><PageShell><SettingsPage /></PageShell></ProtectedRoute>}
        />
        <Route
          path="/subscription"
          element={<ProtectedRoute><PageShell><SubscriptionPage /></PageShell></ProtectedRoute>}
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
