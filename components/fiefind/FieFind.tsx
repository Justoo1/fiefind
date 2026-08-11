"use client"

import React, { useEffect } from "react"
import { useSession } from "next-auth/react"
import { AppProvider, useApp } from "./context"
import { AuthPage } from "./auth"
import { AppShell } from "./shell"

// Tenant views
import { DiscoverView } from "./tenant-discover"
import { ListingDetailView } from "./tenant-listing"
import { WalkthroughView } from "./tenant-walkthrough"
import {
  ApplyView,
  BgCheckView,
  SignAgreementView,
  EscrowPaymentView,
  PaidView,
} from "./tenant-lease-flow"
import {
  TenantDashboardView,
  ApplicationsView,
  AppTrackingView,
  MyLeaseView,
  PaymentsView,
  MaintenanceView,
  MarketplaceView,
  ServiceRequestView,
  KycView,
  ProfileView,
} from "./tenant-portals"

// Landlord views
import {
  LordDashboardView,
  LordListingsView,
  LordApplicationsView,
  LordLeasesView,
  LordTicketsView,
  LordDocumentsView,
} from "./landlord-portals"

const LIGHT_TOKENS: React.CSSProperties = {
  "--ff-accent": "#047857",
  "--ff-accent-soft": "#ecfdf5",
  "--ff-accent-strong": "#065f46",
  "--bg-base": "#f9fafb",
  "--bg-surface": "#ffffff",
  "--bg-subtle": "#f3f4f6",
  "--text-primary": "#111827",
  "--text-muted": "#6b7280",
  "--ff-border": "#e5e7eb",
  "--state-error": "#dc2626",
  "--state-success": "#10b981",
  "--state-warn": "#d97706",
  "--ph-a": "#eef1f4",
  "--ph-b": "#e4e9ef",
  "--shadow-sm": "0 1px 2px rgba(16,24,40,.06)",
  "--shadow-md": "0 4px 14px rgba(16,24,40,.08)",
  "--shadow-lg": "0 16px 40px rgba(16,24,40,.16)",
} as React.CSSProperties

const DARK_TOKENS: React.CSSProperties = {
  "--ff-accent": "#10b981",
  "--ff-accent-soft": "#0e2a21",
  "--ff-accent-strong": "#34d399",
  "--bg-base": "#0b0f14",
  "--bg-surface": "#141a21",
  "--bg-subtle": "#1b232d",
  "--text-primary": "#f3f4f6",
  "--text-muted": "#9aa7b4",
  "--ff-border": "#262f3a",
  "--state-error": "#f87171",
  "--state-success": "#34d399",
  "--state-warn": "#fbbf24",
  "--ph-a": "#19212b",
  "--ph-b": "#212b36",
  "--shadow-sm": "0 1px 2px rgba(0,0,0,.4)",
  "--shadow-md": "0 6px 18px rgba(0,0,0,.5)",
  "--shadow-lg": "0 18px 44px rgba(0,0,0,.6)",
} as React.CSSProperties

function AppContent() {
  const { state, actions } = useApp()
  const { loggedIn, theme, view } = state
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      actions.setSession(session.user.role as "tenant" | "landlord")
    } else if (status === "unauthenticated" && loggedIn) {
      actions.signOut()
    }
  }, [status, session?.user?.role]) // eslint-disable-line react-hooks/exhaustive-deps
  const tokens = theme === "dark" ? DARK_TOKENS : LIGHT_TOKENS

  if (!loggedIn) {
    return (
      <div data-theme={theme} style={tokens}>
        <AuthPage />
      </div>
    )
  }

  return (
    <div
      data-theme={theme}
      style={{
        ...tokens,
        minHeight: "100vh",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <AppShell>
        {view === "walk" ? (
          <WalkthroughView />
        ) : (
          <div style={{ padding: 0 }}>
            {view === "t_dash" && <TenantDashboardView />}
            {view === "kyc" && <KycView />}
            {view === "discover" && <DiscoverView />}
            {view === "listing" && <ListingDetailView />}
            {view === "apply" && <ApplyView />}
            {view === "bgcheck" && <BgCheckView />}
            {view === "sign" && <SignAgreementView />}
            {view === "escrow" && <EscrowPaymentView />}
            {view === "paid" && <PaidView />}
            {view === "t_apps" && <ApplicationsView />}
            {view === "app_track" && <AppTrackingView />}
            {view === "lease" && <MyLeaseView />}
            {view === "payments" && <PaymentsView />}
            {view === "maintenance" && <MaintenanceView />}
            {view === "marketplace" && <MarketplaceView />}
            {view === "service" && <ServiceRequestView />}
            {view === "lord_dash" && <LordDashboardView />}
            {view === "lord_listings" && <LordListingsView />}
            {view === "lord_apps" && <LordApplicationsView />}
            {view === "lord_leases" && <LordLeasesView />}
            {view === "lord_tickets" && <LordTicketsView />}
            {view === "lord_docs" && <LordDocumentsView />}
            {view === "profile" && <ProfileView />}
          </div>
        )}
      </AppShell>
    </div>
  )
}

export function FieFind() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
