"use client"

import React, { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useApp } from "./context"
import { logout } from "@/app/actions/auth"
import type { AppView, Role } from "./types"
import {
  useTenantApplications,
  usePayments,
  useMaintenanceTickets,
  useKycStatus,
} from "@/hooks/useTenant"
import { useApplications, useTickets } from "@/hooks/useLandlord"

// ── Notification helpers ─────────────────────────────────────────────────────

interface NotifItem {
  id: string
  icon: "shield" | "file" | "card" | "wrench"
  title: string
  body: string
}

function useTenantNotifs(): NotifItem[] {
  const { data: apps = [] } = useTenantApplications()
  const { data: payments = [] } = usePayments()
  const { data: tickets = [] } = useMaintenanceTickets()
  const { data: kyc } = useKycStatus()
  const items: NotifItem[] = []
  if (!kyc || kyc.status === "not_started") {
    items.push({
      id: "kyc",
      icon: "shield",
      title: "Verify your identity",
      body: "Complete KYC to unlock all rental features.",
    })
  } else if (kyc.status === "failed") {
    items.push({
      id: "kyc-fail",
      icon: "shield",
      title: "KYC verification failed",
      body: "Your ID check failed — please retry.",
    })
  }
  const pendingApps = apps.filter((a) => a.status === "Under review")
  if (pendingApps.length) {
    items.push({
      id: "apps",
      icon: "file",
      title: `${pendingApps.length} application${pendingApps.length > 1 ? "s" : ""} under review`,
      body: "Awaiting landlord decisions.",
    })
  }
  const pendingPay = payments.filter((p) => p.status === "pending")
  if (pendingPay.length) {
    items.push({
      id: "pay",
      icon: "card",
      title: "Rent payment in progress",
      body: "Your payment is being processed.",
    })
  }
  const openTickets = tickets.filter((t) => t.status === "open")
  if (openTickets.length) {
    items.push({
      id: "maint",
      icon: "wrench",
      title: `${openTickets.length} open maintenance ticket${openTickets.length > 1 ? "s" : ""}`,
      body: "Awaiting artisan assignment.",
    })
  }
  return items
}

function useLordNotifs(): NotifItem[] {
  const { data: apps = [] } = useApplications()
  const { data: tickets = [] } = useTickets()
  const items: NotifItem[] = []
  const pending = apps.filter((a) => a.appStatus === "pending")
  if (pending.length) {
    items.push({
      id: "apps",
      icon: "file",
      title: `${pending.length} new application${pending.length > 1 ? "s" : ""}`,
      body: "Pending your review.",
    })
  }
  const open = tickets.filter((t) => t.status === "Open")
  if (open.length) {
    items.push({
      id: "tickets",
      icon: "wrench",
      title: `${open.length} maintenance ticket${open.length > 1 ? "s" : ""} open`,
      body: "Needs artisan assignment.",
    })
  }
  return items
}

function notifIcon(icon: NotifItem["icon"]) {
  const p = {
    viewBox: "0 0 24 24",
    width: 16,
    height: 16,
    fill: "none",
    stroke: "var(--ff-accent-strong)",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }
  if (icon === "shield")
    return (
      <svg {...p}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    )
  if (icon === "file")
    return (
      <svg {...p}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M9 13h6M9 17h4" />
      </svg>
    )
  if (icon === "card")
    return (
      <svg {...p}>
        <rect x={2} y={5} width={20} height={14} rx={2} />
        <path d="M2 10h20" />
      </svg>
    )
  return (
    <svg {...p}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6Z" />
    </svg>
  )
}

function NotifList({ items }: { items: NotifItem[] }) {
  if (!items.length) {
    return (
      <div
        style={{
          padding: "32px 0",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: 13,
        }}
      >
        <svg
          style={{ margin: "0 auto 10px", display: "block" }}
          viewBox="0 0 24 24"
          width={28}
          height={28}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a2 2 0 0 0 3.4 0" />
        </svg>
        You're all caught up
      </div>
    )
  }
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--ff-border)",
            display: "flex",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "var(--ff-accent-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {notifIcon(item.icon)}
          </div>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.3,
                marginBottom: 2,
              }}
            >
              {item.title}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                lineHeight: 1.4,
              }}
            >
              {item.body}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function NotifBellShell({ items }: { items: NotifItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 38,
          height: 38,
          borderRadius: 8,
          border: "1px solid var(--ff-border)",
          background: open ? "var(--ff-accent-soft)" : "var(--bg-surface)",
          color: "var(--text-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={18}
          height={18}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a2 2 0 0 0 3.4 0" />
        </svg>
        {!open && items.length > 0 && (
          <span
            style={{
              position: "absolute",
              top: 7,
              right: 8,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--state-error)",
              border: "1.5px solid var(--bg-surface)",
            }}
          />
        )}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 320,
            background: "var(--bg-surface)",
            border: "1px solid var(--ff-border)",
            borderRadius: 12,
            boxShadow: "var(--shadow-lg)",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 16px 10px",
              borderBottom: "1px solid var(--ff-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700 }}>Notifications</span>
            {items.length > 0 && (
              <span
                style={{
                  fontSize: 11,
                  background: "var(--state-error)",
                  color: "#fff",
                  borderRadius: 999,
                  padding: "2px 7px",
                  fontWeight: 700,
                }}
              >
                {items.length}
              </span>
            )}
          </div>
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            <NotifList items={items} />
          </div>
        </div>
      )}
    </div>
  )
}

