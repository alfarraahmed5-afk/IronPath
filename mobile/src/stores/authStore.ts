import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { setTokens, clearTokens, api } from '../lib/api';

interface AuthUser {
  id: string;
  // Optional: /users/me does not return email; only present right after a
  // login/register response
  email?: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  role: string;
  gym_id: string;
  is_profile_private?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: AuthUser, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  setUser: (user: AuthUser) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (user, accessToken, refreshToken) => {
    await SecureStore.setItemAsync('access_token', accessToken);
    await SecureStore.setItemAsync('refresh_token', refreshToken);
    setTokens(accessToken, refreshToken);
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    clearTokens();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  setUser: (user) => set({ user }),

  loadFromStorage: async () => {
    try {
      const accessToken = await SecureStore.getItemAsync('access_token');
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (!accessToken || !refreshToken) {
        set({ isLoading: false });
        return;
      }
      setTokens(accessToken, refreshToken);
      // Try to validate and get fresh user data. Only clear credentials on a
      // genuine 401 (token expired and refresh failed). Network errors (no
      // connection, backend cold start, timeout) must NOT log the user out —
      // they still have valid tokens and will succeed on the next request.
      try {
        const res = await api.get<{ data: AuthUser }>('/users/me');
        set({ user: res.data, isAuthenticated: true, isLoading: false });
      } catch (err: any) {
        const status = err?.status ?? err?.statusCode ?? 0;
        const isAuthError = status === 401 || err?.code === 'UNAUTHORIZED';
        if (isAuthError) {
          await SecureStore.deleteItemAsync('access_token');
          await SecureStore.deleteItemAsync('refresh_token');
          clearTokens();
          set({ user: null, isAuthenticated: false, isLoading: false });
        } else {
          // Network/server error — keep tokens, stay authenticated.
          // Screens will load their data when they mount.
          set({ isAuthenticated: true, isLoading: false });
        }
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
