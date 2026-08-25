"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";
import styles from "./layout.module.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);

  // Allow any authenticated user — both ADMIN and JAILOR
  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) {
      router.replace("/login");
    }
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
          <div>
            <div className={styles.brandName}>PMS</div>
            <div className={styles.brandSub}>Central Prison</div>
          </div>
        </div>

        {/* Nav — only show Users link for Admin */}
        <nav className={styles.nav}>
          <div className={styles.navSection}>{user.role === "admin" ? "Management" : "Account"}</div>
          {user.role === "admin" && (
            <Link href="/dashboard" className={`${styles.navLink} ${pathname === "/dashboard" ? styles.navLinkActive : ""}`}>
              <span className={styles.navIcon}>👥</span>
              Users
            </Link>
          )}
          {user.role === "jailor" && (
            <div className={`${styles.navLink} ${styles.navLinkActive}`}>
              <span className={styles.navIcon}>👤</span>
              My Profile
            </div>
          )}
        </nav>

        {/* User info + logout */}
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
            Signed in as <span className={styles.topbarUser}>{user.user_name}</span>
            <span className={`${styles.topbarBadge} ${user.role === "admin" ? styles.badgeAdmin : styles.badgeJailor}`}>{user.role}</span>
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
