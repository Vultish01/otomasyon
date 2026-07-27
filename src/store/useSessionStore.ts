import { create } from "zustand";
import type { AuthUser } from "@shared/types";
import {
  clearSessionToken,
  fetchCurrentUser,
  fetchAuthBootstrap,
  getSessionToken,
  loginPanelUser,
  logoutPanelUser,
  registerPanelUser,
  setSessionToken,
} from "@/lib/api";

type SessionState = {
  currentUser: AuthUser | null;
  isLoadingSession: boolean;
  isAuthenticating: boolean;
  isRegistering: boolean;
  registrationEnabled: boolean;
  userCount: number;
  authError?: string;
  restoreSession: () => Promise<void>;
  loadBootstrap: () => Promise<void>;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  currentUser: null,
  isLoadingSession: true,
  isAuthenticating: false,
  isRegistering: false,
  registrationEnabled: true,
  userCount: 0,
  authError: undefined,
  clearAuthError: () => set({ authError: undefined }),
  loadBootstrap: async () => {
    try {
      const bootstrap = await fetchAuthBootstrap();
      set({
        registrationEnabled: bootstrap.registration_enabled,
        userCount: bootstrap.user_count,
      });
    } catch {
      set({
        registrationEnabled: true,
      });
    }
  },
  restoreSession: async () => {
    const token = getSessionToken();
    if (!token) {
      set({ currentUser: null, isLoadingSession: false });
      return;
    }

    try {
      const user = await fetchCurrentUser();
      set({ currentUser: user, isLoadingSession: false, authError: undefined });
    } catch {
      clearSessionToken();
      set({ currentUser: null, isLoadingSession: false });
    }
  },
  login: async ({ email, password }) => {
    set({ isAuthenticating: true, authError: undefined });
    try {
      const response = await loginPanelUser({ email, password });
      setSessionToken(response.sessionToken);
      set({ currentUser: response.user, isAuthenticating: false });
    } catch (error) {
      clearSessionToken();
      set({
        isAuthenticating: false,
        authError: error instanceof Error ? error.message : "Giris yapilamadi.",
      });
      throw error;
    }
  },
  register: async ({ name, email, password }) => {
    set({ isRegistering: true, authError: undefined });
    try {
      const response = await registerPanelUser({ name, email, password });
      setSessionToken(response.sessionToken);
      set((state) => ({
        currentUser: response.user,
        isRegistering: false,
        userCount: Math.max(state.userCount, 0) + 1,
      }));
    } catch (error) {
      clearSessionToken();
      set({
        isRegistering: false,
        authError: error instanceof Error ? error.message : "Kayit olusturulamadi.",
      });
      throw error;
    }
  },
  logout: async () => {
    try {
      await logoutPanelUser();
    } catch {
      // oturum zaten dusmusse yerelde temizlemek yeterli
    }
    clearSessionToken();
    set({ currentUser: null, authError: undefined });
  },
}));
