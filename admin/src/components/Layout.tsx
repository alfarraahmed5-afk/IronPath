import { NavLink } from 'react-router-dom';
import {
  CreditCard,
  LayoutDashboard,
  Link2,
  Megaphone,
  QrCode,
  Settings as SettingsIcon,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { readStoredUser, signOut } from '../lib/session';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavLinkDef {
  to: string;
  label: string;
  Icon: LucideIcon;
}

const NAV_LINKS: NavLinkDef[] = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/members', label: 'Members', Icon: Users },
  { to: '/invites', label: 'Invites', Icon: Link2 },
  { to: '/announcements', label: 'Announcements', Icon: Megaphone },
  { to: '/challenges', label: 'Challenges', Icon: Trophy },
  { to: '/grow', label: 'Grow', Icon: QrCode },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
  { to: '/subscription', label: 'Subscription', Icon: CreditCard },
];

export default function Layout({ children }: LayoutProps) {
  const user = readStoredUser() ?? {};

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
          {NAV_LINKS.map(({ to, label, Icon }) => (
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
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    strokeWidth={1.75}
                    className={isActive ? 'text-orange-500' : 'text-gray-400'}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </>
              )}
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
