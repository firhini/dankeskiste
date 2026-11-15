import { boxen } from "../db/seed-data/boxen";
import { werteBoxAus } from "../db/seed-data/kalkulation";

const e = (c: number) => (c / 100).toFixed(2).padStart(6);
let fehler = 0;
console.log("Box                          Preis  Einkauf  Verp.  Gebühr  Ertrag  Marge   Gewicht");
for (const box of boxen) {
  const a = werteBoxAus(box);
  const k = a.kalk;
  if (k.margeProzent < 45) fehler++;
  console.log(
    `${box.slug.padEnd(27)} ${e(k.preisCent)}  ${e(k.einkaufCent)} ${e(k.verpackungCent)}  ${e(k.gebuehrCent)}  ${e(k.rohertragCent)}  ${k.margeProzent.toFixed(1)} % ${k.margeProzent < 45 ? "!!" : "  "} ${a.gewichtGramm} g`,
  );
}
if (fehler) {
  console.error(`\n${fehler} Box(en) unter 45 % Rohertrag.`);
  process.exit(1);
}
