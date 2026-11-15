# Sortiment

Stand: 15.11.2026 · 15 Boxen in 5 Kollektionen · erzeugt aus `db/seed-data/*` mit `npm run docs` (nicht von Hand ändern – Daten in den Seed-Dateien oder später im Admin pflegen).

## So lesen Sie die Preise

Jeder Preis hat eine Quelle und das Prüfdatum 15.11.2026. Wichtig: Die Händlerseiten ließen sich aus der Arbeitsumgebung nicht direkt öffnen; die Preise stammen aus den Suchmaschinen-Auszügen der verlinkten Seiten. Deshalb gibt es drei Stufen:

| Status | Bedeutung |
|---|---|
| belegt | Preis stand auf der Seite des Händlers, bei dem gekauft wird (dm, Rossmann, Lidl, Aldi Süd – bundesweit einheitliche Preise). |
| Richtwert | Preis eines Online-Supermarkts oder Hersteller-Shops (EDEKA24, Knuspr, UVP). Im Markt in Schwetzingen meist gleich oder etwas günstiger, aber nicht bestätigt. |
| `geschätzt` | Kein belastbarer Beleg gefunden. Schätzung aus Vergleichswerten – vor dem ersten Einkauf prüfen. |

REWE, Kaufland und EDEKA zeigen online keine Filialpreise für Schwetzingen. Für Markenartikel aus diesen Märkten ist deshalb ein Online-Richtwert angesetzt, der eher über dem Regalpreis liegt – die Kalkulation ist damit vorsichtig. **Erster Schritt vor dem Start:** einmal mit `EINKAUFSLISTE.md` durch die Märkte gehen und die Preise im Admin unter „Artikel“ bestätigen (das setzt das Prüfdatum neu).

## Kalkulationsgrundlagen

