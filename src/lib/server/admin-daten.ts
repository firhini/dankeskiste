import "server-only";
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db, schema } from "../../../db";
import type { BestellStatus } from "../../../db/schema";
import { kalkuliereBox, type BoxKalkulation } from "../calc/margin";
import { artikelKosten, berechneGewinn, roi, summiere, verteileAusgaben, type GewinnErgebnis, type GewinnSpalte } from "../calc/profit";
import type { Einstellungen } from "../einstellungen";
import { BEZAHLT_STATUS } from "./bestellungen";

export type Bestellung = typeof schema.orders.$inferSelect;
export type Position = typeof schema.orderItems.$inferSelect;
export type Artikel = typeof schema.articles.$inferSelect;

export interface Zeitraum {
  von?: string; // JJJJ-MM-TT
  bis?: string;
}

function grenzen(z: Zeitraum) {
  const bedingungen = [];
  if (z.von) bedingungen.push(gte(schema.orders.bezahltAm, new Date(`${z.von}T00:00:00+01:00`)));
  if (z.bis) bedingungen.push(lte(schema.orders.bezahltAm, new Date(`${z.bis}T23:59:59+01:00`)));
  return bedingungen;
}

export interface BestellAuswertung {
  bestellung: Bestellung;
  boxen: number;
  gewinn: GewinnErgebnis;
  /** Artikelkosten stammen aus dem Packvorgang (true) oder sind vorläufig (false) */
  artikelFest: boolean;
}

export interface Auswertung {
  zeilen: BestellAuswertung[];
  geplant: GewinnSpalte;
  echt: GewinnSpalte;
  gemeinkostenCent: number;
}

/** Bezahlte Bestellungen im Zeitraum mit geplantem und echtem Gewinn inkl. anteiliger Ausgaben. */
export async function ladeAuswertung(z: Zeitraum = {}): Promise<Auswertung> {
  const bestellungen = await db
    .select()
    .from(schema.orders)
    .where(and(inArray(schema.orders.status, BEZAHLT_STATUS), ...grenzen(z)))
    .orderBy(desc(schema.orders.bezahltAm));
  const ids = bestellungen.map((b) => b.id);
  const positionen = ids.length ? await db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, ids)) : [];
  const artikel = await db.select({ id: schema.articles.id, einstandCent: schema.articles.einstandCent }).from(schema.articles);
  const einstand = new Map(artikel.map((a) => [a.id, a.einstandCent]));

  const ausgabenBedingungen = [eq(schema.expenses.inBestellkosten, false)];
  if (z.von) ausgabenBedingungen.push(gte(schema.expenses.datum, z.von));
  if (z.bis) ausgabenBedingungen.push(lte(schema.expenses.datum, z.bis));
  const [{ summe: gemeinkostenCent }] = await db
    .select({ summe: sql<number>`coalesce(sum(${schema.expenses.betragCent}), 0)::int` })
    .from(schema.expenses)
    .where(and(...ausgabenBedingungen));

  const anteile = verteileAusgaben(
    bestellungen.map((b) => ({ id: b.id, umsatzCent: (b.bezahltCent ?? b.summeCent) - b.erstattetCent })),
    gemeinkostenCent,
  );
  const zeilen = bestellungen.map((b) => {
    const pos = positionen.filter((p) => p.orderId === b.id);
    const live = pos.reduce((s, p) => s + p.menge * artikelKosten(p.inhalt, einstand), 0);
    return {
      bestellung: b,
      boxen: pos.reduce((s, p) => s + p.menge, 0),
      gewinn: berechneGewinn({ ...b, echtArtikelCent: b.echtArtikelCent ?? live }, anteile.get(b.id) ?? 0),
      artikelFest: b.echtArtikelCent != null,
    };
  });
  return {
    zeilen,
    geplant: summiere(zeilen.map((x) => x.gewinn.geplant)),
    echt: summiere(zeilen.map((x) => x.gewinn.echt)),
    gemeinkostenCent,
  };
}

// ───────────────────────── Einkaufsliste ─────────────────────────

