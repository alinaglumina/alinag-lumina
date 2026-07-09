import type { Metadata, Viewport } from "next";
import { display, sans, mono } from "@/lib/fonts";
import { organizationJsonLd } from "@/lib/seo";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PWARegister from "@/components/PWARegister";
import { AuthProvider } from "@/hooks/useAuth";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Alinag Lumina — Premium Shopping", template: "%s · Alinag Lumina" },
  description: "Fashion, electronics and more — fast delivery, secure payments, delightful design.",
  openGraph: { type: "website", siteName: "Alinag Lumina", url: SITE },
  twitter: { card: "summary_large_image" },
  manifest: "/manifest.webmanifest",
  robots: { index: true, follow: true },
  alternates: { canonical: SITE },
};
export const viewport: Viewport = { themeColor: "#080b16", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd(SITE)) }} />
        <AuthProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <PWARegister />
        </AuthProvider>
      </body>
    </html>
  );
}
