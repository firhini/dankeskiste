export interface Empfaenger {
  name: string;
  firma: string;
  strasse: string;
  zusatz: string;
  plz: string;
  ort: string;
  boxSlug: string;
  menge: number;
}

export interface CsvErgebnis {
  empfaenger: Empfaenger[];
  fehler: { zeile: number; text: string }[];
}

export const CSV_MAX_ZEILEN = 500;
export const CSV_KOPF = "Name;Firma;Straße und Hausnummer;Adresszusatz;PLZ;Ort;Box;Menge";

export function csvVorlage(boxSlugs: string[]): string {
  const box = boxSlugs[0] ?? "weihnachtskiste";
  return [
    CSV_KOPF,
    `Maria Beispiel;;Musterweg 12;;68161;Mannheim;${box};1`,
    `Jonas Beispiel;Beispiel GmbH;Hauptstraße 5;3. OG;69117;Heidelberg;${box};1`,
  ].join("\r\n") + "\r\n";
}

function trenneZeile(zeile: string, trenner: string): string[] {
  const felder: string[] = [];
  let feld = "";
  let inQuote = false;
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i];
    if (inQuote) {
      if (c === '"' && zeile[i + 1] === '"') { feld += '"'; i++; }
      else if (c === '"') inQuote = false;
      else feld += c;
    } else if (c === '"') inQuote = true;
    else if (c === trenner) { felder.push(feld); feld = ""; }
    else feld += c;
  }
  felder.push(feld);
  return felder.map((f) => f.trim());
}

const SPALTEN: Record<keyof Empfaenger, RegExp> = {
  name: /^(name|empf[aä]nger|vor- und nachname|vorname nachname)$/i,
  firma: /^(firma|unternehmen|company)$/i,
  strasse: /^(stra(ss|ß)e.*|adresse|anschrift)$/i,
  zusatz: /^(adresszusatz|zusatz|c\/o)$/i,
  plz: /^(plz|postleitzahl)$/i,
  ort: /^(ort|stadt|wohnort)$/i,
  boxSlug: /^(box|kiste|produkt)$/i,
  menge: /^(menge|anzahl|st(ü|ue)ck)$/i,
};

/**
 * Liest eine Empfängerliste (CSV mit Kopfzeile; Trenner ; , oder Tab).
 * `boxen` sind die Boxen im Warenkorb: Die Spalte „Box“ darf Slug oder Name enthalten und
 * darf leer bleiben, wenn nur eine Box bestellt wird.
 */
export function leseEmpfaengerCsv(text: string, boxen: { slug: string; name: string }[]): CsvErgebnis {
  const fehler: CsvErgebnis["fehler"] = [];
  const zeilen = text.replace(/^﻿/, "").split(/\r\n|\n|\r/).filter((z) => z.trim() !== "");
  if (zeilen.length < 2) return { empfaenger: [], fehler: [{ zeile: 1, text: "Die Datei enthält keine Empfänger. Erwartet wird eine Kopfzeile und mindestens eine Zeile darunter." }] };
  const kopf = zeilen[0];
  const trenner = [";", "\t", ","].sort((a, b) => kopf.split(b).length - kopf.split(a).length)[0];
  const kopfFelder = trenneZeile(kopf, trenner);
  const index = {} as Record<keyof Empfaenger, number>;
  for (const schluessel of Object.keys(SPALTEN) as (keyof Empfaenger)[]) {
    index[schluessel] = kopfFelder.findIndex((k) => SPALTEN[schluessel].test(k));
  }
  for (const pflicht of ["name", "strasse", "plz", "ort"] as const) {
    if (index[pflicht] < 0) fehler.push({ zeile: 1, text: `Die Spalte „${{ name: "Name", strasse: "Straße und Hausnummer", plz: "PLZ", ort: "Ort" }[pflicht]}“ fehlt in der Kopfzeile.` });
  }
  if (fehler.length) return { empfaenger: [], fehler };
  if (zeilen.length - 1 > CSV_MAX_ZEILEN) {
    return { empfaenger: [], fehler: [{ zeile: 1, text: `Die Liste hat ${zeilen.length - 1} Zeilen; möglich sind höchstens ${CSV_MAX_ZEILEN}. Für größere Aktionen nutzen Sie bitte das Anfrageformular.` }] };
  }

  const boxNach = new Map<string, string>();
  for (const b of boxen) {
    boxNach.set(b.slug.toLowerCase(), b.slug);
    boxNach.set(b.name.toLowerCase(), b.slug);
  }
  const empfaenger: Empfaenger[] = [];
  zeilen.slice(1).forEach((zeile, i) => {
    const nr = i + 2;
    const f = trenneZeile(zeile, trenner);
    const hole = (k: keyof Empfaenger) => (index[k] >= 0 ? (f[index[k]] ?? "") : "").slice(0, 120);
    const name = hole("name");
    const strasse = hole("strasse");
    const plz = hole("plz").replace(/\s/g, "");
    const ort = hole("ort");
    const boxRoh = hole("boxSlug");
    const mengeRoh = hole("menge");
    const eigene: string[] = [];
    if (!name) eigene.push("Name fehlt");
    if (!strasse) eigene.push("Straße fehlt");
    else if (!/\d/.test(strasse)) eigene.push("Hausnummer fehlt");
    if (!/^\d{5}$/.test(plz)) eigene.push(plz ? `PLZ „${plz}“ hat keine fünf Ziffern` : "PLZ fehlt");
    if (!ort) eigene.push("Ort fehlt");
    let boxSlug = "";
    if (boxRoh) {
      boxSlug = boxNach.get(boxRoh.toLowerCase()) ?? "";
      if (!boxSlug) eigene.push(`Box „${boxRoh}“ ist nicht im Warenkorb`);
    } else if (boxen.length === 1) boxSlug = boxen[0].slug;
    else eigene.push("Spalte „Box“ ist leer (bei gemischten Bestellungen nötig)");
    let menge = 1;
    if (mengeRoh) {
      menge = Number(mengeRoh);
      if (!Number.isInteger(menge) || menge < 1 || menge > 20) eigene.push(`Menge „${mengeRoh}“ ist keine ganze Zahl von 1 bis 20`);
    }
    if (eigene.length) fehler.push({ zeile: nr, text: eigene.join(", ") });
    else empfaenger.push({ name, firma: hole("firma"), strasse, zusatz: hole("zusatz"), plz, ort, boxSlug, menge });
  });
  return { empfaenger: fehler.length ? [] : empfaenger, fehler };
}
