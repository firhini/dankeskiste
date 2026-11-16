import type { Metadata } from "next";
import Link from "next/link";
import { erfordereAdmin } from "@/auth";
import { Ampel, Block, Kennzahl, Leer, Seite, StatusMarke, Tabelle } from "@/components/admin/ui";
import { datumLang, heuteBerlin, lieferStatus, tageBis } from "@/lib/calc/deadlines";
import { euro, prozent } from "@/lib/geld";
import { ladeBoxenMitKalkulation, ladeKampagnen, ladeUebersicht } from "@/lib/server/admin-daten";
import { ladeEinstellungenFrisch } from "@/lib/server/einstellungen";
import type { BestellStatus } from "../../../../db/schema";

/** Admin-Seiten rendern bewusst blockierend auf dem Server (kein Prerender, keine Sofort-Navigation). */
export const instant = false;

export const metadata: Metadata = { title: "Übersicht" };

function Balken({ daten }: { daten: { woche: string; umsatz: number; n: number }[] }) {
  if (daten.length === 0) return <Leer>Noch keine bezahlten Bestellungen in den letzten zwölf Wochen.</Leer>;
  const max = Math.max(...daten.map((d) => d.umsatz), 1);
  const b = 100 / daten.length;
  return (
    <figure>
      <svg viewBox="0 0 100 44" preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label={`Umsatz je Woche, höchster Wert ${euro(max)}`}>
        <line x1="0" y1="40" x2="100" y2="40" stroke="var(--color-salbei)" strokeWidth="0.3" />
        {daten.map((d, i) => {
          const h = Math.max(0.6, (d.umsatz / max) * 38);
          return <rect key={d.woche} x={i * b + b * 0.18} y={40 - h} width={b * 0.64} height={h} fill="var(--color-oliv)" />;
        })}
      </svg>
      <figcaption className="klein zahl mt-1 flex justify-between text-dunkel">
        <span>KW ab {daten[0].woche.slice(8)}.{daten[0].woche.slice(5, 7)}.</span>
        <span>Spitze: {euro(max)}</span>
        <span>KW ab {daten.at(-1)!.woche.slice(8)}.{daten.at(-1)!.woche.slice(5, 7)}.</span>
      </figcaption>
    </figure>
  );
}

const ABLAUF: BestellStatus[] = ["neu", "eingekauft", "gepackt", "versendet", "geliefert", "abgeschlossen"];

