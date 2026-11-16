import type { MetadataRoute } from "next";
import { ladeKatalog } from "@/lib/server/katalog";
import { absolut } from "@/lib/site";

/** Nur öffentlich sichtbare Boxen und Kollektionen; Admin, API, Danke-Seite und Kurzlinks fehlen bewusst. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { boxen, kollektionen, heute } = await ladeKatalog();
  const seite = (pfad: string, prio: number, freq: "daily" | "weekly" | "monthly" | "yearly" = "weekly") => ({ url: absolut(pfad), lastModified: heute, changeFrequency: freq, priority: prio });
  return [
    seite("/", 1, "daily"),
    seite("/boxen", 0.9, "daily"),
    ...kollektionen.map((k) => seite(`/kollektionen/${k.slug}`, 0.8)),
    ...boxen.map((b) => seite(`/boxen/${b.slug}`, 0.8)),
    seite("/weihnachtsgeschenke-mitarbeiter", 0.7, "monthly"),
    seite("/kundengeschenke", 0.7, "monthly"),
    seite("/firmengeschenke-mit-logo", 0.7, "monthly"),
    seite("/onboarding-geschenk", 0.7, "monthly"),
    seite("/lieferung-schwetzingen-mannheim-heidelberg", 0.7, "monthly"),
    seite("/bestellen", 0.6, "weekly"),
    seite("/impressum", 0.2, "yearly"),
    seite("/datenschutz", 0.2, "yearly"),
    seite("/agb", 0.2, "yearly"),
  ];
}
