"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { MdSecurity, MdCheckCircle, MdBlock, MdMan, MdWoman } from "react-icons/md";
import { guardsApi } from "@/lib/api";
import { Guard } from "@/types/guard";
import styles from "./page.module.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtShift(t: string): string {
  if (!t) return "—";
  if (t.startsWith("24:")) return "Midnight";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m ?? "00"} ${ampm}`;
}

function fmtDuty(d: string | number): string {
  const n = parseFloat(String(d));
  return isNaN(n) ? "—" : `${n % 1 === 0 ? n : n.toFixed(1)} hrs`;
}

function calcAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function GuardsListPage() {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [confirmGuard, setConfirmGuard] = useState<Guard | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // kept for future debounce use

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchGuards = (q = "") => {
    setLoading(true);
    guardsApi
      .getAll(q)
      .then((res) => setGuards(res.data.guards ?? []))
      .catch(() => toast.error("Failed to load guards."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGuards();
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const submitSearch = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveQuery(search);
    fetchGuards(search);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") submitSearch();
  };

  const clearSearch = () => {
    setSearch("");
    setActiveQuery("");
    fetchGuards("");
    searchRef.current?.focus();
  };

  // ── Deactivate ─────────────────────────────────────────────────────────────
  const handleDeactivate = async () => {
    if (!confirmGuard) return;
    setDeactivatingId(confirmGuard.id);
    try {
      await guardsApi.deactivate(confirmGuard.id);
      setGuards((prev) => prev.map((g) => (g.id === confirmGuard.id ? { ...g, is_active: false } : g)));
      toast.success(`${confirmGuard.name} has been deactivated.`);
      setConfirmGuard(null);
    } catch {
      toast.error("Failed to deactivate guard.");
    } finally {
      setDeactivatingId(null);
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const total = guards.length;
  const active = guards.filter((g) => g.is_active).length;
  const inactive = total - active;
  const maleCount = guards.filter((g) => g.sex === "male").length;
  const femaleCount = guards.filter((g) => g.sex === "female").length;

  return (
    <div className={styles.page}>
      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>Guards</h2>
          <p className={styles.pageSub}>Manage prison guard assignments and shift schedules</p>
        </div>
        <Link href="/dashboard/guards/add" className={`btn btn-primary ${styles.addBtn}`}>
          + Add Guard
        </Link>
      </div>

      {/* ── Stats grid ── */}
      <div className={styles.statsGrid}>
        {(
          [
            { label: "Total Guards", value: total, icon: MdSecurity, accent: styles.cardGray, iconCls: styles.iconGray },
            { label: "Active", value: active, icon: MdCheckCircle, accent: styles.cardGreen, iconCls: styles.iconGreen },
            { label: "Inactive", value: inactive, icon: MdBlock, accent: styles.cardSlate, iconCls: styles.iconSlate },
            { label: "Male", value: maleCount, icon: MdMan, accent: styles.cardBlue, iconCls: styles.iconBlue },
            { label: "Female", value: femaleCount, icon: MdWoman, accent: styles.cardPink, iconCls: styles.iconPink },
          ] as const
        ).map(({ label, value, icon: Icon, accent, iconCls }) => (
          <div key={label} className={`card ${styles.statCard} ${accent}`}>
            <div className={styles.statCardTop}>
              <span className={styles.statLabel}>{label}</span>
              <div className={`${styles.statIconWrap} ${iconCls}`}>
                <Icon size={17} />
              </div>
            </div>
            <div className={styles.statValue}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Search bar ── */}
      <div className={`card ${styles.searchBar}`}>
        <div className={styles.searchRow}>
          <input
            ref={searchRef}
            type="text"
            className={`input ${styles.searchInput}`}
            placeholder="Search by name or employee number…"
            value={search}
            onChange={handleSearch}
            onKeyDown={handleKeyDown}
          />
          <button className={`btn btn-primary ${styles.searchBtn}`} onClick={submitSearch}>
            Search
          </button>
          {activeQuery && (
            <button className={`btn btn-secondary ${styles.clearBtn}`} onClick={clearSearch}>
              Clear
            </button>
          )}
        </div>
        {activeQuery && (
          <p className={styles.queryHint}>
            Results for <strong>&ldquo;{activeQuery}&rdquo;</strong> — {guards.length} found
          </p>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
          <span className={styles.loadingText}>Loading guards…</span>
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && guards.length === 0 && (
        <div className={`card ${styles.empty}`}>
          <span className={styles.emptyIcon}>🛡️</span>
          <p className={styles.emptyTitle}>{activeQuery ? `No guards found for "${activeQuery}"` : "No guards registered yet"}</p>
          {!activeQuery && (
            <Link href="/dashboard/guards/add" className="btn btn-primary">
              + Add First Guard
            </Link>
          )}
        </div>
      )}

      {/* ── Desktop table ── */}
      {!loading && guards.length > 0 && (
        <div className={`card ${styles.tableWrap}`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Guard</th>
                <th>Sex</th>
                <th>Shift</th>
                <th>Duty Hours</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {guards.map((g) => (
                <tr key={g.id} className={!g.is_active ? styles.inactiveRow : ""}>
                  <td>
                    <div className={styles.guardCell}>
                      <div className={`${styles.avatar} ${g.sex === "female" ? styles.avatarF : styles.avatarM}`}>{g.name.charAt(0).toUpperCase()}</div>
                      <div className={styles.guardInfo}>
                        <span className={styles.guardName}>{g.name}</span>
                        <span className={styles.empNo}>{g.employee_no}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={g.sex === "female" ? styles.sexF : styles.sexM}>{g.sex === "female" ? "♀ Female" : "♂ Male"}</span>
                  </td>
                  <td>
                    <span className={styles.shiftPill}>
                      {fmtShift(g.shift_start)} – {fmtShift(g.shift_end)}
                    </span>
                  </td>
                  <td>
                    <span className={styles.dutyBadge}>{fmtDuty(g.duty_hours)}</span>
                  </td>
                  <td>
                    <span className={g.is_active ? styles.badgeActive : styles.badgeInactive}>{g.is_active ? "● Active" : "● Inactive"}</span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Link href={`/dashboard/guards/${g.id}`} className="btn btn-secondary btn-sm">
                        View
                      </Link>
                      <Link href={`/dashboard/guards/${g.id}/edit`} className="btn btn-secondary btn-sm">
                        Edit
                      </Link>
                      {g.is_active && (
                        <button className="btn btn-danger btn-sm" onClick={() => setConfirmGuard(g)} disabled={deactivatingId === g.id}>
                          {deactivatingId === g.id ? "…" : "Deactivate"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Mobile cards ── */}
      {!loading && guards.length > 0 && (
        <div className={styles.mobileList}>
          {guards.map((g) => (
            <div key={g.id} className={`card ${styles.mobileCard} ${!g.is_active ? styles.mobileCardInactive : ""}`}>
              {/* Card header */}
              <div className={styles.mobileCardHeader}>
                <div className={styles.guardCell}>
                  <div className={`${styles.avatar} ${g.sex === "female" ? styles.avatarF : styles.avatarM}`}>{g.name.charAt(0).toUpperCase()}</div>
                  <div className={styles.guardInfo}>
                    <span className={styles.guardName}>{g.name}</span>
                    <span className={styles.empNo}>{g.employee_no}</span>
                  </div>
                </div>
                <span className={g.is_active ? styles.badgeActive : styles.badgeInactive}>{g.is_active ? "● Active" : "● Inactive"}</span>
              </div>

              {/* Pills */}
              <div className={styles.mobileMeta}>
                <span className={g.sex === "female" ? styles.sexF : styles.sexM}>{g.sex === "female" ? "♀ Female" : "♂ Male"}</span>
                <span className={styles.shiftPill}>
                  🕐 {fmtShift(g.shift_start)} – {fmtShift(g.shift_end)}
                </span>
                <span className={styles.dutyBadge}>⏱ {fmtDuty(g.duty_hours)}</span>
                <span className={styles.agePill}>Age {calcAge(g.dob)}</span>
              </div>

              {/* Actions */}
              <div className={styles.mobileActions}>
                <Link href={`/dashboard/guards/${g.id}`} className={`btn btn-secondary btn-sm ${styles.mobileBtn}`}>
                  View
                </Link>
                <Link href={`/dashboard/guards/${g.id}/edit`} className={`btn btn-secondary btn-sm ${styles.mobileBtn}`}>
                  Edit
                </Link>
                {g.is_active && (
                  <button className={`btn btn-danger btn-sm ${styles.mobileBtn}`} onClick={() => setConfirmGuard(g)} disabled={deactivatingId === g.id}>
                    {deactivatingId === g.id ? "Deactivating…" : "Deactivate"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Deactivate Confirm Modal ── */}
      {confirmGuard && (
        <div
          className={styles.overlay}
          onClick={(e) => {
            if (e.target === e.currentTarget && !deactivatingId) setConfirmGuard(null);
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalIcon}>🔒</div>
            <h3 className={styles.modalTitle}>Deactivate Guard</h3>
            <p className={styles.modalDesc}>
              You are about to deactivate <strong>{confirmGuard.name}</strong> (<span className={styles.modalEmpNo}>{confirmGuard.employee_no}</span>).
            </p>
            <div className={styles.modalWarning}>⚠️ This will mark the guard as inactive and remove them from active duty.</div>
            <div className={styles.modalActions}>
              <button className={`btn btn-secondary ${styles.modalBtn}`} onClick={() => setConfirmGuard(null)} disabled={!!deactivatingId}>
                Cancel
              </button>
              <button className={`btn btn-danger ${styles.modalBtn}`} onClick={handleDeactivate} disabled={!!deactivatingId}>
                {deactivatingId ? "Deactivating…" : "Yes, Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Count footer ── */}
      {!loading && guards.length > 0 && (
        <p className={styles.countFooter}>
          Showing {guards.length} guard{guards.length !== 1 ? "s" : ""}
          {activeQuery ? ` for "${activeQuery}"` : ""}
        </p>
      )}
    </div>
  );
}
