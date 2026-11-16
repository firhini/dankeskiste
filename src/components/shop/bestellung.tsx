"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { csvVorlage, leseEmpfaengerCsv, type Empfaenger } from "@/lib/calc/csv";
import { datumLang, heuteBerlin, imLiefergebiet, lieferStatus, lieferTage, versandTermine } from "@/lib/calc/deadlines";
import { berechneAngebot, type KatalogBox, type Lieferart } from "@/lib/calc/quote";
import type { Einstellungen } from "@/lib/einstellungen";
import { euro, euroMinus } from "@/lib/geld";
import { leseKampagne } from "./kampagne";
import { Haken, Minus, Pfeil, Plus } from "./zeichen";

export interface BestellBoxInfo extends KatalogBox {
  kurz: string;
  kollektion: string;
  bild: string | null;
}

interface Adresse { name: string; firma: string; strasse: string; zusatz: string; plz: string; ort: string }
interface Firma { firma: string; ansprechpartner: string; email: string; telefon: string; strasse: string; zusatz: string; plz: string; ort: string }

interface Zustand {
  schritt: 1 | 2 | 3 | 4;
  mengen: Record<string, number>;
  perso: { handgeschrieben: boolean; banderole: boolean; namensanhaenger: boolean; bandfarbe: string; grusstext: string; logoUrl: string | null; logoName: string | null };
  lieferart: Lieferart;
  termin: string;
  adresse: Adresse;
  empfaenger: Empfaenger[];
  csvName: string;
  ohneAlkohol: boolean;
  volljaehrig: boolean;
  firma: Firma;
  rechnungWieLieferung: boolean;
  notiz: string;
  rabatt: { code: string; art: "prozent" | "betrag"; wert: number } | null;
  b2b: boolean;
  agb: boolean;
}

const SPEICHER = "dk-bestellung-v1";
const SCHRITTE = ["Boxen", "Personalisierung", "Lieferung", "Firma & Zahlung"] as const;

const leer = (bandfarbe: string): Zustand => ({
  schritt: 1,
  mengen: {},
  perso: { handgeschrieben: false, banderole: false, namensanhaenger: false, bandfarbe, grusstext: "", logoUrl: null, logoName: null },
  lieferart: "versand",
  termin: "",
  adresse: { name: "", firma: "", strasse: "", zusatz: "", plz: "", ort: "" },
  empfaenger: [],
  csvName: "",
  ohneAlkohol: false,
  volljaehrig: false,
  firma: { firma: "", ansprechpartner: "", email: "", telefon: "", strasse: "", zusatz: "", plz: "", ort: "" },
  rechnungWieLieferung: true,
  notiz: "",
  rabatt: null,
  b2b: false,
  agb: false,
});

function Feld({ id, label, wert, onChange, fehler, optional, ...rest }: { id: string; label: string; wert: string; onChange: (v: string) => void; fehler?: string; optional?: boolean } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  return (
    <div>
      <label htmlFor={id} className="feldname">
        {label} {optional ? <span className="font-normal">(optional)</span> : null}
      </label>
      <input id={id} value={wert} onChange={(e) => onChange(e.target.value)} className="feld" aria-invalid={fehler ? true : undefined} aria-describedby={fehler ? `${id}-fehler` : undefined} {...rest} />
      {fehler ? <p id={`${id}-fehler`} className="feldfehler">{fehler}</p> : null}
    </div>
  );
}

function Wahl({ name, wert, aktuell, onChange, titel, children, gesperrt }: { name: string; wert: string; aktuell: string; onChange: (v: string) => void; titel: string; children?: React.ReactNode; gesperrt?: boolean }) {
  const aktiv = wert === aktuell;
  return (
    <label className={`block rounded-[2px] border p-4 ${aktiv ? "border-dunkel" : "border-salbei"} ${gesperrt ? "opacity-70" : "cursor-pointer hover:border-oliv"}`}>
      <span className="flex items-start gap-3">
        <input type="radio" name={name} value={wert} checked={aktiv} disabled={gesperrt} onChange={() => onChange(wert)} className="mt-1 h-5 w-5 shrink-0 accent-[#455230]" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{titel}</span>
          {children ? <span className="klein mt-1 block">{children}</span> : null}
        </span>
      </span>
    </label>
  );
}

