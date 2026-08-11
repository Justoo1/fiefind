"use server"

import { z } from "zod"
import { apiFetch } from "@/lib/api-client"
import {
  PropertyOutSchema,
  ApplicationOutSchema,
  LeaseOutSchema,
  MaintenanceTicketOutSchema,
  DocumentOutSchema,
  ServiceProviderListSchema,
  ServiceBookingOutSchema,
  ServicePaymentOutSchema,
  ServiceReviewOutSchema,
  type PropertyOut,
  type DocumentOut,
  type ServiceProvider,
  type ServiceBookingOut,
  type ServicePaymentOut,
  type ServiceReviewOut,
} from "@/lib/landlord-schemas"
import { PaymentOutSchema } from "@/lib/tenant-schemas"
import type {
  LordListingItem,
  LordAppWithStatus,
  LordLease,
  LordTicket,
  PropertyDocument,
} from "@/components/fiefind/types"

// ── Display helpers ───────────────────────────────────────────────────────────

function toInitials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function pesewasToGhs(amount: number): string {
  return (
    "₵" + (amount / 100).toLocaleString("en-GH", { maximumFractionDigits: 0 })
  )
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—"
  const dt = new Date(d)
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function leaseStatusLabel(s: string): string {
  const map: Record<string, string> = {
    active: "Active",
    expiring_soon: "Expiring soon",
    expired: "Expired",
    terminated: "Terminated",
  }
  return map[s] ?? s
}

function leaseStatusColor(s: string): string {
  if (s === "active") return "#10B981"
  if (s === "expiring_soon") return "#D97706"
  return "#6B7280"
}

function ticketStatusLabel(s: string): string {
  const map: Record<string, string> = {
    open: "Open",
    scheduled: "Scheduled",
    in_progress: "In progress",
    completed: "Completed",
  }
  return map[s] ?? s
}

function ticketStatusColor(s: string): string {
  if (s === "completed") return "#10B981"
  if (s === "in_progress") return "#D97706"
  if (s === "scheduled") return "#047857"
  return "#6B7280"
}

function bgStatusColor(s: string | null | undefined): string {
  if (!s) return "#6B7280"
  if (s.toLowerCase() === "passed") return "#10B981"
  if (s.toLowerCase() === "failed") return "#EF4444"
  return "#D97706"
}

function propertyLabel(
  title: string | null | undefined,
  area: string | null | undefined
): string {
  if (!title) return "—"
  return area ? `${title} · ${area}` : title
}

// ── Property helpers ──────────────────────────────────────────────────────────

function statusToLabel(s: string): LordListingItem["status"] {
  if (s === "occupied") return "Occupied"
  if (s === "draft") return "Draft"
  return "Live"
}

function propertyToListingItem(p: PropertyOut): LordListingItem {
  const rentGhs = (p.rent_pesewas / 100).toLocaleString("en-GH", {
    maximumFractionDigits: 0,
  })
  return {
    id: p.id,
    title: p.title,
    type: p.type.charAt(0).toUpperCase() + p.type.slice(1),
    area: p.area,
    region: p.region,
    beds: p.beds,
    baths: p.baths,
    sqft: p.sqft != null ? String(p.sqft) : "",
    rent: rentGhs,
    advance: p.advance_months,
    desc: p.description ?? "",
    amenities: p.amenities,
    status: statusToLabel(p.status),
    ghanaPostGps: p.ghana_post_gps ?? undefined,
    streetAddress: p.street_address ?? undefined,
    pinX: p.pin_x ?? undefined,
    pinY: p.pin_y ?? undefined,
  }
}

// ── Properties ────────────────────────────────────────────────────────────────

export async function getLordProperties(): Promise<LordListingItem[]> {
  const data = await apiFetch("/properties/mine")
  const props = z.array(PropertyOutSchema).parse(data)
  return props.map(propertyToListingItem)
}

export async function createProperty(
  item: Omit<LordListingItem, "id">
): Promise<LordListingItem> {
  const rentPesewas = Math.round(parseFloat(item.rent.replace(/,/g, "")) * 100)
  const body = {
    title: item.title,
    type: item.type.toLowerCase(),
    area: item.area,
    region: item.region,
    beds: item.beds,
    baths: item.baths,
    sqft: item.sqft ? parseInt(item.sqft) : null,
    rent_pesewas: rentPesewas,
    advance_months: item.advance,
    description: item.desc || null,
    amenities: item.amenities,
    status: item.status.toLowerCase(),
    ghana_post_gps: item.ghanaPostGps ?? null,
    street_address: item.streetAddress ?? null,
    pin_x: item.pinX ?? null,
    pin_y: item.pinY ?? null,
  }
  const data = await apiFetch("/properties", {
    method: "POST",
    body: JSON.stringify(body),
  })
  const prop = PropertyOutSchema.parse(data)
  return propertyToListingItem(prop)
}

export async function updateProperty(
  id: string,
  item: LordListingItem
): Promise<LordListingItem> {
  const rentPesewas = Math.round(parseFloat(item.rent.replace(/,/g, "")) * 100)
  const data = await apiFetch(`/properties/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: item.title,
      type: item.type.toLowerCase(),
      area: item.area,
      region: item.region,
      beds: item.beds,
      baths: item.baths,
      sqft: item.sqft ? parseInt(item.sqft) : null,
      rent_pesewas: rentPesewas,
      advance_months: item.advance,
      description: item.desc || null,
      amenities: item.amenities,
      status: item.status.toLowerCase(),
      ghana_post_gps: item.ghanaPostGps ?? null,
      street_address: item.streetAddress ?? null,
      pin_x: item.pinX ?? null,
      pin_y: item.pinY ?? null,
    }),
  })
  const prop = PropertyOutSchema.parse(data)
  return propertyToListingItem(prop)
}

export async function deleteProperty(id: string): Promise<void> {
  await apiFetch(`/properties/${id}`, { method: "DELETE" })
}

// ── Applications ──────────────────────────────────────────────────────────────

export async function getLordApplications(): Promise<LordAppWithStatus[]> {
  const data = await apiFetch("/applications")
  const apps = z.array(ApplicationOutSchema).parse(data)
  return apps.map((a) => ({
    id: a.id,
    tenant: a.tenant_name ?? "Unknown tenant",
    initials: toInitials(a.tenant_name),
    property: propertyLabel(a.property_title, a.property_area),
    date: fmtDate(a.applied_at),
    income: "—",
    bgStatus: a.bg_check_status ?? "—",
    bgColor: bgStatusColor(a.bg_check_status),
    appStatus: a.status as "pending" | "approved" | "declined",
  }))
}

export async function updateApplicationStatus(
  id: string,
  status: "approved" | "declined"
): Promise<void> {
  await apiFetch(`/applications/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
}

// ── Leases ────────────────────────────────────────────────────────────────────

export async function getLordLeases(): Promise<LordLease[]> {
  const data = await apiFetch("/leases")
  const leases = z.array(LeaseOutSchema).parse(data)
  return leases.map((l) => ({
    id: l.id,
    propertyId: l.property_id,
    tenant: l.tenant_name ?? "Unknown tenant",
    initials: toInitials(l.tenant_name),
    property: propertyLabel(l.property_title, l.property_area),
    rent: pesewasToGhs(l.rent_pesewas),
    rentPesewas: l.rent_pesewas,
    start: fmtDate(l.start_date),
    end: fmtDate(l.end_date),
    nextDue: fmtDate(l.next_due_date),
    status: leaseStatusLabel(l.status),
    statusColor: leaseStatusColor(l.status),
  }))
}

// ── Maintenance tickets ───────────────────────────────────────────────────────

export async function getLordMaintenanceTickets(): Promise<LordTicket[]> {
  const data = await apiFetch("/maintenance")
  const tickets = z.array(MaintenanceTicketOutSchema).parse(data)
  return tickets.map((t) => ({
    id: t.id,
    property: propertyLabel(t.property_title, t.property_area),
    tenant: t.tenant_name ?? "Unknown tenant",
    issue: t.title,
    category: t.category,
    date: fmtDate(t.created_at),
    artisan: t.artisan_name ?? "Unassigned",
    status: ticketStatusLabel(t.status),
    statusColor: ticketStatusColor(t.status),
  }))
}

export async function updateTicketStatus(
  id: string,
  status: "open" | "scheduled" | "in_progress" | "completed"
): Promise<void> {
  await apiFetch(`/maintenance/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function getLordPayments() {
  const data = await apiFetch("/payments")
  return z.array(PaymentOutSchema).parse(data)
}

export async function getLordEscrowLedger(leaseId?: string) {
  const path = leaseId ? `/escrow/ledger?lease_id=${leaseId}` : "/escrow/ledger"
  const data = await apiFetch(path)
  return data
}

// ── Documents ─────────────────────────────────────────────────────────────────

function docOutToPropertyDocument(doc: DocumentOut): PropertyDocument {
  const dt = new Date(doc.uploaded_at)
  const uploadedOn = dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  return {
    id: doc.id,
    propertyId: doc.property_id,
    title: doc.title,
    uploadedOn,
    landlordSigned: doc.landlord_signed,
    tenantSigned: doc.tenant_signed,
    isDigital: doc.is_digital,
    clauses: doc.clauses,
    downloadUrl: doc.download_url,
  }
}

export async function getPropertyDocuments(
  propertyId: string
): Promise<PropertyDocument[]> {
  const data = await apiFetch(`/properties/${propertyId}/documents`)
  const docs = z.array(DocumentOutSchema).parse(data)
  return docs.map(docOutToPropertyDocument)
}

// ── Service providers ─────────────────────────────────────────────────────────

export async function listServiceProviders(
  specialty?: string
): Promise<ServiceProvider[]> {
  const qs = specialty ? `?specialty=${encodeURIComponent(specialty)}` : ""
  const data = await apiFetch(`/service-providers${qs}`)
  return ServiceProviderListSchema.parse(data)
}

// ── Service bookings ──────────────────────────────────────────────────────────

export async function createServiceBooking(payload: {
  provider_id: string
  title: string
  category: string
  description?: string
  property_id?: string
  scheduled_for?: string
}): Promise<ServiceBookingOut> {
  const data = await apiFetch("/service-bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return ServiceBookingOutSchema.parse(data)
}

export async function getServiceBookings(): Promise<ServiceBookingOut[]> {
  const data = await apiFetch("/service-bookings")
  return z.array(ServiceBookingOutSchema).parse(data)
}

export async function respondToServiceBooking(
  bookingId: string,
  accept: boolean,
  agreedPricePesewas?: number
): Promise<ServiceBookingOut> {
  const data = await apiFetch(`/service-bookings/${bookingId}/respond`, {
    method: "PATCH",
    body: JSON.stringify({
      accept,
      agreed_price_pesewas: agreedPricePesewas,
    }),
  })
  return ServiceBookingOutSchema.parse(data)
}

export async function updateServiceBookingStatus(
  bookingId: string,
  status: string
): Promise<ServiceBookingOut> {
  const data = await apiFetch(`/service-bookings/${bookingId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
  return ServiceBookingOutSchema.parse(data)
}

export async function payForServiceBooking(
  bookingId: string,
  phoneNumber: string
): Promise<ServicePaymentOut> {
  const data = await apiFetch(`/service-bookings/${bookingId}/pay`, {
    method: "POST",
    body: JSON.stringify({ phone_number: phoneNumber }),
  })
  return ServicePaymentOutSchema.parse(data)
}

export async function reviewServiceBooking(
  bookingId: string,
  rating: number,
  comment?: string
): Promise<ServiceReviewOut> {
  const data = await apiFetch(`/service-bookings/${bookingId}/review`, {
    method: "POST",
    body: JSON.stringify({ rating, comment }),
  })
  return ServiceReviewOutSchema.parse(data)
}

export async function assignArtisan(
  ticketId: string,
  artisanId: string
): Promise<void> {
  await apiFetch(`/maintenance/${ticketId}/assign`, {
    method: "PATCH",
    body: JSON.stringify({ artisan_id: artisanId }),
  })
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function requestUploadUrl(
  propertyId: string,
  title: string,
  leaseId?: string,
  fileName?: string
): Promise<{ url: string; document: PropertyDocument }> {
  const data = await apiFetch(
    `/properties/${propertyId}/documents/upload-url`,
    {
      method: "POST",
      body: JSON.stringify({
        title,
        lease_id: leaseId ?? null,
        file_name: fileName ?? "document.pdf",
      }),
    }
  )
  const parsed = z
    .object({ url: z.string(), document: DocumentOutSchema })
    .parse(data)
  return {
    url: parsed.url,
    document: docOutToPropertyDocument(parsed.document),
  }
}

export async function createDigitalDocument(
  propertyId: string,
  title: string,
  clauses: string[],
  leaseId?: string
): Promise<PropertyDocument> {
  const data = await apiFetch(
    `/properties/${propertyId}/documents/create-digital`,
    {
      method: "POST",
      body: JSON.stringify({ title, clauses, lease_id: leaseId ?? null }),
    }
  )
  const doc = DocumentOutSchema.parse(data)
  return docOutToPropertyDocument(doc)
}

export async function signDocument(docId: string): Promise<PropertyDocument> {
  const data = await apiFetch(`/documents/${docId}/sign`, { method: "PATCH" })
  const doc = DocumentOutSchema.parse(data)
  return docOutToPropertyDocument(doc)
}
