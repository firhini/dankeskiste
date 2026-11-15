/**
 * Verpackungsmaterial – Stand der Recherche: 15.11.2026. Alle Preise brutto (Kleinunternehmer:
 * kein Vorsteuerabzug). Status wie im Artikelkatalog; Preise stammen aus Suchauszügen der
 * Shopseiten und sind vor der ersten Bestellung im Shop gegenzuprüfen.
 */
import type { PreisStatus } from "./artikel";

export interface SeedVerpackung {
  id: string;
  name: string;
  art: "karton" | "fuellung" | "band" | "karte" | "sticker" | "papier" | "schutz" | "versand" | "personalisierung";
  einheit: string;
  /** Cent je Einheit (bei kg/m entsprechend je kg bzw. je Meter) */
  preisCent: number;
  gewichtGramm: number;
  lieferant: string;
  quelleUrl: string;
  quelleHinweis: string;
  geprueftAm: string;
  status: PreisStatus;
}

const D = "2026-11-15";

export const verpackung: SeedVerpackung[] = [
  {
    id: "karton-klein", name: "Faltschachtel braun mit Klappdeckel, 240×170×73 mm (Fefco 0427)", art: "karton",
    einheit: "Stück", preisCent: 60, gewichtGramm: 90, lieferant: "karton.eu",
    quelleUrl: "https://www.karton.eu/240x170x73-mm-Single-Wall-Folding-Box",
    quelleHinweis: "Staffel belegt: 10 St. 2,26 €/St., 1.400 St. 0,35 €/St.; Preis bei 100 St. geschätzt 0,45–0,60 €",
    geprueftAm: D, status: "geschaetzt",
  },
  {
    id: "karton-flach", name: "Faltschachtel braun mit Klappdeckel, 305×215×74 mm (Art. 6303)", art: "karton",
    einheit: "Stück", preisCent: 55, gewichtGramm: 140, lieferant: "karton.eu",
    quelleUrl: "https://www.karton.eu/305x215x74-mm-Faltschachtel-DHL-Kleinpaket",
    quelleHinweis: "Staffel inkl. MwSt.: 100 St. 0,55 €/St., 200 St. 0,39 €/St., versandkostenfrei",
    geprueftAm: D, status: "belegt",
  },
  {
    id: "karton-mittel", name: "Stülpdeckelkarton braun, 2-teilig, 305×215×100 mm", art: "karton",
    einheit: "Stück", preisCent: 125, gewichtGramm: 230, lieferant: "verpackungsteam.de",
    quelleUrl: "https://verpackungsteam.de/Verpackungsmaterial/Kartons/Din-A4-Groesse/Stuelpdeckelkarton-aus-Wellpappe-braun-hoehenverstellbar-2-teilig-305x215x100mm::2976.html",
    quelleHinweis: "25–124 St.: 0,932 € netto = 1,11 € brutto je Stück; zzgl. Versand (Anteil mit 0,14 € geschätzt)",
    geprueftAm: D, status: "richtwert",
  },
  {
    id: "karton-gross", name: "Karton braun mit Steckverschluss, innen 331×241×104 mm", art: "karton",
    einheit: "Stück", preisCent: 160, gewichtGramm: 180, lieferant: "kayoo.eu",
    quelleUrl: "https://www.kayoo.eu/business-industrie/kartonagen-faltschachteln/dpd-kartons/paketklasse-s/3407/versandkarton-331-x-241-x-104-mm-mit-steckverschluss-in-braun",
    quelleHinweis: "Auszug: 1,94–2,08 € bei 20 St., 1,26 € ab 120 St.; netto/brutto unklar – mit 1,60 € angesetzt",
    geprueftAm: D, status: "geschaetzt",
  },
  {
    id: "holzwolle", name: "Holzwolle fein, natur (für trockene Lebensmittel geeignet)", art: "fuellung",
    einheit: "kg", preisCent: 600, gewichtGramm: 1000, lieferant: "natuerlich-verpacken.de",
    quelleUrl: "https://www.natuerlich-verpacken.de/wood-wool-fine-natural-padding-material",
    quelleHinweis: "4,5 kg für 24,29 € = 5,40 €/kg inkl. MwSt.; zzgl. Versand (auf 6,00 €/kg aufgerundet)",
    geprueftAm: D, status: "richtwert",
  },
  {
    id: "band-oliv", name: "Baumwoll-Köperband oliv, 10–15 mm", art: "band",
    einheit: "m", preisCent: 35, gewichtGramm: 4, lieferant: "baender24.de",
    quelleUrl: "https://www.baender24.de/baender/einfassband-/-schraegband/koeperband/",
    quelleHinweis: "Köperband 20 mm khaki, 50 m für 15,99 € = 0,32 €/m; genau Oliv in 10–15 mm nicht belegt",
    geprueftAm: D, status: "geschaetzt",
  },
  {
    id: "grusskarte-a6", name: "Grußkarte A6, bedruckt, 330 g", art: "karte",
    einheit: "Stück", preisCent: 35, gewichtGramm: 6, lieferant: "moo.com",
    quelleUrl: "https://www.moo.com/de/postcards/a6",
    quelleHinweis: "Staffel je Stück: 250 St. 0,35 €, 500 St. 0,30 €",
    geprueftAm: D, status: "richtwert",
  },
  {
    id: "logo-sticker", name: "Aufkleber rund 50 mm, bedruckt", art: "sticker",
    einheit: "Stück", preisCent: 8, gewichtGramm: 1, lieferant: "saxoprint.de",
    quelleUrl: "https://www.saxoprint.de/werbebedarf/aufkleber/runde-aufkleber",
    quelleHinweis: "500 St. 31,33 € (0,063–0,075 €/St. je nach MwSt.-Ausweis); bei kleinen Kundenauflagen Selbstdruck auf Avery-Kraftetikett ca. 0,06 €",
    geprueftAm: D, status: "richtwert",
  },
  {
    id: "seidenpapier", name: "Seidenpapier 50×75 cm, 22 g/m², lebensmittelecht", art: "papier",
    einheit: "Bogen", preisCent: 8, gewichtGramm: 8, lieferant: "hilde24.de",
    quelleUrl: "https://www.hilde24.de/Seidenpapier-ca-22-g-m%C2%B2-Format-50-x-75-cm/14/AA9079C/",
    quelleHinweis: "480 Bogen 29,73 € (vermutlich netto → ca. 0,074 € brutto je Bogen)",
    geprueftAm: D, status: "richtwert",
  },
  {
    id: "flaschenschutz", name: "Wellpapp-Hülse für 0,75-l-Flasche", art: "schutz",
    einheit: "Stück", preisCent: 60, gewichtGramm: 60, lieferant: "karton.eu",
    quelleUrl: "https://www.karton.eu/",
    quelleHinweis: "Kein Preisbeleg; Schätzung. DHL sieht für Flaschen zertifizierte Flaschenkartons vor (dhl.de/verpackung)",
    geprueftAm: D, status: "geschaetzt",
  },
  {
    id: "versandkarton-einzel", name: "Versandkarton einwellig 350×250×100 mm (für eine Box)", art: "versand",
    einheit: "Stück", preisCent: 80, gewichtGramm: 160, lieferant: "karton.eu",
    quelleUrl: "https://www.karton.eu/350x250x100-mm-Single-Wall-Box-Parcel-for-DHL-External-Dimensions",
    quelleHinweis: "Staffel: 20 St. 1,52 €/St., 2.720 St. 0,37 €/St.; bei 100 St. geschätzt 0,55–0,90 €",
    geprueftAm: D, status: "geschaetzt",
  },
  {
    id: "versandkarton-sammel", name: "Sammelkarton zweiwellig 600×400×400 mm", art: "versand",
    einheit: "Stück", preisCent: 350, gewichtGramm: 1000, lieferant: "karton.eu",
    quelleUrl: "https://www.karton.eu/600x400x400-mm-Double-Wall-Box-External-Dimensions",
    quelleHinweis: "Titelpreis „ab 1,40 €“ (höchste Staffel); älterer Auszug 50 St. 3,38 €/St. – mit 3,50 € angesetzt",
    geprueftAm: D, status: "geschaetzt",
  },
  {
    id: "namensanhaenger", name: "Kraft-Anhänger 90×40 mm mit Juteschnur", art: "personalisierung",
    einheit: "Stück", preisCent: 10, gewichtGramm: 2, lieferant: "Amazon (ABSOFINE) / Bürobedarf",
    quelleUrl: "https://www.beste-testsieger.de/produkte/absofine-preisschilder/",
    quelleHinweis: "200 St. 9,59 € = 0,05 €/St.; mit Druck/Beschriftung 0,10 € angesetzt",
    geprueftAm: D, status: "richtwert",
  },
  {
    id: "banderole", name: "Banderole 7 cm, Selbstdruck auf 120-g-Papier (zwei Streifen)", art: "personalisierung",
    einheit: "Stück", preisCent: 30, gewichtGramm: 8, lieferant: "Selbstdruck",
    quelleUrl: "https://print24.com/uk/printing-products/banderoles",
    quelleHinweis: "Kein Preisbeleg; Schätzung Papier + Toner. Druckerei-Banderolen geschätzt 0,25–0,60 € bei 100–250 St.",
    geprueftAm: D, status: "geschaetzt",
  },
  {
    id: "karte-handschrift", name: "Zuschlag handgeschriebene Karte (Umschlag C6 Kraft, Fineliner)", art: "personalisierung",
    einheit: "Stück", preisCent: 15, gewichtGramm: 5, lieferant: "Bürobedarf",
    quelleUrl: "https://www.ebay.de/str/envelopes4u2",
    quelleHinweis: "Umschläge C6 Kraft 0,03–0,06 €/St.; Stiftverbrauch geschätzt",
    geprueftAm: D, status: "geschaetzt",
  },
];

/** Standard-Verpackung je Boxgröße: [Verpackungs-ID, Menge] */
export const verpackungJeGroesse: Record<"klein" | "flach" | "mittel" | "gross", [string, number][]> = {
  klein: [["karton-klein", 1], ["holzwolle", 0.045], ["band-oliv", 1.1], ["grusskarte-a6", 1], ["logo-sticker", 1], ["seidenpapier", 1]],
  flach: [["karton-flach", 1], ["holzwolle", 0.06], ["band-oliv", 1.3], ["grusskarte-a6", 1], ["logo-sticker", 1], ["seidenpapier", 2]],
  mittel: [["karton-mittel", 1], ["holzwolle", 0.08], ["band-oliv", 1.4], ["grusskarte-a6", 1], ["logo-sticker", 1], ["seidenpapier", 2]],
  gross: [["karton-gross", 1], ["holzwolle", 0.1], ["band-oliv", 1.5], ["grusskarte-a6", 1], ["logo-sticker", 1], ["seidenpapier", 2]],
};

export const verpackungNachId = new Map(verpackung.map((v) => [v.id, v]));
