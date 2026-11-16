/**
 * Weg B (optional): Produktbilder über eine Bild-API statt Blender.
 *
 *   npm run bilder:api -- --nur-prompts     schreibt renders/prompts.md (ohne API-Aufruf)
 *   IMAGE_API_PROVIDER=openai IMAGE_API_KEY=… npm run bilder:api [-- slug …]
 *
 * Die Ergebnisse landen wie die Blender-Renderings in renders/final/ und laufen danach durch
 * dieselbe Nachbearbeitung (`npm run bilder`). Unterstützt ist derzeit der Anbieter "openai".
 * ACHTUNG: Der API-Aufruf konnte beim Aufbau des Projekts nicht getestet werden (kein Schlüssel,
 * kein Netzzugang). Prompts und Dateiablage sind geprüft, der Abruf selbst nicht.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

interface Item { type: string; label: string; sub: string; tone?: string }
interface Box { slug: string; name: string; size: string; ribbon: string; items: Item[] }

const STIL =
  "Product photograph for a small German gift-box company. Soft natural window light from the left, gentle shadows, shallow depth of field (85mm, f/2.8), " +
  "calm composition with generous negative space. Background: cream-coloured linen (#EBEBD8). Materials: brown kraft corrugated cardboard box, pale wood wool, " +
  "matte olive-green cotton ribbon (#637545), cream paper card. Colour palette limited to cream, sage (#9BA685), olive and dark olive (#455230) plus natural paper tones. " +
  "Slight imperfections, natural warm colour, fine film grain. Packaging carries only plain neutral paper labels with no readable text, no logos, no brand names, no watermark.";

const TYP: Record<string, string> = {
  coffee_bag: "a matte block-bottom coffee bag", tea_box: "a small folding carton of tea", chocolate_bar: "a chocolate bar in a paper sleeve", praline_box: "a flat box of chocolates",
  cookie_pack: "a rectangular carton of biscuits", tin: "a small tin", jar: "a screw-top glass jar", bottle: "a 0.75 l glass bottle", bottle_small: "a small 0.2 l glass bottle",
  pouch: "a stand-up paper pouch of nuts", pasta_bag: "a paper bag of pasta", marzipan_loaf: "a small wrapped marzipan loaf", stick_pack: "a long narrow box of breadsticks", notebook: "an A5 notebook", candle: "a candle in a glass",
};

function prompts(box: Box): Record<string, string> {
  const inhalt = box.items.map((i) => TYP[i.type] ?? "a small package").join(", ");
  return {
    hero: `${STIL} Scene: an open ${box.size === "klein" ? "small" : box.size === "gross" ? "large" : "medium"} gift box seen from a 40-degree angle, lid leaning beside it. Inside, nestled in wood wool, exactly these items and nothing else: ${inhalt}. A small cream card lies in front of the box.`,
    flatlay: `${STIL} Scene: top-down flat lay. The closed gift box with ${box.ribbon === "natur" ? "natural-coloured" : "olive"} ribbon in the upper left; neatly arranged around it exactly these items and nothing else: ${inhalt}.`,
    geschlossen: `${STIL} Scene: the closed gift box, slightly angled, tied with a ${box.ribbon === "natur" ? "natural-coloured" : "olive"} cotton ribbon and bow, a blank round white paper sticker (5 cm) on the lid, a cream card tucked under the ribbon. Nothing else in frame.`,
  };
}

async function main() {
  const { boxes } = JSON.parse(readFileSync("scripts/render/boxes.json", "utf8")) as { boxes: Box[] };
  const args = process.argv.slice(2);
  const nur = args.filter((a) => !a.startsWith("-"));
  const auswahl = boxes.filter((b) => !nur.length || nur.includes(b.slug));
  mkdirSync("renders/final", { recursive: true });
  if (args.includes("--nur-prompts")) {
    const md = auswahl.map((b) => `## ${b.name} (${b.slug})\n\n${Object.entries(prompts(b)).map(([k, v]) => `**${k}**\n\n${v}`).join("\n\n")}`).join("\n\n");
    writeFileSync("renders/prompts.md", md + "\n");
    console.log(`renders/prompts.md geschrieben (${auswahl.length} Boxen).`);
    return;
  }
  const anbieter = process.env.IMAGE_API_PROVIDER;
  const key = process.env.IMAGE_API_KEY;
  if (!anbieter || !key) throw new Error("IMAGE_API_PROVIDER und IMAGE_API_KEY müssen gesetzt sein (oder --nur-prompts verwenden).");
  if (anbieter !== "openai") throw new Error(`Anbieter „${anbieter}“ wird nicht unterstützt. Unterstützt: openai.`);
  for (const box of auswahl) {
    for (const [aufnahme, prompt] of Object.entries(prompts(box))) {
      const antwort = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: process.env.IMAGE_API_MODEL ?? "gpt-image-1", prompt, size: aufnahme === "flatlay" ? "1024x1024" : "1536x1024", n: 1 }),
      });
      if (!antwort.ok) throw new Error(`${box.slug}/${aufnahme}: ${antwort.status} ${await antwort.text()}`);
      const daten = (await antwort.json()) as { data: { b64_json?: string }[] };
      const b64 = daten.data[0]?.b64_json;
      if (!b64) throw new Error(`${box.slug}/${aufnahme}: keine Bilddaten in der Antwort`);
      writeFileSync(`renders/final/${box.slug}-${aufnahme}.png`, Buffer.from(b64, "base64"));
      console.log(`${box.slug}-${aufnahme}.png`);
    }
  }
  console.log("Fertig. Jetzt: npm run bilder && npm run db:seed");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
