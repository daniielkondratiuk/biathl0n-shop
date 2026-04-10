import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/shared/theme";
import { CartProvider } from "@/features/cart";

const GLOBAL_DESCRIPTION =
  "Predators is a premium streetwear brand focused on bold design, high-quality materials, and modern urban style. Discover exclusive clothing and custom apparel in the official Predators store.";

export const metadata: Metadata = {
  metadataBase: new URL("https://predators.fr"),
  title: {
    default: "Predators — Premium Streetwear & Custom Apparel",
    template: "%s | Predators",
  },
  description: GLOBAL_DESCRIPTION,
  openGraph: {
    title: "Predators — Premium Streetwear & Custom Apparel",
    description: GLOBAL_DESCRIPTION,
    siteName: "Predators",
    type: "website",
    url: "https://predators.fr",
  },
  alternates: {
    canonical: "https://predators.fr",
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
              name: "Predators",
              url: "https://predators.fr",
              logo: "https://predators.fr/logo.png",
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