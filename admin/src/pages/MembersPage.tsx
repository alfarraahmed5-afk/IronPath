import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import api from '../lib/api';
import { EmberSeam } from '@/components/EmberSeam';
import { listStagger, listItem } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface Member {
  id: string;
  username: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  last_active_at: string | null;
  status: 'active' | 'suspended' | 'deleted';
  workout_count?: number;
}

interface MembersResponse {
  members: Member[];
  total: number;
  page: number;
  page_size: number;
}

type ViewMode = 'roster' | 'table';
const VIEW_KEY = 'members_view';

function readStoredView(): ViewMode {
  if (typeof window === 'undefined') return 'roster';
  const v = window.localStorage.getItem(VIEW_KEY);
  return v === 'table' ? 'table' : 'roster';
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function firstLetter(member: Member): string {
  const src = member.full_name || member.username || '?';
  return (src.trim()[0] ?? '?').toUpperCase();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function Avatar({ member }: { member: Member }) {
  if (member.avatar_url) {
    return (
      <img
        src={member.avatar_url}
        alt={member.full_name}
        className="w-8 h-8 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-ink-800 flex items-center justify-center text-xs font-semibold text-ink-200">
      {initials(member.full_name || member.username)}
    </div>
  );
}

function StatusBadge({ status }: { status: Member['status'] }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900/40 text-green-400 border border-green-800">
        Active
      </span>
    );
  }
  if (status === 'suspended') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-900/40 text-yellow-400 border border-yellow-800">
        Suspended
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-ink-800 text-ink-400 border border-ink-700">
      {status}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-ink-800 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

// ---------- Roster bento tile ----------

/**
 * Derive a stable, gently-varied 6-bar weekly attendance sparkline from the
 * member's id + workout_count. Real attendance histograms aren't fetched yet
 * (Phase C wires that), so we use a deterministic hash so each member's bars
 * stay consistent across renders.
 */
function sparkBars(member: Member): number[] {
  const seed = (member.id || member.username || 'x')
    .split('')
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const wc = Math.min(member.workout_count ?? 0, 7);
  const bars: number[] = [];
  let s = seed;
  for (let i = 0; i < 6; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    const base = (s % 70) + 10; // 10..80
    // bias bars taller for members with more workouts
    const bias = Math.min(20, wc * 3);
    bars.push(Math.min(100, base + bias));
  }
  return bars;
}

function SparklineBars({ bars }: { bars: number[] }) {
  return (
    <div className="flex items-end gap-[2px] h-3 w-full" aria-hidden="true">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-ink-600 rounded-[1px]"
          style={{ height: `${Math.max(8, h)}%` }}
        />
      ))}
    </div>
  );
}

interface RosterTileProps {
  member: Member;
  hovered: boolean;
  anyHovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onClick: () => void;
  reduceMotion: boolean;
}

function RosterTile({
  member,
  hovered,
  anyHovered,
  onHoverStart,
  onHoverEnd,
  onClick,
  reduceMotion,
}: RosterTileProps) {
  const isPR = (member.workout_count ?? 0) > 5;
  const bars = sparkBars(member);
  const dim = anyHovered && !hovered;

  const hoverProps = reduceMotion
    ? {}
    : {
        whileHover: { scale: 1.4, zIndex: 10 },
        transition: { type: 'spring' as const, stiffness: 380, damping: 22 },
      };

  return (
    <motion.button
      type="button"
      {...listItem}
      {...hoverProps}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onFocus={onHoverStart}
      onBlur={onHoverEnd}
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-center gap-1.5 p-2 rounded-xl',
        'surface-card text-left focus:outline-none focus:ring-2 focus:ring-brand-500/60',
        'transition-opacity duration-200',
        dim && 'opacity-30'
      )}
      style={{ originY: 0.5 }}
      aria-label={member.full_name || member.username}
      title={member.full_name || member.username}
    >
      {/* Avatar with optional ember PR ring */}
      <div className="relative">
        {isPR && (
          <span
            aria-hidden="true"
            className="absolute -inset-[2px] rounded-full"
            style={{
              boxShadow:
                '0 0 0 1px rgba(200, 16, 46, 0.55), 0 0 8px 1px rgba(200, 16, 46, 0.35)',
            }}
          />
        )}
        {member.avatar_url ? (
          <img
            src={member.avatar_url}
            alt=""
            className="relative w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="relative w-12 h-12 rounded-full bg-ink-850 border border-ink-700 flex items-center justify-center font-mono text-base text-ink-200">
            {firstLetter(member)}
          </div>
        )}
      </div>

      {/* Name */}
      <span className="block w-full text-[10px] font-mono text-ink-200 truncate text-center">
        {member.full_name || member.username || '—'}
      </span>

      {/* Sparkline */}
      <SparklineBars bars={bars} />

      {/* Hover overlay — email + last-lift placeholder */}
      <div
        className={cn(
          'pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1',
          'min-w-[140px] max-w-[200px] px-2 py-1.5 rounded-md',
          'surface-feature shadow-xl text-[10px] font-mono text-ink-200',
          'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
          'transition-opacity duration-150 z-20'
        )}
      >
        <div className="truncate text-ink-50">{member.email || '—'}</div>
        <div className="text-ink-400 mt-0.5">
          last lift: {member.last_active_at ? formatDate(member.last_active_at) : '—'}
        </div>
      </div>
    </motion.button>
  );
}

