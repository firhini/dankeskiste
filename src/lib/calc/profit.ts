import type { Cent } from "../geld";

export interface GewinnEingabe {
  /** geplante Endsumme laut Angebot */
  summeCent: Cent;
  /** tatsächlich bezahlt laut Stripe (null = noch nicht bezahlt) */
  bezahltCent: Cent | null;
  erstattetCent: Cent;
  planArtikelCent: Cent;
  echtArtikelCent: Cent | null;
  planVerpackungCent: Cent;
  planPersoMaterialCent: Cent;
  planVersandKostenCent: Cent;
  echtVersandKostenCent: Cent | null;
  planGebuehrCent: Cent;
  stripeGebuehrCent: Cent | null;
}

export interface GewinnSpalte {
  umsatzCent: Cent;
  artikelCent: Cent;
  verpackungCent: Cent;
  persoCent: Cent;
  versandCent: Cent;
  gebuehrCent: Cent;
  ausgabenCent: Cent;
  gewinnCent: Cent;
  margeProzent: number;
}

export interface GewinnErgebnis {
  geplant: GewinnSpalte;
  echt: GewinnSpalte;
  /** Welche echten Werte noch fehlen (dann steht in „echt“ der Planwert). */
  offen: ("artikel" | "versand" | "gebuehr")[];
}

function spalte(umsatz: Cent, artikel: Cent, verpackung: Cent, perso: Cent, versand: Cent, gebuehr: Cent, ausgaben: Cent): GewinnSpalte {
  const gewinnCent = umsatz - artikel - verpackung - perso - versand - gebuehr - ausgaben;
  return {
    umsatzCent: umsatz,
    artikelCent: artikel,
    verpackungCent: verpackung,
    persoCent: perso,
    versandCent: versand,
    gebuehrCent: gebuehr,
    ausgabenCent: ausgaben,
    gewinnCent,
    margeProzent: umsatz > 0 ? (gewinnCent / umsatz) * 100 : 0,
  };
}

/**
 * Gewinn einer Bestellung:
 * Umsatz − Artikel − Verpackung − Personalisierung (Material) − Versandkosten − Zahlungsgebühr − anteilige Ausgaben.
 * „Echt“ nimmt je Posten den tatsächlichen Wert, sobald er vorliegt, sonst den Planwert.
 * Erstattungen mindern den Umsatz; Stripe erstattet die Gebühr nicht zurück.
 */
export function berechneGewinn(b: GewinnEingabe, anteilAusgabenCent: Cent = 0): GewinnErgebnis {
  const offen: GewinnErgebnis["offen"] = [];
  if (b.echtArtikelCent == null) offen.push("artikel");
  if (b.echtVersandKostenCent == null && b.planVersandKostenCent > 0) offen.push("versand");
  if (b.stripeGebuehrCent == null) offen.push("gebuehr");
  return {
    geplant: spalte(b.summeCent, b.planArtikelCent, b.planVerpackungCent, b.planPersoMaterialCent, b.planVersandKostenCent, b.planGebuehrCent, anteilAusgabenCent),
    echt: spalte(
      (b.bezahltCent ?? b.summeCent) - b.erstattetCent,
      b.echtArtikelCent ?? b.planArtikelCent,
      b.planVerpackungCent,
      b.planPersoMaterialCent,
      b.echtVersandKostenCent ?? b.planVersandKostenCent,
      b.stripeGebuehrCent ?? b.planGebuehrCent,
      anteilAusgabenCent,
    ),
    offen,
  };
}

export function summiere(spalten: GewinnSpalte[]): GewinnSpalte {
  const s = spalten.reduce(
    (a, x) => ({
      umsatzCent: a.umsatzCent + x.umsatzCent,
      artikelCent: a.artikelCent + x.artikelCent,
      verpackungCent: a.verpackungCent + x.verpackungCent,
      persoCent: a.persoCent + x.persoCent,
      versandCent: a.versandCent + x.versandCent,
      gebuehrCent: a.gebuehrCent + x.gebuehrCent,
      ausgabenCent: a.ausgabenCent + x.ausgabenCent,
    }),
    { umsatzCent: 0, artikelCent: 0, verpackungCent: 0, persoCent: 0, versandCent: 0, gebuehrCent: 0, ausgabenCent: 0 },
  );
  return spalte(s.umsatzCent, s.artikelCent, s.verpackungCent, s.persoCent, s.versandCent, s.gebuehrCent, s.ausgabenCent);
}

/**
 * Verteilt Gemeinkosten proportional zum Umsatz auf Bestellungen.
 * Die Summe der Anteile ist exakt `gesamtCent` (Restcent gehen an die größten Reste).
 */
export function verteileAusgaben(bestellungen: { id: string; umsatzCent: Cent }[], gesamtCent: Cent): Map<string, Cent> {
  const ergebnis = new Map<string, Cent>();
  const umsatz = bestellungen.reduce((s, b) => s + Math.max(0, b.umsatzCent), 0);
  if (umsatz <= 0 || gesamtCent === 0) {
    for (const b of bestellungen) ergebnis.set(b.id, 0);
    return ergebnis;
  }
  const roh = bestellungen.map((b) => {
    const exakt = (gesamtCent * Math.max(0, b.umsatzCent)) / umsatz;
    return { id: b.id, basis: Math.floor(exakt), rest: exakt - Math.floor(exakt) };
  });
  let offen = gesamtCent - roh.reduce((s, r) => s + r.basis, 0);
  for (const r of [...roh].sort((a, b) => b.rest - a.rest)) {
    ergebnis.set(r.id, r.basis + (offen > 0 ? 1 : 0));
    if (offen > 0) offen--;
  }
  return ergebnis;
}

/** Artikelkosten einer Box-Position: echter Einstandspreis je Artikel, sonst Katalogpreis. */
export function artikelKosten(inhalt: { articleId: string; menge: number; preisCent: Cent }[], einstand: Map<string, Cent | null | undefined>): Cent {
  return inhalt.reduce((s, x) => s + x.menge * (einstand.get(x.articleId) ?? x.preisCent), 0);
}

/** Gleitender Durchschnitt nach einem Einkauf. */
export function neuerEinstand(bestand: number, einstandCent: Cent | null, menge: number, stueckpreisCent: Cent): Cent {
  const alt = Math.max(0, bestand);
  if (einstandCent == null || alt === 0) return stueckpreisCent;
  return Math.round((alt * einstandCent + menge * stueckpreisCent) / (alt + menge));
}

export function roi(gewinnCent: Cent, kostenCent: Cent): number | null {
  return kostenCent > 0 ? (gewinnCent / kostenCent) * 100 : null;
}
