import { describe, expect, it } from "vitest";
import { boxen } from "../db/seed-data/boxen";
import { werteBoxAus } from "../db/seed-data/kalkulation";
import { leseEmpfaengerCsv, csvVorlage } from "@/lib/calc/csv";
import { imLiefergebiet, lieferStatus, lieferTage, plusWerktage, terminGueltig, versandTermine } from "@/lib/calc/deadlines";
import { ampelFuer, gebuehrFuerBestellung, gebuehrJeBox, kalkuliereBox, preisFuerMarge } from "@/lib/calc/margin";
import { artikelKosten, berechneGewinn, neuerEinstand, roi, summiere, verteileAusgaben } from "@/lib/calc/profit";
import { berechneAngebot, staffelFuer, type AngebotEingabe, type KatalogBox } from "@/lib/calc/quote";
import { packePakete, PLATZ, stufeFuer, versandFuerAdressen } from "@/lib/calc/shipping";
import { startEinstellungen as E } from "@/lib/einstellungen";
import { euro, euroMinus, parseEuro, prozent } from "@/lib/geld";

const katalog: KatalogBox[] = [
  { slug: "klein", name: "Kleine", preisCent: 2900, groesse: "klein", gewichtGramm: 660, alkohol: false },
  { slug: "standard", name: "Standard", preisCent: 4500, groesse: "flach", gewichtGramm: 1130, alkohol: false },
  { slug: "gross", name: "Große", preisCent: 6900, groesse: "gross", gewichtGramm: 3170, alkohol: true },
];
const basis: AngebotEingabe = {
  positionen: [{ slug: "standard", menge: 5 }],
  perso: { handgeschrieben: false, banderole: false, namensanhaenger: false },
  lieferung: { art: "versand" },
};

describe("Geld", () => {
  it("formatiert Euro mit geschütztem Leerzeichen", () => {
    expect(euro(4500)).toBe("45 €");
    expect(euro(4550)).toBe("45,50 €");
    expect(euro(123456)).toBe("1.234,56 €");
    expect(euro(4500, { immerCent: true })).toBe("45,00 €");
  });
  it("nutzt ein echtes Minuszeichen bei Rabatten", () => {
    expect(euroMinus(250)).toBe("−" + "2,50 €");
    expect(euro(-100)).toBe("−1 €");
  });
  it("liest Eingaben", () => {
    expect(parseEuro("12,50")).toBe(1250);
    expect(parseEuro("12.5 €")).toBe(1250);
    expect(parseEuro("7")).toBe(700);
    expect(parseEuro("abc")).toBeNull();
    expect(parseEuro("1,234")).toBeNull();
  });
  it("formatiert Prozent", () => expect(prozent(46.74)).toBe("46,7 %"));
});

