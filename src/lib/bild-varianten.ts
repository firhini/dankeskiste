import sharp from "sharp";

export const BILD_BREITEN = [480, 800, 1200, 1600];

export interface BildDatei {
  breite: number;
  format: "avif" | "webp";
  daten: Buffer;
}

/**
 * Erzeugt AVIF- und WebP-Varianten in mehreren Breiten plus einen winzigen Blur-Platzhalter.
 * Wird für gerenderte Beispielbilder (Skript) und für eigene Fotos (Admin-Upload) genutzt.
 */
export async function erzeugeVarianten(eingabe: Buffer, maxBreiten: number[] = BILD_BREITEN): Promise<{ dateien: BildDatei[]; breite: number; hoehe: number; blur: string }> {
  const basis = sharp(eingabe, { failOn: "error" }).rotate();
  const meta = await basis.metadata();
  const quer = meta.width ?? 0;
  const hoch = meta.height ?? 0;
  if (!quer || !hoch) throw new Error("Das Bild konnte nicht gelesen werden.");
  const breiten = maxBreiten.filter((b) => b <= quer);
  if (breiten.length === 0) breiten.push(quer);
  const dateien: BildDatei[] = [];
  for (const breite of breiten) {
    const skaliert = basis.clone().resize({ width: breite, withoutEnlargement: true });
    dateien.push({ breite, format: "avif", daten: await skaliert.clone().avif({ quality: 52, effort: 5 }).toBuffer() });
    dateien.push({ breite, format: "webp", daten: await skaliert.clone().webp({ quality: 78, effort: 5 }).toBuffer() });
  }
  const klein = await basis.clone().resize({ width: 20 }).blur(1.2).webp({ quality: 40 }).toBuffer();
  const groesste = Math.max(...breiten);
  return {
    dateien,
    breite: groesste,
    hoehe: Math.round((hoch / quer) * groesste),
    blur: `data:image/webp;base64,${klein.toString("base64")}`,
  };
}
