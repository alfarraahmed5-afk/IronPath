import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import api from './api';

/**
 * Console-side TanStack Query hooks for super-admin endpoints.
 *
 * Backend responses follow the `{ data: ... }` envelope; helpers below
 * unwrap once so callers only see the payload.
 */

// ---------- shared types ----------

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'demo_booked'
  | 'trialing'
  | 'negotiating'
  | 'won'
  | 'lost'
  | 'dropped';

export interface Lead {
  id: string;
  email: string | null;
  name: string | null;
  gym_name: string | null;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  message: string | null;
  member_count_reported: number | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadsPage {
  leads: Lead[];
  total: number;
  page: number;
  page_size: number;
}

// ---------- subscription editor mutations ----------

interface UpdateSubscriptionVars {
  gymId: string;
  body: {
    tier?: 'starter' | 'growth' | 'unlimited';
    status?: 'trial' | 'active' | 'expired' | 'cancelled';
    expires_at?: string | null;
    mrr_cents?: number | null;
  };
}

export function useUpdateSubscriptionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ gymId, body }: UpdateSubscriptionVars) => {
      const res = await api.patch(
        `/super-admin/gyms/${gymId}/subscription`,
        body
      );
      return res.data?.data ?? res.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['gym', vars.gymId] });
      qc.invalidateQueries({ queryKey: ['gyms'] });
    },
  });
}

interface MarkPaidVars {
  gymId: string;
  body: {
    amount_cents: number;
    period_start: string;
    period_end: string;
    note?: string;
  };
}

export function useMarkPaidMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ gymId, body }: MarkPaidVars) => {
      const res = await api.post(
        `/super-admin/gyms/${gymId}/subscription/mark-paid`,
        body
      );
      return res.data?.data ?? res.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['gym', vars.gymId] });
      qc.invalidateQueries({ queryKey: ['gyms'] });
    },
  });
}

interface ExtendTrialVars {
  gymId: string;
  body: {
    days: number;
    reason: string;
  };
}

export function useExtendTrialMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ gymId, body }: ExtendTrialVars) => {
      const res = await api.post(
        `/super-admin/gyms/${gymId}/subscription/extend-trial`,
        body
      );
      return res.data?.data ?? res.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['gym', vars.gymId] });
      qc.invalidateQueries({ queryKey: ['gyms'] });
    },
  });
}

// ---------- leads ----------

export interface LeadsQueryArgs {
  status?: LeadStatus | 'all';
  q?: string;
  page?: number;
  pageSize?: number;
}

export function useLeadsQuery({
  status = 'all',
  q = '',
  page = 1,
  pageSize = 25,
}: LeadsQueryArgs) {
  return useQuery<LeadsPage>({
    queryKey: ['leads', { status, q, page, pageSize }],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        page_size: pageSize,
      };
      if (status && status !== 'all') params.status = status;
      if (q && q.trim().length > 0) params.q = q.trim();
      const res = await api.get('/super-admin/leads', { params });
      const payload = res.data?.data ?? res.data;
      // Tolerate either {leads,total,page,page_size} or a bare array.
      if (Array.isArray(payload)) {
        return {
          leads: payload as Lead[],
          total: payload.length,
          page: 1,
          page_size: payload.length || pageSize,
        };
      }
      return {
        leads: (payload?.leads ?? []) as Lead[],
        total: Number(payload?.total ?? 0),
        page: Number(payload?.page ?? page),
        page_size: Number(payload?.page_size ?? pageSize),
      };
    },
    placeholderData: keepPreviousData,
  });
}

interface UpdateLeadVars {
  id: string;
  body: {
    status?: LeadStatus;
    notes?: string;
  };
}

export function useUpdateLeadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: UpdateLeadVars) => {
      const res = await api.patch(`/super-admin/leads/${id}`, body);
      return (res.data?.data ?? res.data) as Lead;
    },
    onSuccess: () => {
      // The leads list query is keyed by filters; invalidate the whole bucket.
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