export interface EinkaufZeile {
  artikel: Artikel;
  bedarf: number;
  bestand: number;
  kaufen: number;
  erwartetCent: number;
  bestellungen: string[];
}

/** Bedarf aller bezahlten, noch nicht gepackten Bestellungen abzüglich Lagerbestand, gruppiert nach Laden. */
export async function ladeEinkaufsliste(): Promise<{ gruppen: { laden: string; zeilen: EinkaufZeile[]; summeCent: number }[]; offeneBestellungen: number; summeCent: number }> {
  const offen = await db.select({ id: schema.orders.id, nummer: schema.orders.nummer }).from(schema.orders).where(inArray(schema.orders.status, ["neu", "eingekauft"]));
  const ids = offen.map((o) => o.id);
  const positionen = ids.length ? await db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, ids)) : [];
  const nummer = new Map(offen.map((o) => [o.id, o.nummer]));
  const bedarf = new Map<string, { menge: number; bestellungen: Set<string> }>();
  for (const p of positionen) {
    for (const x of p.inhalt) {
      const e = bedarf.get(x.articleId) ?? { menge: 0, bestellungen: new Set<string>() };
      e.menge += x.menge * p.menge;
      e.bestellungen.add(nummer.get(p.orderId) ?? "");
      bedarf.set(x.articleId, e);
    }
  }
  const artikel = bedarf.size ? await db.select().from(schema.articles).where(inArray(schema.articles.id, [...bedarf.keys()])) : [];
  const zeilen: EinkaufZeile[] = artikel.map((a) => {
    const b = bedarf.get(a.id)!;
    const kaufen = Math.max(0, b.menge - Math.max(0, a.bestand));
    return { artikel: a, bedarf: b.menge, bestand: a.bestand, kaufen, erwartetCent: kaufen * a.preisCent, bestellungen: [...b.bestellungen].sort() };
  });
  const laeden = [...new Set(zeilen.map((z) => z.artikel.laden))].sort();
  const gruppen = laeden.map((laden) => {
    const zs = zeilen.filter((z) => z.artikel.laden === laden).sort((a, b) => Number(b.kaufen > 0) - Number(a.kaufen > 0) || a.artikel.kategorie.localeCompare(b.artikel.kategorie) || a.artikel.name.localeCompare(b.artikel.name));
    return { laden, zeilen: zs, summeCent: zs.reduce((s, z) => s + z.erwartetCent, 0) };
  });
  return { gruppen, offeneBestellungen: offen.length, summeCent: gruppen.reduce((s, g) => s + g.summeCent, 0) };
}

// ───────────────────────── Boxen ─────────────────────────

export interface BoxMitKalkulation {
  box: typeof schema.boxes.$inferSelect;
  kollektion: string;
  kalk: BoxKalkulation;
  artikel: { artikel: Artikel; menge: number }[];
  verpackung: { item: typeof schema.packagingItems.$inferSelect; menge: number }[];
  bilder: (typeof schema.boxImages.$inferSelect)[];
  gewichtGramm: number;
}

