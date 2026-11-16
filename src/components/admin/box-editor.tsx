"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { boxSpeichern, type BoxEingabe } from "@/app/admin/aktionen";
import { kalkuliereBox, preisFuerMarge, type GebuehrenModell } from "@/lib/calc/margin";
import { euro, gramm, parseEuro, prozent } from "@/lib/geld";

export interface KatalogArtikel { id: string; text: string; preisCent: number; gewichtGramm: number; laden: string; alkohol: boolean; aktiv: boolean }
export interface KatalogVerpackung { id: string; name: string; preisCent: number; einheit: string; gewichtGramm: number }

interface Props {
  start: BoxEingabe;
  kollektionen: { id: number; name: string }[];
  artikel: KatalogArtikel[];
  verpackung: KatalogVerpackung[];
  standardVerpackung: Record<string, [string, number][]>;
  gebuehren: GebuehrenModell;
  mindestmenge: number;
  margen: { zielProzent: number; minProzent: number };
  bandfarben: { id: string; name: string }[];
}

const feld = "feld !min-h-10 !py-2 !text-[0.9375rem]";

function MargeAnzeige({ marge, ziel, min }: { marge: number; ziel: number; min: number }) {
  const rot = marge < min;
  const warn = !rot && marge < ziel;
  return (
    <div className={`rounded-[2px] px-3 py-2 ${rot ? "bg-signal text-creme" : warn ? "border-2 border-ink" : "bg-salbei"}`} role="status">
      <span className="zahl font-serif text-3xl leading-none">{prozent(marge)}</span>
      <span className="klein ml-2 font-semibold">{rot ? `unter ${min} % – so nicht verkaufbar` : warn ? `Warnung: unter ${ziel} %` : "Marge im Ziel"}</span>
    </div>
  );
}

