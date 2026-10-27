"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MdPeople, MdLock, MdSecurity, MdAssignment, MdAddCircleOutline, MdEdit, MdLink, MdArrowForward } from "react-icons/md";
import { useAuthStore } from "@/store/auth.store";
import { usersApi, prisonersApi, guardsApi, firApi, activityApi } from "@/lib/api";
import styles from "./page.module.css";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Prisoner {
  id: string;
  prisoner_number: string;
  name: string;
  status: string;
  created_at: string;
}

interface ActivityLog {
  id: string;
  action: "created" | "updated" | "linked";
  entity_type: "prisoner" | "guard" | "fir";
  entity_id: string;
  description: string;
  changes: unknown;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const ACTION_ICON: Record<string, React.ElementType> = {
  created: MdAddCircleOutline,
  updated: MdEdit,
  linked: MdLink,
};

const ACTION_COLOR: Record<string, string> = {
  created: styles.actGreen,
  updated: styles.actBlue,
  linked: styles.actPurple,
};

const ENTITY_COLOR: Record<string, string> = {
  prisoner: styles.entRed,
  guard: styles.entBlue,
  fir: styles.entPurple,
};

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const isAdmin = user?.role === "admin";

  // Stats
  const [stats, setStats] = useState({
    users: null as number | null,
    prisoners: null as number | null,
    guards: null as number | null,
    firs: null as number | null,
  });

  // Recent data
  const [recentPrisoners, setRecentPrisoners] = useState<Prisoner[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [prisonerLoading, setPrisonerLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Stats — best-effort parallel
    if (isAdmin) {
      usersApi
        .getAll()
        .then((r) => setStats((s) => ({ ...s, users: (r.data.users ?? r.data).length })))
        .catch(() => setStats((s) => ({ ...s, users: 0 })));
    }

    prisonersApi
      .getAll()
      .then((r) => {
        const list: Prisoner[] = r.data.prisoners ?? r.data;
        setStats((s) => ({ ...s, prisoners: list.length }));
        setRecentPrisoners([...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5));
      })
      .catch(() => setStats((s) => ({ ...s, prisoners: 0 })))
      .finally(() => setPrisonerLoading(false));

    guardsApi
      .getAll()
      .then((r) => setStats((s) => ({ ...s, guards: (r.data.guards ?? r.data).length })))
      .catch(() => setStats((s) => ({ ...s, guards: 0 })));

    firApi
      .getAll()
      .then((r) => setStats((s) => ({ ...s, firs: (r.data.firs ?? r.data).length })))
      .catch(() => setStats((s) => ({ ...s, firs: 0 })));

    // Activity feed
    activityApi
      .getAll({ limit: 5, page: 1 })
      .then((r) => setActivity(r.data.data ?? []))
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false));
  }, [user, isAdmin]);

  if (!user) return null;

  // ── Stat cards config ────────────────────────────────────────────────────
  const statCards = [
    ...(isAdmin ? [{ label: "Users", value: stats.users, icon: MdPeople, color: styles.cardBlue, href: "/dashboard/users" }] : []),
    { label: "Prisoners", value: stats.prisoners, icon: MdLock, color: styles.cardRed, href: "/dashboard/prisoners" },
    { label: "Guards", value: stats.guards, icon: MdSecurity, color: styles.cardGreen, href: "/dashboard/guards" },
    { label: "FIR Records", value: stats.firs, icon: MdAssignment, color: styles.cardPurple, href: "/dashboard/fir" },
  ];

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>{isAdmin ? "Overview" : `Welcome, ${user.name.split(" ")[0]}`}</h2>
          <p className={styles.pageSub}>{isAdmin ? "System-wide summary and recent activity" : "Here's a quick look at what's happening today"}</p>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className={`${styles.statsGrid} ${!isAdmin ? styles.statsGridJailor : ""}`}>
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <button key={c.label} className={`card ${styles.statCard} ${c.color}`} onClick={() => router.push(c.href)}>
              <div className={styles.statCardTop}>
                <span className={styles.statLabel}>{c.label}</span>
                <div className={`${styles.statIconWrap} ${c.color}Icon`}>
                  <Icon size={18} />
                </div>
              </div>
              {c.value === null ? <div className={`skeleton ${styles.statSkeleton}`} /> : <div className={styles.statValue}>{c.value}</div>}
              <div className={styles.statLink}>
                View all <MdArrowForward size={12} />
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Two-col section: Recent Prisoners + Activity Feed ── */}
      <div className={styles.bottomGrid}>
        {/* Recent Prisoners */}
        <div className={`card ${styles.panel}`}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Recent Prisoners</h3>
            <Link href="/dashboard/prisoners" className={styles.panelLink}>
              View all <MdArrowForward size={12} />
            </Link>
          </div>

          {prisonerLoading ? (
            <div className={styles.skeletonList}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`skeleton ${styles.skeletonRow}`} />
              ))}
            </div>
          ) : recentPrisoners.length === 0 ? (
            <div className={styles.empty}>No prisoners on record yet.</div>
          ) : (
            <div className={styles.prisonerList}>
              {recentPrisoners.map((p) => (
                <div key={p.id} className={styles.prisonerRow}>
                  <div className={styles.prisonerAvatar}>{p.name.charAt(0).toUpperCase()}</div>
                  <div className={styles.prisonerInfo}>
                    <span className={styles.prisonerName}>{p.name}</span>
                    <span className={styles.prisonerNum}>{p.prisoner_number}</span>
                  </div>
                  <div className={styles.prisonerMeta}>
                    <span className={p.status === "active" ? styles.badgeActive : p.status === "released" ? styles.badgeReleased : styles.badgeOther}>
                      {p.status}
                    </span>
                    <span className={styles.prisonerDate}>{fmtDate(p.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className={`card ${styles.panel}`}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Recent Activity</h3>
          </div>

          {activityLoading ? (
            <div className={styles.skeletonList}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`skeleton ${styles.skeletonRow}`} />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className={styles.empty}>No recent activity.</div>
          ) : (
            <div className={styles.activityList}>
              {activity.map((log) => {
                const Icon = ACTION_ICON[log.action] ?? MdEdit;
                return (
                  <div key={log.id} className={styles.activityRow}>
                    <div className={`${styles.activityIconWrap} ${ACTION_COLOR[log.action] ?? styles.actBlue}`}>
                      <Icon size={14} />
                    </div>
                    <div className={styles.activityBody}>
                      <p className={styles.activityDesc}>{log.description}</p>
                      <div className={styles.activityMeta}>
                        <span className={`${styles.entityBadge} ${ENTITY_COLOR[log.entity_type] ?? ""}`}>{log.entity_type}</span>
                        <span className={styles.activityTime}>{timeAgo(log.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