describe("Box-Kalkulation", () => {
  const g = E.gebuehren;
  it("rechnet Einkauf, Verpackung, Gebühr und Marge", () => {
    const k = kalkuliereBox({
      preisCent: 4500,
      artikel: [{ preisCent: 549, menge: 1 }, { preisCent: 380, menge: 2 }],
      verpackung: [{ preisCent: 55, menge: 1 }, { preisCent: 600, menge: 0.06 }],
      gebuehren: g,
      mindestmenge: 5,
    });
    expect(k.einkaufCent).toBe(1309);
    expect(k.verpackungCent).toBe(91);
    expect(k.gebuehrCent).toBe(Math.round(4500 * 0.032) + 5);
    expect(k.rohertragCent).toBe(4500 - 1309 - 91 - 149);
    expect(k.margeProzent).toBeCloseTo(65.58, 1);
    expect(k.ampel).toBe("gut");
  });
  it("Ampel: Warnung unter 45 %, rot unter 35 %", () => {
    expect(ampelFuer(45)).toBe("gut");
    expect(ampelFuer(44.9)).toBe("warnung");
    expect(ampelFuer(35)).toBe("warnung");
    expect(ampelFuer(34.9)).toBe("rot");
  });
  it("Gebühr je Bestellung: Kartenanteil + gedeckelte Rechnungsgebühr", () => {
    expect(gebuehrFuerBestellung(22500, g)).toBe(630 + 25 + 90);
    expect(gebuehrFuerBestellung(100000, g)).toBe(2800 + 25 + 190);
    expect(gebuehrFuerBestellung(0, g)).toBe(0);
    expect(gebuehrJeBox(2900, g, 5)).toBe(93 + 5);
  });
  it("findet den Preis für eine Zielmarge", () => {
    const eingabe = { artikel: [{ preisCent: 2000, menge: 1 }], verpackung: [{ preisCent: 200, menge: 1 }], gebuehren: g, mindestmenge: 5 };
    const preis = preisFuerMarge({ ...eingabe, zielProzent: 45 });
    expect(kalkuliereBox({ ...eingabe, preisCent: preis }).margeProzent).toBeGreaterThanOrEqual(45);
    expect(kalkuliereBox({ ...eingabe, preisCent: preis - 100 }).margeProzent).toBeLessThan(45);
  });
  it("jede Box im Sortiment erreicht mindestens 45 % Rohertrag", () => {
    for (const box of boxen) {
      const a = werteBoxAus(box);
      expect(a.kalk.margeProzent, box.slug).toBeGreaterThanOrEqual(45);
    }
  });
  it("jede Box bleibt auch mit dem höchsten Staffelrabatt über 35 %", () => {
    const r = Math.max(...E.staffeln.map((s) => s.prozent)) / 100;
    for (const box of boxen) {
      const a = werteBoxAus(box);
      const preis = Math.round(box.preisCent * (1 - r));
      const k = kalkuliereBox({
        preisCent: preis,
        artikel: a.artikel.map((x) => ({ preisCent: x.artikel.preisCent, menge: x.menge })),
        verpackung: a.verpackung.map((x) => ({ preisCent: x.item.preisCent, menge: x.menge })),
        gebuehren: g,
        mindestmenge: 5,
      });
      expect(k.margeProzent, box.slug).toBeGreaterThanOrEqual(35);
    }
  });
});

describe("Versand", () => {
  const v = E.versand;
  it("wählt die Preisstufe nach Gewicht", () => {
    expect(stufeFuer(1999, v).stufe.bisGramm).toBe(2000);
    expect(stufeFuer(2000, v).stufe.bisGramm).toBe(2000);
    expect(stufeFuer(2001, v).stufe.bisGramm).toBe(5000);
    expect(stufeFuer(40000, v)).toMatchObject({ uebergewicht: true });
  });
  it("eine Box: Einzelpaket mit Umkarton", () => {
    const [p] = packePakete([{ gewichtGramm: 1130, platz: PLATZ.flach }], v);
    expect(p.gewichtGramm).toBe(1330);
    expect(p.preisCent).toBe(790);
    expect(p.kostenCent).toBe(619 + 90);
  });
  it("fünf Boxen an eine Adresse: ein Sammelpaket", () => {
    const pakete = packePakete(Array.from({ length: 5 }, () => ({ gewichtGramm: 1130, platz: PLATZ.flach })), v);
    expect(pakete).toHaveLength(1);
    expect(pakete[0].gewichtGramm).toBe(5 * 1130 + 900);
    expect(pakete[0].preisCent).toBe(1290);
  });
  it("teilt nach Platz und Gewicht auf mehrere Pakete", () => {
    const nachPlatz = packePakete(Array.from({ length: 13 }, () => ({ gewichtGramm: 1000, platz: 1 })), v);
    expect(nachPlatz.map((p) => p.boxen)).toEqual([6, 6, 1]);
    const nachGewicht = packePakete(Array.from({ length: 6 }, () => ({ gewichtGramm: 3300, platz: 1 })), v);
    expect(nachGewicht.map((p) => p.boxen)).toEqual([5, 1]);
    expect(nachGewicht.every((p) => p.gewichtGramm <= v.maxPaketGramm)).toBe(true);
  });
  it("mehrere Adressen: je Adresse eigene Pakete", () => {
    const e = versandFuerAdressen([[{ gewichtGramm: 660, platz: 0.6 }], [{ gewichtGramm: 3170, platz: 1.3 }], []], v);
    expect(e.pakete).toHaveLength(2);
    expect(e.preisCent).toBe(790 + 950);
    expect(e.kostenCent).toBe(619 + 769 + 180);
  });
});

