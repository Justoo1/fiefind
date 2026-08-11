"use client"

import { useState, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useApp } from "./context"
import type {
  LordListingItem,
  LordLease,
  LordTicket,
  PropertyDocument,
} from "./types"
import {
  useListings,
  useAddListing,
  useUpdateListing,
  useRemoveListing,
  useApplications,
  useSetAppStatus,
  useLeases,
  useLordPayments,
  usePropertyDocs,
  useUploadDocument,
  useAddPropertyDoc,
  useSignDocument,
  useTickets,
  useAssignArtisan,
  useServiceProviders,
} from "@/hooks/useLandlord"
import { ListingSchema, DraftListingSchema } from "@/lib/landlord-schemas"

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function LordDashboardView() {
  const { actions } = useApp()
  const { data: session } = useSession()
  const firstName = session?.user?.name?.split(" ")[0] ?? "there"

  const { data: listings = [] } = useListings()
  const { data: leases = [] } = useLeases()
  const { data: tickets = [] } = useTickets()
  const { data: apps = [] } = useApplications()
  const { data: payments = [] } = useLordPayments()

  const activeLeases = leases.filter(
    (l) => l.status === "Active" || l.status === "active"
  )
  const propertyCount = listings.length
  const activeTenantCount = activeLeases.length
  const openTicketCount = tickets.filter(
    (t) => t.status === "Open" || t.status === "open"
  ).length

  // Monthly revenue = sum of active lease rents
  const expectedPesewas = activeLeases.reduce(
    (sum, l) => sum + l.rentPesewas,
    0
  )
  const expectedGhs = (expectedPesewas / 100).toLocaleString("en-GH", {
    maximumFractionDigits: 0,
  })

  // Collected this calendar month from paid payments
  const now = new Date()
  const thisMonthPayments = payments.filter((p) => {
    if (p.status !== "paid" || !p.paid_at) return false
    const d = new Date(p.paid_at)
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    )
  })
  const collectedPesewas = thisMonthPayments.reduce(
    (sum, p) => sum + p.amount_pesewas,
    0
  )
  const collectedGhs = (collectedPesewas / 100).toLocaleString("en-GH", {
    maximumFractionDigits: 0,
  })
  const progressPct =
    expectedPesewas > 0
      ? Math.min(100, Math.round((collectedPesewas / expectedPesewas) * 100))
      : 0
  const paidLeaseIds = new Set(thisMonthPayments.map((p) => p.lease_id))
  const paidCount = activeLeases.filter((l) => paidLeaseIds.has(l.id)).length
  const overdueCount = activeLeases.length - paidCount
  const monthLabel = now.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  })
  const collectionStatus =
    expectedPesewas === 0
      ? "No leases"
      : progressPct >= 80
        ? "On track"
        : overdueCount > 0
          ? `${overdueCount} overdue`
          : "In progress"
  const collectionStatusColor =
    progressPct >= 80
      ? "var(--ff-accent-strong)"
      : overdueCount > 0
        ? "var(--state-error)"
        : "var(--state-warn)"
  const collectionStatusBg =
    progressPct >= 80
      ? "var(--ff-accent-soft)"
      : overdueCount > 0
        ? "rgba(239,68,68,.12)"
        : "rgba(217,119,6,.12)"

  const revenueDisplay =
    expectedPesewas > 0
      ? `₵${(expectedPesewas / 100).toLocaleString("en-GH", { maximumFractionDigits: 0 })}`
      : "—"

  const stats = [
    {
      icon: <HouseIcon />,
      label: "Properties",
      value: propertyCount > 0 ? String(propertyCount) : "—",
      sub: "in your portfolio",
      subColor: "var(--state-success)",
    },
    {
      icon: <CardIcon />,
      label: "Monthly revenue",
      value: revenueDisplay,
      sub: expectedPesewas > 0 ? "from active leases" : "no active leases",
      subColor:
        expectedPesewas > 0 ? "var(--ff-accent-strong)" : "var(--text-muted)",
    },
    {
      icon: <PeopleIcon />,
      label: "Active tenants",
      value: activeTenantCount > 0 ? String(activeTenantCount) : "—",
      sub: "on active leases",
      subColor: "var(--state-warn)",
    },
    {
      icon: <WrenchIcon />,
      label: "Open tickets",
      value: openTicketCount > 0 ? String(openTicketCount) : "—",
      sub: "maintenance requests",
      subColor: "var(--state-error)",
    },
  ]

  // Recent activity from real data (up to 4 items)
  const activityItems: {
    icon: string
    text: string
    sub: string
    color: string
    onClick: () => void
  }[] = []
  const latestPaid = payments.find((p) => p.status === "paid")
  if (latestPaid) {
    const amt = `₵${(latestPaid.amount_pesewas / 100).toLocaleString("en-GH", { maximumFractionDigits: 0 })}`
    const when = latestPaid.paid_at
      ? new Date(latestPaid.paid_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        })
      : "recently"
    activityItems.push({
      icon: "₵",
      text: "Rent payment received",
      sub: `${amt} · ${when}`,
      color: "var(--state-success)",
      onClick: actions.navLeases,
    })
  }
  if (apps.length > 0) {
    activityItems.push({
      icon: "!",
      text: "New application received",
      sub: `${apps[0].property} · ${apps[0].date}`,
      color: "var(--ff-accent)",
      onClick: actions.navLordApps,
    })
  }
  const openTicket = tickets.find(
    (t) => t.status === "Open" || t.status === "open"
  )
  if (openTicket) {
    activityItems.push({
      icon: "🔧",
      text: "Maintenance ticket opened",
      sub: `${openTicket.property} · ${openTicket.date}`,
      color: "var(--state-warn)",
      onClick: actions.navTickets,
    })
  }
  if (apps.some((a) => a.bgStatus && a.bgStatus.toLowerCase() === "passed")) {
    const passed = apps.find(
      (a) => a.bgStatus && a.bgStatus.toLowerCase() === "passed"
    )!
    activityItems.push({
      icon: "✓",
      text: "Background check passed",
      sub: `${passed.tenant} · ${passed.date}`,
      color: "var(--state-success)",
      onClick: actions.navLordApps,
    })
  }

  return (
    <div
      style={{ maxWidth: 1040, margin: "0 auto", padding: "28px 32px 48px" }}
    >
      <h1
        style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: "-.02em",
          margin: "0 0 4px",
        }}
      >
        Welcome back, {firstName}
      </h1>
      <p
        style={{ color: "var(--text-muted)", margin: "0 0 24px", fontSize: 14 }}
      >
        Here&apos;s how your portfolio is doing today.
      </p>

      {/* KPI cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {stats.map(({ icon, label, value, sub, subColor }) => (
          <div
            key={label}
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
                gap: 8,
                color: "var(--text-muted)",
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              {icon}
              {label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{value}</div>
            <div style={{ fontSize: 12, color: subColor, marginTop: 3 }}>
              {sub}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Rent collection */}
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
              marginBottom: 16,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
              Rent collection — {monthLabel}
            </h3>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 999,
                background: collectionStatusBg,
                color: collectionStatusColor,
              }}
            >
              {collectionStatus}
            </span>
          </div>
          {expectedPesewas > 0 ? (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: 12,
                }}
              >
                <span style={{ fontSize: 32, fontWeight: 800 }}>
                  ₵{collectedGhs}
                </span>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  of ₵{expectedGhs}
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  background: "var(--bg-subtle)",
                  borderRadius: 999,
                  overflow: "hidden",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: `${progressPct}%`,
                    height: "100%",
                    background: "var(--ff-accent)",
                    borderRadius: 999,
                    transition: "width .3s",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                <span>
                  {paidCount} of {activeLeases.length} lease
                  {activeLeases.length !== 1 ? "s" : ""} paid
                </span>
                {overdueCount > 0 ? (
                  <button
                    onClick={actions.navLeases}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--state-error)",
                      fontFamily: "inherit",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {overdueCount} overdue →
                  </button>
                ) : (
                  <span
                    style={{ color: "var(--state-success)", fontWeight: 600 }}
                  >
                    All paid ✓
                  </span>
                )}
              </div>
            </>
          ) : (
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: 13,
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              No active leases yet.{" "}
              <button
                onClick={actions.navLeases}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--ff-accent-strong)",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                View leases →
              </button>
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div
          style={{
            border: "1px solid var(--ff-border)",
            borderRadius: 12,
            background: "var(--bg-surface)",
            padding: 20,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>
            Recent activity
          </h3>
          {activityItems.length === 0 ? (
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: 13,
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              No recent activity yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activityItems
                .slice(0, 4)
                .map(({ icon, text, sub, color, onClick }) => (
                  <button
                    key={text}
                    onClick={onClick}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "var(--bg-subtle)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: 13,
                        color,
                      }}
                    >
                      {icon}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {text}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {sub}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginTop: 20,
        }}
      >
        {[
          { label: "Add listing", onClick: actions.navListings },
          { label: "View applications", onClick: actions.navLordApps },
          { label: "Rent collection", onClick: actions.navLeases },
          { label: "Maintenance tickets", onClick: actions.navTickets },
        ].map(({ label, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--ff-border)",
              borderRadius: 10,
              padding: "14px 12px",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              color: "var(--text-primary)",
              textAlign: "center",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Listings ──────────────────────────────────────────────────────────────────

export function LordListingsView() {
  const { data: listings = [], isLoading } = useListings()
  const addMutation = useAddListing()
  const updateMutation = useUpdateListing()
  const removeMutation = useRemoveListing()

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<LordListingItem | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [docsListing, setDocsListing] = useState<LordListingItem | null>(null)

  function handleOpenNew() {
    setEditTarget(null)
    setShowModal(true)
  }

  function handleOpenEdit(item: LordListingItem) {
    setEditTarget(item)
    setShowModal(true)
  }

  function handleRemoveClick(id: string) {
    if (confirmRemoveId === id) {
      removeMutation.mutate(id)
      setConfirmRemoveId(null)
    } else {
      setConfirmRemoveId(id)
    }
  }

  function handleSave(
    data: Omit<LordListingItem, "id" | "status">,
    mode: "draft" | "live"
  ) {
    const status: LordListingItem["status"] = mode === "live" ? "Live" : "Draft"
    if (editTarget) {
      updateMutation.mutate({ ...editTarget, ...data, status })
    } else {
      addMutation.mutate({ ...data, status })
    }
    setShowModal(false)
    setEditTarget(null)
  }

  const statusColor = (s: LordListingItem["status"]) =>
    s === "Live"
      ? "var(--state-success)"
      : s === "Occupied"
        ? "var(--ff-accent)"
        : "var(--text-muted)"

  return (
    <>
      <div
        style={{ maxWidth: 1040, margin: "0 auto", padding: "28px 32px 48px" }}
      >
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
              My listings
            </h1>
            <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 14 }}>
              Manage your active and draft property listings.
            </p>
          </div>
          <button
            onClick={handleOpenNew}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "var(--ff-accent)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "11px 16px",
              fontFamily: "inherit",
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
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            New listing
          </button>
        </div>

        {isLoading ? (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: 14,
              textAlign: "center",
              padding: 40,
            }}
          >
            Loading listings…
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {listings.map((item) => (
              <div
                key={item.id}
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
                    width: 90,
                    height: 68,
                    borderRadius: 8,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                  }}
                >
                  Photo
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-muted)",
                      margin: "2px 0 6px",
                    }}
                  >
                    {item.area}, {item.region} · {item.beds} bd · {item.baths}{" "}
                    ba · {item.sqft} sqft
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--ff-accent-strong)",
                    }}
                  >
                    ₵{item.rent}
                    <span
                      style={{
                        fontWeight: 400,
                        fontSize: 13,
                        color: "var(--text-muted)",
                      }}
                    >
                      /mo
                    </span>
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
                      background: statusColor(item.status),
                    }}
                  >
                    {item.status}
                  </span>
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    {confirmRemoveId === item.id ? (
                      <>
                        <button
                          onClick={() => handleRemoveClick(item.id)}
                          style={{
                            background: "var(--state-error)",
                            color: "#fff",
                            border: "none",
                            borderRadius: 7,
                            padding: "7px 12px",
                            fontFamily: "inherit",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmRemoveId(null)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--text-muted)",
                            fontFamily: "inherit",
                            fontSize: 13,
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setDocsListing(item)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            background: "var(--bg-subtle)",
                            border: "1px solid var(--ff-border)",
                            borderRadius: 7,
                            padding: "7px 10px",
                            fontFamily: "inherit",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            color: "var(--text-primary)",
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width={12}
                            height={12}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                            <path d="M14 2v6h6" />
                          </svg>
                          Docs
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          style={{
                            background: "var(--bg-subtle)",
                            border: "1px solid var(--ff-border)",
                            borderRadius: 7,
                            padding: "7px 12px",
                            fontFamily: "inherit",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            color: "var(--text-primary)",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemoveClick(item.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--state-error)",
                            fontFamily: "inherit",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <AddListingModal
          initialData={editTarget ?? undefined}
          onClose={() => {
            setShowModal(false)
            setEditTarget(null)
          }}
          onSave={handleSave}
        />
      )}

      {docsListing && (
        <PropertyDocsPanel
          listing={docsListing}
          onClose={() => setDocsListing(null)}
        />
      )}
    </>
  )
}

// ── Add Listing Modal ─────────────────────────────────────────────────────────

interface AddListingModalProps {
  onClose: () => void
  initialData?: LordListingItem
  onSave: (
    data: Omit<LordListingItem, "id" | "status">,
    mode: "draft" | "live"
  ) => void
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        border: "1px solid var(--ff-border)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          width: 36,
          height: 38,
          border: "none",
          background: "var(--bg-subtle)",
          color: "var(--text-primary)",
          fontFamily: "inherit",
          fontSize: 18,
          cursor: value <= min ? "default" : "pointer",
          opacity: value <= min ? 0.35 : 1,
        }}
      >
        −
      </button>
      <div
        style={{
          width: 40,
          textAlign: "center",
          fontSize: 15,
          fontWeight: 700,
          color: "var(--text-primary)",
        }}
      >
        {value}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{
          width: 36,
          height: 38,
          border: "none",
          background: "var(--bg-subtle)",
          color: "var(--text-primary)",
          fontFamily: "inherit",
          fontSize: 18,
          cursor: value >= max ? "default" : "pointer",
          opacity: value >= max ? 0.35 : 1,
        }}
      >
        +
      </button>
    </div>
  )
}

