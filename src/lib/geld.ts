/** Geldbeträge sind immer Integer-Cent. */
export type Cent = number;

const NBSP = " ";
const MINUS = "−";

/** 4500 → „45 €“, 4550 → „45,50 €“ (geschütztes Leerzeichen, echtes Minus). */
export function euro(cent: Cent, opts: { immerCent?: boolean } = {}): string {
  const negativ = cent < 0;
  const abs = Math.abs(Math.round(cent));
  const ganze = Math.floor(abs / 100);
  const rest = abs % 100;
  const ganzeText = ganze.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const text = rest === 0 && !opts.immerCent ? ganzeText : `${ganzeText},${rest.toString().padStart(2, "0")}`;
  return `${negativ ? MINUS : ""}${text}${NBSP}€`;
}

/** Für Rabatte: immer mit Minuszeichen. */
export function euroMinus(cent: Cent): string {
  return cent === 0 ? euro(0) : euro(-Math.abs(cent));
}

export function prozent(wert: number, stellen = 1): string {
  return `${wert.toFixed(stellen).replace(".", ",")}${NBSP}%`;
}

/** „12,50“ / „12.50“ / „12“ → 1250. Ungültig → null. */
export function parseEuro(eingabe: string): Cent | null {
  const s = eingabe.trim().replace(/€/g, "").replace(/\s/g, "");
  if (!/^-?\d{1,7}([.,]\d{1,2})?$/.test(s)) return null;
  return Math.round(parseFloat(s.replace(",", ".")) * 100);
}

export function gramm(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(g % 1000 === 0 ? 0 : 1).replace(".", ",")}${NBSP}kg`;
  return `${g}${NBSP}g`;
}
