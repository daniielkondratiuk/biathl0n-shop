import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/shared/theme";
import { CartProvider } from "@/features/cart";

const GLOBAL_DESCRIPTION =
  "Biathl0n Shop is a premium sportswear store focused on biathlon-inspired apparel, clean embroidered designs, and modern athletic style.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.biathl0n.com"),
  title: {
    default: "Biathl0n Shop",
    template: "%s | Biathl0n Shop",
  },
  description: GLOBAL_DESCRIPTION,
  openGraph: {
    title: "Biathl0n Shop",
    description: GLOBAL_DESCRIPTION,
    siteName: "Biathl0n Shop",
    type: "website",
    url: "https://www.biathl0n.com",
  },
  alternates: {
    canonical: "https://www.biathl0n.com",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen text-foreground antialiased"
      >
        <Script
          id="organization-ld-json"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Biathl0n Shop",
              url: "https://www.biathl0n.com",
              logo: "https://www.biathl0n.com/logo-biathl0n-black.png",
              sameAs: [
                "https://www.instagram.com/predators_boutique/",
                "https://www.tiktok.com/@predators_boutique",
                "https://www.threads.com/@predators_boutique",
              ],
            }),
          }}
        />
        <ThemeProvider>
          <CartProvider>
            <div className="flex min-h-screen flex-col text-foreground">
              {children}
            </div>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}