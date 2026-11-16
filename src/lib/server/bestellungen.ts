import "server-only";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { z } from "zod";
import { db, schema, type Tx } from "../../../db";
import type { BestellStatus, InhaltSnapshot } from "../../../db/schema";
import { heuteBerlin, imLiefergebiet, lieferStatus, terminGueltig } from "../calc/deadlines";
import { gebuehrFuerBestellung } from "../calc/margin";
import { artikelKosten } from "../calc/profit";
import { berechneAngebot, type AngebotEingabe } from "../calc/quote";
import { euro } from "../geld";
import { SITE_URL } from "../site";
import { ladeEinstellungenFrisch } from "./einstellungen";
import { ladeBestellKatalog } from "./katalog";
import { sendeMail } from "./mail";
import { bestellMailInhaber, bestellMailKunde, versandMail } from "./mails";
import { RECHNUNG_FUSS, stripe, stripeKonfiguriert } from "./stripe";

// ───────────────────────── Eingabe ─────────────────────────

const text = (max: number) => z.string().trim().max(max);
const pflicht = (max: number, was: string) => z.string().trim().min(1, `${was} fehlt.`).max(max);
const plz = z.string().trim().regex(/^\d{5}$/, "Die PLZ braucht fünf Ziffern.");

const adresse = z.object({
  name: text(120).default(""),
  firma: text(120).default(""),
  strasse: pflicht(120, "Straße und Hausnummer"),
  zusatz: text(120).default(""),
  plz,
  ort: pflicht(80, "Ort"),
});

export const checkoutSchema = z.object({
  positionen: z.array(z.object({ slug: z.string().max(80), menge: z.number().int().min(1).max(5000) })).min(1).max(30),
  perso: z.object({
    handgeschrieben: z.boolean(),
    banderole: z.boolean(),
    namensanhaenger: z.boolean(),
    bandfarbe: z.string().max(30),
    grusstext: text(1000),
    logoUrl: z.string().max(500).nullable(),
    logoName: z.string().max(200).nullable(),
  }),
  lieferung: z.object({
    art: z.enum(["versand", "mehrfach", "persoenlich"]),
    termin: z.string().max(20),
    adresse: adresse.optional(),
    empfaenger: z
      .array(
        z.object({
          name: pflicht(120, "Name"),
          firma: text(120).default(""),
          strasse: pflicht(120, "Straße"),
          zusatz: text(120).default(""),
          plz,
          ort: pflicht(80, "Ort"),
          boxSlug: z.string().max(80),
          menge: z.number().int().min(1).max(20),
        }),
      )
      .max(500)
      .optional(),
  }),
  ohneAlkohol: z.boolean(),
  volljaehrig: z.boolean(),
  firma: z.object({
    firma: pflicht(120, "Firmenname"),
    ansprechpartner: pflicht(120, "Ansprechpartner"),
    email: z.string().trim().toLowerCase().email("Bitte geben Sie eine gültige E-Mail-Adresse an.").max(160),
    telefon: text(40).default(""),
    strasse: pflicht(120, "Straße und Hausnummer"),
    zusatz: text(120).default(""),
    plz,
    ort: pflicht(80, "Ort"),
  }),
  notiz: text(1000).default(""),
  rabattCode: text(40).optional(),
  b2b: z.literal(true, { message: "Bitte bestätigen Sie, dass Sie als Unternehmer bestellen." }),
  agb: z.literal(true, { message: "Bitte akzeptieren Sie die AGB." }),
  kampagne: z.string().max(80).optional(),
  utm: z.record(z.string().max(40), z.string().max(120)).optional(),
  /** Honeypot – muss leer bleiben */
  website: z.string().max(0).optional(),
});

export type CheckoutEingabe = z.infer<typeof checkoutSchema>;

export class BestellFehler extends Error {
  constructor(
    public meldungen: string[],
    public status = 422,
  ) {
    super(meldungen.join(" "));
  }
}