export function Bestellung({ boxen, e, startBox }: { boxen: BestellBoxInfo[]; e: Einstellungen; startBox?: string }) {
  const [z, setZ] = useState<Zustand>(() => leer(e.personalisierung.bandfarben[0].id));
  const [geladen, setGeladen] = useState(false);
  const [heute, setHeute] = useState<string | null>(null);
  const [fehler, setFehler] = useState<Record<string, string>>({});
  const [csvFehler, setCsvFehler] = useState<{ zeile: number; text: string }[]>([]);
  const [meldungen, setMeldungen] = useState<string[]>([]);
  const [sendet, setSendet] = useState(false);
  const [logoStatus, setLogoStatus] = useState<{ laeuft?: boolean; fehler?: string }>({});
  const [codeEingabe, setCodeEingabe] = useState("");
  const [codeStatus, setCodeStatus] = useState<{ laeuft?: boolean; fehler?: string }>({});
  const [abgebrochen, setAbgebrochen] = useState(false);
  const titelRef = useRef<HTMLHeadingElement>(null);
  const ersterLauf = useRef(true);

  // Zustand aus der Sitzung holen (Warenkorb – nur für diese Bestellung nötig) und URL-Parameter lesen
  useEffect(() => {
    let start = leer(e.personalisierung.bandfarben[0].id);
    try {
      const roh = window.sessionStorage.getItem(SPEICHER);
      if (roh) start = { ...start, ...JSON.parse(roh) };
    } catch {}
    const gueltig = new Set(boxen.map((b) => b.slug));
    start.mengen = Object.fromEntries(Object.entries(start.mengen).filter(([slug, n]) => gueltig.has(slug) && Number(n) > 0));
    const q = new URLSearchParams(window.location.search);
    const wunsch = q.get("box") ?? startBox;
    if (wunsch && gueltig.has(wunsch) && !start.mengen[wunsch]) {
      start.mengen = { ...start.mengen, [wunsch]: Object.keys(start.mengen).length ? 1 : e.mindestmenge };
      start.schritt = 1;
    }
    /* eslint-disable react-hooks/set-state-in-effect -- einmaliges Laden nach der Hydration */
    if (q.get("abgebrochen")) setAbgebrochen(true);
    setZ(start);
    setHeute(heuteBerlin());
    setGeladen(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!geladen) return;
    try {
      window.sessionStorage.setItem(SPEICHER, JSON.stringify(z));
    } catch {}
  }, [z, geladen]);

  useEffect(() => {
    if (ersterLauf.current) {
      ersterLauf.current = false;
      return;
    }
    titelRef.current?.focus();
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [z.schritt]);

  const setze = (teil: Partial<Zustand>) => setZ((alt) => ({ ...alt, ...teil }));
  const positionen = useMemo(() => Object.entries(z.mengen).filter(([, n]) => n > 0).map(([slug, menge]) => ({ slug, menge })), [z.mengen]);
  const gewaehlt = boxen.filter((b) => (z.mengen[b.slug] ?? 0) > 0);

  const angebot = useMemo(
    () =>
      berechneAngebot(
        {
          positionen,
          perso: z.perso,
          lieferung: { art: z.lieferart, plz: z.lieferart === "persoenlich" ? z.adresse.plz : undefined, empfaenger: z.empfaenger.map((x) => ({ boxSlug: x.boxSlug, menge: x.menge })) },
          rabatt: z.rabatt,
        },
        boxen,
        e,
      ),
    [positionen, z.perso, z.lieferart, z.adresse.plz, z.empfaenger, z.rabatt, boxen, e],
  );

  const tag = heute ?? "2000-01-01";
  const vStatus = lieferStatus("versand", tag, e.fristen);
  const pStatus = lieferStatus("persoenlich", tag, e.fristen);
  const vTermine = heute ? versandTermine(heute, e.fristen) : [];
  const pTage = heute ? lieferTage(heute, e.fristen, 18) : [];
  const termine = z.lieferart === "persoenlich" ? pTage : vTermine;
  const terminOk = termine.some((t) => t.id === z.termin);
  const imGebiet = imLiefergebiet(z.adresse.plz, e.lieferung.plzPraefixe);
  const alleGesperrt = heute != null && !vStatus.verfuegbar && !pStatus.verfuegbar;

  // Termin automatisch passend setzen
  useEffect(() => {
    if (!heute || terminOk || termine.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Vorgabe folgt der gewählten Lieferart
    setZ((alt) => ({ ...alt, termin: (termine.find((t) => t.saison) ?? termine[0]).id }));
  }, [heute, terminOk, termine]);

  // Lieferart wechseln, falls die gewählte gesperrt ist
  useEffect(() => {
    if (!heute) return;
    const versandWeg = !vStatus.verfuegbar && z.lieferart !== "persoenlich";
    const persWeg = !pStatus.verfuegbar && z.lieferart === "persoenlich";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Korrektur nach Fristablauf
    if (versandWeg && pStatus.verfuegbar) setZ((alt) => ({ ...alt, lieferart: "persoenlich" }));
    else if (persWeg && vStatus.verfuegbar) setZ((alt) => ({ ...alt, lieferart: "versand" }));
  }, [heute, vStatus.verfuegbar, pStatus.verfuegbar, z.lieferart]);

  const menge = (slug: string, n: number) => setZ((alt) => ({ ...alt, mengen: { ...alt.mengen, [slug]: Math.max(0, Math.min(999, Math.floor(n) || 0)) } }));

  async function ladeLogo(datei: File | undefined) {
    if (!datei) return;
    setLogoStatus({});
    if (datei.size > 5 * 1024 * 1024) return setLogoStatus({ fehler: "Die Datei ist größer als 5 MB. Bitte laden Sie eine kleinere Version hoch." });
    setLogoStatus({ laeuft: true });
    try {
      const f = new FormData();
      f.set("datei", datei);
      const antwort = await fetch("/api/upload/logo", { method: "POST", body: f });
      const daten = await antwort.json().catch(() => ({}));
      if (!antwort.ok) return setLogoStatus({ fehler: daten.fehler ?? "Der Upload hat nicht geklappt. Bitte versuchen Sie es noch einmal." });
      setZ((alt) => ({ ...alt, perso: { ...alt.perso, logoUrl: daten.url, logoName: daten.name } }));
      setLogoStatus({});
    } catch {
      setLogoStatus({ fehler: "Keine Verbindung. Bitte versuchen Sie es noch einmal." });
    }
  }

  async function ladeCsv(datei: File | undefined) {
    if (!datei) return;
    if (datei.size > 512 * 1024) {
      setCsvFehler([{ zeile: 0, text: "Die Datei ist größer als 500 KB. Bitte speichern Sie die Liste als einfache CSV-Datei." }]);
      return;
    }
    const text = await datei.text();
    const ergebnis = leseEmpfaengerCsv(text, gewaehlt.map((b) => ({ slug: b.slug, name: b.name })));
    setCsvFehler(ergebnis.fehler);
    setze({ empfaenger: ergebnis.empfaenger, csvName: ergebnis.fehler.length ? "" : datei.name });
  }

  function vorlageLaden() {
    const blob = new Blob(["﻿" + csvVorlage(gewaehlt.map((b) => b.slug))], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dankeskiste-empfaenger-vorlage.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function codeEinloesen() {
    const code = codeEingabe.trim();
    if (!code) return;
    setCodeStatus({ laeuft: true });
    try {
      const antwort = await fetch("/api/rabattcode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const daten = await antwort.json().catch(() => ({}));
      if (!antwort.ok) {
        setze({ rabatt: null });
        return setCodeStatus({ fehler: daten.fehler ?? "Diesen Code kennen wir nicht." });
      }
      setze({ rabatt: { code: daten.code, art: daten.art, wert: daten.wert } });
      setCodeEingabe("");
      setCodeStatus({});
    } catch {
      setCodeStatus({ fehler: "Keine Verbindung. Bitte versuchen Sie es noch einmal." });
    }
  }

  function pruefe(schritt: number): Record<string, string> {
    const f: Record<string, string> = {};
    if (schritt === 1) {
      const pos = angebot.fehler.find((x) => x.feld === "positionen");
      if (pos) f.positionen = pos.text;
    }
    if (schritt === 2 && z.perso.grusstext.length > e.personalisierung.grusstextMaxZeichen) f.grusstext = `Bitte kürzen Sie den Text auf ${e.personalisierung.grusstextMaxZeichen} Zeichen.`;
    if (schritt === 3) {
      const gesperrt = z.lieferart === "persoenlich" ? !pStatus.verfuegbar : !vStatus.verfuegbar;
      if (gesperrt) f.lieferart = "Für diese Lieferart ist der Bestellschluss vorbei. Bitte wählen Sie eine andere oder schreiben Sie uns.";
      if (z.lieferart === "mehrfach") {
        if (z.empfaenger.length === 0) f.csv = "Bitte laden Sie die Empfängerliste hoch.";
        const e2 = angebot.fehler.filter((x) => x.feld === "empfaenger");
        if (e2.length) f.csv = e2.map((x) => x.text).join(" ");
      } else {
        if (!z.adresse.firma.trim()) f.lFirma = "Bitte geben Sie die Firma an, an die geliefert wird.";
        if (!z.adresse.strasse.trim()) f.lStrasse = "Straße und Hausnummer fehlen.";
        else if (!/\d/.test(z.adresse.strasse)) f.lStrasse = "Bitte ergänzen Sie die Hausnummer.";
        if (!/^\d{5}$/.test(z.adresse.plz.trim())) f.lPlz = "Die PLZ braucht fünf Ziffern.";
        else if (z.lieferart === "persoenlich" && !imGebiet) f.lPlz = `Die PLZ ${z.adresse.plz} liegt außerhalb unseres Liefergebiets. Bitte wählen Sie den Versand.`;
        if (!z.adresse.ort.trim()) f.lOrt = "Der Ort fehlt.";
      }
      if (!terminOk && !gesperrt) f.termin = "Bitte wählen Sie einen Termin.";
      if (angebot.enthaeltAlkohol && z.lieferart !== "mehrfach" && !z.ohneAlkohol && !z.volljaehrig) f.alkohol = "Bitte bestätigen Sie die Volljährigkeit der Empfänger oder wählen Sie „ohne Alkohol“.";
    }
    if (schritt === 4) {
      const r = z.firma;
      if (!r.firma.trim()) f.firma = "Der Firmenname fehlt.";
      if (!r.ansprechpartner.trim()) f.ansprechpartner = "Bitte nennen Sie eine Ansprechperson.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(r.email.trim())) f.email = "Bitte geben Sie eine gültige E-Mail-Adresse an – dorthin kommen Bestätigung und Rechnung.";
      const wie = z.rechnungWieLieferung && z.lieferart !== "mehrfach";
      if (!wie) {
        if (!r.strasse.trim()) f.strasse = "Straße und Hausnummer fehlen.";
        if (!/^\d{5}$/.test(r.plz.trim())) f.plz = "Die PLZ braucht fünf Ziffern.";
        if (!r.ort.trim()) f.ort = "Der Ort fehlt.";
      }
      if (!z.b2b) f.b2b = "Bitte bestätigen Sie, dass Sie als Unternehmer bestellen.";
      if (!z.agb) f.agb = "Bitte akzeptieren Sie die AGB.";
    }
    return f;
  }

  // Behobene Fehler sofort ausblenden (neue Fehler erscheinen erst beim nächsten „Weiter“)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fehleranzeige folgt den Eingaben
    setFehler((alt) => {
      const schluessel = Object.keys(alt);
      if (schluessel.length === 0) return alt;
      const aktuell = pruefe(z.schritt);
      const rest = Object.fromEntries(schluessel.filter((k) => k in aktuell).map((k) => [k, aktuell[k]]));
      return schluessel.length === Object.keys(rest).length && schluessel.every((k) => rest[k] === alt[k]) ? alt : rest;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [z, angebot]);

  function weiter() {
    const f = pruefe(z.schritt);
    setFehler(f);
    setMeldungen([]);
    if (Object.keys(f).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true'], [data-fehler='true']")?.focus());
      return;
    }
    if (z.schritt < 4) {
      const naechster = (z.schritt + 1) as Zustand["schritt"];
      // Firmenname aus Schritt 4 vorbelegen bzw. Lieferfirma übernehmen
      setZ((alt) => ({ ...alt, schritt: naechster, firma: naechster === 4 && !alt.firma.firma && alt.adresse.firma ? { ...alt.firma, firma: alt.adresse.firma } : alt.firma }));
    } else bestellen();
  }

  async function bestellen() {
    for (const s of [1, 2, 3] as const) {
      const f = pruefe(s);
      if (Object.keys(f).length) {
        setFehler(f);
        setze({ schritt: s });
        return;
      }
    }
    setSendet(true);
    setMeldungen([]);
    const wie = z.rechnungWieLieferung && z.lieferart !== "mehrfach";
    const firma = wie ? { ...z.firma, strasse: z.adresse.strasse, zusatz: z.adresse.zusatz, plz: z.adresse.plz, ort: z.adresse.ort } : z.firma;
    const k = leseKampagne();
    try {
      const antwort = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionen,
          perso: z.perso,
          lieferung: {
            art: z.lieferart,
            termin: z.termin,
            ...(z.lieferart === "mehrfach" ? { empfaenger: z.empfaenger } : { adresse: z.adresse }),
          },
          ohneAlkohol: z.ohneAlkohol,
          volljaehrig: z.volljaehrig,
          firma,
          notiz: z.notiz,
          rabattCode: z.rabatt?.code,
          b2b: z.b2b,
          agb: z.agb,
          kampagne: k.kampagne,
          utm: k.utm,
        }),
      });
      const daten = await antwort.json().catch(() => ({}));
      if (antwort.ok && daten.url) {
        try {
          window.sessionStorage.setItem(SPEICHER, JSON.stringify({ ...z, schritt: 4 }));
        } catch {}
        window.location.assign(daten.url);
        return;
      }
      setMeldungen(daten.meldungen ?? [daten.fehler ?? "Die Bestellung konnte nicht angelegt werden. Bitte versuchen Sie es noch einmal."]);
    } catch {
      setMeldungen(["Keine Verbindung. Bitte prüfen Sie Ihr Netz und versuchen Sie es noch einmal."]);
    }
    setSendet(false);
  }

  const kollektionen = [...new Set(boxen.map((b) => b.kollektion))];
  const p = e.personalisierung;
  const hinweisMenge = angebot.anzahlBoxen < e.mindestmenge ? `Noch ${e.mindestmenge - angebot.anzahlBoxen} bis zur Mindestmenge von ${e.mindestmenge} Boxen` : angebot.naechsteStaffel ? `Noch ${angebot.naechsteStaffel.fehlen} ${angebot.naechsteStaffel.fehlen === 1 ? "Box" : "Boxen"} bis ${String(angebot.naechsteStaffel.prozent).replace(".", ",")} % Mengenrabatt` : "Höchste Rabattstufe erreicht";

  const zusammenfassung = (kompakt: boolean) => (
    <div className={kompakt ? "" : "rounded-[2px] border border-salbei p-5"}>
      {!kompakt ? <h2 className="label mb-4 !font-sans text-dunkel">Ihre Bestellung</h2> : null}
      {angebot.zeilen.length === 0 ? (
        <p className="klein">Noch keine Box gewählt.</p>
      ) : (
        <ul className="klein space-y-2.5">
          {angebot.zeilen.map((x) => (
            <li key={x.slug} className="flex justify-between gap-4">
              <span><span className="zahl">{x.menge}&nbsp;×</span> {x.name}{angebot.staffelProzent > 0 ? <span className="block text-dunkel">je {euro(x.stueckpreisCent, { immerCent: true })} statt {euro(x.listenpreisCent, { immerCent: true })}</span> : null}</span>
              <span className="zahl whitespace-nowrap">{euro(x.summeCent, { immerCent: true })}</span>
            </li>
          ))}
        </ul>
      )}
      <dl className="klein mt-4 space-y-2 border-t border-salbei pt-4">
        {angebot.staffelRabattCent > 0 ? (
          <div className="flex justify-between gap-4 text-dunkel">
            <dt>darin Mengenrabatt {String(angebot.staffelProzent).replace(".", ",")}&nbsp;%</dt>
            <dd className="zahl whitespace-nowrap text-rot">{euroMinus(angebot.staffelRabattCent)}</dd>
          </div>
        ) : null}
        {angebot.perso.map((x) => (
          <div key={x.id} className="flex justify-between gap-4">
            <dt>{x.menge}&nbsp;× {x.name}</dt>
            <dd className="zahl whitespace-nowrap">{euro(x.summeCent, { immerCent: true })}</dd>
          </div>
        ))}
        {angebot.rabattCodeCent > 0 ? (
          <div className="flex justify-between gap-4">
            <dt>Rabattcode {angebot.rabattCode}</dt>
            <dd className="zahl whitespace-nowrap text-rot">{euroMinus(angebot.rabattCodeCent)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt>{z.lieferart === "mehrfach" && z.empfaenger.length === 0 ? "Versand (nach Upload der Empfängerliste)" : angebot.versand.text}</dt>
          <dd className="zahl whitespace-nowrap">{z.lieferart === "mehrfach" && z.empfaenger.length === 0 ? "–" : angebot.versand.preisCent === 0 && angebot.anzahlBoxen > 0 ? "kostenlos" : euro(angebot.versand.preisCent, { immerCent: true })}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-ink pt-3">
          <dt className="font-semibold">Gesamt</dt>
          <dd className="zahl whitespace-nowrap font-serif text-[1.75rem] leading-none" data-testid="summe">{euro(angebot.summeCent, { immerCent: true })}</dd>
        </div>
      </dl>
      <p className="klein mt-3 text-dunkel">Gemäß §&nbsp;19 UStG wird keine Umsatzsteuer berechnet.</p>
      {!kompakt && angebot.anzahlBoxen > 0 ? <p className="klein mt-3 border-l-2 border-salbei pl-3">{hinweisMenge}</p> : null}
    </div>
  );

  // Das Formular erscheint erst, wenn der gespeicherte Warenkorb geladen ist. So kann niemand
  // tippen, bevor die Seite bereit ist (Eingaben während der Hydration gingen sonst verloren).
  if (!geladen) {
    return (
      <div className="raster min-h-[70vh] gap-y-8" aria-busy="true" aria-label="Bestellung wird geladen">
        <div className="col-span-12 lg:col-span-7">
          <div className="grid grid-cols-4 gap-1.5">
            {SCHRITTE.map((name) => (
              <div key={name} className="border-t-2 border-salbei pt-2"><span className="klein text-dunkel">&nbsp;</span></div>
            ))}
          </div>
          <div className="mt-8 h-10 w-3/4 max-w-md bg-salbei/25" />
          <div className="mt-8 space-y-0 border-t border-salbei">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center justify-between border-b border-salbei py-3.5">
                <div className="h-11 w-2/5 bg-salbei/20" />
                <div className="h-11 w-36 border border-salbei" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (alleGesperrt) {
    return (
      <div className="mass border border-dunkel p-6">
        <h2 className="!text-[1.75rem] text-oliv">Der Bestellschluss für {e.fristen.saisonName.replace(/\s*\d{4}$/, "")} ist vorbei</h2>
        <p className="mt-4">Alle Kisten für dieses Jahr sind verplant. Ab dem {datumLang(e.fristen.wiederAb, true)} können Sie wieder ganz normal bestellen.</p>
        <p className="mt-3">Brauchen Sie dringend noch etwas? Schreiben Sie kurz – manchmal geht doch noch eine kleine Menge.</p>
        <Link href="/#anfrage" className="knopf mt-5">Anfrage schicken</Link>
      </div>
    );
  }

  return (
    <div className="raster gap-y-8 pb-28 lg:pb-0">
      <div className="col-span-12 lg:col-span-7">
        {/* Fortschritt */}
        <nav aria-label="Bestellschritte">
          <ol className="grid grid-cols-4 gap-1.5">
            {SCHRITTE.map((name, i) => {
              const nr = (i + 1) as Zustand["schritt"];
              const fertig = nr < z.schritt;
              const aktiv = nr === z.schritt;
              return (
                <li key={name}>
                  <button type="button" disabled={!fertig} onClick={() => fertig && setze({ schritt: nr })} aria-current={aktiv ? "step" : undefined} className={`block w-full border-t-2 pt-2 text-left ${aktiv ? "border-rot" : fertig ? "border-oliv" : "border-salbei"} ${fertig ? "cursor-pointer" : "cursor-default"}`}>
                    <span className={`zahl klein flex items-center gap-1.5 ${aktiv ? "font-semibold text-ink" : "text-dunkel"}`}>
                      {fertig ? <Haken className="h-3.5 w-3.5" /> : <span>{nr}</span>}
                      <span className={aktiv ? "" : "hidden sm:inline"}>{name}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {abgebrochen ? <p role="status" className="klein mt-6 border-l-2 border-dunkel pl-3">Die Zahlung wurde abgebrochen. Ihre Angaben sind noch da – Sie können einfach weitermachen.</p> : null}

        <h2 ref={titelRef} tabIndex={-1} className="ruhig mt-8 !text-[clamp(1.75rem,1.4rem+1.6vw,2.5rem)] text-oliv outline-none">
          {z.schritt === 1 ? <>Welche Boxen <em>und wie viele?</em></> : z.schritt === 2 ? <>Logo, Text <em>und Band</em></> : z.schritt === 3 ? <>Wohin <em>und wann?</em></> : <>Ihre Firma <em>und Zahlung</em></>}
        </h2>

        {/* ── Schritt 1 ── */}
        {z.schritt === 1 ? (
          <div className="mt-6">
            <p className="klein">Mindestens {e.mindestmenge}&nbsp;Boxen, beliebig gemischt. Preise je Box ohne Umsatzsteuer.</p>
            {kollektionen.map((k) => (
              <fieldset key={k} className="mt-8">
                <legend className="label mb-1 text-dunkel">{k}</legend>
                <ul className="border-t border-salbei">
                  {boxen.filter((b) => b.kollektion === k).map((b) => {
                    const n = z.mengen[b.slug] ?? 0;
                    return (
                      <li key={b.slug} className="flex items-center gap-3 border-b border-salbei py-3.5 sm:gap-4">
                        {b.bild ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={b.bild} alt="" width={72} height={54} loading="lazy" className="hidden h-[54px] w-[72px] shrink-0 rounded-[2px] object-cover xs:block" />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold leading-snug">
                            <Link href={`/boxen/${b.slug}`} className="no-underline hover:underline">{b.name}</Link>
                          </p>
                          <p className="klein zahl text-dunkel">{euro(b.preisCent)}{b.alkohol ? " · auch ohne Alkohol" : ""}</p>
                        </div>
                        <div className="flex shrink-0 items-center" role="group" aria-label={`Menge ${b.name}`}>
                          <button type="button" onClick={() => menge(b.slug, n - 1)} disabled={n === 0} aria-label={`${b.name}: Menge verringern`} className="flex h-11 w-11 items-center justify-center rounded-l-[2px] border border-salbei disabled:opacity-40">
                            <Minus />
                          </button>
                          <label className="nur-sr" htmlFor={`m-${b.slug}`}>Anzahl {b.name}</label>
                          <input id={`m-${b.slug}`} inputMode="numeric" pattern="[0-9]*" value={n === 0 ? "" : n} placeholder="0" onChange={(ev) => menge(b.slug, Number(ev.target.value.replace(/\D/g, "")))} className="zahl h-11 w-14 border-y border-salbei bg-transparent text-center font-semibold" />
                          <button type="button" onClick={() => menge(b.slug, n + 1)} aria-label={`${b.name}: Menge erhöhen`} className="flex h-11 w-11 items-center justify-center rounded-r-[2px] border border-salbei">
                            <Plus />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            ))}
            {fehler.positionen ? <p className="feldfehler mt-4" role="alert" data-fehler="true" tabIndex={-1}>{fehler.positionen}</p> : null}
          </div>
        ) : null}

        {/* ── Schritt 2 ── */}
        {z.schritt === 2 ? (
          <div className="mt-6 space-y-9">
            <div>
              <h3 className="!font-sans !text-[1.0625rem] !font-semibold">Ihr Logo <span className="klein font-normal">– inklusive</span></h3>
              <p className="klein mt-1">Kommt als runder Sticker (5&nbsp;cm) auf jeden Deckel. PNG, JPG, SVG oder PDF, höchstens 5&nbsp;MB. Sie können das Logo auch später per Mail schicken.</p>
              {z.perso.logoUrl ? (
                <p className="mt-3 flex flex-wrap items-center gap-3 border border-salbei p-3">
                  <Haken className="h-4 w-4 text-oliv" />
                  <span className="klein min-w-0 flex-1 break-all">{z.perso.logoName}</span>
                  <button type="button" className="textlink klein" onClick={() => setze({ perso: { ...z.perso, logoUrl: null, logoName: null } })}>Entfernen</button>
                </p>
              ) : (
                <div className="mt-3">
                  <label htmlFor="logo" className="knopf knopf-hell cursor-pointer">{logoStatus.laeuft ? "Lädt hoch …" : "Logo auswählen"}</label>
                  <input id="logo" type="file" accept=".png,.jpg,.jpeg,.svg,.pdf,image/png,image/jpeg,image/svg+xml,application/pdf" className="nur-sr" onChange={(ev) => ladeLogo(ev.target.files?.[0])} aria-describedby={logoStatus.fehler ? "logo-fehler" : undefined} />
                  {logoStatus.fehler ? <p id="logo-fehler" className="feldfehler" role="alert">{logoStatus.fehler}</p> : null}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="grusstext" className="!font-sans !text-[1.0625rem] font-semibold">Text für die Grußkarte <span className="klein font-normal">– inklusive</span></label>
              <p className="klein mt-1">Derselbe Text für alle Boxen. Bleibt das Feld leer, steht „Danke“ auf der Karte.</p>
              <textarea id="grusstext" rows={5} value={z.perso.grusstext} onChange={(ev) => setze({ perso: { ...z.perso, grusstext: ev.target.value } })} className="feld mt-3" aria-invalid={fehler.grusstext ? true : undefined} aria-describedby="grusstext-zaehler" placeholder="Liebes Team, danke für ein starkes Jahr …" />
              <p id="grusstext-zaehler" className={`klein zahl mt-1 text-right ${z.perso.grusstext.length > p.grusstextMaxZeichen ? "font-semibold" : "text-dunkel"}`}>{z.perso.grusstext.length} / {p.grusstextMaxZeichen}</p>
              {fehler.grusstext ? <p className="feldfehler" role="alert">{fehler.grusstext}</p> : null}
            </div>

            <fieldset>
              <legend className="!font-sans !text-[1.0625rem] font-semibold">Dazu, wenn Sie möchten</legend>
              <div className="mt-3 space-y-2.5">
                {([
                  ["handgeschrieben", "Karte von Hand geschrieben", "Jede Karte einzeln mit Fineliner."],
                  ["banderole", "Banderole mit Logo", "Papierstreifen um die Box, bedruckt mit Ihrem Logo."],
                  ["namensanhaenger", "Namensanhänger je Empfänger", "Namen aus der Empfängerliste oder aus Ihrer Notiz im letzten Schritt."],
                ] as const).map(([id, titel, text]) => (
                  <label key={id} className={`flex cursor-pointer items-start gap-3 rounded-[2px] border p-4 hover:border-oliv ${z.perso[id] ? "border-dunkel" : "border-salbei"}`}>
                    <input type="checkbox" checked={z.perso[id]} onChange={(ev) => setze({ perso: { ...z.perso, [id]: ev.target.checked } })} className="mt-0.5 h-5 w-5 shrink-0 accent-[#455230]" />
                    <span className="flex-1">
                      <span className="flex justify-between gap-3 font-semibold">{titel} <span className="zahl whitespace-nowrap">+ {euro(p[id].preisCent, { immerCent: true })}</span></span>
                      <span className="klein block">{text} Preis je Box.</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="!font-sans !text-[1.0625rem] font-semibold">Bandfarbe <span className="klein font-normal">– inklusive</span></legend>
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {p.bandfarben.map((b) => (
                  <label key={b.id} className={`flex cursor-pointer items-center gap-2.5 rounded-[2px] border p-3 hover:border-oliv ${z.perso.bandfarbe === b.id ? "border-dunkel" : "border-salbei"}`}>
                    <input type="radio" name="bandfarbe" value={b.id} checked={z.perso.bandfarbe === b.id} onChange={() => setze({ perso: { ...z.perso, bandfarbe: b.id } })} className="nur-sr" />
                    <span className="h-6 w-6 shrink-0 rounded-full border border-ink/30" style={{ background: b.hex }} aria-hidden />
                    <span className="klein">{b.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        {/* ── Schritt 3 ── */}
        {z.schritt === 3 ? (
          <div className="mt-6 space-y-8">
            <fieldset>
              <legend className="nur-sr">Lieferart</legend>
              <div className="space-y-2.5">
                <Wahl name="lieferart" wert="versand" aktuell={z.lieferart} onChange={(v) => setze({ lieferart: v as Lieferart })} titel="DHL-Versand an eine Adresse" gesperrt={!vStatus.verfuegbar}>
                  {vStatus.verfuegbar ? "Alle Boxen zusammen an Ihre Firma. Versandkosten nach Gewicht." : `Bestellschluss war am ${datumLang(e.fristen.versand.bestellschluss)}. Wieder ab ${datumLang(e.fristen.wiederAb)}.`}
                </Wahl>
                <Wahl name="lieferart" wert="mehrfach" aktuell={z.lieferart} onChange={(v) => setze({ lieferart: v as Lieferart })} titel="DHL-Versand an mehrere Empfänger" gesperrt={!vStatus.verfuegbar}>
                  {vStatus.verfuegbar ? "Jede Box einzeln, zum Beispiel ins Homeoffice. Sie laden eine Empfängerliste hoch; Versandkosten je Adresse." : `Bestellschluss war am ${datumLang(e.fristen.versand.bestellschluss)}.`}
                </Wahl>
                <Wahl name="lieferart" wert="persoenlich" aktuell={z.lieferart} onChange={(v) => setze({ lieferart: v as Lieferart })} titel="Persönliche Lieferung in der Region" gesperrt={!pStatus.verfuegbar}>
                  {pStatus.verfuegbar ? `Schwetzingen, Mannheim, Heidelberg und Umgebung. ${euro(e.lieferung.gebuehrCent, { immerCent: true })}, ab ${euro(e.lieferung.freiAbCent)} Warenwert kostenlos.` : `Bestellschluss war am ${datumLang(e.fristen.persoenlich.bestellschluss)}. Wieder ab ${datumLang(e.fristen.wiederAb)}.`}
                </Wahl>
              </div>
              {fehler.lieferart ? <p className="feldfehler" role="alert" data-fehler="true" tabIndex={-1}>{fehler.lieferart} <Link href="/#anfrage" className="textlink">Zum Anfrageformular</Link></p> : null}
              {!vStatus.verfuegbar || !pStatus.verfuegbar ? <p className="klein mt-3">Bestellschluss verpasst? <Link href="/#anfrage" className="textlink">Schreiben Sie uns</Link> – wir schauen, was noch geht.</p> : null}
            </fieldset>

            {z.lieferart === "mehrfach" ? (
              <div>
                <h3 className="!font-sans !text-[1.0625rem] !font-semibold">Empfängerliste</h3>
                <p className="klein mt-1">Eine CSV-Datei mit den Spalten Name, Firma, Straße und Hausnummer, Adresszusatz, PLZ, Ort, Box, Menge. {gewaehlt.length > 1 ? "In der Spalte „Box“ steht, wer welche Box bekommt." : "Die Spalte „Box“ darf leer bleiben."} Excel: „Speichern unter → CSV UTF-8“.</p>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  <label htmlFor="csv" className="knopf knopf-hell cursor-pointer">{z.empfaenger.length ? "Andere Liste hochladen" : "Liste hochladen"}</label>
                  <input id="csv" type="file" accept=".csv,text/csv,text/plain" className="nur-sr" onChange={(ev) => { ladeCsv(ev.target.files?.[0]); ev.target.value = ""; }} aria-describedby={fehler.csv || csvFehler.length ? "csv-fehler" : undefined} />
                  <button type="button" className="textlink" onClick={vorlageLaden}>Vorlage herunterladen</button>
                </div>
                {csvFehler.length ? (
                  <div id="csv-fehler" role="alert" className="feldfehler">
                    <p>Die Liste konnte nicht übernommen werden:</p>
                    <ul className="mt-1 list-disc pl-5 font-normal">
                      {csvFehler.slice(0, 12).map((x, i) => <li key={i}>{x.zeile ? `Zeile ${x.zeile}: ` : ""}{x.text}</li>)}
                      {csvFehler.length > 12 ? <li>… und {csvFehler.length - 12} weitere</li> : null}
                    </ul>
                  </div>
                ) : null}
                {z.empfaenger.length ? (
                  <div className="mt-4 border border-salbei">
                    <p className="klein border-b border-salbei px-4 py-2.5"><strong>{z.empfaenger.length} Empfänger</strong> aus {z.csvName || "Ihrer Liste"} · {z.empfaenger.reduce((s, x) => s + x.menge, 0)} Boxen</p>
                    <ul className="klein max-h-56 overflow-y-auto px-4 py-2">
                      {z.empfaenger.map((x, i) => (
                        <li key={i} className="flex justify-between gap-3 border-b border-salbei/50 py-1.5 last:border-0">
                          <span className="min-w-0 truncate">{x.name}, {x.plz} {x.ort}</span>
                          <span className="whitespace-nowrap text-dunkel">{x.menge > 1 ? `${x.menge} × ` : ""}{boxen.find((b) => b.slug === x.boxSlug)?.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {fehler.csv ? <p className="feldfehler" role="alert" data-fehler="true" tabIndex={-1}>{fehler.csv}</p> : null}
                {gewaehlt.length === 1 && z.empfaenger.length > 0 && z.empfaenger.reduce((s, x) => s + x.menge, 0) !== angebot.anzahlBoxen ? (
                  <button type="button" className="textlink klein mt-2" onClick={() => { setze({ mengen: { [gewaehlt[0].slug]: z.empfaenger.reduce((s, x) => s + x.menge, 0) } }); setFehler({}); }}>
                    Menge im Warenkorb an die Liste anpassen ({z.empfaenger.reduce((s, x) => s + x.menge, 0)} Boxen)
                  </button>
                ) : null}
                {angebot.enthaeltAlkohol ? <p className="klein mt-4 border-l-2 border-dunkel pl-3">Beim Versand an mehrere Empfänger packen wir alle Boxen <strong>ohne Alkohol</strong> – Wein und Sekt werden durch ein alkoholfreies Getränk ersetzt.</p> : null}
              </div>
            ) : (
              <div>
                <h3 className="!font-sans !text-[1.0625rem] !font-semibold">{z.lieferart === "persoenlich" ? "Wohin dürfen wir liefern?" : "Lieferadresse"}</h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Feld id="lFirma" label="Firma" wert={z.adresse.firma} onChange={(v) => setze({ adresse: { ...z.adresse, firma: v } })} fehler={fehler.lFirma} autoComplete="organization" /></div>
                  <div className="sm:col-span-2"><Feld id="lName" label="Zu Händen von" optional wert={z.adresse.name} onChange={(v) => setze({ adresse: { ...z.adresse, name: v } })} autoComplete="name" /></div>
                  <Feld id="lStrasse" label="Straße und Hausnummer" wert={z.adresse.strasse} onChange={(v) => setze({ adresse: { ...z.adresse, strasse: v } })} fehler={fehler.lStrasse} autoComplete="address-line1" />
                  <Feld id="lZusatz" label="Adresszusatz" optional wert={z.adresse.zusatz} onChange={(v) => setze({ adresse: { ...z.adresse, zusatz: v } })} autoComplete="address-line2" />
                  <div>
                    <Feld id="lPlz" label="PLZ" wert={z.adresse.plz} onChange={(v) => setze({ adresse: { ...z.adresse, plz: v.replace(/\D/g, "").slice(0, 5) } })} fehler={fehler.lPlz} inputMode="numeric" autoComplete="postal-code" />
                    {z.lieferart === "persoenlich" && /^\d{5}$/.test(z.adresse.plz) && !fehler.lPlz ? (
                      <p className="klein mt-1.5" role="status">{imGebiet ? <><Haken className="mr-1 inline h-3.5 w-3.5 text-oliv" />Liegt im Liefergebiet.</> : <strong>Außerhalb des Liefergebiets – bitte wählen Sie den Versand.</strong>}</p>
                    ) : null}
                  </div>
                  <Feld id="lOrt" label="Ort" wert={z.adresse.ort} onChange={(v) => setze({ adresse: { ...z.adresse, ort: v } })} fehler={fehler.lOrt} autoComplete="address-level2" />
                </div>
              </div>
            )}

            <fieldset>
              <legend className="!font-sans !text-[1.0625rem] font-semibold">{z.lieferart === "persoenlich" ? "Wunsch-Liefertag" : "Wann soll es ankommen?"}</legend>
              {termine.length === 0 ? (
                <p className="klein mt-2">{heute ? "Für diese Lieferart ist gerade kein Termin frei." : "Termine werden geladen …"}</p>
              ) : z.lieferart === "persoenlich" ? (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {termine.map((t) => (
                    <label key={t.id} className={`cursor-pointer rounded-[2px] border px-2 py-2.5 text-center hover:border-oliv ${z.termin === t.id ? "border-dunkel bg-dunkel text-creme" : t.saison ? "border-oliv" : "border-salbei"}`}>
                      <input type="radio" name="termin" value={t.id} checked={z.termin === t.id} onChange={() => setze({ termin: t.id })} className="nur-sr" />
                      <span className="zahl klein block font-semibold">{t.titel}</span>
                      {t.saison ? <span className="block text-[0.6875rem] leading-tight">vor dem Fest</span> : null}
                    </label>
                  ))}
                </div>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {termine.map((t) => (
                    <Wahl key={t.id} name="termin" wert={t.id} aktuell={z.termin} onChange={(v) => setze({ termin: v })} titel={t.titel}>{t.hinweis}</Wahl>
                  ))}
                </div>
              )}
              {fehler.termin ? <p className="feldfehler" role="alert" data-fehler="true" tabIndex={-1}>{fehler.termin}</p> : null}
            </fieldset>

            {angebot.enthaeltAlkohol && z.lieferart !== "mehrfach" ? (
              <fieldset>
                <legend className="!font-sans !text-[1.0625rem] font-semibold">Alkohol</legend>
                <p className="klein mt-1">{gewaehlt.filter((b) => b.alkohol).map((b) => b.name).join(", ")} {gewaehlt.filter((b) => b.alkohol).length === 1 ? "enthält" : "enthalten"} Wein oder Sekt.</p>
                <div className="mt-3 space-y-2.5">
                  <label className={`flex cursor-pointer items-start gap-3 rounded-[2px] border p-4 hover:border-oliv ${z.ohneAlkohol ? "border-dunkel" : "border-salbei"}`}>
                    <input type="checkbox" checked={z.ohneAlkohol} onChange={(ev) => setze({ ohneAlkohol: ev.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-[#455230]" />
                    <span><span className="block font-semibold">Alle Boxen ohne Alkohol packen</span><span className="klein block">Wein und Sekt werden durch ein alkoholfreies Getränk ersetzt. Der Preis bleibt gleich.</span></span>
                  </label>
                  {!z.ohneAlkohol ? (
                    <label className="klein flex cursor-pointer items-start gap-3">
                      <input type="checkbox" checked={z.volljaehrig} onChange={(ev) => setze({ volljaehrig: ev.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-[#455230]" aria-invalid={fehler.alkohol ? true : undefined} />
                      <span>Ich bestätige, dass die Boxen mit Alkohol nur an volljährige Personen weitergegeben werden.</span>
                    </label>
                  ) : null}
                </div>
                {fehler.alkohol ? <p className="feldfehler" role="alert">{fehler.alkohol}</p> : null}
              </fieldset>
            ) : null}
          </div>
        ) : null}

        {/* ── Schritt 4 ── */}
        {z.schritt === 4 ? (
          <div className="mt-6 space-y-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Feld id="firma" label="Firma (so steht sie auf der Rechnung)" wert={z.firma.firma} onChange={(v) => setze({ firma: { ...z.firma, firma: v } })} fehler={fehler.firma} autoComplete="organization" /></div>
              <Feld id="ansprechpartner" label="Ansprechperson" wert={z.firma.ansprechpartner} onChange={(v) => setze({ firma: { ...z.firma, ansprechpartner: v } })} fehler={fehler.ansprechpartner} autoComplete="name" />
              <Feld id="telefon" label="Telefon" optional wert={z.firma.telefon} onChange={(v) => setze({ firma: { ...z.firma, telefon: v } })} type="tel" inputMode="tel" autoComplete="tel" />
              <div className="sm:col-span-2"><Feld id="email" label="E-Mail für Bestätigung und Rechnung" wert={z.firma.email} onChange={(v) => setze({ firma: { ...z.firma, email: v } })} fehler={fehler.email} type="email" inputMode="email" autoComplete="email" /></div>
            </div>

            {z.lieferart !== "mehrfach" ? (
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={z.rechnungWieLieferung} onChange={(ev) => setze({ rechnungWieLieferung: ev.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-[#455230]" />
                <span>Rechnungsadresse ist die Lieferadresse <span className="klein block text-dunkel">{z.adresse.strasse}, {z.adresse.plz} {z.adresse.ort}</span></span>
              </label>
            ) : null}
            {!(z.rechnungWieLieferung && z.lieferart !== "mehrfach") ? (
              <fieldset>
                <legend className="!font-sans !text-[1.0625rem] font-semibold">Rechnungsadresse</legend>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Feld id="strasse" label="Straße und Hausnummer" wert={z.firma.strasse} onChange={(v) => setze({ firma: { ...z.firma, strasse: v } })} fehler={fehler.strasse} autoComplete="address-line1" />
                  <Feld id="zusatz" label="Adresszusatz" optional wert={z.firma.zusatz} onChange={(v) => setze({ firma: { ...z.firma, zusatz: v } })} autoComplete="address-line2" />
                  <Feld id="plz" label="PLZ" wert={z.firma.plz} onChange={(v) => setze({ firma: { ...z.firma, plz: v.replace(/\D/g, "").slice(0, 5) } })} fehler={fehler.plz} inputMode="numeric" autoComplete="postal-code" />
                  <Feld id="ort" label="Ort" wert={z.firma.ort} onChange={(v) => setze({ firma: { ...z.firma, ort: v } })} fehler={fehler.ort} autoComplete="address-level2" />
                </div>
              </fieldset>
            ) : null}

            <div>
              <label htmlFor="notiz" className="feldname">Notiz an uns <span className="font-normal">(optional)</span></label>
              <textarea id="notiz" rows={3} value={z.notiz} onChange={(ev) => setze({ notiz: ev.target.value.slice(0, 1000) })} className="feld" placeholder="Unverträglichkeiten, Namen für die Anhänger, Anlieferzeiten …" />
            </div>

            <div>
              <label htmlFor="code" className="feldname">Rabattcode <span className="font-normal">(optional)</span></label>
              {z.rabatt ? (
                <p className="flex flex-wrap items-center gap-3 border border-salbei p-3">
                  <Haken className="h-4 w-4 text-oliv" />
                  <span className="klein flex-1"><strong className="zahl">{z.rabatt.code}</strong> – {z.rabatt.art === "prozent" ? `${z.rabatt.wert} % auf Boxen und Personalisierung` : `${euro(z.rabatt.wert)} Nachlass`}</span>
                  <button type="button" className="textlink klein" onClick={() => setze({ rabatt: null })}>Entfernen</button>
                </p>
              ) : (
                <div className="flex gap-2">
                  <input id="code" value={codeEingabe} onChange={(ev) => setCodeEingabe(ev.target.value.toUpperCase())} onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); codeEinloesen(); } }} className="feld uppercase" autoComplete="off" aria-describedby={codeStatus.fehler ? "code-fehler" : undefined} aria-invalid={codeStatus.fehler ? true : undefined} />
                  <button type="button" onClick={codeEinloesen} disabled={codeStatus.laeuft || !codeEingabe.trim()} className="knopf knopf-hell shrink-0">{codeStatus.laeuft ? "Prüft …" : "Einlösen"}</button>
                </div>
              )}
              {codeStatus.fehler ? <p id="code-fehler" className="feldfehler" role="alert">{codeStatus.fehler}</p> : null}
            </div>

            <div className="space-y-4 border-t border-salbei pt-6">
              <div>
                <label className="flex cursor-pointer items-start gap-3 rounded-[2px] border border-dunkel p-4">
                  <input type="checkbox" checked={z.b2b} onChange={(ev) => setze({ b2b: ev.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-[#455230]" aria-invalid={fehler.b2b ? true : undefined} aria-describedby={fehler.b2b ? "b2b-fehler" : undefined} />
                  <span><strong>Ich bestelle als Unternehmer</strong> im Sinne von §&nbsp;14 BGB – für ein Unternehmen, eine selbstständige Tätigkeit, einen Verein oder eine Behörde, nicht als Verbraucher.</span>
                </label>
                {fehler.b2b ? <p id="b2b-fehler" className="feldfehler" role="alert">{fehler.b2b}</p> : null}
              </div>
              <div>
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={z.agb} onChange={(ev) => setze({ agb: ev.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-[#455230]" aria-invalid={fehler.agb ? true : undefined} aria-describedby={fehler.agb ? "agb-fehler" : undefined} />
                  <span>Ich akzeptiere die <a href="/agb" target="_blank" rel="noopener" className="textlink">AGB</a> und habe die <a href="/datenschutz" target="_blank" rel="noopener" className="textlink">Datenschutzerklärung</a> gelesen.</span>
                </label>
                {fehler.agb ? <p id="agb-fehler" className="feldfehler" role="alert">{fehler.agb}</p> : null}
              </div>
            </div>
            <p className="klein">Im nächsten Schritt bezahlen Sie sicher bei unserem Zahlungsdienst Stripe. Die Rechnung kommt direkt danach per E-Mail.</p>
          </div>
        ) : null}

        {meldungen.length ? (
          <div role="alert" className="feldfehler mt-6">
            <ul className="space-y-1">{meldungen.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        ) : null}

        {/* Navigation Desktop */}
        <div className="mt-10 hidden items-center justify-between gap-4 border-t border-salbei pt-6 lg:flex">
          {z.schritt > 1 ? <button type="button" className="textlink" onClick={() => { setFehler({}); setze({ schritt: (z.schritt - 1) as Zustand["schritt"] }); }}>Zurück</button> : <span />}
          <button type="button" className="knopf" onClick={weiter} disabled={sendet}>
            {z.schritt === 4 ? (sendet ? "Einen Moment …" : `Jetzt bestellen und ${euro(angebot.summeCent, { immerCent: true })} bezahlen`) : <>Weiter: {SCHRITTE[z.schritt]} <Pfeil /></>}
          </button>
        </div>
      </div>

      {/* Zusammenfassung Desktop */}
      <aside className="col-span-12 hidden lg:col-span-4 lg:col-start-9 lg:block" aria-label="Zusammenfassung">
        <div className="sticky top-24">{zusammenfassung(false)}</div>
      </aside>

      {/* Leiste Mobil */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-salbei bg-creme lg:hidden">
        <details className="group">
          <summary className="flex items-center justify-between gap-3 px-5 pt-3">
            <span className="klein flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 transition-transform group-open:rotate-45" />
              <span>{angebot.anzahlBoxen} {angebot.anzahlBoxen === 1 ? "Box" : "Boxen"} · Details</span>
            </span>
            <span className="zahl font-serif text-[1.375rem] leading-none" aria-live="polite">{euro(angebot.summeCent, { immerCent: true })}</span>
          </summary>
          <div className="max-h-[55vh] overflow-y-auto border-t border-salbei px-5 py-4 mt-3">{zusammenfassung(true)}</div>
        </details>
        <div className="flex items-center gap-3 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5">
          {z.schritt > 1 ? <button type="button" className="knopf knopf-hell !px-4" onClick={() => { setFehler({}); setze({ schritt: (z.schritt - 1) as Zustand["schritt"] }); }} aria-label="Zurück">Zurück</button> : null}
          <button type="button" className="knopf min-w-0 flex-1" onClick={weiter} disabled={sendet}>
            {z.schritt === 4 ? (sendet ? "Einen Moment …" : "Jetzt bestellen und bezahlen") : <>Weiter <Pfeil /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
