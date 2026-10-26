import axiosInstance from "./axios";
import { AuthResponse, UsersResponse, UserResponse, RefreshResponse } from "@/types/user";

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) => axiosInstance.post<AuthResponse>("/api/auth/login", { email, password }),

  register: (data: { name: string; email: string; password: string; role?: string; is_active?: boolean }) =>
    axiosInstance.post<UserResponse>("/api/auth/register", data),

  getMe: () => axiosInstance.get<UserResponse>("/api/auth/me"),

  refresh: (refresh_token: string) => axiosInstance.post<RefreshResponse>("/api/auth/refresh", { refresh_token }),
};

// ─── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  getAll: (query?: string) =>
    axiosInstance.get<UsersResponse>("/api/user", {
      params: query?.trim() ? { query: query.trim() } : {},
    }),

  getOne: (id: string) => axiosInstance.get(`/api/user/${id}`),

  update: (id: string, data: { name?: string; role?: string }) => axiosInstance.patch<UserResponse>(`/api/user/${id}`, data),

  block: (id: string) => axiosInstance.patch<UserResponse>(`/api/user/${id}/block`),

  unblock: (id: string) => axiosInstance.patch<UserResponse>(`/api/user/${id}/unblock`),
};

// ─── Prisoners ─────────────────────────────────────────────────────────────────
export const prisonersApi = {
  getAll: (query?: string) =>
    axiosInstance.get("/api/prisoner", {
      params: query?.trim() ? { search: query.trim() } : {},
    }),

  getOne: (id: string) => axiosInstance.get(`/api/prisoner/${id}`),

  create: (data: Record<string, unknown>) => axiosInstance.post("/api/prisoner", data),

  update: (id: string, data: Record<string, unknown>) => axiosInstance.patch(`/api/prisoner/${id}`, data),

  release: (id: string) => axiosInstance.post(`/api/prisoner/${id}/deactivate`),

  addPunishment: (
    id: string,
    data: {
      start_date: string;
      end_date: string;
      reason: string;
      status: string;
      remarks?: string;
    },
  ) => axiosInstance.post(`/api/prisoner/${id}/punishment`, data),
};

// ─── Guards ────────────────────────────────────────────────────────────────────
export const guardsApi = {
  getAll: (query?: string) =>
    axiosInstance.get("/api/guard", {
      params: query?.trim() ? { search: query.trim() } : {},
    }),
  getOne: (id: string) => axiosInstance.get(`/api/guard/${id}`),
  create: (data: Record<string, unknown>) => axiosInstance.post("/api/guard", data),
  update: (id: string, data: Record<string, unknown>) => axiosInstance.patch(`/api/guard/${id}`, data),
  deactivate: (id: string) => axiosInstance.post(`/api/guard/${id}/deactivate`),
};

// ─── FIR ───────────────────────────────────────────────────────────────────────
export const firApi = {
  getAll: (query?: string) =>
    axiosInstance.get("/api/fir", {
      params: query?.trim() ? { search: query.trim() } : {},
    }),

  getOne: (id: string) => axiosInstance.get(`/api/fir/${id}`),

  // prisoner_id XOR accused_name — never both
  create: (data: Record<string, unknown>) => axiosInstance.post("/api/fir", data),

  // admin only — all fields optional
  // if prisoner_id supplied, accused_name auto-updates from prisoner
  update: (id: string, data: Record<string, unknown>) => axiosInstance.patch(`/api/fir/${id}`, data),

  // admin and jailor
  linkPrisoner: (id: string, prisoner_id: string) => axiosInstance.post(`/api/fir/${id}/link`, { prisoner_id }),
};
