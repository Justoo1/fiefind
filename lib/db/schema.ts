import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core"

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "tenant",
  "landlord",
  "service_provider",
  "admin",
])

export const listingStatusEnum = pgEnum("listing_status", [
  "live",
  "occupied",
  "draft",
])

export const appStatusEnum = pgEnum("app_status", [
  "pending",
  "approved",
  "declined",
])

export const leaseStatusEnum = pgEnum("lease_status", [
  "active",
  "expiring_soon",
  "expired",
  "terminated",
])

export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "scheduled",
  "in_progress",
  "completed",
])

export const propertyTypeEnum = pgEnum("property_type", [
  "apartment",
  "house",
  "studio",
  "townhouse",
])

export const kycStatusEnum = pgEnum("kyc_status", [
  "pending",
  "passed",
  "failed",
  "expired",
])

export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", [
  "escrow_deposit",
  "escrow_release",
  "rent_payment",
  "refund",
  "fee",
])

export const serviceBookingStatusEnum = pgEnum("service_booking_status", [
  "requested",
  "accepted",
  "declined",
  "in_progress",
  "completed",
  "cancelled",
])

// ─── Auth.js required tables ──────────────────────────────────────────────────
// Column names must match exactly what @auth/drizzle-adapter expects.
// FieFind-specific columns are added alongside them; the adapter ignores extras.

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  // FieFind extensions
  phone: text("phone").unique(),
  phoneVerified: timestamp("phoneVerified", { mode: "date" }),
  passwordHash: text("passwordHash"),
  role: userRoleEnum("role").notNull().default("tenant"),
  idVerified: boolean("idVerified").notNull().default(false),
  specialty: text("specialty"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
})

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compositePk: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
)

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compositePk: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
)

// ─── FieFind application tables ───────────────────────────────────────────────

export const properties = pgTable("property", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  landlordId: text("landlordId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: propertyTypeEnum("type").notNull(),
  area: text("area").notNull(),
  region: text("region").notNull(),
  beds: smallint("beds").notNull(),
  baths: smallint("baths").notNull(),
  sqft: integer("sqft"),
  // Monetary amounts stored as integer pesewas — never float
  rentPesewas: integer("rentPesewas").notNull(),
  advanceMonths: smallint("advanceMonths").notNull(),
  description: text("description"),
  amenities: text("amenities").array().notNull().default([]),
  status: listingStatusEnum("status").notNull().default("draft"),
  ghanaPostGps: text("ghanaPostGps"),
  streetAddress: text("streetAddress"),
  pinX: numeric("pinX", { precision: 9, scale: 6 }),
  pinY: numeric("pinY", { precision: 9, scale: 6 }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
})

export const applications = pgTable(
  "application",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    propertyId: text("propertyId")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    tenantId: text("tenantId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: appStatusEnum("status").notNull().default("pending"),
    bgCheckStatus: text("bgCheckStatus"),
    appliedAt: timestamp("appliedAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({
    uniqTenantProperty: unique().on(t.tenantId, t.propertyId),
  })
)

export const leases = pgTable("lease", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  propertyId: text("propertyId")
    .notNull()
    .references(() => properties.id),
  tenantId: text("tenantId")
    .notNull()
    .references(() => users.id),
  landlordId: text("landlordId")
    .notNull()
    .references(() => users.id),
  rentPesewas: integer("rentPesewas").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  nextDueDate: date("nextDueDate"),
  status: leaseStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
})

export const propertyDocuments = pgTable("property_document", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  propertyId: text("propertyId")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  leaseId: text("leaseId").references(() => leases.id),
  title: text("title").notNull(),
  storageKey: text("storageKey"),
  landlordSigned: boolean("landlordSigned").notNull().default(false),
  tenantSigned: boolean("tenantSigned").notNull().default(false),
  isDigital: boolean("isDigital").notNull().default(true),
  clauses: text("clauses").array().default([]),
  uploadedAt: timestamp("uploadedAt", { mode: "date" }).notNull().defaultNow(),
})

export const maintenanceTickets = pgTable("maintenance_ticket", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  propertyId: text("propertyId")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  leaseId: text("leaseId").references(() => leases.id),
  tenantId: text("tenantId")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  artisanId: text("artisanId").references(() => users.id),
  status: ticketStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
})

// ─── KYC & Payment tables ─────────────────────────────────────────────────────

export const kycVerifications = pgTable("kyc_verification", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  // One record per user
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("smile_id"),
  smileJobId: text("smileJobId"),
  status: kycStatusEnum("status").notNull().default("pending"),
  ghanaCardNumber: text("ghanaCardNumber"),
  verifiedAt: timestamp("verifiedAt", { mode: "date" }),
  failureReason: text("failureReason"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
})

// Append-only escrow ledger — no updatedAt; rows must never be modified or deleted.
// This enforces the invariant from architecture_context.md.
export const escrowLedger = pgTable("escrow_ledger", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  leaseId: text("leaseId").references(() => leases.id),
  fromUserId: text("fromUserId")
    .notNull()
    .references(() => users.id),
  toUserId: text("toUserId")
    .notNull()
    .references(() => users.id),
  amountPesewas: integer("amountPesewas").notNull(),
  entryType: ledgerEntryTypeEnum("entryType").notNull(),
  hubtelReference: text("hubtelReference"),
  description: text("description"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
})

export const payments = pgTable("payment", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  leaseId: text("leaseId").references(() => leases.id),
  payerId: text("payerId")
    .notNull()
    .references(() => users.id),
  amountPesewas: integer("amountPesewas").notNull(),
  hubtelReference: text("hubtelReference"),
  status: text("status").notNull().default("pending"),
  paidAt: timestamp("paidAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
})

// ─── Service marketplace (lease/property-independent) ────────────────────────

export const serviceBookings = pgTable("service_booking", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  requesterId: text("requesterId")
    .notNull()
    .references(() => users.id),
  providerId: text("providerId")
    .notNull()
    .references(() => users.id),
  propertyId: text("propertyId").references(() => properties.id),
  title: text("title").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  status: serviceBookingStatusEnum("status").notNull().default("requested"),
  agreedPricePesewas: integer("agreedPricePesewas"),
  scheduledFor: timestamp("scheduledFor", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
})

// ─── Inferred types ───────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Property = typeof properties.$inferSelect
export type NewProperty = typeof properties.$inferInsert
export type Application = typeof applications.$inferSelect
export type Lease = typeof leases.$inferSelect
export type MaintenanceTicket = typeof maintenanceTickets.$inferSelect
export type KycVerification = typeof kycVerifications.$inferSelect
export type EscrowEntry = typeof escrowLedger.$inferSelect
export type Payment = typeof payments.$inferSelect
export type ServiceBooking = typeof serviceBookings.$inferSelect
