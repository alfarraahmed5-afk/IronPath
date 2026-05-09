import { NavLink } from 'react-router-dom';
import {
  Inbox as InboxIcon,
  Kanban,
  Building2,
  LineChart,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { clearSessionAndRedirect, readStoredUser } from '../lib/session';

interface LayoutProps {
  children: React.ReactNode;
}

// Audit + Settings nav entries land with their routes in Phase B/F. Linking to
// them now silently bounces operators to /gyms via the catch-all, so they stay
// out of the sidebar until the routes exist.
const NAV_LINKS: { to: string; label: string; Icon: LucideIcon }[] = [
  { to: '/inbox', label: 'Inbox', Icon: InboxIcon },
  { to: '/pipeline', label: 'Pipeline', Icon: Kanban },
  { to: '/gyms', label: 'Gyms', Icon: Building2 },
  { to: '/analytics', label: 'Analytics', Icon: LineChart },
];

function StatusBar() {
  const env = import.meta.env.VITE_ENV ?? import.meta.env.MODE ?? 'unknown';
  const sha = import.meta.env.VITE_COMMIT_SHA;
  const shortSha = typeof sha === 'string' && sha.length > 0 ? sha.slice(0, 7) : '—';
  // Latency is wired up in Phase B once we have a heartbeat endpoint.
  const latency = '—';

  return (
    <header
      className="h-9 flex items-center justify-between px-6 border-b border-ink-700 bg-ink-800 text-ink-300"
      data-testid="console-status-bar"
    >
      <div className="flex items-center gap-3 text-xs">
        <span className="px-2 py-0.5 rounded-xs bg-ink-700 text-ink-100 uppercase tracking-wider font-medium">
          {env}
        </span>
        <span className="font-mono text-ink-300" data-numeric>
          {shortSha}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-ink-300">latency</span>
        <span className="font-mono text-ink-100" data-numeric>
          {latency}
        </span>
      </div>
    </header>
  );
}

export default function Layout({ children }: LayoutProps) {
  const user = readStoredUser();

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-60 bg-ink-800 border-r border-ink-700 flex flex-col z-10">
        <div className="px-5 py-4 border-b border-ink-700">
          <span className="text-brand-400 font-semibold text-base tracking-tight">
            IronPath
          </span>
          <span className="ml-2 text-ink-300 text-[10px] font-medium uppercase tracking-wider">
            Console
          </span>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV_LINKS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-ink-700 text-brand-400'
                    : 'text-ink-200 hover:text-ink-50 hover:bg-ink-700/60',
                ].join(' ')
              }
            >
              <Icon size={16} strokeWidth={1.75} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-ink-700">
          {user?.email && (
            <p className="text-ink-300 text-xs truncate mb-2 font-mono" data-numeric>
              {user.email}
            </p>
          )}
          <button
            type="button"
            onClick={() => clearSessionAndRedirect('/login')}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-200 hover:text-ink-50 hover:bg-ink-700 transition-colors"
          >
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="ml-60 flex-1 flex flex-col min-h-screen">
        <StatusBar />
        <main className="flex-1 bg-canvas p-8">{children}</main>
      </div>
    </div>
  );
}