describe("Angebot", () => {
  it("Mindestmenge 5", () => {
    const a = berechneAngebot({ ...basis, positionen: [{ slug: "standard", menge: 4 }] }, katalog, E);
    expect(a.fehler[0].text).toContain("Mindestbestellmenge");
    expect(berechneAngebot(basis, katalog, E).fehler).toEqual([]);
  });
  it("mischt Boxen und summiert", () => {
    const a = berechneAngebot({ ...basis, positionen: [{ slug: "klein", menge: 2 }, { slug: "standard", menge: 3 }, { slug: "klein", menge: 1 }] }, katalog, E);
    expect(a.anzahlBoxen).toBe(6);
    expect(a.warenCent).toBe(3 * 2900 + 3 * 4500);
    expect(a.staffelProzent).toBe(0);
  });
  it("Staffelrabatt je Stück, auf Cent gerundet", () => {
    expect(staffelFuer(9, E.staffeln)).toBe(0);
    expect(staffelFuer(10, E.staffeln)).toBe(3);
    expect(staffelFuer(25, E.staffeln)).toBe(5);
    expect(staffelFuer(50, E.staffeln)).toBe(8);
    expect(staffelFuer(250, E.staffeln)).toBe(10);
    const a = berechneAngebot({ ...basis, positionen: [{ slug: "klein", menge: 10 }] }, katalog, E);
    expect(a.zeilen[0].stueckpreisCent).toBe(2813);
    expect(a.warenCent).toBe(28130);
    expect(a.staffelRabattCent).toBe(870);
    expect(a.naechsteStaffel).toEqual({ ab: 25, prozent: 5, fehlen: 15 });
  });
  it("Personalisierung je Box, ohne Staffelrabatt", () => {
    const a = berechneAngebot({ ...basis, positionen: [{ slug: "standard", menge: 10 }], perso: { handgeschrieben: true, banderole: true, namensanhaenger: true } }, katalog, E);
    expect(a.personalisierungCent).toBe(10 * (250 + 120 + 80));
    expect(a.persoMaterialCent).toBe(10 * (15 + 30 + 10));
  });
  it("Rabattcode auf Waren und Personalisierung, nicht auf Versand", () => {
    const pro = berechneAngebot({ ...basis, perso: { ...basis.perso, handgeschrieben: true }, rabatt: { code: "X", art: "prozent", wert: 10 } }, katalog, E);
    expect(pro.rabattCodeCent).toBe(Math.round((22500 + 1250) * 0.1));
    expect(pro.summeCent).toBe(23750 - 2375 + pro.versand.preisCent);
    const fix = berechneAngebot({ ...basis, rabatt: { code: "X", art: "betrag", wert: 999999 } }, katalog, E);
    expect(fix.rabattCodeCent).toBe(22500);
    expect(fix.summeCent).toBe(fix.versand.preisCent);
  });
  it("ignoriert Preise und unbekannte Felder vom Client", () => {
    const manipuliert = { ...basis, positionen: [{ slug: "standard", menge: 5, preisCent: 1, stueckpreisCent: 1 }], summeCent: 1 } as unknown as AngebotEingabe;
    expect(berechneAngebot(manipuliert, katalog, E).summeCent).toBe(berechneAngebot(basis, katalog, E).summeCent);
  });
  it("lehnt unbekannte Boxen und unsinnige Mengen ab", () => {
    const a = berechneAngebot({ ...basis, positionen: [{ slug: "gibtsnicht", menge: 5 }, { slug: "standard", menge: -3 }, { slug: "standard", menge: 2.9 }] }, katalog, E);
    expect(a.anzahlBoxen).toBe(2);
    expect(a.fehler.some((f) => f.text.includes("nicht mehr verfügbar"))).toBe(true);
  });
  it("Versand an eine Adresse nach Gewicht", () => {
    const a = berechneAngebot(basis, katalog, E);
    expect(a.versand.pakete).toHaveLength(1);
    expect(a.versand.preisCent).toBe(1290);
    expect(a.summeCent).toBe(22500 + 1290);
  });
  it("Versand an mehrere Empfänger: je Adresse ein Paket, Mengen müssen passen", () => {
    const ok = berechneAngebot({ ...basis, lieferung: { art: "mehrfach", empfaenger: Array.from({ length: 5 }, () => ({ boxSlug: "standard", menge: 1 })) } }, katalog, E);
    expect(ok.fehler).toEqual([]);
    expect(ok.versand.pakete).toHaveLength(5);
    expect(ok.versand.preisCent).toBe(5 * 790);
    const falsch = berechneAngebot({ ...basis, lieferung: { art: "mehrfach", empfaenger: [{ boxSlug: "standard", menge: 3 }, { boxSlug: "klein", menge: 1 }] } }, katalog, E);
    expect(falsch.fehler.filter((f) => f.feld === "empfaenger")).toHaveLength(2);
  });
  it("persönliche Lieferung: Gebühr, ab Freigrenze kostenlos, nur im Liefergebiet", () => {
    const a = berechneAngebot({ ...basis, lieferung: { art: "persoenlich", plz: "68161" } }, katalog, E);
    expect(a.versand.preisCent).toBe(990);
    expect(a.fehler).toEqual([]);
    const frei = berechneAngebot({ positionen: [{ slug: "standard", menge: 6 }], perso: basis.perso, lieferung: { art: "persoenlich", plz: "68723" } }, katalog, E);
    expect(frei.versand.preisCent).toBe(0);
    const aussen = berechneAngebot({ ...basis, lieferung: { art: "persoenlich", plz: "10115" } }, katalog, E);
    expect(aussen.fehler[0].feld).toBe("lieferung");
  });
  it("erkennt Alkohol im Warenkorb", () => {
    expect(berechneAngebot(basis, katalog, E).enthaeltAlkohol).toBe(false);
    expect(berechneAngebot({ ...basis, positionen: [{ slug: "gross", menge: 5 }] }, katalog, E).enthaeltAlkohol).toBe(true);
  });
});

