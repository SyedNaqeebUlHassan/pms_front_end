"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { prisonersApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Prisoner } from "@/types/prisoner";
import styles from "./page.module.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcAge(dob: string): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Release modal ────────────────────────────────────────────────────────────
function ReleaseModal({ prisoner, onConfirm, onCancel, loading }: { prisoner: Prisoner; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalIcon}>🔓</div>
        <h3 className={styles.modalTitle}>Release Prisoner</h3>
        <p className={styles.modalMessage}>
          You are about to release <strong>{prisoner.name}</strong> <span className={styles.mono}>({prisoner.prisoner_number})</span>.
        </p>
        <p className={styles.modalWarning}>⚠ This will mark the prisoner as inactive and cannot be undone.</p>
        <div className={styles.modalActions}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Releasing…" : "Yes, Release"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PrisonersPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [prisoners, setPrisoners] = useState<Prisoner[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [releaseTarget, setReleaseTarget] = useState<Prisoner | null>(null);
  const [releasing, setReleasing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const fetchPrisoners = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const res = await prisonersApi.getAll(search);
      setPrisoners(res.data.prisoners ?? []);
    } catch {
      toast.error("Failed to load prisoners.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrisoners();
  }, [fetchPrisoners]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPrisoners(query.trim() || undefined);
  };

  const handleClear = () => {
    setQuery("");
    fetchPrisoners();
    inputRef.current?.focus();
  };

  const handleRelease = async () => {
    if (!releaseTarget) return;
    setReleasing(true);
    try {
      await prisonersApi.release(releaseTarget.id);
      toast.success(`${releaseTarget.name} has been released.`);
      setReleaseTarget(null);
      await fetchPrisoners(query.trim() || undefined);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? "Release failed.");
    } finally {
      setReleasing(false);
    }
  };

  const total = prisoners.length;
  const active = prisoners.filter((p) => p.is_active).length;
  const released = prisoners.filter((p) => !p.is_active).length;

  return (
    <div>
      {/* Release modal */}
      {releaseTarget && (
        <ReleaseModal prisoner={releaseTarget} onConfirm={handleRelease} onCancel={() => !releasing && setReleaseTarget(null)} loading={releasing} />
      )}

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>Prisoners</h2>
          <p className={styles.pageSub}>Manage all prisoner records</p>
        </div>
        <button className={`btn btn-primary ${styles.addBtn}`} onClick={() => router.push("/dashboard/prisoners/add")}>
          + Add Prisoner
        </button>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Total Prisoners</div>
          {loading ? <div className={`skeleton ${styles.statSkeleton}`} /> : <div className={`${styles.statValue} ${styles.statBlue}`}>{total}</div>}
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Currently Held</div>
          {loading ? <div className={`skeleton ${styles.statSkeleton}`} /> : <div className={`${styles.statValue} ${styles.statGreen}`}>{active}</div>}
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Released</div>
          {loading ? <div className={`skeleton ${styles.statSkeleton}`} /> : <div className={`${styles.statValue} ${styles.statRed}`}>{released}</div>}
        </div>
      </div>

      {/* Search */}
      <div className={`card ${styles.searchBar}`}>
        <form className={styles.searchForm} onSubmit={handleSearch}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by name, prisoner no. or crime…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`input ${styles.searchInput}`}
          />
          <button type="submit" className={`btn btn-primary ${styles.searchBtn}`} disabled={loading}>
            Search
          </button>
          {query && (
            <button type="button" className="btn btn-secondary" onClick={handleClear}>
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className={`card ${styles.tableWrap}`}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>#</th>
                <th className={styles.th}>Prisoner No.</th>
                <th className={styles.th}>Name</th>
                <th className={styles.th}>Sex</th>
                <th className={styles.th}>Crime</th>
                <th className={styles.th}>DOB / Age</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className={styles.tbodyRow}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className={styles.td}>
                        <div className="skeleton" style={{ height: 14, width: "70%", borderRadius: 4 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : prisoners.length === 0 ? (
                <tr>
                  <td className={styles.td} colSpan={8}>
                    <div className={styles.emptyCell}>{query ? `No prisoners found for "${query}"` : "No prisoner records yet."}</div>
                  </td>
                </tr>
              ) : (
                prisoners.map((p, idx) => (
                  <tr key={p.id} className={styles.tbodyRow}>
                    <td className={styles.td} style={{ color: "var(--text-muted)", width: 40 }}>
                      {idx + 1}
                    </td>
                    <td className={styles.td}>
                      <span className={styles.mono}>{p.prisoner_number}</span>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.nameCell}>
                        <div className={styles.nameAvatar}>{p.name.charAt(0).toUpperCase()}</div>
                        <span className={styles.namePrimary}>{p.name}</span>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <span className={`badge ${p.sex === "male" ? styles.badgeMale : styles.badgeFemale}`}>{p.sex === "male" ? "♂ Male" : "♀ Female"}</span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.crimeCell}>{p.crime}</span>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.dobCell}>
                        <span>{formatDate(p.dob)}</span>
                        <span className={styles.ageTag}>{calcAge(p.dob)} yrs</span>
                      </div>
                    </td>
                    <td className={styles.td}>
                      <span className={`badge ${p.is_active ? "badge-active" : "badge-blocked"}`}>
                        <span className="badge-dot" />
                        {p.is_active ? "In Custody" : "Released"}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.actions}>
                        <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/dashboard/prisoners/${p.id}`)}>
                          View
                        </button>
                        {p.is_active && (
                          <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/dashboard/prisoners/${p.id}/edit`)}>
                            Edit
                          </button>
                        )}

                        {isAdmin && p.is_active && (
                          <button className="btn btn-warning btn-sm" onClick={() => setReleaseTarget(p)}>
                            Release
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && prisoners.length > 0 && (
          <div className={styles.tableFooter}>
            Showing {prisoners.length} prisoner{prisoners.length !== 1 ? "s" : ""}
            {query && ` for "${query}"`}
          </div>
        )}
      </div>
    </div>
  );
}
