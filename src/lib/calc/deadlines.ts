import type { Einstellungen } from "../einstellungen";

export type Fristen = Einstellungen["fristen"];
export type FristArt = "versand" | "persoenlich";

/** Heutiges Datum in Deutschland als JJJJ-MM-TT. */
export function heuteBerlin(jetzt: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(jetzt);
}

function alsDatum(iso: string): Date {
  const [j, m, t] = iso.split("-").map(Number);
  return new Date(Date.UTC(j, m - 1, t));
}
function alsIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function plusTage(iso: string, n: number): string {
  const d = alsDatum(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return alsIso(d);
}
export function wochentag(iso: string): number {
  return alsDatum(iso).getUTCDay(); // 0 = Sonntag
}

/** Feste gesetzliche Feiertage in Baden-Württemberg (bewegliche bitte über den Wunschtermin abstimmen). */
const FESTE_FEIERTAGE = ["01-01", "01-06", "05-01", "10-03", "11-01", "12-25", "12-26"];
export function istFeiertag(iso: string): boolean {
  return FESTE_FEIERTAGE.includes(iso.slice(5));
}
/** Montag–Freitag, kein fester Feiertag. */
export function istWerktag(iso: string): boolean {
  const w = wochentag(iso);
  return w >= 1 && w <= 5 && !istFeiertag(iso);
}
/** Liefertage für persönliche Lieferung: Montag–Samstag, kein Feiertag. */
export function istLiefertag(iso: string): boolean {
  return wochentag(iso) !== 0 && !istFeiertag(iso);
}
export function plusWerktage(iso: string, n: number): string {
  let d = iso;
  let rest = n;
  while (rest > 0) {
    d = plusTage(d, 1);
    if (istWerktag(d)) rest--;
  }
  return d;
}

const WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
/** „10. Dezember“ bzw. mit Jahr „10. Dezember 2026“ */
export function datumLang(iso: string, mitJahr = false): string {
  const [j, m, t] = iso.split("-").map(Number);
  return `${t}. ${MONATE[m - 1]}${mitJahr ? ` ${j}` : ""}`;
}
/** „Di., 15.12.“ */
export function datumKurz(iso: string): string {
  const [, m, t] = iso.split("-");
  return `${WOCHENTAGE[wochentag(iso)].slice(0, 2)}., ${t}.${m}.`;
}
export function datumZahl(iso: string): string {
  const [j, m, t] = iso.split("-");
  return `${t}.${m}.${j}`;
}
export function tageBis(von: string, bis: string): number {
  return Math.round((alsDatum(bis).getTime() - alsDatum(von).getTime()) / 86_400_000);
}

export type LieferStatus =
  | { verfuegbar: true; saison: boolean; bestellschluss: string | null }
  | { verfuegbar: false; bestellschluss: string; wiederAb: string };

/**
 * Bestellschluss je Lieferart: bis einschließlich Bestellschluss bestellbar (Saison),
 * danach bis `wiederAb` gesperrt, anschließend normaler Betrieb.
 */
export function lieferStatus(art: FristArt, heute: string, f: Fristen): LieferStatus {
  if (!f.aktiv) return { verfuegbar: true, saison: false, bestellschluss: null };
  const schluss = f[art].bestellschluss;
  if (heute <= schluss) return { verfuegbar: true, saison: true, bestellschluss: schluss };
  if (heute < f.wiederAb) return { verfuegbar: false, bestellschluss: schluss, wiederAb: f.wiederAb };
  return { verfuegbar: true, saison: false, bestellschluss: null };
}

export interface TerminOption {
  id: string;
  titel: string;
  hinweis: string;
  saison: boolean;
}

/** Wählbare Termine für den Versand: „schnell“ und – in der Saison – „zum Fest“. */
export function versandTermine(heute: string, f: Fristen): TerminOption[] {
  const status = lieferStatus("versand", heute, f);
  if (!status.verfuegbar) return [];
  const schnellBis = plusWerktage(heute, f.vorlaufVersandWerktage);
  const optionen: TerminOption[] = [];
  if (status.saison) {
    optionen.push({
      id: "saison",
      titel: `Zu ${f.saisonName.replace(/\s*\d{4}$/, "")}`,
      hinweis: `Zustellung bis ${datumLang(f.versand.lieferungBis)}`,
      saison: true,
    });
  }
  if (!status.saison || schnellBis <= f.versand.lieferungBis) {
    optionen.push({
      id: "schnell",
      titel: "So bald wie möglich",
      hinweis: `Versand bis ${datumLang(schnellBis)}`,
      saison: false,
    });
  }
  return optionen;
}

/** Wählbare Liefertage für die persönliche Lieferung (Montag–Samstag). */
export function lieferTage(heute: string, f: Fristen, anzahl = 24): TerminOption[] {
  const status = lieferStatus("persoenlich", heute, f);
  if (!status.verfuegbar) return [];
  const tage: TerminOption[] = [];
  let d = plusWerktage(heute, f.vorlaufPersoenlichWerktage);
  let schutz = 0;
  while (tage.length < anzahl && schutz++ < 200) {
    const imFenster = f.aktiv && d >= f.persoenlich.fensterVon && d <= f.persoenlich.fensterBis;
    const inRuhe = f.aktiv && d > f.persoenlich.fensterBis && d < f.wiederAb;
    if (istLiefertag(d) && !inRuhe) {
      tage.push({ id: d, titel: datumKurz(d), hinweis: imFenster ? f.saisonName.replace(/\s*\d{4}$/, "") : "", saison: imFenster });
    }
    d = plusTage(d, 1);
  }
  return tage;
}

export function terminGueltig(art: "versand" | "mehrfach" | "persoenlich", termin: string, heute: string, f: Fristen): boolean {
  if (art === "persoenlich") return lieferTage(heute, f, 60).some((t) => t.id === termin);
  return versandTermine(heute, f).some((t) => t.id === termin);
}

export function imLiefergebiet(plz: string, praefixe: string[]): boolean {
  const p = plz.trim();
  return /^\d{5}$/.test(p) && praefixe.some((x) => p.startsWith(x));
}