- **Kleinunternehmer (§ 19 UStG):** Verkaufspreise ohne Umsatzsteuer; Einkaufspreise sind brutto Kosten (kein Vorsteuerabzug).
- **Zahlungsgebühr:** 2,8 % + 0,25 € je Zahlung (Stripe, Premium-/Firmenkarten EWR) plus 0,4 % für die automatische Rechnung (max. ca. 1,90 €). Standardkarten kosten nur 1,5 % + 0,25 €, SEPA-Lastschrift 0,35 € – gerechnet wird mit dem teuersten üblichen Fall. Der Fixbetrag ist auf die Mindestmenge von 5 Boxen verteilt. Quellen: [stripe.com/de/pricing](https://stripe.com/en-de/pricing), [Rechnungen nach Zahlung](https://support.stripe.com/questions/pricing-for-post-payment-invoices-for-one-time-purchases-via-checkout-and-payment-links), geprüft 15.11.2026.
- **Rohertrag** = Verkaufspreis − Artikel − Verpackung − Zahlungsgebühr. Ziel ≥ 45 %, Untergrenze 35 %. Versandkosten trägt der Kunde gesondert; Packzeit ist ausgewiesen, aber nicht als Kosten angesetzt.
- **Verpackung** je Box: Karton, Holzwolle, Baumwollband, bedruckte Grußkarte, Logo-Sticker, Seidenpapier – siehe Abschnitt „Verpackung“.

## Übersicht

| Box | Kollektion | Preis | Artikel | Verpackung | Gebühr | Rohertrag | Marge | Gewicht | Alkohol | Packzeit |
|---|---|--:|--:|--:|--:|--:|--:|--:|---|--:|
| [Kleine Weihnachtskiste](#kleine-weihnachtskiste) | Weihnachten | 29,00 € | 10,94 € | 1,77 € | 0,98 € | 15,31 € | **52,8 %** | 0,66 kg | nein | 5 min |
| [Weihnachtskiste](#weihnachtskiste) | Weihnachten | 45,00 € | 20,53 € | 1,96 € | 1,49 € | 21,02 € | **46,7 %** | 1,13 kg | nein | 7 min |
| [Große Weihnachtskiste](#grosse-weihnachtskiste) | Weihnachten | 69,00 € | 30,96 € | 3,92 € | 2,26 € | 31,86 € | **46,2 %** | 3,17 kg | ja, abwählbar | 9 min |
| [Adventskaffee](#adventskaffee) | Weihnachten | 35,00 € | 15,67 € | 1,96 € | 1,17 € | 16,20 € | **46,3 %** | 1,16 kg | nein | 6 min |
| [Süße Weihnacht](#suesse-weihnacht) | Weihnachten | 35,00 € | 14,99 € | 1,96 € | 1,17 € | 16,88 € | **48,2 %** | 1,14 kg | nein | 6 min |
| [Winterabend](#winterabend) | Weihnachten | 39,00 € | 15,29 € | 3,92 € | 1,30 € | 18,49 € | **47,4 %** | 2,03 kg | nein | 7 min |
| [Willkommen im Team](#willkommen-im-team) | Für Mitarbeiter | 39,00 € | 17,17 € | 1,96 € | 1,30 € | 18,57 € | **47,6 %** | 1,15 kg | nein | 6 min |
| [Danke fürs Projekt](#danke-fuers-projekt) | Für Mitarbeiter | 29,00 € | 12,62 € | 1,96 € | 0,98 € | 13,44 € | **46,3 %** | 1,02 kg | nein | 5 min |
| [Jubiläum](#jubilaeum) | Für Mitarbeiter | 59,00 € | 25,02 € | 3,92 € | 1,94 € | 28,12 € | **47,7 %** | 2,47 kg | ja, abwählbar | 8 min |
| [Geburtstagsgruß](#geburtstagsgruss) | Für Mitarbeiter | 29,00 € | 12,41 € | 1,77 € | 0,98 € | 13,84 € | **47,7 %** | 1,13 kg | ja, abwählbar | 5 min |
| [Teamfrühstück](#teamfruehstueck) | Für Mitarbeiter | 75,00 € | 32,30 € | 3,32 € | 2,45 € | 36,93 € | **49,2 %** | 3,30 kg | nein | 8 min |
| [Pasta-Abend](#pasta-abend) | Für Kunden | 39,00 € | 16,54 € | 2,81 € | 1,30 € | 18,35 € | **47,1 %** | 2,57 kg | nein | 7 min |
| [Auf gute Zusammenarbeit](#auf-gute-zusammenarbeit) | Für Kunden | 45,00 € | 20,52 € | 1,96 € | 1,49 € | 21,03 € | **46,7 %** | 1,17 kg | nein | 6 min |
| [Osterkiste](#osterkiste) | Ostern | 35,00 € | 14,62 € | 1,96 € | 1,17 € | 17,25 € | **49,3 %** | 0,93 kg | nein | 5 min |
| [Sommerkiste](#sommerkiste) | Sommer | 39,00 € | 15,15 € | 3,92 € | 1,30 € | 18,63 € | **47,8 %** | 2,53 kg | nein | 7 min |

Niedrigste Marge: 46,2 % · höchste: 52,8 %. Mit dem höchsten Staffelrabatt (10 % ab 100 Boxen) bleibt jede Box über 35 %:
niedrigster Wert dann 40,6 %.

## Warum diese Kollektionen

- **Weihnachten (6 Boxen, 29–69 €):** drei Preisstufen (29 / 45 / 69 €) plus drei Themenkisten. 45 € ist bewusst gewählt: Geschenke an Geschäftspartner sind nur bis 50 € je Empfänger und Jahr als Betriebsausgabe abziehbar, und die Geschenkverpackung zählt mit ([IHK München](https://www.ihk-muenchen.de/ratgeber/steuern/einkommensteuer-koerperschaftsteuer/sachzuwendungen-an-geschaeftsfreunde-und-arbeitnehmer/)). Mit allen drei Zusatzoptionen (4,50 €) liegt die Kiste bei 49,50 €. Für Mitarbeiter gilt die Sachbezugsfreigrenze von 50 € im Monat. Fünf der sechs Kisten sind ohne Alkohol; die Große gibt es wahlweise mit Winterpunsch.
- **Für Mitarbeiter (5 Boxen):** Anlässe, die das ganze Jahr anfallen und planbar sind – Onboarding, Projektabschluss, Jubiläum, Geburtstag, Teamfrühstück. Das trägt das Geschäft außerhalb der Saison.
- **Für Kunden (2 Boxen):** beide unter 50 €. Eine herzhafte (Pasta-Abend) und eine klassische (Kaffee, Marzipan) – damit nicht jeder Kunde dieselbe Schokolade bekommt wie von allen anderen Lieferanten.
- **Ostern, Sommer (je 1 Box):** angelegt, aber erst im Zeitraum sichtbar (Ostern 15.02.–24.03.2027, Sommer 01.06.–31.08.2027). Saisonpreise sind geschätzt.

**Regeln für jeden Artikel:** original verpackt und gekennzeichnet, nichts Loses, nichts Gekühltes, Mindesthaltbarkeit üblicherweise ≥ 3 Monate nach Lieferung (Ausnahme Weihnachtsgebäck: erst ab Mitte November einkaufen), in mindestens zwei Ladenketten erhältlich, versandtauglich. Glas nur dort, wo es den Wert der Kiste trägt (Konfitüre, Pesto, Flasche) – immer in Holzwolle, Flaschen zusätzlich in einer Wellpapp-Hülse.

**Verworfen:** Spirituosen (Abgabe erst ab 18, Altersprüfung bei Zustellung nötig), Mehrweg-Flaschen (Pfand), Chips (Bruch), frische Backwaren und Käse (Kühlung/MHD), Lindt-Pralinés „Hochfein“ (13,99–14,99 € für 200 g – sprengt jede Kalkulation), Tassen und anderes Non-Food außer dem Notizbuch (schwer, teuer, Geschmackssache).

## Kollektion: Weihnachten

Kaffee, Wintertee, Zimtsterne und Marzipan – zusammengestellt für Schreibtisch, Homeoffice und Kundenbesuch. Alle Kisten außer der Großen sind ohne Alkohol; die Große gibt es auf Wunsch mit Winterpunsch statt Wein. Bestellschluss für den Versand ist der 10. Dezember.

Sichtbar: ab sofort bis 23.12.2026.

### Kleine Weihnachtskiste – 29,00 €
<a id="kleine-weihnachtskiste"></a>

**Anlass:** Weihnachten · **Für:** Große Teams, Aushilfen, Dienstleister, Nachbarn im Gewerbehof

> Passt in jede Schreibtischschublade und ist trotzdem ein richtiges Paket: eine Tafel Weihnachtsschokolade, Wintertee, Dominosteine und Dinkel-Spekulatius. Ohne Alkohol, ohne Glas – deshalb auch die günstigste Kiste im Einzelversand.

**Warum so:** Einstiegspreis für große Stückzahlen. Nur flache, leichte, bruchsichere Artikel: Die Kiste bleibt unter 2 kg und passt in den kleinsten Karton.

| Artikel | Marke, Größe | Laden | Preis | Status | Gewicht | Haltbarkeit | Alkohol | Allergene (Entwurf) |
|---|---|---|--:|---|--:|---|---|---|
| Weihnachts-Chocolade Classic | Lindt, 100 g | REWE | 3,99 € · [Quelle](https://www.lindt.de/weihnachts-chocolade-classic-100g) | Richtwert | 115 g | 4–8 Monate | nein | Milch, Soja; kann Haselnüsse, Mandeln enthalten |
| Wintertee „Heiße Himbeere“ (oder „Schneewunder“) | Meßmer, 20 Beutel | dm | 2,35 € · [Quelle](https://www.dm.de/p/d/3149595/messmer-fruechtetee-heisse-himbeere-20-beutel) | belegt | 80 g | 18–36 Monate | nein | keine deklarationspflichtigen Allergene zu erwarten |
| Dominosteine mit Zartbitterschokolade, Bio | dmBio, 125 g | dm | 2,65 € · [Quelle](https://www.dm.de/p/d/1584273/dmbio-dominosteine-mit-zartbitterschokolade) | belegt | 145 g | 2–4 Monate – erst ab Mitte November einkaufen | nein | Weizen (Gluten), Mandeln, Soja; kann Milch enthalten |
| Mini Dinkel-Spekulatius, Bio | dmBio, 150 g | dm | 1,95 € · [Quelle](https://www.dm.de/marken/dmbio/dmbio-weihnachts-limited-edition-940478) | belegt | 165 g | 3–5 Monate | nein | Dinkel (Gluten), Butter (Milch); kann Schalenfrüchte enthalten |

**Verpackung** (klein (24×17×7 cm)): Faltschachtel braun mit Klappdeckel · Holzwolle fein × 0,045 kg · Baumwoll-Köperband oliv × 1,1 m · Grußkarte A6 · Aufkleber rund 50 mm · Seidenpapier 50×75 cm

| Einkauf Artikel | Verpackung | Zahlungsgebühr | Kosten gesamt | Verkaufspreis | Rohertrag | Marge | Packzeit |
|--:|--:|--:|--:|--:|--:|--:|--:|
| 10,94 € | 1,77 € | 0,98 € | 13,69 € | 29,00 € | **15,31 €** | **52,8 %** | ca. 5 min |

### Weihnachtskiste – 45,00 €
<a id="weihnachtskiste"></a>

**Anlass:** Weihnachten · **Für:** Mitarbeiter und Kunden – die Kiste für alle

> Sechs Dinge für die Tage zwischen den Jahren: 250 g italienischer Kaffee, Lübecker Marzipan, Weihnachtsschokolade, Wintertee, Zimtsterne und Spekulatius. Der Preis liegt bewusst unter 50 € – auch dann noch, wenn Sie Banderole, Namensanhänger und handgeschriebene Karte dazunehmen.

**Warum so:** Die Standardkiste. 45 € lässt Luft für alle drei Zusatzoptionen (zusammen 4,50 €), ohne die 50-€-Grenze für Geschäftsgeschenke zu reißen. Ohne Alkohol und ohne Glas, damit sie ohne Rückfrage an jeden gehen kann und im Einzelversand unter 2 kg bleibt.

| Artikel | Marke, Größe | Laden | Preis | Status | Gewicht | Haltbarkeit | Alkohol | Allergene (Entwurf) |
|---|---|---|--:|---|--:|---|---|---|
| Crema e Gusto, gemahlen | Lavazza, 250 g | Rossmann | 5,49 € · [Quelle](https://rossmann.de/de/ernaehrung-lavazza-crema-e-gusto/p/8000070038868) | belegt | 265 g | 12–18 Monate ab Röstung, im Regal meist > 6 Monate | nein | keine deklarationspflichtigen Allergene zu erwarten |
| Marzipan-Schwarzbrot | Niederegger, 125 g | REWE | 3,80 € · [Quelle](https://www.supermarktcheck.de/rewe/sortiment/hersteller/niederegger/) | Richtwert | 135 g | 4–8 Monate | nein | Mandeln; kann Milch, Soja, andere Schalenfrüchte enthalten |
| Weihnachts-Chocolade Classic | Lindt, 100 g | REWE | 3,99 € · [Quelle](https://www.lindt.de/weihnachts-chocolade-classic-100g) | Richtwert | 115 g | 4–8 Monate | nein | Milch, Soja; kann Haselnüsse, Mandeln enthalten |
| Wintertee „Heiße Himbeere“ (oder „Schneewunder“) | Meßmer, 20 Beutel | dm | 2,35 € · [Quelle](https://www.dm.de/p/d/3149595/messmer-fruechtetee-heisse-himbeere-20-beutel) | belegt | 80 g | 18–36 Monate | nein | keine deklarationspflichtigen Allergene zu erwarten |
| Zimtsterne mit Haselnüssen und Mandeln, Bio | dmBio, 125 g | dm | 2,95 € · [Quelle](https://www.dm.de/p/d/1582030/dmbio-zimtsterne-mit-haselnuessen-und-mandeln) | belegt | 145 g | 2–4 Monate – erst ab Mitte November einkaufen | nein | Haselnüsse, Mandeln, Ei; kann Gluten enthalten |
| Mini Dinkel-Spekulatius, Bio | dmBio, 150 g | dm | 1,95 € · [Quelle](https://www.dm.de/marken/dmbio/dmbio-weihnachts-limited-edition-940478) | belegt | 165 g | 3–5 Monate | nein | Dinkel (Gluten), Butter (Milch); kann Schalenfrüchte enthalten |

**Verpackung** (flach (30,5×21,5×7,4 cm)): Faltschachtel braun mit Klappdeckel · Holzwolle fein × 0,06 kg · Baumwoll-Köperband oliv × 1,3 m · Grußkarte A6 · Aufkleber rund 50 mm · Seidenpapier 50×75 cm × 2 Bogen

| Einkauf Artikel | Verpackung | Zahlungsgebühr | Kosten gesamt | Verkaufspreis | Rohertrag | Marge | Packzeit |
|--:|--:|--:|--:|--:|--:|--:|--:|
| 20,53 € | 1,96 € | 1,49 € | 23,98 € | 45,00 € | **21,02 €** | **46,7 %** | ca. 7 min |

### Große Weihnachtskiste – 69,00 €
<a id="grosse-weihnachtskiste"></a>

**Anlass:** Weihnachten · **Für:** Führungskräfte, langjährige Kunden, wichtige Partner

> Eine Flasche Grauer Burgunder aus Oberkirch in der Ortenau, dazu Arabica-Kaffee, Lübecker Marzipan, eine Schokoladen-Auswahl, Erdbeer-Konfitüre, Zimtsterne und gebrannte Mandeln. Wer keinen Alkohol verschenken möchte, bekommt statt des Weins einen Bio-Winterpunsch – ein Haken in der Bestellung genügt.

**Warum so:** Premiumstufe mit regionalem Bezug (Wein aus Baden). Einzige Weihnachtskiste mit Alkohol und mit Glasflasche – deshalb mit Flaschenschutz kalkuliert und im Mehrfachversand nur alkoholfrei.

| Artikel | Marke, Größe | Laden | Preis | Status | Gewicht | Haltbarkeit | Alkohol | Allergene (Entwurf) |
|---|---|---|--:|---|--:|---|---|---|
| Grauer Burgunder QbA trocken (Baden) | Oberkircher Winzer, 0,75 l | REWE | 6,29 € · [Quelle](https://shop.rewe.de/p/oberkircher-winzer-grauer-burgunder-qba-trocken-0-75l/3577511) | Richtwert | 1200 g | kein MHD; 1–2 Jahre lagerfähig | ja (ca. 12,5 % vol) | enthält Sulfite |
| Qualità Oro, gemahlen | Lavazza, 250 g | REWE | 6,79 € · [Quelle](https://www.knuspr.de/5534-lavazza-qualita-oro-gemahlen) | Richtwert | 265 g | 12–18 Monate ab Röstung | nein | keine deklarationspflichtigen Allergene zu erwarten |
| Marzipan-Schwarzbrot | Niederegger, 125 g | REWE | 3,80 € · [Quelle](https://www.supermarktcheck.de/rewe/sortiment/hersteller/niederegger/) | Richtwert | 135 g | 4–8 Monate | nein | Mandeln; kann Milch, Soja, andere Schalenfrüchte enthalten |
| merci Finest Selection „Große Vielfalt“ | Storck, 250 g | Rossmann | 4,59 € · [Quelle](https://www.rossmann.de/de/lebensmittel-storck-merci-finest-selection/p/4014400901191) | belegt | 320 g | 6–9 Monate | nein | Milch, Soja, Haselnüsse, Mandeln; kann weitere Schalenfrüchte enthalten |
| Erdbeer-Konfitüre | Bonne Maman, 370 g | REWE | 3,69 € · [Quelle](https://www.knuspr.de/13394-bonne-maman-erdbeer-konfituere) | Richtwert | 600 g | 12–24 Monate | nein | keine deklarationspflichtigen Allergene zu erwarten |
| Zimtsterne mit Haselnüssen und Mandeln, Bio | dmBio, 125 g | dm | 2,95 € · [Quelle](https://www.dm.de/p/d/1582030/dmbio-zimtsterne-mit-haselnuessen-und-mandeln) | belegt | 145 g | 2–4 Monate – erst ab Mitte November einkaufen | nein | Haselnüsse, Mandeln, Ei; kann Gluten enthalten |
| Gebrannte Mandeln, Bio | dmBio, 125 g | dm | 2,85 € · [Quelle](https://www.dm.de/ernaehrung/snacks-und-suessigkeiten/nuesse) | belegt | 135 g | 4–8 Monate | nein | Mandeln; kann andere Schalenfrüchte, Erdnüsse enthalten |

Ohne Alkohol: statt Oberkircher Winzer Grauer Burgunder QbA trocken (Baden) → dmBio Winter-Fruchtpunsch Holunder, Bio (alkoholfrei) (2,25 €, dm). Der Preis der Box bleibt gleich.

**Verpackung** (groß (33×24×10 cm)): Karton braun mit Steckverschluss · Holzwolle fein × 0,1 kg · Baumwoll-Köperband oliv × 1,5 m · Grußkarte A6 · Aufkleber rund 50 mm · Seidenpapier 50×75 cm × 2 Bogen · Wellpapp-Hülse für 0

| Einkauf Artikel | Verpackung | Zahlungsgebühr | Kosten gesamt | Verkaufspreis | Rohertrag | Marge | Packzeit |
|--:|--:|--:|--:|--:|--:|--:|--:|
| 30,96 € | 3,92 € | 2,26 € | 37,14 € | 69,00 € | **31,86 €** | **46,2 %** | ca. 9 min |

### Adventskaffee – 35,00 €
<a id="adventskaffee"></a>

**Anlass:** Weihnachten, Adventszeit · **Für:** Büro-Teams, Kunden mit Kaffeeküche

> 250 g Kaffee, dazu Butterkekse in Vollmilchschokolade, Dominosteine, Spekulatius und Amarettini. Genug für eine Woche Nachmittagspausen – oder für eine, wenn Kollegen mitessen.

**Warum so:** Thematische Kiste um den meistgekauften Artikel (Kaffee). Kein Glas, flacher Karton: günstig zu packen und zu versenden.

| Artikel | Marke, Größe | Laden | Preis | Status | Gewicht | Haltbarkeit | Alkohol | Allergene (Entwurf) |
|---|---|---|--:|---|--:|---|---|---|
| Crema e Gusto, gemahlen | Lavazza, 250 g | Rossmann | 5,49 € · [Quelle](https://rossmann.de/de/ernaehrung-lavazza-crema-e-gusto/p/8000070038868) | belegt | 265 g | 12–18 Monate ab Röstung, im Regal meist > 6 Monate | nein | keine deklarationspflichtigen Allergene zu erwarten |
| Leibniz Choco Vollmilch | Bahlsen, 125 g | Rossmann | 3,79 € · [Quelle](https://www.rossmann.de/de/alle-marken/bahlsen/leibniz/c/online-marke_14716330) | Richtwert | 145 g | 5–8 Monate | nein | Weizen (Gluten), Milch, Soja |
| Dominosteine mit Zartbitterschokolade, Bio | dmBio, 125 g | dm | 2,65 € · [Quelle](https://www.dm.de/p/d/1584273/dmbio-dominosteine-mit-zartbitterschokolade) | belegt | 145 g | 2–4 Monate – erst ab Mitte November einkaufen | nein | Weizen (Gluten), Mandeln, Soja; kann Milch enthalten |
| Mini Dinkel-Spekulatius, Bio | dmBio, 150 g | dm | 1,95 € · [Quelle](https://www.dm.de/marken/dmbio/dmbio-weihnachts-limited-edition-940478) | belegt | 165 g | 3–5 Monate | nein | Dinkel (Gluten), Butter (Milch); kann Schalenfrüchte enthalten |
| Amarettini | Gadeschi, 200 g | Rossmann | 1,79 € · [Quelle](https://www.rossmann.de/de/lebensmittel-gadeschi-amarettini-gebaeck/p/8008560001521) | belegt | 210 g | 6–9 Monate | nein | Ei, Aprikosenkerne/Mandeln; kann Gluten, Milch enthalten |

**Verpackung** (flach (30,5×21,5×7,4 cm)): Faltschachtel braun mit Klappdeckel · Holzwolle fein × 0,06 kg · Baumwoll-Köperband oliv × 1,3 m · Grußkarte A6 · Aufkleber rund 50 mm · Seidenpapier 50×75 cm × 2 Bogen

| Einkauf Artikel | Verpackung | Zahlungsgebühr | Kosten gesamt | Verkaufspreis | Rohertrag | Marge | Packzeit |
|--:|--:|--:|--:|--:|--:|--:|--:|
| 15,67 € | 1,96 € | 1,17 € | 18,80 € | 35,00 € | **16,20 €** | **46,3 %** | ca. 6 min |

### Süße Weihnacht – 35,00 €
<a id="suesse-weihnacht"></a>

**Anlass:** Weihnachten · **Für:** Teams, in denen nicht alle Kaffee trinken; Familien von Mitarbeitern

> Für alle, bei denen der Plätzchenteller nie lange voll bleibt: eine Schokoladen-Auswahl mit 20 Stück, Zimtsterne, Dominosteine, Dinkel-Spekulatius und gebrannte Mandeln. Nichts davon muss gekocht, gekühlt oder entkorkt werden.

**Warum so:** Reine Süßwaren-Kiste ohne Kaffee und Alkohol – die sichere Wahl, wenn man die Empfänger nicht kennt. Flach und leicht.

| Artikel | Marke, Größe | Laden | Preis | Status | Gewicht | Haltbarkeit | Alkohol | Allergene (Entwurf) |
|---|---|---|--:|---|--:|---|---|---|
| merci Finest Selection „Große Vielfalt“ | Storck, 250 g | Rossmann | 4,59 € · [Quelle](https://www.rossmann.de/de/lebensmittel-storck-merci-finest-selection/p/4014400901191) | belegt | 320 g | 6–9 Monate | nein | Milch, Soja, Haselnüsse, Mandeln; kann weitere Schalenfrüchte enthalten |
| Zimtsterne mit Haselnüssen und Mandeln, Bio | dmBio, 125 g | dm | 2,95 € · [Quelle](https://www.dm.de/p/d/1582030/dmbio-zimtsterne-mit-haselnuessen-und-mandeln) | belegt | 145 g | 2–4 Monate – erst ab Mitte November einkaufen | nein | Haselnüsse, Mandeln, Ei; kann Gluten enthalten |
| Dominosteine mit Zartbitterschokolade, Bio | dmBio, 125 g | dm | 2,65 € · [Quelle](https://www.dm.de/p/d/1584273/dmbio-dominosteine-mit-zartbitterschokolade) | belegt | 145 g | 2–4 Monate – erst ab Mitte November einkaufen | nein | Weizen (Gluten), Mandeln, Soja; kann Milch enthalten |
| Mini Dinkel-Spekulatius, Bio | dmBio, 150 g | dm | 1,95 € · [Quelle](https://www.dm.de/marken/dmbio/dmbio-weihnachts-limited-edition-940478) | belegt | 165 g | 3–5 Monate | nein | Dinkel (Gluten), Butter (Milch); kann Schalenfrüchte enthalten |
| Gebrannte Mandeln, Bio | dmBio, 125 g | dm | 2,85 € · [Quelle](https://www.dm.de/ernaehrung/snacks-und-suessigkeiten/nuesse) | belegt | 135 g | 4–8 Monate | nein | Mandeln; kann andere Schalenfrüchte, Erdnüsse enthalten |

**Verpackung** (flach (30,5×21,5×7,4 cm)): Faltschachtel braun mit Klappdeckel · Holzwolle fein × 0,06 kg · Baumwoll-Köperband oliv × 1,3 m · Grußkarte A6 · Aufkleber rund 50 mm · Seidenpapier 50×75 cm × 2 Bogen

| Einkauf Artikel | Verpackung | Zahlungsgebühr | Kosten gesamt | Verkaufspreis | Rohertrag | Marge | Packzeit |
|--:|--:|--:|--:|--:|--:|--:|--:|
| 14,99 € | 1,96 € | 1,17 € | 18,12 € | 35,00 € | **16,88 €** | **48,2 %** | ca. 6 min |

### Winterabend – 39,00 €
<a id="winterabend"></a>

**Anlass:** Weihnachten, Jahreswechsel · **Für:** Alle, denen Sie ausdrücklich nichts Alkoholisches schenken möchten

> Eine Flasche Bio-Fruchtpunsch mit Holunder zum Heißmachen, Gewürztee mit Zimt und Ingwer, gebrannte Mandeln, Zimtsterne und Weihnachtsschokolade. Ein Abend auf dem Sofa in einer Kiste – komplett ohne Alkohol.

**Warum so:** Die ausdrücklich alkoholfreie Kiste mit Getränk. Für Teams mit unterschiedlichen Gewohnheiten und Glaubensrichtungen die unkomplizierteste Wahl.

| Artikel | Marke, Größe | Laden | Preis | Status | Gewicht | Haltbarkeit | Alkohol | Allergene (Entwurf) |
|---|---|---|--:|---|--:|---|---|---|
| Winter-Fruchtpunsch Holunder, Bio (alkoholfrei) | dmBio, 0,75 l | dm | 2,25 € · [Quelle](https://www.dm.de/p/d/1452579/dmbio-winter-fruchtpunsch-holunder) | belegt | 1200 g | 12–18 Monate | nein | keine deklarationspflichtigen Allergene zu erwarten |
| Gewürztee Classic (Zimt, Kardamom, Ingwer), Bio | Yogi Tea, 17 Beutel | dm | 3,25 € · [Quelle](https://www.dm.de/p/d/1596551/yogi-tea-gewuerztee-classic-mit-zimt-kardamom-und-ingwer-17-beutel) | belegt | 65 g | 24–36 Monate | nein | laut dm-Produktseite vegan, gluten- und laktosefrei |
| Gebrannte Mandeln, Bio | dmBio, 125 g | dm | 2,85 € · [Quelle](https://www.dm.de/ernaehrung/snacks-und-suessigkeiten/nuesse) | belegt | 135 g | 4–8 Monate | nein | Mandeln; kann andere Schalenfrüchte, Erdnüsse enthalten |
| Zimtsterne mit Haselnüssen und Mandeln, Bio | dmBio, 125 g | dm | 2,95 € · [Quelle](https://www.dm.de/p/d/1582030/dmbio-zimtsterne-mit-haselnuessen-und-mandeln) | belegt | 145 g | 2–4 Monate – erst ab Mitte November einkaufen | nein | Haselnüsse, Mandeln, Ei; kann Gluten enthalten |
| Weihnachts-Chocolade Classic | Lindt, 100 g | REWE | 3,99 € · [Quelle](https://www.lindt.de/weihnachts-chocolade-classic-100g) | Richtwert | 115 g | 4–8 Monate | nein | Milch, Soja; kann Haselnüsse, Mandeln enthalten |

**Verpackung** (groß (33×24×10 cm)): Karton braun mit Steckverschluss · Holzwolle fein × 0,1 kg · Baumwoll-Köperband oliv × 1,5 m · Grußkarte A6 · Aufkleber rund 50 mm · Seidenpapier 50×75 cm × 2 Bogen · Wellpapp-Hülse für 0

| Einkauf Artikel | Verpackung | Zahlungsgebühr | Kosten gesamt | Verkaufspreis | Rohertrag | Marge | Packzeit |
|--:|--:|--:|--:|--:|--:|--:|--:|
| 15,29 € | 3,92 € | 1,30 € | 20,51 € | 39,00 € | **18,49 €** | **47,4 %** | ca. 7 min |

## Kollektion: Für Mitarbeiter

Anlässe gibt es das ganze Jahr: der erste Tag im neuen Job, ein abgeschlossenes Projekt, zehn Jahre im Betrieb. Diese Kisten sind immer lieferbar – einzeln an Privatadressen oder gesammelt ins Büro.

### Willkommen im Team – 39,00 €
<a id="willkommen-im-team"></a>

**Anlass:** Onboarding, erster Arbeitstag · **Für:** Neue Mitarbeiter – im Büro oder im Homeoffice

> Am ersten Tag liegt etwas auf dem Schreibtisch: ein A5-Notizbuch für die vielen neuen Namen, Kaffee, Gewürztee, Zartbitterschokolade und Studentenfutter. Bei Remote-Start schicken wir die Kiste direkt nach Hause – mit Namensanhänger und Ihrer Begrüßung auf der Karte.

**Warum so:** Ganzjähriger Bedarf, planbar über Eintrittstermine. Das Notizbuch macht aus einer Snackbox ein Onboarding-Geschenk; alles andere hält mindestens vier Monate.

| Artikel | Marke, Größe | Laden | Preis | Status | Gewicht | Haltbarkeit | Alkohol | Allergene (Entwurf) |
|---|---|---|--:|---|--:|---|---|---|
| Notizbuch DIN A5, 192 Seiten kariert | Stylex, 1 Stück | Rossmann | 3,19 € · [Quelle](https://www.rossmann.de/de/haushalt-stylex-notizbuch-din-a5/p/4044186292008) | belegt | 330 g | unbegrenzt | nein | kein Lebensmittel |
| Crema e Gusto, gemahlen | Lavazza, 250 g | Rossmann | 5,49 € · [Quelle](https://rossmann.de/de/ernaehrung-lavazza-crema-e-gusto/p/8000070038868) | belegt | 265 g | 12–18 Monate ab Röstung, im Regal meist > 6 Monate | nein | keine deklarationspflichtigen Allergene zu erwarten |
| Gewürztee Classic (Zimt, Kardamom, Ingwer), Bio | Yogi Tea, 17 Beutel | dm | 3,25 € · [Quelle](https://www.dm.de/p/d/1596551/yogi-tea-gewuerztee-classic-mit-zimt-kardamom-und-ingwer-17-beutel) | belegt | 65 g | 24–36 Monate | nein | laut dm-Produktseite vegan, gluten- und laktosefrei |
| Kakao-Klasse 74 % „Die Kräftige“ | Ritter Sport, 100 g | REWE | 2,29 € · [Quelle](https://www.knuspr.de/2062-ritter-sport-74-peru-die-kraeftige) | Richtwert | 105 g | 9–12 Monate | nein | kann Milch, Schalenfrüchte, Erdnüsse enthalten |
| Studentenfutter | Seeberger, 150 g | dm | 2,95 € · [Quelle](https://www.dm.de/p/d/1506045/seeberger-nuss-und-trockenfruechtemischung-studentenfutter) | belegt | 160 g | 4–8 Monate | nein | Schalenfrüchte (Haselnüsse, Cashew, Walnüsse, Mandeln); kann Erdnüsse enthalten |

**Verpackung** (flach (30,5×21,5×7,4 cm)): Faltschachtel braun mit Klappdeckel · Holzwolle fein × 0,06 kg · Baumwoll-Köperband oliv × 1,3 m · Grußkarte A6 · Aufkleber rund 50 mm · Seidenpapier 50×75 cm × 2 Bogen

| Einkauf Artikel | Verpackung | Zahlungsgebühr | Kosten gesamt | Verkaufspreis | Rohertrag | Marge | Packzeit |
|--:|--:|--:|--:|--:|--:|--:|--:|
| 17,17 € | 1,96 € | 1,30 € | 20,43 € | 39,00 € | **18,57 €** | **47,6 %** | ca. 6 min |

### Danke fürs Projekt – 29,00 €
<a id="danke-fuers-projekt"></a>

**Anlass:** Projektabschluss, Messe, Go-live, Überstunden · **Für:** Projektteams, auch standortübergreifend

> Wenn ein Projekt geschafft ist, sagt eine E-Mail an alle wenig. Diese Kiste sagt es mit 20 Stück Schokolade, einer Nusskern-Mischung, einer Tafel Zartbitter und Amarettini – und mit zwei Sätzen von Ihnen auf der Karte.

**Warum so:** Niedrige Schwelle (29 €) für spontane Anlässe. Vier haltbare Artikel ohne Saisonbindung, die das ganze Jahr im Regal stehen.

| Artikel | Marke, Größe | Laden | Preis | Status | Gewicht | Haltbarkeit | Alkohol | Allergene (Entwurf) |
|---|---|---|--:|---|--:|---|---|---|
| merci Finest Selection „Große Vielfalt“ | Storck, 250 g | Rossmann | 4,59 € · [Quelle](https://www.rossmann.de/de/lebensmittel-storck-merci-finest-selection/p/4014400901191) | belegt | 320 g | 6–9 Monate | nein | Milch, Soja, Haselnüsse, Mandeln; kann weitere Schalenfrüchte enthalten |
| Nusskern-Mischung | Seeberger, 150 g | dm | 3,95 € · [Quelle](https://www.dm.de/p/d/1506033/seeberger-nussmischung-nusskern-mischung-mit-haselnuss-mandel-cashew-und-walnuss) | belegt | 160 g | 4–8 Monate | nein | Schalenfrüchte (Haselnüsse, Mandeln, Cashew, Walnüsse); kann Erdnüsse enthalten |
| Kakao-Klasse 74 % „Die Kräftige“ | Ritter Sport, 100 g | REWE | 2,29 € · [Quelle](https://www.knuspr.de/2062-ritter-sport-74-peru-die-kraeftige) | Richtwert | 105 g | 9–12 Monate | nein | kann Milch, Schalenfrüchte, Erdnüsse enthalten |
| Amarettini | Gadeschi, 200 g | Rossmann | 1,79 € · [Quelle](https://www.rossmann.de/de/lebensmittel-gadeschi-amarettini-gebaeck/p/8008560001521) | belegt | 210 g | 6–9 Monate | nein | Ei, Aprikosenkerne/Mandeln; kann Gluten, Milch enthalten |

**Verpackung** (flach (30,5×21,5×7,4 cm)): Faltschachtel braun mit Klappdeckel · Holzwolle fein × 0,06 kg · Baumwoll-Köperband oliv × 1,3 m · Grußkarte A6 · Aufkleber rund 50 mm · Seidenpapier 50×75 cm × 2 Bogen

| Einkauf Artikel | Verpackung | Zahlungsgebühr | Kosten gesamt | Verkaufspreis | Rohertrag | Marge | Packzeit |
|--:|--:|--:|--:|--:|--:|--:|--:|
| 12,62 € | 1,96 € | 0,98 € | 15,56 € | 29,00 € | **13,44 €** | **46,3 %** | ca. 5 min |

### Jubiläum – 59,00 €
<a id="jubilaeum"></a>

**Anlass:** Dienstjubiläum, Beförderung, Abschied in den Ruhestand · **Für:** Einzelne Mitarbeiter, die etwas zu feiern haben

> Zehn Jahre im Betrieb verdienen mehr als einen Händedruck. In der Kiste: eine Flasche Riesling-Sekt, 16 Haselnuss-Pralinen, Lübecker Marzipan, eine Nusskern-Mischung und eine Tafel Edelbitter. Auf Wunsch mit alkoholfreiem Sekt.

**Warum so:** Höherer Preis für einen seltenen, persönlichen Anlass. Sekt ist der erwartete Artikel; die alkoholfreie Variante ist ohne Preisänderung wählbar.

| Artikel | Marke, Größe | Laden | Preis | Status | Gewicht | Haltbarkeit | Alkohol | Allergene (Entwurf) |
|---|---|---|--:|---|--:|---|---|---|
| Riesling Sekt trocken | Fürst von Metternich, 0,75 l | EDEKA | 9,99 € · [Quelle](https://www.edeka24.de/Wein-Spirituosen/Sekt-Prosecco/Fuerst-von-Metternich-Riesling-Sekt-trocken-0-75L.html) | Richtwert | 1400 g | kein MHD; 1–2 Jahre lagerfähig | ja (ca. 12 % vol) | enthält Sulfite |
| Rocher, 16 Stück | Ferrero, 200 g | REWE | 4,99 € · [Quelle](https://www.knuspr.de/1083-ferrero-rocher-16er) | Richtwert | 300 g | 4–8 Monate (im Sommer nicht im Sortiment) | nein | Haselnüsse, Milch, Weizen (Gluten), Soja |
| Marzipan-Schwarzbrot | Niederegger, 125 g | REWE | 3,80 € · [Quelle](https://www.supermarktcheck.de/rewe/sortiment/hersteller/niederegger/) | Richtwert | 135 g | 4–8 Monate | nein | Mandeln; kann Milch, Soja, andere Schalenfrüchte enthalten |
| Nusskern-Mischung | Seeberger, 150 g | dm | 3,95 € · [Quelle](https://www.dm.de/p/d/1506033/seeberger-nussmischung-nusskern-mischung-mit-haselnuss-mandel-cashew-und-walnuss) | belegt | 160 g | 4–8 Monate | nein | Schalenfrüchte (Haselnüsse, Mandeln, Cashew, Walnüsse); kann Erdnüsse enthalten |
| Kakao-Klasse 74 % „Die Kräftige“ | Ritter Sport, 100 g | REWE | 2,29 € · [Quelle](https://www.knuspr.de/2062-ritter-sport-74-peru-die-kraeftige) | Richtwert | 105 g | 9–12 Monate | nein | kann Milch, Schalenfrüchte, Erdnüsse enthalten |

Ohne Alkohol: statt Fürst von Metternich Riesling Sekt trocken → Rotkäppchen Sekt alkoholfrei (5,29 €, EDEKA). Der Preis der Box bleibt gleich.

**Verpackung** (groß (33×24×10 cm)): Karton braun mit Steckverschluss · Holzwolle fein × 0,1 kg · Baumwoll-Köperband oliv × 1,5 m · Grußkarte A6 · Aufkleber rund 50 mm · Seidenpapier 50×75 cm × 2 Bogen · Wellpapp-Hülse für 0

| Einkauf Artikel | Verpackung | Zahlungsgebühr | Kosten gesamt | Verkaufspreis | Rohertrag | Marge | Packzeit |
|--:|--:|--:|--:|--:|--:|--:|--:|
| 25,02 € | 3,92 € | 1,94 € | 30,88 € | 59,00 € | **28,12 €** | **47,7 %** | ca. 8 min |

### Geburtstagsgruß – 29,00 €
<a id="geburtstagsgruss"></a>

**Anlass:** Geburtstag im Team · **Für:** Alle Mitarbeiter – als Jahresvorrat oder einzeln bestellt

> Klein genug für jeden Geburtstag im Jahr: ein Piccolo zum Anstoßen, 20 Nuss-Pralinen, Zartbitterschokolade, Gewürztee und eine Tüte Fruchtgummi für die Kollegen. Viele Firmen bestellen einen Vorrat fürs ganze Jahr – alles hält mindestens vier Monate.

**Warum so:** Wiederkehrender Anlass mit vielen Einzelterminen: eignet sich für Vorratsbestellungen. Alles flach genug für den kleinsten Karton.

| Artikel | Marke, Größe | Laden | Preis | Status | Gewicht | Haltbarkeit | Alkohol | Allergene (Entwurf) |
|---|---|---|--:|---|--:|---|---|---|
| Sekt halbtrocken, Piccolo | Rotkäppchen, 0,2 l | Lidl | 1,69 € · [Quelle](https://www.lidl.de/p/rotkaeppchen-sekt-halbtrocken-0-2-l-flasche-schaumwein/p100385184) | belegt | 400 g | kein MHD; 1–2 Jahre lagerfähig | ja (11 % vol) | enthält Sulfite |
| Küsschen Klassik, 20 Stück | Ferrero, 178 g | Rossmann | 3,99 € · [Quelle](https://www.rossmann.de/de/lebensmittel-ferrero-kuesschen/p/4008400159027) | belegt | 230 g | 4–8 Monate (im Sommer nicht im Sortiment) | nein | Haselnüsse, Milch, Soja |
| Kakao-Klasse 74 % „Die Kräftige“ | Ritter Sport, 100 g | REWE | 2,29 € · [Quelle](https://www.knuspr.de/2062-ritter-sport-74-peru-die-kraeftige) | Richtwert | 105 g | 9–12 Monate | nein | kann Milch, Schalenfrüchte, Erdnüsse enthalten |
| Gewürztee Classic (Zimt, Kardamom, Ingwer), Bio | Yogi Tea, 17 Beutel | dm | 3,25 € · [Quelle](https://www.dm.de/p/d/1596551/yogi-tea-gewuerztee-classic-mit-zimt-kardamom-und-ingwer-17-beutel) | belegt | 65 g | 24–36 Monate | nein | laut dm-Produktseite vegan, gluten- und laktosefrei |
| Goldbären | Haribo, 175 g | Rossmann | 1,19 € · [Quelle](https://www.rossmann.de/de/lebensmittel-haribo-goldbaeren/p/4001686322840) | belegt | 180 g | 6–12 Monate | nein | keine deklarationspflichtigen Allergene; enthält Gelatine (nicht vegetarisch) |

Ohne Alkohol: statt Rotkäppchen Sekt halbtrocken, Piccolo → Rotkäppchen Sekt alkoholfrei, Piccolo (1,99 €, REWE). Der Preis der Box bleibt gleich.

**Verpackung** (klein (24×17×7 cm)): Faltschachtel braun mit Klappdeckel · Holzwolle fein × 0,045 kg · Baumwoll-Köperband oliv × 1,1 m · Grußkarte A6 · Aufkleber rund 50 mm · Seidenpapier 50×75 cm

| Einkauf Artikel | Verpackung | Zahlungsgebühr | Kosten gesamt | Verkaufspreis | Rohertrag | Marge | Packzeit |
|--:|--:|--:|--:|--:|--:|--:|--:|
| 12,41 € | 1,77 € | 0,98 € | 15,16 € | 29,00 € | **13,84 €** | **47,7 %** | ca. 5 min |

### Teamfrühstück – 75,00 €
<a id="teamfruehstueck"></a>

**Anlass:** Montagsrunde, Einstand, Abteilungsfrühstück · **Für:** Ein Team von 6 bis 10 Personen – eine Kiste zum Teilen

> Sie holen die Brötchen, der Rest steht schon auf dem Tisch: 500 g Kaffee, Erdbeer- und Aprikosenkonfitüre, ein Glas Landhonig, Bio-Nuss-Nougat-Creme und Gewürztee. Die Kiste reicht für ein Frühstück mit acht Personen – und die Gläser für viele weitere.

**Warum so:** Einzige Kiste für eine Gruppe statt für eine Person; ein Preis pro Team statt pro Kopf. Schwer (vier Gläser) – persönliche Lieferung ist hier besonders sinnvoll.

| Artikel | Marke, Größe | Laden | Preis | Status | Gewicht | Haltbarkeit | Alkohol | Allergene (Entwurf) |
|---|---|---|--:|---|--:|---|---|---|
| Prodomo, gemahlen | Dallmayr, 500 g | Aldi Süd | 9,99 € · [Quelle](https://www.aldi-sued.de/produkt/dallmayr-prodomo-500-g-000000000700636001) | belegt | 515 g | 9–18 Monate | nein | keine deklarationspflichtigen Allergene zu erwarten |
| Erdbeer-Konfitüre | Bonne Maman, 370 g | REWE | 3,69 € · [Quelle](https://www.knuspr.de/13394-bonne-maman-erdbeer-konfituere) | Richtwert | 600 g | 12–24 Monate | nein | keine deklarationspflichtigen Allergene zu erwarten |
| Aprikosen-Konfitüre | Bonne Maman, 370 g | REWE | 3,89 € · [Quelle](https://www.knuspr.de/13395-bonne-maman-aprikosen-konfituere) | Richtwert | 600 g | 12–24 Monate | nein | keine deklarationspflichtigen Allergene zu erwarten |
| Landhonig, Glas | Langnese, 500 g | REWE | 5,99 € · [Quelle](https://www.supermarktcheck.de/product/9828-langnese-flotte-biene-wildblueten-honig) | `geschätzt` | 760 g | 24 Monate und länger | nein | keine deklarationspflichtigen Allergene zu erwarten; nicht für Kinder unter 12 Monaten |
| Nocciolata Nuss-Nougat-Creme, Bio | Rigoni di Asiago, 270 g | EDEKA | 5,49 € · [Quelle](https://www.edeka24.de/Lebensmittel/Fruehstueck/Rigoni-di-Asiago-Bio-Nocciolata-Nuss-Nougat-Aufstrich-270-g.html) | Richtwert | 450 g | 9–15 Monate | nein | Haselnüsse, Milch; kann andere Schalenfrüchte enthalten |
| Gewürztee Classic (Zimt, Kardamom, Ingwer), Bio | Yogi Tea, 17 Beutel | dm | 3,25 € · [Quelle](https://www.dm.de/p/d/1596551/yogi-tea-gewuerztee-classic-mit-zimt-kardamom-und-ingwer-17-beutel) | belegt | 65 g | 24–36 Monate | nein | laut dm-Produktseite vegan, gluten- und laktosefrei |

**Verpackung** (groß (33×24×10 cm)): Karton braun mit Steckverschluss · Holzwolle fein × 0,1 kg · Baumwoll-Köperband oliv × 1,5 m · Grußkarte A6 · Aufkleber rund 50 mm · Seidenpapier 50×75 cm × 2 Bogen

| Einkauf Artikel | Verpackung | Zahlungsgebühr | Kosten gesamt | Verkaufspreis | Rohertrag | Marge | Packzeit |
|--:|--:|--:|--:|--:|--:|--:|--:|
| 32,30 € | 3,32 € | 2,45 € | 38,07 € | 75,00 € | **36,93 €** | **49,2 %** | ca. 8 min |

## Kollektion: Für Kunden

Beide Kisten liegen unter 50 € – der Grenze, bis zu der Geschenke an Geschäftspartner als Betriebsausgabe abziehbar sind. Mit Ihrem Logo auf dem Deckel und einer Karte mit Ihrem Text. Details klärt Ihr Steuerberater.

### Pasta-Abend – 39,00 €
<a id="pasta-abend"></a>

**Anlass:** Danke für Ihren Auftrag · **Für:** Kunden nach Projektabschluss, Auftraggeber, Vermittler

> Ein Dankeschön, das abends auf dem Tisch steht: Fusilli aus Hartweizen, Basilikum-Pesto, Tomatensugo, Kräuter-Oliven, Grissini und Amarettini zum Espresso danach. Reicht für vier Teller, hält über ein Jahr und kommt ohne Kühlschrank aus.

**Warum so:** Sechs Artikel, die nach viel aussehen, lange halten und im Einkauf günstig sind – die beste Marge im Sortiment. Herzhaft statt süß hebt die Kiste von üblichen Kundengeschenken ab.

| Artikel | Marke, Größe | Laden | Preis | Status | Gewicht | Haltbarkeit | Alkohol | Allergene (Entwurf) |
|---|---|---|--:|---|--:|---|---|---|
| Fusilli n° 34 | De Cecco, 500 g | EDEKA | 2,79 € · [Quelle](https://www.edeka24.de/De-Cecco-Fusilli-No-34-500G.html) | Richtwert | 515 g | 18–30 Monate | nein | Hartweizen (Gluten); kann Soja, Senf enthalten |
| Pesto alla Genovese | Barilla, 190 g | EDEKA | 3,59 € · [Quelle](https://www.edeka24.de/Lebensmittel/Sossen/Tomatensosse-Pesto/Barilla-Pesto-alla-Genovese-190G.html) | Richtwert | 350 g | 12–18 Monate | nein | Milch (Käse), Cashewkerne; kann andere Schalenfrüchte enthalten |
| Pastasauce Basilico | Barilla, 400 g | EDEKA | 3,19 € · [Quelle](https://www.edeka24.de/Lebensmittel/Sossen/Tomatensosse-Pesto/Barilla-Pasta-Sauce-Basilico-400G.html) | Richtwert | 620 g | 12–24 Monate | nein | keine deklarationspflichtigen Allergene zu erwarten |
| Kräuter-Oliven | Feinkost Dittmann, 170 g | REWE | 3,39 € · [Quelle](https://www.knuspr.de/4645-feinkost-dittmann-krauter-oliven) | Richtwert | 400 g | 12–24 Monate | nein | keine deklarationspflichtigen Allergene zu erwarten |
| Grissini Torinesi | Barilla oder Eigenmarke, 125 g | REWE | 1,79 € · [Quelle](https://www.rewe.de/shop/) | `geschätzt` | 140 g | 6–12 Monate | nein | Weizen (Gluten); kann Sesam, Milch enthalten |
| Amarettini | Gadeschi, 200 g | Rossmann | 1,79 € · [Quelle](https://www.rossmann.de/de/lebensmittel-gadeschi-amarettini-gebaeck/p/8008560001521) | belegt | 210 g | 6–9 Monate | nein | Ei, Aprikosenkerne/Mandeln; kann Gluten, Milch enthalten |

**Verpackung** (mittel (30,5×21,5×10 cm)): Stülpdeckelkarton braun · Holzwolle fein × 0,08 kg · Baumwoll-Köperband oliv × 1,4 m · Grußkarte A6 · Aufkleber rund 50 mm · Seidenpapier 50×75 cm × 2 Bogen

| Einkauf Artikel | Verpackung | Zahlungsgebühr | Kosten gesamt | Verkaufspreis | Rohertrag | Marge | Packzeit |
|--:|--:|--:|--:|--:|--:|--:|--:|
| 16,54 € | 2,81 € | 1,30 € | 20,65 € | 39,00 € | **18,35 €** | **47,1 %** | ca. 7 min |

### Auf gute Zusammenarbeit – 45,00 €
<a id="auf-gute-zusammenarbeit"></a>

**Anlass:** Neukunde willkommen, Vertragsabschluss, Jahresgespräch · **Für:** Neue Kunden und Geschäftspartner

> Der erste Auftrag ist unterschrieben – jetzt kommt etwas Persönliches hinterher: Kaffee, eine Tafel Edelbitter mit 70 % Kakao, Lübecker Marzipan, Cantuccini mit Mandeln und Studentenfutter. Mit 45 € bleibt die Kiste unter der 50-€-Grenze für Geschäftsgeschenke.

**Warum so:** Klassisch und unverfänglich für den ersten Kontakt: nichts Alkoholisches, nichts Saisonales, alles ganzjährig erhältlich.

| Artikel | Marke, Größe | Laden | Preis | Status | Gewicht | Haltbarkeit | Alkohol | Allergene (Entwurf) |
|---|---|---|--:|---|--:|---|---|---|
| Crema e Gusto, gemahlen | Lavazza, 250 g | Rossmann | 5,49 € · [Quelle](https://rossmann.de/de/ernaehrung-lavazza-crema-e-gusto/p/8000070038868) | belegt | 265 g | 12–18 Monate ab Röstung, im Regal meist > 6 Monate | nein | keine deklarationspflichtigen Allergene zu erwarten |
| Excellence 70 % Cacao | Lindt, 100 g | EDEKA | 4,99 € · [Quelle](https://www.edeka24.de/Lebensmittel/Suess-Salzig/Lindt-Excellence-Edelbitter-Intensiv-70-100G.html) | Richtwert | 115 g | 9–15 Monate | nein | kann Milch, Soja, Haselnüsse, Mandeln enthalten |
| Marzipan-Schwarzbrot | Niederegger, 125 g | REWE | 3,80 € · [Quelle](https://www.supermarktcheck.de/rewe/sortiment/hersteller/niederegger/) | Richtwert | 135 g | 4–8 Monate | nein | Mandeln; kann Milch, Soja, andere Schalenfrüchte enthalten |
| Herzstücke Cantuccini | EDEKA, 250 g | EDEKA | 3,29 € · [Quelle](https://www.edeka24.de/Lebensmittel/Suess-Salzig/EDEKA-Herzstuecke-Cantuccini-250G.html) | Richtwert | 265 g | 6–9 Monate | nein | Weizen (Gluten), Mandeln, Ei; kann Milch enthalten |
| Studentenfutter | Seeberger, 150 g | dm | 2,95 € · [Quelle](https://www.dm.de/p/d/1506045/seeberger-nuss-und-trockenfruechtemischung-studentenfutter) | belegt | 160 g | 4–8 Monate | nein | Schalenfrüchte (Haselnüsse, Cashew, Walnüsse, Mandeln); kann Erdnüsse enthalten |

**Verpackung** (flach (30,5×21,5×7,4 cm)): Faltschachtel braun mit Klappdeckel · Holzwolle fein × 0,06 kg · Baumwoll-Köperband oliv × 1,3 m · Grußkarte A6 · Aufkleber rund 50 mm · Seidenpapier 50×75 cm × 2 Bogen

| Einkauf Artikel | Verpackung | Zahlungsgebühr | Kosten gesamt | Verkaufspreis | Rohertrag | Marge | Packzeit |
|--:|--:|--:|--:|--:|--:|--:|--:|
| 20,52 € | 1,96 € | 1,49 € | 23,97 € | 45,00 € | **21,03 €** | **46,7 %** | ca. 6 min |

## Kollektion: Ostern

Ein Osternest für den Schreibtisch – mit Schokoladenhase, Tee und Gebäck.

Sichtbar: 15.02.2027 bis 24.03.2027.

### Osterkiste – 35,00 €
<a id="osterkiste"></a>

**Anlass:** Ostern · **Für:** Mitarbeiter und Kunden

> Ein Osternest ohne Suchen: ein Vollmilch-Schokoladenhase, 20 Stück Schokolade, Gewürztee und Amarettini – in Holzwolle statt Ostergras.

**Warum so:** Saisonaler Anlass im Frühjahr, wenn das Weihnachtsgeschäft vorbei ist. Preise der Saisonware sind geschätzt und werden im Februar 2027 geprüft.

| Artikel | Marke, Größe | Laden | Preis | Status | Gewicht | Haltbarkeit | Alkohol | Allergene (Entwurf) |
|---|---|---|--:|---|--:|---|---|---|
| Goldhase Vollmilch | Lindt, 100 g | REWE | 4,99 € · [Quelle](https://www.lindt.de/goldhase-gluecksbringer-edition-100g) | `geschätzt` | 110 g | 4–8 Monate | nein | Milch, Soja; kann Haselnüsse, Mandeln enthalten |
| merci Finest Selection „Große Vielfalt“ | Storck, 250 g | Rossmann | 4,59 € · [Quelle](https://www.rossmann.de/de/lebensmittel-storck-merci-finest-selection/p/4014400901191) | belegt | 320 g | 6–9 Monate | nein | Milch, Soja, Haselnüsse, Mandeln; kann weitere Schalenfrüchte enthalten |
| Gewürztee Classic (Zimt, Kardamom, Ingwer), Bio | Yogi Tea, 17 Beutel | dm | 3,25 € · [Quelle](https://www.dm.de/p/d/1596551/yogi-tea-gewuerztee-classic-mit-zimt-kardamom-und-ingwer-17-beutel) | belegt | 65 g | 24–36 Monate | nein | laut dm-Produktseite vegan, gluten- und laktosefrei |
| Amarettini | Gadeschi, 200 g | Rossmann | 1,79 € · [Quelle](https://www.rossmann.de/de/lebensmittel-gadeschi-amarettini-gebaeck/p/8008560001521) | belegt | 210 g | 6–9 Monate | nein | Ei, Aprikosenkerne/Mandeln; kann Gluten, Milch enthalten |

**Verpackung** (flach (30,5×21,5×7,4 cm)): Faltschachtel braun mit Klappdeckel · Holzwolle fein × 0,06 kg · Baumwoll-Köperband oliv × 1,3 m · Grußkarte A6 · Aufkleber rund 50 mm · Seidenpapier 50×75 cm × 2 Bogen

| Einkauf Artikel | Verpackung | Zahlungsgebühr | Kosten gesamt | Verkaufspreis | Rohertrag | Marge | Packzeit |
|--:|--:|--:|--:|--:|--:|--:|--:|
| 14,62 € | 1,96 € | 1,17 € | 17,75 € | 35,00 € | **17,25 €** | **49,3 %** | ca. 5 min |

## Kollektion: Sommer

Holunderblütensirup, Oliven und Grissini – eine Kiste für den Balkon, ganz ohne Alkohol.

Sichtbar: 01.06.2027 bis 31.08.2027.

### Sommerkiste – 39,00 €
<a id="sommerkiste"></a>

**Anlass:** Sommerfest, Urlaubsgruß, Halbjahresabschluss · **Für:** Mitarbeiter und Kunden

> Für den ersten Abend auf dem Balkon: Holunderblütensirup für Schorle, Kräuter-Oliven, Grissini, geröstete Mandeln und Amarettini. Ohne Schokolade, die schmelzen könnte, und ohne Alkohol.

**Warum so:** Sommertauglich: keine Schokolade (Hitze im Paket), kein Alkohol. Wird erst ab Juni gezeigt.

| Artikel | Marke, Größe | Laden | Preis | Status | Gewicht | Haltbarkeit | Alkohol | Allergene (Entwurf) |
|---|---|---|--:|---|--:|---|---|---|
| Sirup Holunderblüte | Yo, 0,7 l | REWE | 3,99 € · [Quelle](https://www.knuspr.de/1521-yo-holunderblute-sirup) | Richtwert | 1250 g | 12–18 Monate | nein | keine deklarationspflichtigen Allergene zu erwarten |
| Kräuter-Oliven | Feinkost Dittmann, 170 g | REWE | 3,39 € · [Quelle](https://www.knuspr.de/4645-feinkost-dittmann-krauter-oliven) | Richtwert | 400 g | 12–24 Monate | nein | keine deklarationspflichtigen Allergene zu erwarten |
| Grissini Torinesi | Barilla oder Eigenmarke, 125 g | REWE | 1,79 € · [Quelle](https://www.rewe.de/shop/) | `geschätzt` | 140 g | 6–12 Monate | nein | Weizen (Gluten); kann Sesam, Milch enthalten |
| Geröstete Mandeln | Seeberger, 150 g | Rossmann | 4,19 € · [Quelle](https://www.rossmann.de/de/lebensmittel-seeberger-geroestete-mandeln/p/4008258074008) | belegt | 160 g | 4–8 Monate | nein | Mandeln; kann andere Schalenfrüchte, Erdnüsse enthalten |
| Amarettini | Gadeschi, 200 g | Rossmann | 1,79 € · [Quelle](https://www.rossmann.de/de/lebensmittel-gadeschi-amarettini-gebaeck/p/8008560001521) | belegt | 210 g | 6–9 Monate | nein | Ei, Aprikosenkerne/Mandeln; kann Gluten, Milch enthalten |

**Verpackung** (groß (33×24×10 cm)): Karton braun mit Steckverschluss · Holzwolle fein × 0,1 kg · Baumwoll-Köperband oliv × 1,5 m · Grußkarte A6 · Aufkleber rund 50 mm · Seidenpapier 50×75 cm × 2 Bogen · Wellpapp-Hülse für 0

| Einkauf Artikel | Verpackung | Zahlungsgebühr | Kosten gesamt | Verkaufspreis | Rohertrag | Marge | Packzeit |
|--:|--:|--:|--:|--:|--:|--:|--:|
| 15,15 € | 3,92 € | 1,30 € | 20,37 € | 39,00 € | **18,63 €** | **47,8 %** | ca. 7 min |

## Verpackung

Alle Preise brutto. Quelle der Recherche: Suchauszüge der Shopseiten vom 15.11.2026; vor der ersten Bestellung im Shop gegenprüfen.

| Material | Lieferant | Einheit | Preis | Status | Hinweis |
|---|---|---|--:|---|---|
| Faltschachtel braun mit Klappdeckel, 240×170×73 mm (Fefco 0427) | karton.eu | Stück | 0,60 € · [Quelle](https://www.karton.eu/240x170x73-mm-Single-Wall-Folding-Box) | `geschätzt` | Staffel belegt: 10 St. 2,26 €/St., 1.400 St. 0,35 €/St.; Preis bei 100 St. geschätzt 0,45–0,60 € |
| Faltschachtel braun mit Klappdeckel, 305×215×74 mm (Art. 6303) | karton.eu | Stück | 0,55 € · [Quelle](https://www.karton.eu/305x215x74-mm-Faltschachtel-DHL-Kleinpaket) | belegt | Staffel inkl. MwSt.: 100 St. 0,55 €/St., 200 St. 0,39 €/St., versandkostenfrei |
| Stülpdeckelkarton braun, 2-teilig, 305×215×100 mm | verpackungsteam.de | Stück | 1,25 € · [Quelle](https://verpackungsteam.de/Verpackungsmaterial/Kartons/Din-A4-Groesse/Stuelpdeckelkarton-aus-Wellpappe-braun-hoehenverstellbar-2-teilig-305x215x100mm::2976.html) | Richtwert | 25–124 St.: 0,932 € netto = 1,11 € brutto je Stück; zzgl. Versand (Anteil mit 0,14 € geschätzt) |
| Karton braun mit Steckverschluss, innen 331×241×104 mm | kayoo.eu | Stück | 1,60 € · [Quelle](https://www.kayoo.eu/business-industrie/kartonagen-faltschachteln/dpd-kartons/paketklasse-s/3407/versandkarton-331-x-241-x-104-mm-mit-steckverschluss-in-braun) | `geschätzt` | Auszug: 1,94–2,08 € bei 20 St., 1,26 € ab 120 St.; netto/brutto unklar – mit 1,60 € angesetzt |
| Holzwolle fein, natur (für trockene Lebensmittel geeignet) | natuerlich-verpacken.de | kg | 6,00 € · [Quelle](https://www.natuerlich-verpacken.de/wood-wool-fine-natural-padding-material) | Richtwert | 4,5 kg für 24,29 € = 5,40 €/kg inkl. MwSt.; zzgl. Versand (auf 6,00 €/kg aufgerundet) |
| Baumwoll-Köperband oliv, 10–15 mm | baender24.de | m | 0,35 € · [Quelle](https://www.baender24.de/baender/einfassband-/-schraegband/koeperband/) | `geschätzt` | Köperband 20 mm khaki, 50 m für 15,99 € = 0,32 €/m; genau Oliv in 10–15 mm nicht belegt |
| Grußkarte A6, bedruckt, 330 g | moo.com | Stück | 0,35 € · [Quelle](https://www.moo.com/de/postcards/a6) | Richtwert | Staffel je Stück: 250 St. 0,35 €, 500 St. 0,30 € |
| Aufkleber rund 50 mm, bedruckt | saxoprint.de | Stück | 0,08 € · [Quelle](https://www.saxoprint.de/werbebedarf/aufkleber/runde-aufkleber) | Richtwert | 500 St. 31,33 € (0,063–0,075 €/St. je nach MwSt.-Ausweis); bei kleinen Kundenauflagen Selbstdruck auf Avery-Kraftetikett ca. 0,06 € |
| Seidenpapier 50×75 cm, 22 g/m², lebensmittelecht | hilde24.de | Bogen | 0,08 € · [Quelle](https://www.hilde24.de/Seidenpapier-ca-22-g-m%C2%B2-Format-50-x-75-cm/14/AA9079C/) | Richtwert | 480 Bogen 29,73 € (vermutlich netto → ca. 0,074 € brutto je Bogen) |
| Wellpapp-Hülse für 0,75-l-Flasche | karton.eu | Stück | 0,60 € · [Quelle](https://www.karton.eu/) | `geschätzt` | Kein Preisbeleg; Schätzung. DHL sieht für Flaschen zertifizierte Flaschenkartons vor (dhl.de/verpackung) |
| Versandkarton einwellig 350×250×100 mm (für eine Box) | karton.eu | Stück | 0,80 € · [Quelle](https://www.karton.eu/350x250x100-mm-Single-Wall-Box-Parcel-for-DHL-External-Dimensions) | `geschätzt` | Staffel: 20 St. 1,52 €/St., 2.720 St. 0,37 €/St.; bei 100 St. geschätzt 0,55–0,90 € |
| Sammelkarton zweiwellig 600×400×400 mm | karton.eu | Stück | 3,50 € · [Quelle](https://www.karton.eu/600x400x400-mm-Double-Wall-Box-External-Dimensions) | `geschätzt` | Titelpreis „ab 1,40 €“ (höchste Staffel); älterer Auszug 50 St. 3,38 €/St. – mit 3,50 € angesetzt |
| Kraft-Anhänger 90×40 mm mit Juteschnur | Amazon (ABSOFINE) / Bürobedarf | Stück | 0,10 € · [Quelle](https://www.beste-testsieger.de/produkte/absofine-preisschilder/) | Richtwert | 200 St. 9,59 € = 0,05 €/St.; mit Druck/Beschriftung 0,10 € angesetzt |
| Banderole 7 cm, Selbstdruck auf 120-g-Papier (zwei Streifen) | Selbstdruck | Stück | 0,30 € · [Quelle](https://print24.com/uk/printing-products/banderoles) | `geschätzt` | Kein Preisbeleg; Schätzung Papier + Toner. Druckerei-Banderolen geschätzt 0,25–0,60 € bei 100–250 St. |
| Zuschlag handgeschriebene Karte (Umschlag C6 Kraft, Fineliner) | Bürobedarf | Stück | 0,15 € · [Quelle](https://www.ebay.de/str/envelopes4u2) | `geschätzt` | Umschläge C6 Kraft 0,03–0,06 €/St.; Stiftverbrauch geschätzt |

**Vier Kartongrößen statt einer:** Flache Kisten ohne Glas kommen in den günstigen Klappdeckelkarton (0,55 €); nur Kisten mit Gläsern oder Flaschen brauchen 10 cm Höhe. Das spart je Box 0,70–1,05 € und hält leichte Kisten unter 2 kg.

**Offen vor dem Start:** olivgrünes Baumwollband in 10–15 mm (Farbe beim Händler anfragen), genaue Staffelpreise der kleinen und großen Kartons, Versandkosten bei verpackungsteam.de und natuerlich-verpacken.de.

## Personalisierung

| Option | Preis je Box | Material | Warum |
|---|--:|--:|---|
| Logo-Sticker auf dem Deckel | inklusive | 0,08 € (in Verpackung kalkuliert) | Das Logo ist der Grund, bei uns statt im Supermarkt zu kaufen – es darf keine Hürde sein. Kleine Auflagen im Selbstdruck auf runde Kraft-Etiketten. |
| Gedruckte Grußkarte mit eigenem Text | inklusive | 0,35 € (in Verpackung kalkuliert) | Jede Kiste braucht einen Absender. Bis 350 Zeichen. |
| Handgeschriebene Karte | 2,50 € | 0,15 € | Etwa 3 Minuten Schreibarbeit je Karte; der Aufpreis entspricht rund 45 €/Stunde. |
| Banderole mit Logo | 1,20 € | 0,30 € | Zuschneiden und Anlegen ca. 1 Minute; wirkt wie eine eigene Verpackung des Kunden. |
| Namensanhänger je Empfänger | 0,80 € | 0,10 € | Namen kommen aus der Empfängerliste; erleichtert die Verteilung im Büro. |
| Bandfarbe (Oliv, Natur, Salbei, Dunkles Oliv) | inklusive | – | Kostet nichts extra, gibt dem Kunden eine Wahl. |
| Versand an mehrere Empfänger | Versandkosten je Adresse | – | CSV-Upload; je Adresse ein Paket nach Gewicht. |

Alle drei Aufpreis-Optionen zusammen: 4,50 € – eine 45-€-Kiste bleibt damit bei 49,50 €.

## Mengenrabatt und Mindestmenge

Mindestbestellung 5 Boxen (mischbar). Staffel auf den Warenwert: ab 10 Boxen 3 % · ab 25 Boxen 5 % · ab 50 Boxen 8 % · ab 100 Boxen 10 %. Der Rabatt wird auf den Stückpreis gerechnet; Personalisierung und Versand sind nicht rabattiert.

## Versandkosten (Startwerte, im Admin änderbar)

DHL-Privatkundenpreise bei Online-Frankierung 2026 ([dhl.de](https://www.dhl.de/en/privatkunden/pakete-versenden/deutschlandweit-versenden/preise-national.html), geprüft 15.11.2026). Ein Geschäftskundenvertrag ist ab etwa 200 Sendungen im Jahr möglich und günstiger. Ab 01.01.2027 steigen 10-, 20- und 31,5-kg-Pakete online um je 1 € ([DHL-Pressemitteilung 13.11.2026](https://group.dhl.com/content/dam/deutschepostdhl/de/media-relations/press-releases/2026/pm-preisaenderung-paketpreise-20261113.pdf)) – dann „Kosten“ im Admin anpassen.

| Paket bis | DHL-Porto (Kosten) | Material je Paket | Preis für Kunden |
|--:|--:|--:|--:|
| 2,00 kg | 6,19 € | 0,90 € | 7,90 € |
| 5,00 kg | 7,69 € | 0,90 € | 9,50 € |
| 10,00 kg | 10,49 € | 0,90 € | 12,90 € |
| 20,00 kg | 18,99 € | 0,90 € | 21,90 € |
| 31,50 kg | 23,99 € | 0,90 € | 26,90 € |

Persönliche Lieferung im Liefergebiet: 9,90 €, ab 250,00 € Warenwert kostenlos.
