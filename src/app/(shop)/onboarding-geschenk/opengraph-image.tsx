import { ogBild, ogGroesse } from "@/lib/og";

export const alt = "Onboarding-Geschenk für den ersten Tag – Dankeskiste";
export const size = ogGroesse;
export const contentType = "image/png";

export default function Bild() {
  return ogBild({ label: "Ratgeber", titel: "Onboarding-Geschenk", kursiv: "für den ersten Tag", unter: "Welcome Box mit Notizbuch, Kaffee und Snacks." });
}
