"use client"

import { useState, useRef, useEffect, useActionState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useApp } from "./context"
import type { Artisan } from "./types"
import { getProfile, logout, updateProfile } from "@/app/actions/auth"
import type { ProfileData, UpdateProfileState } from "@/app/actions/auth"
import {
  useActiveLeases,
  usePayments,
  useInitiatePayment,
  useMaintenanceTickets,
  useCreateMaintenanceTicket,
  useKycStatus,
  useInitiateKyc,
  useTenantApplications,
  useTenantPropertyDocs,
  useSignDocument,
  useServiceProviders,
  useCreateServiceBooking,
  useServiceBookings,
  useRespondToServiceBooking,
  useUpdateServiceBookingStatus,
  usePayForServiceBooking,
} from "@/hooks/useTenant"
import type {
  LeaseOut,
  PaymentOut,
  MaintenanceTicketOut,
  KycStatusOut,
  ServiceProviderOut,
  ServiceBookingOut,
} from "@/lib/tenant-schemas"
import type { PropertyDocument } from "./types"

// ── Helpers ───────────────────────────────────────────────────────────────────

function pesewasToGhs(pesewas: number): string {
  return (pesewas / 100).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function leaseStatusColor(status: LeaseOut["status"]): string {
  if (status === "active") return "var(--state-success)"
  if (status === "expiring_soon") return "var(--state-warn)"
  return "var(--state-error)"
}

function leaseStatusLabel(status: LeaseOut["status"]): string {
  if (status === "active") return "Active"
  if (status === "expiring_soon") return "Expiring soon"
  if (status === "expired") return "Expired"
  return "Terminated"
}

function paymentStatusColor(status: PaymentOut["status"]): string {
  if (status === "paid") return "var(--state-success)"
  if (status === "failed") return "var(--state-error)"
  return "var(--state-warn)"
}

function paymentStatusLabel(status: PaymentOut["status"]): string {
  if (status === "paid") return "Paid"
  if (status === "failed") return "Failed"
  return "Pending"
}

function ticketStatusColor(status: MaintenanceTicketOut["status"]): string {
  if (status === "open") return "#3b82f6"
  if (status === "scheduled") return "#8b5cf6"
  if (status === "in_progress") return "var(--state-warn)"
  return "var(--state-success)"
}

function ticketStatusLabel(status: MaintenanceTicketOut["status"]): string {
  if (status === "open") return "Open"
  if (status === "scheduled") return "Scheduled"
  if (status === "in_progress") return "In progress"
  return "Completed"
}

function kycStatusColor(status: KycStatusOut["status"]): string {
  if (status === "passed") return "var(--state-success)"
  if (status === "failed") return "var(--state-error)"
  if (status === "pending") return "var(--state-warn)"
  return "var(--text-muted)"
}

function LoadingRows({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="ph-gradient"
          style={{ height: 72, borderRadius: 12 }}
        />
      ))}
    </div>
  )
}

function serviceProviderToArtisan(sp: ServiceProviderOut): Artisan {
  const parts = sp.name.trim().split(/\s+/)
  const initials =
    parts.length === 1
      ? parts[0].slice(0, 2).toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return {
    id: sp.id,
    name: sp.name,
    initials,
    trade: sp.specialty ?? "Service provider",
    rating: "—",
    jobs: "—",
    area: "Ghana",
    rate: "Contact for rates",
  }
}

// ── Tenant Dashboard ─────────────────────────────────────────────────────────

export function TenantDashboardView() {
  const { actions } = useApp()
  const { data: leases, isLoading: leasesLoading } = useActiveLeases()
  const { data: kycStatus } = useKycStatus()

  const lease = leases?.[0]
  const needsKyc =
    kycStatus?.status === "not_started" || kycStatus?.status === "failed"

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 32px 48px" }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "-.02em",
          margin: "0 0 4px",
        }}
      >
        Dashboard
      </h1>
      <p
        style={{ color: "var(--text-muted)", margin: "0 0 28px", fontSize: 14 }}
      >
        Welcome back. Here&apos;s your rental overview.
      </p>

      {/* KYC banner */}
      {needsKyc && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            background: "#fff7ed",
            border: "1px solid var(--state-warn)",
            borderRadius: 12,
            padding: "14px 18px",
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg
              viewBox="0 0 24 24"
              width={20}
              height={20}
              fill="none"
              stroke="var(--state-warn)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#92400e" }}>
                {kycStatus?.status === "failed"
                  ? "ID verification failed — please retry"
                  : "Complete your ID verification"}
              </div>
              {kycStatus?.failure_reason && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  {kycStatus.failure_reason}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={actions.navKyc}
            style={{
              flexShrink: 0,
              background: "var(--state-warn)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "9px 16px",
              font: "inherit",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Verify now
          </button>
        </div>
      )}

      {/* Lease summary */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>
          Active lease
        </h2>
        {leasesLoading ? (
          <div
            className="ph-gradient"
            style={{ height: 140, borderRadius: 12 }}
          />
        ) : lease ? (
          <div
            style={{
              border: "1px solid var(--ff-border)",
              borderRadius: 12,
              background: "var(--bg-surface)",
              padding: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 18,
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  Your active lease
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  Lease ID: {lease.id.slice(0, 8)}…
                </div>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "5px 12px",
                  borderRadius: 999,
                  color: "#fff",
                  background: leaseStatusColor(lease.status),
                }}
              >
                {leaseStatusLabel(lease.status)}
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 14,
              }}
            >
              <LeaseStat
                label="Monthly rent"
                value={`₵${pesewasToGhs(lease.rent_pesewas)}`}
              />
              <LeaseStat
                label="Next due"
                value={fmtDate(lease.next_due_date)}
                highlight
              />
              <LeaseStat label="Lease ends" value={fmtDate(lease.end_date)} />
            </div>
          </div>
        ) : (
          <div
            style={{
              border: "1px solid var(--ff-border)",
              borderRadius: 12,
              background: "var(--bg-surface)",
              padding: 28,
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: 14,
                marginBottom: 12,
              }}
            >
              You don&apos;t have an active lease yet.
            </div>
            <button
              onClick={actions.navDiscover}
              style={{
                background: "var(--ff-accent)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                font: "inherit",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Browse homes
            </button>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>
        Quick actions
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <QuickAction
          icon={<CardSvg />}
          label="Pay rent"
          sub="Make a payment"
          onClick={actions.navPayments}
          primary
        />
        <QuickAction
          icon={<WrenchSvg />}
          label="Request maintenance"
          sub="Submit a ticket"
          onClick={actions.navMaint}
        />
        <QuickAction
          icon={<HouseSvg />}
          label="View my lease"
          sub="Docs & details"
          onClick={actions.navLease}
        />
      </div>
    </div>
  )
}

function LeaseStat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      style={{
        border: "1px solid var(--ff-border)",
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div
        style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: highlight ? "var(--state-warn)" : "var(--text-primary)",
        }}
      >
        {value}
      </div>
    </div>
  )
}

function QuickAction({
  icon,
  label,
  sub,
  onClick,
  primary,
}: {
  icon: React.ReactNode
  label: string
  sub: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 8,
        border: primary ? "none" : "1px solid var(--ff-border)",
        borderRadius: 12,
        padding: 18,
        background: primary ? "var(--ff-accent)" : "var(--bg-surface)",
        color: primary ? "#fff" : "var(--text-primary)",
        font: "inherit",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div
        style={{ color: primary ? "rgba(255,255,255,.8)" : "var(--ff-accent)" }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{sub}</div>
      </div>
    </button>
  )
}

function CardSvg() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x={2} y={5} width={20} height={14} rx={2} />
      <path d="M2 10h20" />
    </svg>
  )
}
function WrenchSvg() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6Z" />
    </svg>
  )
}
function HouseSvg() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
      <path d="M9 21v-9h6v9" />
    </svg>
  )
}

// ── KYC ──────────────────────────────────────────────────────────────────────

