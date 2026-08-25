import axiosInstance from "./axios";
import { AuthResponse, UsersResponse, UserResponse } from "@/types/user";

export const authApi = {
  login: (user_name: string, password: string) => axiosInstance.post<AuthResponse>("/api/auth/login", { user_name, password }),

  register: (data: { name: string; user_name: string; password: string; role?: string; is_active?: boolean }) =>
    axiosInstance.post<UserResponse>("/api/auth/register", data),

  getMe: () => axiosInstance.get<UserResponse>("/api/auth/me"),
};

export const usersApi = {
  getAll: (query?: string) =>
    axiosInstance.get<UsersResponse>("/api/user", {
      params: query && query.trim() ? { query: query.trim() } : {},
    }),

  update: (id: string, data: { name?: string; user_name?: string; role?: string }) => axiosInstance.patch<UserResponse>(`/api/user/${id}`, data),

  block: (id: string) => axiosInstance.patch<UserResponse>(`/api/user/${id}/block`),

  unblock: (id: string) => axiosInstance.patch<UserResponse>(`/api/user/${id}/unblock`),

  delete: (id: string) => axiosInstance.delete<{ message: string }>(`/api/user/${id}`),
};