export function BoxEditor({ start, kollektionen, artikel, verpackung, standardVerpackung, gebuehren, mindestmenge, margen, bandfarben }: Props) {
  const router = useRouter();
  const [box, setBox] = useState<BoxEingabe>(start);
  const [preisText, setPreisText] = useState((start.preisCent / 100).toFixed(2).replace(".", ","));
  const [simPreis, setSimPreis] = useState("");
  const [tausch, setTausch] = useState<{ von: string; zu: string }>({ von: "", zu: "" });
  const [meldung, setMeldung] = useState<{ ok?: string; fehler?: string } | null>(null);
  const [laeuft, starte] = useTransition();
  const aNach = useMemo(() => new Map(artikel.map((a) => [a.id, a])), [artikel]);
  const vNach = useMemo(() => new Map(verpackung.map((v) => [v.id, v])), [verpackung]);
  const setze = <K extends keyof BoxEingabe>(k: K, v: BoxEingabe[K]) => setBox((b) => ({ ...b, [k]: v }));

  const rechne = (preisCent: number, liste = box.artikel) =>
    kalkuliereBox({
      preisCent,
      artikel: liste.map((x) => ({ preisCent: aNach.get(x.articleId)?.preisCent ?? 0, menge: x.menge })),
      verpackung: box.verpackung.map((x) => ({ preisCent: vNach.get(x.packagingId)?.preisCent ?? 0, menge: x.menge })),
      gebuehren,
      mindestmenge,
      ziel: margen.zielProzent,
      min: margen.minProzent,
    });
  const k = rechne(box.preisCent);
  const gewicht = Math.round(box.artikel.reduce((s, x) => s + (aNach.get(x.articleId)?.gewichtGramm ?? 0) * x.menge, 0) + box.verpackung.reduce((s, x) => s + (vNach.get(x.packagingId)?.gewichtGramm ?? 0) * x.menge, 0));
  const zielPreis = preisFuerMarge({
    artikel: box.artikel.map((x) => ({ preisCent: aNach.get(x.articleId)?.preisCent ?? 0, menge: x.menge })),
    verpackung: box.verpackung.map((x) => ({ preisCent: vNach.get(x.packagingId)?.preisCent ?? 0, menge: x.menge })),
    gebuehren, mindestmenge, zielProzent: margen.zielProzent,
  });
  const simCent = parseEuro(simPreis);
  const sim = simCent ? rechne(simCent) : null;
  const tauschListe = tausch.von && tausch.zu ? box.artikel.map((x) => (x.articleId === tausch.von ? { ...x, articleId: tausch.zu } : x)) : null;
  const simTausch = tauschListe ? rechne(box.preisCent, tauschListe) : null;
  const frei = artikel.filter((a) => a.aktiv && !box.artikel.some((x) => x.articleId === a.id));

  const speichern = () =>
    starte(async () => {
      const ergebnis = await boxSpeichern(box);
      setMeldung(ergebnis);
      if (ergebnis.id && !box.id) router.replace(`/admin/boxen/${ergebnis.id}`);
    });

  return (
    <div className="grid gap-x-6 lg:grid-cols-[1.35fr_1fr]">
      <div>
        <section className="mb-6 rounded-[4px] border border-salbei p-4">
          <h2 className="label mb-3 text-dunkel">Stammdaten</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="feldname" htmlFor="name">Name</label>
              <input id="name" className={feld} value={box.name} onChange={(e) => setze("name", e.target.value)} />
            </div>
            <div>
              <label className="feldname" htmlFor="slug">Adresse /boxen/…</label>
              <input id="slug" className={feld} value={box.slug} onChange={(e) => setze("slug", e.target.value)} placeholder="wird aus dem Namen gebildet" />
            </div>
            <div>
              <label className="feldname" htmlFor="koll">Kollektion</label>
              <select id="koll" className={feld} value={box.collectionId} onChange={(e) => setze("collectionId", Number(e.target.value))}>
                {kollektionen.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </div>
            <div>
              <label className="feldname" htmlFor="anlass">Anlass</label>
              <input id="anlass" className={feld} value={box.anlass} onChange={(e) => setze("anlass", e.target.value)} />
            </div>
            <div>
              <label className="feldname" htmlFor="ziel">Zielgruppe</label>
              <input id="ziel" className={feld} value={box.zielgruppe} onChange={(e) => setze("zielgruppe", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="feldname" htmlFor="kurz">Kurzzeile (Inhalt in einem Satz)</label>
              <input id="kurz" className={feld} value={box.kurz} onChange={(e) => setze("kurz", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="feldname" htmlFor="text">Verkaufstext <span className="font-normal text-dunkel">({box.text.length} Zeichen)</span></label>
              <textarea id="text" rows={5} className={feld} value={box.text} onChange={(e) => setze("text", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-[4px] border border-salbei p-4">
          <h2 className="label mb-3 text-dunkel">Inhalt aus dem Artikelkatalog</h2>
          {box.artikel.length === 0 ? <p className="klein mb-3 text-dunkel">Noch kein Artikel – unten auswählen.</p> : null}
          <ul className="mb-3 divide-y divide-salbei/60">
            {box.artikel.map((x, i) => {
              const a = aNach.get(x.articleId);
              return (
                <li key={x.articleId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <label className="nur-sr" htmlFor={`am-${x.articleId}`}>Menge {a?.text}</label>
                  <input id={`am-${x.articleId}`} type="number" min={1} max={50} value={x.menge} onChange={(e) => setze("artikel", box.artikel.map((y, j) => (j === i ? { ...y, menge: Math.max(1, Number(e.target.value) || 1) } : y)))} className={`${feld} !w-16`} />
                  <span className="klein min-w-40 flex-1">
                    {a?.text ?? x.articleId}
                    <span className="text-dunkel"> · {a?.laden}{a?.alkohol ? " · Alkohol" : ""}</span>
                  </span>
                  <span className="klein zahl whitespace-nowrap">{euro((a?.preisCent ?? 0) * x.menge, { immerCent: true })}</span>
                  <span className="flex gap-2">
                    <button type="button" className="textlink klein" disabled={i === 0} onClick={() => setze("artikel", box.artikel.map((y, j, arr) => (j === i - 1 ? arr[i] : j === i ? arr[i - 1] : y)))} aria-label={`${a?.text} nach oben`}>↑</button>
                    <button type="button" className="textlink klein" onClick={() => setze("artikel", box.artikel.filter((_, j) => j !== i))}>Entfernen</button>
                  </span>
                </li>
              );
            })}
          </ul>
          <label className="feldname" htmlFor="neu-artikel">Artikel hinzufügen</label>
          <select id="neu-artikel" className={feld} value="" onChange={(e) => e.target.value && setze("artikel", [...box.artikel, { articleId: e.target.value, menge: 1 }])}>
            <option value="">– auswählen –</option>
            {frei.map((a) => <option key={a.id} value={a.id}>{a.text} · {euro(a.preisCent, { immerCent: true })} · {a.laden}</option>)}
          </select>
        </section>

        <section className="mb-6 rounded-[4px] border border-salbei p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="label text-dunkel">Verpackung</h2>
            <button type="button" className="textlink klein" onClick={() => setze("verpackung", (standardVerpackung[box.groesse] ?? []).map(([packagingId, menge]) => ({ packagingId, menge })))}>
              Standard für Größe „{box.groesse}“ übernehmen
            </button>
          </div>
          <div className="mb-3 max-w-xs">
            <label className="feldname" htmlFor="groesse">Kartongröße</label>
            <select id="groesse" className={feld} value={box.groesse} onChange={(e) => setze("groesse", e.target.value as BoxEingabe["groesse"])}>
              <option value="klein">klein – 24×17×7 cm (ohne Glas)</option>
              <option value="flach">flach – 30,5×21,5×7,4 cm (ohne Glas)</option>
              <option value="mittel">mittel – 30,5×21,5×10 cm</option>
              <option value="gross">groß – 33×24×10 cm (Flaschen)</option>
            </select>
          </div>
          <ul className="mb-3 divide-y divide-salbei/60">
            {box.verpackung.map((x, i) => {
              const v = vNach.get(x.packagingId);
              return (
                <li key={x.packagingId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <label className="nur-sr" htmlFor={`vm-${x.packagingId}`}>Menge {v?.name}</label>
                  <input id={`vm-${x.packagingId}`} type="number" step="0.005" min={0.001} value={x.menge} onChange={(e) => setze("verpackung", box.verpackung.map((y, j) => (j === i ? { ...y, menge: Number(e.target.value) || 0.001 } : y)))} className={`${feld} !w-24`} />
                  <span className="klein min-w-40 flex-1">{v?.name} <span className="text-dunkel">({v?.einheit})</span></span>
                  <span className="klein zahl whitespace-nowrap">{euro(Math.round((v?.preisCent ?? 0) * x.menge), { immerCent: true })}</span>
                  <button type="button" className="textlink klein" onClick={() => setze("verpackung", box.verpackung.filter((_, j) => j !== i))}>Entfernen</button>
                </li>
              );
            })}
          </ul>
          <label className="feldname" htmlFor="neu-verp">Material hinzufügen</label>
          <select id="neu-verp" className={feld} value="" onChange={(e) => e.target.value && setze("verpackung", [...box.verpackung, { packagingId: e.target.value, menge: 1 }])}>
            <option value="">– auswählen –</option>
            {verpackung.filter((v) => !box.verpackung.some((x) => x.packagingId === v.id)).map((v) => <option key={v.id} value={v.id}>{v.name} · {euro(v.preisCent, { immerCent: true })}/{v.einheit}</option>)}
          </select>
        </section>

        <section className="mb-6 rounded-[4px] border border-salbei p-4">
          <h2 className="label mb-3 text-dunkel">Sichtbarkeit und Suchmaschinen</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="klein flex items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-[#455230]" checked={box.aktiv} onChange={(e) => setze("aktiv", e.target.checked)} /> Aktiv (im Shop bestellbar)</label>
            <label className="klein flex items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-[#455230]" checked={box.bestseller} onChange={(e) => setze("bestseller", e.target.checked)} /> Als Bestseller zeigen</label>
            <div>
              <label className="feldname" htmlFor="von">Sichtbar ab (leer = sofort)</label>
              <input id="von" type="date" className={feld} value={box.sichtbarVon ?? ""} onChange={(e) => setze("sichtbarVon", e.target.value || null)} />
            </div>
            <div>
              <label className="feldname" htmlFor="bis">Sichtbar bis (leer = unbegrenzt)</label>
              <input id="bis" type="date" className={feld} value={box.sichtbarBis ?? ""} onChange={(e) => setze("sichtbarBis", e.target.value || null)} />
            </div>
            <div>
              <label className="feldname" htmlFor="sort">Reihenfolge</label>
              <input id="sort" type="number" className={feld} value={box.sortierung} onChange={(e) => setze("sortierung", Number(e.target.value) || 0)} />
            </div>
            <div>
              <label className="feldname" htmlFor="band">Bandfarbe (Standard)</label>
              <select id="band" className={feld} value={box.band} onChange={(e) => setze("band", e.target.value)}>{bandfarben.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
            </div>
            <div className="sm:col-span-2">
              <label className="feldname" htmlFor="seot">Seitentitel <span className={`font-normal ${box.seoTitel.length > 60 ? "text-signal" : "text-dunkel"}`}>({box.seoTitel.length}/60)</span></label>
              <input id="seot" className={feld} value={box.seoTitel} onChange={(e) => setze("seoTitel", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="feldname" htmlFor="seob">Beschreibung für Suchmaschinen <span className={`font-normal ${box.seoBeschreibung.length > 155 ? "text-signal" : "text-dunkel"}`}>({box.seoBeschreibung.length}/155)</span></label>
              <textarea id="seob" rows={2} className={feld} value={box.seoBeschreibung} onChange={(e) => setze("seoBeschreibung", e.target.value)} />
            </div>
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <section className="mb-6 rounded-[4px] border border-dunkel p-4">
          <h2 className="label mb-3 text-dunkel">Kalkulation (live)</h2>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className="feldname" htmlFor="preis">Verkaufspreis (€)</label>
              <input id="preis" inputMode="decimal" className={feld} value={preisText} onChange={(e) => { setPreisText(e.target.value); const c = parseEuro(e.target.value); if (c != null && c > 0) setze("preisCent", c); }} />
            </div>
            <div>
              <label className="feldname" htmlFor="pack">Packzeit (min)</label>
              <input id="pack" type="number" min={0} className={feld} value={box.packMinuten} onChange={(e) => setze("packMinuten", Number(e.target.value) || 0)} />
            </div>
          </div>
          <MargeAnzeige marge={k.margeProzent} ziel={margen.zielProzent} min={margen.minProzent} />
          <dl className="klein zahl mt-3 grid grid-cols-[1fr_auto] gap-y-1">
            <dt>Einkauf Artikel</dt><dd className="text-right">{euro(k.einkaufCent, { immerCent: true })}</dd>
            <dt>Verpackung</dt><dd className="text-right">{euro(k.verpackungCent, { immerCent: true })}</dd>
            <dt>Zahlungsgebühr ({(gebuehren.prozent + gebuehren.rechnungProzent).toFixed(1).replace(".", ",")} % + Anteil Fixbetrag)</dt><dd className="text-right">{euro(k.gebuehrCent, { immerCent: true })}</dd>
            <dt className="border-t border-salbei pt-1 font-semibold">Rohertrag je Box</dt><dd className="border-t border-salbei pt-1 text-right font-semibold">{euro(k.rohertragCent, { immerCent: true })}</dd>
            <dt className="text-dunkel">Gewicht · Stundenertrag beim Packen</dt><dd className="text-right text-dunkel">{gramm(gewicht)} · {box.packMinuten > 0 ? euro(Math.round((k.rohertragCent / box.packMinuten) * 60)) : "–"}/h</dd>
          </dl>
          <p className="klein mt-3 text-dunkel">Für {margen.zielProzent}&nbsp;% Marge mindestens <strong className="zahl">{euro(zielPreis)}</strong>.</p>
        </section>

        <section className="mb-6 rounded-[4px] border border-salbei p-4">
          <h2 className="label mb-3 text-dunkel">Preis-Simulator</h2>
          <label className="feldname" htmlFor="sim">Was wäre bei diesem Preis (€)?</label>
          <input id="sim" inputMode="decimal" className={feld} value={simPreis} onChange={(e) => setSimPreis(e.target.value)} placeholder="z. B. 42" />
          {sim ? (
            <p className="klein zahl mt-2">
              Marge <strong>{prozent(sim.margeProzent)}</strong> ({sim.margeProzent >= k.margeProzent ? "+" : "−"}{prozent(Math.abs(sim.margeProzent - k.margeProzent))} Punkte) · Rohertrag {euro(sim.rohertragCent, { immerCent: true })}
              {sim.margeProzent < margen.minProzent ? <strong className="text-signal"> · unter {margen.minProzent} %</strong> : sim.margeProzent < margen.zielProzent ? <strong> · unter {margen.zielProzent} %</strong> : null}
            </p>
          ) : null}
          <div className="mt-4 grid gap-2">
            <label className="feldname !mb-0" htmlFor="tvon">Was wäre mit einem anderen Artikel?</label>
            <select id="tvon" className={feld} value={tausch.von} onChange={(e) => setTausch({ ...tausch, von: e.target.value })}>
              <option value="">– Artikel in der Box –</option>
              {box.artikel.map((x) => <option key={x.articleId} value={x.articleId}>{aNach.get(x.articleId)?.text}</option>)}
            </select>
            <label className="nur-sr" htmlFor="tzu">Ersatzartikel</label>
            <select id="tzu" className={feld} value={tausch.zu} onChange={(e) => setTausch({ ...tausch, zu: e.target.value })}>
              <option value="">– ersetzen durch –</option>
              {frei.map((a) => <option key={a.id} value={a.id}>{a.text} · {euro(a.preisCent, { immerCent: true })}</option>)}
            </select>
          </div>
          {simTausch ? (
            <p className="klein zahl mt-2">
              Marge <strong>{prozent(simTausch.margeProzent)}</strong> ({simTausch.margeProzent >= k.margeProzent ? "+" : "−"}{prozent(Math.abs(simTausch.margeProzent - k.margeProzent))} Punkte) ·{" "}
              <button type="button" className="textlink" onClick={() => { setze("artikel", tauschListe!); setTausch({ von: "", zu: "" }); }}>Tausch übernehmen</button>
            </p>
          ) : null}
        </section>

        <button type="button" onClick={speichern} disabled={laeuft} className="knopf w-full">{laeuft ? "Speichert …" : box.id ? "Box speichern" : "Box anlegen"}</button>
        {meldung?.fehler ? <p role="alert" className="klein mt-2 border-l-2 border-signal pl-2 font-semibold text-signal">{meldung.fehler}</p> : null}
        {meldung?.ok ? <p role="status" className="klein mt-2 border-l-2 border-dunkel pl-2">{meldung.ok}</p> : null}
      </aside>
    </div>
  );
}
