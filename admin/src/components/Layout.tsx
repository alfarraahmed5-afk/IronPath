import { NavLink, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

interface StoredUser {
  email?: string;
  username?: string;
  gym_name?: string;
}

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/members', label: 'Members', icon: '👥' },
  { to: '/invites', label: 'Invites', icon: '🔗' },
  { to: '/announcements', label: 'Announcements', icon: '📢' },
  { to: '/challenges', label: 'Challenges', icon: '⚡' },
];

function signOut() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

export default function Layout({ children }: LayoutProps) {
  const stored = localStorage.getItem('user');
  const user: StoredUser = stored ? JSON.parse(stored) : {};

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-10">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-800">
          <span className="text-orange-500 font-bold text-xl">IronPath</span>
          <span className="ml-2 text-gray-500 text-xs font-medium uppercase tracking-wider">Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_LINKS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gray-800 text-orange-500'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800',
                ].join(' ')
              }
            >
              <span>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom user info */}
        <div className="px-4 py-4 border-t border-gray-800">
          {user.email && (
            <p className="text-gray-500 text-xs truncate mb-3">{user.email}</p>
          )}
          <button
            onClick={signOut}
            className="w-full text-left text-sm text-gray-400 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="bg-gray-900 border-b border-gray-800 h-16 flex items-center justify-end px-6 gap-4">
          <span className="text-gray-400 text-sm">
            {user.gym_name ?? user.email ?? ''}
          </span>
          <button
            onClick={signOut}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 bg-gray-950 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
