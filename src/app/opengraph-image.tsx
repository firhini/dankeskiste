import { ogBild, ogGroesse } from "@/lib/og";

export const alt = "Dankeskiste – Geschenkboxen für Mitarbeiter und Kunden";
export const size = ogGroesse;
export const contentType = "image/png";

export default function Bild() {
  return ogBild({ label: "Für Firmen · ab 5 Boxen", titel: "Ein Dankeschön,", kursiv: "von Hand gepackt.", unter: "Mit Ihrem Logo und Grußkarte. Versand deutschlandweit." });
}
