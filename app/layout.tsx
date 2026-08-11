import { Fira_Code, Inter } from "next/font/google"
import { SessionProvider } from "next-auth/react"

import "./globals.css"
import { auth } from "@/auth"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/components/providers"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", inter.variable, firaCode.variable)}
    >
      <body>
        <SessionProvider session={session}>
          <ThemeProvider>
            <Providers>{children}</Providers>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