describe("Fristen und Liefergebiet", () => {
  const f = E.fristen;
  it("Bestellschluss gilt je Lieferart, einschließlich des Stichtags", () => {
    expect(lieferStatus("versand", "2026-12-10", f)).toMatchObject({ verfuegbar: true, saison: true });
    expect(lieferStatus("versand", "2026-12-11", f)).toMatchObject({ verfuegbar: false, wiederAb: "2027-01-07" });
    expect(lieferStatus("persoenlich", "2026-12-11", f)).toMatchObject({ verfuegbar: true });
    expect(lieferStatus("persoenlich", "2026-12-13", f)).toMatchObject({ verfuegbar: false });
    expect(lieferStatus("versand", "2027-01-07", f)).toMatchObject({ verfuegbar: true, saison: false });
    expect(lieferStatus("versand", "2026-12-20", { ...f, aktiv: false })).toMatchObject({ verfuegbar: true });
  });
  it("Werktage überspringen Wochenenden und feste Feiertage", () => {
    expect(plusWerktage("2026-12-10", 5)).toBe("2026-12-17");
    expect(plusWerktage("2026-12-23", 2)).toBe("2026-12-28");
    expect(plusWerktage("2026-12-31", 1)).toBe("2027-01-04");
  });
  it("Versandtermine: in der Saison zusätzlich „zum Fest“", () => {
    expect(versandTermine("2026-11-20", f).map((t) => t.id)).toEqual(["saison", "schnell"]);
    expect(versandTermine("2026-12-10", f).map((t) => t.id)).toEqual(["saison"]);
    expect(versandTermine("2026-12-11", f)).toEqual([]);
    expect(versandTermine("2027-02-01", f).map((t) => t.id)).toEqual(["schnell"]);
  });
  it("Liefertage: mit Vorlauf, ohne Sonntage, Betriebsruhe nach dem Fenster", () => {
    const tage = lieferTage("2026-12-08", f, 12).map((t) => t.id);
    expect(tage[0]).toBe("2026-12-14");
    expect(tage).toContain("2026-12-19");
    expect(tage).not.toContain("2026-12-13");
    expect(tage).not.toContain("2026-12-21");
    expect(tage.find((t) => t > "2026-12-19")).toBe("2027-01-07");
    expect(lieferTage("2026-12-08", f).filter((t) => t.saison).map((t) => t.id)).toEqual(["2026-12-15", "2026-12-16", "2026-12-17", "2026-12-18", "2026-12-19"]);
  });
  it("prüft den gewählten Termin serverseitig", () => {
    expect(terminGueltig("versand", "saison", "2026-12-01", f)).toBe(true);
    expect(terminGueltig("versand", "saison", "2026-12-11", f)).toBe(false);
    expect(terminGueltig("mehrfach", "schnell", "2027-03-01", f)).toBe(true);
    expect(terminGueltig("persoenlich", "2026-12-16", "2026-12-01", f)).toBe(true);
    expect(terminGueltig("persoenlich", "2026-12-02", "2026-12-01", f)).toBe(false);
    expect(terminGueltig("persoenlich", "2026-12-20", "2026-12-01", f)).toBe(false);
    expect(terminGueltig("persoenlich", "2026-12-16", "2026-12-13", f)).toBe(false);
  });
  it("Liefergebiet über PLZ-Präfixe", () => {
    const p = E.lieferung.plzPraefixe;
    for (const plz of ["68723", "68161", "68309", "69115", "69214", "68789"]) expect(imLiefergebiet(plz, p), plz).toBe(true);
    for (const plz of ["67059", "76131", "68799", "6816", "abcde", ""]) expect(imLiefergebiet(plz, p), plz).toBe(false);
  });
});

