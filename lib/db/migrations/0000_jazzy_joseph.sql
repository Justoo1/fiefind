CREATE TYPE "public"."app_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('pending', 'passed', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."lease_status" AS ENUM('active', 'expiring_soon', 'expired', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_type" AS ENUM('escrow_deposit', 'escrow_release', 'rent_payment', 'refund', 'fee');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('live', 'occupied', 'draft');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('apartment', 'house', 'studio', 'townhouse');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'scheduled', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('tenant', 'landlord', 'service_provider', 'admin');--> statement-breakpoint
CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "application" (
	"id" text PRIMARY KEY NOT NULL,
	"propertyId" text NOT NULL,
	"tenantId" text NOT NULL,
	"status" "app_status" DEFAULT 'pending' NOT NULL,
	"bgCheckStatus" text,
	"appliedAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "application_tenantId_propertyId_unique" UNIQUE("tenantId","propertyId")
);
--> statement-breakpoint
CREATE TABLE "escrow_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"leaseId" text,
	"fromUserId" text NOT NULL,
	"toUserId" text NOT NULL,
	"amountPesewas" integer NOT NULL,
	"entryType" "ledger_entry_type" NOT NULL,
	"hubtelReference" text,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyc_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"provider" text DEFAULT 'smile_id' NOT NULL,
	"smileJobId" text,
	"status" "kyc_status" DEFAULT 'pending' NOT NULL,
	"ghanaCardNumber" text,
	"verifiedAt" timestamp,
	"failureReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kyc_verification_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "lease" (
	"id" text PRIMARY KEY NOT NULL,
	"propertyId" text NOT NULL,
	"tenantId" text NOT NULL,
	"landlordId" text NOT NULL,
	"rentPesewas" integer NOT NULL,
	"startDate" date NOT NULL,
	"endDate" date NOT NULL,
	"nextDueDate" date,
	"status" "lease_status" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_ticket" (
	"id" text PRIMARY KEY NOT NULL,
	"propertyId" text NOT NULL,
	"leaseId" text,
	"tenantId" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"artisanId" text,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"leaseId" text,
	"payerId" text NOT NULL,
	"amountPesewas" integer NOT NULL,
	"hubtelReference" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"paidAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property" (
	"id" text PRIMARY KEY NOT NULL,
	"landlordId" text NOT NULL,
	"title" text NOT NULL,
	"type" "property_type" NOT NULL,
	"area" text NOT NULL,
	"region" text NOT NULL,
	"beds" smallint NOT NULL,
	"baths" smallint NOT NULL,
	"sqft" integer,
	"rentPesewas" integer NOT NULL,
	"advanceMonths" smallint NOT NULL,
	"description" text,
	"amenities" text[] DEFAULT '{}' NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"pinX" numeric(9, 6),
	"pinY" numeric(9, 6),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_document" (
	"id" text PRIMARY KEY NOT NULL,
	"propertyId" text NOT NULL,
	"leaseId" text,
	"title" text NOT NULL,
	"storageKey" text,
	"landlordSigned" boolean DEFAULT false NOT NULL,
	"tenantSigned" boolean DEFAULT false NOT NULL,
	"isDigital" boolean DEFAULT true NOT NULL,
	"clauses" text[] DEFAULT '{}',
	"uploadedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	"phone" text,
	"phoneVerified" timestamp,
	"passwordHash" text,
	"role" "user_role" DEFAULT 'tenant' NOT NULL,
	"idVerified" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_propertyId_property_id_fk" FOREIGN KEY ("propertyId") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application" ADD CONSTRAINT "application_tenantId_user_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_ledger" ADD CONSTRAINT "escrow_ledger_leaseId_lease_id_fk" FOREIGN KEY ("leaseId") REFERENCES "public"."lease"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_ledger" ADD CONSTRAINT "escrow_ledger_fromUserId_user_id_fk" FOREIGN KEY ("fromUserId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_ledger" ADD CONSTRAINT "escrow_ledger_toUserId_user_id_fk" FOREIGN KEY ("toUserId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_verification" ADD CONSTRAINT "kyc_verification_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease" ADD CONSTRAINT "lease_propertyId_property_id_fk" FOREIGN KEY ("propertyId") REFERENCES "public"."property"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease" ADD CONSTRAINT "lease_tenantId_user_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease" ADD CONSTRAINT "lease_landlordId_user_id_fk" FOREIGN KEY ("landlordId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_ticket" ADD CONSTRAINT "maintenance_ticket_propertyId_property_id_fk" FOREIGN KEY ("propertyId") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_ticket" ADD CONSTRAINT "maintenance_ticket_leaseId_lease_id_fk" FOREIGN KEY ("leaseId") REFERENCES "public"."lease"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_ticket" ADD CONSTRAINT "maintenance_ticket_tenantId_user_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_ticket" ADD CONSTRAINT "maintenance_ticket_artisanId_user_id_fk" FOREIGN KEY ("artisanId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_leaseId_lease_id_fk" FOREIGN KEY ("leaseId") REFERENCES "public"."lease"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_payerId_user_id_fk" FOREIGN KEY ("payerId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property" ADD CONSTRAINT "property_landlordId_user_id_fk" FOREIGN KEY ("landlordId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_document" ADD CONSTRAINT "property_document_propertyId_property_id_fk" FOREIGN KEY ("propertyId") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_document" ADD CONSTRAINT "property_document_leaseId_lease_id_fk" FOREIGN KEY ("leaseId") REFERENCES "public"."lease"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;