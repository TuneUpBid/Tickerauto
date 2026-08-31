import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, IBM_Plex_Mono, Source_Sans_3 } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "MotorLedger",
  description:
    "Collector-car portfolio tracking, source-backed market estimates, and lender-facing collateral documentation.",
  appleWebApp: {
    capable: true,
    title: "MotorLedger",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0c0b09" },
    { media: "(prefers-color-scheme: light)", color: "#f4efe6" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${fraunces.variable} ${ibmPlexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-bg text-ink min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
