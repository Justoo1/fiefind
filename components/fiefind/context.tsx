"use client"

import React, { createContext, useContext, useReducer } from "react"
import type {
  AppState,
  AppActions,
  AppView,
  Property,
  Role,
  AuthStep,
  Artisan,
  TenantApp,
} from "./types"
import { PROPERTIES, WALK_ROOMS } from "./data"

type Action =
  | { type: "LOGIN" }
  | { type: "LOGOUT" }
  | { type: "SET_SESSION"; role: Role }
  | { type: "SET_AUTH_STEP"; step: AuthStep }
  | { type: "SET_ROLE"; role: Role }
  | { type: "SET_VIEW"; view: AppView }
  | { type: "TOGGLE_THEME" }
  | { type: "OPEN_LISTING"; property: Property }
  | { type: "WALK_NEXT" }
  | { type: "WALK_TO"; room: number }
  | { type: "SET_PAN"; val: number }
  | { type: "SELECT_ARTISAN"; artisan: Artisan }
  | { type: "OPEN_APP"; app: TenantApp; property: Property | null }

const initialState: AppState = {
  loggedIn: false,
  authStep: "login",
  role: "tenant",
  view: "t_dash",
  theme: "light",
  walkRoom: 0,
  panVal: 30,
  selectedProperty: PROPERTIES[0],
  selectedArtisan: null,
  selectedApp: null,
}

function landingViewForRole(role: Role): AppView {
  if (role === "landlord") return "lord_dash"
  if (role === "service_provider") return "provider_bookings"
  return "t_dash"
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "LOGIN":
      return { ...state, loggedIn: true }
    case "LOGOUT":
      return { ...initialState }
    case "SET_SESSION":
      if (state.loggedIn && state.role === action.role) return state
      return {
        ...state,
        loggedIn: true,
        role: action.role,
        view: landingViewForRole(action.role),
      }
    case "SET_AUTH_STEP":
      return { ...state, authStep: action.step }
    case "SET_ROLE":
      return {
        ...state,
        role: action.role,
        view: landingViewForRole(action.role),
      }
    case "SET_VIEW":
      return { ...state, view: action.view }
    case "TOGGLE_THEME":
      return { ...state, theme: state.theme === "light" ? "dark" : "light" }
    case "OPEN_LISTING":
      return { ...state, selectedProperty: action.property, view: "listing" }
    case "WALK_NEXT":
      return { ...state, walkRoom: (state.walkRoom + 1) % WALK_ROOMS.length }
    case "WALK_TO":
      return { ...state, walkRoom: action.room }
    case "SET_PAN":
      return { ...state, panVal: action.val }
    case "SELECT_ARTISAN":
      return { ...state, selectedArtisan: action.artisan, view: "service" }
    case "OPEN_APP":
      return {
        ...state,
        selectedApp: action.app,
        selectedProperty: action.property ?? state.selectedProperty,
        view: "app_track",
      }
    default:
      return state
  }
}

interface AppContextValue {
  state: AppState
  actions: AppActions
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const actions: AppActions = {
    signIn: () => dispatch({ type: "LOGIN" }),
    signOut: () => dispatch({ type: "LOGOUT" }),
    setSession: (role) => dispatch({ type: "SET_SESSION", role }),
    goSignup: () => dispatch({ type: "SET_AUTH_STEP", step: "signup" }),
    goLogin: () => dispatch({ type: "SET_AUTH_STEP", step: "login" }),
    goVerify: () => dispatch({ type: "SET_AUTH_STEP", step: "verify" }),
    finishVerify: () => dispatch({ type: "LOGIN" }),
    toTenant: () => dispatch({ type: "SET_ROLE", role: "tenant" }),
    toLandlord: () => dispatch({ type: "SET_ROLE", role: "landlord" }),
    toggleTheme: () => dispatch({ type: "TOGGLE_THEME" }),
    navTenantDash: () => dispatch({ type: "SET_VIEW", view: "t_dash" }),
    navDiscover: () => dispatch({ type: "SET_VIEW", view: "discover" }),
    navApps: () => dispatch({ type: "SET_VIEW", view: "t_apps" }),
    navLease: () => dispatch({ type: "SET_VIEW", view: "lease" }),
    navPayments: () => dispatch({ type: "SET_VIEW", view: "payments" }),
    navMaint: () => dispatch({ type: "SET_VIEW", view: "maintenance" }),
    navMarket: () => dispatch({ type: "SET_VIEW", view: "marketplace" }),
    navKyc: () => dispatch({ type: "SET_VIEW", view: "kyc" }),
    navProfile: () => dispatch({ type: "SET_VIEW", view: "profile" }),
    navDash: () => dispatch({ type: "SET_VIEW", view: "lord_dash" }),
    navListings: () => dispatch({ type: "SET_VIEW", view: "lord_listings" }),
    navLordApps: () => dispatch({ type: "SET_VIEW", view: "lord_apps" }),
    navLeases: () => dispatch({ type: "SET_VIEW", view: "lord_leases" }),
    navTickets: () => dispatch({ type: "SET_VIEW", view: "lord_tickets" }),
    navDocs: () => dispatch({ type: "SET_VIEW", view: "lord_docs" }),
    navProviderBookings: () =>
      dispatch({ type: "SET_VIEW", view: "provider_bookings" }),
    openListing: (p) => dispatch({ type: "OPEN_LISTING", property: p }),
    openWalk: () => dispatch({ type: "SET_VIEW", view: "walk" }),
    closeWalk: () => dispatch({ type: "SET_VIEW", view: "listing" }),
    startApply: () => dispatch({ type: "SET_VIEW", view: "apply" }),
    goBgcheck: () => dispatch({ type: "SET_VIEW", view: "bgcheck" }),
    goSign: () => dispatch({ type: "SET_VIEW", view: "sign" }),
    goEscrow: () => dispatch({ type: "SET_VIEW", view: "escrow" }),
    payNow: () => dispatch({ type: "SET_VIEW", view: "paid" }),
    backToMarket: () => dispatch({ type: "SET_VIEW", view: "marketplace" }),
    goService: () => dispatch({ type: "SET_VIEW", view: "service" }),
    walkNext: () => dispatch({ type: "WALK_NEXT" }),
    walkTo: (i) => dispatch({ type: "WALK_TO", room: i }),
    setPan: (v) => dispatch({ type: "SET_PAN", val: v }),
    selectArtisan: (a) => dispatch({ type: "SELECT_ARTISAN", artisan: a }),
    openApp: (a) => {
      const property = a.propertyId
        ? (PROPERTIES.find((p) => p.id === a.propertyId) ?? null)
        : null
      dispatch({ type: "OPEN_APP", app: a, property })
    },
  }

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
