import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const ogGroesse = { width: 1200, height: 630 };

const schrift = (datei: string) => readFile(join(process.cwd(), "src/assets/fonts", datei));
const schriften = Promise.all([schrift("Newsreader-Regular.ttf"), schrift("Newsreader-Italic.ttf"), schrift("HankenGrotesk-SemiBold.ttf")]);

/** Open-Graph-Bild in den Markenfarben: Creme, Oliv-Headline, kursiver Akzent in Rot, feine Linie, Wortmarke. */
export async function ogBild({ label, titel, kursiv, unter }: { label: string; titel: string; kursiv?: string; unter?: string }) {
  const [regular, italic, grotesk] = await schriften;
  const gross = titel.length + (kursiv?.length ?? 0) > 34 ? 76 : 96;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ebebd8", color: "#1f2416", padding: "64px 72px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "Hanken", fontSize: 22, letterSpacing: 3, color: "#455230" }}>
          <span>{label.toUpperCase()}</span>
          <span>VON HAND GEPACKT IN SCHWETZINGEN</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexWrap: "wrap", fontFamily: "Newsreader", fontSize: gross, lineHeight: 1.04, letterSpacing: -2, color: "#637545" }}>
            <span>{titel}</span>
            {kursiv ? <span style={{ fontStyle: "italic", color: "#cc2216", marginLeft: titel ? 22 : 0 }}>{kursiv}</span> : null}
          </div>
          {unter ? <div style={{ display: "flex", marginTop: 26, fontFamily: "Hanken", fontSize: 30, color: "#1f2416" }}>{unter}</div> : null}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "2px solid #9ba685", paddingTop: 26 }}>
          <div style={{ display: "flex", fontFamily: "Newsreader", fontSize: 54, letterSpacing: -1, color: "#455230" }}>
            <span>Dankes</span>
            <span style={{ fontStyle: "italic", color: "#cc2216" }}>kiste</span>
          </div>
          <div style={{ display: "flex", fontFamily: "Hanken", fontSize: 24, color: "#455230" }}>Geschenkboxen für Mitarbeiter und Kunden</div>
        </div>
      </div>
    ),
    {
      ...ogGroesse,
      fonts: [
        { name: "Newsreader", data: regular, style: "normal", weight: 400 },
        { name: "Newsreader", data: italic, style: "italic", weight: 400 },
        { name: "Hanken", data: grotesk, style: "normal", weight: 600 },
      ],
    },
  );
}
