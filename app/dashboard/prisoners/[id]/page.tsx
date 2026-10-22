"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { prisonersApi } from "@/lib/api";
import { Prisoner, PunishmentStatus, FIRStatus } from "@/types/prisoner";
import styles from "./page.module.css";
import { useAuthStore } from "@/store/auth.store";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcAge(dob: string) {
  const b = new Date(dob);
  const n = new Date();
  let age = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) age--;
  return age;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ─── Badge maps ───────────────────────────────────────────────────────────────
const PSTATUS: Record<PunishmentStatus, { label: string; cls: string }> = {
  active: { label: "Active", cls: "badgeGreen" },
  pending: { label: "Pending", cls: "badgeYellow" },
  completed: { label: "Completed", cls: "badgeBlue" },
  cancelled: { label: "Cancelled", cls: "badgeGray" },
};

const FSTATUS: Record<FIRStatus, { label: string; cls: string }> = {
  registered: { label: "Registered", cls: "badgeBlue" },
  convicted: { label: "Convicted", cls: "badgeRed" },
  acquitted: { label: "Acquitted", cls: "badgeGreen" },
  closed: { label: "Closed", cls: "badgeGray" },
  cancelled: { label: "Cancelled", cls: "badgeGray" },
};

// ─── Release Modal ────────────────────────────────────────────────────────────
function ReleaseModal({ name, onConfirm, onClose, loading }: { name: string; onConfirm: () => void; onClose: () => void; loading: boolean }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalIcon}>🔓</div>
        <h3 className={styles.modalTitle}>Release Prisoner</h3>
        <p className={styles.modalText}>
          Are you sure you want to release <strong>{name}</strong>? This will mark the prisoner as released and cannot be undone.
        </p>
        <div className={styles.modalActions}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ViewPrisonerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [prisoner, setPrisoner] = useState<Prisoner | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [showRelease, setShowRelease] = useState(false);
  const [releasing, setReleasing] = useState(false);

  useEffect(() => {
    prisonersApi
      .getOne(id)
      .then((res) => {
        setPrisoner(res.data.prisoner);
      })
      .catch(() => setFetchError("Prisoner not found or access denied."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRelease = async () => {
    if (!prisoner) return;
    setReleasing(true);
    try {
      await prisonersApi.release(id);
      toast.success(`${prisoner.name} has been released.`);
      setPrisoner((prev) => (prev ? { ...prev, is_active: false } : prev));
      setShowRelease(false);
    } catch {
      toast.error("Failed to release prisoner. Please try again.");
    } finally {
      setReleasing(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Loading prisoner details…</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (fetchError || !prisoner) {
    return (
      <div className={styles.center}>
        <span className={styles.errorIcon}>⚠️</span>
        <p className={styles.errorMsg}>{fetchError || "Prisoner not found."}</p>
        <button className="btn btn-secondary" onClick={() => router.push("/dashboard/prisoners")}>
          ← Back to Prisoners
        </button>
      </div>
    );
  }

  const age = calcAge(prisoner.dob);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {showRelease && <ReleaseModal name={prisoner.name} onConfirm={handleRelease} onClose={() => setShowRelease(false)} loading={releasing} />}

      <div className={styles.page}>
        {/* ── Top bar ── */}
        <div className={styles.topBar}>
          <div className={styles.breadcrumb}>
            <button className={styles.backLink} onClick={() => router.push("/dashboard/prisoners")}>
              ← Prisoners
            </button>
            <span className={styles.sep}>/</span>
            <span className={styles.breadActive}>{prisoner.name}</span>
          </div>
          <div className={styles.topActions}>
            {prisoner.is_active && (
              <button className={`btn btn-secondary ${styles.actionBtn}`} onClick={() => router.push(`/dashboard/prisoners/${id}/edit`)}>
                ✏️ Edit
              </button>
            )}

            {isAdmin && prisoner.is_active && (
              <button className={`btn btn-danger ${styles.actionBtn}`} onClick={() => setShowRelease(true)}>
                🔓 Release
              </button>
            )}
          </div>
        </div>

        {/* ── Hero card ── */}
        <div className={`card ${styles.heroCard}`}>
          <div className={styles.heroLeft}>
            <div className={`${styles.avatar} ${prisoner.sex === "female" ? styles.avatarFemale : styles.avatarMale}`}>{initials(prisoner.name)}</div>
            <div className={styles.heroInfo}>
              <h2 className={styles.heroName}>{prisoner.name}</h2>
              <span className={styles.heroNumber}>{prisoner.prisoner_number}</span>
              <div className={styles.heroBadges}>
                <span className={prisoner.is_active ? styles.badgeActive : styles.badgeReleased}>{prisoner.is_active ? "● In Custody" : "○ Released"}</span>
                <span className={prisoner.sex === "male" ? styles.badgeMale : styles.badgeFemale}>{prisoner.sex === "male" ? "♂ Male" : "♀ Female"}</span>
              </div>
            </div>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Age</span>
              <span className={styles.statValue}>{age} yrs</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Date of Birth</span>
              <span className={styles.statValue}>{fmt(prisoner.dob)}</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Punishments</span>
              <span className={styles.statValue}>{prisoner.punishments?.length ?? 0}</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statLabel}>FIR Records</span>
              <span className={styles.statValue}>{prisoner.firs?.length ?? 0}</span>
            </div>
          </div>
        </div>

        {/* ── Info grid ── */}
        <div className={styles.infoGrid}>
          {/* Case details */}
          <div className={`card ${styles.infoCard}`}>
            <h3 className={styles.cardTitle}>📋 Case Details</h3>
            <dl className={styles.dl}>
              <div className={styles.dlRow}>
                <dt>Crime</dt>
                <dd>{prisoner.crime}</dd>
              </div>
              <div className={styles.dlRow}>
                <dt>Address</dt>
                <dd>{prisoner.address}</dd>
              </div>
            </dl>
          </div>

          {/* Record info */}
          <div className={`card ${styles.infoCard}`}>
            <h3 className={styles.cardTitle}>🗂 Record Info</h3>
            <dl className={styles.dl}>
              <div className={styles.dlRow}>
                <dt>Prisoner No.</dt>
                <dd className={styles.mono}>{prisoner.prisoner_number}</dd>
              </div>
              <div className={styles.dlRow}>
                <dt>Custody Status</dt>
                <dd>
                  <span className={prisoner.is_active ? styles.badgeActive : styles.badgeReleased}>{prisoner.is_active ? "In Custody" : "Released"}</span>
                </dd>
              </div>
              <div className={styles.dlRow}>
                <dt>Registered On</dt>
                <dd>{fmtDT(prisoner.created_at)}</dd>
              </div>
              <div className={styles.dlRow}>
                <dt>Last Updated</dt>
                <dd>{fmtDT(prisoner.updated_at)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* ── Punishments ── */}
        <div className={`card ${styles.section}`}>
          <h3 className={styles.cardTitle}>
            ⚖️ Punishments
            <span className={styles.countBadge}>{prisoner.punishments?.length ?? 0}</span>
          </h3>

          {!prisoner.punishments?.length ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>📭</span>
              <span>No punishment records found.</span>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Status</th>
                      <th>Reason</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prisoner.punishments.map((p, i) => {
                      const b = PSTATUS[p.status] ?? {
                        label: p.status,
                        cls: "badgeGray",
                      };
                      return (
                        <tr key={p.id}>
                          <td className={styles.idx}>{i + 1}</td>
                          <td>
                            <span className={`${styles.badge} ${styles[b.cls]}`}>{b.label}</span>
                          </td>
                          <td className={styles.reasonCell}>{p.reason}</td>
                          <td className={styles.nowrap}>{fmt(p.start_date)}</td>
                          <td className={styles.nowrap}>{fmt(p.end_date)}</td>
                          <td className={styles.muted}>{p.remarks || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className={styles.mobileCards}>
                {prisoner.punishments.map((p, i) => {
                  const b = PSTATUS[p.status] ?? { label: p.status, cls: "badgeGray" };
                  return (
                    <div key={p.id} className={styles.mobileCard}>
                      <div className={styles.mobileCardHeader}>
                        <span className={styles.mobileCardNum}>#{i + 1}</span>
                        <span className={`${styles.badge} ${styles[b.cls]}`}>{b.label}</span>
                      </div>
                      <div className={styles.mobileCardBody}>
                        <div className={styles.mobileRow}>
                          <span className={styles.mobileLabel}>Reason</span>
                          <span>{p.reason}</span>
                        </div>
                        <div className={styles.mobileRow}>
                          <span className={styles.mobileLabel}>Start Date</span>
                          <span>{fmt(p.start_date)}</span>
                        </div>
                        <div className={styles.mobileRow}>
                          <span className={styles.mobileLabel}>End Date</span>
                          <span>{fmt(p.end_date)}</span>
                        </div>
                        {p.remarks && (
                          <div className={styles.mobileRow}>
                            <span className={styles.mobileLabel}>Remarks</span>
                            <span className={styles.muted}>{p.remarks}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── FIR Records ── */}
        <div className={`card ${styles.section}`}>
          <h3 className={styles.cardTitle}>
            📁 FIR Records
            <span className={styles.countBadge}>{prisoner.firs?.length ?? 0}</span>
          </h3>

          {!prisoner.firs?.length ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>📭</span>
              <span>No FIR records linked to this prisoner.</span>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Complaint #</th>
                      <th>Accused</th>
                      <th>Police Station</th>
                      <th>Offense</th>
                      <th>Incident Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prisoner.firs.map((f) => {
                      const b = FSTATUS[f.status] ?? {
                        label: f.status,
                        cls: "badgeGray",
                      };
                      return (
                        <tr key={f.id}>
                          <td className={`${styles.mono} ${styles.compNum}`}>{f.complaint_number}</td>
                          <td>{f.accused_name}</td>
                          <td>{f.police_station}</td>
                          <td>{f.offense_type}</td>
                          <td className={styles.nowrap}>{fmt(f.incident_date_time)}</td>
                          <td>
                            <span className={`${styles.badge} ${styles[b.cls]}`}>{b.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className={styles.mobileCards}>
                {prisoner.firs.map((f) => {
                  const b = FSTATUS[f.status] ?? { label: f.status, cls: "badgeGray" };
                  return (
                    <div key={f.id} className={styles.mobileCard}>
                      <div className={styles.mobileCardHeader}>
                        <span className={`${styles.mono} ${styles.compNum}`}>{f.complaint_number}</span>
                        <span className={`${styles.badge} ${styles[b.cls]}`}>{b.label}</span>
                      </div>
                      <div className={styles.mobileCardBody}>
                        <div className={styles.mobileRow}>
                          <span className={styles.mobileLabel}>Accused</span>
                          <span>{f.accused_name}</span>
                        </div>
                        <div className={styles.mobileRow}>
                          <span className={styles.mobileLabel}>Police Station</span>
                          <span>{f.police_station}</span>
                        </div>
                        <div className={styles.mobileRow}>
                          <span className={styles.mobileLabel}>Offense</span>
                          <span>{f.offense_type}</span>
                        </div>
                        <div className={styles.mobileRow}>
                          <span className={styles.mobileLabel}>Incident Date</span>
                          <span>{fmt(f.incident_date_time)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