export default async function Uebersicht() {
  await erfordereAdmin();
  const heute = heuteBerlin();
  const e = await ladeEinstellungenFrisch();
  const [u, boxen, kampagnen] = await Promise.all([ladeUebersicht(heute), ladeBoxenMitKalkulation(e), ladeKampagnen()]);
  const { geplant, echt, zeilen } = u.jahrAuswertung;
  const vStatus = lieferStatus("versand", heute, e.fristen);
  const pStatus = lieferStatus("persoenlich", heute, e.fristen);
  const schwach = boxen.filter((b) => b.box.aktiv && b.kalk.margeProzent < e.margen.zielProzent);
  const hinweise: [string, string, string][] = [];
  if (u.zahlungAusstehend) hinweise.push([`${u.zahlungAusstehend} Bestellung(en) warten auf Zahlungseingang`, "/admin/bestellungen?status=zahlung_ausstehend", "ansehen"]);
  if (u.anfragenOffen) hinweise.push([`${u.anfragenOffen} offene Anfrage(n)`, "/admin/anfragen", "beantworten"]);
  if (schwach.length) hinweise.push([`${schwach.length} aktive Box(en) unter ${e.margen.zielProzent} % Marge`, "/admin/boxen", "prüfen"]);
  if (u.preiseAlt) hinweise.push([`${u.preiseAlt} Artikelpreis(e) seit über 30 Tagen nicht geprüft`, "/admin/artikel?filter=alt", "prüfen"]);
  if (u.knapp) hinweise.push([`${u.knapp} Artikel unter Mindestbestand`, "/admin/bestand", "ansehen"]);
  if (u.allergeneOffen) hinweise.push([`${u.allergeneOffen} Artikel ohne geprüfte Allergenangaben (im Shop steht dort nur ein Hinweis)`, "/admin/artikel?filter=allergene", "ergänzen"]);

  return (
    <Seite titel="Übersicht" hinweis={`Jahr ${u.jahr} · „echt“ rechnet mit bezahlten Einkaufspreisen, tatsächlichen Versandkosten und der Stripe-Gebühr, sobald sie vorliegen.`}>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl name="Umsatz" wert={euro(echt.umsatzCent)} unter={`${zeilen.length} Bestellungen`} />
        <Kennzahl name="Gewinn echt" wert={euro(echt.gewinnCent)} unter={`geplant ${euro(geplant.gewinnCent)} · ${prozent(echt.margeProzent)}`} ton={echt.gewinnCent < 0 ? "rot" : undefined} />
        <Kennzahl name="Offene Pakete" wert={u.offenePakete.pakete} unter={`${u.offenePakete.lieferungen} persönliche Lieferung(en)`} />
        <Kennzahl name="Sonstige Ausgaben" wert={euro(u.jahrAuswertung.gemeinkostenCent)} unter="auf Bestellungen umgelegt" />
      </div>

      {hinweise.length ? (
        <Block titel="Zu erledigen">
          <ul className="klein space-y-2">
            {hinweise.map(([text, href, tun]) => (
              <li key={href + text} className="flex flex-wrap justify-between gap-x-4">
                <span>{text}</span>
                <Link href={href} className="textlink">
                  {tun}
                </Link>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      <div className="grid gap-x-6 lg:grid-cols-2">
        <Block titel="Bestellungen nach Status">
          <ol className="flex flex-wrap gap-x-2 gap-y-3">
            {ABLAUF.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <Link href={`/admin/bestellungen?status=${s}`} className="flex items-center gap-2 no-underline">
                  <span className="zahl font-serif text-2xl">{u.status[s] ?? 0}</span>
                  <StatusMarke status={s} />
                </Link>
                {i < ABLAUF.length - 1 ? <span aria-hidden className="text-salbei">→</span> : null}
              </li>
            ))}
          </ol>
          {u.status.storniert ? <p className="klein mt-3 text-dunkel">Storniert: {u.status.storniert}</p> : null}
        </Block>

        <Block titel={`Bestellschlüsse · ${e.fristen.saisonName}`}>
          {e.fristen.aktiv ? (
            <dl className="klein grid grid-cols-[1fr_auto] gap-x-4 gap-y-2">
              <dt>Versand – Bestellschluss {datumLang(e.fristen.versand.bestellschluss)}</dt>
              <dd className="zahl text-right font-semibold">{vStatus.verfuegbar && vStatus.saison ? `noch ${tageBis(heute, e.fristen.versand.bestellschluss)} Tage` : vStatus.verfuegbar ? "Saison vorbei" : "geschlossen"}</dd>
              <dt>Persönlich – Bestellschluss {datumLang(e.fristen.persoenlich.bestellschluss)}</dt>
              <dd className="zahl text-right font-semibold">{pStatus.verfuegbar && pStatus.saison ? `noch ${tageBis(heute, e.fristen.persoenlich.bestellschluss)} Tage` : pStatus.verfuegbar ? "Saison vorbei" : "geschlossen"}</dd>
              <dt>Lieferfenster persönlich</dt>
              <dd className="zahl text-right">{datumLang(e.fristen.persoenlich.fensterVon)} – {datumLang(e.fristen.persoenlich.fensterBis)}</dd>
              <dt>Wieder bestellbar ab</dt>
              <dd className="zahl text-right">{datumLang(e.fristen.wiederAb, true)}</dd>
            </dl>
          ) : (
            <p className="klein">Keine Saisonfristen aktiv – es gilt die normale Vorlaufzeit.</p>
          )}
        </Block>

        <Block titel="Umsatz je Woche (12 Wochen)">
          <Balken daten={u.wochen} />
        </Block>

        <Block titel="Kleinunternehmer-Grenze (§ 19 UStG)">
          <p className="klein mb-3">
            Jahresumsatz {u.jahr}: <strong className="zahl">{euro(echt.umsatzCent)}</strong>. Bis 25.000&nbsp;€ bleibt die Regelung auch im Folgejahr; ab 100.000&nbsp;€ entfällt sie sofort.
          </p>
          <div className="h-3 w-full border border-salbei" role="img" aria-label={`${Math.round((echt.umsatzCent / 2_500_000) * 100)} % von 25.000 Euro`}>
            <div className={`h-full ${echt.umsatzCent > 2_500_000 ? "bg-signal" : "bg-oliv"}`} style={{ width: `${Math.min(100, (echt.umsatzCent / 2_500_000) * 100)}%` }} />
          </div>
          <p className="klein zahl mt-1 text-dunkel">{prozent((echt.umsatzCent / 2_500_000) * 100, 0)} von 25.000&nbsp;€</p>
        </Block>

        <Block titel="Bestseller">
          {u.bestseller.length === 0 ? (
            <Leer>Noch keine Verkäufe.</Leer>
          ) : (
            <ul className="space-y-2.5">
              {u.bestseller.map((b) => (
                <li key={b.name}>
                  <div className="klein flex justify-between gap-3">
                    <span>{b.name}</span>
                    <span className="zahl whitespace-nowrap">{b.menge}&nbsp;Stück · {euro(b.umsatz)}</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-salbei/40">
                    <div className="h-full bg-dunkel" style={{ width: `${(b.menge / u.bestseller[0].menge) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block titel="Umsatz nach Kampagne" rechts={<Link href="/admin/kampagnen" className="textlink klein">alle</Link>}>
          {kampagnen.length === 0 ? (
            <Leer>Noch keine Kampagne angelegt.</Leer>
          ) : (
            <Tabelle kopf={["Kampagne", "Scans", "Best.", "Umsatz", "ROI"]} className="[&_table]:!min-w-0">
              {kampagnen.slice(0, 6).map((k) => (
                <tr key={k.kampagne.id}>
                  <td>{k.kampagne.name}</td>
                  <td className="zahl">{k.scans}</td>
                  <td className="zahl">{k.bestellungen}</td>
                  <td className="zahl whitespace-nowrap">{euro(k.umsatzCent)}</td>
                  <td className="zahl whitespace-nowrap">{k.roiProzent == null ? "–" : prozent(k.roiProzent, 0)}</td>
                </tr>
              ))}
            </Tabelle>
          )}
        </Block>
      </div>

      <Block titel="Marge pro Box" rechts={<Link href="/admin/boxen" className="textlink klein">Boxen bearbeiten</Link>}>
        <Tabelle kopf={["Box", "Preis", "Einkauf", "Verpackung", "Gebühr", "Rohertrag", "Marge"]}>
          {boxen
            .filter((b) => b.box.aktiv)
            .sort((a, b) => a.kalk.margeProzent - b.kalk.margeProzent)
            .map((b) => (
              <tr key={b.box.id}>
                <td>
                  <Link href={`/admin/boxen/${b.box.id}`} className="textlink">
                    {b.box.name}
                  </Link>
                </td>
                <td className="zahl whitespace-nowrap">{euro(b.kalk.preisCent)}</td>
                <td className="zahl whitespace-nowrap">{euro(b.kalk.einkaufCent, { immerCent: true })}</td>
                <td className="zahl whitespace-nowrap">{euro(b.kalk.verpackungCent, { immerCent: true })}</td>
                <td className="zahl whitespace-nowrap">{euro(b.kalk.gebuehrCent, { immerCent: true })}</td>
                <td className="zahl whitespace-nowrap">{euro(b.kalk.rohertragCent, { immerCent: true })}</td>
                <td>
                  <Ampel marge={b.kalk.margeProzent} ziel={e.margen.zielProzent} min={e.margen.minProzent} />
                </td>
              </tr>
            ))}
        </Tabelle>
      </Block>
    </Seite>
  );
}
