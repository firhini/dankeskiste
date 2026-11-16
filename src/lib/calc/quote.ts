import type { Einstellungen } from "../einstellungen";
import type { Cent } from "../geld";
import { imLiefergebiet } from "./deadlines";
import { PLATZ, versandFuerAdressen, type BoxEinheit, type Groesse, type Paket } from "./shipping";

export type Lieferart = "versand" | "mehrfach" | "persoenlich";

/** Was der Rechenkern über eine Box wissen muss (öffentliche Katalogdaten). */
export interface KatalogBox {
  slug: string;
  name: string;
  preisCent: Cent;
  groesse: Groesse;
  gewichtGramm: number;
  alkohol: boolean;
}

export interface AngebotEingabe {
  positionen: { slug: string; menge: number }[];
  perso: { handgeschrieben: boolean; banderole: boolean; namensanhaenger: boolean };
  lieferung: {
    art: Lieferart;
    plz?: string;
    /** nur bei „mehrfach“: je Empfänger Box und Menge */
    empfaenger?: { boxSlug: string; menge: number }[];
  };
  rabatt?: { code: string; art: "prozent" | "betrag"; wert: number } | null;
}

export interface AngebotZeile {
  slug: string;
  name: string;
  menge: number;
  listenpreisCent: Cent;
  stueckpreisCent: Cent;
  summeCent: Cent;
}

export interface Angebot {
  zeilen: AngebotZeile[];
  anzahlBoxen: number;
  staffelProzent: number;
  listenSummeCent: Cent;
  staffelRabattCent: Cent;
  warenCent: Cent;
  perso: { id: "handgeschrieben" | "banderole" | "namensanhaenger"; name: string; menge: number; einzelCent: Cent; summeCent: Cent; materialCent: Cent }[];
  personalisierungCent: Cent;
  persoMaterialCent: Cent;
  rabattCode: string | null;
  rabattCodeCent: Cent;
  versand: { art: Lieferart; pakete: Paket[]; preisCent: Cent; kostenCent: Cent; gewichtGramm: number; text: string };
  summeCent: Cent;
  naechsteStaffel: { ab: number; prozent: number; fehlen: number } | null;
  enthaeltAlkohol: boolean;
  fehler: { feld: "positionen" | "lieferung" | "empfaenger"; text: string }[];
}

export function staffelFuer(anzahl: number, staffeln: Einstellungen["staffeln"]): number {
  return [...staffeln].sort((a, b) => b.ab - a.ab).find((s) => anzahl >= s.ab)?.prozent ?? 0;
}

const PERSO_NAMEN = {
  handgeschrieben: "Handgeschriebene Karte",
  banderole: "Banderole mit Logo",
  namensanhaenger: "Namensanhänger",
} as const;

/**
 * Berechnet das Angebot. Diese Funktion ist die einzige Preisquelle: Sie läuft im Browser
 * für die Live-Zusammenfassung und auf dem Server, wo ihr Ergebnis maßgeblich ist.
 */
