"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { guardsApi } from "@/lib/api";
import { Guard } from "@/types/guard";
import styles from "./page.module.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtShift(t: string): string {
  if (!t) return "—";
  if (t.startsWith("24:")) return "Midnight";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m ?? "00"} ${ampm}`;
}

function fmtDuty(d: string | number): string {
  const n = parseFloat(String(d));
  return isNaN(n) ? "—" : `${n % 1 === 0 ? n : n.toFixed(1)} hrs`;
}

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

function calcAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return age;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ViewGuardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [guard, setGuard] = useState<Guard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    guardsApi
      .getOne(id)
      .then((res) => setGuard(res.data.guard))
      .catch(() => setError("Failed to load guard record."))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Deactivate ─────────────────────────────────────────────────────────────
  const handleDeactivate = async () => {
    if (!guard) return;
    setDeactivating(true);
    try {
      await guardsApi.deactivate(guard.id);
      setGuard((prev) => (prev ? { ...prev, is_active: false } : prev));
      toast.success(`${guard.name} has been deactivated.`);
      setConfirmOpen(false);
    } catch {
      toast.error("Failed to deactivate guard.");
    } finally {
      setDeactivating(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
        <p className={styles.centerText}>Loading guard record…</p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !guard) {
    return (
      <div className={styles.center}>
        <p className={styles.errorText}>{error || "Guard not found."}</p>
        <button className="btn btn-secondary" onClick={() => router.back()}>
          ← Go Back
        </button>
      </div>
    );
  }

  const age = calcAge(guard.dob);

  return (
    <div className={styles.page}>
      {/* ── Back ── */}
      <button className={`btn btn-secondary ${styles.backBtn}`} onClick={() => router.back()}>
        ← Back
      </button>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {/* Avatar */}
          <div className={`${styles.avatar} ${guard.sex === "female" ? styles.avatarF : styles.avatarM}`}>{guard.name.charAt(0).toUpperCase()}</div>
          {/* Name + meta */}
          <div className={styles.headerInfo}>
            <div className={styles.headerTop}>
              <h2 className={styles.guardName}>{guard.name}</h2>
              <span className={guard.is_active ? styles.badgeActive : styles.badgeInactive}>{guard.is_active ? "● Active" : "● Inactive"}</span>
            </div>
            <p className={styles.headerSub}>
              <span className={styles.empNo}>{guard.employee_no}</span>
              <span className={styles.dot}>·</span>
              {guard.sex === "female" ? "♀ Female" : "♂ Male"}
              <span className={styles.dot}>·</span>
              Age {age}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.headerActions}>
          <Link href={`/dashboard/guards/${guard.id}/edit`} className="btn btn-secondary">
            ✏️ Edit
          </Link>
          {guard.is_active && (
            <button className="btn btn-danger" onClick={() => setConfirmOpen(true)}>
              Deactivate
            </button>
          )}
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className={`card ${styles.statsStrip}`}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Shift</span>
          <span className={styles.statValue}>
            {fmtShift(guard.shift_start)} – {fmtShift(guard.shift_end)}
          </span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Duty Hours</span>
          <span className={styles.statValue}>{fmtDuty(guard.duty_hours)}</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Date of Birth</span>
          <span className={styles.statValue}>{fmtDate(guard.dob)}</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Status</span>
          <span className={`${styles.statValue} ${guard.is_active ? styles.valGreen : styles.valGray}`}>
            {guard.is_active ? "On Active Duty" : "Deactivated"}
          </span>
        </div>
      </div>

      {/* ── Guard Details ── */}
      <div className={`card ${styles.section}`}>
        <h3 className={styles.sectionTitle}>Guard Details</h3>

        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Employee Number</span>
            <span className={`${styles.infoValue} ${styles.mono}`}>{guard.employee_no}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Full Name</span>
            <span className={styles.infoValue}>{guard.name}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Date of Birth</span>
            <span className={styles.infoValue}>{fmtDate(guard.dob)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Age</span>
            <span className={styles.infoValue}>{age} years</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Sex</span>
            <span className={`${styles.infoValue} ${guard.sex === "female" ? styles.sexF : styles.sexM}`}>
              {guard.sex === "female" ? "♀ Female" : "♂ Male"}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Status</span>
            <span className={guard.is_active ? styles.badgeActive : styles.badgeInactive}>{guard.is_active ? "● Active" : "● Inactive"}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Shift Start</span>
            <span className={styles.infoValue}>{fmtShift(guard.shift_start)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Shift End</span>
            <span className={styles.infoValue}>{fmtShift(guard.shift_end)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Duty Hours</span>
            <span className={styles.infoValue}>{fmtDuty(guard.duty_hours)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Shift Duration</span>
            <span className={styles.infoValue}>
              {fmtShift(guard.shift_start)} – {fmtShift(guard.shift_end)}
            </span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Registered At</span>
            <span className={styles.infoValue}>{fmtDateTime(guard.created_at)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Last Updated</span>
            <span className={styles.infoValue}>{fmtDateTime(guard.updated_at)}</span>
          </div>
        </div>
      </div>

      {/* ── Deactivate Modal ── */}
      {confirmOpen && (
        <div
          className={styles.overlay}
          onClick={(e) => {
            if (e.target === e.currentTarget && !deactivating) setConfirmOpen(false);
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalIcon}>🔒</div>
            <h3 className={styles.modalTitle}>Deactivate Guard</h3>
            <p className={styles.modalDesc}>
              You are about to deactivate <strong>{guard.name}</strong> (<span className={styles.modalEmpNo}>{guard.employee_no}</span>).
            </p>
            <div className={styles.modalWarning}>⚠️ This will mark the guard as inactive and remove them from active duty.</div>
            <div className={styles.modalActions}>
              <button className={`btn btn-secondary ${styles.modalBtn}`} onClick={() => setConfirmOpen(false)} disabled={deactivating}>
                Cancel
              </button>
              <button className={`btn btn-danger ${styles.modalBtn}`} onClick={handleDeactivate} disabled={deactivating}>
                {deactivating ? "Deactivating…" : "Yes, Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
