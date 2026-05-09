import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import GymsPage from './pages/GymsPage';
import GymDetailPage from './pages/GymDetailPage';
import GymsNewPage from './pages/GymsNewPage';
import InboxPage from './pages/InboxPage';
import PipelinePage from './pages/PipelinePage';
import AnalyticsPage from './pages/AnalyticsPage';
import Layout from './components/Layout';
import { isAuthorized } from './lib/session';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthorized()) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/inbox" element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
        <Route path="/pipeline" element={<ProtectedRoute><PipelinePage /></ProtectedRoute>} />
        <Route path="/gyms" element={<ProtectedRoute><GymsPage /></ProtectedRoute>} />
        <Route path="/gyms/new" element={<ProtectedRoute><GymsNewPage /></ProtectedRoute>} />
        <Route path="/gyms/:gymId" element={<ProtectedRoute><GymDetailPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />

        <Route path="/" element={<Navigate to="/gyms" replace />} />
        <Route path="*" element={<Navigate to="/gyms" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
