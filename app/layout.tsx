import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "CTL-SLITTER (AI Optimizer)",
  description: "Steel Service Centre Coil-to-Line Optimization",
  generator: "Uttam Innovative Solution Pvt. Ltd.",
  icons: {
    icon: "/favicon.svg",
  },
  manifest: "/manifest.json",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#4b7cff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#a5c7ff" media="(prefers-color-scheme: dark)" />
      </head>
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
