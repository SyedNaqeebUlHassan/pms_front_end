import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { LoginUser } from "@/types/user";

interface AuthState {
  token: string | null;
  user: LoginUser | null;
  _hasHydrated: boolean;

  setAuth: (token: string, user: LoginUser) => void;
  clearAuth: () => void;
  setHasHydrated: (val: boolean) => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      _hasHydrated: false,

      setAuth: (token, user) => set({ token, user }),

      clearAuth: () => set({ token: null, user: null }),

      setHasHydrated: (val) => set({ _hasHydrated: val }),

      isAuthenticated: () => !!get().token,

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
