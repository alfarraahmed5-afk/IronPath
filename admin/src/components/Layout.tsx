import { NavLink } from 'react-router-dom';
import {
  CreditCard,
  LayoutDashboard,
  Link2,
  LogOut,
  Megaphone,
  QrCode,
  Settings as SettingsIcon,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { LayoutGroup, motion } from 'framer-motion';
import { Logomark } from './Logomark';
import { LivePulseStrip } from '@/components/LivePulseStrip';
import { EmberSeam } from '@/components/EmberSeam';
import { readStoredUser, signOut } from '../lib/session';
import { cn } from '@/lib/utils';
import { springModal } from '@/lib/motion';

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
    <div className="flex min-h-screen surface-shell">
      {/* Live Pulse Strip — α4 fills this with the real 4px ember band that
          pulses left-to-right when a member starts a workout. Mounted here
          fixed/edge-to-edge above the topbar so it sits at the absolute top
          of the admin shell. */}
      <LivePulseStrip />

      {/* Sidebar — chrome rail. surface-shell (#0A0A0B) sits one notch darker
          than the main column, so the rail reads like architectural chrome
          rather than another card. Visual designer council brief #2. */}
      <aside className="fixed left-0 top-0 h-full w-64 surface-shell border-r border-ink-800 flex flex-col z-10">
        {/* Brand block */}
        <div className="px-5 py-4 border-b border-ink-800 flex items-center gap-2.5">
          <Logomark size={26} />
          <div className="flex items-baseline gap-1.5">
            <span className="text-ink-50 font-semibold text-base tracking-tight">IronPath</span>
            <span className="text-ink-400 text-[10px] font-medium uppercase tracking-[0.14em]">
              Admin
            </span>
          </div>
        </div>

        {/* Nav — sliding ember pill via shared layoutId. The 2px indicator
            flies between items on a stiff spring rather than snap-toggling.
            Inactive items ghost in a 30%-opacity preview pill on hover. */}
        <LayoutGroup id="adminNav">
          <nav className="flex-1 px-2 py-4 space-y-0.5">
            {NAV_LINKS.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 pl-4 pr-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'text-ink-50 bg-brand-500/[0.08]'
                      : 'text-ink-400 hover:text-ink-50 hover:bg-ink-850/60'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Sliding ember pill — only rendered behind the active
                        item. Shared layoutId makes framer-motion fly the
                        same DOM node between items on click. */}
                    {isActive && (
                      <motion.span
                        layoutId="navActivePill"
                        aria-hidden="true"
                        className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-sm bg-brand-500"
                        transition={springModal}
                      />
                    )}
                    {/* Hover preview — CSS-only ghost pill at 30% opacity for
                        inactive items, fades in on group hover. */}
                    {!isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-sm bg-brand-500 opacity-0 group-hover:opacity-30 transition-opacity duration-200"
                      />
                    )}
                    <Icon
                      size={16}
                      strokeWidth={isActive ? 2.25 : 1.75}
                      className={cn(
                        'shrink-0 transition-all duration-200',
                        isActive ? 'text-brand-500' : 'text-ink-400 group-hover:text-ink-200'
                      )}
                      aria-hidden="true"
                    />
                    <span
                      className={cn(
                        'font-medium transition-all duration-200',
                        isActive ? 'tracking-tight' : 'tracking-normal'
                      )}
                    >
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </LayoutGroup>

        {/* Bottom user info */}
        <div className="px-3 py-3 border-t border-ink-800">
          {user.email && (
            <p className="text-ink-400 text-xs truncate mb-2 font-mono" data-numeric>
              {user.email}
            </p>
          )}
          <button
            type="button"
            onClick={signOut}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-ink-400 hover:text-ink-50 hover:bg-ink-850 transition-colors"
          >
            <LogOut size={14} strokeWidth={1.75} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main column. bg-ink-900 (#111114) — one elevation up from the rail. */}
      <div className="ml-64 flex-1 flex flex-col min-h-screen bg-ink-900">
        {/* Topbar */}
        <header className="relative h-14 flex items-center justify-end px-6 gap-4 border-b border-ink-800 bg-ink-900">
          <span className="text-ink-400 text-sm">{user.gym_name ?? user.email ?? ''}</span>
          <button
            type="button"
            onClick={signOut}
            className="text-sm text-ink-400 hover:text-ink-50 transition-colors"
          >
            Sign out
          </button>
          {/* Ember seam — 1px decorative hairline along the bottom edge of
              the topbar. α4 ships the real breathing gradient + halo. */}
          <EmberSeam className="absolute bottom-0 left-0 right-0 h-px" />
        </header>

        {/* Page content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
