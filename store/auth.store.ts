import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { LoginUser } from "@/types/user";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: LoginUser | null;
  _hasHydrated: boolean;

  setAuth: (accessToken: string, refreshToken: string, user: LoginUser) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setHasHydrated: (val: boolean) => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      _hasHydrated: false,

      setAuth: (accessToken, refreshToken, user) => set({ accessToken, refreshToken, user }),

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      clearAuth: () => set({ accessToken: null, refreshToken: null, user: null }),

      setHasHydrated: (val) => set({ _hasHydrated: val }),

      isAuthenticated: () => !!get().accessToken,

      isAdmin: () => get().user?.role === "admin",
    }),
    {
      name: "pms-auth",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
