import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const zeit = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

// ───────────────────────── Katalog ─────────────────────────

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  kurz: text("kurz").notNull().default(""),
  beschreibung: text("beschreibung").notNull().default(""),
  sortierung: integer("sortierung").notNull().default(0),
  sichtbarVon: date("sichtbar_von"),
  sichtbarBis: date("sichtbar_bis"),
  aktiv: boolean("aktiv").notNull().default(true),
});

export type RenderInfo = {
  type: string;
  label: string;
  sub: string;
  tone?: string;
  contents?: string;
  variant?: string;
  dims?: [number, number, number];
};

export const articles = pgTable("articles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  marke: text("marke").notNull().default(""),
  groesse: text("groesse").notNull().default(""),
  kategorie: text("kategorie").notNull().default(""),
  laden: text("laden").notNull().default(""),
  ersatz: text("ersatz").notNull().default(""),
  preisCent: integer("preis_cent").notNull(),
  quelleUrl: text("quelle_url").notNull().default(""),
  quelleHinweis: text("quelle_hinweis").notNull().default(""),
  geprueftAm: date("geprueft_am").notNull(),
  status: text("status").$type<"belegt" | "richtwert" | "geschaetzt">().notNull().default("geschaetzt"),
  gewichtGramm: integer("gewicht_gramm").notNull().default(0),
  mhd: text("mhd").notNull().default(""),
  alkohol: boolean("alkohol").notNull().default(false),
  alkoholVol: text("alkohol_vol"),
  ersatzOhneAlkoholId: text("ersatz_ohne_alkohol_id"),
  allergene: text("allergene").notNull().default(""),
  allergeneGeprueft: boolean("allergene_geprueft").notNull().default(false),
  zutaten: text("zutaten").notNull().default(""),
  saisonal: text("saisonal"),
  bestand: integer("bestand").notNull().default(0),
  mindestbestand: integer("mindestbestand").notNull().default(0),
  /** gleitender Durchschnitt der tatsächlich bezahlten Preise; null = noch nie eingekauft */
  einstandCent: integer("einstand_cent"),
  render: jsonb("render").$type<RenderInfo>(),
  aktiv: boolean("aktiv").notNull().default(true),
  createdAt: zeit("created_at").notNull().defaultNow(),
  updatedAt: zeit("updated_at").notNull().defaultNow(),
});

export const packagingItems = pgTable("packaging_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  art: text("art").notNull().default("karton"),
  einheit: text("einheit").notNull().default("Stück"),
  preisCent: integer("preis_cent").notNull(),
  gewichtGramm: integer("gewicht_gramm").notNull().default(0),
  lieferant: text("lieferant").notNull().default(""),
  quelleUrl: text("quelle_url").notNull().default(""),
  quelleHinweis: text("quelle_hinweis").notNull().default(""),
  geprueftAm: date("geprueft_am").notNull(),
  status: text("status").$type<"belegt" | "richtwert" | "geschaetzt">().notNull().default("geschaetzt"),
  bestand: numeric("bestand", { precision: 10, scale: 3, mode: "number" }).notNull().default(0),
  mindestbestand: numeric("mindestbestand", { precision: 10, scale: 3, mode: "number" }).notNull().default(0),
});

export const boxes = pgTable("boxes", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  collectionId: integer("collection_id")
    .notNull()
    .references(() => collections.id),
  anlass: text("anlass").notNull().default(""),
  zielgruppe: text("zielgruppe").notNull().default(""),
  kurz: text("kurz").notNull().default(""),
  text: text("text").notNull().default(""),
  begruendung: text("begruendung").notNull().default(""),
  preisCent: integer("preis_cent").notNull(),
  groesse: text("groesse").$type<"klein" | "flach" | "mittel" | "gross">().notNull().default("mittel"),
  packMinuten: integer("pack_minuten").notNull().default(6),
  bestseller: boolean("bestseller").notNull().default(false),
  aktiv: boolean("aktiv").notNull().default(true),
  sichtbarVon: date("sichtbar_von"),
  sichtbarBis: date("sichtbar_bis"),
  sortierung: integer("sortierung").notNull().default(0),
  band: text("band").notNull().default("oliv"),
  seoTitel: text("seo_titel").notNull().default(""),
  seoBeschreibung: text("seo_beschreibung").notNull().default(""),
  createdAt: zeit("created_at").notNull().defaultNow(),
  updatedAt: zeit("updated_at").notNull().defaultNow(),
});

