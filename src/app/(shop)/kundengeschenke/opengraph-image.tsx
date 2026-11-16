import { ogBild, ogGroesse } from "@/lib/og";

export const alt = "Kundengeschenke unter 50 € – Dankeskiste";
export const size = ogGroesse;
export const contentType = "image/png";

export default function Bild() {
  return ogBild({ label: "Ratgeber", titel: "Kundengeschenke", kursiv: "unter 50 €", unter: "Mit Ihrem Logo, von Hand gepackt." });
}
