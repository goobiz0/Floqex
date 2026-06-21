import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/ui/themes";
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
  themeColor: "#09090b",
  colorScheme: "dark",
};

/**
 * Auth UI is custom-built with Clerk headless hooks (see src/components/auth).
 * This appearance only themes Clerk-managed surfaces we still render, e.g.
 * <UserButton/>, to the Floqex dark palette (emerald accent, 8px controls).
 */
const clerkAppearance = {
  theme: dark,
  variables: {
    colorPrimary: "#10b981",
    colorBackground: "#18181b",
    colorInputBackground: "#27272a",
    colorText: "#fafafa",
    colorTextSecondary: "#a1a1aa",
    colorInputText: "#fafafa",
    colorDanger: "#ef4444",
    colorSuccess: "#10b981",
    borderRadius: "8px",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
} as const;

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
        <ClerkProvider appearance={clerkAppearance}>{children}</ClerkProvider>
      </body>
    </html>
  );
}
