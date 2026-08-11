"use server"

import { redirect } from "next/navigation"
import { eq, or } from "drizzle-orm"
import { z } from "zod"
import { NeonDbError } from "@neondatabase/serverless"
import { signIn, signOut, auth } from "@/auth"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { hashPassword } from "@/lib/auth/password"

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z
    .email({ error: "Invalid email address" })
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .min(9, "Phone must be at least 9 digits")
    .optional()
    .or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["tenant", "landlord", "service_provider"]).default("tenant"),
})

export type SignupState = {
  error?: string
  success?: boolean
}

export async function signup(
  _prev: SignupState | null,
  formData: FormData
): Promise<SignupState> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    role: formData.get("role"),
  }

  const parsed = signupSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, email, phone, password, role } = parsed.data

  if (!email && !phone) {
    return { error: "Email or phone number is required" }
  }

  // Check for duplicates
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(
      or(
        email ? eq(users.email, email) : undefined,
        phone ? eq(users.phone, phone) : undefined
      )
    )
    .then((r) => r[0] ?? null)

  if (existing) {
    return { error: "An account with this email or phone already exists" }
  }

  const passwordHash = await hashPassword(password)

  await db.insert(users).values({
    name,
    email: email || null,
    phone: phone || null,
    passwordHash,
    role,
  })

  // Sign in immediately after signup
  await signIn(email ? "email-credentials" : "phone-credentials", {
    email,
    phone,
    password,
    redirect: false,
  })

  return { success: true }
}

export async function login(
  _prev: SignupState | null,
  formData: FormData
): Promise<SignupState> {
  const identifier = formData.get("identifier") as string | null
  const password = formData.get("password") as string | null

  if (!password) return { error: "Password is required" }
  if (!identifier) return { error: "Email or phone is required" }

  const stripped = identifier.replace(/\s/g, "")
  const isPhone = /^\+?\d{7,}$/.test(stripped)
  const email = !isPhone ? identifier : null
  const phone = isPhone ? identifier : null

  try {
    await signIn(email ? "email-credentials" : "phone-credentials", {
      email: email ?? undefined,
      phone: phone ?? undefined,
      password,
      redirect: false,
    })
    return { success: true }
  } catch {
    return { error: "Invalid email/phone or password" }
  }
}

export async function logout() {
  await signOut({ redirect: false })
  redirect("/")
}

export interface ProfileData {
  name: string | null
  email: string | null
  phone: string | null
  role: string
  idVerified: boolean
  specialty: string | null
  createdAt: string
}

export async function getProfile(): Promise<ProfileData | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  const row = await db
    .select({
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      idVerified: users.idVerified,
      specialty: users.specialty,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .then((r) => r[0] ?? null)
  if (!row) return null
  return { ...row, createdAt: row.createdAt.toISOString() }
}

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name is too long"),
  phone: z
    .string()
    .min(9, "Phone must be at least 9 digits")
    .optional()
    .or(z.literal("")),
  specialty: z
    .string()
    .max(80, "Specialty is too long")
    .optional()
    .or(z.literal("")),
})

export type UpdateProfileState = {
  error?: string
  fieldErrors?: { phone?: string }
  success?: boolean
  name?: string
  phone?: string | null
  specialty?: string | null
}

export async function updateProfile(
  _prev: UpdateProfileState | null,
  formData: FormData
): Promise<UpdateProfileState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Not signed in" }

  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    specialty: formData.get("specialty"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, phone, specialty } = parsed.data
  const normalizedPhone = phone || null
  // specialty is only meaningful for service providers — ignore it for any other role
  // regardless of what the client sent.
  const normalizedSpecialty =
    session.user.role === "service_provider" ? specialty || null : null

  try {
    await db
      .update(users)
      .set({
        name,
        phone: normalizedPhone,
        specialty: normalizedSpecialty,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id))
  } catch (err) {
    // drizzle-orm wraps every driver error in a DrizzleQueryError — the
    // original NeonDbError (with the Postgres error code) is on `.cause`.
    const cause = err instanceof Error ? err.cause : undefined
    if (cause instanceof NeonDbError && cause.code === "23505") {
      return { fieldErrors: { phone: "This phone number is already in use" } }
    }
    throw err
  }

  return {
    success: true,
    name,
    phone: normalizedPhone,
    specialty: normalizedSpecialty,
  }
}
