import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { headers } from "next/headers";
import { Outfit, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
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

import { Toaster } from "sonner";
import { PrivacyProvider } from "@/components/privacy-provider";
import { DisplayProvider } from "@/components/display-provider";
import { NavigationLoader } from "@/components/navigation-loader";
import { ChunkErrorReload } from "@/components/chunk-error-reload";
import { WebVitals } from "@/components/web-vitals";

// Auth UI is entirely custom-built on Clerk's headless hooks (see
// src/components/auth); no prebuilt Clerk widgets are rendered, so the provider
// needs no widget appearance. The product is dark-locked at the app level.
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const reqHeaders = await headers();
  const host = (reqHeaders.get("host") ?? "").split(":")[0].toLowerCase();
  let root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "";
  if (!root && host !== "localhost" && host !== "127.0.0.1") {
    const parts = host.split(".");
    if (parts.length >= 2) root = parts.slice(-2).join(".");
  }

  return (
    <html
      lang="en"
      className={`${outfit.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-[100dvh] bg-base text-fg">
        <WebVitals />
        <ChunkErrorReload />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <DisplayProvider>
            <PrivacyProvider>
              <ClerkProvider
                signInUrl="/sign-in"
                signUpUrl="/sign-up"
                signInFallbackRedirectUrl="/dashboard"
                signUpFallbackRedirectUrl="/onboarding"
              >
                {children}
              </ClerkProvider>
              <NavigationLoader />
              <Toaster position="bottom-right" />
            </PrivacyProvider>
          </DisplayProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