function logoErlaubt(url: string | null): boolean {
  if (!url) return true;
  if (url.startsWith("/api/datei/")) return /^\/api\/datei\/[A-Za-z0-9_.-]+$/.test(url);
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

// ───────────────────────── Rabattcode ─────────────────────────

export async function pruefeRabattCode(code: string): Promise<
  | { ok: true; code: string; art: "prozent" | "betrag"; wert: number; stripePromotionCodeId: string | null; id: number }
  | { ok: false; grund: string }
> {
  const sauber = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,40}$/.test(sauber)) return { ok: false, grund: "Diesen Code kennen wir nicht." };
  const [c] = await db.select().from(schema.discountCodes).where(eq(schema.discountCodes.code, sauber));
  if (!c || !c.aktiv) return { ok: false, grund: "Diesen Code kennen wir nicht." };
  if (c.gueltigBis && c.gueltigBis.getTime() < Date.now()) return { ok: false, grund: "Dieser Code ist abgelaufen." };
  if (c.maxEinloesungen != null) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.orders)
      .where(and(eq(schema.orders.rabattCode, sauber), inArray(schema.orders.status, BEZAHLT_STATUS)));
    if (n >= c.maxEinloesungen) return { ok: false, grund: "Dieser Code wurde bereits vollständig eingelöst." };
  }
  return { ok: true, code: sauber, art: c.art, wert: c.wert, stripePromotionCodeId: c.stripePromotionCodeId, id: c.id };
}

export const BEZAHLT_STATUS: BestellStatus[] = ["neu", "eingekauft", "gepackt", "versendet", "geliefert", "abgeschlossen"];

// ───────────────────────── Checkout ─────────────────────────

/**
 * Prüft die Bestellung vollständig auf dem Server, speichert sie als Entwurf (Status „offen“)
 * und erzeugt die Stripe-Checkout-Session. Der Client liefert nur IDs, Mengen und Optionen –
 * Preise, Rabatte, Versand, Fristen und Liefergebiet werden hier bestimmt.
 */
