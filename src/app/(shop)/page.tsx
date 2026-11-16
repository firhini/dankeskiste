import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { AnfrageFormular } from "@/components/shop/anfrage";
import { BoxBild, BoxKarte } from "@/components/shop/box-karte";
import { Faq, type Frage } from "@/components/shop/faq";
import { JsonLd } from "@/components/shop/jsonld";
import { Stempel } from "@/components/shop/stempel";
import { Pfeil } from "@/components/shop/zeichen";
import { datumLang, lieferStatus } from "@/lib/calc/deadlines";
import { PLATZHALTER } from "@/lib/einstellungen";
import { euro } from "@/lib/geld";
import { ladeEinstellungen } from "@/lib/server/einstellungen";
import { ladeKatalog } from "@/lib/server/katalog";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Dankeskiste – Geschenkboxen für Mitarbeiter und Kunden" },
  description: "Geschenkboxen für Firmen ab 5 Stück: von Hand gepackt in Schwetzingen, mit Logo und Grußkarte. Versand deutschlandweit, Lieferung Rhein-Neckar.",
  alternates: { canonical: "/" },
};

const inhaberFoto = existsSync(path.join(process.cwd(), "public/images/inhaber.jpg"));

export default async function Startseite() {
  const [katalog, e] = await Promise.all([ladeKatalog(), ladeEinstellungen()]);
  const { boxen, kollektionen, heute } = katalog;
  const saison = kollektionen.find((k) => k.slug === e.saison.kollektionSlug) ?? kollektionen[0];
  const saisonBoxen = boxen.filter((b) => b.kollektionSlug === saison?.slug);
  const held = saisonBoxen.find((b) => b.bestseller) ?? saisonBoxen[0] ?? boxen[0];
  const weitere = kollektionen.filter((k) => k.slug !== saison?.slug);
  const bestseller = boxen.filter((b) => b.bestseller && b.slug !== held?.slug).slice(0, 3);
  const abPreis = boxen.length ? Math.min(...boxen.map((b) => b.preisCent)) : 0;
  const vStatus = lieferStatus("versand", heute, e.fristen);
  const pStatus = lieferStatus("persoenlich", heute, e.fristen);
  const inSaison = e.fristen.aktiv && vStatus.verfuegbar && vStatus.saison;
  const p = e.personalisierung;
  const geschlossen = held;
  const inhaber = e.kontakt.inhaber !== PLATZHALTER ? e.kontakt.inhaber : null;
  const beispiel = boxen.find((b) => b.preisCent === 4500) ?? held;

  const fragen: Frage[] = [
    { frage: "Ab wie vielen Boxen kann ich bestellen?", text: `Ab ${e.mindestmenge} Boxen. Sie können verschiedene Boxen mischen – zum Beispiel drei kleine für Aushilfen und zwei große für die Teamleitung.` },
    { frage: "Sind das Netto- oder Bruttopreise?", text: "Weder noch: Dankeskiste ist Kleinunternehmer nach § 19 UStG und berechnet keine Umsatzsteuer. Der angezeigte Preis ist der Betrag, der auf Ihrer Rechnung steht. Vorsteuer können Sie daraus nicht ziehen." },
    { frage: "Wie kommt unser Logo auf die Box?", text: "Sie laden das Logo bei der Bestellung hoch (PNG, JPG, SVG oder PDF, bis 5 MB). Ich drucke es auf runde Sticker mit 5 cm Durchmesser und klebe einen auf jeden Deckel. Das ist im Preis enthalten, ebenso die gedruckte Grußkarte mit Ihrem Text." },
    { frage: "Können Sie direkt an Mitarbeiter im Homeoffice versenden?", text: "Ja. Sie laden eine Tabelle mit Namen und Adressen hoch (eine Vorlage gibt es in der Bestellung), jede Box geht als eigenes DHL-Paket raus. Die Versandkosten fallen dann je Adresse an. Sendungsnummern bekommen Sie per Mail." },
    { frage: "Gibt es die Boxen auch ohne Alkohol?", text: "Die meisten Boxen enthalten ohnehin keinen Alkohol. Wo Wein oder Sekt dabei ist, tauschen wir ihn auf Wunsch gegen ein alkoholfreies Getränk – ein Haken in der Bestellung genügt, der Preis bleibt gleich. Beim Versand an mehrere Privatadressen packen wir grundsätzlich alkoholfrei." },
    { frage: "Was ist mit Allergien und Unverträglichkeiten?", text: "Alle Lebensmittel sind original verpackt und vom Hersteller gekennzeichnet; nichts wird umgefüllt. Auf jeder Box-Seite steht, welche Artikel enthalten sind. Maßgeblich sind die Angaben auf den Packungen. Wenn jemand im Team etwas nicht verträgt, schreiben Sie es in die Notiz – ich tausche den Artikel aus." },
    { frage: "Wie bezahle ich und bekomme ich eine Rechnung?", text: "Sie bezahlen am Ende der Bestellung sicher über Stripe, zum Beispiel mit Firmenkarte oder SEPA-Lastschrift. Die Rechnung auf Ihren Firmennamen kommt sofort per E-Mail. Für größere Bestellungen auf Rechnung nutzen Sie bitte das Anfrageformular." },
    { frage: "Sind die Boxen steuerlich absetzbar?", text: "Allgemein gilt: Geschenke an Geschäftspartner sind bis 50 € je Empfänger und Jahr als Betriebsausgabe abziehbar, für Mitarbeiter gibt es die monatliche Sachbezugsfreigrenze von 50 €. Deshalb liegen viele Boxen bewusst darunter. Was für Ihr Unternehmen gilt, klärt Ihr Steuerberater." },
    { frage: "Verkaufen Sie auch an Privatpersonen?", text: "Nein. Das Angebot richtet sich ausschließlich an Unternehmer im Sinne von § 14 BGB – also an Firmen, Selbstständige, Vereine und Behörden." },
    { frage: "Kann ich vorher eine Musterbox sehen?", text: "Ja, bei geplanten Bestellungen ab etwa 25 Boxen. Schreiben Sie kurz über das Anfrageformular, welche Box Sie interessiert." },
  ];

  return (
    <>
      {/* ── Hero ── */}
      <section className="rand pb-14 pt-10 lg:pb-24 lg:pt-16">
        <div className="raster items-end gap-y-10">
          <div className="col-span-12 lg:col-span-7 lg:pb-6">
            <p className="label einblenden text-dunkel">
              {inSaison ? `${e.fristen.saisonName} · ` : ""}Geschenkboxen für Firmen
            </p>
            <h1 className="einblenden einblenden-2 mt-5 text-oliv">
              Ein Dankeschön, das jemand <em>von Hand</em> gepackt hat.
            </h1>
            <p className="lead einblenden einblenden-3 mt-7 max-w-[34ch] lg:max-w-[40ch]">
              Geschenkboxen für Mitarbeiter und Kunden – ab {e.mindestmenge}&nbsp;Stück, mit Ihrem Logo auf dem Deckel und Ihrem Text auf der Karte. Eingekauft und gepackt in Schwetzingen.
            </p>
            <div className="einblenden einblenden-3 mt-8 flex flex-wrap gap-3">
              <Link href={saison ? `/kollektionen/${saison.slug}` : "/boxen"} className="knopf">
                {saison ? `${saison.name}: Boxen ansehen` : "Boxen ansehen"} <Pfeil />
              </Link>
              <Link href="#anfrage" className="knopf knopf-hell">
                Angebot anfragen
              </Link>
            </div>
          </div>
          <div className="relative col-span-12 lg:col-span-5">
            {held ? (
              <>
                <div className="overflow-hidden rounded-[2px] bg-salbei/25">
                  <BoxBild box={held} sizes="(min-width: 1024px) 40vw, 92vw" prio className="aspect-[4/3] w-full lg:aspect-[4/5]" />
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-4">
                  <p className="klein">
                    <Link href={`/boxen/${held.slug}`} className="textlink">{held.name}</Link>, {euro(held.preisCent)}
                  </p>
                  {held.bilder.some((b) => b.platzhalter) ? <p className="label text-dunkel">Beispielabbildung</p> : null}
                </div>
              </>
            ) : null}
            <Stempel className="absolute -left-3 -top-8 h-24 w-24 -rotate-12 rounded-full bg-creme text-dunkel sm:-left-10 sm:h-32 sm:w-32 lg:-left-16 lg:-top-10" />
          </div>
        </div>
        <dl className="mt-12 grid grid-cols-2 border-t border-salbei lg:mt-20 lg:grid-cols-4">
          {[
            ["Preis je Box", `ab ${euro(abPreis)}`, "ohne Umsatzsteuer (§ 19 UStG)"],
            ["Mindestmenge", `${e.mindestmenge} Boxen`, "frei mischbar"],
            ["Inklusive", "Logo & Karte", "Sticker und gedruckter Gruß"],
            inSaison ? ["Bestellschluss Versand", datumLang(e.fristen.versand.bestellschluss), `Zustellung bis ${datumLang(e.fristen.versand.lieferungBis)}`] : ["Versand", `in ${e.fristen.vorlaufVersandWerktage} Werktagen`, "deutschlandweit mit DHL"],
          ].map(([name, wert, unter], i) => (
            <div key={name} className={`border-b border-salbei py-5 lg:border-b-0 lg:py-6 ${i % 2 === 1 ? "border-l pl-4 lg:pl-6" : ""} ${i === 2 ? "lg:border-l lg:pl-6" : ""}`}>
              <dt className="label text-dunkel">{name}</dt>
              <dd className="zahl mt-2 font-serif text-[clamp(1.35rem,1.1rem+1.1vw,2rem)] leading-tight">{wert}</dd>
              <dd className="klein mt-1">{unter}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Saison-Kollektion ── */}
      {saison && saisonBoxen.length ? (
        <section className="rand abschnitt border-t border-salbei" aria-labelledby="saison-titel">
          <div className="raster mb-10 gap-y-4 lg:mb-14">
            <h2 id="saison-titel" className="col-span-12 text-oliv lg:col-span-6">
              {saison.name}: <em>{saison.kurz.split(" – ")[0].replace(/\.$/, "")}</em>
            </h2>
            <p className="mass col-span-12 lg:col-span-5 lg:col-start-8 lg:pt-3">{saison.beschreibung}</p>
          </div>
          <div className="raster gap-y-12">
            {saisonBoxen.map((b, i) => (
              <div key={b.slug} className={i === 0 ? "col-span-12 lg:col-span-7" : i === 1 ? "col-span-12 sm:col-span-6 lg:col-span-5 lg:pt-16" : "col-span-12 sm:col-span-6 lg:col-span-4"}>
                <BoxKarte box={b} gross={i === 0} sizes={i === 0 ? "(min-width: 1024px) 56vw, 92vw" : undefined} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Weitere Kollektionen ── */}
      {weitere.length ? (
        <section className="rand abschnitt border-t border-salbei" aria-labelledby="koll-titel">
          <div className="raster gap-y-8">
            <div className="col-span-12 lg:col-span-4">
              <p className="label text-dunkel">Das ganze Jahr</p>
              <h2 id="koll-titel" className="mt-4 text-oliv">
                Anlässe gibt es <em>nicht nur</em> im Dezember.
              </h2>
            </div>
            <ul className="col-span-12 border-t border-salbei lg:col-span-7 lg:col-start-6">
              {weitere.map((k) => {
                const ks = boxen.filter((b) => b.kollektionSlug === k.slug);
                return (
                  <li key={k.slug} className="group relative border-b border-salbei py-7">
                    <div className="flex items-baseline justify-between gap-6">
                      <h3 className="!text-[clamp(1.6rem,1.3rem+1.5vw,2.5rem)]">
                        <Link href={`/kollektionen/${k.slug}`} className="no-underline after:absolute after:inset-0">{k.name}</Link>
                      </h3>
                      <span className="zahl klein whitespace-nowrap text-dunkel">
                        {ks.length}&nbsp;{ks.length === 1 ? "Box" : "Boxen"} · ab {euro(Math.min(...ks.map((b) => b.preisCent)))}
                      </span>
                    </div>
                    <p className="mt-2 max-w-[52ch]">{k.kurz}</p>
                    <p className="klein mt-2 text-dunkel">{ks.map((b) => b.name).join(" · ")}</p>
                    <Pfeil className="absolute bottom-7 right-0 h-5 w-5 text-dunkel transition-transform duration-200 group-hover:translate-x-1" />
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ── Bestseller ── */}
      {bestseller.length ? (
        <section className="rand abschnitt border-t border-salbei" aria-labelledby="best-titel">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 id="best-titel" className="text-oliv">Am häufigsten <em>bestellt</em></h2>
            <Link href="/boxen" className="textlink">Alle {boxen.length} Boxen ansehen</Link>
          </div>
          <div className="raster gap-y-12">
            {bestseller.map((b) => (
              <div key={b.slug} className="col-span-12 sm:col-span-6 lg:col-span-4">
                <BoxKarte box={b} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── So läuft’s ── */}
      <section className="rand abschnitt border-t border-salbei" aria-labelledby="ablauf-titel">
        <div className="raster gap-y-10">
          <h2 id="ablauf-titel" className="col-span-12 text-oliv lg:col-span-5">
            So läuft’s – <em>drei Schritte,</em> zehn Minuten.
          </h2>
          <ol className="col-span-12 lg:col-span-6 lg:col-start-7">
            {[
              ["Boxen wählen", `Sie stellen ab ${e.mindestmenge} Boxen zusammen, laden Ihr Logo hoch und schreiben den Text für die Karte. Die Summe sehen Sie die ganze Zeit.`],
              ["Wir kaufen ein und packen", "Jede Box wird einzeln gepackt: Holzwolle, Artikel, Seidenpapier, Karte, Band, Sticker. Nichts kommt vom Fließband."],
              ["Versand oder Lieferung", "Mit DHL an Ihre Firma oder an jede Adresse einzeln. In Schwetzingen, Mannheim, Heidelberg und Umgebung bringe ich die Boxen persönlich vorbei."],
            ].map(([titel, text], i) => (
              <li key={titel} className="grid grid-cols-[auto_1fr] gap-x-6 border-t border-salbei py-7 last:border-b sm:gap-x-10">
                <span className="ziffer text-salbei" aria-hidden>0{i + 1}</span>
                <div className="pt-1">
                  <h3 className="!text-[1.5rem]">{titel}</h3>
                  <p className="mt-2 max-w-[48ch]">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Personalisierung (dunkel) ── */}
      <section className="auf-dunkel bg-dunkel text-creme" aria-labelledby="perso-titel">
        <div className="rand abschnitt raster gap-y-12">
          <div className="col-span-12 lg:col-span-6">
            <p className="label">Personalisierung</p>
            <h2 id="perso-titel" className="mt-4">
              Ihr Logo auf dem Deckel. <em>Ohne Aufpreis,</em> schon ab {e.mindestmenge}&nbsp;Boxen.
            </h2>
            <p className="mt-6 max-w-[50ch]">
              Anderswo gibt es das Firmenlogo oft erst ab 25 oder 50 Stück. Hier gehören Logo-Sticker und gedruckte Grußkarte zu jeder Box. Wer mehr möchte, wählt dazu:
            </p>
            <table className="mt-8 w-full">
              <caption className="nur-sr">Optionen für die Personalisierung mit Preis je Box</caption>
              <tbody>
                {[
                  ["Logo-Sticker auf dem Deckel, 5 cm", "inklusive"],
                  ["Gedruckte Grußkarte mit Ihrem Text", "inklusive"],
                  ["Bandfarbe: " + p.bandfarben.map((b) => b.name).join(", "), "inklusive"],
                  ["Karte von Hand geschrieben", `+ ${euro(p.handgeschrieben.preisCent, { immerCent: true })}`],
                  ["Banderole mit Logo um die Box", `+ ${euro(p.banderole.preisCent, { immerCent: true })}`],
                  ["Namensanhänger je Empfänger", `+ ${euro(p.namensanhaenger.preisCent, { immerCent: true })}`],
                ].map(([name, preis]) => (
                  <tr key={name} className="border-t border-creme/25 last:border-b">
                    <th scope="row" className="py-3.5 pr-4 text-left font-normal">{name}</th>
                    <td className="zahl whitespace-nowrap py-3.5 text-right font-semibold">{preis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="klein mt-4">Preise je Box. <Link href="/firmengeschenke-mit-logo" className="underline decoration-salbei underline-offset-4">Mehr zur Personalisierung</Link></p>
          </div>
          <div className="col-span-12 lg:col-span-5 lg:col-start-8">
            {geschlossen ? (
              <>
                <div className="overflow-hidden rounded-[2px]">
                  <BoxBild box={geschlossen} art="geschlossen" sizes="(min-width: 1024px) 40vw, 92vw" className="aspect-[4/3] w-full lg:aspect-[4/5]" />
                </div>
                <p className="klein mt-3">Der Sticker zeigt, wo Ihr Logo sitzt.{geschlossen.bilder.some((b) => b.platzhalter) ? " Beispielabbildung – echte Fotos folgen." : ""}</p>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── Mengenrabatt ── */}
      <section className="rand abschnitt" aria-labelledby="rabatt-titel">
        <div className="raster gap-y-10">
          <div className="col-span-12 lg:col-span-5">
            <h2 id="rabatt-titel" className="text-oliv">Je mehr Boxen, <em>desto weniger</em> je Box.</h2>
            <p className="mass mt-6">
              Der Rabatt gilt für alle Boxen einer Bestellung zusammen, auch gemischt. Er wird automatisch abgezogen – Sie sehen ihn in der Zusammenfassung, bevor Sie bezahlen.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-6 lg:col-start-7">
            <table className="w-full">
              <caption className="nur-sr">Mengenrabatt nach Anzahl der Boxen{beispiel ? `, mit Beispielpreis für die Box „${beispiel.name}“` : ""}</caption>
              <thead>
                <tr className="label border-b border-ink text-left text-dunkel">
                  <th scope="col" className="py-3 pr-3">Boxen</th>
                  <th scope="col" className="py-3 pr-3 text-right">Rabatt</th>
                  {beispiel ? <th scope="col" className="py-3 text-right">z.&nbsp;B. {beispiel.name}</th> : null}
                </tr>
              </thead>
              <tbody className="zahl">
                <tr className="border-b border-salbei">
                  <td className="py-3.5 pr-3">{e.mindestmenge}–{e.staffeln[0] ? e.staffeln[0].ab - 1 : "∞"}</td>
                  <td className="py-3.5 pr-3 text-right">–</td>
                  {beispiel ? <td className="py-3.5 text-right">{euro(beispiel.preisCent, { immerCent: true })}</td> : null}
                </tr>
                {e.staffeln.map((s, i) => (
                  <tr key={s.ab} className="border-b border-salbei">
                    <td className="py-3.5 pr-3">{e.staffeln[i + 1] ? `${s.ab}–${e.staffeln[i + 1].ab - 1}` : `ab ${s.ab}`}</td>
                    <td className="py-3.5 pr-3 text-right font-semibold">−{String(s.prozent).replace(".", ",")}&nbsp;%</td>
                    {beispiel ? <td className="py-3.5 text-right">{euro(Math.round(beispiel.preisCent * (1 - s.prozent / 100)), { immerCent: true })}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="klein mt-4">Mehr als 250 Boxen oder Sonderwünsche? <Link href="#anfrage" className="textlink">Fragen Sie ein Angebot an.</Link></p>
          </div>
        </div>
      </section>

      {/* ── Lieferung & Fristen ── */}
      <section id="lieferung" className="rand abschnitt scroll-mt-20 border-t border-salbei" aria-labelledby="liefer-titel">
        <h2 id="liefer-titel" className="max-w-[18ch] text-oliv">Zwei Wege <em>zu Ihnen</em></h2>
        <div className="raster mt-10 gap-y-10 lg:mt-14">
          <article className="col-span-12 border-t border-ink pt-6 lg:col-span-6">
            <p className="label text-dunkel">Deutschlandweit</p>
            <h3 className="mt-3">Versand mit DHL</h3>
            <p className="mt-4 max-w-[46ch]">An Ihre Firmenadresse im Sammelpaket – oder einzeln an jeden Empfänger, etwa ins Homeoffice. Die Kosten richten sich nach dem Gewicht.</p>
            <dl className="klein zahl mt-6 grid grid-cols-[1fr_auto] gap-y-2 border-t border-salbei pt-4">
              {e.versand.stufen.slice(0, 3).map((s) => (
                <div key={s.bisGramm} className="contents">
                  <dt>Paket bis {s.bisGramm / 1000}&nbsp;kg</dt>
                  <dd className="text-right font-semibold">{euro(s.preisCent, { immerCent: true })}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 border-l-2 border-dunkel pl-4">
              {!e.fristen.aktiv || (vStatus.verfuegbar && !vStatus.saison) ? (
                <>Versand innerhalb von {e.fristen.vorlaufVersandWerktage}&nbsp;Werktagen nach Bestellung.</>
              ) : vStatus.verfuegbar ? (
                <>Bestellschluss für {e.fristen.saisonName.replace(/\s*\d{4}$/, "")}: <strong>{datumLang(e.fristen.versand.bestellschluss)}</strong>. Zustellung bis {datumLang(e.fristen.versand.lieferungBis)}.</>
              ) : (
                <>Der Bestellschluss für den Versand war am {datumLang(e.fristen.versand.bestellschluss)}. Ab {datumLang(e.fristen.wiederAb)} versenden wir wieder – <Link href="#anfrage" className="textlink">oder Sie fragen kurz an</Link>, ob noch etwas geht.</>
              )}
            </p>
          </article>
          <article className="col-span-12 border-t border-ink pt-6 lg:col-span-5 lg:col-start-8">
            <p className="label text-dunkel">Rhein-Neckar</p>
            <h3 className="mt-3">Persönliche Lieferung</h3>
            <p className="mt-4 max-w-[46ch]">In Schwetzingen, Mannheim, Heidelberg und den Orten dazwischen bringe ich Ihre Boxen selbst – an einem Tag, den Sie aussuchen. Kein Karton, kein Bruch.</p>
            <dl className="klein zahl mt-6 grid grid-cols-[1fr_auto] gap-y-2 border-t border-salbei pt-4">
              <dt>Lieferung</dt>
              <dd className="text-right font-semibold">{euro(e.lieferung.gebuehrCent, { immerCent: true })}</dd>
              <dt>ab {euro(e.lieferung.freiAbCent)} Warenwert</dt>
              <dd className="text-right font-semibold">kostenlos</dd>
            </dl>
            <p className="mt-6 border-l-2 border-dunkel pl-4">
              {!e.fristen.aktiv || (pStatus.verfuegbar && !pStatus.saison) ? (
                <>Liefertag frei wählbar, frühestens {e.fristen.vorlaufPersoenlichWerktage}&nbsp;Werktage nach Bestellung.</>
              ) : pStatus.verfuegbar ? (
                <>Bestellschluss: <strong>{datumLang(e.fristen.persoenlich.bestellschluss)}</strong>. Lieferung vor dem Fest vom {datumLang(e.fristen.persoenlich.fensterVon)} bis {datumLang(e.fristen.persoenlich.fensterBis)}.</>
              ) : (
                <>Der Bestellschluss war am {datumLang(e.fristen.persoenlich.bestellschluss)}. Ab {datumLang(e.fristen.wiederAb)} liefere ich wieder – <Link href="#anfrage" className="textlink">oder Sie fragen kurz an.</Link></>
              )}
            </p>
            <p className="klein mt-4"><Link href="/lieferung-schwetzingen-mannheim-heidelberg" className="textlink">Liefergebiet und Postleitzahlen</Link></p>
          </article>
        </div>
      </section>

      {/* ── Wer packt Ihre Kiste? ── */}
      <section className="rand abschnitt border-t border-salbei" aria-labelledby="wer-titel">
        <div className="raster items-start gap-y-10">
          <div className="col-span-8 col-start-3 sm:col-span-5 sm:col-start-1 lg:col-span-4">
            {inhaberFoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/images/inhaber.jpg" alt={inhaber ? `${inhaber} beim Packen einer Dankeskiste` : "Der Inhaber beim Packen einer Dankeskiste"} width={800} height={1000} loading="lazy" className="aspect-[4/5] w-full rounded-[2px] object-cover" />
            ) : (
              <div className="flex aspect-[4/5] w-full items-center justify-center rounded-[2px] border border-salbei" role="img" aria-label="Platz für ein Foto des Inhabers">
                <span className="label px-6 text-center text-dunkel">Foto folgt<br />vor Livegang einsetzen</span>
              </div>
            )}
          </div>
          <div className="col-span-12 sm:col-span-7 lg:col-span-6 lg:col-start-6">
            <h2 id="wer-titel" className="text-oliv">Wer packt <em>Ihre Kiste?</em></h2>
            <div className="mass mt-6 space-y-4">
              <p>Ich. Jede einzelne. Dankeskiste ist kein Versandzentrum, sondern ein großer Tisch in Schwetzingen, ein Stapel Kartons und ein Sack Holzwolle.</p>
              <p>Ich kaufe die Sachen selbst ein, hier in der Kurpfalz, und zwar erst dann, wenn Ihre Bestellung da ist. Deshalb ist nichts monatelang gelagert. Wenn im Regal etwas fehlt, rufe ich Sie an, statt stillschweigend etwas anderes einzupacken.</p>
              <p>Und wenn Sie eine Frage haben, landen Sie nicht in einer Warteschleife, sondern bei mir.</p>
            </div>
            <p className="mt-8 font-serif text-[2rem] italic leading-none text-dunkel">{inhaber ?? "Ihr Name"}</p>
            <p className="klein mt-2">{inhaber ? "Inhaber, Dankeskiste" : "Unterschrift und Name – vor Livegang ausfüllen"}</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="rand abschnitt border-t border-salbei" aria-labelledby="faq-titel">
        <div className="raster gap-y-8">
          <h2 id="faq-titel" className="col-span-12 text-oliv lg:col-span-4">Häufige <em>Fragen</em></h2>
          <div className="col-span-12 lg:col-span-7 lg:col-start-6">
            <Faq fragen={fragen} />
          </div>
        </div>
      </section>

      {/* ── Anfrage ── */}
      <section id="anfrage" className="rand abschnitt scroll-mt-20 border-t border-salbei" aria-labelledby="anfrage-titel">
        <div className="raster gap-y-10">
          <div className="col-span-12 lg:col-span-4">
            <h2 id="anfrage-titel" className="text-oliv">Angebot oder <em>Musterbox</em> anfragen</h2>
            <p className="mass mt-6">Für große Stückzahlen, eigene Zusammenstellungen, Zahlung auf Rechnung oder wenn der Bestellschluss schon vorbei ist. Antwort innerhalb eines Werktags.</p>
          </div>
          <div className="col-span-12 lg:col-span-7 lg:col-start-6">
            <AnfrageFormular />
          </div>
        </div>
      </section>

      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "@id": `${SITE_URL}/#organisation`,
          name: "Dankeskiste",
          url: SITE_URL,
          description: "Von Hand gepackte Geschenkboxen für Mitarbeiter und Kunden – ausschließlich für Unternehmen.",
          address: { "@type": "PostalAddress", postalCode: "68723", addressLocality: "Schwetzingen", addressRegion: "Baden-Württemberg", addressCountry: "DE" },
          areaServed: { "@type": "Country", name: "Deutschland" },
          ...(e.kontakt.email !== PLATZHALTER ? { email: e.kontakt.email } : {}),
          ...(e.kontakt.telefon !== PLATZHALTER ? { telephone: e.kontakt.telefon } : {}),
        }}
      />
    </>
  );
}
