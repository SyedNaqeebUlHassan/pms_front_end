"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { MdPeople, MdAdminPanelSettings, MdBadge, MdCheckCircle, MdBlock } from "react-icons/md";
import { usersApi } from "@/lib/api";
import { User } from "@/types/user";
import styles from "./page.module.css";
import { useAuthStore } from "@/store/auth.store";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const router = useRouter();
  const { user: authUser } = useAuthStore();

  // Admin guard
  useEffect(() => {
    if (authUser && authUser.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [authUser, router]);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Search
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Block modal
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [blockingId, setBlockingId] = useState<string | null>(null);

  // ── Fetch (server-side search) ─────────────────────────────────────────────
  const fetchUsers = async (search?: string) => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await usersApi.getAll(search);
      setUsers(res.data.users ?? res.data);
    } catch {
      setFetchError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ── Stats (computed from loaded results) ───────────────────────────────────
  const stats = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((u) => u.role === "admin").length,
      jailors: users.filter((u) => u.role === "jailor").length,
      active: users.filter((u) => u.is_active).length,
      blocked: users.filter((u) => !u.is_active).length,
    }),
    [users],
  );

  // ── Search handlers ────────────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim() || undefined;
    setActiveQuery(query.trim());
    fetchUsers(q);
  };

  const handleClear = () => {
    setQuery("");
    setActiveQuery("");
    fetchUsers();
    inputRef.current?.focus();
  };

  // ── Block ──────────────────────────────────────────────────────────────────
  const handleBlock = async () => {
    if (!confirmUser) return;
    setBlockingId(confirmUser.id);
    try {
      await usersApi.block(confirmUser.id);
      setUsers((prev) => prev.map((u) => (u.id === confirmUser.id ? { ...u, is_active: false } : u)));
      toast.success(`${confirmUser.name} has been blocked.`);
      setConfirmUser(null);
    } catch {
      toast.error("Failed to block user.");
    } finally {
      setBlockingId(null);
    }
  };

  // ── Unblock ────────────────────────────────────────────────────────────────
  const handleUnblock = async (u: User) => {
    setBlockingId(u.id);
    try {
      await usersApi.unblock(u.id);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: true } : x)));
      toast.success(`${u.name} has been unblocked.`);
    } catch {
      toast.error("Failed to unblock user.");
    } finally {
      setBlockingId(null);
    }
  };

  // ── Admin guard render ─────────────────────────────────────────────────────
  if (authUser && authUser.role !== "admin") return null;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
        <p className={styles.centerText}>Loading users…</p>
      </div>
    );
  }

  // ── Fetch error ────────────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <div className={styles.center}>
        <p className={styles.errorText}>{fetchError}</p>
        <button className="btn btn-secondary" onClick={() => fetchUsers()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Page heading ── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>Users</h2>
          <p className={styles.pageSub}>Manage system accounts and access control</p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className={styles.statsGrid}>
        {(
          [
            { label: "Total Users", value: stats.total, icon: MdPeople, accent: styles.cardGray, iconCls: styles.iconGray },
            { label: "Admins", value: stats.admins, icon: MdAdminPanelSettings, accent: styles.cardBlue, iconCls: styles.iconBlue },
            { label: "Jailors", value: stats.jailors, icon: MdBadge, accent: styles.cardPurple, iconCls: styles.iconPurple },
            { label: "Active", value: stats.active, icon: MdCheckCircle, accent: styles.cardGreen, iconCls: styles.iconGreen },
            { label: "Blocked", value: stats.blocked, icon: MdBlock, accent: styles.cardRed, iconCls: styles.iconRed },
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
      <div className={`card ${styles.searchBar}`}>
        <form className={styles.searchForm} onSubmit={handleSearch}>
          <input
            ref={inputRef}
            type="text"
            className={`input ${styles.searchInput}`}
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className={`btn btn-primary ${styles.searchBtn}`} disabled={loading}>
            Search
          </button>
          {activeQuery && (
            <button type="button" className="btn btn-secondary" onClick={handleClear}>
              Clear
            </button>
          )}
        </form>
      </div>

      {/* ── Desktop Table ── */}
      <div className={`card ${styles.tableWrap}`}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>#</th>
                <th className={styles.th}>Name</th>
                <th className={styles.th}>Email</th>
                <th className={styles.th}>Role</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Joined</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td className={styles.td} colSpan={7}>
                    <div className={styles.emptyCell}>{activeQuery ? `No users found for "${activeQuery}"` : "No users found."}</div>
                  </td>
                </tr>
              ) : (
                users.map((u, i) => (
                  <tr key={u.id} className={`${styles.tbodyRow} ${!u.is_active ? styles.rowBlocked : ""}`}>
                    <td className={`${styles.td} ${styles.tdNum}`}>{i + 1}</td>
                    <td className={styles.td}>
                      <div className={styles.userCell}>
                        <div className={`${styles.avatar} ${u.role === "admin" ? styles.avatarAdmin : styles.avatarJailor}`}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className={styles.namePrimary}>{u.name}</span>
                      </div>
                    </td>
                    <td className={`${styles.td} ${styles.tdEmail}`}>{u.email}</td>
                    <td className={styles.td}>
                      <span className={u.role === "admin" ? styles.roleAdmin : styles.roleJailor}>{u.role === "admin" ? "Admin" : "Jailor"}</span>
                    </td>
                    <td className={styles.td}>
                      <span className={u.is_active ? styles.badgeActive : styles.badgeBlocked}>
                        <span className="badge-dot" />
                        {u.is_active ? "Active" : "Blocked"}
                      </span>
                    </td>
                    <td className={`${styles.td} ${styles.tdDate}`}>{fmtDate(u.created_at)}</td>
                    <td className={styles.td}>
                      <div className={styles.actions}>
                        {u.is_active && (
                          <Link href={`/dashboard/users/${u.id}/edit`} className="btn btn-secondary btn-sm">
                            Edit
                          </Link>
                        )}
                        {u.is_active ? (
                          <button className="btn btn-danger btn-sm" onClick={() => setConfirmUser(u)} disabled={!!blockingId}>
                            Block
                          </button>
                        ) : (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleUnblock(u)} disabled={blockingId === u.id}>
                            {blockingId === u.id ? "…" : "Unblock"}
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
        {users.length > 0 && (
          <div className={styles.tableFooter}>
            Showing {users.length} user{users.length !== 1 ? "s" : ""}
            {activeQuery && ` for "${activeQuery}"`}
          </div>
        )}
      </div>

      {/* ── Mobile Cards ── */}
      <div className={styles.mobileList}>
        {users.length === 0 ? (
          <div className={`card ${styles.emptyCell}`}>{activeQuery ? `No users found for "${activeQuery}"` : "No users found."}</div>
        ) : (
          users.map((u) => (
            <div key={u.id} className={`card ${styles.mobileCard} ${!u.is_active ? styles.mobileCardBlocked : ""}`}>
              <div className={styles.mobileCardHeader}>
                <div className={styles.userCell}>
                  <div className={`${styles.avatar} ${u.role === "admin" ? styles.avatarAdmin : styles.avatarJailor}`}>{u.name.charAt(0).toUpperCase()}</div>
                  <div className={styles.mobileUserInfo}>
                    <span className={styles.mobileName}>{u.name}</span>
                    <span className={styles.mobileEmail}>{u.email}</span>
                  </div>
                </div>
                <span className={u.is_active ? styles.badgeActive : styles.badgeBlocked}>
                  <span className="badge-dot" />
                  {u.is_active ? "Active" : "Blocked"}
                </span>
              </div>
              <div className={styles.mobileRow}>
                <span className={styles.mobileLabel}>Role</span>
                <span className={u.role === "admin" ? styles.roleAdmin : styles.roleJailor}>{u.role === "admin" ? "Admin" : "Jailor"}</span>
              </div>
              <div className={styles.mobileRow}>
                <span className={styles.mobileLabel}>Joined</span>
                <span className={styles.mobileVal}>{fmtDateTime(u.created_at)}</span>
              </div>
              <div className={styles.mobileActions}>
                {u.is_active && (
                  <Link href={`/dashboard/users/${u.id}/edit`} className="btn btn-secondary btn-sm">
                    Edit
                  </Link>
                )}
                {u.is_active ? (
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirmUser(u)} disabled={!!blockingId}>
                    Block
                  </button>
                ) : (
                  <button className="btn btn-secondary btn-sm" onClick={() => handleUnblock(u)} disabled={blockingId === u.id}>
                    {blockingId === u.id ? "…" : "Unblock"}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Block Confirmation Modal ── */}
      {confirmUser && (
        <div
          className={styles.overlay}
          onClick={(e) => {
            if (e.target === e.currentTarget && !blockingId) setConfirmUser(null);
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalIcon}>🚫</div>
            <h3 className={styles.modalTitle}>Block User</h3>
            <p className={styles.modalDesc}>
              You are about to block <strong>{confirmUser.name}</strong> (<span className={styles.modalEmail}>{confirmUser.email}</span>).
            </p>
            <div className={styles.modalWarning}>⚠️ This user will lose access to the system immediately.</div>
            <div className={styles.modalActions}>
              <button className={`btn btn-secondary ${styles.modalBtn}`} onClick={() => setConfirmUser(null)} disabled={!!blockingId}>
                Cancel
              </button>
              <button className={`btn btn-danger ${styles.modalBtn}`} onClick={handleBlock} disabled={!!blockingId}>
                {blockingId ? "Blocking…" : "Yes, Block"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