const PROPERTY_TYPES = ["Apartment", "House", "Studio", "Townhouse"]
const ADVANCE_OPTIONS = [1, 2, 3, 6]
const AMENITY_OPTIONS = [
  "Backup power",
  "Parking",
  "Security",
  "Water supply",
  "Internet",
  "Air conditioning",
  "Furnished",
  "Swimming pool",
  "Gym",
  "CCTV",
  "Gated compound",
  "Garden",
  "Balcony",
  "Storage room",
  "Pet-friendly",
]
const REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Central",
  "Eastern",
  "Volta",
  "Northern",
  "Upper East",
  "Upper West",
  "Bono",
]

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <div
      style={{
        color: "var(--state-error)",
        fontSize: 12,
        marginTop: -16,
        marginBottom: 12,
      }}
    >
      {msg}
    </div>
  )
}

function AddListingModal({
  onClose,
  initialData,
  onSave,
}: AddListingModalProps) {
  const [title, setTitle] = useState(initialData?.title ?? "")
  const [type, setType] = useState(initialData?.type ?? "Apartment")
  const [area, setArea] = useState(initialData?.area ?? "")
  const [region, setRegion] = useState(initialData?.region ?? "Greater Accra")
  const [beds, setBeds] = useState(initialData?.beds ?? 2)
  const [baths, setBaths] = useState(initialData?.baths ?? 1)
  const [sqft, setSqft] = useState(initialData?.sqft ?? "")
  const [rent, setRent] = useState(initialData?.rent ?? "")
  const [advance, setAdvance] = useState(initialData?.advance ?? 3)
  const [desc, setDesc] = useState(initialData?.desc ?? "")
  const [amenities, setAmenities] = useState<string[]>(
    initialData?.amenities ?? []
  )
  const [ghanaPostGps, setGhanaPostGps] = useState(
    initialData?.ghanaPostGps ?? ""
  )
  const [streetAddress, setStreetAddress] = useState(
    initialData?.streetAddress ?? ""
  )
  const [pinX, setPinX] = useState<number | null>(initialData?.pinX ?? null)
  const [pinY, setPinY] = useState<number | null>(initialData?.pinY ?? null)
  const [locating, setLocating] = useState(false)
  const [locateMsg, setLocateMsg] = useState<{
    ok: boolean
    text: string
  } | null>(null)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})

  async function locateAddress() {
    const query = [streetAddress, area, region, "Ghana"]
      .filter(Boolean)
      .join(", ")
    if (!query) return
    setLocating(true)
    setLocateMsg(null)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en", "User-Agent": "FieFind/1.0" } }
      )
      const data = await res.json()
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat)
        const lon = parseFloat(data[0].lon)
        setPinX(lat)
        setPinY(lon)
        setLocateMsg({
          ok: true,
          text: `Located: ${lat.toFixed(5)}, ${lon.toFixed(5)}`,
        })
      } else {
        setLocateMsg({
          ok: false,
          text: "Address not found — property will use area centre on map.",
        })
      }
    } catch {
      setLocateMsg({ ok: false, text: "Could not reach geocoding service." })
    } finally {
      setLocating(false)
    }
  }

  function toggleAmenity(a: string) {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    )
  }

  function buildPayload() {
    return {
      title,
      type,
      area,
      region,
      beds,
      baths,
      sqft,
      rent,
      advance,
      desc,
      amenities,
      ghanaPostGps: ghanaPostGps || undefined,
      streetAddress: streetAddress || undefined,
      pinX: pinX ?? undefined,
      pinY: pinY ?? undefined,
    }
  }

  function handleDraft() {
    const result = DraftListingSchema.safeParse(buildPayload())
    if (!result.success) {
      const fe = result.error.flatten().fieldErrors
      setErrors({ title: fe.title?.[0], area: fe.area?.[0] })
      return
    }
    setErrors({})
    onSave(buildPayload(), "draft")
  }

  function handlePublish() {
    const result = ListingSchema.safeParse(buildPayload())
    if (!result.success) {
      const fe = result.error.flatten().fieldErrors
      setErrors({
        title: fe.title?.[0],
        area: fe.area?.[0],
        rent: fe.rent?.[0],
      })
      return
    }
    setErrors({})
    onSave(buildPayload(), "live")
  }

  const isEdit = Boolean(initialData)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 520,
          height: "100vh",
          zIndex: 201,
          background: "var(--bg-surface)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid var(--ff-border)",
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                margin: 0,
                letterSpacing: "-.01em",
              }}
            >
              {isEdit ? "Edit listing" : "New listing"}
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                margin: "2px 0 0",
              }}
            >
              {isEdit
                ? "Update property details"
                : "Add a property to your portfolio"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: "1px solid var(--ff-border)",
              background: "var(--bg-subtle)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={17}
              height={17}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 8px" }}>
          <FormLabel>Property title</FormLabel>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sunlit 2-Bedroom Apartment"
            style={{
              ...fieldStyle,
              borderColor: errors.title ? "var(--state-error)" : undefined,
            }}
          />
          <FieldError msg={errors.title} />

          <FormLabel>Property type</FormLabel>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            {PROPERTY_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border:
                    type === t
                      ? "2px solid var(--ff-accent)"
                      : "1px solid var(--ff-border)",
                  background:
                    type === t ? "var(--ff-accent-soft)" : "var(--bg-surface)",
                  color:
                    type === t
                      ? "var(--ff-accent-strong)"
                      : "var(--text-muted)",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all .1s",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 0,
            }}
          >
            <div>
              <FormLabel>City / Area / Neighbourhood</FormLabel>
              <input
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Takoradi, East Legon, Tarkwa"
                style={{
                  ...fieldStyle,
                  borderColor: errors.area ? "var(--state-error)" : undefined,
                }}
              />
              <p
                style={{
                  margin: "4px 0 12px",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                Enter any city, town, or neighbourhood — tenants can filter by
                this.
              </p>
              <FieldError msg={errors.area} />
            </div>
            <div>
              <FormLabel>Region</FormLabel>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                style={{ ...fieldStyle, appearance: "none" }}
              >
                {REGIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <FormLabel>
              Street address{" "}
              <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>
                (optional — pins the property on the map)
              </span>
            </FormLabel>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={streetAddress}
                onChange={(e) => {
                  setStreetAddress(e.target.value)
                  setLocateMsg(null)
                  setPinX(null)
                  setPinY(null)
                }}
                placeholder="e.g. 12 Independence Ave"
                style={{ ...fieldStyle, flex: 1, marginBottom: 0 }}
              />
              <button
                type="button"
                onClick={locateAddress}
                disabled={locating || (!streetAddress && !area)}
                style={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: pinX
                    ? "var(--ff-accent-soft)"
                    : "var(--bg-subtle)",
                  border: pinX
                    ? "1.5px solid var(--ff-accent)"
                    : "1px solid var(--ff-border)",
                  color: pinX ? "var(--ff-accent-strong)" : "var(--text-muted)",
                  borderRadius: 8,
                  padding: "0 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor:
                    locating || (!streetAddress && !area)
                      ? "not-allowed"
                      : "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                  opacity: locating || (!streetAddress && !area) ? 0.5 : 1,
                }}
              >
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
                  <path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11Z" />
                  <circle cx={12} cy={10} r={2.5} />
                </svg>
                {locating ? "Locating…" : pinX ? "Re-locate" : "Locate on map"}
              </button>
            </div>
            {locateMsg && (
              <p
                style={{
                  margin: "5px 0 0",
                  fontSize: 12,
                  color: locateMsg.ok
                    ? "var(--state-success)"
                    : "var(--state-warning)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {locateMsg.ok ? (
                  <svg
                    viewBox="0 0 24 24"
                    width={12}
                    height={12}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    width={12}
                    height={12}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 9v4M12 17h.01" />
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                  </svg>
                )}
                {locateMsg.text}
              </p>
            )}
            {!locateMsg && (
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                Enter the street address then click "Locate on map" to pin the
                exact position.
              </p>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <FormLabel>
              Ghana Post GPS address{" "}
              <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>
                (optional — e.g. GA-184-1234)
              </span>
            </FormLabel>
            <input
              value={ghanaPostGps}
              onChange={(e) => setGhanaPostGps(e.target.value.toUpperCase())}
              placeholder="GA-184-1234"
              style={{ ...fieldStyle, fontFamily: "var(--font-mono)" }}
            />
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              Helps tenants navigate directly to the property using maps or
              ride-sharing apps.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div>
              <FormLabel>Bedrooms</FormLabel>
              <Stepper value={beds} min={1} max={10} onChange={setBeds} />
            </div>
            <div>
              <FormLabel>Bathrooms</FormLabel>
              <Stepper value={baths} min={1} max={8} onChange={setBaths} />
            </div>
            <div>
              <FormLabel>Sqft</FormLabel>
              <input
                value={sqft}
                onChange={(e) => setSqft(e.target.value)}
                placeholder="1 200"
                style={fieldStyle}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 0,
            }}
          >
            <div>
              <FormLabel>Monthly rent (GHS)</FormLabel>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--ff-accent-strong)",
                  }}
                >
                  ₵
                </span>
                <input
                  value={rent}
                  onChange={(e) => setRent(e.target.value)}
                  placeholder="3 500"
                  style={{
                    ...fieldStyle,
                    paddingLeft: 26,
                    borderColor: errors.rent ? "var(--state-error)" : undefined,
                  }}
                />
              </div>
              <FieldError msg={errors.rent} />
            </div>
            <div>
              <FormLabel>Advance required</FormLabel>
              <div style={{ display: "flex", gap: 6 }}>
                {ADVANCE_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setAdvance(m)}
                    style={{
                      flex: 1,
                      height: 42,
                      borderRadius: 8,
                      border:
                        advance === m
                          ? "2px solid var(--ff-accent)"
                          : "1px solid var(--ff-border)",
                      background:
                        advance === m
                          ? "var(--ff-accent-soft)"
                          : "var(--bg-surface)",
                      color:
                        advance === m
                          ? "var(--ff-accent-strong)"
                          : "var(--text-muted)",
                      fontFamily: "inherit",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all .1s",
                    }}
                  >
                    {m}mo
                  </button>
                ))}
              </div>
            </div>
          </div>

          <FormLabel top={20}>Description</FormLabel>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
            placeholder="Describe the property — highlights, nearby landmarks, access to transport…"
            style={{
              ...fieldStyle,
              resize: "vertical",
              lineHeight: 1.55,
              minHeight: 96,
            }}
          />

          <FormLabel>Amenities</FormLabel>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 24,
            }}
          >
            {AMENITY_OPTIONS.map((a) => {
              const checked = amenities.includes(a)
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenity(a)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: checked
                      ? "1.5px solid var(--ff-accent)"
                      : "1px solid var(--ff-border)",
                    background: checked
                      ? "var(--ff-accent-soft)"
                      : "var(--bg-surface)",
                    color: checked
                      ? "var(--ff-accent-strong)"
                      : "var(--text-muted)",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: checked ? 600 : 400,
                    cursor: "pointer",
                    transition: "all .1s",
                  }}
                >
                  {checked && (
                    <svg
                      viewBox="0 0 24 24"
                      width={12}
                      height={12}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                  )}
                  {a}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--ff-border)",
            display: "flex",
            gap: 10,
            flexShrink: 0,
            background: "var(--bg-surface)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "11px 0",
              border: "1px solid var(--ff-border)",
              borderRadius: 8,
              background: "var(--bg-subtle)",
              color: "var(--text-muted)",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDraft}
            style={{
              flex: 1,
              padding: "11px 0",
              border: "1px solid var(--ff-border)",
              borderRadius: 8,
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save draft
          </button>
          <button
            type="button"
            onClick={handlePublish}
            style={{
              flex: 2,
              padding: "11px 0",
              border: "none",
              borderRadius: 8,
              background: "var(--ff-accent)",
              color: "#fff",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={15}
              height={15}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            {isEdit ? "Update listing" : "Publish listing"}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Shared form helpers ───────────────────────────────────────────────────────

function FormLabel({
  children,
  top = 0,
}: {
  children: React.ReactNode
  top?: number
}) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 600,
        marginBottom: 7,
        marginTop: top,
        color: "var(--text-primary)",
      }}
    >
      {children}
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--ff-border)",
  borderRadius: 8,
  background: "var(--bg-base)",
  color: "var(--text-primary)",
  fontFamily: "inherit",
  fontSize: 14,
  outline: "none",
  marginBottom: 20,
  boxSizing: "border-box",
}

