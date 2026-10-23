"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { firApi, prisonersApi } from "@/lib/api";
import styles from "./page.module.css";
import { useAuthStore } from "@/store/auth.store";

// ─── Types ────────────────────────────────────────────────────────────────────
type FIRMode = "prisoner" | "standalone";
type FIRStatus = "registered" | "convicted" | "acquitted" | "closed" | "cancelled";

interface PrisonerOption {
  id: string;
  prisoner_number: string;
  name: string;
  crime: string;
  sex: string;
  is_active: boolean;
}

interface FIRDetail {
  id: string;
  complaint_number: string;
  accused_name: string;
  police_station: string;
  incident_date_time: string;
  offense_type: string;
  description: string;
  status: FIRStatus;
  registered_at: string;
  updated_at: string;
  prisoner?: PrisonerOption | null;
}

interface FormState {
  police_station: string;
  incident_date_time: string;
  offense_type: string;
  description: string;
  status: FIRStatus;
  accused_name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toDatetimeLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Prisoner Search (for un-linked FIRs only) ────────────────────────────────
function PrisonerSearch({
  selected,
  onSelect,
  onClear,
  disabled,
}: {
  selected: PrisonerOption | null;
  onSelect: (p: PrisonerOption) => void;
  onClear: () => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PrisonerOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const res = await prisonersApi.getAll(q || undefined);
      const list = (res.data.prisoners ?? []).filter((p: PrisonerOption) => p.is_active);
      setResults(list);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(v), 350);
  };

