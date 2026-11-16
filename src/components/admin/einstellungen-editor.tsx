"use client";

import { useState, useTransition } from "react";
import { einstellungenSpeichern } from "@/app/admin/aktionen";
import type { Einstellungen } from "@/lib/einstellungen";

const feld = "feld !min-h-10 !py-2 !text-[0.9375rem]";

function Gruppe({ titel, hinweis, children }: { titel: string; hinweis?: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-[4px] border border-salbei p-4">
      <h2 className="label text-dunkel">{titel}</h2>
      {hinweis ? <p className="klein mt-1 max-w-[70ch] text-dunkel">{hinweis}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Euro({ id, label, cent, onChange }: { id: string; label: string; cent: number; onChange: (c: number) => void }) {
  const [text, setText] = useState((cent / 100).toFixed(2).replace(".", ","));
  return (
    <div>
      <label className="feldname" htmlFor={id}>{label}</label>
      <input id={id} inputMode="decimal" className={feld} value={text} onChange={(e) => { setText(e.target.value); const n = Number(e.target.value.replace(",", ".")); if (Number.isFinite(n) && n >= 0) onChange(Math.round(n * 100)); }} />
    </div>
  );
}

function Zahl({ id, label, wert, onChange, step = 1, min = 0 }: { id: string; label: string; wert: number; onChange: (n: number) => void; step?: number; min?: number }) {
  return (
    <div>
      <label className="feldname" htmlFor={id}>{label}</label>
      <input id={id} type="number" step={step} min={min} className={feld} value={wert} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function Datum({ id, label, wert, onChange }: { id: string; label: string; wert: string; onChange: (s: string) => void }) {
  return (
    <div>
      <label className="feldname" htmlFor={id}>{label}</label>
      <input id={id} type="date" className={feld} value={wert} onChange={(e) => onChange(e.target.value)} required />
    </div>
  );
}

function Text({ id, label, wert, onChange }: { id: string; label: string; wert: string; onChange: (s: string) => void }) {
  return (
    <div>
      <label className="feldname" htmlFor={id}>{label}</label>
      <input id={id} className={feld} value={wert} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function EinstellungenEditor({ start, kollektionen }: { start: Einstellungen; kollektionen: { slug: string; name: string }[] }) {
  const [e, setE] = useState<Einstellungen>(start);
  const [plz, setPlz] = useState(start.lieferung.plzPraefixe.join(", "));
  const [meldung, setMeldung] = useState<{ ok?: string; fehler?: string } | null>(null);
  const [laeuft, starte] = useTransition();
  const teil = <K extends keyof Einstellungen>(k: K, v: Partial<Einstellungen[K]>) => setE((alt) => ({ ...alt, [k]: { ...(alt[k] as object), ...v } }));
  const perso = (k: "handgeschrieben" | "banderole" | "namensanhaenger", v: Partial<{ preisCent: number; materialCent: number }>) =>
    setE((alt) => ({ ...alt, personalisierung: { ...alt.personalisierung, [k]: { ...alt.personalisierung[k], ...v } } }));

  const speichern = () =>
    starte(async () => {
      const praefixe = plz.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
      setMeldung(await einstellungenSpeichern({ ...e, lieferung: { ...e.lieferung, plzPraefixe: praefixe } }));
    });

  return (
    <div>
      <Gruppe titel="Saison und Bestellschlüsse" hinweis="Bis einschließlich Bestellschluss ist die Lieferart bestellbar. Danach ist sie bis „Wieder bestellbar ab“ gesperrt und der Shop zeigt das Anfrageformular.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Text id="saisonName" label="Name der Saison" wert={e.fristen.saisonName} onChange={(v) => teil("fristen", { saisonName: v })} />
          <div>
            <label className="feldname" htmlFor="saisonKoll">Kollektion oben auf der Startseite</label>
            <select id="saisonKoll" className={feld} value={e.saison.kollektionSlug} onChange={(ev) => teil("saison", { kollektionSlug: ev.target.value })}>
              {kollektionen.map((k) => <option key={k.slug} value={k.slug}>{k.name}</option>)}
            </select>
          </div>
          <label className="klein flex items-center gap-2 self-end pb-2">
            <input type="checkbox" className="h-5 w-5 accent-[#455230]" checked={e.fristen.aktiv} onChange={(ev) => teil("fristen", { aktiv: ev.target.checked })} /> Saisonfristen aktiv
          </label>
          <Datum id="wiederAb" label="Wieder bestellbar ab" wert={e.fristen.wiederAb} onChange={(v) => teil("fristen", { wiederAb: v })} />
          <Datum id="vSchluss" label="Versand: Bestellschluss" wert={e.fristen.versand.bestellschluss} onChange={(v) => teil("fristen", { versand: { ...e.fristen.versand, bestellschluss: v } })} />
          <Datum id="vBis" label="Versand: Zustellung bis" wert={e.fristen.versand.lieferungBis} onChange={(v) => teil("fristen", { versand: { ...e.fristen.versand, lieferungBis: v } })} />
          <Zahl id="vVorlauf" label="Versand: Vorlauf (Werktage)" wert={e.fristen.vorlaufVersandWerktage} min={1} onChange={(v) => teil("fristen", { vorlaufVersandWerktage: v })} />
          <span />
          <Datum id="pSchluss" label="Persönlich: Bestellschluss" wert={e.fristen.persoenlich.bestellschluss} onChange={(v) => teil("fristen", { persoenlich: { ...e.fristen.persoenlich, bestellschluss: v } })} />
          <Datum id="pVon" label="Persönlich: Lieferfenster von" wert={e.fristen.persoenlich.fensterVon} onChange={(v) => teil("fristen", { persoenlich: { ...e.fristen.persoenlich, fensterVon: v } })} />
          <Datum id="pBis" label="Persönlich: Lieferfenster bis" wert={e.fristen.persoenlich.fensterBis} onChange={(v) => teil("fristen", { persoenlich: { ...e.fristen.persoenlich, fensterBis: v } })} />
          <Zahl id="pVorlauf" label="Persönlich: Vorlauf (Werktage)" wert={e.fristen.vorlaufPersoenlichWerktage} min={1} onChange={(v) => teil("fristen", { vorlaufPersoenlichWerktage: v })} />
        </div>
      </Gruppe>

      <Gruppe titel="Liefergebiet für persönliche Lieferung" hinweis="PLZ oder PLZ-Anfänge, mit Komma getrennt. „681“ deckt alle Postleitzahlen ab, die mit 681 beginnen.">
        <label className="nur-sr" htmlFor="plz">PLZ-Präfixe</label>
        <textarea id="plz" rows={2} className={feld} value={plz} onChange={(ev) => setPlz(ev.target.value)} />
        <div className="mt-3 grid max-w-md grid-cols-2 gap-3">
          <Euro id="lGebuehr" label="Liefergebühr (€)" cent={e.lieferung.gebuehrCent} onChange={(c) => teil("lieferung", { gebuehrCent: c })} />
          <Euro id="lFrei" label="Kostenlos ab Warenwert (€)" cent={e.lieferung.freiAbCent} onChange={(c) => teil("lieferung", { freiAbCent: c })} />
        </div>
      </Gruppe>

      <Gruppe titel="Versandkosten nach Paketgewicht" hinweis="„Preis“ zahlt der Kunde je Paket. „Kosten“ ist das DHL-Porto für die Gewinnrechnung; das Material je Paket kommt dazu.">
        <div className="space-y-2">
          {e.versand.stufen.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
              <Zahl id={`sg${i}`} label="bis Gramm" wert={s.bisGramm} min={1} onChange={(v) => teil("versand", { stufen: e.versand.stufen.map((x, j) => (j === i ? { ...x, bisGramm: v } : x)) })} />
              <Euro id={`sp${i}`} label="Preis (€)" cent={s.preisCent} onChange={(c) => teil("versand", { stufen: e.versand.stufen.map((x, j) => (j === i ? { ...x, preisCent: c } : x)) })} />
              <Euro id={`sk${i}`} label="Kosten (€)" cent={s.kostenCent} onChange={(c) => teil("versand", { stufen: e.versand.stufen.map((x, j) => (j === i ? { ...x, kostenCent: c } : x)) })} />
              <button type="button" className="textlink klein pb-2.5" disabled={e.versand.stufen.length <= 1} onClick={() => teil("versand", { stufen: e.versand.stufen.filter((_, j) => j !== i) })}>Entfernen</button>
            </div>
          ))}
        </div>
        <button type="button" className="textlink klein mt-3" onClick={() => teil("versand", { stufen: [...e.versand.stufen, { bisGramm: 31500, preisCent: 0, kostenCent: 0 }] })}>Stufe hinzufügen</button>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Euro id="vMat" label="Material je Paket (€)" cent={e.versand.materialProPaketCent} onChange={(c) => teil("versand", { materialProPaketCent: c })} />
          <Zahl id="vEinzel" label="Umkarton Einzelpaket (g)" wert={e.versand.einzelUmkartonGramm} onChange={(v) => teil("versand", { einzelUmkartonGramm: v })} />
          <Zahl id="vSammel" label="Sammelkarton (g)" wert={e.versand.sammelUmkartonGramm} onChange={(v) => teil("versand", { sammelUmkartonGramm: v })} />
          <Zahl id="vMax" label="Höchstgewicht je Paket (g)" wert={e.versand.maxPaketGramm} min={1000} onChange={(v) => teil("versand", { maxPaketGramm: v })} />
          <Zahl id="vPlatz" label="Boxen je Sammelkarton" wert={e.versand.platzProPaket} step={0.5} min={1} onChange={(v) => teil("versand", { platzProPaket: v })} />
        </div>
      </Gruppe>

      <Gruppe titel="Mindestmenge und Mengenrabatt">
        <div className="mb-3 max-w-40"><Zahl id="mindest" label="Mindestmenge (Boxen)" wert={e.mindestmenge} min={1} onChange={(v) => setE({ ...e, mindestmenge: v })} /></div>
        <div className="space-y-2">
          {e.staffeln.map((s, i) => (
            <div key={i} className="grid max-w-md grid-cols-[1fr_1fr_auto] items-end gap-2">
              <Zahl id={`sa${i}`} label="ab Boxen" wert={s.ab} min={1} onChange={(v) => setE({ ...e, staffeln: e.staffeln.map((x, j) => (j === i ? { ...x, ab: v } : x)) })} />
              <Zahl id={`spz${i}`} label="Rabatt in %" wert={s.prozent} step={0.5} onChange={(v) => setE({ ...e, staffeln: e.staffeln.map((x, j) => (j === i ? { ...x, prozent: v } : x)) })} />
              <button type="button" className="textlink klein pb-2.5" onClick={() => setE({ ...e, staffeln: e.staffeln.filter((_, j) => j !== i) })}>Entfernen</button>
            </div>
          ))}
        </div>
        <button type="button" className="textlink klein mt-3" onClick={() => setE({ ...e, staffeln: [...e.staffeln, { ab: (e.staffeln.at(-1)?.ab ?? 5) * 2, prozent: 0 }] })}>Staffel hinzufügen</button>
      </Gruppe>

      <Gruppe titel="Personalisierung" hinweis="Preis je Box für den Kunden und Materialkosten je Box für die Gewinnrechnung. Logo-Sticker und gedruckte Karte sind inklusive und in der Verpackung kalkuliert.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {([["handgeschrieben", "Handgeschriebene Karte"], ["banderole", "Banderole mit Logo"], ["namensanhaenger", "Namensanhänger"]] as const).map(([k, name]) => (
            <div key={k} className="grid grid-cols-2 gap-2 border border-salbei/60 p-3">
              <p className="klein col-span-2 font-semibold">{name}</p>
              <Euro id={`${k}-p`} label="Preis (€)" cent={e.personalisierung[k].preisCent} onChange={(c) => perso(k, { preisCent: c })} />
              <Euro id={`${k}-m`} label="Material (€)" cent={e.personalisierung[k].materialCent} onChange={(c) => perso(k, { materialCent: c })} />
            </div>
          ))}
          <Zahl id="gruss" label="Grußtext: Zeichen maximal" wert={e.personalisierung.grusstextMaxZeichen} min={50} onChange={(v) => teil("personalisierung", { grusstextMaxZeichen: v })} />
        </div>
      </Gruppe>

      <Gruppe titel="Zahlungsgebühr und Margenziele" hinweis="Nur für die Planrechnung. Die echte Gebühr je Bestellung holt das System von Stripe.">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Zahl id="gProz" label="Gebühr %" wert={e.gebuehren.prozent} step={0.1} onChange={(v) => teil("gebuehren", { prozent: v })} />
          <Euro id="gFix" label="Fix je Zahlung (€)" cent={e.gebuehren.fixCent} onChange={(c) => teil("gebuehren", { fixCent: c })} />
          <Zahl id="gRech" label="Rechnung %" wert={e.gebuehren.rechnungProzent} step={0.1} onChange={(v) => teil("gebuehren", { rechnungProzent: v })} />
          <Euro id="gMax" label="Rechnung max. (€)" cent={e.gebuehren.rechnungMaxCent} onChange={(c) => teil("gebuehren", { rechnungMaxCent: c })} />
          <Zahl id="mZiel" label="Zielmarge %" wert={e.margen.zielProzent} onChange={(v) => teil("margen", { zielProzent: v })} />
          <Zahl id="mMin" label="Untergrenze %" wert={e.margen.minProzent} onChange={(v) => teil("margen", { minProzent: v })} />
        </div>
      </Gruppe>

      <Gruppe titel="Kontakt und Impressum" hinweis="Erscheint in Impressum, Datenschutz, AGB, Footer und auf dem Lieferschein. Felder mit „[vor Livegang ausfüllen]“ sind im Shop sichtbar markiert.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Text id="kInhaber" label="Inhaber (Vor- und Nachname)" wert={e.kontakt.inhaber} onChange={(v) => teil("kontakt", { inhaber: v })} />
          <Text id="kFirma" label="Geschäftsbezeichnung" wert={e.kontakt.firma} onChange={(v) => teil("kontakt", { firma: v })} />
          <Text id="kStrasse" label="Straße und Hausnummer" wert={e.kontakt.strasse} onChange={(v) => teil("kontakt", { strasse: v })} />
          <Text id="kOrt" label="PLZ und Ort" wert={e.kontakt.plzOrt} onChange={(v) => teil("kontakt", { plzOrt: v })} />
          <Text id="kTel" label="Telefon" wert={e.kontakt.telefon} onChange={(v) => teil("kontakt", { telefon: v })} />
          <Text id="kMail" label="E-Mail" wert={e.kontakt.email} onChange={(v) => teil("kontakt", { email: v })} />
          <Text id="kSteuer" label="Steuernummer (nur für eigene Unterlagen)" wert={e.kontakt.steuernummer} onChange={(v) => teil("kontakt", { steuernummer: v })} />
          <Text id="kAufsicht" label="Zusatz fürs Impressum (optional)" wert={e.kontakt.aufsichtHinweis} onChange={(v) => teil("kontakt", { aufsichtHinweis: v })} />
        </div>
      </Gruppe>

      <div className="sticky bottom-0 -mx-4 border-t border-salbei bg-creme px-4 py-3 sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={speichern} disabled={laeuft} className="knopf">{laeuft ? "Speichert …" : "Einstellungen speichern"}</button>
          {meldung?.fehler ? <p role="alert" className="klein font-semibold text-signal">{meldung.fehler}</p> : null}
          {meldung?.ok ? <p role="status" className="klein">{meldung.ok}</p> : null}
        </div>
      </div>
    </div>
  );
}