export function KycView() {
  const { data: kycStatus, isLoading } = useKycStatus()
  const { mutate: initiateKyc, isPending } = useInitiateKyc()

  const [ghanaCardNumber, setGhanaCardNumber] = useState("")
  const [idImageB64, setIdImageB64] = useState<string | null>(null)
  const [selfieB64, setSelfieB64] = useState<string | null>(null)
  const [submitMsg, setSubmitMsg] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const idRef = useRef<HTMLInputElement>(null)
  const selfieRef = useRef<HTMLInputElement>(null)

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(",")[1])
      }
      reader.onerror = reject
    })
  }

  async function handleIdFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setIdImageB64(await fileToBase64(file))
  }

  async function handleSelfieFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setSelfieB64(await fileToBase64(file))
  }

  function handleSubmit() {
    if (!ghanaCardNumber || !idImageB64 || !selfieB64) return
    setSubmitMsg(null)
    initiateKyc(
      {
        ghana_card_number: ghanaCardNumber,
        id_image_base64: idImageB64,
        selfie_image_base64: selfieB64,
      },
      {
        onSuccess: () =>
          setSubmitMsg({
            type: "success",
            text: "Verification submitted. We'll notify you within 24 hours.",
          }),
        onError: (err) => setSubmitMsg({ type: "error", text: err.message }),
      }
    )
  }

  if (isLoading) {
    return (
      <div
        style={{ maxWidth: 680, margin: "0 auto", padding: "28px 32px 48px" }}
      >
        <div
          className="ph-gradient"
          style={{ height: 200, borderRadius: 12 }}
        />
      </div>
    )
  }

  const status = kycStatus?.status ?? "not_started"
  const canSubmit = status === "not_started" || status === "failed"

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 32px 48px" }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "-.02em",
          margin: "0 0 4px",
        }}
      >
        Identity verification
      </h1>
      <p
        style={{ color: "var(--text-muted)", margin: "0 0 28px", fontSize: 14 }}
      >
        Submit your Ghana Card and a selfie to unlock FieFind&apos;s full
        features.
      </p>

      {/* Status card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          border: `1px solid ${kycStatusColor(status)}`,
          borderRadius: 12,
          background: "var(--bg-surface)",
          padding: 20,
          marginBottom: 28,
        }}
      >
        <KycStatusIcon status={status} />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: kycStatusColor(status),
            }}
          >
            {status === "passed" && "Verification passed"}
            {status === "pending" && "Verification in progress"}
            {status === "failed" && "Verification failed"}
            {status === "not_started" && "Not yet verified"}
          </div>
          {status === "passed" && kycStatus?.verified_at && (
            <div
              style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}
            >
              Verified on {fmtDate(kycStatus.verified_at)} ·{" "}
              {kycStatus.ghana_card_number}
            </div>
          )}
          {status === "pending" && (
            <div
              style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}
            >
              Your documents are being reviewed. This typically takes 24–48
              hours.
            </div>
          )}
          {status === "failed" && kycStatus?.failure_reason && (
            <div
              style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}
            >
              {kycStatus.failure_reason}
            </div>
          )}
          {status === "not_started" && (
            <div
              style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}
            >
              Submit your Ghana Card to get verified and unlock all features.
            </div>
          )}
        </div>
      </div>

      {/* Form (only shown when user needs to submit) */}
      {canSubmit && (
        <div
          style={{
            border: "1px solid var(--ff-border)",
            borderRadius: 12,
            background: "var(--bg-surface)",
            padding: 24,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px" }}>
            Submit documents
          </h3>

          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Ghana Card number
          </label>
          <input
            value={ghanaCardNumber}
            onChange={(e) => setGhanaCardNumber(e.target.value)}
            placeholder="GHA-000000000-0"
            style={inputStyle}
          />

          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Ghana Card photo
          </label>
          <div
            onClick={() => idRef.current?.click()}
            style={{
              border: `2px dashed ${idImageB64 ? "var(--ff-accent)" : "var(--ff-border)"}`,
              borderRadius: 10,
              padding: 20,
              textAlign: "center",
              cursor: "pointer",
              marginBottom: 16,
              background: idImageB64 ? "var(--ff-accent-soft)" : "transparent",
            }}
          >
            {idImageB64 ? (
              <span
                style={{
                  color: "var(--ff-accent-strong)",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                ✓ ID image selected
              </span>
            ) : (
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
                Click to upload ID image (JPEG or PNG)
              </span>
            )}
            <input
              ref={idRef}
              type="file"
              accept="image/*"
              onChange={handleIdFile}
              style={{ display: "none" }}
            />
          </div>

          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Selfie
          </label>
          <div
            onClick={() => selfieRef.current?.click()}
            style={{
              border: `2px dashed ${selfieB64 ? "var(--ff-accent)" : "var(--ff-border)"}`,
              borderRadius: 10,
              padding: 20,
              textAlign: "center",
              cursor: "pointer",
              marginBottom: 24,
              background: selfieB64 ? "var(--ff-accent-soft)" : "transparent",
            }}
          >
            {selfieB64 ? (
              <span
                style={{
                  color: "var(--ff-accent-strong)",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                ✓ Selfie selected
              </span>
            ) : (
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
                Click to upload a clear selfie
              </span>
            )}
            <input
              ref={selfieRef}
              type="file"
              accept="image/*"
              onChange={handleSelfieFile}
              style={{ display: "none" }}
            />
          </div>

          {submitMsg && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 8,
                marginBottom: 16,
                background:
                  submitMsg.type === "success"
                    ? "var(--ff-accent-soft)"
                    : "#fef2f2",
                color:
                  submitMsg.type === "success"
                    ? "var(--ff-accent-strong)"
                    : "var(--state-error)",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {submitMsg.text}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={
              isPending || !ghanaCardNumber || !idImageB64 || !selfieB64
            }
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "var(--ff-accent)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: 14,
              font: "inherit",
              fontSize: 15,
              fontWeight: 700,
              cursor: isPending ? "not-allowed" : "pointer",
              opacity:
                isPending || !ghanaCardNumber || !idImageB64 || !selfieB64
                  ? 0.6
                  : 1,
            }}
          >
            {isPending ? "Submitting…" : "Submit for verification"}
          </button>
        </div>
      )}
    </div>
  )
}

function KycStatusIcon({ status }: { status: KycStatusOut["status"] }) {
  if (status === "passed") {
    return (
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "var(--state-success)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={24}
          height={24}
          fill="none"
          stroke="#fff"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 12 5 5L20 7" />
        </svg>
      </div>
    )
  }
  if (status === "pending") {
    return (
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "var(--state-warn)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={24}
          height={24}
          fill="none"
          stroke="#fff"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx={12} cy={12} r={9} />
          <path d="M12 7v5l3 3" />
        </svg>
      </div>
    )
  }
  if (status === "failed") {
    return (
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "var(--state-error)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={24}
          height={24}
          fill="none"
          stroke="#fff"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </div>
    )
  }
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        background: "var(--bg-subtle)",
        border: "2px solid var(--ff-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={24}
        height={24}
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      </svg>
    </div>
  )
}

// ── My Applications ──────────────────────────────────────────────────────────

export function ApplicationsView() {
  const { actions } = useApp()
  const { data: apps = [], isLoading } = useTenantApplications()
  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 32px 48px" }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "-.02em",
          margin: "0 0 4px",
        }}
      >
        My applications
      </h1>
      <p
        style={{ color: "var(--text-muted)", margin: "0 0 24px", fontSize: 14 }}
      >
        Track the status of every home you&apos;ve applied for.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {isLoading ? (
          <LoadingRows count={3} />
        ) : apps.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 0",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            You haven&apos;t applied to any properties yet.
          </div>
        ) : (
          apps.map((a) => {
            const isActive = a.status === "Approved"
            return (
              <div
                key={a.id}
                style={{
                  border: "1px solid var(--ff-border)",
                  borderRadius: 12,
                  background: "var(--bg-surface)",
                  padding: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                }}
              >
                <div
                  className="ph-gradient"
                  style={{
                    width: 84,
                    height: 64,
                    borderRadius: 8,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {a.property}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-muted)",
                      margin: "2px 0 8px",
                    }}
                  >
                    {a.area} · {a.price} · Landlord {a.landlord}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      color: "var(--text-muted)",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width={13}
                      height={13}
                      fill="none"
                      stroke="var(--ff-accent)"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                    </svg>
                    {a.bg} · {a.date}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "5px 12px",
                      borderRadius: 999,
                      color: "#fff",
                      background: a.statusColor,
                    }}
                  >
                    {a.status}
                  </span>
                  <button
                    onClick={
                      isActive ? actions.navLease : () => actions.openApp(a)
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      background: "none",
                      border: "none",
                      color: "var(--ff-accent-strong)",
                      font: "inherit",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {isActive ? "View lease" : "Track status"}
                    <svg
                      viewBox="0 0 24 24"
                      width={14}
                      height={14}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── My Lease ─────────────────────────────────────────────────────────────────

export function MyLeaseView() {
  const { actions } = useApp()
  const { data: leases, isLoading } = useActiveLeases()
  const [showMessages, setShowMessages] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      from: "landlord",
      text: "Hi, welcome! Keys will be ready on move-in day.",
      time: "Jun 20",
    },
    {
      id: 2,
      from: "tenant",
      text: "Thank you! Looking forward to it.",
      time: "Jun 20",
    },
    {
      id: 3,
      from: "landlord",
      text: "Let me know if you need anything before then.",
      time: "Jun 21",
    },
  ])
  const [draft, setDraft] = useState("")
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set())
  const { data: docs = [] } = useTenantPropertyDocs(
    leases?.[0]?.property_id ?? ""
  )
  const signDoc = useSignDocument()

  function sendMessage() {
    const text = draft.trim()
    if (!text) return
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), from: "tenant", text, time: "Just now" },
    ])
    setDraft("")
  }

  function handleDownload(doc: string) {
    setDownloaded((prev) => new Set(prev).add(doc))
  }

  const lease = leases?.[0]

  if (isLoading) {
    return (
      <div
        style={{ maxWidth: 900, margin: "0 auto", padding: "28px 32px 48px" }}
      >
        <div
          className="ph-gradient"
          style={{ height: 60, borderRadius: 10, marginBottom: 16 }}
        />
        <LoadingRows count={4} />
      </div>
    )
  }

  if (!lease) {
    return (
      <div
        style={{ maxWidth: 900, margin: "0 auto", padding: "28px 32px 48px" }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: "-.02em",
            margin: "0 0 4px",
          }}
        >
          My lease
        </h1>
        <div
          style={{
            border: "1px solid var(--ff-border)",
            borderRadius: 12,
            background: "var(--bg-surface)",
            padding: 40,
            textAlign: "center",
            marginTop: 24,
          }}
        >
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: 15,
              marginBottom: 16,
            }}
          >
            You don&apos;t have an active lease yet.
          </div>
          <button
            onClick={actions.navDiscover}
            style={{
              background: "var(--ff-accent)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              font: "inherit",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Browse homes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 32px 48px" }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "-.02em",
          margin: "0 0 4px",
        }}
      >
        My lease
      </h1>
      <p
        style={{ color: "var(--text-muted)", margin: "0 0 24px", fontSize: 14 }}
      >
        Your active tenancy agreement
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: 24,
          alignItems: "start",
        }}
      >
        <div>
          {/* Hero */}
          <div
            className="ph-gradient"
            style={{
              height: 200,
              borderRadius: 14,
              marginBottom: 20,
              display: "flex",
              alignItems: "flex-end",
              padding: 18,
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: leaseStatusColor(lease.status),
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 12px",
                borderRadius: 999,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#fff",
                }}
              />
              {leaseStatusLabel(lease.status)}
            </span>
          </div>

          {/* Stats grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginBottom: 20,
            }}
          >
            {[
              {
                label: "Monthly rent",
                value: `₵${pesewasToGhs(lease.rent_pesewas)}`,
                color: undefined,
              },
              {
                label: "Lease ends",
                value: fmtDate(lease.end_date),
                color: undefined,
              },
              {
                label: "Lease started",
                value: fmtDate(lease.start_date),
                color: "var(--ff-accent-strong)",
              },
              {
                label: "Next due",
                value: fmtDate(lease.next_due_date),
                color: undefined,
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{
                  border: "1px solid var(--ff-border)",
                  borderRadius: 10,
                  background: "var(--bg-surface)",
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginBottom: 4,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: color ?? "var(--text-primary)",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Documents */}
          <div
            style={{
              border: "1px solid var(--ff-border)",
              borderRadius: 12,
              background: "var(--bg-surface)",
              padding: 20,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>
              Documents
            </h3>
            {docs.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px 0",
                  color: "var(--text-muted)",
                  fontSize: 14,
                }}
              >
                No documents attached yet.
              </div>
            ) : (
              docs.map((doc: PropertyDocument) => {
                const done = downloaded.has(doc.id)
                return (
                  <div
                    key={doc.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      border: "1px solid var(--ff-border)",
                      borderRadius: 8,
                      marginBottom: 10,
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width={20}
                      height={20}
                      fill="none"
                      stroke="var(--ff-accent)"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                      <path d="M14 2v6h6" />
                    </svg>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          marginBottom: 2,
                        }}
                      >
                        {doc.title}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          fontSize: 12,
                          color: "var(--text-muted)",
                        }}
                      >
                        <span
                          style={{
                            color: doc.landlordSigned
                              ? "var(--state-success)"
                              : "var(--text-muted)",
                          }}
                        >
                          {doc.landlordSigned
                            ? "✓ Landlord signed"
                            : "Landlord pending"}
                        </span>
                        <span
                          style={{
                            color: doc.tenantSigned
                              ? "var(--state-success)"
                              : "var(--text-muted)",
                          }}
                        >
                          {doc.tenantSigned
                            ? "✓ You signed"
                            : "Your signature pending"}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      {doc.downloadUrl && (
                        <button
                          onClick={() => {
                            handleDownload(doc.id)
                            window.open(doc.downloadUrl!, "_blank")
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            background: "none",
                            border: "none",
                            color: done
                              ? "var(--state-success)"
                              : "var(--ff-accent-strong)",
                            font: "inherit",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {done ? (
                            <>
                              <svg
                                viewBox="0 0 24 24"
                                width={15}
                                height={15}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="m5 12 5 5L20 7" />
                              </svg>
                              Downloaded
                            </>
                          ) : (
                            <>
                              <svg
                                viewBox="0 0 24 24"
                                width={15}
                                height={15}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M12 3v12M7 11l5 5 5-5M5 21h14" />
                              </svg>
                              Download
                            </>
                          )}
                        </button>
                      )}
                      {!doc.tenantSigned && (
                        <button
                          onClick={() => signDoc.mutate(doc.id)}
                          disabled={signDoc.isPending}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            background: "var(--ff-accent)",
                            border: "none",
                            borderRadius: 7,
                            padding: "6px 11px",
                            font: "inherit",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            color: "#fff",
                            opacity: signDoc.isPending ? 0.6 : 1,
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width={12}
                            height={12}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                          Sign
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              border: "1px solid var(--ff-border)",
              borderRadius: 12,
              background: "var(--bg-surface)",
              padding: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "var(--ff-accent)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                }}
              >
                LL
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  Your landlord
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  ID: {lease.landlord_id.slice(0, 8)}…
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowMessages(true)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "var(--bg-subtle)",
                border: "1px solid var(--ff-border)",
                color: "var(--text-primary)",
                borderRadius: 8,
                padding: 11,
                font: "inherit",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width={16}
                height={16}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.9}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z" />
              </svg>
              Message landlord
            </button>
          </div>
          <button
            onClick={actions.navPayments}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "var(--ff-accent)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: 13,
              font: "inherit",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={16}
              height={16}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x={2} y={5} width={20} height={14} rx={2} />
              <path d="M2 10h20" />
            </svg>
            Pay rent
          </button>
          <button
            onClick={actions.navMaint}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "var(--bg-surface)",
              border: "1px solid var(--ff-border)",
              color: "var(--text-primary)",
              borderRadius: 8,
              padding: 13,
              font: "inherit",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={16}
              height={16}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6Z" />
            </svg>
            Request maintenance
          </button>
        </div>
      </div>

      {/* Message drawer */}
      {showMessages && (
        <>
          <div
            onClick={() => setShowMessages(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,.35)",
              zIndex: 40,
            }}
          />
          <div
            style={{
              position: "fixed",
              right: 0,
              top: 0,
              bottom: 0,
              width: 360,
              background: "var(--bg-surface)",
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              boxShadow: "-4px 0 24px rgba(0,0,0,.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "18px 20px",
                borderBottom: "1px solid var(--ff-border)",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "var(--ff-accent)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                LL
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Landlord</div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--state-success)",
                    fontWeight: 600,
                  }}
                >
                  ● Online
                </div>
              </div>
              <button
                onClick={() => setShowMessages(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: 4,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={20}
                  height={20}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: m.from === "tenant" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%",
                      background:
                        m.from === "tenant"
                          ? "var(--ff-accent)"
                          : "var(--bg-subtle)",
                      color:
                        m.from === "tenant" ? "#fff" : "var(--text-primary)",
                      borderRadius:
                        m.from === "tenant"
                          ? "14px 14px 4px 14px"
                          : "14px 14px 14px 4px",
                      padding: "10px 14px",
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    {m.text}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 4,
                    }}
                  >
                    {m.time}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid var(--ff-border)",
                display: "flex",
                gap: 10,
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage()
                }}
                placeholder="Type a message…"
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  border: "1px solid var(--ff-border)",
                  borderRadius: 8,
                  background: "var(--bg-base)",
                  color: "var(--text-primary)",
                  font: "inherit",
                  fontSize: 14,
                  outline: "none",
                }}
              />
              <button
                onClick={sendMessage}
                style={{
                  background: "var(--ff-accent)",
                  border: "none",
                  borderRadius: 8,
                  padding: "0 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={18}
                  height={18}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 2 11 13M22 2 15 22 11 13 2 9l20-7Z" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Payments ──────────────────────────────────────────────────────────────────

export function PaymentsView() {
  const [showPayModal, setShowPayModal] = useState(false)
  const [phone, setPhone] = useState("")
  const [paySubmitState, setPaySubmitState] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle")
  const [payError, setPayError] = useState("")

  const { data: payments, isLoading } = usePayments()
  const { data: leases } = useActiveLeases()
  const { mutate: initiatePayment } = useInitiatePayment()
  const activeLease = leases?.[0]

  const [receipts, setReceipts] = useState<Set<string>>(new Set())

  function handlePaySubmit() {
    if (!activeLease || !phone.trim()) return
    setPaySubmitState("pending")
    setPayError("")
    initiatePayment(
      {
        leaseId: activeLease.id,
        amountPesewas: activeLease.rent_pesewas,
        phoneNumber: phone.trim(),
      },
      {
        onSuccess: () => {
          setPaySubmitState("success")
          setTimeout(() => {
            setShowPayModal(false)
            setPaySubmitState("idle")
            setPhone("")
          }, 2000)
        },
        onError: (err) => {
          setPaySubmitState("error")
          setPayError(err.message)
        },
      }
    )
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 32px 48px" }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "-.02em",
          margin: "0 0 4px",
        }}
      >
        Payments
      </h1>
      <p
        style={{ color: "var(--text-muted)", margin: "0 0 24px", fontSize: 14 }}
      >
        Rent, deposits and receipts — all in cedis.
      </p>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="Next payment"
          value={
            activeLease ? `₵${pesewasToGhs(activeLease.rent_pesewas)}` : "—"
          }
          sub={
            activeLease
              ? `Due ${fmtDate(activeLease.next_due_date)}`
              : "No active lease"
          }
          subColor="var(--state-warn)"
        />
        <StatCard label="Payment method" value="Hubtel" sub="Mobile money" />
        <StatCard
          label="Lease status"
          value={activeLease ? leaseStatusLabel(activeLease.status) : "—"}
          valueColor={
            activeLease ? leaseStatusColor(activeLease.status) : undefined
          }
          sub={activeLease ? `Ends ${fmtDate(activeLease.end_date)}` : ""}
        />
      </div>

      {/* History */}
      <div
        style={{
          border: "1px solid var(--ff-border)",
          borderRadius: 12,
          background: "var(--bg-surface)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--ff-border)",
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
            Payment history
          </h3>
          <button
            onClick={() => setShowPayModal(true)}
            disabled={!activeLease}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--ff-accent)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "9px 14px",
              font: "inherit",
              fontSize: 13,
              fontWeight: 600,
              cursor: activeLease ? "pointer" : "not-allowed",
              opacity: activeLease ? 1 : 0.5,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={15}
              height={15}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Pay rent now
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: 20 }}>
            <LoadingRows count={4} />
          </div>
        ) : !payments || payments.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            No payments yet.
          </div>
        ) : (
          payments.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "15px 20px",
                borderBottom: "1px solid var(--ff-border)",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  background: "var(--bg-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={18}
                  height={18}
                  fill="none"
                  stroke="var(--text-muted)"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x={2} y={5} width={20} height={14} rx={2} />
                  <path d="M2 10h20" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  Rent payment
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {fmtDate(p.created_at)} · Hubtel Mobile Money
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                ₵{pesewasToGhs(p.amount_pesewas)}
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 999,
                  color: "#fff",
                  background: paymentStatusColor(p.status),
                  minWidth: 74,
                  textAlign: "center",
                }}
              >
                {paymentStatusLabel(p.status)}
              </span>
              <button
                onClick={() => setReceipts((prev) => new Set(prev).add(p.id))}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "none",
                  border: "none",
                  color: receipts.has(p.id)
                    ? "var(--state-success)"
                    : "var(--text-muted)",
                  font: "inherit",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {receipts.has(p.id) ? (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      width={14}
                      height={14}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                    Saved
                  </>
                ) : (
                  <>
                    <svg
                      viewBox="0 0 24 24"
                      width={14}
                      height={14}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3v12M7 11l5 5 5-5M5 21h14" />
                    </svg>
                    Receipt
                  </>
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Pay rent modal */}
      {showPayModal && (
        <>
          <div
            onClick={() => {
              setShowPayModal(false)
              setPaySubmitState("idle")
              setPhone("")
            }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,.4)",
              zIndex: 40,
            }}
          />
          <div
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              transform: "translate(-50%,-50%)",
              width: 420,
              background: "var(--bg-surface)",
              borderRadius: 16,
              padding: 28,
              zIndex: 50,
              boxShadow: "0 20px 60px rgba(0,0,0,.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                Pay rent
              </h2>
              <button
                onClick={() => {
                  setShowPayModal(false)
                  setPaySubmitState("idle")
                  setPhone("")
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={20}
                  height={20}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            {activeLease && (
              <div
                style={{
                  background: "var(--bg-subtle)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 20,
                  fontSize: 13,
                  color: "var(--text-muted)",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    fontSize: 14,
                    marginBottom: 4,
                  }}
                >
                  ₵{pesewasToGhs(activeLease.rent_pesewas)} due{" "}
                  {fmtDate(activeLease.next_due_date)}
                </div>
                Lease ID: {activeLease.id.slice(0, 8)}…
              </div>
            )}

            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Mobile money number
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0244000000"
              disabled={
                paySubmitState === "pending" || paySubmitState === "success"
              }
              style={{ ...inputStyle, marginBottom: 20 }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 15,
                fontWeight: 700,
                marginBottom: 20,
                padding: "14px 0",
                borderTop: "1px solid var(--ff-border)",
                borderBottom: "1px solid var(--ff-border)",
              }}
            >
              <span>Total due</span>
              <span style={{ color: "var(--ff-accent-strong)" }}>
                ₵{activeLease ? pesewasToGhs(activeLease.rent_pesewas) : "—"}
              </span>
            </div>

            {paySubmitState === "error" && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "#fef2f2",
                  color: "var(--state-error)",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 14,
                }}
              >
                {payError || "Payment failed. Please try again."}
              </div>
            )}

            {paySubmitState === "success" && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "var(--ff-accent-soft)",
                  color: "var(--ff-accent-strong)",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 14,
                }}
              >
                Payment initiated! Check your phone to complete the Hubtel
                prompt.
              </div>
            )}

            <button
              onClick={handlePaySubmit}
              disabled={
                !phone.trim() ||
                paySubmitState === "pending" ||
                paySubmitState === "success"
              }
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "var(--ff-accent)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: 14,
                font: "inherit",
                fontSize: 15,
                fontWeight: 700,
                cursor:
                  !phone.trim() || paySubmitState !== "idle"
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  !phone.trim() || paySubmitState === "pending" ? 0.6 : 1,
              }}
            >
              {paySubmitState === "pending"
                ? "Processing…"
                : paySubmitState === "success"
                  ? "Initiated ✓"
                  : `Confirm payment · ₵${activeLease ? pesewasToGhs(activeLease.rent_pesewas) : "—"}`}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  valueColor,
  sub,
  subColor,
}: {
  label: string
  value: string
  valueColor?: string
  sub: string
  subColor?: string
}) {
  return (
    <div
      style={{
        border: "1px solid var(--ff-border)",
        borderRadius: 12,
        background: "var(--bg-surface)",
        padding: 18,
      }}
    >
      <div
        style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: valueColor ?? "var(--text-primary)",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          marginTop: 4,
          color: subColor ?? "var(--text-muted)",
        }}
      >
        {sub}
      </div>
    </div>
  )
}