export async function erstelleCheckout(eingabe: CheckoutEingabe): Promise<{ url: string; nummer: string }> {
  if (!stripeKonfiguriert()) throw new BestellFehler(["Die Online-Zahlung ist gerade nicht erreichbar. Bitte nutzen Sie das Anfrageformular."], 503);
  const [e, katalog] = await Promise.all([ladeEinstellungenFrisch(), ladeBestellKatalog()]);
  const heute = heuteBerlin();
  const meldungen: string[] = [];
  const art = eingabe.lieferung.art;

  // Fristen je Lieferart
  const status = lieferStatus(art === "persoenlich" ? "persoenlich" : "versand", heute, e.fristen);
  if (!status.verfuegbar) {
    throw new BestellFehler([`Der Bestellschluss für diese Lieferart ist vorbei. Schreiben Sie uns über das Anfrageformular – wir schauen, was noch möglich ist.`]);
  }
  if (!terminGueltig(art, eingabe.lieferung.termin, heute, e.fristen)) meldungen.push("Der gewählte Termin ist nicht mehr verfügbar. Bitte wählen Sie einen anderen.");

  // Adressen
  const lieferAdresse = eingabe.lieferung.adresse;
  if (art !== "mehrfach" && !lieferAdresse) meldungen.push("Die Lieferadresse fehlt.");
  if (art === "persoenlich" && lieferAdresse && !imLiefergebiet(lieferAdresse.plz, e.lieferung.plzPraefixe)) {
    meldungen.push(`Die PLZ ${lieferAdresse.plz} liegt außerhalb unseres Liefergebiets. Bitte wählen Sie den Versand.`);
  }
  const empfaenger = art === "mehrfach" ? (eingabe.lieferung.empfaenger ?? []) : [];
  if (art === "mehrfach" && empfaenger.length === 0) meldungen.push("Bitte laden Sie die Empfängerliste hoch.");

  if (!logoErlaubt(eingabe.perso.logoUrl)) meldungen.push("Das Logo konnte nicht zugeordnet werden. Bitte laden Sie es erneut hoch.");
  if (eingabe.perso.grusstext.length > e.personalisierung.grusstextMaxZeichen) meldungen.push(`Der Grußtext darf höchstens ${e.personalisierung.grusstextMaxZeichen} Zeichen haben.`);
  const bandfarbe = e.personalisierung.bandfarben.find((b) => b.id === eingabe.perso.bandfarbe)?.id ?? e.personalisierung.bandfarben[0].id;

  // Rabattcode
  let rabatt: Awaited<ReturnType<typeof pruefeRabattCode>> | null = null;
  if (eingabe.rabattCode) {
    rabatt = await pruefeRabattCode(eingabe.rabattCode);
    if (!rabatt.ok) meldungen.push(`Rabattcode: ${rabatt.grund}`);
  }

  const angebotEingabe: AngebotEingabe = {
    positionen: eingabe.positionen,
    perso: eingabe.perso,
    lieferung: { art, plz: lieferAdresse?.plz, empfaenger: empfaenger.map((x) => ({ boxSlug: x.boxSlug, menge: x.menge })) },
    rabatt: rabatt?.ok ? { code: rabatt.code, art: rabatt.art, wert: rabatt.wert } : null,
  };
  const angebot = berechneAngebot(angebotEingabe, katalog, e);
  meldungen.push(...angebot.fehler.map((f) => f.text));

  // Alkohol: im Mehrfachversand immer alkoholfrei; sonst Volljährigkeit bestätigen
  const ohneAlkohol = angebot.enthaeltAlkohol && (eingabe.ohneAlkohol || art === "mehrfach");
  if (angebot.enthaeltAlkohol && !ohneAlkohol && !eingabe.volljaehrig) {
    meldungen.push("Bitte bestätigen Sie, dass die Boxen mit Alkohol nur an volljährige Personen gehen – oder wählen Sie „ohne Alkohol“.");
  }
  if ([...new Set(meldungen)].length) throw new BestellFehler([...new Set(meldungen)]);

  // Kampagne zuordnen
  let campaignId: number | null = null;
  if (eingabe.kampagne) {
    const [k] = await db.select({ id: schema.campaigns.id }).from(schema.campaigns).where(eq(schema.campaigns.slug, eingabe.kampagne.toLowerCase()));
    campaignId = k?.id ?? null;
  }
  if (!campaignId && rabatt?.ok) {
    const [k] = await db.select({ id: schema.campaigns.id }).from(schema.campaigns).where(eq(schema.campaigns.rabattCode, rabatt.code));
    campaignId = k?.id ?? null;
  }

  const nachSlug = new Map(katalog.map((b) => [b.slug, b]));
  const positionen = angebot.zeilen.map((z) => {
    const box = nachSlug.get(z.slug)!;
    const inhalt = ohneAlkohol ? box.inhaltOhneAlkohol : box.inhalt;
    return {
      boxId: box.id,
      boxSlug: box.slug,
      boxName: box.name,
      groesse: box.groesse,
      menge: z.menge,
      listenpreisCent: z.listenpreisCent,
      stueckpreisCent: z.stueckpreisCent,
      gewichtGramm: box.gewichtGramm,
      packMinuten: box.packMinuten,
      inhalt,
      verpackung: box.verpackung,
      planArtikelCent: inhalt.reduce((s, x) => s + x.preisCent * x.menge, 0),
      planVerpackungCent: Math.round(box.verpackung.reduce((s, x) => s + x.preisCent * x.menge, 0)),
    };
  });

  const f = eingabe.firma;
  const bestellung = await db.transaction(async (tx) => {
    const [{ n }] = (await tx.execute(sql`select nextval('order_nummer_seq')::int as n`)).rows as { n: number }[];
    const nummer = `DK-${heute.slice(2, 4)}-${n}`;
    const [b] = await tx
      .insert(schema.orders)
      .values({
        nummer,
        status: "offen",
        firma: f.firma,
        ansprechpartner: f.ansprechpartner,
        email: f.email,
        telefon: f.telefon,
        rechnungStrasse: f.strasse,
        rechnungZusatz: f.zusatz,
        rechnungPlz: f.plz,
        rechnungOrt: f.ort,
        lieferart: art,
        lieferName: lieferAdresse?.name ?? "",
        lieferFirma: lieferAdresse?.firma || (art !== "mehrfach" ? f.firma : ""),
        lieferStrasse: lieferAdresse?.strasse ?? "",
        lieferZusatz: lieferAdresse?.zusatz ?? "",
        lieferPlz: lieferAdresse?.plz ?? "",
        lieferOrt: lieferAdresse?.ort ?? "",
        termin: eingabe.lieferung.termin,
        ohneAlkohol,
        volljaehrigBestaetigt: eingabe.volljaehrig,
        personalisierung: {
          logoUrl: eingabe.perso.logoUrl,
          logoName: eingabe.perso.logoName,
          grusstext: eingabe.perso.grusstext,
          handgeschrieben: eingabe.perso.handgeschrieben,
          banderole: eingabe.perso.banderole,
          namensanhaenger: eingabe.perso.namensanhaenger,
          bandfarbe,
        },
        kundenNotiz: eingabe.notiz,
        warenCent: angebot.warenCent,
        staffelRabattCent: angebot.staffelRabattCent,
        staffelProzent: angebot.staffelProzent,
        personalisierungCent: angebot.personalisierungCent,
        rabattCodeCent: angebot.rabattCodeCent,
        versandCent: angebot.versand.preisCent,
        summeCent: angebot.summeCent,
        rabattCode: rabatt?.ok ? rabatt.code : null,
        paketeAnzahl: angebot.versand.pakete.length,
        gewichtGramm: angebot.versand.gewichtGramm,
        planArtikelCent: positionen.reduce((s, p) => s + p.planArtikelCent * p.menge, 0),
        planVerpackungCent: positionen.reduce((s, p) => s + p.planVerpackungCent * p.menge, 0),
        planPersoMaterialCent: angebot.persoMaterialCent,
        planVersandKostenCent: angebot.versand.kostenCent,
        planGebuehrCent: gebuehrFuerBestellung(angebot.summeCent, e.gebuehren),
        campaignId,
        utm: eingabe.utm ?? null,
        b2bBestaetigt: true,
        agbAkzeptiertAm: new Date(),
      })
      .returning();
    await tx.insert(schema.orderItems).values(positionen.map((p) => ({ orderId: b.id, ...p })));
    if (empfaenger.length) {
      await tx.insert(schema.orderRecipients).values(empfaenger.map((x) => ({ orderId: b.id, name: x.name, firma: x.firma, strasse: x.strasse, zusatz: x.zusatz, plz: x.plz, ort: x.ort, boxSlug: x.boxSlug, menge: x.menge })));
    }
    return b;
  });

  // Stripe: Kunde mit Firmenname → Rechnung trägt die Firma
  const s = stripe();
  const kunde = await s.customers.create({
    name: f.firma,
    email: f.email,
    phone: f.telefon || undefined,
    address: { line1: f.strasse, line2: f.zusatz || undefined, postal_code: f.plz, city: f.ort, country: "DE" },
    preferred_locales: ["de"],
    metadata: { ansprechpartner: f.ansprechpartner, bestellung: bestellung.nummer },
  });
  const staffelHinweis = angebot.staffelProzent > 0 ? ` (inkl. ${String(angebot.staffelProzent).replace(".", ",")} % Mengenrabatt)` : "";
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    ...angebot.zeilen.map((z) => ({
      quantity: z.menge,
      price_data: {
        currency: "eur",
        unit_amount: z.stueckpreisCent,
        product_data: { name: `Geschenkbox „${z.name}“${staffelHinweis}`, metadata: { slug: z.slug } },
      },
    })),
    ...angebot.perso.map((p) => ({
      quantity: p.menge,
      price_data: { currency: "eur", unit_amount: p.einzelCent, product_data: { name: p.name } },
    })),
  ];
  const session = await s.checkout.sessions.create({
    mode: "payment",
    customer: kunde.id,
    customer_update: { address: "auto", name: "auto" },
    billing_address_collection: "required",
    locale: "de",
    line_items,
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: angebot.versand.text,
          fixed_amount: { amount: angebot.versand.preisCent, currency: "eur" },
        },
      },
    ],
    ...(rabatt?.ok && rabatt.stripePromotionCodeId ? { discounts: [{ promotion_code: rabatt.stripePromotionCodeId }] } : {}),
    invoice_creation: {
      enabled: true,
      invoice_data: {
        footer: RECHNUNG_FUSS,
        description: `Bestellung ${bestellung.nummer}`,
        custom_fields: [{ name: "Bestellnummer", value: bestellung.nummer }],
        metadata: { orderId: bestellung.id, nummer: bestellung.nummer },
      },
    },
    payment_intent_data: { description: `Dankeskiste ${bestellung.nummer}`, metadata: { orderId: bestellung.id, nummer: bestellung.nummer } },
    custom_text: { submit: { message: `Angebot ausschließlich für Unternehmer (§ 14 BGB). ${RECHNUNG_FUSS}` } },
    metadata: { orderId: bestellung.id, nummer: bestellung.nummer },
    client_reference_id: bestellung.id,
    success_url: `${SITE_URL}/danke?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/bestellen?abgebrochen=1`,
  });
  if (!session.url) throw new BestellFehler(["Die Zahlungsseite konnte nicht geöffnet werden. Bitte versuchen Sie es noch einmal."], 502);
  await db.update(schema.orders).set({ stripeSessionId: session.id, stripeCustomerId: kunde.id }).where(eq(schema.orders.id, bestellung.id));

  // Alte, nie bezahlte Entwürfe aufräumen
  if (Math.random() < 0.1) {
    await db.delete(schema.orders).where(and(eq(schema.orders.status, "offen"), lt(schema.orders.createdAt, new Date(Date.now() - 7 * 86_400_000)))).catch(() => {});
  }
  return { url: session.url, nummer: bestellung.nummer };
}

