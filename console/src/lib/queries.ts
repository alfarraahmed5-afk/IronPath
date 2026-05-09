import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from './api';

export interface GymRow {
  id: string;
  name: string;
  location: string | null;
  subscription_status: string | null;
  subscription_tier: string | null;
  subscription_expires_at: string | null;
  trial_started_at: string | null;
  mrr_cents: number;
  member_count: number;
  member_cap: number | null;
  owner_email: string | null;
  owner_name: string | null;
  last_active_at: string | null;
  created_at: string;
}

export interface GymsPage {
  gyms: GymRow[];
  total: number;
  page: number;
  page_size: number;
}

export interface GymsQueryArgs {
  q?: string;
  status?: string;
  tier?: string;
  mrr_min?: number;
  page?: number;
}

export function useGymsQuery(args: GymsQueryArgs) {
  return useQuery<GymsPage>({
    queryKey: ['gyms', args],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: args.page ?? 1 };
      if (args.q && args.q.trim()) params.q = args.q.trim();
      if (args.status && args.status !== 'all') params.status = args.status;
      if (args.tier && args.tier !== 'all') params.tier = args.tier;
      if (args.mrr_min !== undefined && Number.isFinite(args.mrr_min)) params.mrr_min = args.mrr_min;
      const res = await api.get('/super-admin/gyms', { params });
      const payload = res.data?.data ?? res.data;
      return {
        gyms: payload?.gyms ?? [],
        total: Number(payload?.total ?? 0),
        page: Number(payload?.page ?? 1),
        page_size: Number(payload?.page_size ?? 25),
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export interface GymDetail {
  gym: GymRow & { description: string | null; phone: string | null; website: string | null; address: string | null; timezone: string | null; units_default: string | null; logo_url: string | null; accent_color: string | null; invite_code: string | null };
  owner: { id: string; email: string; full_name: string | null; last_active_at: string | null } | null;
  onboarding_steps: Array<{ step_key: string; completed_at: string | null; completed_by: string | null }>;
  recent_audit: AuditEntry[];
}

export interface AuditEntry {
  id: string;
  actor_user_id: string | null;
  action: string;
  before: unknown;
  after: unknown;
  ip: string | null;
  created_at: string;
}

export function useGymQuery(gymId: string | undefined) {
  return useQuery<GymDetail>({
    queryKey: ['gym', gymId],
    enabled: Boolean(gymId),
    queryFn: async () => {
      const res = await api.get(`/super-admin/gyms/${gymId}`);
      return (res.data?.data ?? res.data) as GymDetail;
    },
    staleTime: 15_000,
  });
}

export interface AuditPage {
  entries: AuditEntry[];
  total: number;
  page: number;
  page_size: number;
}

export function useGymAuditQuery(gymId: string | undefined, page = 1) {
  return useQuery<AuditPage>({
    queryKey: ['audit', { target_type: 'gym', target_id: gymId, page }],
    enabled: Boolean(gymId),
    queryFn: async () => {
      const res = await api.get('/super-admin/audit', {
        params: { target_type: 'gym', target_id: gymId, page },
      });
      const payload = res.data?.data ?? res.data;
      return {
        entries: payload?.entries ?? [],
        total: Number(payload?.total ?? 0),
        page: Number(payload?.page ?? page),
        page_size: Number(payload?.page_size ?? 50),
      };
    },
    placeholderData: keepPreviousData,
  });
}