// ── Maintenance ───────────────────────────────────────────────────────────────

const TICKET_CATEGORIES = [
  "electrical",
  "plumbing",
  "appliance",
  "structural",
  "other",
]

export function MaintenanceView() {
  const [showForm, setShowForm] = useState(false)
  const [formTitle, setFormTitle] = useState("")
  const [formCategory, setFormCategory] = useState("electrical")
  const [formDesc, setFormDesc] = useState("")
  const [formState, setFormState] = useState<
    "idle" | "pending" | "success" | "error"
  >("idle")
  const [formError, setFormError] = useState("")

  const { data: tickets, isLoading } = useMaintenanceTickets()
  const { data: leases } = useActiveLeases()
  const { mutate: createTicket } = useCreateMaintenanceTicket()
  const activeLease = leases?.[0]

  function handleSubmit() {
    if (!formTitle.trim() || !activeLease) return
    setFormState("pending")
    setFormError("")
    createTicket(
      {
        property_id: activeLease.property_id,
        lease_id: activeLease.id,
        title: formTitle.trim(),
        category: formCategory,
        description: formDesc.trim() || undefined,
      },
      {
        onSuccess: () => {
          setFormState("success")
          setTimeout(() => {
            setShowForm(false)
            setFormState("idle")
            setFormTitle("")
            setFormCategory("electrical")
            setFormDesc("")
          }, 1800)
        },
        onError: (err) => {
          setFormState("error")
          setFormError(err.message)
        },
      }
    )
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 32px 48px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-.02em",
              margin: "0 0 4px",
            }}
          >
            Maintenance
          </h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 14 }}>
            Log issues and we&apos;ll route them to a verified artisan.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={!activeLease}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "var(--ff-accent)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "11px 16px",
            font: "inherit",
            fontSize: 14,
            fontWeight: 600,
            cursor: activeLease ? "pointer" : "not-allowed",
            opacity: activeLease ? 1 : 0.5,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width={16}
            height={16}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New request
        </button>
      </div>

      {isLoading ? (
        <LoadingRows count={3} />
      ) : !tickets || tickets.length === 0 ? (
        <div
          style={{
            border: "1px solid var(--ff-border)",
            borderRadius: 12,
            background: "var(--bg-surface)",
            padding: 40,
            textAlign: "center",
          }}
        >
          <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
            No maintenance tickets yet.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tickets.map((t) => (
            <div
              key={t.id}
              style={{
                border: "1px solid var(--ff-border)",
                borderRadius: 12,
                background: "var(--bg-surface)",
                padding: 18,
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: "var(--ff-accent-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={20}
                  height={20}
                  fill="none"
                  stroke="var(--ff-accent-strong)"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6Z" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{t.title}</div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  {t.category} · {fmtDate(t.created_at)} ·{" "}
                  {t.artisan_name ? t.artisan_name : "Unassigned"}
                </div>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "5px 12px",
                  borderRadius: 999,
                  color: "#fff",
                  background: ticketStatusColor(t.status),
                }}
              >
                {ticketStatusLabel(t.status)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* New request modal */}
      {showForm && (
        <>
          <div
            onClick={() => {
              setShowForm(false)
              setFormState("idle")
            }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,.4)",
              zIndex: 40,
            }}
          />
          <div
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              transform: "translate(-50%,-50%)",
              width: 460,
              background: "var(--bg-surface)",
              borderRadius: 16,
              padding: 28,
              zIndex: 50,
              boxShadow: "0 20px 60px rgba(0,0,0,.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                New maintenance request
              </h2>
              <button
                onClick={() => {
                  setShowForm(false)
                  setFormState("idle")
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={20}
                  height={20}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Title *
            </label>
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Leaking kitchen tap"
              disabled={formState === "pending" || formState === "success"}
              style={inputStyle}
            />

            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Category
            </label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              disabled={formState === "pending" || formState === "success"}
              style={
                { ...inputStyle, appearance: "auto" } as React.CSSProperties
              }
            >
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>

            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Description (optional)
            </label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Describe the issue in detail…"
              disabled={formState === "pending" || formState === "success"}
              style={
                {
                  ...inputStyle,
                  minHeight: 80,
                  resize: "vertical",
                } as React.CSSProperties
              }
            />

            {formState === "error" && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "#fef2f2",
                  color: "var(--state-error)",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 14,
                }}
              >
                {formError || "Failed to submit. Please try again."}
              </div>
            )}

            {formState === "success" && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "var(--ff-accent-soft)",
                  color: "var(--ff-accent-strong)",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 14,
                }}
              >
                Ticket submitted! We&apos;ll assign a verified artisan shortly.
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={
                !formTitle.trim() ||
                formState === "pending" ||
                formState === "success"
              }
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "var(--ff-accent)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: 14,
                font: "inherit",
                fontSize: 15,
                fontWeight: 700,
                cursor:
                  !formTitle.trim() || formState !== "idle"
                    ? "not-allowed"
                    : "pointer",
                opacity: !formTitle.trim() || formState === "pending" ? 0.6 : 1,
              }}
            >
              {formState === "pending" ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Marketplace ───────────────────────────────────────────────────────────────

export function MarketplaceView() {
  const { actions } = useApp()
  const [selectedSpecialty, setSelectedSpecialty] = useState<
    string | undefined
  >(undefined)
  const { data: allProviders } = useServiceProviders()
  const { data: providers, isLoading } = useServiceProviders(selectedSpecialty)
  const artisans = (providers ?? []).map(serviceProviderToArtisan)

  const specialties = Array.from(
    new Set(
      (allProviders ?? [])
        .map((p) => p.specialty)
        .filter((s): s is string => !!s)
    )
  ).sort()

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 32px 48px" }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "-.02em",
          margin: "0 0 4px",
        }}
      >
        Verified artisan marketplace
      </h1>
      <p
        style={{ color: "var(--text-muted)", margin: "0 0 22px", fontSize: 14 }}
      >
        Background-checked plumbers, electricians, painters & more — hired
        directly.
      </p>

      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}
      >
        <button
          onClick={() => setSelectedSpecialty(undefined)}
          style={{
            background:
              selectedSpecialty === undefined
                ? "var(--ff-accent)"
                : "var(--bg-surface)",
            color:
              selectedSpecialty === undefined ? "#fff" : "var(--text-primary)",
            border:
              selectedSpecialty === undefined
                ? "none"
                : "1px solid var(--ff-border)",
            borderRadius: 999,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            font: "inherit",
            cursor: "pointer",
          }}
        >
          All trades
        </button>
        {specialties.map((s) => (
          <button
            key={s}
            onClick={() => setSelectedSpecialty(s)}
            style={{
              background:
                selectedSpecialty === s
                  ? "var(--ff-accent)"
                  : "var(--bg-surface)",
              color: selectedSpecialty === s ? "#fff" : "var(--text-primary)",
              border:
                selectedSpecialty === s ? "none" : "1px solid var(--ff-border)",
              borderRadius: 999,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              font: "inherit",
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="ph-gradient"
              style={{ height: 200, borderRadius: 12 }}
            />
          ))}
        </div>
      ) : artisans.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {artisans.map((a) => (
            <ArtisanCard
              key={a.id}
              artisan={a}
              onHire={() => actions.selectArtisan(a)}
            />
          ))}
        </div>
      ) : selectedSpecialty ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 0",
            color: "var(--text-muted)",
            fontSize: 14,
          }}
        >
          No artisans with this specialty yet.{" "}
          <button
            onClick={() => setSelectedSpecialty(undefined)}
            style={{
              background: "none",
              border: "none",
              color: "var(--ff-accent)",
              cursor: "pointer",
              font: "inherit",
              padding: 0,
            }}
          >
            View all trades
          </button>
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "48px 0",
            color: "var(--text-muted)",
            fontSize: 14,
          }}
        >
          No verified artisans available yet.
        </div>
      )}
    </div>
  )
}

