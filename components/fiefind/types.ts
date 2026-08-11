export type Role = "tenant" | "landlord" | "service_provider"
export type AuthStep = "login" | "signup" | "verify"
export type Theme = "light" | "dark"

export type TenantView =
  | "t_dash"
  | "discover"
  | "listing"
  | "walk"
  | "apply"
  | "bgcheck"
  | "sign"
  | "escrow"
  | "paid"
  | "t_apps"
  | "app_track"
  | "lease"
  | "payments"
  | "maintenance"
  | "marketplace"
  | "service"
  | "my_bookings"
  | "kyc"
  | "profile"

export type LandlordView =
  | "lord_dash"
  | "lord_listings"
  | "lord_apps"
  | "lord_leases"
  | "lord_tickets"
  | "lord_docs"
  | "profile"

export type ProviderView = "provider_bookings" | "profile"

export type AppView = TenantView | LandlordView | ProviderView

export interface Landlord {
  name: string
  initials: string
  since: string
  rating: string
}

export interface Property {
  id: string
  title: string
  type: string
  area: string
  region: string
  beds: number
  baths: number
  sqft: number
  priceLabel: string
  priceShort: string
  advance: string
  escrowLabel: string
  escrowTotal: string
  serviceFee: string
  desc: string
  amenities: string[]
  landlord: Landlord
  pinX: number
  pinY: number
  ghanaPostGps?: string
  streetAddress?: string
}

export interface TenantApp {
  id: string
  property: string
  area: string
  price: string
  landlord: string
  bg: string
  date: string
  status: string
  statusColor: string
  propertyId?: string
}

export interface Payment {
  id: string
  label: string
  date: string
  method: string
  amount: string
  status: string
  color: string
}

export interface MaintenanceTicket {
  id: string
  title: string
  category: string
  date: string
  artisan: string
  status: string
  color: string
}

export interface Artisan {
  id: string
  name: string
  initials: string
  trade: string
  rating: string
  jobs: string
  area: string
  rate: string
  badge: string | null
}

export interface LordApp {
  id: string
  tenant: string
  initials: string
  property: string
  date: string
  income: string
  bgStatus: string
  bgColor: string
}

export interface LordLease {
  id: string
  propertyId: string
  tenant: string
  initials: string
  property: string
  rent: string
  rentPesewas: number
  start: string
  end: string
  nextDue: string
  status: string
  statusColor: string
}

export interface LordTicket {
  id: string
  property: string
  tenant: string
  issue: string
  category: string
  date: string
  artisan: string
  status: string
  statusColor: string
}

export interface LordListingItem {
  id: string
  title: string
  type: string
  area: string
  region: string
  beds: number
  baths: number
  sqft: string
  rent: string
  advance: number
  desc: string
  amenities: string[]
  status: "Live" | "Occupied" | "Draft"
  ghanaPostGps?: string
  streetAddress?: string
  pinX?: number
  pinY?: number
}

export interface LordAppWithStatus extends LordApp {
  appStatus: "pending" | "approved" | "declined"
}

export interface PropertyDocument {
  id: string
  propertyId: string
  title: string
  uploadedOn: string
  landlordSigned: boolean
  tenantSigned: boolean
  isDigital?: boolean
  clauses?: string[]
  downloadUrl?: string | null
}

export interface AppState {
  loggedIn: boolean
  authStep: AuthStep
  role: Role
  view: AppView
  theme: Theme
  walkRoom: number
  panVal: number
  selectedProperty: Property | null
  selectedArtisan: Artisan | null
  selectedApp: TenantApp | null
}

export interface AppActions {
  signIn: () => void
  signOut: () => void
  setSession: (role: Role) => void
  goSignup: () => void
  goLogin: () => void
  goVerify: () => void
  finishVerify: () => void
  toTenant: () => void
  toLandlord: () => void
  toggleTheme: () => void
  navTenantDash: () => void
  navDiscover: () => void
  navApps: () => void
  navLease: () => void
  navPayments: () => void
  navMaint: () => void
  navMarket: () => void
  navMyBookings: () => void
  navKyc: () => void
  navProfile: () => void
  navDash: () => void
  navListings: () => void
  navLordApps: () => void
  navLeases: () => void
  navTickets: () => void
  navDocs: () => void
  navProviderBookings: () => void
  openListing: (p: Property) => void
  openWalk: () => void
  closeWalk: () => void
  startApply: () => void
  goBgcheck: () => void
  goSign: () => void
  goEscrow: () => void
  payNow: () => void
  backToMarket: () => void
  goService: () => void
  walkNext: () => void
  walkTo: (i: number) => void
  setPan: (v: number) => void
  selectArtisan: (a: Artisan) => void
  openApp: (a: TenantApp) => void
}