export async function ladeBoxenMitKalkulation(e: Einstellungen, nurId?: number): Promise<BoxMitKalkulation[]> {
  const [boxen, kollektionen, items, verp, artikel, packaging, bilder] = await Promise.all([
    nurId ? db.select().from(schema.boxes).where(eq(schema.boxes.id, nurId)) : db.select().from(schema.boxes).orderBy(asc(schema.boxes.collectionId), asc(schema.boxes.sortierung)),
    db.select().from(schema.collections),
    db.select().from(schema.boxItems).orderBy(asc(schema.boxItems.sortierung)),
    db.select().from(schema.boxPackaging),
    db.select().from(schema.articles),
    db.select().from(schema.packagingItems),
    db.select().from(schema.boxImages).orderBy(asc(schema.boxImages.sortierung), asc(schema.boxImages.id)),
  ]);
  const aNach = new Map(artikel.map((a) => [a.id, a]));
  const pNach = new Map(packaging.map((p) => [p.id, p]));
  const kNach = new Map(kollektionen.map((k) => [k.id, k.name]));
  return boxen.map((box) => {
    const art = items.filter((i) => i.boxId === box.id).flatMap((i) => (aNach.get(i.articleId) ? [{ artikel: aNach.get(i.articleId)!, menge: i.menge }] : []));
    const vp = verp.filter((v) => v.boxId === box.id).flatMap((v) => (pNach.get(v.packagingId) ? [{ item: pNach.get(v.packagingId)!, menge: v.menge }] : []));
    return {
      box,
      kollektion: kNach.get(box.collectionId) ?? "",
      artikel: art,
      verpackung: vp,
      bilder: bilder.filter((b) => b.boxId === box.id),
      gewichtGramm: Math.round(art.reduce((s, x) => s + x.artikel.gewichtGramm * x.menge, 0) + vp.reduce((s, x) => s + x.item.gewichtGramm * x.menge, 0)),
      kalk: kalkuliereBox({
        preisCent: box.preisCent,
        artikel: art.map((x) => ({ preisCent: x.artikel.preisCent, menge: x.menge })),
        verpackung: vp.map((x) => ({ preisCent: x.item.preisCent, menge: x.menge })),
        gebuehren: e.gebuehren,
        mindestmenge: e.mindestmenge,
        ziel: e.margen.zielProzent,
        min: e.margen.minProzent,
      }),
    };
  });
}

// ───────────────────────── Kampagnen ─────────────────────────

export interface KampagnenZeile {
  kampagne: typeof schema.campaigns.$inferSelect;
  scans: number;
  scans7Tage: number;
  bestellungen: number;
  umsatzCent: number;
  gewinnCent: number;
  kostenCent: number;
  roiProzent: number | null;
}

export async function ladeKampagnen(): Promise<KampagnenZeile[]> {
  const [kampagnen, scans, ausgaben, auswertung] = await Promise.all([
    db.select().from(schema.campaigns).orderBy(desc(schema.campaigns.createdAt)),
    db
      .select({
        campaignId: schema.campaignScans.campaignId,
        gesamt: sql<number>`sum(${schema.campaignScans.anzahl})::int`,
        woche: sql<number>`coalesce(sum(${schema.campaignScans.anzahl}) filter (where ${schema.campaignScans.tag} > current_date - 7), 0)::int`,
      })
      .from(schema.campaignScans)
      .groupBy(schema.campaignScans.campaignId),
    db
      .select({ campaignId: schema.expenses.campaignId, summe: sql<number>`sum(${schema.expenses.betragCent})::int` })
      .from(schema.expenses)
      .where(sql`${schema.expenses.campaignId} is not null`)
      .groupBy(schema.expenses.campaignId),
    ladeAuswertung(),
  ]);
  return kampagnen.map((k) => {
    const zeilen = auswertung.zeilen.filter((z) => z.bestellung.campaignId === k.id);
    const kostenCent = k.kostenCent + (ausgaben.find((a) => a.campaignId === k.id)?.summe ?? 0);
    // Gewinn vor Gemeinkosten, damit Kampagnenkosten nicht doppelt abgezogen werden
    const gewinnCent = zeilen.reduce((s, z) => s + z.gewinn.echt.gewinnCent + z.gewinn.echt.ausgabenCent, 0);
    const sc = scans.find((s) => s.campaignId === k.id);
    return {
      kampagne: k,
      scans: sc?.gesamt ?? 0,
      scans7Tage: sc?.woche ?? 0,
      bestellungen: zeilen.length,
      umsatzCent: zeilen.reduce((s, z) => s + z.gewinn.echt.umsatzCent, 0),
      gewinnCent,
      kostenCent,
      roiProzent: roi(gewinnCent - kostenCent, kostenCent),
    };
  });
}

// ───────────────────────── Übersicht ─────────────────────────

