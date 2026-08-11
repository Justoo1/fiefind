import type { NextAuthConfig } from "next-auth"
import { z } from "zod"

// This file is imported by proxy.ts which runs in an optimistic (edge-lite)
// context. It must NOT import drizzle-orm, bcryptjs, or lib/db.
// Credential providers with full authorize() are defined in auth.ts instead.

export const authConfig: NextAuthConfig = {
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isApiRoute = nextUrl.pathname.startsWith("/api/")
      const isAuthRoute = nextUrl.pathname.startsWith("/api/auth")

      if (isApiRoute && !isAuthRoute && !isLoggedIn) return false
      return true
    },
  },
  pages: {
    signIn: "/",
  },
  session: { strategy: "database" },
}

export const emailSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})

export const phoneSchema = z.object({
  phone: z.string().min(9),
  password: z.string().min(8),
})