describe("Gewinn", () => {
  const b = {
    summeCent: 23790, bezahltCent: null, erstattetCent: 0,
    planArtikelCent: 10265, echtArtikelCent: null, planVerpackungCent: 980, planPersoMaterialCent: 0,
    planVersandKostenCent: 1139, echtVersandKostenCent: null, planGebuehrCent: 786, stripeGebuehrCent: null,
  };
  it("geplant: Umsatz minus alle Posten", () => {
    const g = berechneGewinn(b);
    expect(g.geplant.gewinnCent).toBe(23790 - 10265 - 980 - 1139 - 786);
    expect(g.echt.gewinnCent).toBe(g.geplant.gewinnCent);
    expect(g.offen).toEqual(["artikel", "versand", "gebuehr"]);
  });
  it("echt: tatsächliche Werte ersetzen Planwerte, inkl. Stripe-Gebühr", () => {
    const g = berechneGewinn({ ...b, bezahltCent: 23790, echtArtikelCent: 9500, echtVersandKostenCent: 1049, stripeGebuehrCent: 382 }, 500);
    expect(g.echt.gewinnCent).toBe(23790 - 9500 - 980 - 1049 - 382 - 500);
    expect(g.geplant.gewinnCent).toBe(23790 - 10265 - 980 - 1139 - 786 - 500);
    expect(g.offen).toEqual([]);
  });
  it("Erstattung mindert den Umsatz, die Gebühr bleibt", () => {
    const g = berechneGewinn({ ...b, bezahltCent: 23790, stripeGebuehrCent: 382, erstattetCent: 23790, echtArtikelCent: 0, echtVersandKostenCent: 0 });
    expect(g.echt.umsatzCent).toBe(0);
    expect(g.echt.gewinnCent).toBe(-980 - 382);
  });
  it("verteilt Ausgaben proportional und centgenau", () => {
    const v = verteileAusgaben([{ id: "a", umsatzCent: 10000 }, { id: "b", umsatzCent: 20000 }, { id: "c", umsatzCent: 5 }], 1000);
    expect([...v.values()].reduce((s, x) => s + x, 0)).toBe(1000);
    expect(v.get("b")! > v.get("a")!).toBe(true);
    expect([...verteileAusgaben([{ id: "a", umsatzCent: 0 }], 1000).values()]).toEqual([0]);
  });
  it("Artikelkosten: echter Einstandspreis, sonst Katalogpreis", () => {
    const inhalt = [{ articleId: "kaffee", menge: 2, preisCent: 549 }, { articleId: "tee", menge: 1, preisCent: 235 }];
    expect(artikelKosten(inhalt, new Map())).toBe(1333);
    expect(artikelKosten(inhalt, new Map([["kaffee", 499], ["tee", null]]))).toBe(1233);
  });
  it("gleitender Einstandspreis", () => {
    expect(neuerEinstand(0, null, 10, 500)).toBe(500);
    expect(neuerEinstand(10, 500, 10, 600)).toBe(550);
    expect(neuerEinstand(0, 500, 5, 450)).toBe(450);
  });
  it("summiert und berechnet ROI", () => {
    const s = summiere([berechneGewinn(b).geplant, berechneGewinn(b).geplant]);
    expect(s.umsatzCent).toBe(2 * 23790);
    expect(roi(5000, 2500)).toBe(200);
    expect(roi(5000, 0)).toBeNull();
  });
});

