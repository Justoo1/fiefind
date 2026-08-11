import type { DefaultSession, DefaultUser } from "next-auth"
import type { DefaultJWT } from "next-auth/jwt"

type UserRole = "tenant" | "landlord" | "service_provider" | "admin"

declare module "next-auth" {
  interface User extends DefaultUser {
    role?: UserRole
  }

  interface Session {
    user: {
      id: string
      role: UserRole
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string
    role?: UserRole
  }
}
