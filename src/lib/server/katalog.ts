import "server-only";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, schema } from "../../../db";
import type { BildVarianten, InhaltSnapshot, VerpackungSnapshot } from "../../../db/schema";
import { heuteBerlin } from "../calc/deadlines";
import type { KatalogBox } from "../calc/quote";
import type { Groesse } from "../calc/shipping";

export interface ShopBild {
  art: string;
  varianten: BildVarianten;
  breite: number;
  hoehe: number;
  blur: string;
  alt: string;
  platzhalter: boolean;
}

export interface ShopArtikel {
  id: string;
  name: string;
  marke: string;
  groesse: string;
  menge: number;
  kategorie: string;
  alkohol: boolean;
  alkoholVol: string | null;
  /** nur gesetzt, wenn an der Packung geprüft */
  allergene: string | null;
  zutaten: string | null;
  mhd: string;
  ersatzOhneAlkohol: { name: string; marke: string; groesse: string } | null;
}

export interface ShopBox extends KatalogBox {
  id: number;
  kollektionSlug: string;
  kollektionName: string;
  anlass: string;
  zielgruppe: string;
  kurz: string;
  text: string;
  bestseller: boolean;
  band: string;
  sortierung: number;
  seoTitel: string;
  seoBeschreibung: string;
  inhalt: ShopArtikel[];
  bilder: ShopBild[];
}

export interface ShopKollektion {
  slug: string;
  name: string;
  kurz: string;
  beschreibung: string;
  sortierung: number;
  sichtbarBis: string | null;
}

export interface Katalog {
  heute: string;
  kollektionen: ShopKollektion[];
  boxen: ShopBox[];
}

function imZeitraum(heute: string, von: string | null, bis: string | null): boolean {
  return (!von || heute >= von) && (!bis || heute <= bis);
}

async function ladeRoh() {
  const [kollektionen, boxen, items, verpackung, bilder, artikel, packaging] = await Promise.all([
    db.select().from(schema.collections).orderBy(asc(schema.collections.sortierung)),
    db.select().from(schema.boxes).orderBy(asc(schema.boxes.sortierung), asc(schema.boxes.id)),
    db.select().from(schema.boxItems).orderBy(asc(schema.boxItems.sortierung)),
    db.select().from(schema.boxPackaging),
    db.select().from(schema.boxImages).orderBy(asc(schema.boxImages.sortierung), asc(schema.boxImages.id)),
    db.select().from(schema.articles),
    db.select().from(schema.packagingItems),
  ]);
  return { kollektionen, boxen, items, verpackung, bilder, artikel, packaging };
}

/** Öffentlicher Katalog: nur aktive, im Zeitraum sichtbare Kollektionen und Boxen. Keine Einkaufspreise. */
export async function ladeKatalog(): Promise<Katalog> {
  "use cache";
  cacheTag("katalog");
  cacheLife("hours");
  const heute = heuteBerlin();
  const roh = await ladeRoh();
  const artikelNach = new Map(roh.artikel.map((a) => [a.id, a]));
  const packNach = new Map(roh.packaging.map((p) => [p.id, p]));
  const kollNach = new Map(roh.kollektionen.map((k) => [k.id, k]));
  const sichtbareKoll = roh.kollektionen.filter((k) => k.aktiv && imZeitraum(heute, k.sichtbarVon, k.sichtbarBis));
  const sichtbareIds = new Set(sichtbareKoll.map((k) => k.id));

  const boxen: ShopBox[] = roh.boxen
    .filter((b) => b.aktiv && sichtbareIds.has(b.collectionId) && imZeitraum(heute, b.sichtbarVon, b.sichtbarBis))
    .map((b) => {
      const koll = kollNach.get(b.collectionId)!;
      const inhalt = roh.items.filter((i) => i.boxId === b.id);
      const gewichtArtikel = inhalt.reduce((s, i) => s + (artikelNach.get(i.articleId)?.gewichtGramm ?? 0) * i.menge, 0);
      const gewichtVerp = roh.verpackung.filter((v) => v.boxId === b.id).reduce((s, v) => s + (packNach.get(v.packagingId)?.gewichtGramm ?? 0) * v.menge, 0);
      return {
        id: b.id,
        slug: b.slug,
        name: b.name,
        preisCent: b.preisCent,
        groesse: b.groesse as Groesse,
        gewichtGramm: Math.round(gewichtArtikel + gewichtVerp),
        alkohol: inhalt.some((i) => artikelNach.get(i.articleId)?.alkohol),
        kollektionSlug: koll.slug,
        kollektionName: koll.name,
        anlass: b.anlass,
        zielgruppe: b.zielgruppe,
        kurz: b.kurz,
        text: b.text,
        bestseller: b.bestseller,
        band: b.band,
        sortierung: b.sortierung,
        seoTitel: b.seoTitel,
        seoBeschreibung: b.seoBeschreibung,
        inhalt: inhalt.flatMap((i) => {
          const a = artikelNach.get(i.articleId);
          if (!a) return [];
          const ers = a.ersatzOhneAlkoholId ? artikelNach.get(a.ersatzOhneAlkoholId) : null;
          return [{
            id: a.id, name: a.name, marke: a.marke, groesse: a.groesse, menge: i.menge, kategorie: a.kategorie,
            alkohol: a.alkohol, alkoholVol: a.alkoholVol,
            allergene: a.allergeneGeprueft ? a.allergene : null,
            zutaten: a.allergeneGeprueft && a.zutaten ? a.zutaten : null,
            mhd: a.mhd,
            ersatzOhneAlkohol: ers ? { name: ers.name, marke: ers.marke, groesse: ers.groesse } : null,
          }];
        }),
        bilder: roh.bilder.filter((x) => x.boxId === b.id).map((x) => ({ art: x.art, varianten: x.varianten, breite: x.breite, hoehe: x.hoehe, blur: x.blur, alt: x.alt, platzhalter: x.platzhalter })),
      };
    });

  const mitBoxen = new Set(boxen.map((b) => b.kollektionSlug));
  return {
    heute,
    kollektionen: sichtbareKoll.filter((k) => mitBoxen.has(k.slug)).map((k) => ({ slug: k.slug, name: k.name, kurz: k.kurz, beschreibung: k.beschreibung, sortierung: k.sortierung, sichtbarBis: k.sichtbarBis })),
    boxen,
  };
}