// ── Applications ──────────────────────────────────────────────────────────────

export function LordApplicationsView() {
  const { data: apps = [], isLoading } = useApplications()
  const setStatusMutation = useSetAppStatus()

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
        Applications
      </h1>
      <p
        style={{ color: "var(--text-muted)", margin: "0 0 24px", fontSize: 14 }}
      >
        Review prospective tenants for your properties.
      </p>

      {isLoading ? (
        <div
          style={{
            color: "var(--text-muted)",
            fontSize: 14,
            textAlign: "center",
            padding: 40,
          }}
        >
          Loading…
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {apps.map((a) => {
            const decided = a.appStatus !== "pending"
            const isApproved = a.appStatus === "approved"
            return (
              <div
                key={a.id}
                style={{
                  border: "1px solid var(--ff-border)",
                  borderRadius: 12,
                  background: "var(--bg-surface)",
                  padding: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      background: "var(--ff-accent)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {a.initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {a.tenant}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      {a.property} · Applied {a.date}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text-muted)",
                        marginBottom: 4,
                      }}
                    >
                      Monthly income
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {a.income}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: "1px solid var(--ff-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width={16}
                      height={16}
                      fill="none"
                      stroke={a.bgColor}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    <span style={{ fontWeight: 600, color: a.bgColor }}>
                      Background check: {a.bgStatus}
                    </span>
                  </div>

                  {decided ? (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          padding: "6px 14px",
                          borderRadius: 8,
                          background: isApproved
                            ? "var(--state-success)"
                            : "var(--state-error)",
                          color: "#fff",
                        }}
                      >
                        {isApproved ? "Approved" : "Declined"}
                      </span>
                      <button
                        onClick={() =>
                          setStatusMutation.mutate({
                            id: a.id,
                            status: "pending",
                          })
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          fontFamily: "inherit",
                          fontSize: 13,
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        Undo
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() =>
                          setStatusMutation.mutate({
                            id: a.id,
                            status: "declined",
                          })
                        }
                        disabled={setStatusMutation.isPending}
                        style={{
                          background: "var(--state-error)",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          padding: "9px 14px",
                          fontFamily: "inherit",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          opacity: setStatusMutation.isPending ? 0.6 : 1,
                        }}
                      >
                        Decline
                      </button>
                      <button
                        onClick={() =>
                          setStatusMutation.mutate({
                            id: a.id,
                            status: "approved",
                          })
                        }
                        disabled={setStatusMutation.isPending}
                        style={{
                          background: "var(--ff-accent)",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          padding: "9px 14px",
                          fontFamily: "inherit",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          opacity: setStatusMutation.isPending ? 0.6 : 1,
                        }}
                      >
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Leases ────────────────────────────────────────────────────────────────────

export function LordLeasesView() {
  const { actions } = useApp()
  const { data: leases = [], isLoading } = useLeases()
  const [viewingLease, setViewingLease] = useState<LordLease | null>(null)
  const [docsLease, setDocsLease] = useState<LordLease | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function sendReminder(lease: LordLease) {
    setToast(`Reminder sent to ${lease.tenant} for July 2026 rent`)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <>
      <div
        style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px 48px" }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: "-.02em",
            margin: "0 0 4px",
          }}
        >
          Leases
        </h1>
        <p
          style={{
            color: "var(--text-muted)",
            margin: "0 0 24px",
            fontSize: 14,
          }}
        >
          Active and upcoming tenancy agreements across your portfolio.
        </p>

        {isLoading ? (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: 14,
              textAlign: "center",
              padding: 40,
            }}
          >
            Loading…
          </div>
        ) : (
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
                display: "grid",
                gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr 148px",
                gap: 16,
                padding: "12px 20px",
                borderBottom: "1px solid var(--ff-border)",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: ".06em",
              }}
            >
              <span>Tenant</span>
              <span>Property</span>
              <span>Rent</span>
              <span>Term</span>
              <span>Next due</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            {leases.map((l) => (
              <div
                key={l.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr 148px",
                  gap: 16,
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--ff-border)",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "var(--ff-accent)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 13,
                      flexShrink: 0,
                    }}
                  >
                    {l.initials}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>
                    {l.tenant}
                  </span>
                </div>
                <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
                  {l.property}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{l.rent}</span>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    lineHeight: 1.4,
                  }}
                >
                  <div>{l.start}</div>
                  <div>→ {l.end}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {l.nextDue}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 999,
                    color: "#fff",
                    background: l.statusColor,
                    display: "inline-block",
                  }}
                >
                  {l.status}
                </span>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 5 }}
                >
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => setViewingLease(l)}
                      style={{
                        background: "var(--bg-subtle)",
                        border: "1px solid var(--ff-border)",
                        borderRadius: 6,
                        padding: "5px 8px",
                        fontFamily: "inherit",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        color: "var(--text-primary)",
                      }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => sendReminder(l)}
                      style={{
                        background: "var(--ff-accent-soft)",
                        border: "none",
                        borderRadius: 6,
                        padding: "5px 8px",
                        fontFamily: "inherit",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        color: "var(--ff-accent-strong)",
                      }}
                    >
                      Remind
                    </button>
                  </div>
                  <button
                    onClick={() => setDocsLease(l)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: "var(--bg-subtle)",
                      border: "1px solid var(--ff-border)",
                      borderRadius: 6,
                      padding: "5px 10px",
                      fontFamily: "inherit",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      color: "var(--text-primary)",
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width={11}
                      height={11}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                    </svg>
                    Documents
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lease detail modal */}
      {viewingLease && (
        <>
          <div
            onClick={() => setViewingLease(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 200,
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(2px)",
            }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              zIndex: 201,
              background: "var(--bg-surface)",
              borderRadius: 16,
              padding: 32,
              width: 480,
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <div>
                <h2
                  style={{ fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}
                >
                  Lease details
                </h2>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--text-muted)",
                    margin: 0,
                  }}
                >
                  {viewingLease.property}
                </p>
              </div>
              <button
                onClick={() => setViewingLease(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "1px solid var(--ff-border)",
                  background: "var(--bg-subtle)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  flexShrink: 0,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={16}
                  height={16}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                ["Tenant", viewingLease.tenant],
                ["Monthly rent", viewingLease.rent],
                ["Lease start", viewingLease.start],
                ["Lease end", viewingLease.end],
                ["Next payment due", viewingLease.nextDue],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 14,
                    borderBottom: "1px solid var(--ff-border)",
                    paddingBottom: 12,
                  }}
                >
                  <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
                    {label}
                  </span>
                  <span style={{ fontWeight: 700 }}>{value}</span>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                }}
              >
                <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
                  Status
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: 999,
                    color: "#fff",
                    background: viewingLease.statusColor,
                  }}
                >
                  {viewingLease.status}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button
                onClick={() => setViewingLease(null)}
                style={{
                  flex: 1,
                  padding: "11px 0",
                  border: "1px solid var(--ff-border)",
                  borderRadius: 8,
                  background: "var(--bg-subtle)",
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setViewingLease(null)
                  setDocsLease(viewingLease)
                }}
                style={{
                  flex: 1,
                  padding: "11px 0",
                  border: "none",
                  borderRadius: 8,
                  background: "var(--ff-accent)",
                  color: "#fff",
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={14}
                  height={14}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                  <path d="M14 2v6h6" />
                </svg>
                View documents
              </button>
            </div>
          </div>
        </>
      )}

      {/* Lease documents drawer */}
      {docsLease && (
        <LeaseDocsDrawer
          lease={docsLease}
          onClose={() => setDocsLease(null)}
          onManageDocs={() => {
            setDocsLease(null)
            actions.navDocs()
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 300,
            background: "var(--state-success)",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "var(--shadow-lg)",
            animation: "ff-slide-up .2s ease",
          }}
        >
          {toast}
        </div>
      )}
    </>
  )
}

