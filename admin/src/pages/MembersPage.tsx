import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../lib/api';

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

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
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
    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-300">
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
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
      {status}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-800 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-white">Members</h1>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
          {total}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search members…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-white placeholder-gray-500 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-500 w-full sm:w-72"
        />
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-gray-500 font-medium">Avatar</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Name</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Email</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Joined</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Last Active</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Workouts</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="px-4 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    No members found
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <Avatar member={member} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{member.full_name}</p>
                      <p className="text-gray-500 text-xs">@{member.username}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{member.email}</td>
                    <td className="px-4 py-3 text-gray-400">{formatDate(member.created_at)}</td>
                    <td className="px-4 py-3 text-gray-400">{formatDate(member.last_active_at)}</td>
                    <td className="px-4 py-3 text-gray-300">
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <p className="text-gray-500 text-sm">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
