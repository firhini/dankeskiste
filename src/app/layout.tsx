import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

/**
 * Newsreader im Display-Schnitt: aus der variablen Google-Fonts-Datei erzeugt (optische Größe fest
 * auf 72, Gewicht 400–500, lateinischer Zeichensatz). 77 kB statt 275 kB – siehe DECISIONS.md, T18.
 */
const newsreader = localFont({
  src: [
    { path: "../assets/fonts/Newsreader-Display-Roman.woff2", style: "normal", weight: "400 500" },
    { path: "../assets/fonts/Newsreader-Display-Italic.woff2", style: "italic", weight: "400 500" },
  ],
  variable: "--font-newsreader",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Dankeskiste – Geschenkboxen für Mitarbeiter und Kunden",
    template: "%s · Dankeskiste",
  },
  description:
    "Geschenkboxen für Firmen: von Hand gepackt in Schwetzingen, mit Ihrem Logo und Grußkarte. Versand deutschlandweit, Lieferung in Mannheim und Heidelberg.",
  applicationName: "Dankeskiste",
  formatDetection: { telephone: false, email: false, address: false },
  verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION }
    : undefined,
  openGraph: { type: "website", locale: "de_DE", siteName: "Dankeskiste" },
};

export const viewport: Viewport = {
  themeColor: "#ebebd8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${newsreader.variable} ${hanken.variable}`}>
      <body>{children}</body>
    </html>
  );
}