// ── Lease Documents Drawer (view + sign only) ─────────────────────────────────

function docSignStatus(doc: PropertyDocument): {
  label: string
  color: string
} {
  if (doc.landlordSigned && doc.tenantSigned)
    return { label: "Fully signed", color: "var(--state-success)" }
  if (doc.landlordSigned && !doc.tenantSigned)
    return { label: "Awaiting tenant", color: "var(--state-warn)" }
  if (!doc.landlordSigned && doc.tenantSigned)
    return { label: "Awaiting landlord", color: "var(--state-warn)" }
  return { label: "Unsigned", color: "var(--text-muted)" }
}

function LeaseDocsDrawer({
  lease,
  onClose,
  onManageDocs,
}: {
  lease: LordLease
  onClose: () => void
  onManageDocs: () => void
}) {
  const { data: docs = [], isLoading } = usePropertyDocs(lease.propertyId)
  const [previewDoc, setPreviewDoc] = useState<PropertyDocument | null>(null)
  const [signingDoc, setSigningDoc] = useState<PropertyDocument | null>(null)
  const [drawerToast, setDrawerToast] = useState<{
    msg: string
    success: boolean
  } | null>(null)

  function showToast(msg: string, success = true) {
    setDrawerToast({ msg, success })
    setTimeout(() => setDrawerToast(null), 3000)
  }

  function handleDownload(doc: PropertyDocument) {
    showToast(`"${doc.title}" is ready to download`)
  }

  function handleRequestSign(doc: PropertyDocument) {
    showToast(`Signature request sent to ${lease.tenant} for "${doc.title}"`)
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(2px)",
        }}
      />

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 520,
          height: "100vh",
          zIndex: 201,
          background: "var(--bg-surface)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid var(--ff-border)",
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                margin: 0,
                letterSpacing: "-.01em",
              }}
            >
              Lease documents
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                margin: "3px 0 0",
              }}
            >
              {lease.tenant} · {lease.property}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: "1px solid var(--ff-border)",
              background: "var(--bg-subtle)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              flexShrink: 0,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={17}
              height={17}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {isLoading ? (
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: 14,
                textAlign: "center",
                padding: 32,
              }}
            >
              Loading…
            </div>
          ) : docs.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                color: "var(--text-muted)",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                No documents on this property
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                Add tenancy agreements from My Listings or the Documents page.
              </div>
              <button
                onClick={onManageDocs}
                style={{
                  marginTop: 14,
                  padding: "9px 18px",
                  border: "none",
                  borderRadius: 8,
                  background: "var(--ff-accent)",
                  color: "#fff",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Go to Documents
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginBottom: 16,
              }}
            >
              {docs.map((doc) => {
                const sig = docSignStatus(doc)
                return (
                  <div
                    key={doc.id}
                    style={{
                      border: "1px solid var(--ff-border)",
                      borderRadius: 12,
                      background: "var(--bg-base)",
                      padding: "16px 18px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 42,
                          borderRadius: 6,
                          background: "var(--ff-accent-soft)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width={17}
                          height={17}
                          fill="none"
                          stroke="var(--ff-accent-strong)"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 2,
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 700 }}>
                            {doc.title}
                          </span>
                          {doc.isDigital && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: "var(--ff-accent-soft)",
                                color: "var(--ff-accent-strong)",
                              }}
                            >
                              Digital
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 999,
                              color: "#fff",
                              background: sig.color,
                              marginLeft: "auto",
                              flexShrink: 0,
                            }}
                          >
                            {sig.label}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            marginBottom: 10,
                          }}
                        >
                          Added {doc.uploadedOn}
                        </div>

                        <div
                          style={{ display: "flex", gap: 8, marginBottom: 10 }}
                        >
                          {[
                            { role: "Landlord", signed: doc.landlordSigned },
                            { role: "Tenant", signed: doc.tenantSigned },
                          ].map(({ role, signed }) => (
                            <div
                              key={role}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                fontSize: 12,
                              }}
                            >
                              <div
                                style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: "50%",
                                  background: signed
                                    ? "var(--state-success)"
                                    : "var(--bg-subtle)",
                                  border: signed
                                    ? "none"
                                    : "1px solid var(--ff-border)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {signed ? (
                                  <svg
                                    viewBox="0 0 24 24"
                                    width={9}
                                    height={9}
                                    fill="none"
                                    stroke="#fff"
                                    strokeWidth={3}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="m5 12 5 5L20 7" />
                                  </svg>
                                ) : (
                                  <svg
                                    viewBox="0 0 24 24"
                                    width={9}
                                    height={9}
                                    fill="none"
                                    stroke="var(--text-muted)"
                                    strokeWidth={2.5}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <circle cx={12} cy={12} r={4} />
                                  </svg>
                                )}
                              </div>
                              <span
                                style={{
                                  color: signed
                                    ? "var(--state-success)"
                                    : "var(--text-muted)",
                                  fontWeight: 600,
                                }}
                              >
                                {role} {signed ? "signed" : "pending"}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div
                          style={{ display: "flex", flexWrap: "wrap", gap: 7 }}
                        >
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              background: "var(--bg-subtle)",
                              border: "1px solid var(--ff-border)",
                              borderRadius: 7,
                              padding: "6px 11px",
                              fontFamily: "inherit",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              color: "var(--text-primary)",
                            }}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width={11}
                              height={11}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx={12} cy={12} r={3} />
                            </svg>
                            Preview
                          </button>
                          <button
                            onClick={() => handleDownload(doc)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              background: "var(--bg-subtle)",
                              border: "1px solid var(--ff-border)",
                              borderRadius: 7,
                              padding: "6px 11px",
                              fontFamily: "inherit",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              color: "var(--text-primary)",
                            }}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width={11}
                              height={11}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                            </svg>
                            Download
                          </button>
                          {!doc.landlordSigned && (
                            <button
                              onClick={() => setSigningDoc(doc)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                background: "var(--ff-accent)",
                                border: "none",
                                borderRadius: 7,
                                padding: "6px 11px",
                                fontFamily: "inherit",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                color: "#fff",
                              }}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                width={11}
                                height={11}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2.2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                              Sign now
                            </button>
                          )}
                          {!doc.tenantSigned && (
                            <button
                              onClick={() => handleRequestSign(doc)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                background: "var(--ff-accent-soft)",
                                border: "none",
                                borderRadius: 7,
                                padding: "6px 11px",
                                fontFamily: "inherit",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                color: "var(--ff-accent-strong)",
                              }}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                width={11}
                                height={11}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2.2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.8 19.8 0 0 1 1.62 3.38 2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.72 12.8 12.8 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6 6l.94-.94a2 2 0 0 1 2.11-.45 12.8 12.8 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                              </svg>
                              Request sign
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {docs.length > 0 && (
            <button
              onClick={onManageDocs}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                padding: "11px 0",
                border: "1.5px dashed var(--ff-border)",
                borderRadius: 10,
                background: "none",
                color: "var(--text-muted)",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
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
                <path d="M12 5v14M5 12h14" />
              </svg>
              Manage documents in Documents page
            </button>
          )}
        </div>

        {drawerToast && (
          <div
            style={{
              position: "absolute",
              bottom: 20,
              left: 20,
              right: 20,
              background: drawerToast.success
                ? "var(--state-success)"
                : "var(--state-warn)",
              color: "#fff",
              padding: "11px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "var(--shadow-md)",
              animation: "ff-slide-up .2s ease",
              zIndex: 10,
            }}
          >
            {drawerToast.msg}
          </div>
        )}
      </div>

      {previewDoc && (
        <DocPreviewModal
          doc={previewDoc}
          tenant={lease.tenant}
          property={lease.property}
          rent={lease.rent}
          start={lease.start}
          end={lease.end}
          nextDue={lease.nextDue}
          onClose={() => setPreviewDoc(null)}
          onDownload={() => {
            handleDownload(previewDoc)
            setPreviewDoc(null)
          }}
        />
      )}

      {signingDoc && (
        <SignatureModal
          doc={signingDoc}
          onClose={() => setSigningDoc(null)}
          onSigned={() => {
            showToast("Document signed successfully")
            setSigningDoc(null)
          }}
        />
      )}
    </>
  )
}