// ───────────────────────── Webhook ─────────────────────────

async function gebuehrAusCharge(charge: Stripe.Charge | string | null | undefined): Promise<{ chargeId: string; gebuehrCent: number | null } | null> {
  if (!charge) return null;
  const s = stripe();
  const c = typeof charge === "string" ? await s.charges.retrieve(charge, { expand: ["balance_transaction"] }) : charge;
  let bt = c.balance_transaction;
  if (typeof bt === "string") bt = await s.balanceTransactions.retrieve(bt);
  return { chargeId: c.id, gebuehrCent: bt ? bt.fee : null };
}

/** Holt die echte Stripe-Gebühr (balance_transaction.fee) und speichert sie. */
export async function aktualisiereStripeDaten(orderId: string): Promise<{ gebuehrCent: number | null }> {
  const [b] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
  if (!b?.stripePaymentIntentId) return { gebuehrCent: b?.stripeGebuehrCent ?? null };
  const s = stripe();
  const pi = await s.paymentIntents.retrieve(b.stripePaymentIntentId, { expand: ["latest_charge.balance_transaction"] });
  const g = await gebuehrAusCharge(pi.latest_charge as Stripe.Charge | string | null);
  const aenderung: Partial<typeof schema.orders.$inferInsert> = {};
  if (g) {
    aenderung.stripeChargeId = g.chargeId;
    if (g.gebuehrCent != null) aenderung.stripeGebuehrCent = g.gebuehrCent;
  }
  if (b.stripeSessionId && !b.stripeRechnungUrl) {
    const session = await s.checkout.sessions.retrieve(b.stripeSessionId, { expand: ["invoice"] });
    const inv = session.invoice as Stripe.Invoice | null;
    if (inv && typeof inv !== "string") {
      aenderung.stripeRechnungUrl = inv.hosted_invoice_url ?? null;
      aenderung.stripeRechnungPdf = inv.invoice_pdf ?? null;
    }
  }
  if (Object.keys(aenderung).length) await db.update(schema.orders).set(aenderung).where(eq(schema.orders.id, orderId));
  return { gebuehrCent: g?.gebuehrCent ?? b.stripeGebuehrCent ?? null };
}

