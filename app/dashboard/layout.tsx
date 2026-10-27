"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { MdDashboard, MdPeople, MdLock, MdSecurity, MdAssignment, MdMenu, MdClose, MdLogout, MdAccountBalance } from "react-icons/md";
import styles from "./layout.module.css";
import { useAuthStore } from "@/store/auth.store";

// ─── Nav config ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    section: "Overview",
    links: [{ href: "/dashboard", label: "Dashboard", icon: MdDashboard, roles: ["admin", "jailor"] }],
  },
  {
    section: "Management",
    links: [
      { href: "/dashboard/users", label: "Users", icon: MdPeople, roles: ["admin"] },
      { href: "/dashboard/prisoners", label: "Prisoners", icon: MdLock, roles: ["admin", "jailor"] },
      { href: "/dashboard/guards", label: "Guards", icon: MdSecurity, roles: ["admin", "jailor"] },
      { href: "/dashboard/fir", label: "FIR Records", icon: MdAssignment, roles: ["admin", "jailor"] },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

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
      {/* ── Mobile overlay ── */}
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} aria-hidden="true" />}

      {/* ── Sidebar ── */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <MdAccountBalance size={18} />
          </div>
          <div className={styles.brandText}>
            <div className={styles.brandName}>PMS</div>
            <div className={styles.brandSub}>Central Prison</div>
          </div>
          {/* Close button — mobile only */}
          <button className={styles.sidebarClose} onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <MdClose size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          {NAV_ITEMS.map((group) => {
            const visible = group.links.filter((l) => l.roles.includes(user.role));
            if (visible.length === 0) return null;
            return (
              <div key={group.section} className={styles.navGroup}>
                <div className={styles.navSection}>{group.section}</div>
                {visible.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link key={link.href} href={link.href} className={`${styles.navLink} ${isActive(pathname, link.href) ? styles.navLinkActive : ""}`}>
                      <Icon size={17} className={styles.navIcon} />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className={styles.userFooter}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user.name.charAt(0).toUpperCase()}</div>
            <div className={styles.userMeta}>
              <div className={styles.userName}>{user.name}</div>
              <div className={`${styles.userRole} ${user.role === "admin" ? styles.roleAdmin : styles.roleJailor}`}>{user.role}</div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <MdLogout size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          {/* Hamburger — mobile only */}
          <button className={styles.hamburger} onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <MdMenu size={22} />
          </button>

          <span className={styles.topbarTitle}>Prison Management System</span>

          <div className={styles.topbarRight}>
            <span className={styles.topbarEmail}>{user.name}</span>
            <span className={`${styles.topbarBadge} ${user.role === "admin" ? styles.badgeAdmin : styles.badgeJailor}`}>{user.role}</span>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