// ── Document preview helpers ──────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: "var(--ff-accent-strong)",
          borderBottom: "1px solid var(--ff-border)",
          paddingBottom: 5,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 11,
        marginBottom: 4,
      }}
    >
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function SignatureBlock({
  role,
  name,
  date,
  signed,
}: {
  role: string
  name: string
  date?: string
  signed: boolean
}) {
  return (
    <div
      style={{
        border: "1px solid var(--ff-border)",
        borderRadius: 6,
        padding: "12px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".08em",
          color: "var(--text-muted)",
          marginBottom: 8,
        }}
      >
        {role}
      </div>
      {signed ? (
        <>
          <div
            style={{
              fontStyle: "italic",
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: ".04em",
              color: "var(--ff-accent-strong)",
              marginBottom: 6,
            }}
          >
            {name}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
            Signed digitally on {date}
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              height: 28,
              borderBottom: "1px solid var(--ff-border)",
              marginBottom: 6,
            }}
          />
          <div style={{ fontSize: 10, color: "var(--state-warn)" }}>
            Signature pending
          </div>
        </>
      )}
    </div>
  )
}

// ── Signature Modal ───────────────────────────────────────────────────────────

function SignatureModal({
  doc,
  onClose,
  onSigned,
}: {
  doc: PropertyDocument
  onClose: () => void
  onSigned: () => void
}) {
  const [mode, setMode] = useState<"draw" | "type">("draw")
  const [typedName, setTypedName] = useState("")
  const [hasDrawn, setHasDrawn] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)
  const signDoc = useSignDocument()

  function getPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      isDrawingRef.current = true
      const pos = getPos(e)
      lastPosRef.current = pos
      const ctx = canvasRef.current!.getContext("2d")!
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    },
    []
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || !canvasRef.current) return
      const ctx = canvasRef.current.getContext("2d")!
      const pos = getPos(e)
      ctx.lineTo(pos.x, pos.y)
      ctx.strokeStyle = "#1a1a2e"
      ctx.lineWidth = 2.5
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.stroke()
      lastPosRef.current = pos
      setHasDrawn(true)
    },
    []
  )

  const handleMouseUp = useCallback(() => {
    isDrawingRef.current = false
    lastPosRef.current = null
  }, [])

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const canApply = mode === "draw" ? hasDrawn : typedName.trim().length > 0

  function applySignature() {
    signDoc.mutate(doc.id, { onSuccess: onSigned })
  }

  const tabBase: React.CSSProperties = {
    flex: 1,
    padding: "10px 0",
    border: "none",
    background: "none",
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    borderBottom: "2px solid transparent",
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 204,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(3px)",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          zIndex: 205,
          background: "var(--bg-surface)",
          borderRadius: 16,
          width: 480,
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid var(--ff-border)",
          }}
        >
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>
              Sign document
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                margin: "3px 0 0",
              }}
            >
              {doc.title}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid var(--ff-border)",
              background: "var(--bg-subtle)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              flexShrink: 0,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={16}
              height={16}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--ff-border)",
            padding: "0 24px",
          }}
        >
          <button
            onClick={() => setMode("draw")}
            style={{
              ...tabBase,
              color:
                mode === "draw"
                  ? "var(--ff-accent-strong)"
                  : "var(--text-muted)",
              borderBottomColor:
                mode === "draw" ? "var(--ff-accent)" : "transparent",
            }}
          >
            Draw signature
          </button>
          <button
            onClick={() => setMode("type")}
            style={{
              ...tabBase,
              color:
                mode === "type"
                  ? "var(--ff-accent-strong)"
                  : "var(--text-muted)",
              borderBottomColor:
                mode === "type" ? "var(--ff-accent)" : "transparent",
            }}
          >
            Type signature
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          {mode === "draw" ? (
            <>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  margin: "0 0 10px",
                }}
              >
                Draw your signature in the box below using your mouse or
                trackpad.
              </p>
              <canvas
                ref={canvasRef}
                width={432}
                height={160}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                  width: "100%",
                  height: 160,
                  border: "1.5px solid var(--ff-border)",
                  borderRadius: 8,
                  cursor: "crosshair",
                  background: "#fff",
                  display: "block",
                  touchAction: "none",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 8,
                }}
              >
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Sign within the box
                </span>
                <button
                  onClick={clearCanvas}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    padding: "4px 8px",
                  }}
                >
                  Clear
                </button>
              </div>
            </>
          ) : (
            <>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  margin: "0 0 10px",
                }}
              >
                Type your full name to generate a digital signature.
              </p>
              <input
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Your full name"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "1px solid var(--ff-border)",
                  borderRadius: 8,
                  background: "var(--bg-base)",
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  marginBottom: 12,
                }}
              />
              {typedName.trim() && (
                <div
                  style={{
                    border: "1.5px solid var(--ff-border)",
                    borderRadius: 8,
                    background: "#fff",
                    padding: "18px 20px",
                    minHeight: 72,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontStyle: "italic",
                      fontSize: 30,
                      letterSpacing: ".03em",
                      color: "#1a1a2e",
                      lineHeight: 1,
                    }}
                  >
                    {typedName}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, padding: "0 24px 20px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "11px 0",
              border: "1px solid var(--ff-border)",
              borderRadius: 8,
              background: "var(--bg-subtle)",
              color: "var(--text-primary)",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={applySignature}
            disabled={!canApply || signDoc.isPending}
            style={{
              flex: 2,
              padding: "11px 0",
              border: "none",
              borderRadius: 8,
              background: "var(--ff-accent)",
              color: "#fff",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 700,
              cursor: canApply && !signDoc.isPending ? "pointer" : "default",
              opacity: canApply && !signDoc.isPending ? 1 : 0.45,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
            }}
          >
            {signDoc.isPending ? (
              "Signing…"
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  width={14}
                  height={14}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 12 5 5L20 7" />
                </svg>
                Apply signature
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Digital Agreement Wizard ──────────────────────────────────────────────────

const AGREEMENT_CLAUSES = [
  "Pets allowed",
  "Parking included",
  "Utilities included in rent",
  "No subletting",
  "No smoking on premises",
  "Quiet hours: 10pm – 6am",
  "Guest policy: max 7 consecutive nights",
  "Landlord may inspect with 24h notice",
]

function DigitalAgreementWizard({
  propertyId,
  propertyTitle,
  propertyRent,
  onClose,
  onCreated,
}: {
  propertyId: string
  propertyTitle: string
  propertyRent: string
  onClose: () => void
  onCreated: (title: string) => void
}) {
  const addDoc = useAddPropertyDoc()

  const [docTitle, setDocTitle] = useState("Tenancy Agreement")
  const [tenantName, setTenantName] = useState("")
  const [property, setProperty] = useState(propertyTitle)
  const [rent, setRent] = useState(propertyRent)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [advanceMonths, setAdvanceMonths] = useState("2")
  const [paymentMethod, setPaymentMethod] = useState("MTN MoMo")
  const [selectedClauses, setSelectedClauses] = useState<string[]>([
    "No subletting",
    "Landlord may inspect with 24h notice",
  ])

  function toggleClause(c: string) {
    setSelectedClauses((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    )
  }

  function handleCreate() {
    const title = docTitle.trim() || "Tenancy Agreement"
    addDoc.mutate(
      {
        propertyId,
        title,
        uploadedOn: "25 Jun 2026",
        landlordSigned: false,
        tenantSigned: false,
        isDigital: true,
        clauses: selectedClauses,
      },
      { onSuccess: () => onCreated(title) }
    )
  }

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid var(--ff-border)",
    borderRadius: 8,
    background: "var(--bg-base)",
    color: "var(--text-primary)",
    fontFamily: "inherit",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: ".06em",
    display: "block",
    marginBottom: 5,
  }
  const sectionStyle: React.CSSProperties = { marginBottom: 22 }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 204,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(3px)",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          zIndex: 205,
          background: "var(--bg-surface)",
          borderRadius: 16,
          width: 560,
          maxHeight: "90vh",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid var(--ff-border)",
            flexShrink: 0,
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
              Create digital agreement
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                margin: "3px 0 0",
              }}
            >
              {propertyTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid var(--ff-border)",
              background: "var(--bg-subtle)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              flexShrink: 0,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={16}
              height={16}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable form */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 24px" }}>
          {/* Document title */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Document title</label>
            <input
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              style={fieldStyle}
            />
          </div>

          {/* Parties */}
          <div
            style={{
              ...sectionStyle,
              background: "var(--bg-base)",
              border: "1px solid var(--ff-border)",
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                color: "var(--ff-accent-strong)",
                marginBottom: 12,
              }}
            >
              Parties
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <label style={labelStyle}>Landlord</label>
                <div
                  style={{
                    ...fieldStyle,
                    background: "var(--bg-subtle)",
                    color: "var(--text-muted)",
                    cursor: "default",
                  }}
                >
                  Kwesi Mensah
                </div>
              </div>
              <div>
                <label style={labelStyle}>Tenant</label>
                <input
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  style={fieldStyle}
                />
              </div>
            </div>
          </div>

          {/* Property */}
          <div
            style={{
              ...sectionStyle,
              background: "var(--bg-base)",
              border: "1px solid var(--ff-border)",
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                color: "var(--ff-accent-strong)",
                marginBottom: 12,
              }}
            >
              Property
            </div>
            <label style={labelStyle}>Address</label>
            <input
              value={property}
              onChange={(e) => setProperty(e.target.value)}
              style={fieldStyle}
            />
          </div>

          {/* Lease terms */}
          <div
            style={{
              ...sectionStyle,
              background: "var(--bg-base)",
              border: "1px solid var(--ff-border)",
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                color: "var(--ff-accent-strong)",
                marginBottom: 12,
              }}
            >
              Lease terms
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <label style={labelStyle}>Monthly rent</label>
                <input
                  value={rent}
                  onChange={(e) => setRent(e.target.value)}
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Advance (months)</label>
                <input
                  value={advanceMonths}
                  onChange={(e) => setAdvanceMonths(e.target.value)}
                  type="number"
                  min={1}
                  max={24}
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Start date</label>
                <input
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>End date</label>
                <input
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={fieldStyle}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Payment method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ ...fieldStyle, appearance: "none" }}
              >
                {[
                  "MTN MoMo",
                  "Vodafone Cash",
                  "AirtelTigo Money",
                  "Bank transfer",
                  "Cheque",
                ].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Clauses */}
          <div
            style={{
              ...sectionStyle,
              background: "var(--bg-base)",
              border: "1px solid var(--ff-border)",
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                color: "var(--ff-accent-strong)",
                marginBottom: 12,
              }}
            >
              Additional clauses
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {AGREEMENT_CLAUSES.map((c) => {
                const checked = selectedClauses.includes(c)
                return (
                  <label
                    key={c}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      padding: "8px 10px",
                      borderRadius: 7,
                      background: checked
                        ? "var(--ff-accent-soft)"
                        : "transparent",
                      border: `1px solid ${checked ? "var(--ff-accent)" : "var(--ff-border)"}`,
                      transition: "all .15s",
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        border: `2px solid ${checked ? "var(--ff-accent)" : "var(--ff-border)"}`,
                        background: checked
                          ? "var(--ff-accent)"
                          : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {checked && (
                        <svg
                          viewBox="0 0 24 24"
                          width={11}
                          height={11}
                          fill="none"
                          stroke="#fff"
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m5 12 5 5L20 7" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleClause(c)}
                      style={{ display: "none" }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: checked ? 600 : 400,
                        color: checked
                          ? "var(--ff-accent-strong)"
                          : "var(--text-primary)",
                      }}
                    >
                      {c}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "14px 24px",
            borderTop: "1px solid var(--ff-border)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "11px 0",
              border: "1px solid var(--ff-border)",
              borderRadius: 8,
              background: "var(--bg-subtle)",
              color: "var(--text-primary)",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!docTitle.trim() || addDoc.isPending}
            style={{
              flex: 2,
              padding: "11px 0",
              border: "none",
              borderRadius: 8,
              background: "var(--ff-accent)",
              color: "#fff",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 700,
              cursor:
                docTitle.trim() && !addDoc.isPending ? "pointer" : "default",
              opacity: docTitle.trim() && !addDoc.isPending ? 1 : 0.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
            }}
          >
            {addDoc.isPending ? (
              "Creating…"
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  width={14}
                  height={14}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Create agreement
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}

// ── DocPreviewModal ───────────────────────────────────────────────────────────

function DocPreviewModal({
  doc,
  tenant,
  property,
  rent,
  start,
  end,
  nextDue,
  onClose,
  onDownload,
}: {
  doc: PropertyDocument
  tenant: string
  property: string
  rent: string
  start: string
  end: string
  nextDue: string
  onClose: () => void
  onDownload: () => void
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 202,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(3px)",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          zIndex: 203,
          background: "var(--bg-surface)",
          borderRadius: 16,
          width: 560,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: "1px solid var(--ff-border)",
            flexShrink: 0,
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
              {doc.title}
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                margin: "2px 0 0",
              }}
            >
              Preview — {docSignStatus(doc).label}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid var(--ff-border)",
              background: "var(--bg-subtle)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={16}
              height={16}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          <div
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--ff-border)",
              borderRadius: 8,
              padding: "32px 36px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              lineHeight: 1.9,
              color: "var(--text-primary)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                }}
              >
                Tenancy Agreement
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 4,
                }}
              >
                Republic of Ghana · Rent Control Compliant
              </div>
            </div>
            <Section title="PARTIES">
              <Row label="Landlord" value="Kwesi Mensah (Verified)" />
              <Row label="Tenant" value={tenant || "— To be assigned —"} />
            </Section>
            <Section title="PROPERTY">
              <Row label="Address" value={property} />
              <Row label="Type" value="Residential" />
            </Section>
            <Section title="LEASE TERMS">
              <Row label="Monthly rent" value={rent || "—"} />
              <Row
                label="Commencement"
                value={start || "— On lease creation —"}
              />
              <Row label="Expiry" value={end || "— On lease creation —"} />
              <Row label="Next payment" value={nextDue || "—"} />
              <Row label="Payment method" value="MTN MoMo / Bank transfer" />
            </Section>
            {doc.clauses && doc.clauses.length > 0 && (
              <Section title="SPECIAL CLAUSES">
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    lineHeight: 1.8,
                  }}
                >
                  {doc.clauses.map((c) => (
                    <div key={c}>· {c}</div>
                  ))}
                </div>
              </Section>
            )}
            <Section title="OBLIGATIONS">
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  lineHeight: 1.8,
                }}
              >
                <div>
                  · Tenant shall maintain the property in good condition.
                </div>
                <div>
                  · Landlord shall be responsible for structural repairs.
                </div>
                <div>· Rent is due on the 1st of each calendar month.</div>
                <div>
                  · A penalty of 10% applies on rent overdue by 7+ days.
                </div>
                <div>
                  · Notice period for termination: 30 days by either party.
                </div>
              </div>
            </Section>
            <Section title="SIGNATURES">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 24,
                  marginTop: 8,
                }}
              >
                <SignatureBlock
                  role="Landlord"
                  name="Kwesi Mensah"
                  date={doc.landlordSigned ? doc.uploadedOn : undefined}
                  signed={doc.landlordSigned}
                />
                <SignatureBlock
                  role="Tenant"
                  name={tenant || "—"}
                  date={doc.tenantSigned ? doc.uploadedOn : undefined}
                  signed={doc.tenantSigned}
                />
              </div>
            </Section>
          </div>
        </div>

        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--ff-border)",
            display: "flex",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px 0",
              border: "1px solid var(--ff-border)",
              borderRadius: 8,
              background: "var(--bg-subtle)",
              color: "var(--text-primary)",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
          <button
            onClick={onDownload}
            style={{
              flex: 1,
              padding: "10px 0",
              border: "none",
              borderRadius: 8,
              background: "var(--ff-accent)",
              color: "#fff",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={14}
              height={14}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download
          </button>
        </div>
      </div>
    </>
  )
}

