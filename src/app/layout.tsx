import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://floqex.com"),
  title: {
    default: "Floqex: Automated trading, fully transparent",
    template: "%s · Floqex",
  },
  description:
    "Connect a broker, configure a strategy, and let a bot trade for you with hard risk limits and a fully transparent decision log.",
  openGraph: {
    title: "Floqex: Automated trading, fully transparent",
    description:
      "Connect a broker, configure a strategy, and let a bot trade for you with hard risk limits and a fully transparent decision log.",
    type: "website",
    siteName: "Floqex",
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f5f7",
  colorScheme: "light",
};

import { Toaster } from "sonner";

// Auth UI is entirely custom-built on Clerk's headless hooks (see
// src/components/auth); no prebuilt Clerk widgets are rendered, so the provider
// needs no widget appearance. The product is dark-locked at the app level.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-[100dvh] bg-base text-fg">
        <ClerkProvider
          signInUrl="https://users.floqex.com/sign-in"
          domain="floqex.com"
          isSatellite={true}
        >
          {children}
        </ClerkProvider>
        <Toaster position="bottom-right" theme="dark" />
      </body>
    </html>
  );
}
