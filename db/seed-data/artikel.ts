/**
 * Artikelkatalog – Stand der Preisrecherche: 15.11.2026.
 *
 * Preisstatus:
 *  - "belegt":    Preis stand auf der Händlerseite der genannten Quelle (bundesweit einheitliche
 *                 Preise bei dm, Rossmann, Lidl, Aldi Süd). Geprüft über Suchauszüge der Seite.
 *  - "richtwert": Preis eines Online-Supermarkts oder Hersteller-Shops (EDEKA24, Knuspr, UVP).
 *                 Der Regalpreis im Markt in Schwetzingen kann abweichen – vor Ort prüfen.
 *  - "geschaetzt": kein belastbarer Beleg gefunden; Schätzung aus Vergleichswerten.
 *
 * Gewichte sind Bruttogewichte inkl. Verpackung (geschätzt). Allergene sind Entwürfe nach
 * üblicher Rezeptur und müssen vor Livegang an der Originalpackung geprüft werden
 * (`allergeneGeprueft: false` → im Shop erscheint nur der allgemeine Hinweis).
 */

export type Laden = "REWE" | "EDEKA" | "Kaufland" | "dm" | "Rossmann" | "Lidl" | "Aldi Süd";
export type PreisStatus = "belegt" | "richtwert" | "geschaetzt";

export interface RenderInfo {
  type:
    | "coffee_bag" | "tea_box" | "chocolate_bar" | "praline_box" | "cookie_pack" | "tin" | "jar"
    | "bottle" | "bottle_small" | "pouch" | "pasta_bag" | "marzipan_loaf" | "stick_pack" | "notebook" | "candle";
  label: string;
  sub: string;
  tone?: string;
  contents?: string;
  variant?: string;
  dims?: [number, number, number];
}

export interface SeedArtikel {
  id: string;
  name: string;
  marke: string;
  groesse: string;
  kategorie: "Kaffee & Tee" | "Schokolade & Pralinen" | "Gebäck" | "Frühstück" | "Nüsse & Snacks" | "Getränke" | "Feinkost" | "Non-Food";
  laden: Laden;
  ersatz: string;
  preisCent: number;
  quelleUrl: string;
  quelleHinweis: string;
  geprueftAm: string;
  status: PreisStatus;
  gewichtGramm: number;
  mhd: string;
  alkohol: boolean;
  alkoholVol?: string;
  /** Artikel-ID des alkoholfreien Ersatzes (nur bei alkohol: true) */
  ersatzOhneAlkohol?: string;
  allergene: string;
  saisonal?: string;
  render: RenderInfo;
}

const D = "2026-11-15";

