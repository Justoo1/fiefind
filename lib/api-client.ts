import "server-only"
import { auth } from "@/auth"

export async function apiFetch(
  path: string,
  opts: RequestInit = {}
): Promise<unknown> {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthenticated")

  const res = await fetch(`${process.env.FASTAPI_BASE_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": process.env.INTERNAL_API_SECRET!,
      "X-User-Id": session.user.id,
      "X-User-Role": session.user.role,
      ...(opts.headers as Record<string, string> | undefined),
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      (body as { detail?: string }).detail ?? `API error ${res.status}`
    )
  }

  return res.json()
}
