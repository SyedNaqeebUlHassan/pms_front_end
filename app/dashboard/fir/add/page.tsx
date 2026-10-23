"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { firApi, prisonersApi } from "@/lib/api";
import styles from "./page.module.css";

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

interface FormState {
  police_station: string;
  incident_date_time: string;
  offense_type: string;
  description: string;
  status: FIRStatus;
  accused_name: string;
}

// ─── Prisoner Search ──────────────────────────────────────────────────────────
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
  // ✅ Fix: explicit initial value so TypeScript doesn't complain
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch prisoners — empty query returns all; filter to active only
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

  // Show all active prisoners immediately on focus
  const handleFocus = () => {
    doSearch(query);
  };

  const pick = (p: PrisonerOption) => {
    onSelect(p);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  // ── Selected state ──────────────────────────────────────────────────────
  if (selected) {
    return (
      <div className={styles.selectedCard}>
        <div className={`${styles.selAvatar} ${selected.sex === "female" ? styles.selAvatarF : styles.selAvatarM}`}>
          {selected.name.charAt(0).toUpperCase()}
        </div>
        <div className={styles.selInfo}>
          <span className={styles.selName}>{selected.name}</span>
          <span className={styles.selMeta}>
            <span className={styles.dotActive} />
            {selected.prisoner_number} · {selected.crime}
          </span>
        </div>
        <button type="button" className={`btn btn-secondary btn-sm ${styles.removeBtn}`} onClick={onClear} disabled={disabled}>
          ✕ Change
        </button>
      </div>
    );
  }

  // ── Search input + dropdown ─────────────────────────────────────────────
  return (
    <div className={styles.searchWrap} ref={wrapRef}>
      <div className={styles.searchInputRow}>
        <input
          type="text"
          className={`input ${styles.searchInput}`}
          placeholder="Click to browse or type to search prisoners…"
          value={query}
          onChange={handleInput}
          onFocus={handleFocus}
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
              <span className={styles.dotActive} title="In Custody" />
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
export default function AddFIRPage() {
  const router = useRouter();

  const [mode, setMode] = useState<FIRMode>("prisoner");
  const [selectedPrisoner, setSelectedPrisoner] = useState<PrisonerOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormState>({
    police_station: "",
    incident_date_time: "",
    offense_type: "",
    description: "",
    status: "registered",
    accused_name: "",
  });

  const handleForm = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setError("");
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const switchMode = (m: FIRMode) => {
    setMode(m);
    setError("");
    setSelectedPrisoner(null);
    setForm((prev) => ({ ...prev, accused_name: "" }));
  };

  const validate = (): string | null => {
    if (mode === "prisoner" && !selectedPrisoner) return "Please select a prisoner to link.";
    if (mode === "standalone" && !form.accused_name.trim()) return "Accused name is required for a standalone FIR.";
    if (!form.police_station.trim()) return "Police station is required.";
    if (!form.incident_date_time) return "Incident date & time is required.";
    if (!form.offense_type.trim()) return "Offense type is required.";
    if (!form.description.trim()) return "Description is required.";
    return null;
  };

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
      const payload: Record<string, unknown> = {
        police_station: form.police_station.trim(),
        incident_date_time: form.incident_date_time,
        offense_type: form.offense_type.trim(),
        description: form.description.trim(),
        status: form.status,
      };

      if (mode === "prisoner") {
        payload.prisoner_id = selectedPrisoner!.id;
      } else {
        payload.accused_name = form.accused_name.trim();
      }

      await firApi.create(payload);
      toast.success("FIR registered successfully.");
      router.push("/dashboard/fir");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message ?? "Failed to register FIR.";
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <button type="button" className={`btn btn-secondary ${styles.backBtn}`} onClick={() => router.back()}>
          ← Back
        </button>
        <div>
          <h2 className={styles.pageTitle}>Register FIR</h2>
          <p className={styles.pageSub}>File a new First Information Report</p>
        </div>
      </div>

      {error && (
        <div className={`alert-error ${styles.errorBanner}`}>
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* ── Mode selector ── */}
        <div className={`card ${styles.section}`}>
          <h3 className={styles.sectionTitle}>FIR Type</h3>
          <p className={styles.hint}>Link this FIR directly to a registered prisoner, or file it as a standalone record with a manual accused name.</p>
          <div className={styles.modeGrid}>
            <button type="button" className={`${styles.modeCard} ${mode === "prisoner" ? styles.modeActive : ""}`} onClick={() => switchMode("prisoner")}>
              <span className={styles.modeIcon}>🔒</span>
              <span className={styles.modeLabel}>Link to Prisoner</span>
              <span className={styles.modeSub}>Accused name filled automatically</span>
              {mode === "prisoner" && <span className={styles.modeCheck}>✓</span>}
            </button>
            <button type="button" className={`${styles.modeCard} ${mode === "standalone" ? styles.modeActive : ""}`} onClick={() => switchMode("standalone")}>
              <span className={styles.modeIcon}>📄</span>
              <span className={styles.modeLabel}>Standalone FIR</span>
              <span className={styles.modeSub}>Enter accused name manually</span>
              {mode === "standalone" && <span className={styles.modeCheck}>✓</span>}
            </button>
          </div>
        </div>

        {/* ── Prisoner / Accused section ── */}
        <div className={`card ${styles.section}`}>
          {mode === "prisoner" ? (
            <>
              <h3 className={styles.sectionTitle}>
                Linked Prisoner <span className={styles.req}>*</span>
              </h3>
              <p className={styles.hint}>Click the field to browse all active prisoners, or type to search by name or number.</p>
              <PrisonerSearch selected={selectedPrisoner} onSelect={setSelectedPrisoner} onClear={() => setSelectedPrisoner(null)} disabled={saving} />
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

        {/* ── FIR Details ── */}
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
                rows={4}
                placeholder="Describe the incident in detail…"
                value={form.description}
                onChange={handleForm}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className={styles.formActions}>
          <button type="button" className={`btn btn-secondary ${styles.actionBtn}`} onClick={() => router.back()} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={`btn btn-primary ${styles.actionBtn}`} disabled={saving}>
            {saving ? "Registering…" : "Register FIR →"}
          </button>
        </div>
      </form>
    </div>
  );
}