function ArtisanCard({
  artisan: a,
  onHire,
}: {
  artisan: Artisan
  onHire: () => void
}) {
  return (
    <div
      style={{
        border: "1px solid var(--ff-border)",
        borderRadius: 12,
        background: "var(--bg-surface)",
        padding: 18,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "var(--ff-accent)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
          }}
        >
          {a.initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{a.name}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {a.trade}
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            color: "var(--state-warn)",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width={14}
            height={14}
            fill="currentColor"
            stroke="none"
          >
            <path d="m12 3 2.6 5.5 6 .9-4.3 4.2 1 6L12 17.8 6.7 19.6l1-6L3.4 9.4l6-.9Z" />
          </svg>
          {a.rating}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          · {a.jobs}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: 12,
          color: "var(--text-muted)",
          marginBottom: 6,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={13}
          height={13}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11Z" />
          <circle cx={12} cy={10} r={2.5} />
        </svg>
        {a.area}
      </div>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          alignSelf: "flex-start",
          background: "var(--ff-accent-soft)",
          color: "var(--ff-accent-strong)",
          fontSize: 11,
          fontWeight: 700,
          padding: "3px 8px",
          borderRadius: 6,
          marginBottom: 14,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={11}
          height={11}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        Background-checked
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "auto",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700 }}>{a.rate}</span>
        <button
          onClick={onHire}
          style={{
            background: "var(--ff-accent)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            font: "inherit",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Hire
        </button>
      </div>
    </div>
  )
}

// ── Service Request ───────────────────────────────────────────────────────────

export function ServiceRequestView() {
  const { state, actions } = useApp()
  const artisan = state.selectedArtisan
  const artisanName = artisan?.name ?? "Kofi Plumbing Co."
  const artisanRating = artisan?.rating ?? "4.9"

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [scheduledFor, setScheduledFor] = useState("")
  const createBooking = useCreateServiceBooking()

  function handleSubmit() {
    if (!artisan || !title.trim()) return
    createBooking.mutate(
      {
        provider_id: artisan.id,
        title: title.trim(),
        category: artisan.trade,
        description: description.trim() || undefined,
        scheduled_for: scheduledFor || undefined,
      },
      { onSuccess: () => actions.backToMarket() }
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 32px 48px" }}>
      <button
        onClick={actions.backToMarket}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          color: "var(--text-muted)",
          font: "inherit",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: 16,
          padding: 0,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={16}
          height={16}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 6-6 6 6 6" />
        </svg>
        Back to marketplace
      </button>

      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "-.02em",
          margin: "0 0 4px",
        }}
      >
        Request a service
      </h1>
      <p
        style={{ color: "var(--text-muted)", margin: "0 0 22px", fontSize: 14 }}
      >
        Hiring{" "}
        <strong style={{ color: "var(--text-primary)" }}>{artisanName}</strong>{" "}
        · ⭐ {artisanRating} · Background-checked
      </p>

      <div
        style={{
          border: "1px solid var(--ff-border)",
          borderRadius: 12,
          background: "var(--bg-surface)",
          padding: 22,
          marginBottom: 18,
        }}
      >
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          What do you need done?
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Fix leaking kitchen tap"
          style={inputStyle}
        />

        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Describe the issue
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the problem in detail…"
          style={
            {
              ...inputStyle,
              minHeight: 90,
              resize: "vertical",
            } as React.CSSProperties
          }
        />

        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Preferred date (optional)
        </label>
        <input
          type="date"
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
          style={{ ...inputStyle, marginBottom: 0 }}
        />
      </div>

      {createBooking.isError && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            borderRadius: 10,
            background: "var(--state-error-soft, #fee2e2)",
            color: "var(--state-error, #ef4444)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Something went wrong sending your request. Please try again.
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: "1px solid var(--ff-border)",
          borderRadius: 12,
          background: "var(--bg-surface)",
          padding: 18,
          marginBottom: 18,
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Pricing
          </div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            {artisanName} will quote a price once they review your request
          </div>
        </div>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            color: "var(--text-muted)",
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width={14}
            height={14}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x={4} y={11} width={16} height={10} rx={2} />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          No payment yet
        </span>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!artisan || !title.trim() || createBooking.isPending}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          background: "var(--ff-accent)",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: 14,
          font: "inherit",
          fontSize: 15,
          fontWeight: 700,
          cursor:
            !artisan || !title.trim() || createBooking.isPending
              ? "not-allowed"
              : "pointer",
          opacity:
            !artisan || !title.trim() || createBooking.isPending ? 0.6 : 1,
        }}
      >
        {createBooking.isPending
          ? "Sending…"
          : `Send request to ${artisanName}`}
      </button>
    </div>
  )
}

