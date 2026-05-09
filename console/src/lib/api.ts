import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * Console API client.
 *
 * Storage keys are namespaced with `ip_console_` so the operator console and
 * the gym admin app (which uses unprefixed keys today) can be signed in
 * simultaneously in the same browser without colliding — see PLATFORM_PLAN §7.7.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const STORAGE_KEYS = {
  accessToken: 'ip_console_access_token',
  refreshToken: 'ip_console_refresh_token',
  user: 'ip_console_user',
  // Phase D — operator impersonation tokens live here so the original
  // session is preserved while impersonating a gym owner.
  impersonationAccessToken: 'ip_console_impersonation_access_token',
  impersonationRefreshToken: 'ip_console_impersonation_refresh_token',
  impersonationContext: 'ip_console_impersonation_context',
} as const;

interface RetryableConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

// Coalesce concurrent refresh attempts so a burst of 401s only fires one
// /auth/refresh call. All callers await the same promise.
let inflightRefresh: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (inflightRefresh) return inflightRefresh;

  const refresh = localStorage.getItem(STORAGE_KEYS.refreshToken);
  if (!refresh) throw new Error('no refresh token');

  inflightRefresh = (async () => {
    try {
      const res = await axios.post(`${API_URL}/auth/refresh`, {
        refresh_token: refresh,
      });
      const { access_token, refresh_token } = res.data.data;
      localStorage.setItem(STORAGE_KEYS.accessToken, access_token);
      localStorage.setItem(STORAGE_KEYS.refreshToken, refresh_token);
      return access_token as string;
    } finally {
      // Always clear so the next 401 starts a fresh attempt.
      inflightRefresh = null;
    }
  })();

  return inflightRefresh;
}

function clearAndRedirectToLogin() {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.user);
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

function attachInterceptors(client: AxiosInstance, tokenKey: string) {
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem(tokenKey);
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = (error.config ?? {}) as RetryableConfig;
      const url: string = config.url ?? '';
      const isAuthEndpoint = url.includes('/auth/');
      const alreadyRetried = config._retry === true;

      if (
        error.response?.status === 401 &&
        !isAuthEndpoint &&
        !alreadyRetried
      ) {
        try {
          const newToken = await refreshAccessToken();
          config._retry = true;
          config.headers = config.headers ?? {};
          (config.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
          return client(config);
        } catch {
          clearAndRedirectToLogin();
          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
    }
  );
}

const api = axios.create({ baseURL: API_URL });
attachInterceptors(api, STORAGE_KEYS.accessToken);

/**
 * Phase D — second axios client for operator impersonation.
 * Stubbed today; will be wired when the impersonation flow lands. It keeps
 * its own token bucket so the operator's super_admin session stays intact.
 */
export const impersonationApi = axios.create({ baseURL: API_URL });
attachInterceptors(impersonationApi, STORAGE_KEYS.impersonationAccessToken);

export default api;
