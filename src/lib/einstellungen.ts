import { z } from "zod";

const datum = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum als JJJJ-MM-TT");

export const einstellungenSchema = z.object({
  mindestmenge: z.number().int().min(1).max(100),
  staffeln: z
    .array(z.object({ ab: z.number().int().min(1), prozent: z.number().min(0).max(50) }))
    .max(8),
  personalisierung: z.object({
    logoSticker: z.object({ preisCent: z.number().int().min(0), materialCent: z.number().int().min(0) }),
    grusskarte: z.object({ preisCent: z.number().int().min(0), materialCent: z.number().int().min(0) }),
    handgeschrieben: z.object({ preisCent: z.number().int().min(0), materialCent: z.number().int().min(0) }),
    banderole: z.object({ preisCent: z.number().int().min(0), materialCent: z.number().int().min(0) }),
    namensanhaenger: z.object({ preisCent: z.number().int().min(0), materialCent: z.number().int().min(0) }),
    bandfarben: z.array(z.object({ id: z.string().min(1), name: z.string().min(1), hex: z.string() })).min(1),
    grusstextMaxZeichen: z.number().int().min(50).max(1000),
  }),
  versand: z.object({
    stufen: z
      .array(
        z.object({
          bisGramm: z.number().int().positive(),
          preisCent: z.number().int().min(0),
          kostenCent: z.number().int().min(0),
        }),
      )
      .min(1),
    materialProPaketCent: z.number().int().min(0),
    einzelUmkartonGramm: z.number().int().min(0),
    sammelUmkartonGramm: z.number().int().min(0),
    maxPaketGramm: z.number().int().positive(),
    platzProPaket: z.number().positive(),
  }),
  lieferung: z.object({
    gebuehrCent: z.number().int().min(0),
    freiAbCent: z.number().int().min(0),
    plzPraefixe: z.array(z.string().regex(/^\d{2,5}$/)).min(1),
  }),
  fristen: z.object({
    saisonName: z.string(),
    aktiv: z.boolean(),
    versand: z.object({ bestellschluss: datum, lieferungBis: datum }),
    persoenlich: z.object({ bestellschluss: datum, fensterVon: datum, fensterBis: datum }),
    wiederAb: datum,
    vorlaufVersandWerktage: z.number().int().min(1).max(30),
    vorlaufPersoenlichWerktage: z.number().int().min(1).max(30),
  }),
  gebuehren: z.object({
    prozent: z.number().min(0).max(10),
    fixCent: z.number().int().min(0),
    rechnungProzent: z.number().min(0).max(5),
    rechnungMaxCent: z.number().int().min(0),
  }),
  margen: z.object({ zielProzent: z.number(), minProzent: z.number() }),
  saison: z.object({ kollektionSlug: z.string() }),
  kontakt: z.object({
    inhaber: z.string(),
    firma: z.string(),
    strasse: z.string(),
    plzOrt: z.string(),
    telefon: z.string(),
    email: z.string(),
    steuernummer: z.string(),
    aufsichtHinweis: z.string(),
    /** Foto für „Wer packt Ihre Kiste?“ – wird im Admin hochgeladen */
    fotoUrl: z.string().default(""),
  }),
});

export type Einstellungen = z.infer<typeof einstellungenSchema>;

export const PLATZHALTER = "[vor Livegang ausfüllen]";

/**
 * Startwerte. Quellen und Begründungen: DECISIONS.md (G-Abschnitte) und SORTIMENT.md.
 * DHL-Kosten: Privatkunden-Onlinefrankierung 2026 (dhl.de, geprüft 15.11.2026).
 */
export const startEinstellungen: Einstellungen = {
  mindestmenge: 5,
  staffeln: [
    { ab: 10, prozent: 3 },
    { ab: 25, prozent: 5 },
    { ab: 50, prozent: 8 },
    { ab: 100, prozent: 10 },
  ],
  personalisierung: {
    logoSticker: { preisCent: 0, materialCent: 0 },
    grusskarte: { preisCent: 0, materialCent: 0 },
    handgeschrieben: { preisCent: 250, materialCent: 15 },
    banderole: { preisCent: 120, materialCent: 30 },
    namensanhaenger: { preisCent: 80, materialCent: 10 },
    bandfarben: [
      { id: "oliv", name: "Oliv", hex: "#637545" },
      { id: "natur", name: "Natur", hex: "#d9cfb4" },
      { id: "salbei", name: "Salbei", hex: "#9ba685" },
      { id: "dunkeloliv", name: "Dunkles Oliv", hex: "#455230" },
    ],
    grusstextMaxZeichen: 350,
  },
  versand: {
    stufen: [
      { bisGramm: 2000, preisCent: 790, kostenCent: 619 },
      { bisGramm: 5000, preisCent: 950, kostenCent: 769 },
      { bisGramm: 10000, preisCent: 1290, kostenCent: 1049 },
      { bisGramm: 20000, preisCent: 2190, kostenCent: 1899 },
      { bisGramm: 31500, preisCent: 2690, kostenCent: 2399 },
    ],
    materialProPaketCent: 90,
    einzelUmkartonGramm: 200,
    sammelUmkartonGramm: 900,
    maxPaketGramm: 20000,
    platzProPaket: 6,
  },
  lieferung: {
    gebuehrCent: 990,
    freiAbCent: 25000,
    plzPraefixe: [
      "68723", "68766", "68775", "68782", "68789", "68804", "68809", "68535", "68542", "68526",
      "681", "682", "683", "691", "692",
    ],
  },
  fristen: {
    saisonName: "Weihnachten 2026",
    aktiv: true,
    versand: { bestellschluss: "2026-12-10", lieferungBis: "2026-12-16" },
    persoenlich: { bestellschluss: "2026-12-12", fensterVon: "2026-12-15", fensterBis: "2026-12-19" },
    wiederAb: "2027-01-07",
    vorlaufVersandWerktage: 5,
    vorlaufPersoenlichWerktage: 4,
  },
  gebuehren: { prozent: 2.8, fixCent: 25, rechnungProzent: 0.4, rechnungMaxCent: 190 },
  margen: { zielProzent: 45, minProzent: 35 },
  saison: { kollektionSlug: "weihnachten" },
  kontakt: {
    inhaber: PLATZHALTER,
    firma: "Dankeskiste",
    strasse: PLATZHALTER,
    plzOrt: "68723 Schwetzingen",
    telefon: PLATZHALTER,
    email: PLATZHALTER,
    steuernummer: PLATZHALTER,
    aufsichtHinweis: "",
    fotoUrl: "",
  },
};