// ── Property Documents Panel (full management) ────────────────────────────────

function PropertyDocsPanel({
  listing,
  onClose,
}: {
  listing: LordListingItem
  onClose: () => void
}) {
  const { data: docs = [], isLoading } = usePropertyDocs(listing.id)
  const uploadDoc = useUploadDocument()

  const [previewDoc, setPreviewDoc] = useState<PropertyDocument | null>(null)
  const [signingDoc, setSigningDoc] = useState<PropertyDocument | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showDigitalForm, setShowDigitalForm] = useState(false)
  const [uploadTitle, setUploadTitle] = useState("Tenancy Agreement")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [panelToast, setPanelToast] = useState<{
    msg: string
    success: boolean
  } | null>(null)

  function showToast(msg: string, success = true) {
    setPanelToast({ msg, success })
    setTimeout(() => setPanelToast(null), 3000)
  }

  function handleDownload(doc: PropertyDocument) {
    showToast(`"${doc.title}" is ready to download`)
  }

  function handleUpload() {
    if (!uploadTitle.trim() || !uploadFile) return
    uploadDoc.mutate(
      { propertyId: listing.id, title: uploadTitle.trim(), file: uploadFile },
      {
        onSuccess: () => {
          showToast(`"${uploadTitle.trim()}" uploaded successfully`)
          setShowUpload(false)
          setUploadTitle("Tenancy Agreement")
          setUploadFile(null)
        },
        onError: () => {
          showToast("Upload failed — please try again", false)
        },
      }
    )
  }

  const propertyLabel = `${listing.title} · ${listing.area}`

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(2px)",
        }}
      />

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 520,
          height: "100vh",
          zIndex: 201,
          background: "var(--bg-surface)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid var(--ff-border)",
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                margin: 0,
                letterSpacing: "-.01em",
              }}
            >
              Property documents
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                margin: "3px 0 0",
              }}
            >
              {listing.title} · {listing.area}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: "1px solid var(--ff-border)",
              background: "var(--bg-subtle)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              flexShrink: 0,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={17}
              height={17}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {isLoading ? (
            <div
              style={{
                color: "var(--text-muted)",
                fontSize: 14,
                textAlign: "center",
                padding: 32,
              }}
            >
              Loading…
            </div>
          ) : docs.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 32,
                color: "var(--text-muted)",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                No documents yet
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                Attach a tenancy agreement so tenants can review it before
                applying.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginBottom: 16,
              }}
            >
              {docs.map((doc) => {
                const sig = docSignStatus(doc)
                return (
                  <div
                    key={doc.id}
                    style={{
                      border: "1px solid var(--ff-border)",
                      borderRadius: 12,
                      background: "var(--bg-base)",
                      padding: "16px 18px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 42,
                          borderRadius: 6,
                          background: "var(--ff-accent-soft)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width={17}
                          height={17}
                          fill="none"
                          stroke="var(--ff-accent-strong)"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 2,
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 700 }}>
                            {doc.title}
                          </span>
                          {doc.isDigital && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: "var(--ff-accent-soft)",
                                color: "var(--ff-accent-strong)",
                              }}
                            >
                              Digital
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 999,
                              color: "#fff",
                              background: sig.color,
                              marginLeft: "auto",
                              flexShrink: 0,
                            }}
                          >
                            {sig.label}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            marginBottom: 10,
                          }}
                        >
                          Added {doc.uploadedOn}
                        </div>

                        <div
                          style={{ display: "flex", gap: 8, marginBottom: 10 }}
                        >
                          {[
                            { role: "Landlord", signed: doc.landlordSigned },
                            { role: "Tenant", signed: doc.tenantSigned },
                          ].map(({ role, signed }) => (
                            <div
                              key={role}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                fontSize: 12,
                              }}
                            >
                              <div
                                style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: "50%",
                                  background: signed
                                    ? "var(--state-success)"
                                    : "var(--bg-subtle)",
                                  border: signed
                                    ? "none"
                                    : "1px solid var(--ff-border)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {signed ? (
                                  <svg
                                    viewBox="0 0 24 24"
                                    width={9}
                                    height={9}
                                    fill="none"
                                    stroke="#fff"
                                    strokeWidth={3}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="m5 12 5 5L20 7" />
                                  </svg>
                                ) : (
                                  <svg
                                    viewBox="0 0 24 24"
                                    width={9}
                                    height={9}
                                    fill="none"
                                    stroke="var(--text-muted)"
                                    strokeWidth={2.5}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <circle cx={12} cy={12} r={4} />
                                  </svg>
                                )}
                              </div>
                              <span
                                style={{
                                  color: signed
                                    ? "var(--state-success)"
                                    : "var(--text-muted)",
                                  fontWeight: 600,
                                }}
                              >
                                {role} {signed ? "signed" : "pending"}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div
                          style={{ display: "flex", flexWrap: "wrap", gap: 7 }}
                        >
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              background: "var(--bg-subtle)",
                              border: "1px solid var(--ff-border)",
                              borderRadius: 7,
                              padding: "6px 11px",
                              fontFamily: "inherit",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              color: "var(--text-primary)",
                            }}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width={11}
                              height={11}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx={12} cy={12} r={3} />
                            </svg>
                            Preview
                          </button>
                          <button
                            onClick={() => handleDownload(doc)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              background: "var(--bg-subtle)",
                              border: "1px solid var(--ff-border)",
                              borderRadius: 7,
                              padding: "6px 11px",
                              fontFamily: "inherit",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              color: "var(--text-primary)",
                            }}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width={11}
                              height={11}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                            </svg>
                            Download
                          </button>
                          {!doc.landlordSigned && (
                            <button
                              onClick={() => setSigningDoc(doc)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                background: "var(--ff-accent)",
                                border: "none",
                                borderRadius: 7,
                                padding: "6px 11px",
                                fontFamily: "inherit",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                color: "#fff",
                              }}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                width={11}
                                height={11}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2.2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                              Sign now
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {showUpload ? (
            <div
              style={{
                border: "1px solid var(--ff-border)",
                borderRadius: 12,
                background: "var(--bg-base)",
                padding: "18px 18px 14px",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                Upload document
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 5,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: ".05em",
                }}
              >
                Document title
              </div>
              <input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="e.g. Tenancy Agreement"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  border: "1px solid var(--ff-border)",
                  borderRadius: 8,
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontFamily: "inherit",
                  fontSize: 14,
                  outline: "none",
                  marginBottom: 12,
                  boxSizing: "border-box",
                }}
              />
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  border: "1.5px dashed var(--ff-border)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  cursor: "pointer",
                  marginBottom: 14,
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                  <path d="M14 2v6h6M12 12v6M9 15l3-3 3 3" />
                </svg>
                <span
                  style={{
                    fontSize: 13,
                    color: uploadFile
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                  }}
                >
                  {uploadFile?.name ?? "Click to select a PDF file"}
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  style={{ display: "none" }}
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    setShowUpload(false)
                    setUploadTitle("Tenancy Agreement")
                    setUploadFile(null)
                  }}
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    border: "1px solid var(--ff-border)",
                    borderRadius: 8,
                    background: "var(--bg-subtle)",
                    color: "var(--text-muted)",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={
                    !uploadTitle.trim() || !uploadFile || uploadDoc.isPending
                  }
                  style={{
                    flex: 2,
                    padding: "9px 0",
                    border: "none",
                    borderRadius: 8,
                    background: "var(--ff-accent)",
                    color: "#fff",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor:
                      uploadTitle.trim() && uploadFile ? "pointer" : "default",
                    opacity:
                      uploadTitle.trim() && uploadFile && !uploadDoc.isPending
                        ? 1
                        : 0.5,
                  }}
                >
                  {uploadDoc.isPending ? "Uploading…" : "Upload document"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowUpload(true)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  padding: "11px 0",
                  border: "1.5px dashed var(--ff-border)",
                  borderRadius: 10,
                  background: "none",
                  color: "var(--text-muted)",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={13}
                  height={13}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                  <path d="M14 2v6h6M12 12v6M9 15l3-3 3 3" />
                </svg>
                Upload PDF
              </button>
              <button
                onClick={() => setShowDigitalForm(true)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  padding: "11px 0",
                  border: "none",
                  borderRadius: 10,
                  background: "var(--ff-accent)",
                  color: "#fff",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={13}
                  height={13}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                Create digital agreement
              </button>
            </div>
          )}
        </div>

        {panelToast && (
          <div
            style={{
              position: "absolute",
              bottom: 20,
              left: 20,
              right: 20,
              background: panelToast.success
                ? "var(--state-success)"
                : "var(--state-warn)",
              color: "#fff",
              padding: "11px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "var(--shadow-md)",
              animation: "ff-slide-up .2s ease",
              zIndex: 10,
            }}
          >
            {panelToast.msg}
          </div>
        )}
      </div>

      {previewDoc && (
        <DocPreviewModal
          doc={previewDoc}
          tenant="— To be assigned on lease creation —"
          property={propertyLabel}
          rent={`₵${listing.rent}`}
          start=""
          end=""
          nextDue=""
          onClose={() => setPreviewDoc(null)}
          onDownload={() => {
            handleDownload(previewDoc)
            setPreviewDoc(null)
          }}
        />
      )}

      {signingDoc && (
        <SignatureModal
          doc={signingDoc}
          onClose={() => setSigningDoc(null)}
          onSigned={() => {
            showToast("Document signed successfully")
            setSigningDoc(null)
          }}
        />
      )}

      {showDigitalForm && (
        <DigitalAgreementWizard
          propertyId={listing.id}
          propertyTitle={propertyLabel}
          propertyRent={`₵${listing.rent}`}
          onClose={() => setShowDigitalForm(false)}
          onCreated={(title) => {
            showToast(`"${title}" created — ready to sign`)
            setShowDigitalForm(false)
          }}
        />
      )}
    </>
  )
}

