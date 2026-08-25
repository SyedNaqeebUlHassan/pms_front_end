"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { usersApi, authApi } from "@/lib/api";
import { User, LoginUser } from "@/types/user";
import { useAuthStore } from "@/store/auth.store";
import styles from "./page.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Delete confirmation modal
// ─────────────────────────────────────────────────────────────────────────────
function DeleteModal({ user, onConfirm, onCancel, loading }: { user: User; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>Delete User</h3>
        <p className={styles.modalMessage}>
          You are about to delete <strong>{user.name}</strong> ({user.user_name}).
        </p>
        <p className={styles.modalWarning}>⚠ This action cannot be reversed.</p>
        <div className={styles.modalActions}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Jailor view — shows profile from /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────
function JailorView() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();
  const [profile, setProfile] = useState<LoginUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await authApi.getMe();
        setProfile(res.data.user);
      } catch {
        toast.error("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  const handleLogout = () => {
    clearAuth();
    document.cookie = "pms-token=; path=/; max-age=0";
    toast.success("Logged out successfully.");
    router.push("/login");
  };

  return (
    <div className={styles.jailorWrap}>
      {/* Header banner */}
      <div className={styles.jailorBanner}>
        <div>
          <h2 className={styles.jailorBannerTitle}>Signed in as Jailor</h2>
          <p className={styles.jailorBannerSub}>You have limited access. Contact an Admin for system management.</p>
        </div>
      </div>

      {/* Profile card */}
      <div className={`card ${styles.jailorCard}`}>
        <h3 className={styles.jailorCardTitle}>My Profile</h3>

        {loading ? (
          <div className={styles.jailorSkeleton}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.jailorSkeletonRow}>
                <div className="skeleton" style={{ height: 12, width: 80, borderRadius: 4 }} />
                <div className="skeleton" style={{ height: 14, width: 160, borderRadius: 4 }} />
              </div>
            ))}
          </div>
        ) : profile ? (
          <div className={styles.profileGrid}>
            <div className={styles.profileAvatarWrap}>
              <div className={styles.profileAvatar}>{profile.name.charAt(0).toUpperCase()}</div>
            </div>
            <div className={styles.profileDetails}>
              {[
                { label: "Full Name", value: profile.name },
                { label: "Username", value: profile.user_name },
                { label: "Role", value: profile.role },
                { label: "Status", value: profile.is_active ? "Active" : "Inactive" },
              ].map((row) => (
                <div key={row.label} className={styles.profileRow}>
                  <span className={styles.profileLabel}>{row.label}</span>
                  <span
                    className={`${styles.profileValue} ${
                      row.label === "Status" ? (profile.is_active ? styles.statusActive : styles.statusInactive) : row.label === "Role" ? styles.roleValue : ""
                    }`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className={styles.jailorError}>Could not load profile.</p>
        )}
      </div>

      <button className={`btn btn-danger ${styles.jailorLogout}`} onClick={handleLogout}>
        Sign out
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin view — full user management dashboard
// ─────────────────────────────────────────────────────────────────────────────
function AdminView() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);

  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const fetchUsers = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const res = await usersApi.getAll(search);
      setUsers(res.data.users ?? []);
    } catch {
      toast.error("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(query.trim() || undefined);
  };

  const handleClear = () => {
    setQuery("");
    fetchUsers();
    inputRef.current?.focus();
  };

  const handleToggleBlock = async (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error("You cannot block your own account.");
      return;
    }
    setActionId(user.id);
    try {
      if (user.is_active) {
        await usersApi.block(user.id);
        toast.success(`${user.name} has been blocked.`);
      } else {
        await usersApi.unblock(user.id);
        toast.success(`${user.name} has been unblocked.`);
      }
      await fetchUsers(query.trim() || undefined);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? "Action failed.");
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await usersApi.delete(deleteTarget.id);
      toast.success(`${deleteTarget.name} has been deleted.`);
      setDeleteTarget(null);
      await fetchUsers(query.trim() || undefined);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active).length;
  const blockedUsers = users.filter((u) => !u.is_active).length;

  return (
    <div>
      {/* Delete modal */}
      {deleteTarget && (
        <DeleteModal user={deleteTarget} onConfirm={handleDeleteConfirm} onCancel={() => !deleting && setDeleteTarget(null)} loading={deleting} />
      )}

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>Users</h2>
          <p className={styles.pageSub}>Manage all registered system users</p>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Total Users</div>
          {loading ? <div className={`skeleton ${styles.statSkeleton}`} /> : <div className={`${styles.statValue} ${styles.statBlue}`}>{totalUsers}</div>}
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Active Users</div>
          {loading ? <div className={`skeleton ${styles.statSkeleton}`} /> : <div className={`${styles.statValue} ${styles.statGreen}`}>{activeUsers}</div>}
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statLabel}>Blocked Users</div>
          {loading ? <div className={`skeleton ${styles.statSkeleton}`} /> : <div className={`${styles.statValue} ${styles.statRed}`}>{blockedUsers}</div>}
        </div>
      </div>

      {/* Search */}
      <div className={`card ${styles.searchBar}`}>
        <form className={styles.searchForm} onSubmit={handleSearch}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by name or username…"
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
                <th className={styles.th}>Name</th>
                <th className={styles.th}>Username</th>
                <th className={styles.th}>Role</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className={styles.tbodyRow}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className={styles.td}>
                        <div className="skeleton" style={{ height: 14, width: "70%", borderRadius: 4 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td className={styles.td} colSpan={6}>
                    <div className={styles.emptyCell}>{query ? `No users found for "${query}"` : "No users registered yet."}</div>
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => {
                  const isMe = user.id === currentUser?.id;
                  const isPending = actionId === user.id;
                  return (
                    <tr key={user.id} className={styles.tbodyRow}>
                      <td className={styles.td} style={{ color: "var(--text-muted)", width: 40 }}>
                        {idx + 1}
                      </td>
                      <td className={styles.td}>
                        <div className={styles.nameCell}>
                          <div className={styles.nameAvatar}>{user.name.charAt(0).toUpperCase()}</div>
                          <div>
                            <div className={styles.namePrimary}>{user.name}</div>
                            {isMe && <div className={styles.nameYou}>you</div>}
                          </div>
                        </div>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.mono}>{user.user_name}</span>
                      </td>
                      <td className={styles.td}>
                        <span className={`badge ${user.role === "admin" ? "badge-admin" : "badge-jailor"}`}>{user.role}</span>
                      </td>
                      <td className={styles.td}>
                        <span className={`badge ${user.is_active ? "badge-active" : "badge-blocked"}`}>
                          <span className="badge-dot" />
                          {user.is_active ? "Active" : "Blocked"}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <div className={styles.actions}>
                          <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/dashboard/edit/${user.id}`)} disabled={isPending}>
                            Edit
                          </button>
                          <button
                            className={`btn btn-sm ${user.is_active ? "btn-warning" : "btn-success"}`}
                            onClick={() => handleToggleBlock(user)}
                            disabled={isPending || isMe}
                          >
                            {isPending ? "…" : user.is_active ? "Block" : "Unblock"}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(user)} disabled={isPending || isMe}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && users.length > 0 && (
          <div className={styles.tableFooter}>
            Showing {users.length} user{users.length !== 1 ? "s" : ""}
            {query && ` for "${query}"`}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export — switches between Admin and Jailor views
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  return user.role === "admin" ? <AdminView /> : <JailorView />;
}