async function sendeBestellMails(orderId: string): Promise<void> {
  const [b] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
  if (!b) return;
  const positionen = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));
  const e = await ladeEinstellungenFrisch();
  await sendeMail({ an: b.email, art: "bestellung-kunde", orderId, antwortAn: process.env.OWNER_EMAIL, ...bestellMailKunde(b, positionen, e.fristen.aktiv ? e.fristen.versand.lieferungBis : null) });
  if (process.env.OWNER_EMAIL) {
    await sendeMail({ an: process.env.OWNER_EMAIL, art: "bestellung-inhaber", orderId, antwortAn: b.email, ...bestellMailInhaber(b, positionen) });
  }
}

export async function sendeBestaetigungErneut(orderId: string): Promise<void> {
  await sendeBestellMails(orderId);
}

async function sessionAbgeschlossen(session: Stripe.Checkout.Session): Promise<void> {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;
  const bezahlt = session.payment_status === "paid" || session.payment_status === "no_payment_required";
  const [geaendert] = await db
    .update(schema.orders)
    .set({
      status: bezahlt ? "neu" : "zahlung_ausstehend",
      bezahltAm: bezahlt ? new Date() : null,
      bezahltCent: session.amount_total ?? null,
      rabattCodeCent: session.total_details?.amount_discount ?? 0,
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
      stripeCustomerId: typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null),
    })
    .where(and(eq(schema.orders.id, orderId), inArray(schema.orders.status, bezahlt ? ["offen", "zahlung_ausstehend"] : ["offen"])))
    .returning({ id: schema.orders.id });
  if (!geaendert || !bezahlt) return;
  try {
    await aktualisiereStripeDaten(orderId);
  } catch (e) {
    console.error("[stripe] Gebühr/Rechnung noch nicht abrufbar", e);
  }
  await sendeBestellMails(orderId);
}

