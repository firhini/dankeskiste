import { ogBild, ogGroesse } from "@/lib/og";

export const alt = "Persönlich geliefert in Mannheim & Heidelberg – Dankeskiste";
export const size = ogGroesse;
export const contentType = "image/png";

export default function Bild() {
  return ogBild({ label: "Rhein-Neckar", titel: "Persönlich geliefert", kursiv: "in Mannheim & Heidelberg", unter: "Schwetzingen und Umgebung, am Wunschtag." });
}
