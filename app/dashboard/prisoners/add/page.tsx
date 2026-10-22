"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { prisonersApi } from "@/lib/api";
import { Sex, PunishmentStatus } from "@/types/prisoner";
import styles from "./page.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PunishmentForm {
  start_date: string;
  end_date: string;
  reason: string;
  remarks: string;
  status: PunishmentStatus | "";
}

interface PrisonerForm {
  name: string;
  dob: string;
  sex: Sex | "";
  address: string;
  crime: string;
}

const EMPTY_PUNISHMENT: PunishmentForm = {
  start_date: "",
  end_date: "",
  reason: "",
  remarks: "",
  status: "active",
};

const today = new Date().toISOString().split("T")[0];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AddPrisonerPage() {
  const router = useRouter();

  const [form, setForm] = useState<PrisonerForm>({
    name: "",
    dob: "",
    sex: "",
    address: "",
    crime: "",
  });

  const [punishments, setPunishments] = useState<PunishmentForm[]>([{ ...EMPTY_PUNISHMENT }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setError("");
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePunishmentChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setError("");
    setPunishments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [e.target.name]: e.target.value };
      return updated;
    });
  };

  const addPunishment = () => {
    setPunishments((prev) => [...prev, { ...EMPTY_PUNISHMENT }]);
  };

  const removePunishment = (index: number) => {
    if (punishments.length === 1) return;
    setPunishments((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!form.name.trim()) return "Name is required.";
    if (form.name.trim().length < 3) return "Name must be at least 3 characters.";
    if (!form.dob) return "Date of birth is required.";
    if (new Date(form.dob) >= new Date()) return "Date of birth must be a past date.";
    if (!form.sex) return "Sex is required.";
    if (!form.address.trim()) return "Address is required.";
    if (!form.crime.trim()) return "Crime is required.";

    for (let i = 0; i < punishments.length; i++) {
      const p = punishments[i];
      const n = i + 1;
      if (!p.start_date) return `Punishment ${n}: Start date is required.`;
      if (!p.end_date) return `Punishment ${n}: End date is required.`;
      if (new Date(p.end_date) <= new Date()) return `Punishment ${n}: End date must be a future date.`;
      if (p.start_date >= p.end_date) return `Punishment ${n}: End date must be after start date.`;
      if (!p.reason.trim()) return `Punishment ${n}: Reason is required.`;
      if (!p.status) return `Punishment ${n}: Status is required.`;
    }

    return null;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    setError("");

    try {
      await prisonersApi.create({
        name: form.name.trim(),
        dob: form.dob,
        sex: form.sex,
        address: form.address.trim(),
        crime: form.crime.trim(),
        punishments: punishments.map((p) => ({
          start_date: p.start_date,
          end_date: p.end_date,
          reason: p.reason.trim(),
          status: p.status,
          ...(p.remarks.trim() ? { remarks: p.remarks.trim() } : {}),
        })),
      });
      toast.success("Prisoner added successfully.");
      router.push("/dashboard/prisoners");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message ?? "Failed to add prisoner.";
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <button type="button" className={`btn btn-secondary ${styles.backBtn}`} onClick={() => router.back()}>
            ← Back
          </button>
          <h2 className={styles.pageTitle}>Add Prisoner</h2>
          <p className={styles.pageSub}>Register a new prisoner record</p>
        </div>
      </div>

      {error && (
        <div className={`alert-error ${styles.errorBanner}`}>
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* ── Prisoner Info ── */}
        <div className={`card ${styles.section}`}>
          <h3 className={styles.sectionTitle}>Prisoner Information</h3>

          <div className={styles.grid2}>
            {/* Name */}
            <div className={styles.field}>
              <label className="label">
                Full Name <span className={styles.req}>*</span>
              </label>
              <input
                name="name"
                type="text"
                className="input"
                placeholder="Min. 3 characters"
                value={form.name}
                onChange={handleFormChange}
                disabled={loading}
              />
            </div>

            {/* DOB */}
            <div className={styles.field}>
              <label className="label">
                Date of Birth <span className={styles.req}>*</span>
              </label>
              <input name="dob" type="date" className="input" max={today} value={form.dob} onChange={handleFormChange} disabled={loading} />
            </div>

            {/* Sex */}
            <div className={styles.field}>
              <label className="label">
                Sex <span className={styles.req}>*</span>
              </label>
              <select name="sex" className="input" value={form.sex} onChange={handleFormChange} disabled={loading}>
                <option value="">— Select —</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            {/* Crime */}
            <div className={styles.field}>
              <label className="label">
                Crime <span className={styles.req}>*</span>
              </label>
              <input
                name="crime"
                type="text"
                className="input"
                placeholder="e.g. robbery, murder"
                value={form.crime}
                onChange={handleFormChange}
                disabled={loading}
              />
            </div>

            {/* Address — full width */}
            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label className="label">
                Address <span className={styles.req}>*</span>
              </label>
              <textarea
                name="address"
                className={`input ${styles.textarea}`}
                placeholder="Full residential address"
                value={form.address}
                onChange={handleFormChange}
                disabled={loading}
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* ── Punishments ── */}
        <div className={`card ${styles.section}`}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              Punishments <span className={styles.req}>*</span>
              <span className={styles.sectionHint}> — at least one required</span>
            </h3>
            <button type="button" className={`btn btn-secondary ${styles.addPunishmentBtn}`} onClick={addPunishment} disabled={loading}>
              + Add Punishment
            </button>
          </div>

          <div className={styles.punishmentList}>
            {punishments.map((p, i) => (
              <div key={i} className={styles.punishmentCard}>
                <div className={styles.punishmentCardHeader}>
                  <span className={styles.punishmentLabel}>Punishment #{i + 1}</span>
                  {punishments.length > 1 && (
                    <button type="button" className={`btn btn-danger btn-sm ${styles.removeBtn}`} onClick={() => removePunishment(i)} disabled={loading}>
                      Remove
                    </button>
                  )}
                </div>

                <div className={styles.grid2}>
                  {/* Start date */}
                  <div className={styles.field}>
                    <label className="label">
                      Start Date <span className={styles.req}>*</span>
                    </label>
                    <input
                      name="start_date"
                      type="date"
                      className="input"
                      value={p.start_date}
                      onChange={(e) => handlePunishmentChange(i, e)}
                      disabled={loading}
                    />
                  </div>

                  {/* End date */}
                  <div className={styles.field}>
                    <label className="label">
                      End Date <span className={styles.req}>*</span>
                      <span className={styles.fieldHint}> (must be future)</span>
                    </label>
                    <input
                      name="end_date"
                      type="date"
                      className="input"
                      min={today}
                      value={p.end_date}
                      onChange={(e) => handlePunishmentChange(i, e)}
                      disabled={loading}
                    />
                  </div>

                  {/* Status */}
                  <div className={styles.field}>
                    <label className="label">
                      Status <span className={styles.req}>*</span>
                    </label>
                    <select name="status" className="input" value={p.status} onChange={(e) => handlePunishmentChange(i, e)} disabled={loading}>
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Reason */}
                  <div className={styles.field}>
                    <label className="label">
                      Reason <span className={styles.req}>*</span>
                    </label>
                    <input
                      name="reason"
                      type="text"
                      className="input"
                      placeholder="e.g. convicted for stolen goods"
                      value={p.reason}
                      onChange={(e) => handlePunishmentChange(i, e)}
                      disabled={loading}
                    />
                  </div>

                  {/* Remarks — optional, full width */}
                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label className="label">
                      Remarks <span className={styles.optional}>(optional)</span>
                    </label>
                    <input
                      name="remarks"
                      type="text"
                      className="input"
                      placeholder="Any additional notes"
                      value={p.remarks}
                      onChange={(e) => handlePunishmentChange(i, e)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className={styles.formActions}>
          <button type="button" className={`btn btn-secondary ${styles.actionBtn}`} onClick={() => router.back()} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className={`btn btn-primary ${styles.actionBtn}`} disabled={loading}>
            {loading ? "Saving…" : "Add Prisoner →"}
          </button>
        </div>
      </form>
    </div>
  );
}
