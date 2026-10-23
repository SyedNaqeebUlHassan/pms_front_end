"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { firApi, prisonersApi } from "@/lib/api";
import styles from "./page.module.css";
import { useAuthStore } from "@/store/auth.store";

// ─── Types ────────────────────────────────────────────────────────────────────
type FIRStatus = "registered" | "convicted" | "acquitted" | "closed" | "cancelled";

interface LinkedPrisoner {
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
  prisoner?: LinkedPrisoner | null;
}

interface PrisonerOption {
  id: string;
  prisoner_number: string;
  name: string;
  crime: string;
  sex: string;
  is_active: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<FIRStatus, { label: string; cls: string; icon: string }> = {
  registered: { label: "Registered", cls: styles.sBlue, icon: "📋" },
  convicted: { label: "Convicted", cls: styles.sRed, icon: "⚖️" },
  acquitted: { label: "Acquitted", cls: styles.sGreen, icon: "✅" },
  closed: { label: "Closed", cls: styles.sGray, icon: "🔒" },
  cancelled: { label: "Cancelled", cls: styles.sGray, icon: "❌" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(dt: string | undefined | null, time = false): string {
  if (!dt) return "—";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "—";
  if (time) {
    return d.toLocaleString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }
  return d.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Prisoner search (inline for modal) ───────────────────────────────────────
function PrisonerSearch({ onSelect, disabled }: { onSelect: (p: PrisonerOption) => void; disabled: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PrisonerOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PrisonerOption | null>(null);
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
    setSelected(p);
    setQuery("");
    setResults([]);
    setOpen(false);
    onSelect(p);
  };

  if (selected) {
    return (
      <div className={styles.miniSelected}>
        <div className={`${styles.miniAvatar} ${selected.sex === "female" ? styles.miniAvatarF : styles.miniAvatarM}`}>
          {selected.name.charAt(0).toUpperCase()}
        </div>
        <div className={styles.miniInfo}>
          <span className={styles.miniName}>{selected.name}</span>
          <span className={styles.miniMeta}>
            {selected.prisoner_number} · {selected.crime}
          </span>
        </div>
        <button
          type="button"
          className={`btn btn-secondary btn-sm`}
          onClick={() => {
            setSelected(null);
            onSelect(null as unknown as PrisonerOption);
          }}
          disabled={disabled}
        >
          ✕
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
          placeholder="Click to browse or type to search…"
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
export default function ViewFIRPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [fir, setFir] = useState<FIRDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [linkTarget, setLinkTarget] = useState<PrisonerOption | null>(null);
  const [linking, setLinking] = useState(false);

  // Fetch FIR
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    firApi
      .getOne(id)
      .then((res) => setFir(res.data.fir))
      .catch(() => setError("Failed to load FIR record."))
      .finally(() => setLoading(false));
  }, [id]);

  // Link prisoner
  const handleLink = async () => {
    if (!linkTarget || !fir) return;
    setLinking(true);
    try {
      const res = await firApi.linkPrisoner(fir.id, linkTarget.id);
      setFir((prev) => (prev ? { ...prev, prisoner: res.data.prisoner ?? linkTarget, accused_name: linkTarget.name } : prev));
      toast.success("Prisoner linked to FIR successfully.");
      setShowLink(false);
      setLinkTarget(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message ?? "Failed to link prisoner.";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLinking(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Loading FIR record…</p>
      </div>
    );
  }

  // ── Error ──
  if (error || !fir) {
    return (
      <div className={styles.center}>
        <p className={styles.errorText}>{error || "FIR not found."}</p>
        <button className="btn btn-secondary" onClick={() => router.back()}>
          ← Go Back
        </button>
      </div>
    );
  }

  const statusCfg = STATUS_CFG[fir.status] ?? STATUS_CFG.registered;

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <button className={`btn btn-secondary ${styles.backBtn}`} onClick={() => router.back()}>
          ← Back
        </button>
        <div className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <div className={styles.headerTop}>
              <h2 className={styles.complaintNo}>{fir.complaint_number}</h2>
              <span className={`${styles.statusBadge} ${statusCfg.cls}`}>
                {statusCfg.icon} {statusCfg.label}
              </span>
            </div>
            <p className={styles.headerSub}>
              Registered on {fmt(fir.registered_at)} · Police Station: {fir.police_station}
            </p>
          </div>
          {isAdmin && (
            <div className={styles.headerActions}>
              <Link href={`/dashboard/fir/${fir.id}/edit`} className="btn btn-primary">
                ✏️ Edit FIR
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className={`card ${styles.statsStrip}`}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Accused</span>
          <span className={styles.statValue}>{fir.accused_name}</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Offense</span>
          <span className={styles.statValue}>{fir.offense_type}</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Incident</span>
          <span className={styles.statValue}>{fmt(fir.incident_date_time, true)}</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Prisoner Linked</span>
          <span className={`${styles.statValue} ${fir.prisoner ? styles.linkedYes : styles.linkedNo}`}>{fir.prisoner ? "✓ Yes" : "✗ No"}</span>
        </div>
      </div>

      {/* ── Case Details ── */}
      <div className={`card ${styles.section}`}>
        <h3 className={styles.sectionTitle}>Case Details</h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Complaint Number</span>
            <span className={styles.infoValue}>{fir.complaint_number}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Accused Name</span>
            <span className={styles.infoValue}>{fir.accused_name}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Police Station</span>
            <span className={styles.infoValue}>{fir.police_station}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Offense Type</span>
            <span className={styles.offensePill}>{fir.offense_type}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Incident Date &amp; Time</span>
            <span className={styles.infoValue}>{fmt(fir.incident_date_time, true)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Status</span>
            <span className={`${styles.statusBadge} ${statusCfg.cls}`}>
              {statusCfg.icon} {statusCfg.label}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Registered At</span>
            <span className={styles.infoValue}>{fmt(fir.registered_at, true)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Last Updated</span>
            <span className={styles.infoValue}>{fmt(fir.updated_at, true)}</span>
          </div>
        </div>

        {/* Description */}
        <div className={styles.descBlock}>
          <span className={styles.infoLabel}>Description</span>
          <p className={styles.descText}>{fir.description}</p>
        </div>
      </div>

      {/* ── Linked Prisoner ── */}
      <div className={`card ${styles.section}`}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Linked Prisoner</h3>
          {!fir.prisoner && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowLink(true)}>
              🔗 Link Prisoner
            </button>
          )}
        </div>

        {fir.prisoner ? (
          <div className={styles.prisonerCard}>
            <div className={`${styles.prisonerAvatar} ${fir.prisoner.sex === "female" ? styles.prisonerAvatarF : styles.prisonerAvatarM}`}>
              {fir.prisoner.name.charAt(0).toUpperCase()}
            </div>
            <div className={styles.prisonerInfo}>
              <span className={styles.prisonerName}>{fir.prisoner.name}</span>
              <span className={styles.prisonerMeta}>
                {fir.prisoner.prisoner_number} · {fir.prisoner.crime}
              </span>
              <span className={fir.prisoner.is_active ? styles.inCustody : styles.released}>{fir.prisoner.is_active ? "🟢 In Custody" : "🔴 Released"}</span>
            </div>
            <Link href={`/dashboard/prisoners/${fir.prisoner.id}`} className={`btn btn-secondary btn-sm ${styles.viewPrisonerBtn}`}>
              View Profile →
            </Link>
          </div>
        ) : (
          <div className={styles.noLink}>
            <span className={styles.noLinkIcon}>🔍</span>
            <p className={styles.noLinkText}>No prisoner linked to this FIR.</p>
            <p className={styles.noLinkSub}>
              This FIR was filed as standalone. Use the &ldquo;Link Prisoner&rdquo; button to associate it with a registered prisoner.
            </p>
          </div>
        )}
      </div>

      {/* ── Link Prisoner Modal ── */}
      {showLink && (
        <div
          className={styles.overlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLink(false);
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Link Prisoner to FIR</h3>
              <button
                className={styles.modalClose}
                onClick={() => {
                  setShowLink(false);
                  setLinkTarget(null);
                }}
              >
                ✕
              </button>
            </div>
            <p className={styles.modalHint}>
              Search and select an active prisoner to link to <strong>{fir.complaint_number}</strong>. The accused name will be updated automatically.
            </p>
            <PrisonerSearch onSelect={(p) => setLinkTarget(p)} disabled={linking} />
            <div className={styles.modalActions}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowLink(false);
                  setLinkTarget(null);
                }}
                disabled={linking}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleLink} disabled={!linkTarget || linking}>
                {linking ? "Linking…" : "🔗 Link Prisoner"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
