import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Source_Sans_3 } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DemoBanner } from "@/components/DemoBanner";
import { CookieBanner } from "@/components/CookieBanner";
import { FreshOnBack } from "@/components/FreshOnBack";
import { env } from "@/lib/env";
import "./globals.css";

// Polices servies par le site lui-même (pas d'appel à Google à chaque visite),
// avec des polices de secours ajustées pour éviter que le texte ne saute au chargement.
const display = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display", display: "swap" });
const body = Source_Sans_3({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  // Adresse absolue des images de partage (aperçus WhatsApp, Facebook…).
  metadataBase: new URL(env.siteUrl),
  title: { default: "Tribune — les supporters financent leur club", template: "%s · Tribune" },
  description:
    "Financement participatif des clubs de football par leurs supporters, avec paiement Mobile Money (M-Pesa, Airtel Money, Orange Money) et suivi de chaque dollar. Une plateforme de Plumes Capital.",
};

export const viewport: Viewport = {
  themeColor: "#1d5237",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`}>
      <body>
        <DemoBanner />
        <Header />
        <main id="app">{children}</main>
        <Footer />
        <CookieBanner />
        <FreshOnBack />
      </body>
    </html>
  );
}