function TenantNotifBell() {
  return <NotifBellShell items={useTenantNotifs()} />
}

function LordNotifBell() {
  return <NotifBellShell items={useLordNotifs()} />
}

// ── Topbar ──────────────────────────────────────────────────────────────────

function nameInitials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Topbar() {
  const { state, actions } = useApp()
  const { theme, role } = state
  const { data: session } = useSession()
  const userName = session?.user?.name ?? session?.user?.email ?? "User"
  const initials = nameInitials(session?.user?.name)

  return (
    <header
      style={{
        height: 64,
        flexShrink: 0,
        borderBottom: "1px solid var(--ff-border)",
        background: "var(--bg-surface)",
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "0 24px",
        position: "relative",
        zIndex: 30,
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: 208,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "var(--ff-accent)",
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
            <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
            <path d="M9 21v-9h6v9" />
          </svg>
        </div>
        <span
          style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.02em" }}
        >
          FieFind
        </span>
      </div>

      {/* Search */}
      <div
        style={{
          flex: 1,
          maxWidth: 440,
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--bg-subtle)",
          border: "1px solid var(--ff-border)",
          borderRadius: 8,
          padding: "9px 12px",
          color: "var(--text-muted)",
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
          <circle cx={11} cy={11} r={7} />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          placeholder="Search East Legon, Cantonments, Osu…"
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            color: "var(--text-primary)",
            font: "inherit",
            fontSize: 14,
            outline: "none",
          }}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* Theme toggle */}
      <button
        onClick={actions.toggleTheme}
        style={{
          width: 38,
          height: 38,
          borderRadius: 8,
          border: "1px solid var(--ff-border)",
          background: "var(--bg-surface)",
          color: "var(--text-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        {theme === "dark" ? (
          <svg
            viewBox="0 0 24 24"
            width={18}
            height={18}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx={12} cy={12} r={4} />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            width={18}
            height={18}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
          </svg>
        )}
      </button>

      {/* Notifications */}
      {role === "tenant" && <TenantNotifBell />}
      {role === "landlord" && <LordNotifBell />}

      {/* Avatar */}
      <button
        onClick={actions.navProfile}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          paddingLeft: 6,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "inherit",
          font: "inherit",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
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
          {initials}
        </div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{userName}</div>
        </div>
      </button>
    </header>
  )
}

