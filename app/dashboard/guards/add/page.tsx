"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { guardsApi } from "@/lib/api";
import styles from "./page.module.css";

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AddGuardPage() {
  const router = useRouter();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [dutyHours, setDutyHours] = useState("");
  const [shiftStart, setShiftStart] = useState("");
  const [shiftEnd, setShiftEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      await guardsApi.create({
        name: name.trim(),
        dob,
        sex,
        duty_hours: Number(dutyHours),
        shift_start: shiftStart, // HH:MM — API expects this format
        shift_end: shiftEnd,
      });
      toast.success("Guard registered successfully.");
      router.push("/dashboard/guards");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message ?? "Failed to create guard.";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className={styles.page}>
      {/* ── Back ── */}
      <button type="button" className={`btn btn-secondary ${styles.backBtn}`} onClick={() => router.back()}>
        ← Back
      </button>

      {/* ── Page heading ── */}
      <h2 className={styles.pageTitle}>Add Guard</h2>
      <p className={styles.pageSub}>Register a new prison guard record</p>

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

        {/* ── Actions ── */}
        <div className={styles.formActions}>
          <button type="button" className={`btn btn-secondary ${styles.actionBtn}`} onClick={() => router.back()} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className={`btn btn-primary ${styles.actionBtn}`} disabled={submitting}>
            {submitting ? "Registering…" : "Add Guard →"}
          </button>
        </div>
      </form>
    </div>
  );
}
