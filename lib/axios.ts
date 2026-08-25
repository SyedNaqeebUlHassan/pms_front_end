import axios from "axios";
import { useAuthStore } from "@/store/auth.store";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? "";

    // ── Never redirect on auth endpoints ────────────────────────────────────
    // Login/register return 401 for wrong credentials or blocked accounts.
    // Those errors should be handled by the page, not this interceptor.
    const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/register");

    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Token expired or invalid on a protected route — clear and redirect
      useAuthStore.getState().clearAuth();
      if (typeof window !== "undefined") {
        document.cookie = "pms-token=; path=/; max-age=0";
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
