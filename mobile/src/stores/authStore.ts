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
  role: string;
  gym_id: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: AuthUser, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
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

  loadFromStorage: async () => {
    try {
      const accessToken = await SecureStore.getItemAsync('access_token');
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (!accessToken || !refreshToken) {
        set({ isLoading: false });
        return;
      }
      setTokens(accessToken, refreshToken);
      // Validate the token by fetching the current user. If it fails (e.g.
      // tokens expired beyond the refresh window), wipe credentials so the
      // next render kicks the user back to login instead of a half-loaded
      // session.
      try {
        const res = await api.get<{ data: AuthUser }>('/users/me');
        set({ user: res.data, isAuthenticated: true, isLoading: false });
      } catch {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        clearTokens();
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