  const pick = (p: PrisonerOption) => {
    onSelect(p);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  if (selected) {
    return (
      <div className={styles.selectedCard}>
        <div className={`${styles.selAvatar} ${selected.sex === "female" ? styles.selAvatarF : styles.selAvatarM}`}>
          {selected.name.charAt(0).toUpperCase()}
        </div>
        <div className={styles.selInfo}>
          <span className={styles.selName}>{selected.name}</span>
          <span className={styles.selMeta}>
            {selected.prisoner_number} · {selected.crime}
          </span>
          <span className={selected.is_active ? styles.inCustody : styles.released}>{selected.is_active ? "🟢 In Custody" : "🔴 Released"}</span>
        </div>
        <button type="button" className={`btn btn-secondary btn-sm ${styles.changeBtn}`} onClick={onClear} disabled={disabled}>
          ✕ Change
        </button>
      </div>
    );
  }

  return (
    <div className={styles.searchWrap} ref={wrapRef}>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          className="input"
          placeholder="Click to browse or type to search prisoners…"
          value={query}
          onChange={handleInput}
          onFocus={() => doSearch(query)}
          disabled={disabled}
          autoComplete="off"
        />
        {searching && <span className={styles.inlineSpinner} />}
      </div>
      {open && results.length > 0 && (
        <div className={styles.dropdown}>
          {results.map((p) => (
            <button key={p.id} type="button" className={styles.dropItem} onClick={() => pick(p)}>
              <span className={`${styles.dropAvatar} ${p.sex === "female" ? styles.dropAvatarF : styles.dropAvatarM}`}>{p.name.charAt(0).toUpperCase()}</span>
              <span className={styles.dropInfo}>
                <span className={styles.dropName}>{p.name}</span>
                <span className={styles.dropMeta}>
                  {p.prisoner_number} · {p.crime}
                </span>
              </span>
              <span className={styles.dotActive} />
            </button>
          ))}
        </div>
      )}
      {open && !searching && results.length === 0 && (
        <div className={styles.dropEmpty}>{query.trim() ? `No active prisoners found for "${query}"` : "No active prisoners in the system"}</div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function EditFIRPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [fir, setFir] = useState<FIRDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [formError, setFormError] = useState("");

  // Only used when no prisoner is currently linked
  const [mode, setMode] = useState<FIRMode>("standalone");
  const [selectedPrisoner, setSelectedPrisoner] = useState<PrisonerOption | null>(null);

  const [form, setForm] = useState<FormState>({
    police_station: "",
    incident_date_time: "",
    offense_type: "",
    description: "",
    status: "registered",
    accused_name: "",
  });

  // ── Redirect non-admins ──────────────────────────────────────────────────
  useEffect(() => {
    if (user && !isAdmin) router.replace(`/dashboard/fir/${id}`);
  }, [user, isAdmin, id, router]);

  // ── Fetch & pre-fill ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    firApi
      .getOne(id)
      .then((res) => {
        const data: FIRDetail = res.data.fir;
        setFir(data);
        setForm({
          police_station: data.police_station ?? "",
          incident_date_time: toDatetimeLocal(data.incident_date_time),
          offense_type: data.offense_type ?? "",
          description: data.description ?? "",
          status: data.status ?? "registered",
          accused_name: data.accused_name ?? "",
        });
        // If no prisoner linked, start in standalone mode
        setMode(data.prisoner ? "prisoner" : "standalone");
      })
      .catch(() => setFetchError("Failed to load FIR record."))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleForm = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormError("");
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const switchMode = (m: FIRMode) => {
    setMode(m);
    setFormError("");
    setSelectedPrisoner(null);
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    // If prisoner is already linked on the FIR, accused_name is always editable
    if (fir?.prisoner) {
      if (!form.accused_name.trim()) return "Accused name is required.";
    } else {
      // No prisoner linked — validate based on chosen mode
      if (mode === "prisoner" && !selectedPrisoner) return "Please select a prisoner to link.";
      if (mode === "standalone" && !form.accused_name.trim()) return "Accused name is required.";
    }
    if (!form.police_station.trim()) return "Police station is required.";
    if (!form.incident_date_time) return "Incident date & time is required.";
    if (!form.offense_type.trim()) return "Offense type is required.";
    if (!form.description.trim()) return "Description is required.";
    return null;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const payload: Record<string, unknown> = {
        police_station: form.police_station.trim(),
        incident_date_time: form.incident_date_time,
        offense_type: form.offense_type.trim(),
        description: form.description.trim(),
        status: form.status,
        // accused_name is always editable
        accused_name: form.accused_name.trim(),
      };

      // Only add prisoner_id when the FIR has no prisoner yet and admin is linking one
      if (!fir?.prisoner && mode === "prisoner" && selectedPrisoner) {
        payload.prisoner_id = selectedPrisoner.id;
      }

      await firApi.update(id, payload);
      toast.success("FIR updated successfully.");
      router.push(`/dashboard/fir/${id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message ?? "Failed to update FIR.";
      setFormError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Loading FIR record…</p>
      </div>
    );
  }

  if (fetchError || !fir) {
    return (
      <div className={styles.center}>
        <p className={styles.errorMsg}>{fetchError || "FIR not found."}</p>
        <button className="btn btn-secondary" onClick={() => router.back()}>
          ← Go Back
        </button>
      </div>
    );
  }

  if (!isAdmin) return null;

  const hasLinkedPrisoner = Boolean(fir.prisoner);

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <button type="button" className={`btn btn-secondary ${styles.backBtn}`} onClick={() => router.back()}>
          ← Back
        </button>
        <div className={styles.headerMeta}>
          <h2 className={styles.pageTitle}>Edit FIR</h2>
          <p className={styles.pageSub}>
            {fir.complaint_number}
            <span className={styles.adminBadge}>Admin Only</span>
          </p>
        </div>
      </div>

      {formError && (
        <div className={`alert-error ${styles.errorBanner}`}>
          <span>⚠</span>
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* ── CASE 1: Prisoner already linked — read-only prisoner card ── */}
        {hasLinkedPrisoner && (
          <div className={`card ${styles.section}`}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Linked Prisoner</h3>
              <span className={styles.lockedBadge}>🔒 Locked</span>
            </div>
            <div className={styles.lockedCard}>
              <div className={`${styles.prisonerAvatar} ${fir.prisoner!.sex === "female" ? styles.prisonerAvatarF : styles.prisonerAvatarM}`}>
                {fir.prisoner!.name.charAt(0).toUpperCase()}
              </div>
              <div className={styles.prisonerInfo}>
                <span className={styles.prisonerName}>{fir.prisoner!.name}</span>
                <span className={styles.prisonerMeta}>
                  {fir.prisoner!.prisoner_number} · {fir.prisoner!.crime}
                </span>
                <span className={fir.prisoner!.is_active ? styles.inCustody : styles.released}>
                  {fir.prisoner!.is_active ? "🟢 In Custody" : "🔴 Released"}
                </span>
              </div>
            </div>
            <p className={styles.lockedHint}>ℹ️ Once a prisoner is linked to a FIR it cannot be changed. You can still update the accused name below.</p>

            {/* Accused name always editable */}
            <div className={`${styles.field} ${styles.accusedField}`}>
              <label className="label">
                Accused Name <span className={styles.req}>*</span>
              </label>
              <input
                name="accused_name"
                type="text"
                className="input"
                placeholder="Accused name"
                value={form.accused_name}
                onChange={handleForm}
                disabled={saving}
              />
            </div>
          </div>
        )}

        {/* ── CASE 2: No prisoner linked — show mode toggle ── */}
        {!hasLinkedPrisoner && (
          <>
            <div className={`card ${styles.section}`}>
              <h3 className={styles.sectionTitle}>FIR Type</h3>
              <p className={styles.hint}>Link this FIR to a registered prisoner, or keep it as standalone with a manual accused name.</p>
              <div className={styles.modeGrid}>
                <button type="button" className={`${styles.modeCard} ${mode === "prisoner" ? styles.modeActive : ""}`} onClick={() => switchMode("prisoner")}>
                  <span className={styles.modeIcon}>🔒</span>
                  <span className={styles.modeLabel}>Link to Prisoner</span>
                  <span className={styles.modeSub}>Accused name editable after linking</span>
                  {mode === "prisoner" && <span className={styles.modeCheck}>✓</span>}
                </button>
                <button
                  type="button"
                  className={`${styles.modeCard} ${mode === "standalone" ? styles.modeActive : ""}`}
                  onClick={() => switchMode("standalone")}
                >
                  <span className={styles.modeIcon}>📄</span>
                  <span className={styles.modeLabel}>Standalone FIR</span>
                  <span className={styles.modeSub}>Enter accused name manually</span>
                  {mode === "standalone" && <span className={styles.modeCheck}>✓</span>}
                </button>
              </div>
            </div>

            <div className={`card ${styles.section}`}>
              {mode === "prisoner" ? (
                <>
                  <h3 className={styles.sectionTitle}>
                    Link Prisoner <span className={styles.req}>*</span>
                  </h3>
                  <p className={styles.hint}>Click to browse active prisoners. Once saved, this link cannot be changed.</p>
                  <PrisonerSearch selected={selectedPrisoner} onSelect={setSelectedPrisoner} onClear={() => setSelectedPrisoner(null)} disabled={saving} />
                  {/* Accused name still editable even when linking a prisoner */}
                  <div className={`${styles.field} ${styles.accusedField}`}>
                    <label className="label">
                      Accused Name <span className={styles.req}>*</span>
                    </label>
                    <input
                      name="accused_name"
                      type="text"
                      className="input"
                      placeholder="Will default to prisoner name if left unchanged"
                      value={form.accused_name}
                      onChange={handleForm}
                      disabled={saving}
                    />
                  </div>
                </>
              ) : (
                <>
                  <h3 className={styles.sectionTitle}>
                    Accused Information <span className={styles.req}>*</span>
                  </h3>
                  <div className={styles.field}>
                    <label className="label">
                      Accused Name <span className={styles.req}>*</span>
                    </label>
                    <input
                      name="accused_name"
                      type="text"
                      className="input"
                      placeholder="Full name of the accused person"
                      value={form.accused_name}
                      onChange={handleForm}
                      disabled={saving}
                    />
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ── Case Details ── */}
        <div className={`card ${styles.section}`}>
          <h3 className={styles.sectionTitle}>Case Details</h3>
          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className="label">
                Police Station <span className={styles.req}>*</span>
              </label>
              <input
                name="police_station"
                type="text"
                className="input"
                placeholder="e.g. Saddar Police Station"
                value={form.police_station}
                onChange={handleForm}
                disabled={saving}
              />
            </div>

            <div className={styles.field}>
              <label className="label">
                Offense Type <span className={styles.req}>*</span>
              </label>
              <input
                name="offense_type"
                type="text"
                className="input"
                placeholder="e.g. murder, robbery, theft"
                value={form.offense_type}
                onChange={handleForm}
                disabled={saving}
              />
            </div>

            <div className={styles.field}>
              <label className="label">
                Incident Date &amp; Time <span className={styles.req}>*</span>
              </label>
              <input
                name="incident_date_time"
                type="datetime-local"
                className="input"
                value={form.incident_date_time}
                onChange={handleForm}
                disabled={saving}
              />
            </div>

            <div className={styles.field}>
              <label className="label">
                Status <span className={styles.req}>*</span>
              </label>
              <select name="status" className="input" value={form.status} onChange={handleForm} disabled={saving}>
                <option value="registered">Registered</option>
                <option value="convicted">Convicted</option>
                <option value="acquitted">Acquitted</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label className="label">
                Description <span className={styles.req}>*</span>
              </label>
              <textarea
                name="description"
                className={`input ${styles.textarea}`}
                rows={5}
                placeholder="Describe the incident in detail…"
                value={form.description}
                onChange={handleForm}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        {/* ── Record info (read-only) ── */}
        <div className={`card ${styles.section} ${styles.metaSection}`}>
          <h3 className={styles.sectionTitle}>Record Information</h3>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Complaint Number</span>
              <span className={styles.metaValue}>{fir.complaint_number}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Registered At</span>
              <span className={styles.metaValue}>
                {new Date(fir.registered_at).toLocaleString("en-PK", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Last Updated</span>
              <span className={styles.metaValue}>
                {new Date(fir.updated_at).toLocaleString("en-PK", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className={styles.formActions}>
          <button type="button" className={`btn btn-secondary ${styles.actionBtn}`} onClick={() => router.back()} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={`btn btn-primary ${styles.actionBtn}`} disabled={saving}>
            {saving ? "Saving…" : "Save Changes →"}
          </button>
        </div>
      </form>
    </div>
  );
}
