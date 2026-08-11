import { z } from "zod"

// ── API response schemas (match FastAPI models) ───────────────────────────────

export const PropertyOutSchema = z.object({
  id: z.string(),
  landlord_id: z.string(),
  landlord_name: z.string().nullable().optional(),
  title: z.string(),
  type: z.string(),
  area: z.string(),
  region: z.string(),
  beds: z.number(),
  baths: z.number(),
  sqft: z.number().nullable(),
  rent_pesewas: z.number(),
  advance_months: z.number(),
  description: z.string().nullable(),
  amenities: z.array(z.string()),
  status: z.string(),
  ghana_post_gps: z.string().nullable().optional(),
  street_address: z.string().nullable().optional(),
  pin_x: z.number().nullable(),
  pin_y: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const ApplicationOutSchema = z.object({
  id: z.string(),
  property_id: z.string(),
  tenant_id: z.string(),
  status: z.string(),
  bg_check_status: z.string().nullable(),
  applied_at: z.string(),
  updated_at: z.string(),
  tenant_name: z.string().nullable().optional(),
  property_title: z.string().nullable().optional(),
  property_area: z.string().nullable().optional(),
  property_rent_pesewas: z.number().nullable().optional(),
  landlord_name: z.string().nullable().optional(),
})

export const LeaseOutSchema = z.object({
  id: z.string(),
  property_id: z.string(),
  tenant_id: z.string(),
  landlord_id: z.string(),
  rent_pesewas: z.number(),
  start_date: z.string(),
  end_date: z.string(),
  next_due_date: z.string().nullable(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  tenant_name: z.string().nullable().optional(),
  property_title: z.string().nullable().optional(),
  property_area: z.string().nullable().optional(),
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
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  tenant_name: z.string().nullable().optional(),
  property_title: z.string().nullable().optional(),
  property_area: z.string().nullable().optional(),
})

export const ServiceProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  specialty: z.string().nullable(),
})

export const ServiceProviderListSchema = z.array(ServiceProviderSchema)

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

export type PropertyOut = z.infer<typeof PropertyOutSchema>
export type ApplicationOut = z.infer<typeof ApplicationOutSchema>
export type LeaseOut = z.infer<typeof LeaseOutSchema>
export type MaintenanceTicketOut = z.infer<typeof MaintenanceTicketOutSchema>
export type DocumentOut = z.infer<typeof DocumentOutSchema>
export type ServiceProvider = z.infer<typeof ServiceProviderSchema>

// ── Form validation schemas ───────────────────────────────────────────────────

export const ListingSchema = z.object({
  title: z.string().min(3, "At least 3 characters"),
  type: z.enum(["Apartment", "House", "Studio", "Townhouse"]),
  area: z.string().min(1, "Area is required"),
  region: z.string(),
  beds: z.number().int().min(1).max(10),
  baths: z.number().int().min(1).max(8),
  sqft: z.string(),
  rent: z
    .string()
    .min(1, "Rent is required")
    .regex(/^\d[\d ,]*$/, "Digits and commas only"),
  advance: z.number().int().min(1),
  desc: z.string(),
  amenities: z.array(z.string()),
})

export type ListingData = z.infer<typeof ListingSchema>

// Draft save only requires title + area; rent can be empty
export const DraftListingSchema = ListingSchema.extend({
  rent: z.string(),
})

export type DraftListingData = z.infer<typeof DraftListingSchema>