// ── Service Provider: incoming bookings ───────────────────────────────────────

const BOOKING_STATUS_LABEL: Record<string, string> = {
  requested: "New request",
  accepted: "Accepted",
  declined: "Declined",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
}

const BOOKING_STATUS_COLOR: Record<string, string> = {
  requested: "var(--state-warn, #D97706)",
  accepted: "var(--ff-accent)",
  declined: "var(--state-error)",
  in_progress: "var(--ff-accent)",
  completed: "var(--state-success)",
  cancelled: "var(--text-muted)",
}

function BookingStatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0,
        background: BOOKING_STATUS_COLOR[status] ?? "var(--text-muted)",
        color: "#fff",
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 10px",
        borderRadius: 999,
      }}
    >
      {BOOKING_STATUS_LABEL[status] ?? status}
    </span>
  )
}

export function ProviderBookingsView() {
  const { data: bookings, isLoading } = useServiceBookings()
  const respondMutation = useRespondToServiceBooking()
  const statusMutation = useUpdateServiceBookingStatus()
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({})

  function handleAccept(bookingId: string) {
    const ghs = parseFloat(priceDrafts[bookingId] ?? "")
    if (!ghs || ghs <= 0) return
    respondMutation.mutate({
      bookingId,
      accept: true,
      agreedPricePesewas: Math.round(ghs * 100),
    })
  }

  function handleDecline(bookingId: string) {
    respondMutation.mutate({ bookingId, accept: false })
  }

  function handleStart(bookingId: string) {
    statusMutation.mutate({ bookingId, status: "in_progress" })
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "28px 32px 48px" }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "-.02em",
          margin: "0 0 4px",
        }}
      >
        My service requests
      </h1>
      <p
        style={{ color: "var(--text-muted)", margin: "0 0 22px", fontSize: 14 }}
      >
        Requests from tenants and landlords looking to hire you.
      </p>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="ph-gradient"
              style={{ height: 90, borderRadius: 12 }}
            />
          ))}
        </div>
      ) : (bookings ?? []).length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(bookings ?? []).map((b) => (
            <div
              key={b.id}
              style={{
                border: "1px solid var(--ff-border)",
                borderRadius: 12,
                background: "var(--bg-surface)",
                padding: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{b.title}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    {b.category} · Requested by {b.requester_name ?? "—"}
                    {b.scheduled_for && ` · ${fmtDate(b.scheduled_for)}`}
                  </div>
                  {b.description && (
                    <div
                      style={{
                        fontSize: 13,
                        marginTop: 8,
                        color: "var(--text-primary)",
                      }}
                    >
                      {b.description}
                    </div>
                  )}
                </div>
                <BookingStatusBadge status={b.status} />
              </div>

              {b.status === "requested" && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 14,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="number"
                    min={1}
                    placeholder="Quote price (₵)"
                    value={priceDrafts[b.id] ?? ""}
                    onChange={(e) =>
                      setPriceDrafts((d) => ({ ...d, [b.id]: e.target.value }))
                    }
                    style={{ ...inputStyle, marginBottom: 0, width: 140 }}
                  />
                  <button
                    onClick={() => handleAccept(b.id)}
                    disabled={respondMutation.isPending || !priceDrafts[b.id]}
                    style={{
                      padding: "10px 16px",
                      background: "var(--ff-accent)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      font: "inherit",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      opacity:
                        respondMutation.isPending || !priceDrafts[b.id]
                          ? 0.6
                          : 1,
                    }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(b.id)}
                    disabled={respondMutation.isPending}
                    style={{
                      padding: "10px 16px",
                      background: "var(--bg-base)",
                      color: "var(--text-primary)",
                      border: "1px solid var(--ff-border)",
                      borderRadius: 8,
                      font: "inherit",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Decline
                  </button>
                </div>
              )}

              {b.status === "accepted" && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 14,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    Agreed price: ₵
                    {b.agreed_price_pesewas != null
                      ? pesewasToGhs(b.agreed_price_pesewas)
                      : "—"}
                  </span>
                  <button
                    onClick={() => handleStart(b.id)}
                    disabled={statusMutation.isPending}
                    style={{
                      padding: "10px 16px",
                      background: "var(--ff-accent)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      font: "inherit",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      opacity: statusMutation.isPending ? 0.6 : 1,
                    }}
                  >
                    Start job
                  </button>
                </div>
              )}

              {b.status === "in_progress" && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginTop: 14,
                  }}
                >
                  Waiting for {b.requester_name ?? "the requester"} to confirm
                  completion.
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "48px 0",
            color: "var(--text-muted)",
            fontSize: 14,
          }}
        >
          No service requests yet.
        </div>
      )}
    </div>
  )
}

