import "server-only"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export type UserRole = "tenant" | "landlord" | "service_provider" | "admin"

export async function verifySession() {
  const session = await auth()
  if (!session?.user?.id) redirect("/")
  return session
}

export async function verifyRole(allowed: UserRole[]) {
  const session = await verifySession()
  if (!allowed.includes(session.user.role as UserRole)) redirect("/")
  return session
}