// ── Documents view ────────────────────────────────────────────────────────────

const _docViewStatusColors: Record<LordListingItem["status"], string> = {
  Live: "var(--state-success)",
  Occupied: "var(--ff-accent)",
  Draft: "var(--text-muted)",
}

function PropertyDocRow({
  listing,
  onManage,
}: {
  listing: LordListingItem
  onManage: () => void
}) {
  const { data: docs = [] } = usePropertyDocs(listing.id)
  const fullySignedCount = docs.filter(
    (d) => d.landlordSigned && d.tenantSigned
  ).length
  const pendingCount = docs.filter(
    (d) => !d.landlordSigned || !d.tenantSigned
  ).length

  return (
    <div
      style={{
        border: "1px solid var(--ff-border)",
        borderRadius: 12,
        background: "var(--bg-surface)",
        overflow: "hidden",
      }}
    >
      {/* Property header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 20px",
          borderBottom: docs.length > 0 ? "1px solid var(--ff-border)" : "none",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: "var(--ff-accent-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <HouseIcon />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 2,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700 }}>
              {listing.title}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
                color: "#fff",
                background: _docViewStatusColors[listing.status],
              }}
            >
              {listing.status}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {listing.area} · {listing.type} · {listing.beds}bd {listing.baths}ba
            {docs.length > 0 && (
              <span
                style={{
                  marginLeft: 10,
                  color: "var(--text-primary)",
                  fontWeight: 600,
                }}
              >
                {docs.length} document{docs.length !== 1 ? "s" : ""}
                {fullySignedCount > 0 && (
                  <span
                    style={{ color: "var(--state-success)", marginLeft: 6 }}
                  >
                    · {fullySignedCount} signed
                  </span>
                )}
                {pendingCount > 0 && (
                  <span style={{ color: "var(--state-warn)", marginLeft: 6 }}>
                    · {pendingCount} pending
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onManage}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            border: "1px solid var(--ff-border)",
            borderRadius: 8,
            background: "var(--bg-subtle)",
            color: "var(--text-primary)",
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width={13}
            height={13}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6" />
          </svg>
          Manage documents
        </button>
      </div>

      {/* Doc chips */}
      {docs.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            padding: "12px 20px",
          }}
        >
          {docs.map((doc) => {
            const sig = docSignStatus(doc)
            return (
              <div
                key={doc.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: "var(--bg-base)",
                  border: "1px solid var(--ff-border)",
                  fontSize: 12,
                }}
              >
                {doc.isDigital ? (
                  <svg
                    viewBox="0 0 24 24"
                    width={11}
                    height={11}
                    fill="none"
                    stroke="var(--ff-accent-strong)"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    width={11}
                    height={11}
                    fill="none"
                    stroke="var(--text-muted)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                    <path d="M14 2v6h6" />
                  </svg>
                )}
                <span style={{ fontWeight: 600 }}>{doc.title}</span>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: sig.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "var(--text-muted)" }}>{sig.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {docs.length === 0 && (
        <div
          style={{
            padding: "10px 20px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            No documents attached yet.
          </span>
          <button
            onClick={onManage}
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--ff-accent-strong)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: 0,
            }}
          >
            Add one →
          </button>
        </div>
      )}
    </div>
  )
}

