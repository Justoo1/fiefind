import type {
  LordListingItem,
  LordAppWithStatus,
  LordLease,
  LordTicket,
  PropertyDocument,
} from "@/components/fiefind/types"
import {
  PROPERTIES,
  LORD_APPS,
  LORD_LEASES,
  LORD_TICKETS,
} from "@/components/fiefind/data"

// ── Listings ───────────────────────────────────────────────────────────────────

const INITIAL_STATUSES: LordListingItem["status"][] = [
  "Live",
  "Live",
  "Occupied",
  "Draft",
]

let _listings: LordListingItem[] = PROPERTIES.map((p, i) => ({
  id: p.id,
  title: p.title,
  type: p.type,
  area: p.area,
  region: p.region,
  beds: p.beds,
  baths: p.baths,
  sqft: String(p.sqft),
  rent: p.priceLabel.replace("₵", "").replace(/,/g, ""),
  advance: parseInt(p.advance),
  desc: p.desc,
  amenities: p.amenities,
  status: INITIAL_STATUSES[i],
}))

export async function getListings(): Promise<LordListingItem[]> {
  return [..._listings]
}

export async function addListing(
  data: Omit<LordListingItem, "id">
): Promise<LordListingItem> {
  const item: LordListingItem = { ...data, id: `listing-${Date.now()}` }
  _listings = [..._listings, item]
  return item
}

export async function updateListing(
  item: LordListingItem
): Promise<LordListingItem> {
  _listings = _listings.map((l) => (l.id === item.id ? item : l))
  return item
}

export async function removeListing(id: string): Promise<void> {
  _listings = _listings.filter((l) => l.id !== id)
}

// ── Applications ───────────────────────────────────────────────────────────────

let _applications: LordAppWithStatus[] = LORD_APPS.map((a) => ({
  ...a,
  appStatus: "pending" as const,
}))

export async function getApplications(): Promise<LordAppWithStatus[]> {
  return [..._applications]
}

export async function setApplicationStatus(
  id: string,
  status: "pending" | "approved" | "declined"
): Promise<void> {
  _applications = _applications.map((a) =>
    a.id === id ? { ...a, appStatus: status } : a
  )
}

// ── Leases ─────────────────────────────────────────────────────────────────────

export async function getLeases(): Promise<LordLease[]> {
  return [...LORD_LEASES]
}

// ── Property documents ────────────────────────────────────────────────────────

let _propertyDocs: PropertyDocument[] = [
  {
    id: "pd1",
    propertyId: "p1",
    title: "Tenancy Agreement",
    uploadedOn: "01 Aug 2026",
    landlordSigned: true,
    tenantSigned: true,
    isDigital: true,
    clauses: ["No subletting", "Landlord may inspect with 24h notice"],
  },
  {
    id: "pd2",
    propertyId: "p2",
    title: "Tenancy Agreement",
    uploadedOn: "01 Mar 2026",
    landlordSigned: true,
    tenantSigned: true,
    isDigital: true,
    clauses: ["No subletting", "No smoking on premises"],
  },
  {
    id: "pd3",
    propertyId: "p3",
    title: "Tenancy Agreement",
    uploadedOn: "01 Jan 2026",
    landlordSigned: true,
    tenantSigned: false,
    isDigital: true,
    clauses: ["Pets allowed", "No subletting", "Quiet hours: 10pm – 6am"],
  },
  {
    id: "pd4",
    propertyId: "p4",
    title: "Tenancy Agreement",
    uploadedOn: "01 Nov 2025",
    landlordSigned: false,
    tenantSigned: false,
  },
  {
    id: "pd5",
    propertyId: "p3",
    title: "Addendum — Pets clause",
    uploadedOn: "15 Feb 2026",
    landlordSigned: true,
    tenantSigned: true,
  },
]

export async function getPropertyDocs(
  propertyId: string
): Promise<PropertyDocument[]> {
  return _propertyDocs.filter((d) => d.propertyId === propertyId)
}

export async function getAllPropertyDocs(): Promise<PropertyDocument[]> {
  return [..._propertyDocs]
}

export async function addPropertyDoc(
  data: Omit<PropertyDocument, "id">
): Promise<PropertyDocument> {
  const doc: PropertyDocument = { ...data, id: `pd-${Date.now()}` }
  _propertyDocs = [..._propertyDocs, doc]
  return doc
}

export async function updatePropertyDoc(
  id: string,
  updates: Partial<Omit<PropertyDocument, "id">>
): Promise<PropertyDocument> {
  const existing = _propertyDocs.find((d) => d.id === id)
  if (!existing) throw new Error(`Property doc ${id} not found`)
  const updated = { ...existing, ...updates }
  _propertyDocs = _propertyDocs.map((d) => (d.id === id ? updated : d))
  return updated
}

// ── Tickets ────────────────────────────────────────────────────────────────────

let _tickets: LordTicket[] = [...LORD_TICKETS]

export async function getTickets(): Promise<LordTicket[]> {
  return [..._tickets]
}

export async function assignTicket(
  ticketId: string,
  artisanName: string
): Promise<void> {
  _tickets = _tickets.map((t) =>
    t.id === ticketId
      ? {
          ...t,
          artisan: artisanName,
          status: t.status === "Open" ? "Scheduled" : t.status,
          statusColor: t.status === "Open" ? "#047857" : t.statusColor,
        }
      : t
  )
}
