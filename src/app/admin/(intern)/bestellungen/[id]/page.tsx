import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { erfordereAdmin } from "@/auth";
import { Absenden, Formular } from "@/components/admin/formular";
import { AKnopf, Block, Seite, StatusMarke, Tabelle, feldKlein, knopfKlein } from "@/components/admin/ui";
import { datumLang, datumZahl } from "@/lib/calc/deadlines";
import { artikelKosten, berechneGewinn } from "@/lib/calc/profit";
import { euro, euroMinus, gramm, prozent } from "@/lib/geld";
import { ladeBestellung } from "@/lib/server/admin-daten";
import { STATUS_FOLGE, STATUS_TEXT } from "@/lib/server/bestellungen";
import { dhlLink } from "@/lib/server/mails";
import { db, schema } from "../../../../../../db";
import { bestaetigungErneut, bestellungNotiz, erstatten, statusAendern, stripeDatenHolen, versenden } from "../../../aktionen";

/** Admin-Seiten rendern bewusst blockierend auf dem Server (kein Prerender, keine Sofort-Navigation). */
export const instant = false;

export const metadata: Metadata = { title: "Bestellung" };

const LIEFERART = { versand: "DHL-Versand an eine Adresse", mehrfach: "DHL-Versand an mehrere Empfänger", persoenlich: "Persönliche Lieferung" } as const;

function Zeile({ name, plan, echt, minus = true, fett }: { name: string; plan: number; echt: number; minus?: boolean; fett?: boolean }) {
  const f = (c: number) => (minus ? euroMinus(c) : euro(c, { immerCent: true }));
  return (
    <tr className={fett ? "font-semibold" : ""}>
      <td>{name}</td>
      <td className="zahl whitespace-nowrap text-right">{f(plan)}</td>
      <td className="zahl whitespace-nowrap text-right">{f(echt)}</td>
    </tr>
  );
}