export function LordDocumentsView() {
  const { data: listings = [], isLoading } = useListings()
  const [activeListing, setActiveListing] = useState<LordListingItem | null>(
    null
  )

  return (
    <>
      <div
        style={{ maxWidth: 960, margin: "0 auto", padding: "28px 32px 48px" }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: "-.02em",
            margin: "0 0 4px",
          }}
        >
          Documents
        </h1>
        <p
          style={{
            color: "var(--text-muted)",
            margin: "0 0 24px",
            fontSize: 14,
          }}
        >
          Manage tenancy agreements for each property. Tenants can review
          attached documents before applying and signing.
        </p>

        {isLoading ? (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: 14,
              textAlign: "center",
              padding: 48,
            }}
          >
            Loading…
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {listings.map((listing) => (
              <PropertyDocRow
                key={listing.id}
                listing={listing}
                onManage={() => setActiveListing(listing)}
              />
            ))}
          </div>
        )}
      </div>

      {activeListing && (
        <PropertyDocsPanel
          listing={activeListing}
          onClose={() => setActiveListing(null)}
        />
      )}
    </>
  )
}

// ── Maintenance Tickets ───────────────────────────────────────────────────────

export function LordTicketsView() {
  const { data: tickets = [], isLoading } = useTickets()
  const { data: serviceProviders = [] } = useServiceProviders()
  const assignMutation = useAssignArtisan()

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)

  function handleAssign(ticketId: string, artisanId: string) {
    assignMutation.mutate(
      { ticketId, artisanId },
      { onSuccess: () => setAssigningId(null) }
    )
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <>
      <div
        style={{ maxWidth: 1040, margin: "0 auto", padding: "28px 32px 48px" }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: "-.02em",
            margin: "0 0 4px",
          }}
        >
          Maintenance tickets
        </h1>
        <p
          style={{
            color: "var(--text-muted)",
            margin: "0 0 24px",
            fontSize: 14,
          }}
        >
          Tenant-logged issues routed to verified artisans.
        </p>

        {isLoading ? (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: 14,
              textAlign: "center",
              padding: 40,
            }}
          >
            Loading…
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {tickets.map((t) => (
              <div
                key={t.id}
                style={{
                  border: "1px solid var(--ff-border)",
                  borderRadius: 12,
                  background: "var(--bg-surface)",
                  overflow: "hidden",
                }}
              >
                {/* Main row */}
                <div style={{ padding: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
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
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontSize: 16, fontWeight: 700 }}>
                          {t.issue}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: 999,
                            color: "#fff",
                            background: t.statusColor,
                          }}
                        >
                          {t.status}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--text-muted)",
                          marginBottom: 8,
                        }}
                      >
                        {t.property} · Tenant: {t.tenant} · {t.category} ·{" "}
                        {t.date}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 13,
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width={14}
                          height={14}
                          fill="none"
                          stroke="var(--ff-accent)"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx={12} cy={12} r={9} />
                          <path d="m9 12 2 2 4-4" />
                        </svg>
                        <span style={{ fontWeight: 600 }}>{t.artisan}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => toggleExpand(t.id)}
                        style={{
                          background: "var(--bg-subtle)",
                          border: "1px solid var(--ff-border)",
                          borderRadius: 7,
                          padding: "7px 12px",
                          fontFamily: "inherit",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          color: "var(--text-primary)",
                        }}
                      >
                        {expandedId === t.id ? "Hide" : "View"}
                      </button>
                      {t.status !== "Completed" && (
                        <button
                          onClick={() => setAssigningId(t.id)}
                          style={{
                            background: "var(--ff-accent)",
                            color: "#fff",
                            border: "none",
                            borderRadius: 7,
                            padding: "7px 12px",
                            fontFamily: "inherit",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {t.artisan === "Unassigned" ? "Assign" : "Reassign"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded detail panel */}
                {expandedId === t.id && (
                  <div
                    style={{
                      borderTop: "1px solid var(--ff-border)",
                      background: "var(--bg-subtle)",
                      padding: "16px 20px",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                      }}
                    >
                      {[
                        ["Property", t.property],
                        ["Tenant", t.tenant],
                        ["Category", t.category],
                        ["Reported on", t.date],
                        ["Assigned to", t.artisan],
                        ["Status", t.status],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: ".06em",
                              color: "var(--text-muted)",
                              marginBottom: 2,
                            }}
                          >
                            {label}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Artisan picker modal */}
      {assigningId && (
        <>
          <div
            onClick={() => setAssigningId(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 200,
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(2px)",
            }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              zIndex: 201,
              background: "var(--bg-surface)",
              borderRadius: 16,
              width: 500,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 24px",
                borderBottom: "1px solid var(--ff-border)",
                flexShrink: 0,
              }}
            >
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                  Assign artisan
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    margin: "2px 0 0",
                  }}
                >
                  Select a background-checked service provider
                </p>
              </div>
              <button
                onClick={() => setAssigningId(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "1px solid var(--ff-border)",
                  background: "var(--bg-subtle)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={16}
                  height={16}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              {serviceProviders.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px 0",
                    color: "var(--text-muted)",
                    fontSize: 14,
                  }}
                >
                  No service providers registered yet.
                </div>
              ) : (
                serviceProviders.map((sp) => {
                  const initials = sp.name
                    .trim()
                    .split(/\s+/)
                    .map((w: string) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                  return (
                    <div
                      key={sp.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "14px 0",
                        borderBottom: "1px solid var(--ff-border)",
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
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>
                          {sp.name}
                        </div>
                        {sp.phone && (
                          <div
                            style={{ fontSize: 12, color: "var(--text-muted)" }}
                          >
                            {sp.phone}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleAssign(assigningId!, sp.id)}
                        disabled={assignMutation.isPending}
                        style={{
                          background: "var(--ff-accent)",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          padding: "8px 16px",
                          fontFamily: "inherit",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          opacity: assignMutation.isPending ? 0.6 : 1,
                        }}
                      >
                        {assignMutation.isPending ? "Assigning…" : "Select"}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function HouseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={15}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
    </svg>
  )
}
function CardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={15}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x={2} y={5} width={20} height={14} rx={2} />
      <path d="M2 10h20" />
    </svg>
  )
}
function PeopleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={15}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx={9} cy={8} r={3} />
      <path d="M3 20a6 6 0 0 1 12 0" />
    </svg>
  )
}
function WrenchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={15}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6Z" />
    </svg>
  )
}
