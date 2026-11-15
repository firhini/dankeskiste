/**
 * Erzeugt SORTIMENT.md, EINKAUFSLISTE.md und scripts/render/boxes.json aus den Seed-Daten.
 * So stimmen Dokumente, Datenbank und Bilder immer überein. Aufruf: `npm run docs`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { artikel, type SeedArtikel } from "../db/seed-data/artikel";
import { boxen } from "../db/seed-data/boxen";
import { werteBoxAus } from "../db/seed-data/kalkulation";
import { kollektionen } from "../db/seed-data/kollektionen";
import { verpackung } from "../db/seed-data/verpackung";
import { startEinstellungen as E } from "../src/lib/einstellungen";

const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;
const pct = (n: number) => `${n.toFixed(1).replace(".", ",")} %`;
const kg = (g: number) => `${(g / 1000).toFixed(2).replace(".", ",")} kg`;
const datum = (iso: string) => iso.split("-").reverse().join(".");
const statusText = { belegt: "belegt", richtwert: "Richtwert", geschaetzt: "`geschätzt`" } as const;
const link = (a: { quelleUrl: string }) => `[Quelle](${a.quelleUrl})`;
const groesseText = { klein: "klein (24×17×7 cm)", flach: "flach (30,5×21,5×7,4 cm)", mittel: "mittel (30,5×21,5×10 cm)", gross: "groß (33×24×10 cm)" } as const;

const auswertungen = boxen.map(werteBoxAus);
const PRUEF = "15.11.2026";

// ───────────────────────── SORTIMENT.md ─────────────────────────
let s = `# Sortiment

Stand: ${PRUEF} · ${boxen.length} Boxen in ${kollektionen.length} Kollektionen · erzeugt aus \`db/seed-data/*\` mit \`npm run docs\` (nicht von Hand ändern – Daten in den Seed-Dateien oder später im Admin pflegen).

## So lesen Sie die Preise

Jeder Preis hat eine Quelle und das Prüfdatum ${PRUEF}. Wichtig: Die Händlerseiten ließen sich aus der Arbeitsumgebung nicht direkt öffnen; die Preise stammen aus den Suchmaschinen-Auszügen der verlinkten Seiten. Deshalb gibt es drei Stufen:

| Status | Bedeutung |
|---|---|
| belegt | Preis stand auf der Seite des Händlers, bei dem gekauft wird (dm, Rossmann, Lidl, Aldi Süd – bundesweit einheitliche Preise). |
| Richtwert | Preis eines Online-Supermarkts oder Hersteller-Shops (EDEKA24, Knuspr, UVP). Im Markt in Schwetzingen meist gleich oder etwas günstiger, aber nicht bestätigt. |
| \`geschätzt\` | Kein belastbarer Beleg gefunden. Schätzung aus Vergleichswerten – vor dem ersten Einkauf prüfen. |

REWE, Kaufland und EDEKA zeigen online keine Filialpreise für Schwetzingen. Für Markenartikel aus diesen Märkten ist deshalb ein Online-Richtwert angesetzt, der eher über dem Regalpreis liegt – die Kalkulation ist damit vorsichtig. **Erster Schritt vor dem Start:** einmal mit \`EINKAUFSLISTE.md\` durch die Märkte gehen und die Preise im Admin unter „Artikel“ bestätigen (das setzt das Prüfdatum neu).

## Kalkulationsgrundlagen

- **Kleinunternehmer (§ 19 UStG):** Verkaufspreise ohne Umsatzsteuer; Einkaufspreise sind brutto Kosten (kein Vorsteuerabzug).
- **Zahlungsgebühr:** ${String(E.gebuehren.prozent).replace(".", ",")} % + ${eur(E.gebuehren.fixCent)} je Zahlung (Stripe, Premium-/Firmenkarten EWR) plus ${String(E.gebuehren.rechnungProzent).replace(".", ",")} % für die automatische Rechnung (max. ca. ${eur(E.gebuehren.rechnungMaxCent)}). Standardkarten kosten nur 1,5 % + 0,25 €, SEPA-Lastschrift 0,35 € – gerechnet wird mit dem teuersten üblichen Fall. Der Fixbetrag ist auf die Mindestmenge von ${E.mindestmenge} Boxen verteilt. Quellen: [stripe.com/de/pricing](https://stripe.com/en-de/pricing), [Rechnungen nach Zahlung](https://support.stripe.com/questions/pricing-for-post-payment-invoices-for-one-time-purchases-via-checkout-and-payment-links), geprüft ${PRUEF}.
- **Rohertrag** = Verkaufspreis − Artikel − Verpackung − Zahlungsgebühr. Ziel ≥ ${E.margen.zielProzent} %, Untergrenze ${E.margen.minProzent} %. Versandkosten trägt der Kunde gesondert; Packzeit ist ausgewiesen, aber nicht als Kosten angesetzt.
- **Verpackung** je Box: Karton, Holzwolle, Baumwollband, bedruckte Grußkarte, Logo-Sticker, Seidenpapier – siehe Abschnitt „Verpackung“.

## Übersicht

| Box | Kollektion | Preis | Artikel | Verpackung | Gebühr | Rohertrag | Marge | Gewicht | Alkohol | Packzeit |
|---|---|--:|--:|--:|--:|--:|--:|--:|---|--:|
${auswertungen
  .map((a) => {
    const k = a.kalk;
    const koll = kollektionen.find((x) => x.slug === a.box.kollektion)!.name;
    return `| [${a.box.name}](#${a.box.slug}) | ${koll} | ${eur(k.preisCent)} | ${eur(k.einkaufCent)} | ${eur(k.verpackungCent)} | ${eur(k.gebuehrCent)} | ${eur(k.rohertragCent)} | **${pct(k.margeProzent)}** | ${kg(a.gewichtGramm)} | ${a.alkohol ? "ja, abwählbar" : "nein"} | ${a.box.packMinuten} min |`;
  })
  .join("\n")}

Niedrigste Marge: ${pct(Math.min(...auswertungen.map((a) => a.kalk.margeProzent)))} · höchste: ${pct(Math.max(...auswertungen.map((a) => a.kalk.margeProzent)))}. Mit dem höchsten Staffelrabatt (${E.staffeln.at(-1)!.prozent} % ab ${E.staffeln.at(-1)!.ab} Boxen) bleibt jede Box über ${E.margen.minProzent} %:
${(() => {
  const r = E.staffeln.at(-1)!.prozent / 100;
  const min = Math.min(
    ...auswertungen.map((a) => {
      const p = Math.round(a.kalk.preisCent * (1 - r));
      const geb = Math.round(a.kalk.gebuehrCent * (1 - r));
      return ((p - a.kalk.einkaufCent - a.kalk.verpackungCent - geb) / p) * 100;
    }),
  );
  return `niedrigster Wert dann ${pct(min)}.`;
})()}

## Warum diese Kollektionen

- **Weihnachten (6 Boxen, 29–69 €):** drei Preisstufen (29 / 45 / 69 €) plus drei Themenkisten. 45 € ist bewusst gewählt: Geschenke an Geschäftspartner sind nur bis 50 € je Empfänger und Jahr als Betriebsausgabe abziehbar, und die Geschenkverpackung zählt mit ([IHK München](https://www.ihk-muenchen.de/ratgeber/steuern/einkommensteuer-koerperschaftsteuer/sachzuwendungen-an-geschaeftsfreunde-und-arbeitnehmer/)). Mit allen drei Zusatzoptionen (${eur(E.personalisierung.handgeschrieben.preisCent + E.personalisierung.banderole.preisCent + E.personalisierung.namensanhaenger.preisCent)}) liegt die Kiste bei 49,50 €. Für Mitarbeiter gilt die Sachbezugsfreigrenze von 50 € im Monat. Fünf der sechs Kisten sind ohne Alkohol; die Große gibt es wahlweise mit Winterpunsch.
- **Für Mitarbeiter (5 Boxen):** Anlässe, die das ganze Jahr anfallen und planbar sind – Onboarding, Projektabschluss, Jubiläum, Geburtstag, Teamfrühstück. Das trägt das Geschäft außerhalb der Saison.
- **Für Kunden (2 Boxen):** beide unter 50 €. Eine herzhafte (Pasta-Abend) und eine klassische (Kaffee, Marzipan) – damit nicht jeder Kunde dieselbe Schokolade bekommt wie von allen anderen Lieferanten.
- **Ostern, Sommer (je 1 Box):** angelegt, aber erst im Zeitraum sichtbar (Ostern 15.02.–24.03.2027, Sommer 01.06.–31.08.2027). Saisonpreise sind geschätzt.

**Regeln für jeden Artikel:** original verpackt und gekennzeichnet, nichts Loses, nichts Gekühltes, Mindesthaltbarkeit üblicherweise ≥ 3 Monate nach Lieferung (Ausnahme Weihnachtsgebäck: erst ab Mitte November einkaufen), in mindestens zwei Ladenketten erhältlich, versandtauglich. Glas nur dort, wo es den Wert der Kiste trägt (Konfitüre, Pesto, Flasche) – immer in Holzwolle, Flaschen zusätzlich in einer Wellpapp-Hülse.

**Verworfen:** Spirituosen (Abgabe erst ab 18, Altersprüfung bei Zustellung nötig), Mehrweg-Flaschen (Pfand), Chips (Bruch), frische Backwaren und Käse (Kühlung/MHD), Lindt-Pralinés „Hochfein“ (13,99–14,99 € für 200 g – sprengt jede Kalkulation), Tassen und anderes Non-Food außer dem Notizbuch (schwer, teuer, Geschmackssache).

`;

for (const k of kollektionen) {
  s += `## Kollektion: ${k.name}\n\n${k.beschreibung}${k.sichtbarVon || k.sichtbarBis ? `\n\nSichtbar: ${k.sichtbarVon ? datum(k.sichtbarVon) : "ab sofort"} bis ${k.sichtbarBis ? datum(k.sichtbarBis) : "unbegrenzt"}.` : ""}\n\n`;
  for (const a of auswertungen.filter((x) => x.box.kollektion === k.slug)) {
    const b = a.box;
    const kk = a.kalk;
    s += `### ${b.name} – ${eur(b.preisCent)}\n<a id="${b.slug}"></a>\n\n`;
    s += `**Anlass:** ${b.anlass} · **Für:** ${b.zielgruppe}\n\n`;
    s += `> ${b.text}\n\n`;
    s += `**Warum so:** ${b.begruendung}\n\n`;
    s += `| Artikel | Marke, Größe | Laden | Preis | Status | Gewicht | Haltbarkeit | Alkohol | Allergene (Entwurf) |\n|---|---|---|--:|---|--:|---|---|---|\n`;
    for (const { artikel: x, menge } of a.artikel) {
      s += `| ${menge > 1 ? `${menge}× ` : ""}${x.name} | ${x.marke}, ${x.groesse} | ${x.laden} | ${eur(x.preisCent)} · ${link(x)} | ${statusText[x.status]} | ${x.gewichtGramm} g | ${x.mhd} | ${x.alkohol ? `ja (${x.alkoholVol})` : "nein"} | ${x.allergene.replace(/^Entwurf: /, "")} |\n`;
    }
    const sub = a.artikel.filter((x) => x.artikel.ersatzOhneAlkohol);
    if (sub.length) {
      s += `\nOhne Alkohol: ${sub
        .map((x) => {
          const e = artikel.find((y) => y.id === x.artikel.ersatzOhneAlkohol)!;
          return `statt ${x.artikel.marke} ${x.artikel.name} → ${e.marke} ${e.name} (${eur(e.preisCent)}, ${e.laden})`;
        })
        .join("; ")}. Der Preis der Box bleibt gleich.\n`;
    }
    s += `\n**Verpackung** (${groesseText[b.groesse]}): ${a.verpackung.map((v) => `${v.item.name.split(",")[0]}${v.menge !== 1 ? ` × ${String(v.menge).replace(".", ",")} ${v.item.einheit}` : ""}`).join(" · ")}\n\n`;
    s += `| Einkauf Artikel | Verpackung | Zahlungsgebühr | Kosten gesamt | Verkaufspreis | Rohertrag | Marge | Packzeit |\n|--:|--:|--:|--:|--:|--:|--:|--:|\n`;
    s += `| ${eur(kk.einkaufCent)} | ${eur(kk.verpackungCent)} | ${eur(kk.gebuehrCent)} | ${eur(kk.kostenCent)} | ${eur(kk.preisCent)} | **${eur(kk.rohertragCent)}** | **${pct(kk.margeProzent)}** | ca. ${b.packMinuten} min |\n\n`;
  }
}

s += `## Verpackung

Alle Preise brutto. Quelle der Recherche: Suchauszüge der Shopseiten vom ${PRUEF}; vor der ersten Bestellung im Shop gegenprüfen.

| Material | Lieferant | Einheit | Preis | Status | Hinweis |
|---|---|---|--:|---|---|
${verpackung.map((v) => `| ${v.name} | ${v.lieferant} | ${v.einheit} | ${eur(v.preisCent)} · ${link(v)} | ${statusText[v.status]} | ${v.quelleHinweis} |`).join("\n")}

**Vier Kartongrößen statt einer:** Flache Kisten ohne Glas kommen in den günstigen Klappdeckelkarton (0,55 €); nur Kisten mit Gläsern oder Flaschen brauchen 10 cm Höhe. Das spart je Box 0,70–1,05 € und hält leichte Kisten unter 2 kg.

**Offen vor dem Start:** olivgrünes Baumwollband in 10–15 mm (Farbe beim Händler anfragen), genaue Staffelpreise der kleinen und großen Kartons, Versandkosten bei verpackungsteam.de und natuerlich-verpacken.de.

## Personalisierung

| Option | Preis je Box | Material | Warum |
|---|--:|--:|---|
| Logo-Sticker auf dem Deckel | inklusive | ${eur(8)} (in Verpackung kalkuliert) | Das Logo ist der Grund, bei uns statt im Supermarkt zu kaufen – es darf keine Hürde sein. Kleine Auflagen im Selbstdruck auf runde Kraft-Etiketten. |
| Gedruckte Grußkarte mit eigenem Text | inklusive | ${eur(35)} (in Verpackung kalkuliert) | Jede Kiste braucht einen Absender. Bis ${E.personalisierung.grusstextMaxZeichen} Zeichen. |
| Handgeschriebene Karte | ${eur(E.personalisierung.handgeschrieben.preisCent)} | ${eur(E.personalisierung.handgeschrieben.materialCent)} | Etwa 3 Minuten Schreibarbeit je Karte; der Aufpreis entspricht rund 45 €/Stunde. |
| Banderole mit Logo | ${eur(E.personalisierung.banderole.preisCent)} | ${eur(E.personalisierung.banderole.materialCent)} | Zuschneiden und Anlegen ca. 1 Minute; wirkt wie eine eigene Verpackung des Kunden. |
| Namensanhänger je Empfänger | ${eur(E.personalisierung.namensanhaenger.preisCent)} | ${eur(E.personalisierung.namensanhaenger.materialCent)} | Namen kommen aus der Empfängerliste; erleichtert die Verteilung im Büro. |
| Bandfarbe (${E.personalisierung.bandfarben.map((b) => b.name).join(", ")}) | inklusive | – | Kostet nichts extra, gibt dem Kunden eine Wahl. |
| Versand an mehrere Empfänger | Versandkosten je Adresse | – | CSV-Upload; je Adresse ein Paket nach Gewicht. |

Alle drei Aufpreis-Optionen zusammen: ${eur(E.personalisierung.handgeschrieben.preisCent + E.personalisierung.banderole.preisCent + E.personalisierung.namensanhaenger.preisCent)} – eine 45-€-Kiste bleibt damit bei 49,50 €.

## Mengenrabatt und Mindestmenge

Mindestbestellung ${E.mindestmenge} Boxen (mischbar). Staffel auf den Warenwert: ${E.staffeln.map((x) => `ab ${x.ab} Boxen ${x.prozent} %`).join(" · ")}. Der Rabatt wird auf den Stückpreis gerechnet; Personalisierung und Versand sind nicht rabattiert.

## Versandkosten (Startwerte, im Admin änderbar)

DHL-Privatkundenpreise bei Online-Frankierung 2026 ([dhl.de](https://www.dhl.de/en/privatkunden/pakete-versenden/deutschlandweit-versenden/preise-national.html), geprüft ${PRUEF}). Ein Geschäftskundenvertrag ist ab etwa 200 Sendungen im Jahr möglich und günstiger. Ab 01.01.2027 steigen 10-, 20- und 31,5-kg-Pakete online um je 1 € ([DHL-Pressemitteilung 13.11.2026](https://group.dhl.com/content/dam/deutschepostdhl/de/media-relations/press-releases/2026/pm-preisaenderung-paketpreise-20261113.pdf)) – dann „Kosten“ im Admin anpassen.

| Paket bis | DHL-Porto (Kosten) | Material je Paket | Preis für Kunden |
|--:|--:|--:|--:|
${E.versand.stufen.map((x) => `| ${kg(x.bisGramm)} | ${eur(x.kostenCent)} | ${eur(E.versand.materialProPaketCent)} | ${eur(x.preisCent)} |`).join("\n")}

Persönliche Lieferung im Liefergebiet: ${eur(E.lieferung.gebuehrCent)}, ab ${eur(E.lieferung.freiAbCent)} Warenwert kostenlos.
`;

writeFileSync("SORTIMENT.md", s);

// ───────────────────────── EINKAUFSLISTE.md ─────────────────────────
const verwendet = new Map<string, { a: SeedArtikel; boxen: string[] }>();
for (const aw of auswertungen) {
  for (const { artikel: a } of aw.artikel) {
    const e = verwendet.get(a.id) ?? { a, boxen: [] };
    e.boxen.push(aw.box.name);
    verwendet.set(a.id, e);
    if (a.ersatzOhneAlkohol) {
      const ers = artikel.find((x) => x.id === a.ersatzOhneAlkohol)!;
      const e2 = verwendet.get(ers.id) ?? { a: ers, boxen: [] };
      e2.boxen.push(`${aw.box.name} (ohne Alkohol)`);
      verwendet.set(ers.id, e2);
    }
  }
}
const laeden = [...new Set([...verwendet.values()].map((v) => v.a.laden))].sort((x, y) => {
  const n = (l: string) => [...verwendet.values()].filter((v) => v.a.laden === l).length;
  return n(y) - n(x);
});

let e = `# Einkaufsliste

Stand: ${PRUEF} · ${verwendet.size} Artikel in ${laeden.length} Läden · erzeugt mit \`npm run docs\`.

Diese Liste zeigt den **Katalog** nach Laden – also wo es was gibt und was es kostet. Die tagesaktuelle Einkaufsliste mit Mengen aus offenen Bestellungen steht im Admin unter „Einkaufsliste“; dort haken Sie ab und tragen den bezahlten Preis ein.

Status: **belegt** = Preis von der Seite genau dieses Händlers · **Richtwert** = Online-Supermarkt/UVP, im Markt prüfen · \`geschätzt\` = ohne Beleg. Erklärung in \`SORTIMENT.md\`.

**Einkaufsroute Schwetzingen:** dm und Rossmann decken ${[...verwendet.values()].filter((v) => v.a.laden === "dm" || v.a.laden === "Rossmann").length} der ${verwendet.size} Artikel mit belegten, bundesweit einheitlichen Preisen ab. REWE/EDEKA für Markenartikel (Konfitüre, Wein, Feinkost), Lidl oder Aldi Süd für Sekt und Kaffee in Aktionswochen.

`;
for (const l of laeden) {
  const liste = [...verwendet.values()].filter((v) => v.a.laden === l).sort((x, y) => x.a.kategorie.localeCompare(y.a.kategorie) || x.a.name.localeCompare(y.a.name));
  e += `## ${l} (${liste.length} Artikel)\n\n| Artikel | Marke | Größe | Preis | Status | Quelle | Geprüft | Ersatzquelle | Verwendet in |\n|---|---|---|--:|---|---|---|---|---|\n`;
  for (const { a, boxen: bs } of liste) {
    e += `| ${a.name}${a.saisonal ? ` *(saisonal: ${a.saisonal})*` : ""} | ${a.marke} | ${a.groesse} | ${eur(a.preisCent)} | ${statusText[a.status]} | [${a.quelleHinweis}](${a.quelleUrl}) | ${datum(a.geprueftAm)} | ${a.ersatz} | ${[...new Set(bs)].join(", ")} |\n`;
  }
  e += "\n";
}
const nichtVerwendet = artikel.filter((a) => !verwendet.has(a.id));
if (nichtVerwendet.length) {
  e += `## Im Katalog, derzeit in keiner Box\n\n| Artikel | Laden | Preis | Status | Quelle |\n|---|---|--:|---|---|\n${nichtVerwendet.map((a) => `| ${a.marke} ${a.name}, ${a.groesse} | ${a.laden} | ${eur(a.preisCent)} | ${statusText[a.status]} | [${a.quelleHinweis}](${a.quelleUrl}) |`).join("\n")}\n\n`;
}
e += `## Einkaufstipps aus der Recherche

- **Kaffee und Sekt in Aktionswochen kaufen:** Dallmayr Prodomo 500 g regulär 9,79–10,49 €, in Aktion 6,75–7,99 €; Fürst von Metternich regulär 9,99 €, in Aktion ab ca. 4,77 €. Kalkuliert ist immer der reguläre Preis – jede Aktion ist zusätzlicher Gewinn.
- **Weihnachtsgebäck spät kaufen:** Zimtsterne, Dominosteine und Spekulatius haben nur 2–5 Monate Restlaufzeit. Erst einkaufen, wenn Bestellungen vorliegen.
- **Packungsgrößen prüfen:** Rossmann führt Lindor als 100-g-Beutel statt 137 g; Niederegger-Schwarzbrot gibt es in 75, 125 und 200 g – kalkuliert sind 125 g.
- **Saisonware:** Ferrero Rocher und Küsschen sind im Sommer nicht im Regal („Sommerpause“). Für Jubiläum und Geburtstagsgruß dann den im Admin hinterlegten Ersatz wählen oder vorher bevorraten.
- **Nicht gefundene Preise:** REWE- und Kaufland-Filialpreise für Schwetzingen, Grissini, Langnese Landhonig 500 g, Rotkäppchen alkoholfrei 0,2 l – beim ersten Einkauf notieren und im Admin eintragen.

## Verpackung (online, Großpackung)

| Material | Lieferant | Preis je ${"Einheit"} | Status | Quelle |
|---|---|--:|---|---|
${verpackung.map((v) => `| ${v.name} | ${v.lieferant} | ${eur(v.preisCent)} / ${v.einheit} | ${statusText[v.status]} | [${v.quelleHinweis}](${v.quelleUrl}) |`).join("\n")}
`;
writeFileSync("EINKAUFSLISTE.md", e);

// ───────────────────────── scripts/render/boxes.json ─────────────────────────
mkdirSync("scripts/render", { recursive: true });
const renderGroesse = { klein: "klein", flach: "mittel", mittel: "mittel", gross: "gross" } as const;
const boxesJson = {
  boxes: boxen.map((b, i) => ({
    slug: b.slug,
    name: b.name,
    size: renderGroesse[b.groesse],
    ribbon: b.band,
    seed: 11 + i * 7,
    items: b.inhalt.flatMap(([id, menge]) => {
      const a = artikel.find((x) => x.id === id)!;
      return Array.from({ length: menge }, () => ({ ...a.render }));
    }),
  })),
};
writeFileSync("scripts/render/boxes.json", JSON.stringify(boxesJson, null, 2) + "\n");

console.log(`SORTIMENT.md, EINKAUFSLISTE.md und scripts/render/boxes.json geschrieben (${boxen.length} Boxen, ${verwendet.size} Artikel).`);
