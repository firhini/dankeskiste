import type { Cent } from "../geld";

export interface GebuehrenModell {
  prozent: number;
  fixCent: Cent;
  rechnungProzent: number;
  rechnungMaxCent: Cent;
}

export interface KalkPosition {
  preisCent: Cent;
  menge: number;
}

export interface BoxKalkulation {
  preisCent: Cent;
  einkaufCent: Cent;
  verpackungCent: Cent;
  gebuehrCent: Cent;
  kostenCent: Cent;
  rohertragCent: Cent;
  margeProzent: number;
  ampel: "gut" | "warnung" | "rot";
}

export function summe(positionen: KalkPosition[]): Cent {
  return Math.round(positionen.reduce((s, p) => s + p.preisCent * p.menge, 0));
}

/** Zahlungsgebühr für eine ganze Bestellung (Kartengebühr + Rechnungsgebühr, gedeckelt). */
export function gebuehrFuerBestellung(betragCent: Cent, g: GebuehrenModell): Cent {
  if (betragCent <= 0) return 0;
  const karte = Math.round((betragCent * g.prozent) / 100) + g.fixCent;
  const rechnung = Math.min(Math.round((betragCent * g.rechnungProzent) / 100), g.rechnungMaxCent);
  return karte + rechnung;
}

/**
 * Gebührenanteil je Box für die Kalkulation: Prozentanteile voll, Fixbetrag auf die
 * Mindestbestellmenge verteilt (schlechtester Fall: kleinste zulässige Bestellung).
 */
export function gebuehrJeBox(preisCent: Cent, g: GebuehrenModell, mindestmenge: number): Cent {
  const anteilFix = Math.ceil(g.fixCent / Math.max(1, mindestmenge));
  return Math.round((preisCent * (g.prozent + g.rechnungProzent)) / 100) + anteilFix;
}

export function ampelFuer(margeProzent: number, ziel = 45, min = 35): BoxKalkulation["ampel"] {
  if (margeProzent < min) return "rot";
  if (margeProzent < ziel) return "warnung";
  return "gut";
}

export function kalkuliereBox(eingabe: {
  preisCent: Cent;
  artikel: KalkPosition[];
  verpackung: KalkPosition[];
  gebuehren: GebuehrenModell;
  mindestmenge: number;
  ziel?: number;
  min?: number;
}): BoxKalkulation {
  const einkaufCent = summe(eingabe.artikel);
  const verpackungCent = summe(eingabe.verpackung);
  const gebuehrCent = gebuehrJeBox(eingabe.preisCent, eingabe.gebuehren, eingabe.mindestmenge);
  const kostenCent = einkaufCent + verpackungCent + gebuehrCent;
  const rohertragCent = eingabe.preisCent - kostenCent;
  const margeProzent = eingabe.preisCent > 0 ? (rohertragCent / eingabe.preisCent) * 100 : 0;
  return {
    preisCent: eingabe.preisCent,
    einkaufCent,
    verpackungCent,
    gebuehrCent,
    kostenCent,
    rohertragCent,
    margeProzent,
    ampel: ampelFuer(margeProzent, eingabe.ziel, eingabe.min),
  };
}

/** Kleinster Preis (auf volle Euro), mit dem die Zielmarge erreicht wird. */
export function preisFuerMarge(eingabe: {
  artikel: KalkPosition[];
  verpackung: KalkPosition[];
  gebuehren: GebuehrenModell;
  mindestmenge: number;
  zielProzent: number;
}): Cent {
  for (let preis = 100; preis <= 100000; preis += 100) {
    const k = kalkuliereBox({ ...eingabe, preisCent: preis });
    if (k.margeProzent >= eingabe.zielProzent) return preis;
  }
  return 100000;
}
