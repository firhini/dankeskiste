import type { Metadata } from "next";
import { Bestellung, type BestellBoxInfo } from "@/components/shop/bestellung";
import { Brotkrumen } from "@/components/shop/brotkrumen";
import type { Einstellungen } from "@/lib/einstellungen";
import { ladeEinstellungen } from "@/lib/server/einstellungen";
import { ladeKatalog } from "@/lib/server/katalog";

export const metadata: Metadata = {
  title: "Geschenkboxen bestellen",
  description: "Boxen wählen, Logo hochladen, Lieferung festlegen, bezahlen: Bestellung in vier Schritten. Ab 5 Boxen, nur für Unternehmen.",
  alternates: { canonical: "/bestellen" },
};

/** Für den Browser: interne Kosten (Porto, Material, Gebührenmodell) entfernen – dort zählen nur Verkaufspreise. */
function oeffentlich(e: Einstellungen): Einstellungen {
  const ohne = (x: { preisCent: number; materialCent: number }) => ({ preisCent: x.preisCent, materialCent: 0 });
  return {
    ...e,
    personalisierung: { ...e.personalisierung, logoSticker: ohne(e.personalisierung.logoSticker), grusskarte: ohne(e.personalisierung.grusskarte), handgeschrieben: ohne(e.personalisierung.handgeschrieben), banderole: ohne(e.personalisierung.banderole), namensanhaenger: ohne(e.personalisierung.namensanhaenger) },
    versand: { ...e.versand, materialProPaketCent: 0, stufen: e.versand.stufen.map((s) => ({ ...s, kostenCent: 0 })) },
    gebuehren: { prozent: 0, fixCent: 0, rechnungProzent: 0, rechnungMaxCent: 0 },
    margen: { zielProzent: 0, minProzent: 0 },
    kontakt: { ...e.kontakt, steuernummer: "" },
  };
}

export default async function Bestellen() {
  const [{ boxen }, e] = await Promise.all([ladeKatalog(), ladeEinstellungen()]);
  const infos: BestellBoxInfo[] = boxen.map((b) => {
    const bild = b.bilder.find((x) => x.art === "hero") ?? b.bilder[0];
    return { slug: b.slug, name: b.name, preisCent: b.preisCent, groesse: b.groesse, gewichtGramm: b.gewichtGramm, alkohol: b.alkohol, kurz: b.kurz, kollektion: b.kollektionName, bild: bild ? (Object.entries(bild.varianten.webp).sort((x, y) => Number(x[0]) - Number(y[0]))[0]?.[1] ?? null) : null };
  });
  return (
    <div className="rand pb-16 pt-8 lg:pb-24 lg:pt-12">
      <Brotkrumen pfad={[["Bestellen", "/bestellen"]]} />
      <h1 className="mb-8 mt-6 !text-[clamp(2.2rem,1.6rem+2.8vw,3.75rem)] text-oliv lg:mb-12">
        Bestellung in <em>vier Schritten</em>
      </h1>
      <Bestellung boxen={infos} e={oeffentlich(e)} />
      <noscript>
        <p className="mt-6 border border-dunkel p-4">Für die Bestellung wird JavaScript benötigt. Alternativ erreichen Sie uns über die Kontaktdaten im Impressum.</p>
      </noscript>
    </div>
  );
}
