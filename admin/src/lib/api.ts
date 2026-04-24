import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({ baseURL: API_URL });

// Attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle token refresh on 401 — never retry more than once, never intercept auth endpoints
api.interceptors.response.use(
  response => response,
  async error => {
    const url: string = error.config?.url ?? '';
    const isAuthEndpoint = url.includes('/auth/');
    const alreadyRetried = error.config?._retry === true;

    if (error.response?.status === 401 && !isAuthEndpoint && !alreadyRetried) {
      const refresh = localStorage.getItem('refresh_token');
      if (!refresh) {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }
      try {
        const res = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refresh });
        const { access_token, refresh_token } = res.data.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        error.config._retry = true;
        error.config.headers.Authorization = `Bearer ${access_token}`;
        return api(error.config);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
