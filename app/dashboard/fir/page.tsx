"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MdAssignment, MdHowToReg, MdGavel, MdCheckCircle, MdArchive } from "react-icons/md";
import { firApi } from "@/lib/api";
import styles from "./page.module.css";
import { useAuthStore } from "@/store/auth.store";

// ─── Types ────────────────────────────────────────────────────────────────────
type FIRStatus = "registered" | "convicted" | "acquitted" | "closed" | "cancelled";

interface FIR {
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
}

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<FIRStatus, { label: string; cls: string }> = {
  registered: { label: "Registered", cls: "sBlue" },
  convicted: { label: "Convicted", cls: "sRed" },
  acquitted: { label: "Acquitted", cls: "sGreen" },
  closed: { label: "Closed", cls: "sGray" },
  cancelled: { label: "Cancelled", cls: "sGray" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FIRListPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [firs, setFirs] = useState<FIR[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeQuery, setActiveQuery] = useState("");

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const res = await firApi.getAll(q);
      setFirs(res.data.firs ?? []);
    } catch {
      setFirs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(search.trim());
    load(search.trim());
  };

  const handleClear = () => {
    setSearch("");
    setActiveQuery("");
    load("");
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total: firs.length,
    registered: firs.filter((f) => f.status === "registered").length,
    convicted: firs.filter((f) => f.status === "convicted").length,
    acquitted: firs.filter((f) => f.status === "acquitted").length,
    closed: firs.filter((f) => f.status === "closed" || f.status === "cancelled").length,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>FIR Records</h2>
          <p className={styles.pageSub}>First Information Reports — all registered cases</p>
        </div>
        <button className={`btn btn-primary ${styles.addBtn}`} onClick={() => router.push("/dashboard/fir/add")}>
          + Add FIR
        </button>
      </div>

      {/* ── Stats ── */}
      <div className={styles.statsGrid}>
        {(
          [
            { label: "Total FIRs", value: stats.total, icon: MdAssignment, accent: styles.cardGray, iconCls: styles.iconGray },
            { label: "Registered", value: stats.registered, icon: MdHowToReg, accent: styles.cardBlue, iconCls: styles.iconBlue },
            { label: "Convicted", value: stats.convicted, icon: MdGavel, accent: styles.cardRed, iconCls: styles.iconRed },
            { label: "Acquitted", value: stats.acquitted, icon: MdCheckCircle, accent: styles.cardGreen, iconCls: styles.iconGreen },
            { label: "Closed / Cancelled", value: stats.closed, icon: MdArchive, accent: styles.cardSlate, iconCls: styles.iconSlate },
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

      {/* ── Search ── */}
      <div className={`card ${styles.searchCard}`}>
        <form className={styles.searchRow} onSubmit={handleSearch}>
          <input
            type="text"
            className={`input ${styles.searchInput}`}
            placeholder="Search by complaint no., accused name, or offense type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className={`btn btn-primary ${styles.searchBtn}`}>
            Search
          </button>
          {activeQuery && (
            <button type="button" className={`btn btn-secondary ${styles.searchBtn}`} onClick={handleClear}>
              Clear
            </button>
          )}
        </form>
        {activeQuery && (
          <p className={styles.searchHint}>
            Results for <strong>"{activeQuery}"</strong> — {firs.length} found
          </p>
        )}
      </div>

      {/* ── Content ── */}
      <div className="card">
        {loading ? (
          <div className={styles.center}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Loading FIR records…</p>
          </div>
        ) : firs.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📋</span>
            <p className={styles.emptyTitle}>{activeQuery ? `No FIRs found for "${activeQuery}"` : "No FIR records yet"}</p>
            <p className={styles.emptySub}>{activeQuery ? "Try a different search term." : "Register the first FIR to get started."}</p>
            {!activeQuery && (
              <button className={`btn btn-primary ${styles.addBtn}`} onClick={() => router.push("/dashboard/fir/add")}>
                + Add First FIR
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Desktop table ── */}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Complaint No.</th>
                    <th>Accused Name</th>
                    <th>Police Station</th>
                    <th>Offense</th>
                    <th>Incident Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {firs.map((f, i) => {
                    const cfg = STATUS_CFG[f.status] ?? { label: f.status, cls: "sGray" };
                    return (
                      <tr key={f.id}>
                        <td className={styles.idx}>{i + 1}</td>
                        <td>
                          <span className={styles.compNum}>{f.complaint_number}</span>
                        </td>
                        <td>
                          <div className={styles.accusedCell}>
                            <span className={styles.accusedAvatar}>{f.accused_name.charAt(0).toUpperCase()}</span>
                            <span className={styles.accusedName}>{f.accused_name}</span>
                          </div>
                        </td>
                        <td className={styles.stationCell}>{f.police_station}</td>
                        <td>
                          <span className={styles.offenseTag}>{f.offense_type}</span>
                        </td>
                        <td className={styles.nowrap}>{fmt(f.incident_date_time)}</td>
                        <td>
                          <span className={`${styles.badge} ${styles[cfg.cls]}`}>{cfg.label}</span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button className={`btn btn-secondary btn-sm ${styles.actBtn}`} onClick={() => router.push(`/dashboard/fir/${f.id}`)}>
                              View
                            </button>
                            {isAdmin && (
                              <button className={`btn btn-secondary btn-sm ${styles.actBtn}`} onClick={() => router.push(`/dashboard/fir/${f.id}/edit`)}>
                                Edit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards ── */}
            <div className={styles.mobileList}>
              {firs.map((f) => {
                const cfg = STATUS_CFG[f.status] ?? { label: f.status, cls: "sGray" };
                return (
                  <div key={f.id} className={styles.mobileCard}>
                    {/* Card top row */}
                    <div className={styles.mobileTop}>
                      <span className={styles.compNum}>{f.complaint_number}</span>
                      <span className={`${styles.badge} ${styles[cfg.cls]}`}>{cfg.label}</span>
                    </div>

                    {/* Accused */}
                    <div className={styles.mobileAccused}>
                      <span className={styles.accusedAvatar}>{f.accused_name.charAt(0).toUpperCase()}</span>
                      <span className={styles.accusedName}>{f.accused_name}</span>
                    </div>

                    {/* Meta pills */}
                    <div className={styles.mobileMeta}>
                      <span className={styles.metaPill}>🏛 {f.police_station}</span>
                      <span className={styles.metaPill}>⚖️ {f.offense_type}</span>
                      <span className={styles.metaPill}>📅 {fmt(f.incident_date_time)}</span>
                    </div>

                    {/* Actions */}
                    <div className={styles.mobileActions}>
                      <button className={`btn btn-secondary btn-sm ${styles.actBtn}`} onClick={() => router.push(`/dashboard/fir/${f.id}`)}>
                        View
                      </button>
                      {isAdmin && (
                        <button className={`btn btn-secondary btn-sm ${styles.actBtn}`} onClick={() => router.push(`/dashboard/fir/${f.id}/edit`)}>
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Row count footer */}
            <div className={styles.tableFooter}>
              Showing <strong>{firs.length}</strong> record{firs.length !== 1 ? "s" : ""}
              {activeQuery && ` for "${activeQuery}"`}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
