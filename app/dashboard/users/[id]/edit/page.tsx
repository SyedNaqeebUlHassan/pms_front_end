"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { usersApi } from "@/lib/api";
import { User } from "@/types/user";
import styles from "./page.module.css";
import { useAuthStore } from "@/store/auth.store";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDateTime(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: authUser } = useAuthStore();

  // Admin guard
  useEffect(() => {
    if (authUser && authUser.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [authUser, router]);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "jailor">("jailor");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    usersApi
      .getOne(id)
      .then((res) => {
        const u: User = res.data.user ?? res.data;
        setUser(u);
        setName(u.name);
        setRole(u.role);
      })
      .catch(() => setFetchError("Failed to load user record."))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Validate ───────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name is required.";
    else if (name.trim().length < 2) e.name = "Name must be at least 2 characters.";
    if (!role) e.role = "Please select a role.";
    return e;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      await usersApi.update(id, { name: name.trim(), role });
      toast.success("User updated successfully.");
      router.push("/dashboard/users");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message ?? "Failed to update user.";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Admin guard render ─────────────────────────────────────────────────────
  if (authUser && authUser.role !== "admin") return null;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
        <p className={styles.centerText}>Loading user record…</p>
      </div>
    );
  }

  // ── Fetch error ────────────────────────────────────────────────────────────
  if (fetchError || !user) {
    return (
      <div className={styles.center}>
        <p className={styles.errorText}>{fetchError || "User not found."}</p>
        <button className="btn btn-secondary" onClick={() => router.back()}>
          ← Go Back
        </button>
      </div>
    );
  }

  // ── Blocked user — editing not allowed ────────────────────────────────────
  if (!user.is_active) {
    return (
      <div className={styles.page}>
        <button type="button" className={`btn btn-secondary ${styles.backBtn}`} onClick={() => router.back()}>
          ← Back
        </button>
        <div className={styles.blockedCard}>
          <div className={styles.blockedIcon}>🚫</div>
          <h3 className={styles.blockedTitle}>Editing Not Allowed</h3>
          <p className={styles.blockedDesc}>
            <strong>{user.name}</strong> is currently blocked. Unblock this user from the Users list before making any changes to their account.
          </p>
          <button className="btn btn-secondary" onClick={() => router.push("/dashboard/users")}>
            ← Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Back ── */}
      <button type="button" className={`btn btn-secondary ${styles.backBtn}`} onClick={() => router.back()}>
        ← Back
      </button>

      {/* ── Page heading ── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>Edit User</h2>
          <p className={styles.pageSub}>
            Updating account for <strong>{user.name}</strong>
          </p>
        </div>
        <span className={user.is_active ? styles.badgeActive : styles.badgeBlocked}>{user.is_active ? "● Active" : "● Blocked"}</span>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* ── User Information ── */}
        <div className={`card ${styles.section}`}>
          <h3 className={styles.sectionTitle}>Account Information</h3>

          <div className={styles.grid2}>
            {/* Full Name */}
            <div className={styles.field}>
              <label className="label">
                Full Name <span className={styles.req}>*</span>
              </label>
              <input type="text" className="input" placeholder="Enter full name" value={name} onChange={(e) => setName(e.target.value)} />
              {errors.name && <span className={styles.errMsg}>{errors.name}</span>}
            </div>

            {/* Role */}
            <div className={styles.field}>
              <label className="label">
                Role <span className={styles.req}>*</span>
              </label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value as "admin" | "jailor")}>
                <option value="jailor">Jailor</option>
                <option value="admin">Admin</option>
              </select>
              {errors.role ? (
                <span className={styles.errMsg}>{errors.role}</span>
              ) : (
                <span className={styles.hint}>Admin has full access; Jailor has limited access</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Read-only info ── */}
        <div className={`card ${styles.metaSection}`}>
          <h3 className={styles.sectionTitle}>Account Details</h3>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Email</span>
              <span className={styles.metaValue}>{user.email}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Current Role</span>
              <span className={`${styles.metaValue} ${user.role === "admin" ? styles.roleAdmin : styles.roleJailor}`}>
                {user.role === "admin" ? "Admin" : "Jailor"}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Status</span>
              <span className={user.is_active ? styles.badgeActive : styles.badgeBlocked}>{user.is_active ? "● Active" : "● Blocked"}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Joined</span>
              <span className={styles.metaValue}>{fmtDateTime(user.created_at)}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Last Updated</span>
              <span className={styles.metaValue}>{fmtDateTime(user.updated_at)}</span>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className={styles.formActions}>
          <button type="button" className={`btn btn-secondary ${styles.actionBtn}`} onClick={() => router.back()} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className={`btn btn-primary ${styles.actionBtn}`} disabled={submitting}>
            {submitting ? "Saving…" : "Save Changes →"}
          </button>
        </div>
      </form>
    </div>
  );
}