export const boxItems = pgTable(
  "box_items",
  {
    boxId: integer("box_id")
      .notNull()
      .references(() => boxes.id, { onDelete: "cascade" }),
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id),
    menge: integer("menge").notNull().default(1),
    sortierung: integer("sortierung").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.boxId, t.articleId] })],
);

export const boxPackaging = pgTable(
  "box_packaging",
  {
    boxId: integer("box_id")
      .notNull()
      .references(() => boxes.id, { onDelete: "cascade" }),
    packagingId: text("packaging_id")
      .notNull()
      .references(() => packagingItems.id),
    menge: numeric("menge", { precision: 8, scale: 3, mode: "number" }).notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.boxId, t.packagingId] })],
);

export type BildVarianten = {
  /** Breite → URL */
  avif: Record<string, string>;
  webp: Record<string, string>;
};

export const boxImages = pgTable(
  "box_images",
  {
    id: serial("id").primaryKey(),
    boxId: integer("box_id")
      .notNull()
      .references(() => boxes.id, { onDelete: "cascade" }),
    art: text("art").$type<"hero" | "flatlay" | "geschlossen" | "foto">().notNull().default("foto"),
    varianten: jsonb("varianten").$type<BildVarianten>().notNull(),
    breite: integer("breite").notNull(),
    hoehe: integer("hoehe").notNull(),
    blur: text("blur").notNull().default(""),
    alt: text("alt").notNull().default(""),
    /** true = gerenderte Beispielabbildung; false = echtes Foto */
    platzhalter: boolean("platzhalter").notNull().default(true),
    sortierung: integer("sortierung").notNull().default(0),
  },
  (t) => [index("box_images_box_idx").on(t.boxId)],
);

export const settings = pgTable("settings", {
  id: text("id").primaryKey(),
  wert: jsonb("wert").notNull(),
  updatedAt: zeit("updated_at").notNull().defaultNow(),
});

// ───────────────────────── Verkauf ─────────────────────────

export type BestellStatus =
  | "offen" // Entwurf vor Zahlung
  | "zahlung_ausstehend" // z. B. SEPA-Lastschrift noch nicht eingegangen
  | "neu"
  | "eingekauft"
  | "gepackt"
  | "versendet"
  | "geliefert"
  | "abgeschlossen"
  | "storniert";

export type Lieferart = "versand" | "mehrfach" | "persoenlich";

export type Personalisierung = {
  logoUrl: string | null;
  logoName: string | null;
  grusstext: string;
  handgeschrieben: boolean;
  banderole: boolean;
  namensanhaenger: boolean;
  bandfarbe: string;
};

export type InhaltSnapshot = {
  articleId: string;
  name: string;
  marke: string;
  groesse: string;
  menge: number;
  preisCent: number;
  gewichtGramm: number;
  laden: string;
  alkohol: boolean;
  ersetzt?: string;
};