export function berechneAngebot(eingabe: AngebotEingabe, katalog: KatalogBox[], e: Einstellungen): Angebot {
  const fehler: Angebot["fehler"] = [];
  const nachSlug = new Map(katalog.map((b) => [b.slug, b]));

  // Positionen zusammenfassen und bereinigen
  const mengen = new Map<string, number>();
  for (const p of eingabe.positionen) {
    const menge = Math.floor(Number(p.menge));
    if (!Number.isFinite(menge) || menge <= 0) continue;
    if (!nachSlug.has(p.slug)) {
      fehler.push({ feld: "positionen", text: "Eine gewählte Box ist nicht mehr verfügbar. Bitte laden Sie die Seite neu." });
      continue;
    }
    mengen.set(p.slug, Math.min(5000, (mengen.get(p.slug) ?? 0) + menge));
  }
  const anzahlBoxen = [...mengen.values()].reduce((s, m) => s + m, 0);
  if (anzahlBoxen < e.mindestmenge) {
    fehler.push({
      feld: "positionen",
      text: anzahlBoxen === 0 ? "Bitte wählen Sie mindestens eine Box." : `Die Mindestbestellmenge sind ${e.mindestmenge} Boxen – es fehlen noch ${e.mindestmenge - anzahlBoxen}.`,
    });
  }

  const staffelProzent = staffelFuer(anzahlBoxen, e.staffeln);
  const zeilen: AngebotZeile[] = [...mengen.entries()].map(([slug, menge]) => {
    const box = nachSlug.get(slug)!;
    const stueckpreisCent = Math.round(box.preisCent * (1 - staffelProzent / 100));
    return { slug, name: box.name, menge, listenpreisCent: box.preisCent, stueckpreisCent, summeCent: stueckpreisCent * menge };
  });
  const listenSummeCent = zeilen.reduce((s, z) => s + z.listenpreisCent * z.menge, 0);
  const warenCent = zeilen.reduce((s, z) => s + z.summeCent, 0);
  const staffelRabattCent = listenSummeCent - warenCent;

  const perso: Angebot["perso"] = (["handgeschrieben", "banderole", "namensanhaenger"] as const)
    .filter((id) => eingabe.perso[id] && anzahlBoxen > 0)
    .map((id) => ({
      id,
      name: PERSO_NAMEN[id],
      menge: anzahlBoxen,
      einzelCent: e.personalisierung[id].preisCent,
      summeCent: e.personalisierung[id].preisCent * anzahlBoxen,
      materialCent: e.personalisierung[id].materialCent * anzahlBoxen,
    }));
  const personalisierungCent = perso.reduce((s, p) => s + p.summeCent, 0);
  const persoMaterialCent = perso.reduce((s, p) => s + p.materialCent, 0);

  // Rabattcode: auf Waren + Personalisierung, nicht auf Versand
  const basis = warenCent + personalisierungCent;
  let rabattCodeCent = 0;
  if (eingabe.rabatt && basis > 0) {
    rabattCodeCent =
      eingabe.rabatt.art === "prozent"
        ? Math.round((basis * Math.min(100, Math.max(0, eingabe.rabatt.wert))) / 100)
        : Math.min(basis, Math.max(0, Math.round(eingabe.rabatt.wert)));
  }

  // Versand
  const einheitenFuer = (slug: string, menge: number): BoxEinheit[] => {
    const box = nachSlug.get(slug);
    if (!box) return [];
    return Array.from({ length: menge }, () => ({ gewichtGramm: box.gewichtGramm, platz: PLATZ[box.groesse] }));
  };
  let versand: Angebot["versand"];
  const art = eingabe.lieferung.art;
  if (art === "persoenlich") {
    const plz = eingabe.lieferung.plz ?? "";
    if (plz && !imLiefergebiet(plz, e.lieferung.plzPraefixe)) {
      fehler.push({ feld: "lieferung", text: `Die PLZ ${plz} liegt außerhalb unseres Liefergebiets. Bitte wählen Sie den Versand.` });
    }
    const frei = warenCent >= e.lieferung.freiAbCent;
    versand = {
      art,
      pakete: [],
      preisCent: anzahlBoxen > 0 && !frei ? e.lieferung.gebuehrCent : 0,
      kostenCent: 0,
      gewichtGramm: zeilen.reduce((s, z) => s + (nachSlug.get(z.slug)?.gewichtGramm ?? 0) * z.menge, 0),
      text: frei ? "Persönliche Lieferung – kostenlos" : "Persönliche Lieferung",
    };
  } else if (art === "mehrfach") {
    const empf = eingabe.lieferung.empfaenger ?? [];
    const jeBox = new Map<string, number>();
    for (const x of empf) jeBox.set(x.boxSlug, (jeBox.get(x.boxSlug) ?? 0) + x.menge);
    if (empf.length > 0) {
      for (const [slug, menge] of mengen) {
        const verteilt = jeBox.get(slug) ?? 0;
        if (verteilt !== menge) {
          fehler.push({
            feld: "empfaenger",
            text: `„${nachSlug.get(slug)!.name}“: ${menge} bestellt, aber ${verteilt} in der Empfängerliste. Bitte Menge oder Liste anpassen.`,
          });
        }
      }
      for (const slug of jeBox.keys()) {
        if (!mengen.has(slug)) fehler.push({ feld: "empfaenger", text: `Die Empfängerliste enthält eine Box („${slug}“), die nicht im Warenkorb liegt.` });
      }
    }
    const ergebnis = versandFuerAdressen(empf.map((x) => einheitenFuer(x.boxSlug, x.menge)), e.versand);
    versand = { art, ...ergebnis, text: `DHL-Versand an ${empf.length} ${empf.length === 1 ? "Empfänger" : "Empfänger"}` };
  } else {
    const alle = zeilen.flatMap((z) => einheitenFuer(z.slug, z.menge));
    const ergebnis = versandFuerAdressen([alle], e.versand);
    versand = { art, ...ergebnis, text: ergebnis.pakete.length === 1 ? "DHL-Versand (1 Paket)" : `DHL-Versand (${ergebnis.pakete.length} Pakete)` };
  }

  const naechste = [...e.staffeln].sort((a, b) => a.ab - b.ab).find((s) => s.ab > anzahlBoxen);
  return {
    zeilen,
    anzahlBoxen,
    staffelProzent,
    listenSummeCent,
    staffelRabattCent,
    warenCent,
    perso,
    personalisierungCent,
    persoMaterialCent,
    rabattCode: eingabe.rabatt?.code ?? null,
    rabattCodeCent,
    versand,
    summeCent: Math.max(0, basis - rabattCodeCent) + versand.preisCent,
    naechsteStaffel: naechste ? { ab: naechste.ab, prozent: naechste.prozent, fehlen: naechste.ab - anzahlBoxen } : null,
    enthaeltAlkohol: zeilen.some((z) => nachSlug.get(z.slug)?.alkohol),
    fehler,
  };
}
