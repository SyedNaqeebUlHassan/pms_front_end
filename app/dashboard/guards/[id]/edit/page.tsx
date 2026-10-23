"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { guardsApi } from "@/lib/api";
import { Guard } from "@/types/guard";
import styles from "./page.module.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
// API stores "HH:MM:SS" but <input type="time"> needs "HH:MM"
function toTimeInput(t: string): string {
  if (!t) return "";
  return t.slice(0, 5); // "08:00:00" → "08:00"
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function EditGuardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [guard, setGuard] = useState<Guard | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // ── Form fields ────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [dutyHours, setDutyHours] = useState("");
  const [shiftStart, setShiftStart] = useState("");
  const [shiftEnd, setShiftEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Fetch guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    guardsApi
      .getOne(id)
      .then((res) => {
        const g: Guard = res.data.guard;
        setGuard(g);
        setName(g.name);
        setDob(g.dob);
        setSex(g.sex);
        setDutyHours(String(parseFloat(g.duty_hours)));
        setShiftStart(toTimeInput(g.shift_start));
        setShiftEnd(toTimeInput(g.shift_end));
      })
      .catch(() => setFetchError("Failed to load guard record."))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Validate ───────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name is required.";
    if (!dob) e.dob = "Date of birth is required.";
    if (!sex) e.sex = "Please select a sex.";
    if (!dutyHours) e.dutyHours = "Duty hours is required.";
    else {
      const n = Number(dutyHours);
      if (isNaN(n) || n <= 0 || n > 24) e.dutyHours = "Must be between 1 and 24.";
    }
    if (!shiftStart) e.shiftStart = "Shift start time is required.";
    if (!shiftEnd) e.shiftEnd = "Shift end time is required.";
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
      await guardsApi.update(id, {
        name: name.trim(),
        dob,
        sex,
        duty_hours: Number(dutyHours),
        shift_start: shiftStart, // HH:MM
        shift_end: shiftEnd,
      });
      toast.success("Guard updated successfully.");
      router.push(`/dashboard/guards/${id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message ?? "Failed to update guard.";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
        <p className={styles.centerText}>Loading guard record…</p>
      </div>
    );
  }

  // ── Fetch error ────────────────────────────────────────────────────────────
  if (fetchError || !guard) {
    return (
      <div className={styles.center}>
        <p className={styles.errorText}>{fetchError || "Guard not found."}</p>
        <button className="btn btn-secondary" onClick={() => router.back()}>
          ← Go Back
        </button>
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
          <h2 className={styles.pageTitle}>Edit Guard</h2>
          <p className={styles.pageSub}>
            Updating record for <strong>{guard.name}</strong>
            <span className={styles.empNo}> · {guard.employee_no}</span>
          </p>
        </div>
        <span className={guard.is_active ? styles.badgeActive : styles.badgeInactive}>{guard.is_active ? "● Active" : "● Inactive"}</span>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* ── Guard Information ── */}
        <div className={`card ${styles.section}`}>
          <h3 className={styles.sectionTitle}>Guard Information</h3>

          <div className={styles.grid2}>
            {/* Full Name */}
            <div className={styles.field}>
              <label className="label">
                Full Name <span className={styles.req}>*</span>
              </label>
              <input type="text" className="input" placeholder="Min. 3 characters" value={name} onChange={(e) => setName(e.target.value)} />
              {errors.name && <span className={styles.errMsg}>{errors.name}</span>}
            </div>

            {/* Date of Birth */}
            <div className={styles.field}>
              <label className="label">
                Date of Birth <span className={styles.req}>*</span>
              </label>
              <input type="date" className="input" max={today} value={dob} onChange={(e) => setDob(e.target.value)} />
              {errors.dob && <span className={styles.errMsg}>{errors.dob}</span>}
            </div>

            {/* Sex */}
            <div className={styles.field}>
              <label className="label">
                Sex <span className={styles.req}>*</span>
              </label>
              <select className="input" value={sex} onChange={(e) => setSex(e.target.value)}>
                <option value="">— Select —</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              {errors.sex && <span className={styles.errMsg}>{errors.sex}</span>}
            </div>

            {/* Duty Hours */}
            <div className={styles.field}>
              <label className="label">
                Duty Hours <span className={styles.req}>*</span>
              </label>
              <input
                type="number"
                className="input"
                placeholder="e.g. 8"
                min={1}
                max={24}
                step={0.5}
                value={dutyHours}
                onChange={(e) => setDutyHours(e.target.value)}
              />
              {errors.dutyHours ? <span className={styles.errMsg}>{errors.dutyHours}</span> : <span className={styles.hint}>Hours per shift (1–24)</span>}
            </div>

            {/* Shift Start */}
            <div className={styles.field}>
              <label className="label">
                Shift Start <span className={styles.req}>*</span>
              </label>
              <input type="time" className="input" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} />
              {errors.shiftStart && <span className={styles.errMsg}>{errors.shiftStart}</span>}
            </div>

            {/* Shift End */}
            <div className={styles.field}>
              <label className="label">
                Shift End <span className={styles.req}>*</span>
              </label>
              <input type="time" className="input" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} />
              {errors.shiftEnd && <span className={styles.errMsg}>{errors.shiftEnd}</span>}
            </div>
          </div>
        </div>

        {/* ── Read-only record info ── */}
        <div className={`card ${styles.metaSection}`}>
          <h3 className={styles.sectionTitle}>Record Info</h3>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Employee Number</span>
              <span className={`${styles.metaValue} ${styles.mono}`}>{guard.employee_no}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Registered At</span>
              <span className={styles.metaValue}>
                {new Date(guard.created_at).toLocaleDateString("en-PK", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Last Updated</span>
              <span className={styles.metaValue}>
                {new Date(guard.updated_at).toLocaleDateString("en-PK", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
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