export type VerpackungSnapshot = { packagingId: string; name: string; menge: number; preisCent: number };

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nummer: text("nummer").notNull().unique(),
    status: text("status").$type<BestellStatus>().notNull().default("offen"),
    createdAt: zeit("created_at").notNull().defaultNow(),
    bezahltAm: zeit("bezahlt_am"),
    eingekauftAm: zeit("eingekauft_am"),
    gepacktAm: zeit("gepackt_am"),
    versendetAm: zeit("versendet_am"),
    geliefertAm: zeit("geliefert_am"),

    firma: text("firma").notNull(),
    ansprechpartner: text("ansprechpartner").notNull(),
    email: text("email").notNull(),
    telefon: text("telefon").notNull().default(""),
    rechnungStrasse: text("rechnung_strasse").notNull(),
    rechnungZusatz: text("rechnung_zusatz").notNull().default(""),
    rechnungPlz: text("rechnung_plz").notNull(),
    rechnungOrt: text("rechnung_ort").notNull(),

    lieferart: text("lieferart").$type<Lieferart>().notNull(),
    lieferName: text("liefer_name").notNull().default(""),
    lieferFirma: text("liefer_firma").notNull().default(""),
    lieferStrasse: text("liefer_strasse").notNull().default(""),
    lieferZusatz: text("liefer_zusatz").notNull().default(""),
    lieferPlz: text("liefer_plz").notNull().default(""),
    lieferOrt: text("liefer_ort").notNull().default(""),
    /** "schnell" | "saison" | Datum JJJJ-MM-TT (persönliche Lieferung) */
    termin: text("termin").notNull().default("schnell"),
    ohneAlkohol: boolean("ohne_alkohol").notNull().default(false),
    volljaehrigBestaetigt: boolean("volljaehrig_bestaetigt").notNull().default(false),

    personalisierung: jsonb("personalisierung").$type<Personalisierung>().notNull(),
    kundenNotiz: text("kunden_notiz").notNull().default(""),
    interneNotiz: text("interne_notiz").notNull().default(""),

    // Preis-Snapshot (geplant, wie dem Kunden angezeigt)
    warenCent: integer("waren_cent").notNull(),
    staffelRabattCent: integer("staffel_rabatt_cent").notNull().default(0),
    staffelProzent: numeric("staffel_prozent", { precision: 5, scale: 2, mode: "number" }).notNull().default(0),
    personalisierungCent: integer("personalisierung_cent").notNull().default(0),
    rabattCodeCent: integer("rabatt_code_cent").notNull().default(0),
    versandCent: integer("versand_cent").notNull().default(0),
    summeCent: integer("summe_cent").notNull(),
    rabattCode: text("rabatt_code"),
    paketeAnzahl: integer("pakete_anzahl").notNull().default(0),
    gewichtGramm: integer("gewicht_gramm").notNull().default(0),

    // Geplante Kosten zum Bestellzeitpunkt
    planArtikelCent: integer("plan_artikel_cent").notNull().default(0),
    planVerpackungCent: integer("plan_verpackung_cent").notNull().default(0),
    planPersoMaterialCent: integer("plan_perso_material_cent").notNull().default(0),
    planVersandKostenCent: integer("plan_versand_kosten_cent").notNull().default(0),
    planGebuehrCent: integer("plan_gebuehr_cent").notNull().default(0),

    // Echte Werte
    bezahltCent: integer("bezahlt_cent"),
    stripeGebuehrCent: integer("stripe_gebuehr_cent"),
    echtArtikelCent: integer("echt_artikel_cent"),
    echtVersandKostenCent: integer("echt_versand_kosten_cent"),
    erstattetCent: integer("erstattet_cent").notNull().default(0),

    stripeSessionId: text("stripe_session_id"),
    stripeCustomerId: text("stripe_customer_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeChargeId: text("stripe_charge_id"),
    stripeRechnungUrl: text("stripe_rechnung_url"),
    stripeRechnungPdf: text("stripe_rechnung_pdf"),

    campaignId: integer("campaign_id"),
    utm: jsonb("utm").$type<Record<string, string>>(),
    sendungsnummer: text("sendungsnummer"),
    b2bBestaetigt: boolean("b2b_bestaetigt").notNull().default(false),
    agbAkzeptiertAm: zeit("agb_akzeptiert_am"),
  },
  (t) => [
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
    uniqueIndex("orders_session_idx").on(t.stripeSessionId),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    boxId: integer("box_id"),
    boxSlug: text("box_slug").notNull(),
    boxName: text("box_name").notNull(),
    groesse: text("groesse").notNull().default("mittel"),
    menge: integer("menge").notNull(),
    listenpreisCent: integer("listenpreis_cent").notNull(),
    stueckpreisCent: integer("stueckpreis_cent").notNull(),
    gewichtGramm: integer("gewicht_gramm").notNull().default(0),
    packMinuten: integer("pack_minuten").notNull().default(0),
    inhalt: jsonb("inhalt").$type<InhaltSnapshot[]>().notNull(),
    verpackung: jsonb("verpackung").$type<VerpackungSnapshot[]>().notNull(),
    planArtikelCent: integer("plan_artikel_cent").notNull().default(0),
    planVerpackungCent: integer("plan_verpackung_cent").notNull().default(0),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const orderRecipients = pgTable(
  "order_recipients",
  {
    id: serial("id").primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    firma: text("firma").notNull().default(""),
    strasse: text("strasse").notNull(),
    zusatz: text("zusatz").notNull().default(""),
    plz: text("plz").notNull(),
    ort: text("ort").notNull(),
    boxSlug: text("box_slug").notNull(),
    menge: integer("menge").notNull().default(1),
    sendungsnummer: text("sendungsnummer"),
    versendetAm: zeit("versendet_am"),
  },
  (t) => [index("order_recipients_order_idx").on(t.orderId)],
);

export const inquiries = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  createdAt: zeit("created_at").notNull().defaultNow(),
  art: text("art").$type<"angebot" | "musterbox">().notNull().default("angebot"),
  firma: text("firma").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  telefon: text("telefon").notNull().default(""),
  menge: text("menge").notNull().default(""),
  nachricht: text("nachricht").notNull().default(""),
  status: text("status").$type<"offen" | "erledigt">().notNull().default("offen"),
  notiz: text("notiz").notNull().default(""),
  kampagne: text("kampagne"),
});