export function alsRechnerKatalog(boxen: ShopBox[]): KatalogBox[] {
  return boxen.map(({ slug, name, preisCent, groesse, gewichtGramm, alkohol }) => ({ slug, name, preisCent, groesse, gewichtGramm, alkohol }));
}

export interface BestellBox extends KatalogBox {
  id: number;
  packMinuten: number;
  inhalt: InhaltSnapshot[];
  inhaltOhneAlkohol: InhaltSnapshot[];
  verpackung: VerpackungSnapshot[];
}

/**
 * Frischer, vollständiger Katalog für den Checkout (mit Einkaufspreisen für den Kosten-Snapshot).
 * Enthält ebenfalls nur aktuell sichtbare Boxen – unsichtbare sind nicht bestellbar.
 */
export async function ladeBestellKatalog(): Promise<BestellBox[]> {
  const heute = heuteBerlin();
  const roh = await ladeRoh();
  const artikelNach = new Map(roh.artikel.map((a) => [a.id, a]));
  const packNach = new Map(roh.packaging.map((p) => [p.id, p]));
  const kollNach = new Map(roh.kollektionen.map((k) => [k.id, k]));
  return roh.boxen
    .filter((b) => {
      const k = kollNach.get(b.collectionId);
      return b.aktiv && k?.aktiv && imZeitraum(heute, k.sichtbarVon, k.sichtbarBis) && imZeitraum(heute, b.sichtbarVon, b.sichtbarBis);
    })
    .map((b) => {
      const zeilen = roh.items.filter((i) => i.boxId === b.id);
      const snap = (ohneAlkohol: boolean): InhaltSnapshot[] =>
        zeilen.flatMap((i) => {
          const original = artikelNach.get(i.articleId);
          if (!original) return [];
          const ers = ohneAlkohol && original.alkohol && original.ersatzOhneAlkoholId ? artikelNach.get(original.ersatzOhneAlkoholId) : null;
          const a = ers ?? original;
          return [{
            articleId: a.id, name: a.name, marke: a.marke, groesse: a.groesse, menge: i.menge, preisCent: a.preisCent,
            gewichtGramm: a.gewichtGramm, laden: a.laden, alkohol: a.alkohol,
            ...(ers ? { ersetzt: `${original.marke} ${original.name}` } : {}),
          }];
        });
      const verpackung: VerpackungSnapshot[] = roh.verpackung.filter((v) => v.boxId === b.id).flatMap((v) => {
        const p = packNach.get(v.packagingId);
        return p ? [{ packagingId: p.id, name: p.name, menge: v.menge, preisCent: p.preisCent }] : [];
      });
      const inhalt = snap(false);
      const gewichtVerp = roh.verpackung.filter((v) => v.boxId === b.id).reduce((s, v) => s + (packNach.get(v.packagingId)?.gewichtGramm ?? 0) * v.menge, 0);
      return {
        id: b.id, slug: b.slug, name: b.name, preisCent: b.preisCent, groesse: b.groesse as Groesse,
        gewichtGramm: Math.round(inhalt.reduce((s, x) => s + x.gewichtGramm * x.menge, 0) + gewichtVerp),
        alkohol: inhalt.some((x) => x.alkohol), packMinuten: b.packMinuten,
        inhalt, inhaltOhneAlkohol: snap(true), verpackung,
      };
    });
}

export async function alleBoxSlugs(): Promise<string[]> {
  const zeilen = await db.select({ slug: schema.boxes.slug }).from(schema.boxes).where(eq(schema.boxes.aktiv, true));
  return zeilen.map((z) => z.slug);
}
