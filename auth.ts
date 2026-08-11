import NextAuth from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import Credentials from "next-auth/providers/credentials"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema"
import { verifyPassword } from "@/lib/auth/password"
import { emailSchema, phoneSchema } from "@/auth.config"

export const { auth, signIn, signOut, handlers } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // JWT is required for Credentials providers — Auth.js blocks database strategy
  // with Credentials. The adapter stays so future OAuth providers can use it.
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      id: "email-credentials",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = emailSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, parsed.data.email))
          .then((r) => r[0] ?? null)

        if (!user?.passwordHash) return null
        if (!(await verifyPassword(parsed.data.password, user.passwordHash)))
          return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
    Credentials({
      id: "phone-credentials",
      name: "Phone",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = phoneSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await db
          .select()
          .from(users)
          .where(eq(users.phone, parsed.data.phone))
          .then((r) => r[0] ?? null)

        if (!user?.passwordHash) return null
        if (!(await verifyPassword(parsed.data.password, user.passwordHash)))
          return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    // Route protection — used by proxy.ts
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user
      const isApiRoute = nextUrl.pathname.startsWith("/api/")
      const isAuthRoute = nextUrl.pathname.startsWith("/api/auth")
      if (isApiRoute && !isAuthRoute && !isLoggedIn) return false
      return true
    },
    // JWT strategy: stamp id + role into the token on sign-in
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      // Client called `update(data)` (e.g. after editing the profile) — merge
      // the new fields into the token so the topbar reflects them immediately.
      if (trigger === "update" && session) {
        if (typeof session.name === "string") token.name = session.name
      }
      return token
    },
    // Read id + role back out of the token for client session access
    async session({ session, token }) {
      if (token?.id) session.user.id = token.id
      if (token?.role) session.user.role = token.role
      return session
    },
  },
  pages: {
    signIn: "/",
  },
})
