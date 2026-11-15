import { kalkuliereBox, type BoxKalkulation } from "../../src/lib/calc/margin";
import { startEinstellungen } from "../../src/lib/einstellungen";
import { artikelNachId, type SeedArtikel } from "./artikel";
import type { SeedBox } from "./boxen";
import { verpackungJeGroesse, verpackungNachId, type SeedVerpackung } from "./verpackung";

export interface BoxAuswertung {
  box: SeedBox;
  artikel: { artikel: SeedArtikel; menge: number }[];
  verpackung: { item: SeedVerpackung; menge: number }[];
  kalk: BoxKalkulation;
  gewichtGramm: number;
  alkohol: boolean;
}

export function verpackungFuer(box: SeedBox): { item: SeedVerpackung; menge: number }[] {
  return [...verpackungJeGroesse[box.groesse], ...(box.zusatzVerpackung ?? [])].map(([id, menge]) => {
    const item = verpackungNachId.get(id);
    if (!item) throw new Error(`Verpackung ${id} fehlt (Box ${box.slug})`);
    return { item, menge };
  });
}

export function werteBoxAus(box: SeedBox): BoxAuswertung {
  const art = box.inhalt.map(([id, menge]) => {
    const a = artikelNachId.get(id);
    if (!a) throw new Error(`Artikel ${id} fehlt (Box ${box.slug})`);
    return { artikel: a, menge };
  });
  const verp = verpackungFuer(box);
  const kalk = kalkuliereBox({
    preisCent: box.preisCent,
    artikel: art.map((x) => ({ preisCent: x.artikel.preisCent, menge: x.menge })),
    verpackung: verp.map((x) => ({ preisCent: x.item.preisCent, menge: x.menge })),
    gebuehren: startEinstellungen.gebuehren,
    mindestmenge: startEinstellungen.mindestmenge,
  });
  const gewichtGramm = Math.round(
    art.reduce((s, x) => s + x.artikel.gewichtGramm * x.menge, 0) +
      verp.reduce((s, x) => s + x.item.gewichtGramm * x.menge, 0),
  );
  return { box, artikel: art, verpackung: verp, kalk, gewichtGramm, alkohol: art.some((x) => x.artikel.alkohol) };
}
