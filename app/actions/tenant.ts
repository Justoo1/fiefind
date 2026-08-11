"use server"

import { z } from "zod"
import { apiFetch } from "@/lib/api-client"
import {
  LeaseOutSchema,
  PaymentOutSchema,
  MaintenanceTicketOutSchema,
  KycStatusOutSchema,
  DocumentOutSchema,
  ServiceProviderListSchema,
  type DocumentOut,
  type ServiceProviderOut,
} from "@/lib/tenant-schemas"
import {
  PropertyOutSchema,
  ApplicationOutSchema,
  type PropertyOut,
  type ApplicationOut,
} from "@/lib/landlord-schemas"
import type {
  Property,
  TenantApp,
  PropertyDocument,
} from "@/components/fiefind/types"

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

export async function getLeases() {
  const data = await apiFetch("/leases")
  return z.array(LeaseOutSchema).parse(data)
}

export async function getPayments() {
  const data = await apiFetch("/payments")
  return z.array(PaymentOutSchema).parse(data)
}

export async function initiatePayment(
  leaseId: string,
  amountPesewas: number,
  phoneNumber: string
) {
  return apiFetch("/payments/initiate", {
    method: "POST",
    body: JSON.stringify({
      lease_id: leaseId,
      amount_pesewas: amountPesewas,
      phone_number: phoneNumber,
    }),
  })
}

export async function getMaintenanceTickets() {
  const data = await apiFetch("/maintenance")
  return z.array(MaintenanceTicketOutSchema).parse(data)
}

export async function createMaintenanceTicket(payload: {
  property_id: string
  lease_id?: string
  title: string
  category: string
  description?: string
}) {
  const data = await apiFetch("/maintenance", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return MaintenanceTicketOutSchema.parse(data)
}

export async function getKycStatus() {
  const data = await apiFetch("/kyc/status")
  return KycStatusOutSchema.parse(data)
}

export async function initiateKyc(payload: {
  ghana_card_number: string
  id_image_base64: string
  selfie_image_base64: string
}) {
  return apiFetch("/kyc/initiate", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

// ── Properties (public discover) ──────────────────────────────────────────────

function toInitials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function propertyOutToProperty(p: PropertyOut): Property {
  const ghsPerMonth = p.rent_pesewas / 100
  const priceLabel =
    "₵" + ghsPerMonth.toLocaleString("en-GH", { maximumFractionDigits: 0 })
  const priceShort =
    ghsPerMonth >= 1000
      ? "₵" + (ghsPerMonth / 1000).toFixed(1) + "k"
      : priceLabel
  const advanceGhs = ghsPerMonth * p.advance_months
  const serviceFeeGhs = Math.round(ghsPerMonth * 0.01)
  const landlordName = p.landlord_name ?? "Property Owner"
  return {
    id: p.id,
    title: p.title,
    type: p.type.charAt(0).toUpperCase() + p.type.slice(1),
    area: p.area,
    region: p.region,
    beds: p.beds,
    baths: p.baths,
    sqft: p.sqft ?? 0,
    priceLabel,
    priceShort,
    advance: `${p.advance_months} month${p.advance_months === 1 ? "" : "s"}`,
    escrowLabel:
      "₵" + advanceGhs.toLocaleString("en-GH", { maximumFractionDigits: 0 }),
    escrowTotal:
      "₵" +
      (advanceGhs + serviceFeeGhs).toLocaleString("en-GH", {
        maximumFractionDigits: 0,
      }),
    serviceFee:
      "₵" + serviceFeeGhs.toLocaleString("en-GH", { maximumFractionDigits: 0 }),
    desc: p.description ?? "",
    amenities: p.amenities,
    landlord: {
      name: landlordName,
      initials: toInitials(landlordName),
      since: "—",
      rating: "—",
    },
    pinX: p.pin_x ?? 30,
    pinY: p.pin_y ?? 50,
    ghanaPostGps: p.ghana_post_gps ?? undefined,
    streetAddress: p.street_address ?? undefined,
  }
}

export async function getPublicProperties(): Promise<Property[]> {
  const data = await apiFetch("/properties")
  return z.array(PropertyOutSchema).parse(data).map(propertyOutToProperty)
}

export async function applyForProperty(
  propertyId: string
): Promise<{ id: string }> {
  const data = await apiFetch(`/properties/${propertyId}/apply`, {
    method: "POST",
  })
  return z.object({ id: z.string() }).parse(data)
}

// ── Applications ──────────────────────────────────────────────────────────────

function appStatusLabel(s: string): string {
  if (s === "approved") return "Approved"
  if (s === "declined") return "Declined"
  return "Under review"
}

function appStatusColor(s: string): string {
  if (s === "approved") return "#10B981"
  if (s === "declined") return "#EF4444"
  return "#D97706"
}

function appOutToTenantApp(a: ApplicationOut): TenantApp {
  const rentGhs = a.property_rent_pesewas
    ? "₵" +
      (a.property_rent_pesewas / 100).toLocaleString("en-GH", {
        maximumFractionDigits: 0,
      }) +
      "/mo"
    : "—"
  const dateStr = new Date(a.applied_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  return {
    id: a.id,
    propertyId: a.property_id,
    property: a.property_title ?? "—",
    area: a.property_area ?? "—",
    price: rentGhs,
    landlord: a.landlord_name ?? "—",
    bg: a.bg_check_status ?? "Pending",
    date: `Applied ${dateStr}`,
    status: appStatusLabel(a.status),
    statusColor: appStatusColor(a.status),
  }
}

export async function getTenantApplications(): Promise<TenantApp[]> {
  const data = await apiFetch("/applications")
  return z.array(ApplicationOutSchema).parse(data).map(appOutToTenantApp)
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function getTenantPropertyDocuments(
  propertyId: string
): Promise<PropertyDocument[]> {
  const data = await apiFetch(`/properties/${propertyId}/documents`)
  return z.array(DocumentOutSchema).parse(data).map(docOutToPropertyDocument)
}

export async function signDocument(docId: string): Promise<PropertyDocument> {
  const data = await apiFetch(`/documents/${docId}/sign`, { method: "PATCH" })
  return docOutToPropertyDocument(DocumentOutSchema.parse(data))
}

// ── Service providers ─────────────────────────────────────────────────────────

export async function getServiceProviders(
  specialty?: string
): Promise<ServiceProviderOut[]> {
  const qs = specialty ? `?specialty=${encodeURIComponent(specialty)}` : ""
  const data = await apiFetch(`/service-providers${qs}`)
  return ServiceProviderListSchema.parse(data)
}