// ── Requester: my sent service requests ───────────────────────────────────────

export function MyServiceRequestsView() {
  const { data: bookings, isLoading } = useServiceBookings()
  const payMutation = usePayForServiceBooking()
  const statusMutation = useUpdateServiceBookingStatus()
  const [phoneDrafts, setPhoneDrafts] = useState<Record<string, string>>({})
  const [payingId, setPayingId] = useState<string | null>(null)

  function handlePay(bookingId: string) {
    const phone = phoneDrafts[bookingId]?.trim()
    if (!phone) return
    payMutation.mutate(
      { bookingId, phoneNumber: phone },
      { onSuccess: () => setPayingId(null) }
    )
  }

  function handleComplete(bookingId: string) {
    statusMutation.mutate({ bookingId, status: "completed" })
  }

  function handleCancel(bookingId: string) {
    statusMutation.mutate({ bookingId, status: "cancelled" })
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "28px 32px 48px" }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "-.02em",
          margin: "0 0 4px",
        }}
      >
        My service requests
      </h1>
      <p
        style={{ color: "var(--text-muted)", margin: "0 0 22px", fontSize: 14 }}
      >
        Track the providers you've hired through the marketplace.
      </p>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="ph-gradient"
              style={{ height: 90, borderRadius: 12 }}
            />
          ))}
        </div>
      ) : (bookings ?? []).length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(bookings ?? []).map((b) => (
            <div
              key={b.id}
              style={{
                border: "1px solid var(--ff-border)",
                borderRadius: 12,
                background: "var(--bg-surface)",
                padding: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{b.title}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    {b.category} · {b.provider_name ?? "Provider"}
                    {b.scheduled_for && ` · ${fmtDate(b.scheduled_for)}`}
                  </div>
                </div>
                <BookingStatusBadge status={b.status} />
              </div>

              {b.status === "requested" && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginTop: 14,
                  }}
                >
                  Waiting for {b.provider_name ?? "the provider"} to respond.{" "}
                  <button
                    onClick={() => handleCancel(b.id)}
                    disabled={statusMutation.isPending}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--state-error)",
                      cursor: "pointer",
                      font: "inherit",
                      fontSize: 12,
                      fontWeight: 600,
                      padding: 0,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {b.status === "accepted" && (
                <div style={{ marginTop: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: payingId === b.id ? 10 : 0,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      Agreed price: ₵
                      {b.agreed_price_pesewas != null
                        ? pesewasToGhs(b.agreed_price_pesewas)
                        : "—"}
                    </span>
                    {payingId !== b.id && (
                      <button
                        onClick={() => setPayingId(b.id)}
                        style={{
                          padding: "10px 16px",
                          background: "var(--ff-accent)",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          font: "inherit",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Pay now
                      </button>
                    )}
                  </div>
                  {payingId === b.id && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="tel"
                        placeholder="Mobile money number"
                        value={phoneDrafts[b.id] ?? ""}
                        onChange={(e) =>
                          setPhoneDrafts((d) => ({
                            ...d,
                            [b.id]: e.target.value,
                          }))
                        }
                        style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                      />
                      <button
                        onClick={() => handlePay(b.id)}
                        disabled={payMutation.isPending || !phoneDrafts[b.id]}
                        style={{
                          padding: "10px 16px",
                          background: "var(--ff-accent)",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          font: "inherit",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          opacity:
                            payMutation.isPending || !phoneDrafts[b.id]
                              ? 0.6
                              : 1,
                        }}
                      >
                        {payMutation.isPending ? "Paying…" : "Confirm"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {b.status === "in_progress" && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 14,
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Job in progress.
                  </span>
                  <button
                    onClick={() => handleComplete(b.id)}
                    disabled={statusMutation.isPending}
                    style={{
                      padding: "10px 16px",
                      background: "var(--ff-accent)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      font: "inherit",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      opacity: statusMutation.isPending ? 0.6 : 1,
                    }}
                  >
                    Mark complete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "48px 0",
            color: "var(--text-muted)",
            fontSize: 14,
          }}
        >
          No service requests yet. Visit the marketplace to hire a provider.
        </div>
      )}
    </div>
  )
}

// ── Application Tracking ──────────────────────────────────────────────────────

type TrackStep = "done" | "active" | "pending"

interface TimelineStep {
  label: string
}

const TRACK_STEPS: TimelineStep[] = [
  { label: "Application submitted" },
  { label: "Background checks" },
  { label: "Agreement signing" },
  { label: "Escrow payment" },
  { label: "Move-in confirmed" },
]

function stepIndexForStatus(status: string): number {
  if (status === "Under review") return 1
  if (status === "Awaiting sign") return 2
  if (status === "Active lease") return 5
  return 0
}

export function AppTrackingView() {
  const { state, actions } = useApp()
  const app = state.selectedApp
  if (!app) return null

  const activeStep = stepIndexForStatus(app.status)

  function getStepStatus(i: number): TrackStep {
    if (i < activeStep) return "done"
    if (i === activeStep) return "active"
    return "pending"
  }

  const stepDates: Record<number, string> = {
    0: app.date.replace("Applied ", ""),
  }
  if (activeStep >= 2) stepDates[1] = "22 Jun 2026"
  if (activeStep >= 3) stepDates[2] = "23 Jun 2026"

  const bgChecks = [
    { label: "Ghana Card verified", done: true },
    { label: "Employment confirmed", done: activeStep >= 2 },
    { label: "No criminal record", done: activeStep >= 2 },
    { label: "Credit check passed", done: activeStep >= 2 },
  ]

  const landlordChecks = [
    { label: "Ghana Card verified", done: true },
    { label: "Property title confirmed", done: activeStep >= 2 },
    { label: "No fraud reports", done: activeStep >= 2 },
    { label: "Tax clearance", done: activeStep >= 2 },
  ]

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 32px 48px" }}>
      <button
        onClick={actions.navApps}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          color: "var(--text-muted)",
          font: "inherit",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: 20,
          padding: 0,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={16}
          height={16}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 6-6 6 6 6" />
        </svg>
        Back to applications
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-.02em",
              margin: "0 0 4px",
            }}
          >
            {app.property}
          </h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 14 }}>
            {app.area} · {app.price} · Landlord {app.landlord}
          </p>
        </div>
        <span
          style={{
            flexShrink: 0,
            fontSize: 12,
            fontWeight: 700,
            padding: "6px 14px",
            borderRadius: 999,
            color: "#fff",
            background: app.statusColor,
          }}
        >
          {app.status}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: 24,
          alignItems: "start",
        }}
      >
        <div>
          <div
            style={{
              border: "1px solid var(--ff-border)",
              borderRadius: 14,
              background: "var(--bg-surface)",
              padding: "24px 28px",
              marginBottom: 20,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 22px" }}>
              Application progress
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {TRACK_STEPS.map((step, i) => {
                const status = getStepStatus(i)
                const isLast = i === TRACK_STEPS.length - 1
                return (
                  <div key={step.label} style={{ display: "flex", gap: 16 }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          background:
                            status === "done"
                              ? "var(--state-success)"
                              : status === "active"
                                ? "var(--ff-accent)"
                                : "var(--bg-subtle)",
                          border:
                            status === "pending"
                              ? "2px solid var(--ff-border)"
                              : "none",
                        }}
                      >
                        {status === "done" ? (
                          <svg
                            viewBox="0 0 24 24"
                            width={15}
                            height={15}
                            fill="none"
                            stroke="#fff"
                            strokeWidth={3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m5 12 5 5L20 7" />
                          </svg>
                        ) : status === "active" ? (
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: "#fff",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "var(--ff-border)",
                            }}
                          />
                        )}
                      </div>
                      {!isLast && (
                        <div
                          style={{
                            width: 2,
                            flex: 1,
                            minHeight: 28,
                            background:
                              status === "done"
                                ? "var(--state-success)"
                                : "var(--ff-border)",
                            margin: "4px 0",
                          }}
                        />
                      )}
                    </div>
                    <div
                      style={{ paddingBottom: isLast ? 0 : 24, paddingTop: 4 }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: status === "active" ? 700 : 600,
                          color:
                            status === "pending"
                              ? "var(--text-muted)"
                              : "var(--text-primary)",
                        }}
                      >
                        {step.label}
                        {status === "active" && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 11,
                              fontWeight: 700,
                              background: app.statusColor,
                              color: "#fff",
                              padding: "2px 8px",
                              borderRadius: 999,
                            }}
                          >
                            In progress
                          </span>
                        )}
                      </div>
                      {stepDates[i] && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            marginTop: 2,
                          }}
                        >
                          {stepDates[i]}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {activeStep === 1 && (
            <div
              style={{
                border: "1px solid var(--ff-border)",
                borderRadius: 14,
                background: "var(--bg-surface)",
                padding: 22,
              }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>
                Background checks in progress
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
                <CheckGroup title="Your checks" checks={bgChecks} />
                <CheckGroup
                  title={`${app.landlord}'s checks`}
                  checks={landlordChecks}
                />
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div
              style={{
                border: "1px solid var(--ff-border)",
                borderRadius: 14,
                background: "var(--bg-surface)",
                padding: 22,
              }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>
                Ready to sign
              </h3>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: 13,
                  margin: "0 0 18px",
                  lineHeight: 1.55,
                }}
              >
                Both background checks passed. Review and sign to proceed to
                payment.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                  marginBottom: 20,
                }}
              >
                <CheckGroup
                  title="Your checks"
                  checks={bgChecks.map((c) => ({ ...c, done: true }))}
                />
                <CheckGroup
                  title={`${app.landlord}'s checks`}
                  checks={landlordChecks.map((c) => ({ ...c, done: true }))}
                />
              </div>
              <button
                onClick={actions.goSign}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: "var(--ff-accent)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: 14,
                  font: "inherit",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={17}
                  height={17}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
                </svg>
                Review & sign agreement
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            className="ph-gradient"
            style={{
              height: 140,
              borderRadius: 12,
              display: "flex",
              alignItems: "flex-end",
              padding: 14,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              {app.property}
            </span>
          </div>
          <div
            style={{
              border: "1px solid var(--ff-border)",
              borderRadius: 12,
              background: "var(--bg-surface)",
              padding: 18,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
              {app.property}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                fontSize: 13,
              }}
            >
              <Row label="Area" value={app.area} />
              <Row label="Rent" value={app.price} />
              <Row label="Landlord" value={app.landlord} />
              <Row label="Applied" value={app.date.replace("Applied ", "")} />
            </div>
          </div>
          <div
            style={{
              border: "1px solid var(--ff-border)",
              borderRadius: 12,
              background: "var(--bg-surface)",
              padding: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width={16}
                height={16}
                fill="none"
                stroke="var(--ff-accent-strong)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              </svg>
              Background check
            </div>
            <div
              style={{ marginTop: 8, fontSize: 13, color: "var(--text-muted)" }}
            >
              {app.bg}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckGroup({
  title,
  checks,
}: {
  title: string
  checks: { label: string; done: boolean }[]
}) {
  return (
    <div
      style={{
        border: "1px solid var(--ff-border)",
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "var(--text-muted)",
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: ".05em",
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {checks.map((c) => (
          <div
            key={c.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
            }}
          >
            {c.done ? (
              <svg
                viewBox="0 0 24 24"
                width={15}
                height={15}
                fill="none"
                stroke="var(--state-success)"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m5 12 5 5L20 7" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                width={15}
                height={15}
                fill="none"
                stroke="var(--ff-border)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx={12} cy={12} r={9} />
              </svg>
            )}
            <span
              style={{
                color: c.done ? "var(--text-primary)" : "var(--text-muted)",
              }}
            >
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid var(--ff-border)",
  borderRadius: 8,
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  font: "inherit",
  fontSize: 14,
  outline: "none",
  marginBottom: 16,
  boxSizing: "border-box",
}

// ── Profile View ──────────────────────────────────────────────────────────────

function roleLabel(role: string): string {
  if (role === "landlord") return "Landlord"
  if (role === "service_provider") return "Service Provider"
  if (role === "admin") return "Admin"
  return "Tenant"
}

function roleBadgeColor(role: string): string {
  if (role === "landlord") return "#7c3aed"
  if (role === "admin") return "#dc2626"
  return "var(--ff-accent)"
}

function fmtMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  })
}

export function ProfileView() {
  const { state, actions } = useApp()
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editSpecialty, setEditSpecialty] = useState("")

  useEffect(() => {
    getProfile().then((p) => setProfile(p))
  }, [])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 2800)
  }

  function startEditing() {
    setEditName(profile?.name ?? "")
    setEditPhone(profile?.phone ?? "")
    setEditSpecialty(profile?.specialty ?? "")
    setEditing(true)
  }

  async function submitProfile(
    prev: UpdateProfileState | null,
    formData: FormData
  ): Promise<UpdateProfileState> {
    const result = await updateProfile(prev, formData)
    if (result.success) {
      setProfile((p) =>
        p
          ? {
              ...p,
              name: result.name ?? p.name,
              phone: result.phone ?? null,
              specialty: result.specialty ?? null,
            }
          : p
      )
      await updateSession({ name: result.name })
      router.refresh()
      setEditing(false)
      showToast("Profile updated")
    }
    return result
  }

  const [updateState, updateFormAction, updatePending] = useActionState(
    submitProfile,
    null
  )

  const name = profile?.name ?? session?.user?.name ?? "—"
  const email = profile?.email ?? session?.user?.email ?? "—"
  const phone = profile?.phone ?? "—"
  const role = profile?.role ?? state.role
  const idVerified = profile?.idVerified ?? false
  const specialty = profile?.specialty ?? "—"
  const memberSince = profile ? fmtMemberSince(profile.createdAt) : "—"

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("")

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px" }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#111827",
            color: "#fff",
            borderRadius: 8,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 600,
            zIndex: 100,
            boxShadow: "0 4px 16px rgba(0,0,0,.18)",
          }}
        >
          {toast}
        </div>
      )}

      {/* Avatar + name */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "var(--ff-accent)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials || "?"}
        </div>
        <div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-.02em",
              marginBottom: 6,
            }}
          >
            {name}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: roleBadgeColor(role),
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 999,
              }}
            >
              {roleLabel(role)}
            </span>
            {role === "tenant" && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: idVerified
                    ? "var(--state-success)"
                    : "var(--state-warn, #D97706)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 999,
                }}
              >
                {idVerified ? "✓ KYC Verified" : "KYC Pending"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info card / edit form */}
      {editing ? (
        <form
          action={updateFormAction}
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--ff-border)",
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Full name
          </label>
          <input
            name="name"
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            style={inputStyle}
            required
            maxLength={120}
          />

          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Phone
          </label>
          <input
            name="phone"
            type="tel"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            placeholder="+233…"
            style={{
              ...inputStyle,
              marginBottom: updateState?.fieldErrors?.phone ? 6 : 16,
            }}
          />
          {updateState?.fieldErrors?.phone && (
            <div
              style={{
                color: "var(--state-error)",
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              {updateState.fieldErrors.phone}
            </div>
          )}

          {role === "service_provider" && (
            <>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                Specialty / trade
              </label>
              <input
                name="specialty"
                type="text"
                value={editSpecialty}
                onChange={(e) => setEditSpecialty(e.target.value)}
                placeholder="e.g. Plumber"
                style={inputStyle}
                maxLength={80}
              />
            </>
          )}

          {updateState?.error && (
            <div
              style={{
                color: "var(--state-error)",
                fontSize: 13,
                marginBottom: 14,
                padding: "8px 12px",
                background: "rgba(220,38,38,.08)",
                borderRadius: 8,
              }}
            >
              {updateState.error}
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="submit"
              disabled={updatePending}
              style={{
                flex: 1,
                padding: "12px 20px",
                background: "var(--ff-accent)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                font: "inherit",
                opacity: updatePending ? 0.6 : 1,
              }}
            >
              {updatePending ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              style={{
                padding: "12px 20px",
                background: "var(--bg-base)",
                border: "1px solid var(--ff-border)",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                font: "inherit",
                color: "var(--text-primary)",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--ff-border)",
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--ff-border)",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Account details
            </span>
          </div>
          <div style={{ padding: "8px 0" }}>
            <ProfileRow icon="mail" label="Email" value={email} />
            <ProfileRow icon="phone" label="Phone" value={phone} />
            {role === "service_provider" && (
              <ProfileRow
                icon="briefcase"
                label="Specialty"
                value={specialty}
              />
            )}
            <ProfileRow
              icon="calendar"
              label="Member since"
              value={memberSince}
            />
          </div>
        </div>
      )}

      {/* KYC link for tenants */}
      {role === "tenant" && !idVerified && (
        <button
          onClick={actions.navKyc}
          style={{
            width: "100%",
            padding: "14px 20px",
            background: "var(--ff-accent-soft)",
            border: "1px solid var(--ff-border)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
            font: "inherit",
            color: "var(--text-primary)",
            marginBottom: 20,
            textAlign: "left",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: "var(--ff-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={18}
              height={18}
              fill="none"
              stroke="#fff"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
              Complete identity verification
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Verify your Ghana Card to unlock all rental features
            </div>
          </div>
          <svg
            style={{ marginLeft: "auto", flexShrink: 0 }}
            viewBox="0 0 24 24"
            width={16}
            height={16}
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {!editing && (
          <button
            onClick={startEditing}
            style={{
              padding: "12px 20px",
              background: "var(--bg-surface)",
              border: "1px solid var(--ff-border)",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              font: "inherit",
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={16}
              height={16}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
            </svg>
            Edit profile
          </button>
        )}
        <button
          onClick={() => {
            logout()
            actions.signOut()
          }}
          style={{
            padding: "12px 20px",
            background: "var(--bg-surface)",
            border: "1px solid var(--ff-border)",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            font: "inherit",
            color: "var(--state-error)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width={16}
            height={16}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  )
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: "mail" | "phone" | "calendar" | "briefcase"
  label: string
  value: string
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 20px",
        borderBottom: "1px solid var(--ff-border)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "var(--bg-subtle, var(--bg-base))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon === "mail" && (
          <svg
            viewBox="0 0 24 24"
            width={15}
            height={15}
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x={2} y={4} width={20} height={16} rx={2} />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        )}
        {icon === "phone" && (
          <svg
            viewBox="0 0 24 24"
            width={15}
            height={15}
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
          </svg>
        )}
        {icon === "calendar" && (
          <svg
            viewBox="0 0 24 24"
            width={15}
            height={15}
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x={3} y={4} width={18} height={18} rx={2} />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        )}
        {icon === "briefcase" && (
          <svg
            viewBox="0 0 24 24"
            width={15}
            height={15}
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x={2} y={7} width={20} height={14} rx={2} />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}
        >
          {label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
      </div>
    </div>
  )
}