export default async function BestellDetail({ params }: PageProps<"/admin/bestellungen/[id]">) {
  await erfordereAdmin();
  const { id } = await params;
  const daten = await ladeBestellung(id);
  if (!daten) notFound();
  const { bestellung: b, positionen, empfaenger, mails, kampagne } = daten;
  const artikel = await db.select({ id: schema.articles.id, einstandCent: schema.articles.einstandCent }).from(schema.articles);
  const einstand = new Map(artikel.map((a) => [a.id, a.einstandCent]));
  const live = positionen.reduce((s, p) => s + p.menge * artikelKosten(p.inhalt, einstand), 0);
  const g = berechneGewinn({ ...b, echtArtikelCent: b.echtArtikelCent ?? live });
  const p = b.personalisierung;
  const folge = STATUS_FOLGE[b.status];
  const kannVersenden = ["neu", "eingekauft", "gepackt", "versendet"].includes(b.status);
  const erstattbar = (b.bezahltCent ?? 0) - b.erstattetCent;
  const boxenGesamt = positionen.reduce((s, x) => s + x.menge, 0);

  return (
    <Seite
      titel={`Bestellung ${b.nummer}`}
      hinweis={
        <>
          {b.firma} · eingegangen am {datumLang(b.createdAt.toISOString().slice(0, 10), true)}
          {kampagne ? ` · Kampagne „${kampagne.name}“` : ""}
        </>
      }
      aktionen={
        <>
          <AKnopf href={`/admin/bestellungen/${b.id}/packliste`} hell>
            Packliste
          </AKnopf>
          <AKnopf href={`/admin/bestellungen/${b.id}/lieferschein`} hell>
            Lieferschein
          </AKnopf>
        </>
      }
    >
      <div className="grid gap-x-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <Block titel="Status" rechts={<StatusMarke status={b.status} />}>
            {folge.length ? (
              <div className="flex flex-wrap gap-2">
                {folge.map((s) => (
                  <Formular key={s} aktion={statusAendern} bestaetigen={s === "storniert" ? "Bestellung wirklich stornieren? Eine Erstattung müssen Sie separat auslösen." : undefined} className="flex flex-wrap">
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="status" value={s} />
                    <Absenden className={`${knopfKlein} ${s === "storniert" || STATUS_FOLGE[b.status].indexOf(s) > 0 ? "knopf-hell" : ""}`}>
                      {s === "storniert" ? "Stornieren" : `→ ${STATUS_TEXT[s]}`}
                    </Absenden>
                  </Formular>
                ))}
              </div>
            ) : (
              <p className="klein text-dunkel">Kein weiterer Schritt möglich.</p>
            )}
            {b.status === "neu" || b.status === "eingekauft" ? <p className="klein mt-3 text-dunkel">„Gepackt“ bucht Artikel und Verpackung vom Bestand ab und hält die echten Artikelkosten fest.</p> : null}
          </Block>

          {kannVersenden ? (
            <Block titel={b.lieferart === "persoenlich" ? "Lieferung abschließen" : "Versand"}>
              <Formular aktion={versenden} className="space-y-3">
                <input type="hidden" name="id" value={b.id} />
                {b.lieferart === "versand" ? (
                  <div>
                    <label htmlFor="sendungsnummer" className="feldname">
                      DHL-Sendungsnummer{b.paketeAnzahl > 1 ? `n (${b.paketeAnzahl} Pakete, mit Komma getrennt)` : ""}
                    </label>
                    <input id="sendungsnummer" name="sendungsnummer" defaultValue={b.sendungsnummer ?? ""} className={feldKlein} autoComplete="off" />
                  </div>
                ) : null}
                {b.lieferart === "mehrfach" ? (
                  <div className="space-y-2">
                    <p className="klein text-dunkel">Sendungsnummer je Empfänger (leere Felder werden übersprungen):</p>
                    {empfaenger.map((x) => (
                      <div key={x.id} className="grid grid-cols-[1fr_1.2fr] items-center gap-2">
                        <label htmlFor={`emp_${x.id}`} className="klein">
                          {x.name}, {x.plz} {x.ort}
                        </label>
                        <input id={`emp_${x.id}`} name={`emp_${x.id}`} defaultValue={x.sendungsnummer ?? ""} className={feldKlein} autoComplete="off" />
                      </div>
                    ))}
                  </div>
                ) : null}
                {b.lieferart !== "persoenlich" ? (
                  <div className="max-w-xs">
                    <label htmlFor="versandkosten" className="feldname">
                      Tatsächlich bezahltes Porto gesamt (€)
                    </label>
                    <input id="versandkosten" name="versandkosten" inputMode="decimal" defaultValue={b.echtVersandKostenCent != null ? (b.echtVersandKostenCent / 100).toFixed(2).replace(".", ",") : ""} placeholder={`geplant ${(b.planVersandKostenCent / 100).toFixed(2).replace(".", ",")}`} className={feldKlein} />
                  </div>
                ) : null}
                <Absenden>{b.lieferart === "persoenlich" ? "Als geliefert markieren und Kunden benachrichtigen" : "Speichern und Versandmail senden"}</Absenden>
              </Formular>
            </Block>
          ) : null}

          <Block titel={`Inhalt · ${boxenGesamt} Boxen${b.ohneAlkohol ? " · ohne Alkohol" : ""}`}>
            {positionen.map((pos) => (
              <div key={pos.id} className="mb-4 last:mb-0">
                <p className="font-semibold">
                  <span className="zahl">{pos.menge}&nbsp;×</span> {pos.boxName}{" "}
                  <span className="klein zahl font-normal text-dunkel">
                    je {euro(pos.stueckpreisCent, { immerCent: true })}
                    {pos.stueckpreisCent !== pos.listenpreisCent ? ` (Liste ${euro(pos.listenpreisCent)})` : ""} · {gramm(pos.gewichtGramm)}
                  </span>
                </p>
                <ul className="klein mt-1 list-disc pl-5 text-dunkel">
                  {pos.inhalt.map((x) => (
                    <li key={x.articleId}>
                      {x.menge > 1 ? `${x.menge} × ` : ""}
                      {x.marke} {x.name}, {x.groesse}
                      {x.ersetzt ? <em> (statt {x.ersetzt})</em> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Block>

          <Block titel="Personalisierung">
            <dl className="klein grid grid-cols-[9rem_1fr] gap-x-3 gap-y-2">
              <dt className="text-dunkel">Logo</dt>
              <dd>
                {p.logoUrl ? (
                  <a href={p.logoUrl} download={p.logoName ?? true} className="textlink" target="_blank" rel="noreferrer">
                    {p.logoName ?? "Logo"} herunterladen
                  </a>
                ) : (
                  "kein Logo hochgeladen – neutraler Sticker"
                )}
              </dd>
              <dt className="text-dunkel">Grußtext</dt>
              <dd className="whitespace-pre-wrap">{p.grusstext || "– (Standardkarte „Danke“)"}</dd>
              <dt className="text-dunkel">Karte</dt>
              <dd>{p.handgeschrieben ? "handgeschrieben" : "gedruckt"}</dd>
              <dt className="text-dunkel">Bandfarbe</dt>
              <dd>{p.bandfarbe}</dd>
              <dt className="text-dunkel">Banderole</dt>
              <dd>{p.banderole ? "ja, mit Logo" : "nein"}</dd>
              <dt className="text-dunkel">Namensanhänger</dt>
              <dd>{p.namensanhaenger ? "ja – Namen laut Empfängerliste bzw. Kundennotiz" : "nein"}</dd>
            </dl>
          </Block>

          <Block titel={LIEFERART[b.lieferart]}>
            <p className="klein mb-3">
              Termin:{" "}
              <strong>
                {/^\d{4}-/.test(b.termin) ? `Wunschtag ${datumLang(b.termin, true)}` : b.termin === "saison" ? "zum Fest (Saisonfrist)" : "so bald wie möglich"}
              </strong>{" "}
              · {b.paketeAnzahl > 0 ? `${b.paketeAnzahl} Paket(e), ` : ""}
              {gramm(b.gewichtGramm)}
              {b.volljaehrigBestaetigt ? " · Volljährigkeit der Empfänger bestätigt" : ""}
            </p>
            {b.lieferart === "mehrfach" ? (
              <Tabelle kopf={["Empfänger", "Adresse", "Box", "Sendung"]}>
                {empfaenger.map((x) => (
                  <tr key={x.id}>
                    <td>
                      {x.name}
                      {x.firma ? <div className="text-dunkel">{x.firma}</div> : null}
                    </td>
                    <td>
                      {x.strasse}
                      {x.zusatz ? `, ${x.zusatz}` : ""}
                      <br />
                      {x.plz} {x.ort}
                    </td>
                    <td>
                      {x.menge > 1 ? `${x.menge} × ` : ""}
                      {positionen.find((q) => q.boxSlug === x.boxSlug)?.boxName ?? x.boxSlug}
                    </td>
                    <td className="zahl">
                      {x.sendungsnummer ? (
                        <a href={dhlLink(x.sendungsnummer)} className="textlink" target="_blank" rel="noreferrer">
                          {x.sendungsnummer}
                        </a>
                      ) : (
                        "–"
                      )}
                    </td>
                  </tr>
                ))}
              </Tabelle>
            ) : (
              <address className="klein not-italic">
                {b.lieferFirma}
                {b.lieferName ? (
                  <>
                    <br />
                    z. Hd. {b.lieferName}
                  </>
                ) : null}
                <br />
                {b.lieferStrasse}
                {b.lieferZusatz ? `, ${b.lieferZusatz}` : ""}
                <br />
                {b.lieferPlz} {b.lieferOrt}
                {b.sendungsnummer ? (
                  <>
                    <br />
                    Sendung: <span className="zahl">{b.sendungsnummer}</span>
                  </>
                ) : null}
              </address>
            )}
          </Block>
        </div>

        <div>
          <Block titel="Gewinn" rechts={<span className="klein text-dunkel">geplant · echt</span>}>
            <table className="klein w-full [&_td]:py-1">
              <tbody>
                <Zeile name="Umsatz" plan={g.geplant.umsatzCent} echt={g.echt.umsatzCent} minus={false} />
                <Zeile name={`Artikel${b.echtArtikelCent == null ? " (vorläufig)" : ""}`} plan={g.geplant.artikelCent} echt={g.echt.artikelCent} />
                <Zeile name="Verpackung" plan={g.geplant.verpackungCent} echt={g.echt.verpackungCent} />
                <Zeile name="Personalisierung (Material)" plan={g.geplant.persoCent} echt={g.echt.persoCent} />
                <Zeile name={`Versandkosten${g.offen.includes("versand") ? " (noch geplant)" : ""}`} plan={g.geplant.versandCent} echt={g.echt.versandCent} />
                <Zeile name={`Stripe-Gebühr${g.offen.includes("gebuehr") ? " (noch geplant)" : ""}`} plan={g.geplant.gebuehrCent} echt={g.echt.gebuehrCent} />
                <tr className="border-t border-salbei font-semibold">
                  <td>Gewinn vor sonstigen Ausgaben</td>
                  <td className="zahl whitespace-nowrap text-right">{euro(g.geplant.gewinnCent, { immerCent: true })}</td>
                  <td className={`zahl whitespace-nowrap text-right ${g.echt.gewinnCent < 0 ? "text-signal" : ""}`}>{euro(g.echt.gewinnCent, { immerCent: true })}</td>
                </tr>
                <tr className="text-dunkel">
                  <td>Marge</td>
                  <td className="zahl text-right">{prozent(g.geplant.margeProzent)}</td>
                  <td className="zahl text-right">{prozent(g.echt.margeProzent)}</td>
                </tr>
              </tbody>
            </table>
            {b.erstattetCent > 0 ? <p className="klein mt-2 text-signal">Erstattet: {euro(b.erstattetCent, { immerCent: true })}</p> : null}
            <Formular aktion={stripeDatenHolen} className="mt-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={b.id} />
              <Absenden className="textlink klein">Gebühr und Rechnung von Stripe holen</Absenden>
            </Formular>
            <p className="klein mt-2 text-dunkel">Anteilige sonstige Ausgaben stehen in der Übersicht und im Export.</p>
          </Block>

          <Block titel="Kunde und Zahlung">
            <address className="klein not-italic">
              <strong>{b.firma}</strong>
              <br />
              {b.ansprechpartner}
              <br />
              {b.rechnungStrasse}
              {b.rechnungZusatz ? `, ${b.rechnungZusatz}` : ""}
              <br />
              {b.rechnungPlz} {b.rechnungOrt}
              <br />
              <a href={`mailto:${b.email}`} className="textlink">
                {b.email}
              </a>
              {b.telefon ? (
                <>
                  {" · "}
                  <a href={`tel:${b.telefon.replace(/[^\d+]/g, "")}`} className="textlink">
                    {b.telefon}
                  </a>
                </>
              ) : null}
            </address>
            <dl className="klein mt-3 grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1">
              <dt className="text-dunkel">Bezahlt</dt>
              <dd className="zahl">{b.bezahltAm ? `${euro(b.bezahltCent ?? b.summeCent, { immerCent: true })} am ${datumZahl(b.bezahltAm.toISOString().slice(0, 10))}` : "noch nicht"}</dd>
              {b.rabattCode ? (
                <>
                  <dt className="text-dunkel">Rabattcode</dt>
                  <dd className="zahl">
                    {b.rabattCode} ({euroMinus(b.rabattCodeCent)})
                  </dd>
                </>
              ) : null}
              <dt className="text-dunkel">Rechnung</dt>
              <dd>
                {b.stripeRechnungUrl ? (
                  <a href={b.stripeRechnungUrl} className="textlink" target="_blank" rel="noreferrer">
                    bei Stripe öffnen
                  </a>
                ) : (
                  "wird von Stripe erstellt"
                )}
              </dd>
              <dt className="text-dunkel">B2B bestätigt</dt>
              <dd>{b.b2bBestaetigt ? "ja" : "nein"}</dd>
            </dl>
            {b.kundenNotiz ? (
              <p className="klein mt-3 border-l-2 border-salbei pl-3">
                <span className="label text-dunkel">Notiz des Kunden</span>
                <br />
                <span className="whitespace-pre-wrap">{b.kundenNotiz}</span>
              </p>
            ) : null}
          </Block>

          <Block titel="Interne Notiz">
            <Formular aktion={bestellungNotiz} className="space-y-3">
              <input type="hidden" name="id" value={b.id} />
              <label htmlFor="notiz" className="nur-sr">
                Interne Notiz
              </label>
              <textarea id="notiz" name="notiz" rows={4} defaultValue={b.interneNotiz} className={feldKlein} />
              <Absenden>Notiz speichern</Absenden>
            </Formular>
          </Block>

          <Block titel="Mails">
            {mails.length === 0 ? (
              <p className="klein text-dunkel">Noch keine Mail zu dieser Bestellung.</p>
            ) : (
              <ul className="klein space-y-1.5">
                {mails.map((m) => (
                  <li key={m.id} className={m.status === "fehler" ? "text-signal" : ""}>
                    <span className="zahl text-dunkel">{datumZahl(m.createdAt.toISOString().slice(0, 10))}</span> · {m.betreff} → {m.an}
                    {m.status === "fehler" ? ` · Fehler: ${m.fehler}` : m.status === "lokal" ? " · lokal abgelegt" : ""}
                  </li>
                ))}
              </ul>
            )}
            {b.bezahltAm ? (
              <Formular aktion={bestaetigungErneut} className="mt-3 flex flex-wrap">
                <input type="hidden" name="id" value={b.id} />
                <Absenden className="textlink klein">Bestellbestätigung erneut senden</Absenden>
              </Formular>
            ) : null}
          </Block>

          {b.stripePaymentIntentId && erstattbar > 0 ? (
            <Block titel="Erstattung über Stripe">
              <Formular aktion={erstatten} bestaetigen="Erstattung jetzt bei Stripe auslösen? Das lässt sich nicht rückgängig machen." className="space-y-3">
                <input type="hidden" name="id" value={b.id} />
                <p className="klein text-dunkel">Erstattbar: {euro(erstattbar, { immerCent: true })}. Die Stripe-Gebühr der ursprünglichen Zahlung wird nicht zurückerstattet.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="betrag" className="feldname">
                      Betrag (€), leer = alles
                    </label>
                    <input id="betrag" name="betrag" inputMode="decimal" className={feldKlein} />
                  </div>
                  <div>
                    <label htmlFor="bestaetigung" className="feldname">
                      Zur Bestätigung: ERSTATTEN
                    </label>
                    <input id="bestaetigung" name="bestaetigung" autoComplete="off" className={feldKlein} />
                  </div>
                </div>
                <Absenden className={`${knopfKlein} knopf-hell`}>Erstatten</Absenden>
              </Formular>
            </Block>
          ) : null}
        </div>
      </div>
    </Seite>
  );
}
