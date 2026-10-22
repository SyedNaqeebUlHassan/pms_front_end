"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import styles from "./layout.module.css";

// Nav items config
const NAV_ITEMS = [
  {
    section: "Overview",
    links: [{ href: "/dashboard", label: "Dashboard", icon: "📊", roles: ["admin", "jailor"] }],
  },
  {
    section: "Management",
    links: [
      { href: "/dashboard/users", label: "Users", icon: "👥", roles: ["admin"] },
      { href: "/dashboard/prisoners", label: "Prisoners", icon: "🔒", roles: ["admin", "jailor"] },
      { href: "/dashboard/guards", label: "Guards", icon: "🛡️", roles: ["admin", "jailor"] },
      { href: "/dashboard/fir", label: "FIR Records", icon: "📋", roles: ["admin", "jailor"] },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) router.replace("/login");
  }, [_hasHydrated, user, router]);

  const handleLogout = () => {
    clearAuth();
    document.cookie = "pms-token=; path=/; max-age=0";
    toast.success("Logged out successfully.");
    router.push("/login");
  };

  if (!_hasHydrated || !user) {
    return (
      <div className={styles.loadingScreen}>
        <div className="spinner" />
        <p className={styles.loadingText}>Loading…</p>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandIcon}>🏛️</div>
          <div>
            <div className={styles.brandName}>PMS</div>
            <div className={styles.brandSub}>Central Prison</div>
          </div>
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          {NAV_ITEMS.map((group) => {
            const visible = group.links.filter((l) => l.roles.includes(user.role));
            if (visible.length === 0) return null;
            return (
              <div key={group.section} className={styles.navGroup}>
                <div className={styles.navSection}>{group.section}</div>
                {visible.map((link) => (
                  <Link key={link.href} href={link.href} className={`${styles.navLink} ${isActive(pathname, link.href) ? styles.navLinkActive : ""}`}>
                    <span className={styles.navIcon}>{link.icon}</span>
                    {link.label}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className={styles.userFooter}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user.name.charAt(0).toUpperCase()}</div>
            <div>
              <div className={styles.userName}>{user.name}</div>
              <div className={`${styles.userRole} ${user.role === "admin" ? styles.roleAdmin : styles.roleJailor}`}>{user.role}</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            → Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <span className={styles.topbarTitle}>Prison Management System</span>
          <div className={styles.topbarRight}>
            Signed in as <span className={styles.topbarUser}>{user.email}</span>
            <span className={`${styles.topbarBadge} ${user.role === "admin" ? styles.badgeAdmin : styles.badgeJailor}`}>{user.role}</span>
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