export async function ladeUebersicht(heute: string) {
  const jahr = heute.slice(0, 4);
  const [jahrAuswertung, statusZaehler, offenePakete, bestseller, wochen, anfragenOffen, artikel, zahlungAusstehend] = await Promise.all([
    ladeAuswertung({ von: `${jahr}-01-01`, bis: `${jahr}-12-31` }),
    db.select({ status: schema.orders.status, n: sql<number>`count(*)::int` }).from(schema.orders).where(sql`${schema.orders.status} <> 'offen'`).groupBy(schema.orders.status),
    db
      .select({ pakete: sql<number>`coalesce(sum(case when ${schema.orders.lieferart} = 'persoenlich' then 0 else ${schema.orders.paketeAnzahl} end), 0)::int`, lieferungen: sql<number>`count(*) filter (where ${schema.orders.lieferart} = 'persoenlich')::int` })
      .from(schema.orders)
      .where(inArray(schema.orders.status, ["neu", "eingekauft", "gepackt"])),
    db
      .select({ name: schema.orderItems.boxName, menge: sql<number>`sum(${schema.orderItems.menge})::int`, umsatz: sql<number>`sum(${schema.orderItems.menge} * ${schema.orderItems.stueckpreisCent})::int` })
      .from(schema.orderItems)
      .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
      .where(inArray(schema.orders.status, BEZAHLT_STATUS))
      .groupBy(schema.orderItems.boxName)
      .orderBy(sql`sum(${schema.orderItems.menge}) desc`)
      .limit(6),
    db
      .select({ woche: sql<string>`to_char(date_trunc('week', ${schema.orders.bezahltAm} at time zone 'Europe/Berlin'), 'YYYY-MM-DD')`, umsatz: sql<number>`sum(coalesce(${schema.orders.bezahltCent}, ${schema.orders.summeCent}) - ${schema.orders.erstattetCent})::int`, n: sql<number>`count(*)::int` })
      .from(schema.orders)
      .where(and(inArray(schema.orders.status, BEZAHLT_STATUS), gte(schema.orders.bezahltAm, sql`now() - interval '84 days'`)))
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.inquiries).where(eq(schema.inquiries.status, "offen")),
    db.select().from(schema.articles).where(eq(schema.articles.aktiv, true)),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.orders).where(eq(schema.orders.status, "zahlung_ausstehend")),
  ]);
  const grenze = new Date(`${heute}T00:00:00Z`);
  grenze.setUTCDate(grenze.getUTCDate() - 30);
  const grenzeIso = grenze.toISOString().slice(0, 10);
  return {
    jahr,
    jahrAuswertung,
    status: Object.fromEntries(statusZaehler.map((s) => [s.status, s.n])) as Partial<Record<BestellStatus, number>>,
    offenePakete: offenePakete[0],
    bestseller,
    wochen,
    anfragenOffen: anfragenOffen[0].n,
    zahlungAusstehend: zahlungAusstehend[0].n,
    preiseAlt: artikel.filter((a) => a.geprueftAm < grenzeIso).length,
    allergeneOffen: artikel.filter((a) => !a.allergeneGeprueft && a.kategorie !== "Non-Food").length,
    knapp: artikel.filter((a) => a.mindestbestand > 0 && a.bestand < a.mindestbestand).length,
  };
}

export async function ladeBestellung(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [bestellung] = await db.select().from(schema.orders).where(eq(schema.orders.id, id));
  if (!bestellung) return null;
  const [positionen, empfaenger, mails, kampagne] = await Promise.all([
    db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, id)).orderBy(asc(schema.orderItems.id)),
    db.select().from(schema.orderRecipients).where(eq(schema.orderRecipients.orderId, id)).orderBy(asc(schema.orderRecipients.id)),
    db.select().from(schema.mailLog).where(eq(schema.mailLog.orderId, id)).orderBy(desc(schema.mailLog.createdAt)),
    bestellung.campaignId ? db.select().from(schema.campaigns).where(eq(schema.campaigns.id, bestellung.campaignId)) : Promise.resolve([]),
  ]);
  return { bestellung, positionen, empfaenger, mails, kampagne: kampagne[0] ?? null };
}
