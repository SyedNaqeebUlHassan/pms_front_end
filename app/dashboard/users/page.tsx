"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
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

  // Search (client-side)
  const [search, setSearch] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Block modal
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [blockingId, setBlockingId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchUsers = (search?: string) => {
    setLoading(true);
    setFetchError("");
    usersApi
      .getAll(search)
      .then((res) => setUsers(res.data.users ?? res.data))
      .catch(() => setFetchError("Failed to load users."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────
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
  // ── Search ─────────────────────────────────────────────────────────────────
  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim() || undefined;
    setActiveQuery(search.trim());
    fetchUsers(q);
  };
  const clearSearch = () => {
    setSearch("");
    setActiveQuery("");
    fetchUsers();
    searchRef.current?.focus();
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") submitSearch(e);
  };

  // ── Block / Unblock ────────────────────────────────────────────────────────
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
        <div className={`card ${styles.statCard}`}>
          <span className={styles.statLabel}>Total Users</span>
          <span className={styles.statValue}>{stats.total}</span>
        </div>
        <div className={`card ${styles.statCard}`}>
          <span className={styles.statLabel}>Admins</span>
          <span className={`${styles.statValue} ${styles.valBlue}`}>{stats.admins}</span>
        </div>
        <div className={`card ${styles.statCard}`}>
          <span className={styles.statLabel}>Jailors</span>
          <span className={`${styles.statValue} ${styles.valPurple}`}>{stats.jailors}</span>
        </div>
        <div className={`card ${styles.statCard}`}>
          <span className={styles.statLabel}>Active</span>
          <span className={`${styles.statValue} ${styles.valGreen}`}>{stats.active}</span>
        </div>
        <div className={`card ${styles.statCard}`}>
          <span className={styles.statLabel}>Blocked</span>
          <span className={`${styles.statValue} ${styles.valRed}`}>{stats.blocked}</span>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className={`card ${styles.toolbar}`}>
        <div className={styles.searchRow}>
          <input
            ref={searchRef}
            type="text"
            className={`input ${styles.searchInput}`}
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
      </div>

      {/* ── Desktop Table ── */}
      <div className={`card ${styles.tableWrap}`}>
        {users.length === 0 ? (
          <div className={styles.empty}>{activeQuery ? `No users matching "${activeQuery}".` : "No users found."}</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
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
