import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MembersPage from './pages/MembersPage';
import InvitesPage from './pages/InvitesPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import ChallengesPage from './pages/ChallengesPage';
import Layout from './components/Layout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/login" replace />;
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
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
