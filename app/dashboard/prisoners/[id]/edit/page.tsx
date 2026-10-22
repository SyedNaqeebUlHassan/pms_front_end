"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { prisonersApi } from "@/lib/api";
import { Punishment, PunishmentStatus, Sex } from "@/types/prisoner";
import styles from "./page.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PrisonerForm {
  name: string;
  dob: string;
  sex: Sex | "";
  address: string;
  crime: string;
}

interface ExistingPunishmentForm {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  remarks: string;
  status: PunishmentStatus;
}

interface NewPunishmentForm {
  start_date: string;
  end_date: string;
  reason: string;
  remarks: string;
  status: PunishmentStatus;
}

const today = new Date().toISOString().split("T")[0];

const EMPTY_NEW: NewPunishmentForm = {
  start_date: "",
  end_date: "",
  reason: "",
  remarks: "",
  status: "active",
};

function toExistingForm(p: Punishment): ExistingPunishmentForm {
  return {
    id: p.id,
    start_date: p.start_date?.slice(0, 10) ?? "",
    end_date: p.end_date?.slice(0, 10) ?? "",
    reason: p.reason ?? "",
    remarks: p.remarks ?? "",
    status: p.status,
  };
}

function truncId(id: string) {
  return id.slice(0, 8) + "…";
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function EditPrisonerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // load state
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [prisonerName, setPrisonerName] = useState("");

  // form state
  const [form, setForm] = useState<PrisonerForm>({
    name: "",
    dob: "",
    sex: "",
    address: "",
    crime: "",
  });
  const [existing, setExisting] = useState<ExistingPunishmentForm[]>([]);
  const [newPunishments, setNewPunishments] = useState<NewPunishmentForm[]>([]);

  // submit state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Fetch prisoner ─────────────────────────────────────────────────────────
  useEffect(() => {
    prisonersApi
      .getOne(id)
      .then((res) => {
        const p = res.data.prisoner;
        setPrisonerName(p.name);
        setForm({
          name: p.name,
          dob: p.dob?.slice(0, 10) ?? "",
          sex: p.sex,
          address: p.address,
          crime: p.crime,
        });
        setExisting((p.punishments ?? []).map(toExistingForm));
      })
      .catch(() => setFetchError("Failed to load prisoner details."))
      .finally(() => setFetching(false));
  }, [id]);

  // ── Handlers: prisoner fields ──────────────────────────────────────────────
  const handleForm = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setError("");
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── Handlers: existing punishments ────────────────────────────────────────
  const handleExisting = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setError("");
    setExisting((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [e.target.name]: e.target.value };
      return updated;
    });
  };

  // ── Handlers: new punishments ─────────────────────────────────────────────
  const handleNew = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setError("");
    setNewPunishments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [e.target.name]: e.target.value };
      return updated;
    });
  };

  const addNewPunishment = () => {
    setNewPunishments((prev) => [...prev, { ...EMPTY_NEW }]);
  };

  const removeNew = (index: number) => {
    setNewPunishments((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (form.name.trim() && form.name.trim().length < 3) return "Name must be at least 3 characters.";
    if (form.dob && new Date(form.dob) >= new Date()) return "Date of birth must be a past date.";

    for (let i = 0; i < newPunishments.length; i++) {
      const p = newPunishments[i];
      const n = i + 1;
      if (!p.start_date) return `New Punishment ${n}: Start date is required.`;
      if (!p.end_date) return `New Punishment ${n}: End date is required.`;
      if (new Date(p.end_date) <= new Date()) return `New Punishment ${n}: End date must be a future date.`;
      if (p.start_date >= p.end_date) return `New Punishment ${n}: End date must be after start date.`;
      if (!p.reason.trim()) return `New Punishment ${n}: Reason is required.`;
      if (!p.status) return `New Punishment ${n}: Status is required.`;
    }
    return null;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setSaving(true);
    setError("");

    try {
      // 1) PATCH prisoner + existing punishment updates
      const payload: Record<string, unknown> = {};
      if (form.name.trim()) payload.name = form.name.trim();
      if (form.dob) payload.dob = form.dob;
      if (form.sex) payload.sex = form.sex;
      if (form.address.trim()) payload.address = form.address.trim();
      if (form.crime.trim()) payload.crime = form.crime.trim();

      if (existing.length) {
        payload.punishments = existing.map((p) => ({
          id: p.id,
          start_date: p.start_date || undefined,
          end_date: p.end_date || undefined,
          reason: p.reason.trim() || undefined,
          status: p.status,
          ...(p.remarks.trim() ? { remarks: p.remarks.trim() } : {}),
        }));
      }

      await prisonersApi.update(id, payload);

      // 2) POST each new punishment separately
      if (newPunishments.length) {
        await Promise.all(
          newPunishments.map((p) =>
            prisonersApi.addPunishment(id, {
              start_date: p.start_date,
              end_date: p.end_date,
              reason: p.reason.trim(),
              status: p.status as PunishmentStatus,
              ...(p.remarks.trim() ? { remarks: p.remarks.trim() } : {}),
            }),
          ),
        );
      }

      toast.success("Prisoner updated successfully.");
      router.push(`/dashboard/prisoners/${id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message ?? "Failed to update prisoner.";
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (fetching) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Loading prisoner…</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className={styles.center}>
        <span className={styles.errorIcon}>⚠️</span>
        <p className={styles.errorMsg}>{fetchError}</p>
        <button className="btn btn-secondary" onClick={() => router.back()}>
          ← Go Back
        </button>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.breadcrumb}>
          <button className={styles.backLink} onClick={() => router.push("/dashboard/prisoners")}>
            ← Prisoners
          </button>
          <span className={styles.sep}>/</span>
          <button className={styles.backLink} onClick={() => router.push(`/dashboard/prisoners/${id}`)}>
            {prisonerName}
          </button>
          <span className={styles.sep}>/</span>
          <span className={styles.breadActive}>Edit</span>
        </div>
        <button type="submit" form="editForm" className={`btn btn-primary ${styles.saveTopBtn}`} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {error && (
        <div className={`alert-error ${styles.errorBanner}`}>
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      <form id="editForm" onSubmit={handleSubmit} noValidate>
        {/* ── Prisoner Info ── */}
        <div className={`card ${styles.section}`}>
          <h3 className={styles.sectionTitle}>Prisoner Information</h3>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className="label">Full Name</label>
              <input name="name" type="text" className="input" value={form.name} onChange={handleForm} disabled={saving} />
            </div>
            <div className={styles.field}>
              <label className="label">Date of Birth</label>
              <input name="dob" type="date" className="input" max={today} value={form.dob} onChange={handleForm} disabled={saving} />
            </div>
            <div className={styles.field}>
              <label className="label">Sex</label>
              <select name="sex" className="input" value={form.sex} onChange={handleForm} disabled={saving}>
                <option value="">— Select —</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className="label">Crime</label>
              <input name="crime" type="text" className="input" value={form.crime} onChange={handleForm} disabled={saving} />
            </div>
            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label className="label">Address</label>
              <textarea name="address" className={`input ${styles.textarea}`} rows={2} value={form.address} onChange={handleForm} disabled={saving} />
            </div>
          </div>
        </div>

        {/* ── Existing Punishments ── */}
        {existing.length > 0 && (
          <div className={`card ${styles.section}`}>
            <h3 className={styles.sectionTitle}>
              Existing Punishments
              <span className={styles.countBadge}>{existing.length}</span>
            </h3>
            <div className={styles.punishmentList}>
              {existing.map((p, i) => (
                <div key={p.id} className={styles.punishmentCard}>
                  <div className={styles.punishmentHeader}>
                    <span className={styles.punishmentLabel}>
                      #{i + 1}
                      <span className={styles.punishmentId}> — {truncId(p.id)}</span>
                    </span>
                    <span className={`${styles.statusPill} ${styles[`pill_${p.status}`]}`}>{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</span>
                  </div>
                  <div className={styles.grid2}>
                    <div className={styles.field}>
                      <label className="label">Start Date</label>
                      <input name="start_date" type="date" className="input" value={p.start_date} onChange={(e) => handleExisting(i, e)} disabled={saving} />
                    </div>
                    <div className={styles.field}>
                      <label className="label">End Date</label>
                      <input name="end_date" type="date" className="input" value={p.end_date} onChange={(e) => handleExisting(i, e)} disabled={saving} />
                    </div>
                    <div className={styles.field}>
                      <label className="label">Status</label>
                      <select name="status" className="input" value={p.status} onChange={(e) => handleExisting(i, e)} disabled={saving}>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className="label">Reason</label>
                      <input name="reason" type="text" className="input" value={p.reason} onChange={(e) => handleExisting(i, e)} disabled={saving} />
                    </div>
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
                        onChange={(e) => handleExisting(i, e)}
                        disabled={saving}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── New Punishments ── */}
        <div className={`card ${styles.section}`}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              Add New Punishments
              {newPunishments.length > 0 && <span className={styles.countBadge}>{newPunishments.length}</span>}
            </h3>
            <button type="button" className={`btn btn-secondary ${styles.addBtn}`} onClick={addNewPunishment} disabled={saving}>
              + Add Punishment
            </button>
          </div>

          {newPunishments.length === 0 ? (
            <div className={styles.emptyNew}>
              <span>No new punishments added.</span>
              <button type="button" className={`btn btn-secondary ${styles.addBtn}`} onClick={addNewPunishment} disabled={saving}>
                + Add Punishment
              </button>
            </div>
          ) : (
            <div className={styles.punishmentList}>
              {newPunishments.map((p, i) => (
                <div key={i} className={`${styles.punishmentCard} ${styles.newCard}`}>
                  <div className={styles.punishmentHeader}>
                    <span className={styles.punishmentLabel}>
                      New Punishment #{i + 1}
                      <span className={styles.newTag}> NEW</span>
                    </span>
                    <button type="button" className={`btn btn-danger btn-sm ${styles.removeBtn}`} onClick={() => removeNew(i)} disabled={saving}>
                      Remove
                    </button>
                  </div>
                  <div className={styles.grid2}>
                    <div className={styles.field}>
                      <label className="label">
                        Start Date <span className={styles.req}>*</span>
                      </label>
                      <input name="start_date" type="date" className="input" value={p.start_date} onChange={(e) => handleNew(i, e)} disabled={saving} />
                    </div>
                    <div className={styles.field}>
                      <label className="label">
                        End Date <span className={styles.req}>*</span>
                        <span className={styles.fieldHint}> (must be future)</span>
                      </label>
                      <input name="end_date" type="date" className="input" min={today} value={p.end_date} onChange={(e) => handleNew(i, e)} disabled={saving} />
                    </div>
                    <div className={styles.field}>
                      <label className="label">
                        Status <span className={styles.req}>*</span>
                      </label>
                      <select name="status" className="input" value={p.status} onChange={(e) => handleNew(i, e)} disabled={saving}>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className="label">
                        Reason <span className={styles.req}>*</span>
                      </label>
                      <input
                        name="reason"
                        type="text"
                        className="input"
                        placeholder="e.g. convicted for…"
                        value={p.reason}
                        onChange={(e) => handleNew(i, e)}
                        disabled={saving}
                      />
                    </div>
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
                        onChange={(e) => handleNew(i, e)}
                        disabled={saving}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Bottom actions ── */}
        <div className={styles.formActions}>
          <button type="button" className={`btn btn-secondary ${styles.actionBtn}`} onClick={() => router.push(`/dashboard/prisoners/${id}`)} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={`btn btn-primary ${styles.actionBtn}`} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
