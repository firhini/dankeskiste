import type { Cent } from "../geld";
import type { Einstellungen } from "../einstellungen";

export type Groesse = "klein" | "flach" | "mittel" | "gross";
export type VersandEinstellungen = Einstellungen["versand"];

/** Platzbedarf einer Box im Sammelkarton (mittel = 1). */
export const PLATZ: Record<Groesse, number> = { klein: 0.6, flach: 0.8, mittel: 1, gross: 1.3 };

export interface BoxEinheit {
  gewichtGramm: number;
  platz: number;
}

export interface Paket {
  boxen: number;
  gewichtGramm: number;
  stufeBisGramm: number;
  preisCent: Cent;
  /** DHL-Porto + Versandmaterial */
  kostenCent: Cent;
  uebergewicht: boolean;
}

export function stufeFuer(gewichtGramm: number, v: VersandEinstellungen) {
  const sortiert = [...v.stufen].sort((a, b) => a.bisGramm - b.bisGramm);
  const stufe = sortiert.find((s) => gewichtGramm <= s.bisGramm);
  return { stufe: stufe ?? sortiert[sortiert.length - 1], uebergewicht: !stufe };
}

/**
 * Verteilt Boxen für EINE Adresse auf Pakete (First-Fit-Decreasing nach Gewicht).
 * Ein Paket fasst höchstens `platzProPaket` Platzeinheiten und `maxPaketGramm`.
 */
export function packePakete(einheiten: BoxEinheit[], v: VersandEinstellungen): Paket[] {
  const offen: { boxen: number; netto: number; platz: number }[] = [];
  const sortiert = [...einheiten].sort((a, b) => b.gewichtGramm - a.gewichtGramm);
  for (const e of sortiert) {
    const ziel = offen.find(
      (p) => p.platz + e.platz <= v.platzProPaket + 1e-9 && p.netto + e.gewichtGramm + v.sammelUmkartonGramm <= v.maxPaketGramm,
    );
    if (ziel) {
      ziel.boxen += 1;
      ziel.netto += e.gewichtGramm;
      ziel.platz += e.platz;
    } else {
      offen.push({ boxen: 1, netto: e.gewichtGramm, platz: e.platz });
    }
  }
  return offen.map((p) => {
    const gewichtGramm = p.netto + (p.boxen === 1 ? v.einzelUmkartonGramm : v.sammelUmkartonGramm);
    const { stufe, uebergewicht } = stufeFuer(gewichtGramm, v);
    return {
      boxen: p.boxen,
      gewichtGramm,
      stufeBisGramm: stufe.bisGramm,
      preisCent: stufe.preisCent,
      kostenCent: stufe.kostenCent + v.materialProPaketCent,
      uebergewicht,
    };
  });
}

export interface VersandErgebnis {
  pakete: Paket[];
  preisCent: Cent;
  kostenCent: Cent;
  gewichtGramm: number;
}

export function versandFuerAdressen(adressen: BoxEinheit[][], v: VersandEinstellungen): VersandErgebnis {
  const pakete = adressen.flatMap((einheiten) => (einheiten.length ? packePakete(einheiten, v) : []));
  return {
    pakete,
    preisCent: pakete.reduce((s, p) => s + p.preisCent, 0),
    kostenCent: pakete.reduce((s, p) => s + p.kostenCent, 0),
    gewichtGramm: pakete.reduce((s, p) => s + p.gewichtGramm, 0),
  };
}
