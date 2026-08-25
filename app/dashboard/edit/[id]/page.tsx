"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { usersApi } from "@/lib/api";
import { User } from "@/types/user";
import styles from "./page.module.css";

interface FormState {
  name: string;
  role: "admin" | "jailor";
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params.id;

  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", role: "jailor" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    const fetchUser = async () => {
      try {
        const res = await usersApi.getAll();
        const found = (res.data.users ?? []).find((u) => u.id === userId);
        if (!found) {
          toast.error("User not found.");
          router.replace("/dashboard");
          return;
        }
        setUser(found);
        setForm({ name: found.name, role: found.role });
      } catch {
        toast.error("Failed to load user.");
        router.replace("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setError("");
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value as FormState[keyof FormState],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Full name is required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await usersApi.update(userId, {
        name: form.name.trim(),
        role: form.role,
      });
      toast.success("User updated successfully.");
      router.push("/dashboard");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message ?? "Update failed.";
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <div className="skeleton" style={{ height: 36, width: 80, borderRadius: 6 }} />
          <div>
            <div className="skeleton" style={{ height: 22, width: 120, borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 14, width: 180, borderRadius: 4, marginTop: 6 }} />
          </div>
        </div>
        <div className={`card ${styles.card}`}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <div className={`skeleton ${styles.skeletonLabel}`} />
              <div className={`skeleton ${styles.skeletonField}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <button type="button" className="btn btn-secondary" onClick={() => router.push("/dashboard")}>
          ← Back
        </button>
        <div className={styles.headerText}>
          <h2 className={styles.heading}>Edit User</h2>
          <p className={styles.subheading}>
            Updating <span className={styles.subheadingName}>{user?.name}</span>
          </p>
        </div>
      </div>

      <div className={`card ${styles.card}`}>
        {error && (
          <div className="alert-error">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {/* Username — read-only display only */}
          <div className={styles.field}>
            <label className="label">Username</label>
            <div className={styles.readOnly}>
              <span className={styles.readOnlyValue}>{user?.user_name}</span>
              <span className={styles.readOnlyBadge}>Cannot be changed</span>
            </div>
          </div>

          {/* Name — editable */}
          <div className={styles.field}>
            <label htmlFor="name" className="label">
              Full Name <span className={styles.required}>*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter full name"
              className="input"
              disabled={saving}
            />
          </div>

          {/* Role — editable */}
          <div className={styles.field}>
            <label htmlFor="role" className="label">
              Role
            </label>
            <select id="role" name="role" value={form.role} onChange={handleChange} className="input" disabled={saving}>
              <option value="jailor">Jailor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Status — read-only */}
          <div className={styles.field}>
            <label className="label">Status</label>
            <div className={styles.statusRow}>
              <span className={`badge ${user?.is_active ? "badge-active" : "badge-blocked"}`}>
                <span className="badge-dot" />
                {user?.is_active ? "Active" : "Blocked"}
              </span>
              <span className={styles.statusHint}>Change from dashboard using Block / Unblock.</span>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button type="button" className={`btn btn-secondary ${styles.cancelBtn}`} onClick={() => router.push("/dashboard")} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={`btn btn-primary ${styles.saveBtn}`} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
