import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { clearSessionAndRedirect } from './session';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({ baseURL: API_URL });

// --- Refresh coalescing -------------------------------------------------
// If multiple requests fire at once and all 401, we only want a single
// POST /auth/refresh in flight. Every interceptor invocation awaits the
// shared `refreshPromise`; once it settles, .finally() clears the cache so
// the next 401 (e.g. after the new token also expires) can refresh again.
// Retried requests do NOT manually set the Authorization header — the
// request interceptor below pulls the latest token from localStorage at
// send time, so all queued retries pick up the freshly-stored token.
let refreshPromise: Promise<string> | null = null;

async function performRefresh(refreshToken: string): Promise<string> {
  // Use a bare axios call so this request is not itself intercepted.
  const res = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken });
  const { access_token, refresh_token } = res.data.data as {
    access_token: string;
    refresh_token: string;
  };
  localStorage.setItem('access_token', access_token);
  localStorage.setItem('refresh_token', refresh_token);
  return access_token;
}

function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    return Promise.reject(new Error('No refresh token'));
  }
  refreshPromise = performRefresh(refreshToken).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

// Attach token to every request. Reads from localStorage at send time so
// retried requests automatically get the freshly-refreshed token.
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle token refresh on 401 — never retry more than once, never intercept auth endpoints.
api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const config = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url: string = config?.url ?? '';
    const isAuthEndpoint = url.includes('/auth/');
    const alreadyRetried = config?._retry === true;

    if (error.response?.status === 401 && !isAuthEndpoint && !alreadyRetried && config) {
      const refresh = localStorage.getItem('refresh_token');
      if (!refresh) {
        clearSessionAndRedirect('session_expired');
        return Promise.reject(error);
      }
      try {
        await refreshAccessToken();
        config._retry = true;
        // Intentionally do NOT set config.headers.Authorization here.
        // The request interceptor reads the fresh token from localStorage
        // when this request is re-sent.
        return api(config);
      } catch {
        clearSessionAndRedirect('session_expired');
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