/**
 * Sicherheitsnetz für die Danke-Seite: Falls der Webhook noch nicht angekommen ist, wird die
 * Session direkt bei Stripe abgefragt und – wenn bezahlt – genauso verbucht (idempotent).
 */
export async function bestaetigeSession(sessionId: string): Promise<{ nummer: string; status: BestellStatus; email: string; summeCent: number; lieferart: string } | null> {
  if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(sessionId)) return null;
  const finde = async () => (await db.select().from(schema.orders).where(eq(schema.orders.stripeSessionId, sessionId)))[0];
  let b = await finde();
  if (!b) return null;
  if (b.status === "offen" && stripeKonfiguriert()) {
    try {
      const session = await stripe().checkout.sessions.retrieve(sessionId);
      if (session.status === "complete" && session.metadata?.orderId === b.id) {
        await sessionAbgeschlossen(session);
        b = (await finde()) ?? b;
      }
    } catch (e) {
      console.error("[danke] Session nicht abrufbar", e);
    }
  }
  return { nummer: b.nummer, status: b.status, email: b.email, summeCent: b.bezahltCent ?? b.summeCent, lieferart: b.lieferart };
}

/**
 * Verarbeitet ein verifiziertes Stripe-Event genau einmal (Idempotenz über `stripe_events`).
 * Rückgabe false = bereits verarbeitet.
 */
export async function verarbeiteStripeEvent(event: Stripe.Event): Promise<boolean> {
  const eingefuegt = await db.insert(schema.stripeEvents).values({ id: event.id, typ: event.type }).onConflictDoNothing().returning({ id: schema.stripeEvents.id });
  if (eingefuegt.length === 0) return false;
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await sessionAbgeschlossen(event.data.object);
        break;
      case "checkout.session.async_payment_failed": {
        const id = event.data.object.metadata?.orderId;
        if (id) await db.update(schema.orders).set({ status: "storniert" }).where(and(eq(schema.orders.id, id), eq(schema.orders.status, "zahlung_ausstehend")));
        break;
      }
      case "charge.succeeded":
      case "charge.updated": {
        const charge = event.data.object;
        const id = charge.metadata?.orderId;
        if (id && charge.balance_transaction) {
          const g = await gebuehrAusCharge(charge);
          if (g?.gebuehrCent != null) await db.update(schema.orders).set({ stripeGebuehrCent: g.gebuehrCent, stripeChargeId: g.chargeId }).where(eq(schema.orders.id, id));
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object;
        const id = charge.metadata?.orderId;
        if (id) await db.update(schema.orders).set({ erstattetCent: charge.amount_refunded }).where(eq(schema.orders.id, id));
        break;
      }
      case "invoice.paid":
      case "invoice.finalized": {
        const inv = event.data.object;
        const id = inv.metadata?.orderId;
        if (id && inv.hosted_invoice_url) await db.update(schema.orders).set({ stripeRechnungUrl: inv.hosted_invoice_url, stripeRechnungPdf: inv.invoice_pdf ?? null }).where(eq(schema.orders.id, id));
        break;
      }
    }
  } catch (e) {
    // Event wieder freigeben, damit Stripe es erneut zustellen kann
    await db.delete(schema.stripeEvents).where(eq(schema.stripeEvents.id, event.id));
    throw e;
  }
  return true;
}

