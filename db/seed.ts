/**
 * Füllt die Datenbank mit Sortiment, Verpackung, Boxen, Bildern und Starteinstellungen.
 * Aufruf: `npm run db:seed` (idempotent – vorhandene Katalogdaten werden aktualisiert,
 * Bestellungen, Einkäufe und Ausgaben bleiben unberührt).
 * `npm run db:seed -- --reset` setzt auch Einstellungen und Bilder auf die Startwerte zurück.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { existsSync, readFileSync } from "node:fs";
import { eq, sql } from "drizzle-orm";

async function main() {
  const { db, pool } = await import("./index");
  const s = await import("./schema");
  const { artikel } = await import("./seed-data/artikel");
  const { verpackung } = await import("./seed-data/verpackung");
  const { kollektionen } = await import("./seed-data/kollektionen");
  const { boxen } = await import("./seed-data/boxen");
  const { verpackungFuer } = await import("./seed-data/kalkulation");
  const { startEinstellungen } = await import("../src/lib/einstellungen");
  const reset = process.argv.includes("--reset");

  await db.transaction(async (tx) => {
    // Artikel (zweistufig wegen Selbstbezug auf den alkoholfreien Ersatz)
    for (const a of artikel) {
      const werte = {
        name: a.name, marke: a.marke, groesse: a.groesse, kategorie: a.kategorie, laden: a.laden, ersatz: a.ersatz,
        preisCent: a.preisCent, quelleUrl: a.quelleUrl, quelleHinweis: a.quelleHinweis, geprueftAm: a.geprueftAm,
        status: a.status, gewichtGramm: a.gewichtGramm, mhd: a.mhd, alkohol: a.alkohol, alkoholVol: a.alkoholVol ?? null,
        ersatzOhneAlkoholId: a.ersatzOhneAlkohol ?? null, allergene: a.allergene, saisonal: a.saisonal ?? null,
        render: a.render,
      };
      await tx.insert(s.articles).values({ id: a.id, ...werte }).onConflictDoUpdate({ target: s.articles.id, set: { ...werte, updatedAt: new Date() } });
    }
    for (const v of verpackung) {
      const werte = {
        name: v.name, art: v.art, einheit: v.einheit, preisCent: v.preisCent, gewichtGramm: v.gewichtGramm,
        lieferant: v.lieferant, quelleUrl: v.quelleUrl, quelleHinweis: v.quelleHinweis, geprueftAm: v.geprueftAm, status: v.status,
      };
      await tx.insert(s.packagingItems).values({ id: v.id, ...werte }).onConflictDoUpdate({ target: s.packagingItems.id, set: werte });
    }
    const kollId = new Map<string, number>();
    for (const k of kollektionen) {
      const werte = { name: k.name, kurz: k.kurz, beschreibung: k.beschreibung, sortierung: k.sortierung, sichtbarVon: k.sichtbarVon, sichtbarBis: k.sichtbarBis };
      const [row] = await tx.insert(s.collections).values({ slug: k.slug, ...werte }).onConflictDoUpdate({ target: s.collections.slug, set: werte }).returning({ id: s.collections.id });
      kollId.set(k.slug, row.id);
    }

    const manifestPfad = "src/data/bild-manifest.json";
    const manifest: Record<string, Record<string, { varianten: unknown; breite: number; hoehe: number; blur: string }>> =
      existsSync(manifestPfad) ? JSON.parse(readFileSync(manifestPfad, "utf8")) : {};

    for (const b of boxen) {
      const werte = {
        name: b.name, collectionId: kollId.get(b.kollektion)!, anlass: b.anlass, zielgruppe: b.zielgruppe, kurz: b.kurz,
        text: b.text, begruendung: b.begruendung, preisCent: b.preisCent, groesse: b.groesse, packMinuten: b.packMinuten,
        bestseller: b.bestseller ?? false, aktiv: b.aktiv, sortierung: b.sortierung, band: b.band,
        seoTitel: b.seoTitel, seoBeschreibung: b.seoBeschreibung,
      };
      const [row] = await tx.insert(s.boxes).values({ slug: b.slug, ...werte }).onConflictDoUpdate({ target: s.boxes.slug, set: { ...werte, updatedAt: new Date() } }).returning({ id: s.boxes.id });
      await tx.delete(s.boxItems).where(eq(s.boxItems.boxId, row.id));
      await tx.insert(s.boxItems).values(b.inhalt.map(([articleId, menge], i) => ({ boxId: row.id, articleId, menge, sortierung: i })));
      await tx.delete(s.boxPackaging).where(eq(s.boxPackaging.boxId, row.id));
      await tx.insert(s.boxPackaging).values(verpackungFuer(b).map((v) => ({ boxId: row.id, packagingId: v.item.id, menge: v.menge })));

      // Beispielabbildungen nur anlegen, wenn die Box noch keine Bilder hat (eigene Fotos nie überschreiben)
      const vorhandene = await tx.select({ id: s.boxImages.id, platzhalter: s.boxImages.platzhalter }).from(s.boxImages).where(eq(s.boxImages.boxId, row.id));
      const bilder = manifest[b.slug];
      if (bilder && (vorhandene.length === 0 || (reset && vorhandene.every((v) => v.platzhalter)) || vorhandene.every((v) => v.platzhalter))) {
        await tx.delete(s.boxImages).where(eq(s.boxImages.boxId, row.id));
        const alt: Record<string, string> = {
          hero: `Geöffnete Geschenkbox „${b.name}“ mit ${b.kurz.replace(/\.$/, "")} in Holzwolle`,
          flatlay: `Inhalt der Geschenkbox „${b.name}“ von oben: ${b.kurz.replace(/\.$/, "")}`,
          geschlossen: `Geschlossene Geschenkbox „${b.name}“ aus Kraftkarton mit Baumwollband, Logo-Sticker und Grußkarte`,
        };
        let i = 0;
        for (const art of ["hero", "flatlay", "geschlossen"] as const) {
          const bild = bilder[art];
          if (!bild) continue;
          await tx.insert(s.boxImages).values({
            boxId: row.id, art, varianten: bild.varianten as never, breite: bild.breite, hoehe: bild.hoehe,
            blur: bild.blur, alt: alt[art], platzhalter: true, sortierung: i++,
          });
        }
      }
    }

    const vorhanden = await tx.select({ id: s.settings.id }).from(s.settings).where(eq(s.settings.id, "main"));
    if (vorhanden.length === 0) await tx.insert(s.settings).values({ id: "main", wert: startEinstellungen });
    else if (reset) await tx.update(s.settings).set({ wert: startEinstellungen, updatedAt: new Date() }).where(eq(s.settings.id, "main"));
  });

  const [{ n }] = (await db.execute(sql`select count(*)::int as n from boxes`)).rows as { n: number }[];
  console.log(`Seed fertig: ${artikel.length} Artikel, ${verpackung.length} Verpackungen, ${kollektionen.length} Kollektionen, ${n} Boxen.`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