// ---------- Empty state ----------

function EmptyRoster() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <svg
        viewBox="0 0 120 40"
        className="w-32 h-12 text-ink-600 mb-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* Outline-only barbell */}
        <line x1="20" y1="20" x2="100" y2="20" />
        <rect x="30" y="12" width="6" height="16" rx="1" />
        <rect x="84" y="12" width="6" height="16" rx="1" />
        <rect x="22" y="15" width="4" height="10" rx="1" />
        <rect x="94" y="15" width="4" height="10" rx="1" />
      </svg>
      <p className="text-ink-200 text-sm font-mono mb-2">
        the gym is quiet. send the poster.
      </p>
      <Link
        to="/grow"
        className="inline-block text-brand-500 hover:text-brand-400 text-sm font-medium relative after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-px after:bg-current after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-300"
      >
        open Grow
      </Link>
    </div>
  );
}

export default function MembersPage() {
  const reduceMotion = useReducedMotion() ?? false;
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => readStoredView());
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  function setView(next: ViewMode) {
    setViewMode(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      // ignore quota / unavailable storage
    }
  }

  const fetchMembers = useCallback(
    async (searchVal: string, statusVal: string, pageVal: number) => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = { page: pageVal };
        if (searchVal) params.search = searchVal;
        if (statusVal) params.status = statusVal;

        const res = await api.get('/admin/members', { params });
        const data = res.data.data as MembersResponse;
        setMembers(data.members);
        setTotal(data.total);
        setPage(data.page);
        setPageSize(data.page_size);
      } catch {
        // keep previous list on error
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    fetchMembers(search, statusFilter, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchMembers(value, statusFilter, 1);
    }, 400);
  }

  // Status filter
  function handleStatusChange(value: string) {
    setStatusFilter(value);
    fetchMembers(search, value, 1);
  }

  // Pagination
  function handlePageChange(newPage: number) {
    fetchMembers(search, statusFilter, newPage);
  }

  // Suspend / Reinstate
  async function handleToggleSuspend(member: Member) {
    const suspending = member.status === 'active';
    setActionLoading(member.id + '_suspend');
    try {
      await api.patch(`/admin/members/${member.id}/suspend`, {
        suspended: suspending,
      });
      fetchMembers(search, statusFilter, page);
    } finally {
      setActionLoading(null);
    }
  }

  // Remove
  async function handleRemove(member: Member) {
    const confirmed = window.confirm(
      `Remove ${member.full_name || member.username}? This cannot be undone.`
    );
    if (!confirmed) return;
    setActionLoading(member.id + '_remove');
    try {
      await api.delete(`/admin/members/${member.id}`);
      fetchMembers(search, statusFilter, page);
    } finally {
      setActionLoading(null);
    }
  }

  function handleTileClick(member: Member) {
    // No detail route yet — log for now, preserve future-link behavior.
    // eslint-disable-next-line no-console
    console.log('member tile clicked', member.id, member.username);
  }

  const totalPages = Math.ceil(total / pageSize) || 1;

  // Stagger parent props — disable when reduceMotion is on
  const staggerProps = reduceMotion
    ? { initial: false, animate: 'visible' as const }
    : listStagger;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h1 className="text-2xl font-bold text-ink-50">Members</h1>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ink-800 text-ink-400 border border-ink-700 font-mono">
          {total}
        </span>

        {/* View toggle */}
        <div
          role="group"
          aria-label="View mode"
          className="ml-auto inline-flex rounded-lg border border-ink-800 bg-ink-900 p-0.5"
        >
          <button
            type="button"
            onClick={() => setView('roster')}
            aria-pressed={viewMode === 'roster'}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              viewMode === 'roster'
                ? 'bg-ink-800 text-ink-50'
                : 'text-ink-400 hover:text-ink-200'
            )}
          >
            Roster
          </button>
          <button
            type="button"
            onClick={() => setView('table')}
            aria-pressed={viewMode === 'table'}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              viewMode === 'table'
                ? 'bg-ink-800 text-ink-50'
                : 'text-ink-400 hover:text-ink-200'
            )}
          >
            Table
          </button>
        </div>
      </div>

      <EmberSeam className="mb-6 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search members…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="bg-ink-900 border border-ink-800 text-ink-50 placeholder-ink-400 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-brand-500 w-full sm:w-72"
        />
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="bg-ink-900 border border-ink-800 text-ink-50 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* ---------- ROSTER VIEW ---------- */}
      {viewMode === 'roster' && (
        <div className="surface-card p-4 sm:p-6">
          {loading ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-ink-850 animate-pulse aspect-square"
                />
              ))}
            </div>
          ) : members.length === 0 ? (
            <EmptyRoster />
          ) : (
            <motion.div
              {...staggerProps}
              className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3"
              onMouseLeave={() => setHoveredId(null)}
            >
              {members.map((m) => (
                <RosterTile
                  key={m.id}
                  member={m}
                  hovered={hoveredId === m.id}
                  anyHovered={hoveredId !== null}
                  onHoverStart={() => setHoveredId(m.id)}
                  onHoverEnd={() =>
                    setHoveredId((cur) => (cur === m.id ? null : cur))
                  }
                  onClick={() => handleTileClick(m)}
                  reduceMotion={reduceMotion}
                />
              ))}
            </motion.div>
          )}

          {/* Pagination */}
          {!loading && members.length > 0 && (
            <div className="flex items-center justify-between pt-5 mt-5 border-t border-ink-800">
              <p className="text-ink-400 text-sm font-mono">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-ink-800 text-ink-200 border border-ink-700 hover:bg-ink-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-ink-800 text-ink-200 border border-ink-700 hover:bg-ink-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------- TABLE VIEW ---------- */}
      {viewMode === 'table' && (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-800 text-left">
                  <th className="px-4 py-3 text-ink-400 font-medium">Avatar</th>
                  <th className="px-4 py-3 text-ink-400 font-medium">Name</th>
                  <th className="px-4 py-3 text-ink-400 font-medium">Email</th>
                  <th className="px-4 py-3 text-ink-400 font-medium">Joined</th>
                  <th className="px-4 py-3 text-ink-400 font-medium">Last Active</th>
                  <th className="px-4 py-3 text-ink-400 font-medium">Workouts</th>
                  <th className="px-4 py-3 text-ink-400 font-medium">Status</th>
                  <th className="px-4 py-3 text-ink-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-ink-400">
                      No members found
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-ink-800/40 hover:-translate-y-px transition-all"
                    >
                      <td className="px-4 py-3">
                        <Avatar member={member} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-ink-50 font-medium">{member.full_name}</p>
                        <p className="text-ink-400 text-xs">@{member.username}</p>
                      </td>
                      <td className="px-4 py-3 text-ink-200">{member.email}</td>
                      <td className="px-4 py-3 text-ink-400 font-mono text-xs">
                        {formatDate(member.created_at)}
                      </td>
                      <td className="px-4 py-3 text-ink-400 font-mono text-xs">
                        {formatDate(member.last_active_at)}
                      </td>
                      <td className="px-4 py-3 text-ink-200 font-mono">
                        {member.workout_count ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={member.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {member.status === 'active' && (
                            <button
                              onClick={() => handleToggleSuspend(member)}
                              disabled={actionLoading === member.id + '_suspend'}
                              className="px-2.5 py-1 rounded text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-800 hover:bg-yellow-900/60 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === member.id + '_suspend' ? '…' : 'Suspend'}
                            </button>
                          )}
                          {member.status === 'suspended' && (
                            <button
                              onClick={() => handleToggleSuspend(member)}
                              disabled={actionLoading === member.id + '_suspend'}
                              className="px-2.5 py-1 rounded text-xs font-medium bg-green-900/30 text-green-400 border border-green-800 hover:bg-green-900/60 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === member.id + '_suspend' ? '…' : 'Reinstate'}
                            </button>
                          )}
                          <button
                            onClick={() => handleRemove(member)}
                            disabled={actionLoading === member.id + '_remove'}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-red-900/30 text-red-400 border border-red-800 hover:bg-red-900/60 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === member.id + '_remove' ? '…' : 'Remove'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && members.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-ink-800">
              <p className="text-ink-400 text-sm font-mono">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-ink-800 text-ink-200 border border-ink-700 hover:bg-ink-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-ink-800 text-ink-200 border border-ink-700 hover:bg-ink-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