// ───────────────────────── Status, Lager, Versand ─────────────────────────

export const STATUS_TEXT: Record<BestellStatus, string> = {
  offen: "Nicht bezahlt",
  zahlung_ausstehend: "Zahlung ausstehend",
  neu: "Neu",
  eingekauft: "Eingekauft",
  gepackt: "Gepackt",
  versendet: "Versendet",
  geliefert: "Geliefert",
  abgeschlossen: "Abgeschlossen",
  storniert: "Storniert",
};

export const STATUS_FOLGE: Record<BestellStatus, BestellStatus[]> = {
  offen: ["storniert"],
  zahlung_ausstehend: ["neu", "storniert"],
  neu: ["eingekauft", "gepackt", "storniert"],
  eingekauft: ["gepackt", "neu", "storniert"],
  gepackt: ["versendet", "geliefert", "eingekauft", "storniert"],
  versendet: ["geliefert", "abgeschlossen"],
  geliefert: ["abgeschlossen"],
  abgeschlossen: [],
  storniert: [],
};

function bedarf(positionen: { menge: number; inhalt: InhaltSnapshot[]; verpackung: { packagingId: string; menge: number }[] }[]) {
  const artikel = new Map<string, number>();
  const verpackung = new Map<string, number>();
  for (const p of positionen) {
    for (const x of p.inhalt) artikel.set(x.articleId, (artikel.get(x.articleId) ?? 0) + x.menge * p.menge);
    for (const v of p.verpackung) verpackung.set(v.packagingId, (verpackung.get(v.packagingId) ?? 0) + v.menge * p.menge);
  }
  return { artikel, verpackung };
}

async function bucheLager(tx: Tx, orderId: string, richtung: -1 | 1): Promise<number> {
  const positionen = await tx.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));
  const { artikel, verpackung } = bedarf(positionen);
  const ids = [...artikel.keys()];
  const stamm = ids.length ? await tx.select({ id: schema.articles.id, einstandCent: schema.articles.einstandCent }).from(schema.articles).where(inArray(schema.articles.id, ids)) : [];
  const einstand = new Map(stamm.map((a) => [a.id, a.einstandCent]));
  for (const [id, menge] of artikel) {
    await tx.update(schema.articles).set({ bestand: sql`${schema.articles.bestand} + ${richtung * menge}` }).where(eq(schema.articles.id, id));
    await tx.insert(schema.stockMovements).values({ articleId: id, delta: richtung * menge, grund: richtung < 0 ? "gepackt" : "storno", orderId });
  }
  for (const [id, menge] of verpackung) {
    await tx.update(schema.packagingItems).set({ bestand: sql`${schema.packagingItems.bestand} + ${richtung * menge}` }).where(eq(schema.packagingItems.id, id));
    await tx.insert(schema.stockMovements).values({ packagingId: id, delta: richtung * menge, grund: richtung < 0 ? "gepackt" : "storno", orderId });
  }
  return positionen.reduce((s, p) => s + p.menge * artikelKosten(p.inhalt, einstand), 0);
}

/**
 * Statuswechsel. „Gepackt“ bucht Artikel und Verpackung vom Lager ab und hält die echten
 * Artikelkosten fest (bezahlte Einkaufspreise, sonst Katalogpreis). Zurück auf „Eingekauft“ bucht wieder ein.
 */