export const artikel: SeedArtikel[] = [
  // ───────────── Kaffee & Tee ─────────────
  {
    id: "lavazza-crema-e-gusto-250",
    name: "Crema e Gusto, gemahlen", marke: "Lavazza", groesse: "250 g", kategorie: "Kaffee & Tee",
    laden: "Rossmann", ersatz: "Lidl 5,49 € (supermarktcheck.de, gemeldet 24.08.2026); EDEKA24 5,99 €; REWE/Kaufland vor Ort",
    preisCent: 549, quelleUrl: "https://rossmann.de/de/ernaehrung-lavazza-crema-e-gusto/p/8000070038868",
    quelleHinweis: "Produktseite Rossmann: 5,49 € (1 kg = 21,96 €)", geprueftAm: D, status: "belegt",
    gewichtGramm: 265, mhd: "12–18 Monate ab Röstung, im Regal meist > 6 Monate", alkohol: false,
    allergene: "keine deklarationspflichtigen Allergene zu erwarten",
    render: { type: "coffee_bag", label: "Kaffee", sub: "GEMAHLEN · 250 G", tone: "dunkeloliv", dims: [8.5, 5.5, 17] },
  },
  {
    id: "lavazza-qualita-oro-250",
    name: "Qualità Oro, gemahlen", marke: "Lavazza", groesse: "250 g", kategorie: "Kaffee & Tee",
    laden: "REWE", ersatz: "EDEKA, Kaufland; REWE laut supermarktcheck.de zuletzt 5,99 € (undatiert)",
    preisCent: 679, quelleUrl: "https://www.knuspr.de/5534-lavazza-qualita-oro-gemahlen",
    quelleHinweis: "Online-Supermarkt Knuspr: 6,79 € (27,16 €/kg); zweiter Stand 6,19 €", geprueftAm: D, status: "richtwert",
    gewichtGramm: 265, mhd: "12–18 Monate ab Röstung", alkohol: false,
    allergene: "keine deklarationspflichtigen Allergene zu erwarten",
    render: { type: "coffee_bag", label: "Kaffee", sub: "100 % ARABICA · 250 G", tone: "oliv", dims: [8.5, 5.5, 17] },
  },
  {
    id: "dallmayr-prodomo-500",
    name: "Prodomo, gemahlen", marke: "Dallmayr", groesse: "500 g", kategorie: "Kaffee & Tee",
    laden: "Aldi Süd", ersatz: "Rossmann 9,99 €; EDEKA24 10,49 €; in Aktion häufig 6,99–7,99 € (REWE, Kaufland, Aldi)",
    preisCent: 999, quelleUrl: "https://www.aldi-sued.de/produkt/dallmayr-prodomo-500-g-000000000700636001",
    quelleHinweis: "Produktseite Aldi Süd: regulär 9,99 € (Streichpreis), am Prüftag Aktion 7,99 €", geprueftAm: D, status: "belegt",
    gewichtGramm: 515, mhd: "9–18 Monate", alkohol: false,
    allergene: "keine deklarationspflichtigen Allergene zu erwarten",
    render: { type: "coffee_bag", label: "Kaffee", sub: "GEMAHLEN · 500 G", tone: "dunkeloliv", dims: [9.5, 6.5, 20] },
  },
  {
    id: "messmer-wintertee-20",
    name: "Wintertee „Heiße Himbeere“ (oder „Schneewunder“)", marke: "Meßmer", groesse: "20 Beutel", kategorie: "Kaffee & Tee",
    laden: "dm", ersatz: "REWE, Kaufland (Meßmer-Wintersorten; Hersteller-Shop 2,99 €)",
    preisCent: 235, quelleUrl: "https://www.dm.de/p/d/3149595/messmer-fruechtetee-heisse-himbeere-20-beutel",
    quelleHinweis: "Produktseite dm: 2,35 €", geprueftAm: D, status: "belegt",
    gewichtGramm: 80, mhd: "18–36 Monate", alkohol: false,
    allergene: "keine deklarationspflichtigen Allergene zu erwarten",
    render: { type: "tea_box", label: "Wintertee", sub: "20 BEUTEL", tone: "salbei", dims: [13, 6.5, 7.5] },
  },
  {
    id: "yogi-tea-classic-17",
    name: "Gewürztee Classic (Zimt, Kardamom, Ingwer), Bio", marke: "Yogi Tea", groesse: "17 Beutel", kategorie: "Kaffee & Tee",
    laden: "dm", ersatz: "Rossmann, REWE; Alternative Pukka Drei Ingwer 3,99 € (Rossmann)",
    preisCent: 325, quelleUrl: "https://www.dm.de/p/d/1596551/yogi-tea-gewuerztee-classic-mit-zimt-kardamom-und-ingwer-17-beutel",
    quelleHinweis: "Produktseite dm: 3,25 €", geprueftAm: D, status: "belegt",
    gewichtGramm: 65, mhd: "24–36 Monate", alkohol: false,
    allergene: "laut dm-Produktseite vegan, gluten- und laktosefrei",
    render: { type: "tea_box", label: "Gewürztee", sub: "BIO · 17 BEUTEL", tone: "creme", dims: [12, 6.5, 7.5] },
  },

  // ───────────── Schokolade & Pralinen ─────────────
  {
    id: "lindt-weihnachts-chocolade-100",
    name: "Weihnachts-Chocolade Classic", marke: "Lindt", groesse: "100 g", kategorie: "Schokolade & Pralinen",
    laden: "REWE", ersatz: "Kaufland, EDEKA, Rossmann (Saisonregal ab Oktober)",
    preisCent: 399, quelleUrl: "https://www.lindt.de/weihnachts-chocolade-classic-100g",
    quelleHinweis: "Hersteller-Shop Lindt: 3,99 € (UVP)", geprueftAm: D, status: "richtwert",
    gewichtGramm: 115, mhd: "4–8 Monate", alkohol: false, saisonal: "Oktober–Dezember",
    allergene: "Entwurf: Milch, Soja; kann Haselnüsse, Mandeln enthalten",
    render: { type: "chocolate_bar", label: "Weihnachtsschokolade", sub: "VOLLMILCH · 100 G", tone: "dunkeloliv" },
  },
  {
    id: "lindt-excellence-70-100",
    name: "Excellence 70 % Cacao", marke: "Lindt", groesse: "100 g", kategorie: "Schokolade & Pralinen",
    laden: "EDEKA", ersatz: "REWE, Kaufland, Rossmann; Knuspr 5,09 €",
    preisCent: 499, quelleUrl: "https://www.edeka24.de/Lebensmittel/Suess-Salzig/Lindt-Excellence-Edelbitter-Intensiv-70-100G.html",
    quelleHinweis: "EDEKA24 online: 4,99 € (49,90 €/kg)", geprueftAm: D, status: "richtwert",
    gewichtGramm: 115, mhd: "9–15 Monate", alkohol: false,
    allergene: "Entwurf: kann Milch, Soja, Haselnüsse, Mandeln enthalten",
    render: { type: "chocolate_bar", label: "Edelbitter", sub: "70 % KAKAO · 100 G", tone: "ink" },
  },
  {
    id: "ritter-sport-kakao-klasse-100",
    name: "Kakao-Klasse 74 % „Die Kräftige“", marke: "Ritter Sport", groesse: "100 g", kategorie: "Schokolade & Pralinen",
    laden: "REWE", ersatz: "Kaufland, EDEKA, dm",
    preisCent: 229, quelleUrl: "https://www.knuspr.de/2062-ritter-sport-74-peru-die-kraeftige",
    quelleHinweis: "Online-Supermarkt Knuspr: 2,29 € (22,90 €/kg)", geprueftAm: D, status: "richtwert",
    gewichtGramm: 105, mhd: "9–12 Monate", alkohol: false,
    allergene: "Entwurf: kann Milch, Schalenfrüchte, Erdnüsse enthalten",
    render: { type: "chocolate_bar", label: "Zartbitter", sub: "74 % KAKAO · 100 G", tone: "oliv", dims: [9.5, 9.5, 1.3] },
  },
  {
    id: "merci-finest-selection-250",
    name: "merci Finest Selection „Große Vielfalt“", marke: "Storck", groesse: "250 g", kategorie: "Schokolade & Pralinen",
    laden: "Rossmann", ersatz: "REWE, Kaufland, EDEKA (EDEKA24 4,79 €)",
    preisCent: 459, quelleUrl: "https://www.rossmann.de/de/lebensmittel-storck-merci-finest-selection/p/4014400901191",
    quelleHinweis: "Produktseite Rossmann: 4,59 € (1 kg = 18,36 €)", geprueftAm: D, status: "belegt",
    gewichtGramm: 320, mhd: "6–9 Monate", alkohol: false,
    allergene: "Entwurf: Milch, Soja, Haselnüsse, Mandeln; kann weitere Schalenfrüchte enthalten",
    render: { type: "praline_box", label: "Schokoladen-Auswahl", sub: "20 STÜCK · 250 G", tone: "creme", dims: [24, 12.5, 3.2] },
  },
  {
    id: "ferrero-rocher-200",
    name: "Rocher, 16 Stück", marke: "Ferrero", groesse: "200 g", kategorie: "Schokolade & Pralinen",
    laden: "REWE", ersatz: "EDEKA, Lidl (supermarktcheck.de zuletzt 4,39 €, undatiert), Kaufland",
    preisCent: 499, quelleUrl: "https://www.knuspr.de/1083-ferrero-rocher-16er",
    quelleHinweis: "Online-Supermarkt Knuspr: 4,99 €", geprueftAm: D, status: "richtwert",
    gewichtGramm: 300, mhd: "4–8 Monate (im Sommer nicht im Sortiment)", alkohol: false,
    allergene: "Entwurf: Haselnüsse, Milch, Weizen (Gluten), Soja",
    render: { type: "praline_box", label: "Haselnuss-Pralinen", sub: "16 STÜCK · 200 G", tone: "creme", dims: [19, 9.5, 4.8] },
  },
  {
    id: "ferrero-kuesschen-178",
    name: "Küsschen Klassik, 20 Stück", marke: "Ferrero", groesse: "178 g", kategorie: "Schokolade & Pralinen",
    laden: "Rossmann", ersatz: "REWE, Kaufland (Knuspr 4,19 €)",
    preisCent: 399, quelleUrl: "https://www.rossmann.de/de/lebensmittel-ferrero-kuesschen/p/4008400159027",
    quelleHinweis: "Produktseite Rossmann: 3,99 € (1 kg = 22,42 €)", geprueftAm: D, status: "belegt",
    gewichtGramm: 230, mhd: "4–8 Monate (im Sommer nicht im Sortiment)", alkohol: false,
    allergene: "Entwurf: Haselnüsse, Milch, Soja",
    render: { type: "praline_box", label: "Nuss-Pralinen", sub: "20 STÜCK · 178 G", tone: "salbei", dims: [18.5, 11, 3.5] },
  },
  {
    id: "niederegger-schwarzbrot-125",
    name: "Marzipan-Schwarzbrot", marke: "Niederegger", groesse: "125 g", kategorie: "Schokolade & Pralinen",
    laden: "REWE", ersatz: "EDEKA, Kaufland; Knuspr 3,60 €; Hersteller-Shop 4,30 €",
    preisCent: 380, quelleUrl: "https://www.supermarktcheck.de/rewe/sortiment/hersteller/niederegger/",
    quelleHinweis: "supermarktcheck.de: REWE/EDEKA zuletzt gemeldet 3,80 € (undatiert); Knuspr 3,60 €", geprueftAm: D, status: "richtwert",
    gewichtGramm: 135, mhd: "4–8 Monate", alkohol: false,
    allergene: "Entwurf: Mandeln; kann Milch, Soja, andere Schalenfrüchte enthalten",
    render: { type: "marzipan_loaf", label: "Marzipan", sub: "ZARTBITTER · 125 G", tone: "dunkeloliv", dims: [13, 4.5, 3.2] },
  },
  {
    id: "lindt-goldhase-100",
    name: "Goldhase Vollmilch", marke: "Lindt", groesse: "100 g", kategorie: "Schokolade & Pralinen",
    laden: "REWE", ersatz: "Kaufland, EDEKA, Rossmann (Saisonregal ab Februar)",
    preisCent: 499, quelleUrl: "https://www.lindt.de/goldhase-gluecksbringer-edition-100g",
    quelleHinweis: "Hersteller-Shop Lindt, Saison 2026: 4,99 € (UVP); Preis 2027 offen", geprueftAm: D, status: "geschaetzt",
    gewichtGramm: 110, mhd: "4–8 Monate", alkohol: false, saisonal: "Februar–April",
    allergene: "Entwurf: Milch, Soja; kann Haselnüsse, Mandeln enthalten",
    render: { type: "tin", label: "Schokoladen-Hase", sub: "VOLLMILCH · 100 G", tone: "creme", dims: [6.5, 4.5, 13] },
  },

  // ───────────── Gebäck ─────────────
  {
    id: "dmbio-zimtsterne-125",
    name: "Zimtsterne mit Haselnüssen und Mandeln, Bio", marke: "dmBio", groesse: "125 g", kategorie: "Gebäck",
    laden: "dm", ersatz: "Lambertz Zimtsterne 175 g, Rossmann 4,69 € (auch REWE/Kaufland)",
    preisCent: 295, quelleUrl: "https://www.dm.de/p/d/1582030/dmbio-zimtsterne-mit-haselnuessen-und-mandeln",
    quelleHinweis: "Produktseite dm: 2,95 €", geprueftAm: D, status: "belegt",
    gewichtGramm: 145, mhd: "2–4 Monate – erst ab Mitte November einkaufen", alkohol: false, saisonal: "Oktober–Dezember",
    allergene: "Entwurf: Haselnüsse, Mandeln, Ei; kann Gluten enthalten",
    render: { type: "cookie_pack", label: "Zimtsterne", sub: "BIO · 125 G", tone: "creme", dims: [15, 9, 4.5] },
  },
  {
    id: "dmbio-dominosteine-125",
    name: "Dominosteine mit Zartbitterschokolade, Bio", marke: "dmBio", groesse: "125 g", kategorie: "Gebäck",
    laden: "dm", ersatz: "Lambertz Dominos 175 g (Rossmann, REWE, Kaufland – Preis vor Ort)",
    preisCent: 265, quelleUrl: "https://www.dm.de/p/d/1584273/dmbio-dominosteine-mit-zartbitterschokolade",
    quelleHinweis: "Produktseite dm: 2,65 €", geprueftAm: D, status: "belegt",
    gewichtGramm: 145, mhd: "2–4 Monate – erst ab Mitte November einkaufen", alkohol: false, saisonal: "Oktober–Dezember",
    allergene: "Entwurf: Weizen (Gluten), Mandeln, Soja; kann Milch enthalten",
    render: { type: "cookie_pack", label: "Dominosteine", sub: "BIO · 125 G", tone: "dunkeloliv", dims: [15, 9, 3.8] },
  },
  {
    id: "dmbio-spekulatius-150",
    name: "Mini Dinkel-Spekulatius, Bio", marke: "dmBio", groesse: "150 g", kategorie: "Gebäck",
    laden: "dm", ersatz: "Gewürzspekulatius der Supermarkt-Eigenmarken (REWE, Kaufland) oder Coppenrath",
    preisCent: 195, quelleUrl: "https://www.dm.de/marken/dmbio/dmbio-weihnachts-limited-edition-940478",
    quelleHinweis: "dm, Übersicht Weihnachts-Sortiment: 1,95 €", geprueftAm: D, status: "belegt",
    gewichtGramm: 165, mhd: "3–5 Monate", alkohol: false, saisonal: "Oktober–Dezember",
    allergene: "Entwurf: Dinkel (Gluten), Butter (Milch); kann Schalenfrüchte enthalten",
    render: { type: "cookie_pack", label: "Spekulatius", sub: "DINKEL · 150 G", tone: "salbei", dims: [17, 8, 4.5] },
  },
  {
    id: "dmbio-gebrannte-mandeln-125",
    name: "Gebrannte Mandeln, Bio", marke: "dmBio", groesse: "125 g", kategorie: "Nüsse & Snacks",
    laden: "dm", ersatz: "Aldi Süd „Wintertraum“ 2,49 € (Aktionsartikel); Seeberger 150 g ca. 5,19 € (Knuspr)",
    preisCent: 285, quelleUrl: "https://www.dm.de/ernaehrung/snacks-und-suessigkeiten/nuesse",
    quelleHinweis: "dm, Kategorieseite Nüsse: 2,85 € (22,80 €/kg)", geprueftAm: D, status: "belegt",
    gewichtGramm: 135, mhd: "4–8 Monate", alkohol: false,
    allergene: "Entwurf: Mandeln; kann andere Schalenfrüchte, Erdnüsse enthalten",
    render: { type: "pouch", label: "Gebrannte Mandeln", sub: "BIO · 125 G", tone: "creme", dims: [11, 5, 16] },
  },
  {
    id: "leibniz-choco-125",
    name: "Leibniz Choco Vollmilch", marke: "Bahlsen", groesse: "125 g", kategorie: "Gebäck",
    laden: "Rossmann", ersatz: "REWE, Kaufland; EDEKA24 3,29 €; Knuspr 3,99 €",
    preisCent: 379, quelleUrl: "https://www.rossmann.de/de/alle-marken/bahlsen/leibniz/c/online-marke_14716330",
    quelleHinweis: "Rossmann, Markenübersicht Leibniz: 3,79 € (ältere Produktseite zeigt 1,69 € – verworfen)", geprueftAm: D, status: "richtwert",
    gewichtGramm: 145, mhd: "5–8 Monate", alkohol: false,
    allergene: "Entwurf: Weizen (Gluten), Milch, Soja",
    render: { type: "cookie_pack", label: "Butterkeks", sub: "IN VOLLMILCHSCHOKOLADE · 125 G", tone: "oliv", dims: [14, 7.5, 4] },
  },
  {
    id: "gadeschi-amarettini-200",
    name: "Amarettini", marke: "Gadeschi", groesse: "200 g", kategorie: "Gebäck",
    laden: "Rossmann", ersatz: "Knuspr 1,89 €; REWE, Kaufland (italienisches Regal)",
    preisCent: 179, quelleUrl: "https://www.rossmann.de/de/lebensmittel-gadeschi-amarettini-gebaeck/p/8008560001521",
    quelleHinweis: "Produktseite Rossmann: 1,79 € (8,95 €/kg)", geprueftAm: D, status: "belegt",
    gewichtGramm: 210, mhd: "6–9 Monate", alkohol: false,
    allergene: "Entwurf: Ei, Aprikosenkerne/Mandeln; kann Gluten, Milch enthalten",
    render: { type: "pouch", label: "Amarettini", sub: "MANDELGEBÄCK · 200 G", tone: "salbei", dims: [12, 5.5, 18] },
  },
  {
    id: "edeka-cantuccini-250",
    name: "Herzstücke Cantuccini", marke: "EDEKA", groesse: "250 g", kategorie: "Gebäck",
    laden: "EDEKA", ersatz: "Belli Cantuccini 250 g, EDEKA24 4,29 € (auch REWE)",
    preisCent: 329, quelleUrl: "https://www.edeka24.de/Lebensmittel/Suess-Salzig/EDEKA-Herzstuecke-Cantuccini-250G.html",
    quelleHinweis: "EDEKA24 online: 3,29 € (13,16 €/kg)", geprueftAm: D, status: "richtwert",
    gewichtGramm: 265, mhd: "6–9 Monate", alkohol: false,
    allergene: "Entwurf: Weizen (Gluten), Mandeln, Ei; kann Milch enthalten",
    render: { type: "pouch", label: "Cantuccini", sub: "MIT MANDELN · 250 G", tone: "creme", dims: [13, 6, 19] },
  },

  // ───────────── Frühstück ─────────────
  {
    id: "bonne-maman-erdbeer-370",
    name: "Erdbeer-Konfitüre", marke: "Bonne Maman", groesse: "370 g", kategorie: "Frühstück",
    laden: "REWE", ersatz: "EDEKA (EDEKA24 3,79 €), Kaufland; REWE laut supermarktcheck.de zuletzt 3,49 €",
    preisCent: 369, quelleUrl: "https://www.knuspr.de/13394-bonne-maman-erdbeer-konfituere",
    quelleHinweis: "Online-Supermarkt Knuspr: 3,69 €", geprueftAm: D, status: "richtwert",
    gewichtGramm: 600, mhd: "12–24 Monate", alkohol: false,
    allergene: "keine deklarationspflichtigen Allergene zu erwarten",
    render: { type: "jar", label: "Konfitüre", sub: "ERDBEERE · 370 G", contents: "erdbeer", dims: [8.6, 8.6, 10.5] },
  },
  {
    id: "bonne-maman-aprikose-370",
    name: "Aprikosen-Konfitüre", marke: "Bonne Maman", groesse: "370 g", kategorie: "Frühstück",
    laden: "REWE", ersatz: "EDEKA (EDEKA24 3,19–3,79 €), Kaufland",
    preisCent: 389, quelleUrl: "https://www.knuspr.de/13395-bonne-maman-aprikosen-konfituere",
    quelleHinweis: "Online-Supermarkt Knuspr: 3,89 € (10,51 €/kg)", geprueftAm: D, status: "richtwert",
    gewichtGramm: 600, mhd: "12–24 Monate", alkohol: false,
    allergene: "keine deklarationspflichtigen Allergene zu erwarten",
    render: { type: "jar", label: "Konfitüre", sub: "APRIKOSE · 370 G", contents: "aprikose", dims: [8.6, 8.6, 10.5] },
  },
  {
    id: "nocciolata-270",
    name: "Nocciolata Nuss-Nougat-Creme, Bio", marke: "Rigoni di Asiago", groesse: "270 g", kategorie: "Frühstück",
    laden: "EDEKA", ersatz: "REWE (supermarktcheck.de zuletzt 4,99 €), dm",
    preisCent: 549, quelleUrl: "https://www.edeka24.de/Lebensmittel/Fruehstueck/Rigoni-di-Asiago-Bio-Nocciolata-Nuss-Nougat-Aufstrich-270-g.html",
    quelleHinweis: "EDEKA24 online: 5,49 € (20,33 €/kg)", geprueftAm: D, status: "richtwert",
    gewichtGramm: 450, mhd: "9–15 Monate", alkohol: false,
    allergene: "Entwurf: Haselnüsse, Milch; kann andere Schalenfrüchte enthalten",
    render: { type: "jar", label: "Nuss-Nougat", sub: "BIO · 270 G", contents: "nougat", dims: [7.2, 7.2, 9.5] },
  },
  {
    id: "langnese-landhonig-500",
    name: "Landhonig, Glas", marke: "Langnese", groesse: "500 g", kategorie: "Frühstück",
    laden: "REWE", ersatz: "Kaufland (supermarktcheck.de: 500 g zuletzt 5,99 €); Breitsamer Imkergold 500 g, EDEKA24 7,99 €",
    preisCent: 599, quelleUrl: "https://www.supermarktcheck.de/product/9828-langnese-flotte-biene-wildblueten-honig",
    quelleHinweis: "supermarktcheck.de nennt für Langnese 500 g bei REWE/Kaufland 5,99 € (undatiert) – kein belastbarer Beleg", geprueftAm: D, status: "geschaetzt",
    gewichtGramm: 760, mhd: "24 Monate und länger", alkohol: false,
    allergene: "keine deklarationspflichtigen Allergene zu erwarten; nicht für Kinder unter 12 Monaten",
    render: { type: "jar", label: "Honig", sub: "LANDHONIG · 500 G", contents: "honig", dims: [8.4, 8.4, 11.5] },
  },

  // ───────────── Nüsse & Snacks ─────────────
  {
    id: "seeberger-studentenfutter-150",
    name: "Studentenfutter", marke: "Seeberger", groesse: "150 g", kategorie: "Nüsse & Snacks",
    laden: "dm", ersatz: "Rossmann 3,29 €; REWE laut supermarktcheck.de zuletzt 2,99 €",
    preisCent: 295, quelleUrl: "https://www.dm.de/p/d/1506045/seeberger-nuss-und-trockenfruechtemischung-studentenfutter",
    quelleHinweis: "Produktseite dm: 2,95 € (19,67 €/kg)", geprueftAm: D, status: "belegt",
    gewichtGramm: 160, mhd: "4–8 Monate", alkohol: false,
    allergene: "Entwurf: Schalenfrüchte (Haselnüsse, Cashew, Walnüsse, Mandeln); kann Erdnüsse enthalten",
    render: { type: "pouch", label: "Studentenfutter", sub: "NÜSSE & ROSINEN · 150 G", tone: "oliv", dims: [12, 5, 18] },
  },
  {
    id: "seeberger-nusskernmischung-150",
    name: "Nusskern-Mischung", marke: "Seeberger", groesse: "150 g", kategorie: "Nüsse & Snacks",
    laden: "dm", ersatz: "Rossmann, REWE, Kaufland",
    preisCent: 395, quelleUrl: "https://www.dm.de/p/d/1506033/seeberger-nussmischung-nusskern-mischung-mit-haselnuss-mandel-cashew-und-walnuss",
    quelleHinweis: "Produktseite dm: 3,95 € (26,33 €/kg)", geprueftAm: D, status: "belegt",
    gewichtGramm: 160, mhd: "4–8 Monate", alkohol: false,
    allergene: "Entwurf: Schalenfrüchte (Haselnüsse, Mandeln, Cashew, Walnüsse); kann Erdnüsse enthalten",
    render: { type: "pouch", label: "Nusskerne", sub: "UNGESALZEN · 150 G", tone: "dunkeloliv", dims: [12, 5, 18] },
  },
  {
    id: "seeberger-geroestete-mandeln-150",
    name: "Geröstete Mandeln", marke: "Seeberger", groesse: "150 g", kategorie: "Nüsse & Snacks",
    laden: "Rossmann", ersatz: "dm, REWE, Kaufland",
    preisCent: 419, quelleUrl: "https://www.rossmann.de/de/lebensmittel-seeberger-geroestete-mandeln/p/4008258074008",
    quelleHinweis: "Produktseite Rossmann: 4,19 € (27,93 €/kg)", geprueftAm: D, status: "belegt",
    gewichtGramm: 160, mhd: "4–8 Monate", alkohol: false,
    allergene: "Entwurf: Mandeln; kann andere Schalenfrüchte, Erdnüsse enthalten",
    render: { type: "pouch", label: "Röstmandeln", sub: "GESALZEN · 150 G", tone: "creme", dims: [12, 5, 18] },
  },
  {
    id: "haribo-goldbaeren-175",
    name: "Goldbären", marke: "Haribo", groesse: "175 g", kategorie: "Nüsse & Snacks",
    laden: "Rossmann", ersatz: "überall (REWE, Kaufland, dm, Lidl)",
    preisCent: 119, quelleUrl: "https://www.rossmann.de/de/lebensmittel-haribo-goldbaeren/p/4001686322840",
    quelleHinweis: "Produktseite Rossmann: 1,19 € (6,80 €/kg)", geprueftAm: D, status: "belegt",
    gewichtGramm: 180, mhd: "6–12 Monate", alkohol: false,
    allergene: "Entwurf: keine deklarationspflichtigen Allergene; enthält Gelatine (nicht vegetarisch)",
    render: { type: "pouch", label: "Fruchtgummi", sub: "175 G", tone: "salbei", dims: [13, 4, 19] },
  },

  // ───────────── Getränke ─────────────
  {
    id: "oberkircher-grauburgunder-075",
    name: "Grauer Burgunder QbA trocken (Baden)", marke: "Oberkircher Winzer", groesse: "0,75 l", kategorie: "Getränke",
    laden: "REWE", ersatz: "EDEKA Center 6,29 € (supermarktcheck.de); Alde Gott Grauburgunder Kabinett, EDEKA24 8,99 €",
    preisCent: 629, quelleUrl: "https://shop.rewe.de/p/oberkircher-winzer-grauer-burgunder-qba-trocken-0-75l/3577511",
    quelleHinweis: "REWE-Shop: „ab 5,69 €“ (standortabhängig); supermarktcheck.de: EDEKA Center 6,29 € – kalkuliert mit dem höheren Wert", geprueftAm: D, status: "richtwert",
    gewichtGramm: 1200, mhd: "kein MHD; 1–2 Jahre lagerfähig", alkohol: true, alkoholVol: "ca. 12,5 % vol",
    ersatzOhneAlkohol: "dmbio-winterpunsch-075",
    allergene: "enthält Sulfite",
    render: { type: "bottle", variant: "wein_weiss", label: "Grauburgunder", sub: "BADEN · TROCKEN · 0,75 L" },
  },
  {
    id: "metternich-riesling-sekt-075",
    name: "Riesling Sekt trocken", marke: "Fürst von Metternich", groesse: "0,75 l", kategorie: "Getränke",
    laden: "EDEKA", ersatz: "REWE, Kaufland (häufig in Aktion ab ca. 5–6 €); Geldermann Brut, EDEKA24 10,49 €",
    preisCent: 999, quelleUrl: "https://www.edeka24.de/Wein-Spirituosen/Sekt-Prosecco/Fuerst-von-Metternich-Riesling-Sekt-trocken-0-75L.html",
    quelleHinweis: "EDEKA24 online: 9,99 € (13,32 €/l)", geprueftAm: D, status: "richtwert",
    gewichtGramm: 1400, mhd: "kein MHD; 1–2 Jahre lagerfähig", alkohol: true, alkoholVol: "ca. 12 % vol",
    ersatzOhneAlkohol: "rotkaeppchen-alkoholfrei-075",
    allergene: "enthält Sulfite",
    render: { type: "bottle", variant: "sekt", label: "Riesling Sekt", sub: "TROCKEN · 0,75 L" },
  },
  {
    id: "rotkaeppchen-piccolo-02",
    name: "Sekt halbtrocken, Piccolo", marke: "Rotkäppchen", groesse: "0,2 l", kategorie: "Getränke",
    laden: "Lidl", ersatz: "REWE, Kaufland, EDEKA",
    preisCent: 169, quelleUrl: "https://www.lidl.de/p/rotkaeppchen-sekt-halbtrocken-0-2-l-flasche-schaumwein/p100385184",
    quelleHinweis: "Produktseite Lidl (Stand 12.11.2026): 1,69 €", geprueftAm: D, status: "belegt",
    gewichtGramm: 400, mhd: "kein MHD; 1–2 Jahre lagerfähig", alkohol: true, alkoholVol: "11 % vol",
    ersatzOhneAlkohol: "rotkaeppchen-alkoholfrei-piccolo-02",
    allergene: "enthält Sulfite",
    render: { type: "bottle_small", variant: "sekt", label: "Sekt", sub: "PICCOLO · 0,2 L" },
  },
  {
    id: "rotkaeppchen-alkoholfrei-075",
    name: "Sekt alkoholfrei", marke: "Rotkäppchen", groesse: "0,75 l", kategorie: "Getränke",
    laden: "EDEKA", ersatz: "REWE, Kaufland; Light Live alkoholfrei, Knuspr 3,99 €",
    preisCent: 529, quelleUrl: "https://www.edeka24.de/Wein-Spirituosen/Sekt-Prosecco/Rotkaeppchen-alkoholfrei-0-75L.html",
    quelleHinweis: "EDEKA24 online: 5,29 €", geprueftAm: D, status: "richtwert",
    gewichtGramm: 1350, mhd: "12–24 Monate", alkohol: false,
    allergene: "enthält Sulfite",
    render: { type: "bottle", variant: "sekt", label: "Alkoholfrei", sub: "PRICKELND · 0,75 L" },
  },
  {
    id: "rotkaeppchen-alkoholfrei-piccolo-02",
    name: "Sekt alkoholfrei, Piccolo", marke: "Rotkäppchen", groesse: "0,2 l", kategorie: "Getränke",
    laden: "REWE", ersatz: "Kaufland, EDEKA",
    preisCent: 199, quelleUrl: "https://www.edeka24.de/Wein-Spirituosen/Sekt-Prosecco/Rotkaeppchen-alkoholfrei-0-75L.html",
    quelleHinweis: "Kein Beleg für die 0,2-l-Flasche gefunden; geschätzt aus Piccolo mit Alkohol (1,69–1,99 €)", geprueftAm: D, status: "geschaetzt",
    gewichtGramm: 400, mhd: "12–24 Monate", alkohol: false,
    allergene: "enthält Sulfite",
    render: { type: "bottle_small", variant: "sekt", label: "Alkoholfrei", sub: "PICCOLO · 0,2 L" },
  },
  {
    id: "dmbio-winterpunsch-075",
    name: "Winter-Fruchtpunsch Holunder, Bio (alkoholfrei)", marke: "dmBio", groesse: "0,75 l", kategorie: "Getränke",
    laden: "dm", ersatz: "Voelkel Familien-Punsch 0,75 l, Hersteller-Shop 4,99 € (Bioladen, REWE)",
    preisCent: 225, quelleUrl: "https://www.dm.de/p/d/1452579/dmbio-winter-fruchtpunsch-holunder",
    quelleHinweis: "Produktseite dm: 2,25 € (ca. 3,00 €/l)", geprueftAm: D, status: "belegt",
    gewichtGramm: 1200, mhd: "12–18 Monate", alkohol: false, saisonal: "Oktober–Januar",
    allergene: "keine deklarationspflichtigen Allergene zu erwarten",
    render: { type: "bottle", variant: "saft", label: "Winterpunsch", sub: "OHNE ALKOHOL · 0,75 L" },
  },
  {
    id: "yo-sirup-holunderbluete-07",
    name: "Sirup Holunderblüte", marke: "Yo", groesse: "0,7 l", kategorie: "Getränke",
    laden: "REWE", ersatz: "EDEKA (EDEKA24 4,29 €), Kaufland",
    preisCent: 399, quelleUrl: "https://www.knuspr.de/1521-yo-holunderblute-sirup",
    quelleHinweis: "Online-Supermarkt Knuspr: 3,99 € (5,70 €/l)", geprueftAm: D, status: "richtwert",
    gewichtGramm: 1250, mhd: "12–18 Monate", alkohol: false,
    allergene: "keine deklarationspflichtigen Allergene zu erwarten",
    render: { type: "bottle", variant: "saft", label: "Holunderblüte", sub: "SIRUP · 0,7 L" },
  },

  // ───────────── Feinkost ─────────────
  {
    id: "de-cecco-fusilli-500",
    name: "Fusilli n° 34", marke: "De Cecco", groesse: "500 g", kategorie: "Feinkost",
    laden: "EDEKA", ersatz: "REWE, Kaufland; Rummo Fusilli 500 g bei dm ca. 1,95 € (supermarktcheck.de)",
    preisCent: 279, quelleUrl: "https://www.edeka24.de/De-Cecco-Fusilli-No-34-500G.html",
    quelleHinweis: "EDEKA24 online: 2,79 €", geprueftAm: D, status: "richtwert",
    gewichtGramm: 515, mhd: "18–30 Monate", alkohol: false,
    allergene: "Entwurf: Hartweizen (Gluten); kann Soja, Senf enthalten",
    render: { type: "pasta_bag", label: "Fusilli", sub: "HARTWEIZEN · 500 G", tone: "creme", dims: [11, 6, 24] },
  },
  {
    id: "barilla-pesto-genovese-190",
    name: "Pesto alla Genovese", marke: "Barilla", groesse: "190 g", kategorie: "Feinkost",
    laden: "EDEKA", ersatz: "REWE, Kaufland (Knuspr 3,69 €)",
    preisCent: 359, quelleUrl: "https://www.edeka24.de/Lebensmittel/Sossen/Tomatensosse-Pesto/Barilla-Pesto-alla-Genovese-190G.html",
    quelleHinweis: "EDEKA24 online: 3,59 €", geprueftAm: D, status: "richtwert",
    gewichtGramm: 350, mhd: "12–18 Monate", alkohol: false,
    allergene: "Entwurf: Milch (Käse), Cashewkerne; kann andere Schalenfrüchte enthalten",
    render: { type: "jar", label: "Pesto", sub: "BASILIKUM · 190 G", contents: "pesto", dims: [6.4, 6.4, 8.5] },
  },
  {
    id: "barilla-sauce-basilico-400",
    name: "Pastasauce Basilico", marke: "Barilla", groesse: "400 g", kategorie: "Feinkost",
    laden: "EDEKA", ersatz: "REWE, Kaufland (Knuspr 3,29 €); Mutti Passata 700 g, EDEKA24 2,79 €",
    preisCent: 319, quelleUrl: "https://www.edeka24.de/Lebensmittel/Sossen/Tomatensosse-Pesto/Barilla-Pasta-Sauce-Basilico-400G.html",
    quelleHinweis: "EDEKA24 online: 3,19 € (7,98 €/kg)", geprueftAm: D, status: "richtwert",
    gewichtGramm: 620, mhd: "12–24 Monate", alkohol: false,
    allergene: "Entwurf: keine deklarationspflichtigen Allergene zu erwarten",
    render: { type: "jar", label: "Tomatensugo", sub: "BASILIKUM · 400 G", contents: "tomate", dims: [7.4, 7.4, 12.5] },
  },
  {
    id: "dittmann-oliven-170",
    name: "Kräuter-Oliven", marke: "Feinkost Dittmann", groesse: "170 g", kategorie: "Feinkost",
    laden: "REWE", ersatz: "Kaufland, EDEKA (Knuspr: ohne Stein 2,99 €)",
    preisCent: 339, quelleUrl: "https://www.knuspr.de/4645-feinkost-dittmann-krauter-oliven",
    quelleHinweis: "Online-Supermarkt Knuspr: 3,39 € (19,94 €/kg)", geprueftAm: D, status: "richtwert",
    gewichtGramm: 400, mhd: "12–24 Monate", alkohol: false,
    allergene: "Entwurf: keine deklarationspflichtigen Allergene zu erwarten",
    render: { type: "jar", label: "Oliven", sub: "MIT KRÄUTERN · 170 G", contents: "oliven", dims: [6.8, 6.8, 10] },
  },
  {
    id: "grissini-125",
    name: "Grissini Torinesi", marke: "Barilla oder Eigenmarke", groesse: "125 g", kategorie: "Feinkost",
    laden: "REWE", ersatz: "Kaufland, EDEKA, Lidl (italienisches Regal)",
    preisCent: 179, quelleUrl: "https://www.rewe.de/shop/",
    quelleHinweis: "Kein Preisbeleg gefunden; Schätzung aus Erfahrungswerten (1,29–1,99 €)", geprueftAm: D, status: "geschaetzt",
    gewichtGramm: 140, mhd: "6–12 Monate", alkohol: false,
    allergene: "Entwurf: Weizen (Gluten); kann Sesam, Milch enthalten",
    render: { type: "stick_pack", label: "Grissini", sub: "125 G", tone: "creme", dims: [7, 3.5, 25] },
  },

  // ───────────── Non-Food ─────────────
  {
    id: "stylex-notizbuch-a5",
    name: "Notizbuch DIN A5, 192 Seiten kariert", marke: "Stylex", groesse: "1 Stück", kategorie: "Non-Food",
    laden: "Rossmann", ersatz: "Action Notizbuch A5 ca. 1,59 €; dm Schreibwarenregal",
    preisCent: 319, quelleUrl: "https://www.rossmann.de/de/haushalt-stylex-notizbuch-din-a5/p/4044186292008",
    quelleHinweis: "Produktseite Rossmann: 3,19 €", geprueftAm: D, status: "belegt",
    gewichtGramm: 330, mhd: "unbegrenzt", alkohol: false,
    allergene: "kein Lebensmittel",
    render: { type: "notebook", label: "Notizbuch", sub: "A5", tone: "dunkeloliv", dims: [15, 21, 1.6] },
  },
];

export const artikelNachId = new Map(artikel.map((a) => [a.id, a]));
