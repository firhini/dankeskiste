import { ogBild, ogGroesse } from "@/lib/og";

export const alt = "Weihnachtsgeschenke für Mitarbeiter – Dankeskiste";
export const size = ogGroesse;
export const contentType = "image/png";

export default function Bild() {
  return ogBild({ label: "Ratgeber", titel: "Weihnachtsgeschenke", kursiv: "für Mitarbeiter", unter: "Boxen von 29 bis 69 €, auch einzeln ins Homeoffice." });
}
