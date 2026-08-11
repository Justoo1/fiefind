import { z } from "zod"

export const LeaseOutSchema = z.object({
  id: z.string(),
  property_id: z.string(),
  tenant_id: z.string(),
  landlord_id: z.string(),
  rent_pesewas: z.number(),
  start_date: z.string(),
  end_date: z.string(),
  next_due_date: z.string(),
  status: z.enum(["active", "expiring_soon", "expired", "terminated"]),
  created_at: z.string(),
  updated_at: z.string().optional(),
})

export const PaymentOutSchema = z.object({
  id: z.string(),
  lease_id: z.string(),
  payer_id: z.string(),
  amount_pesewas: z.number(),
  hubtel_reference: z.string().nullable(),
  status: z.enum(["pending", "paid", "failed"]),
  paid_at: z.string().nullable(),
  created_at: z.string(),
})

export const MaintenanceTicketOutSchema = z.object({
  id: z.string(),
  property_id: z.string(),
  lease_id: z.string().nullable(),
  tenant_id: z.string(),
  title: z.string(),
  category: z.string(),
  description: z.string().nullable(),
  artisan_id: z.string().nullable(),
  artisan_name: z.string().nullable().optional(),
  status: z.enum(["open", "scheduled", "in_progress", "completed"]),
  created_at: z.string(),
  updated_at: z.string(),
})

export const KycStatusOutSchema = z.object({
  id: z.string().optional(),
  user_id: z.string().optional(),
  status: z.enum(["not_started", "pending", "passed", "failed"]),
  ghana_card_number: z.string().nullable().optional(),
  verified_at: z.string().nullable().optional(),
  failure_reason: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const DocumentOutSchema = z.object({
  id: z.string(),
  property_id: z.string(),
  lease_id: z.string().nullable(),
  title: z.string(),
  storage_key: z.string().nullable(),
  download_url: z.string().nullable(),
  landlord_signed: z.boolean(),
  tenant_signed: z.boolean(),
  is_digital: z.boolean(),
  clauses: z.array(z.string()),
  uploaded_at: z.string(),
})

export const ServiceProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  specialty: z.string().nullable(),
})

export const ServiceProviderListSchema = z.array(ServiceProviderSchema)

export const ServiceBookingOutSchema = z.object({
  id: z.string(),
  requester_id: z.string(),
  provider_id: z.string(),
  property_id: z.string().nullable(),
  title: z.string(),
  category: z.string(),
  description: z.string().nullable(),
  status: z.enum([
    "requested",
    "accepted",
    "declined",
    "in_progress",
    "completed",
    "cancelled",
  ]),
  agreed_price_pesewas: z.number().nullable(),
  scheduled_for: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  requester_name: z.string().nullable().optional(),
  provider_name: z.string().nullable().optional(),
})

export type LeaseOut = z.infer<typeof LeaseOutSchema>
export type PaymentOut = z.infer<typeof PaymentOutSchema>
export type MaintenanceTicketOut = z.infer<typeof MaintenanceTicketOutSchema>
export type KycStatusOut = z.infer<typeof KycStatusOutSchema>
export type DocumentOut = z.infer<typeof DocumentOutSchema>
export type ServiceProviderOut = z.infer<typeof ServiceProviderSchema>
export type ServiceBookingOut = z.infer<typeof ServiceBookingOutSchema>