export const discountCodes = pgTable("discount_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  art: text("art").$type<"prozent" | "betrag">().notNull(),
  /** Prozent (ganzzahlig) oder Cent */
  wert: integer("wert").notNull(),
  gueltigBis: zeit("gueltig_bis"),
  maxEinloesungen: integer("max_einloesungen"),
  stripeCouponId: text("stripe_coupon_id"),
  stripePromotionCodeId: text("stripe_promotion_code_id"),
  aktiv: boolean("aktiv").notNull().default(true),
  createdAt: zeit("created_at").notNull().defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  kanal: text("kanal").notNull().default("flyer"),
  ziel: text("ziel").notNull().default("/"),
  kostenCent: integer("kosten_cent").notNull().default(0),
  rabattCode: text("rabatt_code"),
  notiz: text("notiz").notNull().default(""),
  aktiv: boolean("aktiv").notNull().default(true),
  createdAt: zeit("created_at").notNull().defaultNow(),
});

/** Scans als Tageszähler – bewusst ohne IP, User-Agent oder andere personenbezogene Daten. */
export const campaignScans = pgTable(
  "campaign_scans",
  {
    campaignId: integer("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    tag: date("tag").notNull(),
    anzahl: integer("anzahl").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.campaignId, t.tag] })],
);

// ───────────────────────── Betrieb ─────────────────────────

export const purchases = pgTable(
  "purchases",
  {
    id: serial("id").primaryKey(),
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id),
    menge: integer("menge").notNull(),
    stueckpreisCent: integer("stueckpreis_cent").notNull(),
    laden: text("laden").notNull().default(""),
    gekauftAm: date("gekauft_am").notNull(),
    notiz: text("notiz").notNull().default(""),
    createdAt: zeit("created_at").notNull().defaultNow(),
  },
  (t) => [index("purchases_article_idx").on(t.articleId)],
);

export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  articleId: text("article_id"),
  packagingId: text("packaging_id"),
  delta: numeric("delta", { precision: 10, scale: 3, mode: "number" }).notNull(),
  grund: text("grund").$type<"einkauf" | "gepackt" | "korrektur" | "storno">().notNull(),
  orderId: uuid("order_id"),
  notiz: text("notiz").notNull().default(""),
  createdAt: zeit("created_at").notNull().defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  datum: date("datum").notNull(),
  kategorie: text("kategorie").notNull(),
  beschreibung: text("beschreibung").notNull().default(""),
  betragCent: integer("betrag_cent").notNull(),
  campaignId: integer("campaign_id"),
  /**
   * true = steckt bereits in den Bestellkosten (z. B. Kartons auf Vorrat, Wareneinkauf)
   * und wird deshalb nicht noch einmal als Gemeinkosten umgelegt – zählt aber im EÜR-Export.
   */
  inBestellkosten: boolean("in_bestellkosten").notNull().default(false),
  createdAt: zeit("created_at").notNull().defaultNow(),
});

export const mailLog = pgTable("mail_log", {
  id: serial("id").primaryKey(),
  an: text("an").notNull(),
  betreff: text("betreff").notNull(),
  art: text("art").notNull(),
  orderId: uuid("order_id"),
  status: text("status").$type<"gesendet" | "lokal" | "fehler">().notNull(),
  fehler: text("fehler"),
  createdAt: zeit("created_at").notNull().defaultNow(),
});

export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  typ: text("typ").notNull(),
  verarbeitetAm: zeit("verarbeitet_am").notNull().defaultNow(),
});

export const rateLimits = pgTable(
  "rate_limits",
  {
    schluessel: text("schluessel").notNull(),
    fenster: zeit("fenster").notNull(),
    anzahl: integer("anzahl").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.schluessel, t.fenster] })],
);

// ───────────────────────── Auth.js ─────────────────────────

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

import { pgSequence } from "drizzle-orm/pg-core";

/** Fortlaufende Bestellnummer (DK-26-1001 …). Lücken sind unkritisch; die Rechnungsnummer vergibt Stripe. */
export const orderNummerSeq = pgSequence("order_nummer_seq", { startWith: 1001, increment: 1 });