describe("Empfängerliste (CSV)", () => {
  const eine = [{ slug: "weihnachtskiste", name: "Weihnachtskiste" }];
  const zwei = [...eine, { slug: "winterabend", name: "Winterabend" }];
  it("liest die eigene Vorlage", () => {
    const r = leseEmpfaengerCsv(csvVorlage(["weihnachtskiste"]), eine);
    expect(r.fehler).toEqual([]);
    expect(r.empfaenger).toHaveLength(2);
    expect(r.empfaenger[1]).toMatchObject({ firma: "Beispiel GmbH", plz: "69117", zusatz: "3. OG", menge: 1 });
  });
  it("akzeptiert Komma, Anführungszeichen, BOM und Boxnamen", () => {
    const csv = '﻿Name,Straße,PLZ,Ort,Box,Anzahl\n"Müller, Anna","Am Markt 3",68723,Schwetzingen,Winterabend,2\n';
    const r = leseEmpfaengerCsv(csv, zwei);
    expect(r.fehler).toEqual([]);
    expect(r.empfaenger[0]).toMatchObject({ name: "Müller, Anna", boxSlug: "winterabend", menge: 2 });
  });
  it("meldet Fehler mit Zeilennummer in Klartext", () => {
    const csv = "Name;Straße;PLZ;Ort;Box\n;Weg 1;68161;Mannheim;\nAnna;Hauptstraße;6816;;osterkiste\n";
    const r = leseEmpfaengerCsv(csv, zwei);
    expect(r.empfaenger).toEqual([]);
    expect(r.fehler.map((f) => f.zeile)).toEqual([2, 3]);
    expect(r.fehler[0].text).toContain("Name fehlt");
    expect(r.fehler[0].text).toContain("Spalte „Box“ ist leer");
    expect(r.fehler[1].text).toContain("Hausnummer fehlt");
    expect(r.fehler[1].text).toContain("keine fünf Ziffern");
    expect(r.fehler[1].text).toContain("nicht im Warenkorb");
  });
  it("verlangt Pflichtspalten und begrenzt die Länge", () => {
    expect(leseEmpfaengerCsv("Name;Ort\nA;B\n", eine).fehler[0].text).toContain("fehlt in der Kopfzeile");
    const viele = "Name;Straße;PLZ;Ort\n" + Array.from({ length: 501 }, (_, i) => `P${i};Weg ${i + 1};68161;Mannheim`).join("\n");
    expect(leseEmpfaengerCsv(viele, eine).fehler[0].text).toContain("höchstens 500");
    expect(leseEmpfaengerCsv("", eine).fehler).toHaveLength(1);
  });
});
