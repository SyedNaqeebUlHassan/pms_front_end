"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { authApi } from "@/lib/api";
import styles from "./page.module.css";

interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: "admin" | "jailor";
  is_active: boolean;
}

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Maximum 20 characters", test: (p: string) => p.length <= 20 },
  { label: "At least one uppercase letter (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "At least one lowercase letter (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "At least one number or special char", test: (p: string) => /(\d|\W)/.test(p) },
];

const EyeOffIcon = () => (
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
);

const EyeIcon = () => (
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
);

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "jailor",
    is_active: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setError("");
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleToggleActive = () => {
    setForm((prev) => ({ ...prev, is_active: !prev.is_active }));
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return "Full name is required.";
    if (form.name.trim().length < 3) return "Name must be at least 3 characters.";
    if (!form.email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Please enter a valid email address.";
    if (!form.password) return "Password is required.";
    const failedRule = PASSWORD_RULES.find((r) => !r.test(form.password));
    if (failedRule) return failedRule.label + " (password requirement not met).";
    if (!form.confirmPassword) return "Please confirm your password.";
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        is_active: form.is_active,
      });
      toast.success("Account created successfully! Please sign in.");
      router.push("/login");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message ?? "Registration failed. Please try again.";
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  const passwordMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.heading}>Create Account</h1>
          <p className={styles.subheading}>Register to access the Prison Management System</p>
        </div>

        <div className={`card ${styles.card}`}>
          {error && (
            <div className="alert-error">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {/* Name */}
            <div className={styles.field}>
              <label htmlFor="name" className="label">
                Full Name <span className={styles.required}>*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Min. 3 characters"
                value={form.name}
                onChange={handleChange}
                className="input"
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div className={styles.field}>
              <label htmlFor="email" className="label">
                Email <span className={styles.required}>*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email address"
                value={form.email}
                onChange={handleChange}
                className="input"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className={styles.field}>
              <label htmlFor="password" className="label">
                Password <span className={styles.required}>*</span>
              </label>
              <div className={styles.passwordWrap}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={handleChange}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  className={`input ${styles.passwordInput}`}
                  disabled={loading}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword((p) => !p)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              {(passwordFocused || form.password.length > 0) && (
                <ul className={styles.rules}>
                  {PASSWORD_RULES.map((rule) => {
                    const passed = rule.test(form.password);
                    return (
                      <li key={rule.label} className={`${styles.rule} ${passed ? styles.rulePassed : styles.ruleFailed}`}>
                        <span className={styles.ruleIcon}>{passed ? "✓" : "✗"}</span>
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Confirm Password */}
            <div className={styles.field}>
              <label htmlFor="confirmPassword" className="label">
                Confirm Password <span className={styles.required}>*</span>
              </label>
              <div className={styles.passwordWrap}>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className={`input ${styles.passwordInput} ${passwordMismatch ? styles.inputError : ""}`}
                  disabled={loading}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {passwordMismatch && <span className={styles.mismatch}>⚠ Passwords do not match</span>}
            </div>

            {/* Role */}
            <div className={styles.field}>
              <label htmlFor="role" className="label">
                Role
              </label>
              <select id="role" name="role" value={form.role} onChange={handleChange} className="input" disabled={loading}>
                <option value="jailor">Jailor</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Is Active toggle */}
            <div className={styles.field}>
              <label className="label">Account Status</label>
              <div className={styles.toggleRow}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.is_active}
                  onClick={handleToggleActive}
                  className={`${styles.toggle} ${form.is_active ? styles.toggleOn : styles.toggleOff}`}
                  disabled={loading}
                >
                  <span className={styles.toggleThumb} />
                </button>
                <span className={styles.toggleLabel}>{form.is_active ? "Active — user can log in" : "Inactive — user cannot log in"}</span>
              </div>
            </div>

            <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading || passwordMismatch}>
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>

          <p className={styles.footer}>
            Already have an account?{" "}
            <Link href="/login" className={styles.footerLink}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
