"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);

  const [form, setForm] = useState({ user_name: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (_hasHydrated && isAuthenticated()) {
      router.replace("/dashboard");
    }
  }, [_hasHydrated, isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.user_name.trim() || !form.password.trim()) {
      setError("Both fields are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await authApi.login(form.user_name.trim(), form.password);
      const { access_token, user } = res.data;

      setAuth(access_token, user);
      document.cookie = `pms-token=${access_token}; path=/; max-age=${60 * 60 * 24}`;

      toast.success(`Welcome back, ${user.name}!`);
      router.push("/dashboard");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const msg = e.response?.data?.message ?? "Invalid credentials. Please try again.";
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* ── Brand panel ── */}
      <div className={styles.brand}>
        <div className={styles.brandContent}>
          <div className={styles.brandBadge}>
            <div className={styles.brandDot} />
            <span>Secure System</span>
          </div>
          <h1 className={styles.brandTitle}>
            Prison
            <br />
            <em>Management</em>
            <br />
            System
          </h1>
          <p className={styles.brandSub}>Developed by Syed Naqeeb Ul Hassan . bc-230210221</p>
        </div>
        <div className={styles.brandFooter}>PMS v1.0 · CS619 Spring 2026 · Virtual University of Pakistan</div>
      </div>

      {/* ── Form panel ── */}
      <div className={styles.formPanel}>
        <div className={styles.formBox}>
          <h2 className={styles.heading}>Sign in</h2>
          <p className={styles.subheading}>Enter your credentials to access the system.</p>

          {error && (
            <div className="alert-error">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor="user_name" className="label">
                Username
              </label>
              <input
                id="user_name"
                name="user_name"
                type="text"
                autoComplete="username"
                placeholder="Enter your username"
                value={form.user_name}
                onChange={handleChange}
                className="input"
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className="label">
                Password
              </label>
              {/* ── Password wrapper with eye toggle ── */}
              <div className={styles.passwordWrap}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  className={`input ${styles.passwordInput}`}
                  disabled={loading}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    /* Eye-off icon */
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    /* Eye icon */
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </form>

          <p className={styles.footer}>
            Don&apos;t have an account?{" "}
            <Link href="/register" className={styles.footerLink}>
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
