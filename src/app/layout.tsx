import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Tribune — les supporters financent leur club", template: "%s · Tribune" },
  description:
    "Financement participatif des clubs de football par leurs supporters, avec paiement Mobile Money (M-Pesa, Airtel Money, Orange Money) et suivi de chaque dollar.",
};

export const viewport: Viewport = {
  themeColor: "#1d5237",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Source+Sans+3:wght@400;600;700&display=swap"
        />
      </head>
      <body>
        <Header />
        <main id="app">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