// ── Sidebar ─────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { state, actions } = useApp()
  const { role, view } = state

  function navBtn(
    label: string,
    targetView: AppView,
    icon: React.ReactNode,
    onClick: () => void
  ) {
    const isActive = view === targetView
    return (
      <button
        key={targetView}
        onClick={onClick}
        className="ff-nav-btn"
        style={{
          background: isActive ? "var(--ff-accent-soft)" : "transparent",
          color: isActive ? "var(--ff-accent-strong)" : "var(--text-primary)",
          fontWeight: isActive ? 600 : 500,
        }}
      >
        {icon}
        {label}
      </button>
    )
  }

  const sectionLabel = (text: string, top = false) => (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: ".1em",
        padding: top ? "6px 12px" : "14px 12px 6px",
        fontFamily: "var(--font-mono)",
      }}
    >
      {text}
    </div>
  )

  return (
    <aside
      style={{
        width: 232,
        flexShrink: 0,
        borderRight: "1px solid var(--ff-border)",
        background: "var(--bg-surface)",
        padding: "18px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        overflowY: "auto",
      }}
    >
      {role === "tenant" ? (
        <>
          {sectionLabel("Overview", true)}
          {navBtn("Dashboard", "t_dash", <GridIcon />, actions.navTenantDash)}
          {sectionLabel("Renting")}
          {navBtn(
            "Discover homes",
            "discover",
            <HomeIcon />,
            actions.navDiscover
          )}
          {navBtn("My applications", "t_apps", <FileIcon />, actions.navApps)}
          {navBtn("My lease", "lease", <HouseIcon />, actions.navLease)}
          {sectionLabel("Living")}
          {navBtn("Payments", "payments", <CardIcon />, actions.navPayments)}
          {navBtn(
            "Maintenance",
            "maintenance",
            <WrenchIcon />,
            actions.navMaint
          )}
          {navBtn(
            "Artisan market",
            "marketplace",
            <ShopIcon />,
            actions.navMarket
          )}
          {navBtn(
            "My service requests",
            "my_bookings",
            <FileIcon />,
            actions.navMyBookings
          )}
          {navBtn("Verify identity", "kyc", <ShieldIcon />, actions.navKyc)}
          {sectionLabel("Account")}
          {navBtn("Profile", "profile", <ProfileIcon />, actions.navProfile)}
        </>
      ) : role === "service_provider" ? (
        <>
          {sectionLabel("Work", true)}
          {navBtn(
            "My requests",
            "provider_bookings",
            <WrenchIcon />,
            actions.navProviderBookings
          )}
          {sectionLabel("Account")}
          {navBtn("Profile", "profile", <ProfileIcon />, actions.navProfile)}
        </>
      ) : (
        <>
          {sectionLabel("Portfolio", true)}
          {navBtn("Dashboard", "lord_dash", <GridIcon />, actions.navDash)}
          {navBtn(
            "My listings",
            "lord_listings",
            <HouseIcon />,
            actions.navListings
          )}
          {navBtn(
            "Applications",
            "lord_apps",
            <PeopleIcon />,
            actions.navLordApps
          )}
          {navBtn("Leases", "lord_leases", <FileIcon />, actions.navLeases)}
          {sectionLabel("Operations")}
          {navBtn("Documents", "lord_docs", <FileIcon />, actions.navDocs)}
          {navBtn(
            "Maintenance tickets",
            "lord_tickets",
            <WrenchIcon />,
            actions.navTickets
          )}
          {sectionLabel("Services")}
          {navBtn(
            "Hire a provider",
            "marketplace",
            <ShopIcon />,
            actions.navMarket
          )}
          {navBtn(
            "My service requests",
            "my_bookings",
            <FileIcon />,
            actions.navMyBookings
          )}
          {sectionLabel("Account")}
          {navBtn("Profile", "profile", <ProfileIcon />, actions.navProfile)}
        </>
      )}

      <div style={{ flex: 1 }} />

      {/* Escrow callout */}
      <div
        style={{
          padding: 14,
          borderRadius: 10,
          background: "var(--ff-accent-soft)",
          marginTop: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 13,
            fontWeight: 700,
            color: "var(--ff-accent-strong)",
            marginBottom: 4,
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
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          </svg>
          Protected by escrow
        </div>
        <div
          style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}
        >
          Every cedi is held safely until move-in conditions are met.
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={() => {
          logout()
          actions.signOut()
        }}
        className="ff-nav-btn"
        style={{ color: "var(--text-muted)", fontWeight: 500, marginTop: 4 }}
      >
        <svg
          viewBox="0 0 24 24"
          width={18}
          height={18}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
        Sign out
      </button>
    </aside>
  )
}

// ── AppShell ────────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Topbar />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Sidebar />
        <main
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "auto",
            background: "var(--bg-base)",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

// ── Inline icons ─────────────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx={11} cy={11} r={7} />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}
function FileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M9 13h6M9 17h4" />
    </svg>
  )
}
function HouseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
      <path d="M9 21v-9h6v9" />
    </svg>
  )
}
function CardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
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
function WrenchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
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
function ShopIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9 4 4h16l1 5" />
      <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
      <path d="M9 20v-6h6v6" />
    </svg>
  )
}
function GridIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x={3} y={3} width={7} height={9} rx={1} />
      <rect x={14} y={3} width={7} height={5} rx={1} />
      <rect x={14} y={12} width={7} height={9} rx={1} />
      <rect x={3} y={16} width={7} height={5} rx={1} />
    </svg>
  )
}
function PeopleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx={9} cy={8} r={3} />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 6a3 3 0 0 1 0 6M19.5 20a6 6 0 0 0-3.5-5.4" />
    </svg>
  )
}
function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
function ProfileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx={12} cy={8} r={4} />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}
