import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MembersPage from './pages/MembersPage';
import InvitesPage from './pages/InvitesPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import ChallengesPage from './pages/ChallengesPage';
import GrowPage from './pages/GrowPage';
import SettingsPage from './pages/SettingsPage';
import SubscriptionPage from './pages/SubscriptionPage';
import Layout from './components/Layout';
import { clearSession, isAllowedRole, readStoredUser } from './lib/session';

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

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}
        />
        <Route
          path="/members"
          element={<ProtectedRoute><MembersPage /></ProtectedRoute>}
        />
        <Route
          path="/invites"
          element={<ProtectedRoute><InvitesPage /></ProtectedRoute>}
        />
        <Route
          path="/announcements"
          element={<ProtectedRoute><AnnouncementsPage /></ProtectedRoute>}
        />
        <Route
          path="/challenges"
          element={<ProtectedRoute><ChallengesPage /></ProtectedRoute>}
        />
        <Route
          path="/grow"
          element={<ProtectedRoute><GrowPage /></ProtectedRoute>}
        />
        <Route
          path="/settings"
          element={<ProtectedRoute><SettingsPage /></ProtectedRoute>}
        />
        <Route
          path="/subscription"
          element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>}
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
