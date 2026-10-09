import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { Providers } from "@/components/providers";
import { env } from "@/lib/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/**
 * The canonical URL and app name, derived from configuration so a deployment only
 * changes `.env`. Falls back to the localhost default that `lib/env` supplies.
 */
const appUrl = env.NEXT_PUBLIC_APP_URL;

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "PH Healthcare — Healthcare Management System",
    template: "%s · PH Healthcare",
  },
  description:
    "Manage patients, doctors, appointments, clinical records, laboratory results and billing for a healthcare center.",
  applicationName: "PH Healthcare",
  keywords: [
    "healthcare management",
    "clinic software",
    "patient records",
    "appointments",
    "medical billing",
  ],
  authors: [{ name: "PH Healthcare" }],
  robots: {
    /*
     * §59: medical records must never be indexed. This is the crawler-facing half
     * of that promise; the other half is that every dashboard route and API is
     * authenticated server-side.
     */
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  openGraph: {
    type: "website",
    siteName: "PH Healthcare",
    title: "PH Healthcare — Healthcare Management System",
    description:
      "Manage patients, doctors, appointments, clinical records, laboratory results and billing.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PH Healthcare",
    description: "Healthcare Management System",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Both light and dark, so the browser chrome matches the app in either mode.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // `suppressHydrationWarning` is required by next-themes: the server has no
      // way to know the OS preference, so it renders no class and the client adds
      // one. React would otherwise report a hydration mismatch on <html>.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        {/* Keyboard users get a visible skip target before the navigation. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}