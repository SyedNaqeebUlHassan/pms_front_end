"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { usersApi, prisonersApi, guardsApi, firApi } from "@/lib/api";
import styles from "./page.module.css";

interface Stats {
  users: number | null;
  prisoners: number | null;
  guards: number | null;
  firs: number | null;
}

// ─── Admin overview ────────────────────────────────────────────────────────────
function AdminOverview() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ users: null, prisoners: null, guards: null, firs: null });

  useEffect(() => {
    // Fire all in parallel; each is best-effort
    usersApi
      .getAll()
      .then((r) => setStats((s) => ({ ...s, users: r.data.users?.length ?? 0 })))
      .catch(() => {});
    prisonersApi
      .getAll()
      .then((r) => setStats((s) => ({ ...s, prisoners: r.data.prisoners?.length ?? 0 })))
      .catch(() => {});
    guardsApi
      .getAll()
      .then((r) => setStats((s) => ({ ...s, guards: r.data.guards?.length ?? 0 })))
      .catch(() => {});
    firApi
      .getAll()
      .then((r) => setStats((s) => ({ ...s, firs: r.data.firs?.length ?? 0 })))
      .catch(() => {});
  }, []);

  const cards = [
    { label: "Total Users", value: stats.users, icon: "👥", color: styles.cardBlue, href: "/dashboard/users" },
    { label: "Prisoners", value: stats.prisoners, icon: "🔒", color: styles.cardRed, href: "/dashboard/prisoners" },
    { label: "Guards", value: stats.guards, icon: "🛡️", color: styles.cardGreen, href: "/dashboard/guards" },
    { label: "FIR Records", value: stats.firs, icon: "📋", color: styles.cardPurple, href: "/dashboard/fir" },
  ];

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>Overview</h2>
          <p className={styles.pageSub}>System-wide summary</p>
        </div>
      </div>

      <div className={styles.overviewGrid}>
        {cards.map((c) => (
          <button key={c.label} className={`card ${styles.overviewCard} ${c.color}`} onClick={() => router.push(c.href)}>
            <div className={styles.overviewIcon}>{c.icon}</div>
            <div className={styles.overviewLabel}>{c.label}</div>
            {c.value === null ? <div className={`skeleton ${styles.overviewSkeleton}`} /> : <div className={styles.overviewValue}>{c.value}</div>}
            <div className={styles.overviewLink}>View all →</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Jailor overview ───────────────────────────────────────────────────────────
function JailorOverview() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user)!;

  const shortcuts = [
    { label: "Prisoners", icon: "🔒", href: "/dashboard/prisoners", desc: "View and manage prisoner records" },
    { label: "Guards", icon: "🛡️", href: "/dashboard/guards", desc: "View guard assignments" },
    { label: "FIR Records", icon: "📋", href: "/dashboard/fir", desc: "Browse filed FIR records" },
  ];

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>Welcome, {user.name.split(" ")[0]}</h2>
          <p className={styles.pageSub}>You are signed in as Jailor. Select a module below.</p>
        </div>
      </div>

      <div className={styles.jailorGrid}>
        {shortcuts.map((s) => (
          <button key={s.label} className={`card ${styles.jailorCard}`} onClick={() => router.push(s.href)}>
            <div className={styles.jailorIcon}>{s.icon}</div>
            <div className={styles.jailorCardLabel}>{s.label}</div>
            <div className={styles.jailorCardDesc}>{s.desc}</div>
            <div className={styles.jailorCardLink}>Open →</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Export ────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  return user.role === "admin" ? <AdminOverview /> : <JailorOverview />;
}
