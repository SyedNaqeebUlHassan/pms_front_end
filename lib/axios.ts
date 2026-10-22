import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth.store";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// ── Refresh token queue
// Prevents multiple simultaneous 401s from each triggering their own refresh.
// All requests that fail while a refresh is in-flight are queued here and
// replayed (or rejected) once the refresh settles.

let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}[] = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

function clearAuthAndRedirect() {
  useAuthStore.getState().clearAuth();
  if (typeof window !== "undefined") {
    document.cookie = "pms-token=; path=/; max-age=0";
    window.location.href = "/login";
  }
}

// ── Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor ─────────────────────────────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const url = originalRequest?.url ?? "";
    const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/register") || url.includes("/auth/refresh");

    // Don't attempt refresh on auth endpoints or non-401 errors
    if (error.response?.status !== 401 || isAuthEndpoint) {
      return Promise.reject(error);
    }

    // Already retried — don't loop
    if (originalRequest._retry) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    // Another refresh is already in-flight — queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // Start the refresh
    originalRequest._retry = true;
    isRefreshing = true;

    const storedRefreshToken = useAuthStore.getState().refreshToken;

    if (!storedRefreshToken) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/auth/refresh`, {
        refresh_token: storedRefreshToken,
      });

      const { access_token, refresh_token } = data;

      // Update store and cookie with new tokens
      useAuthStore.getState().setTokens(access_token, refresh_token);
      document.cookie = `pms-token=${access_token}; path=/; max-age=${60 * 60 * 24 * 7}`;

      // Replay queued requests with new token
      processQueue(null, access_token);

      // Retry the original request
      originalRequest.headers.Authorization = `Bearer ${access_token}`;
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearAuthAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosInstance;