export async function setzeStatus(orderId: string, neu: BestellStatus): Promise<void> {
  await db.transaction(async (tx) => {
    const [b] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId)).for("update");
    if (!b) throw new Error("Bestellung nicht gefunden.");
    if (b.status === neu) return;
    if (!STATUS_FOLGE[b.status].includes(neu)) throw new Error(`Wechsel von „${STATUS_TEXT[b.status]}“ zu „${STATUS_TEXT[neu]}“ ist nicht möglich.`);
    const aenderung: Partial<typeof schema.orders.$inferInsert> = { status: neu };
    const jetzt = new Date();
    if (neu === "eingekauft" && b.status === "neu") aenderung.eingekauftAm = jetzt;
    if (neu === "gepackt") {
      aenderung.echtArtikelCent = await bucheLager(tx, orderId, -1);
      aenderung.gepacktAm = jetzt;
    }
    if (b.status === "gepackt" && (neu === "eingekauft" || neu === "storniert")) {
      await bucheLager(tx, orderId, 1);
      aenderung.echtArtikelCent = null;
      aenderung.gepacktAm = null;
    }
    if (neu === "versendet") aenderung.versendetAm = jetzt;
    if (neu === "geliefert") aenderung.geliefertAm = jetzt;
    if (neu === "neu" && b.status === "zahlung_ausstehend") aenderung.bezahltAm = jetzt;
    await tx.update(schema.orders).set(aenderung).where(eq(schema.orders.id, orderId));
  });
}

/**
 * Trägt Sendungsnummern ein, setzt den Status auf „Versendet“ (bzw. „Geliefert“ bei persönlicher
 * Lieferung) und schickt dem Kunden die Versandmail.
 */
export async function versende(orderId: string, daten: { sendungsnummer?: string; jeEmpfaenger?: Record<number, string>; versandKostenCent?: number | null }): Promise<void> {
  const [b] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
  if (!b) throw new Error("Bestellung nicht gefunden.");
  const jetzt = new Date();
  const sendungen: { nummer: string; empfaenger?: string }[] = [];
  if (b.lieferart === "mehrfach") {
    const empfaenger = await db.select().from(schema.orderRecipients).where(eq(schema.orderRecipients.orderId, orderId));
    for (const x of empfaenger) {
      const nr = (daten.jeEmpfaenger?.[x.id] ?? x.sendungsnummer ?? "").trim();
      if (nr) {
        if (nr !== x.sendungsnummer) await db.update(schema.orderRecipients).set({ sendungsnummer: nr, versendetAm: jetzt }).where(eq(schema.orderRecipients.id, x.id));
        sendungen.push({ nummer: nr, empfaenger: x.name });
      }
    }
    if (sendungen.length === 0) throw new Error("Bitte mindestens eine Sendungsnummer eintragen.");
  } else if (b.lieferart === "versand") {
    const nummern = (daten.sendungsnummer ?? "").split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
    if (nummern.length === 0) throw new Error("Bitte die Sendungsnummer eintragen.");
    sendungen.push(...nummern.map((nummer) => ({ nummer })));
  }
  const ziel: BestellStatus = b.lieferart === "persoenlich" ? "geliefert" : "versendet";
  if (b.status !== ziel) await setzeStatus(orderId, ziel);
  await db
    .update(schema.orders)
    .set({
      sendungsnummer: b.lieferart === "versand" ? sendungen.map((s) => s.nummer).join(", ") : b.sendungsnummer,
      ...(daten.versandKostenCent != null ? { echtVersandKostenCent: daten.versandKostenCent } : {}),
    })
    .where(eq(schema.orders.id, orderId));
  await sendeMail({ an: b.email, art: "versand", orderId, antwortAn: process.env.OWNER_EMAIL, ...versandMail(b, sendungen) });
}

/** Erstattung über Stripe; `betragCent` leer = volle Erstattung des Restbetrags. */
export async function erstatte(orderId: string, betragCent?: number): Promise<number> {
  const [b] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
  if (!b?.stripePaymentIntentId) throw new Error("Zu dieser Bestellung gibt es keine Stripe-Zahlung.");
  const offen = (b.bezahltCent ?? 0) - b.erstattetCent;
  const betrag = betragCent ?? offen;
  if (betrag <= 0 || betrag > offen) throw new Error(`Erstattbar sind höchstens ${euro(offen)}.`);
  await stripe().refunds.create({ payment_intent: b.stripePaymentIntentId, amount: betrag, metadata: { orderId, nummer: b.nummer } });
  const [neu] = await db.update(schema.orders).set({ erstattetCent: sql`greatest(${schema.orders.erstattetCent}, ${b.erstattetCent + betrag})` }).where(eq(schema.orders.id, orderId)).returning({ erstattetCent: schema.orders.erstattetCent });
  return neu.erstattetCent;
}
