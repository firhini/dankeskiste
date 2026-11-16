/**
 * Wandelt die Render-Ausgabe (renders/final/<slug>-<aufnahme>.png) in Web-Bilder um:
 * AVIF + WebP in vier Breiten nach public/images/boxen/, dazu src/data/bild-manifest.json
 * mit Maßen und Blur-Platzhalter. Danach `npm run db:seed`, damit die Boxen die Bilder bekommen.
 *
 * Aufruf: npm run bilder            (alle)
 *         npm run bilder -- weihnachtskiste pasta-abend
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { erzeugeVarianten } from "../src/lib/bild-varianten";

const QUELLE = process.env.RENDER_DIR ?? "renders/final";
const ZIEL = "public/images/boxen";
const MANIFEST = "src/data/bild-manifest.json";
const AUFNAHMEN = ["hero", "flatlay", "geschlossen"] as const;

type Eintrag = { varianten: { avif: Record<string, string>; webp: Record<string, string> }; breite: number; hoehe: number; blur: string };

async function main() {
  if (!existsSync(QUELLE)) throw new Error(`${QUELLE} fehlt – zuerst rendern: python3 scripts/render/render.py --boxes scripts/render/boxes.json --out renders/final --grade`);
  mkdirSync(ZIEL, { recursive: true });
  mkdirSync(path.dirname(MANIFEST), { recursive: true });
  const manifest: Record<string, Record<string, Eintrag>> = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
  const nur = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const dateien = readdirSync(QUELLE).filter((f) => f.endsWith(".png"));
  let n = 0;
  for (const datei of dateien.sort()) {
    const treffer = datei.match(/^(.+)-(hero|flatlay|geschlossen)\.png$/);
    if (!treffer) continue;
    const [, slug, art] = treffer;
    if (nur.length && !nur.includes(slug)) continue;
    const { dateien: varianten, breite, hoehe, blur } = await erzeugeVarianten(readFileSync(path.join(QUELLE, datei)));
    const eintrag: Eintrag = { varianten: { avif: {}, webp: {} }, breite, hoehe, blur };
    for (const v of varianten) {
      // Sprechender Dateiname für die Bildersuche
      const name = `geschenkbox-${slug}-${art === "hero" ? "geoeffnet" : art === "flatlay" ? "inhalt" : "geschlossen"}-${v.breite}.${v.format}`;
      writeFileSync(path.join(ZIEL, name), v.daten);
      eintrag.varianten[v.format][String(v.breite)] = `/images/boxen/${name}`;
    }
    (manifest[slug] ??= {})[art] = eintrag;
    n++;
    console.log(`${datei} → ${varianten.length} Dateien (${Math.round(varianten.reduce((s, v) => s + v.daten.length, 0) / 1024)} kB)`);
  }
  const sortiert = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, Object.fromEntries(AUFNAHMEN.filter((a) => manifest[k][a]).map((a) => [a, manifest[k][a]]))]));
  writeFileSync(MANIFEST, JSON.stringify(sortiert, null, 1) + "\n");
  console.log(`${n} Bilder verarbeitet. Manifest: ${MANIFEST}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
