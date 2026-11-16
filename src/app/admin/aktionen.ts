"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { erfordereAdmin } from "@/auth";
import type { Ergebnis } from "@/components/admin/formular";
import { erzeugeVarianten } from "@/lib/bild-varianten";
import { heuteBerlin } from "@/lib/calc/deadlines";
import { neuerEinstand } from "@/lib/calc/profit";
import { einstellungenSchema } from "@/lib/einstellungen";
import { parseEuro } from "@/lib/geld";
import { aktualisiereStripeDaten, erstatte, sendeBestaetigungErneut, setzeStatus, versende } from "@/lib/server/bestellungen";
import { ladeEinstellungenFrisch, speichereEinstellungen } from "@/lib/server/einstellungen";
import { erkenneTyp, speichereDatei } from "@/lib/server/storage";
import { stripe, stripeKonfiguriert } from "@/lib/server/stripe";
import { db, schema } from "../../../db";
import type { BestellStatus, BildVarianten } from "../../../db/schema";

const fehlerText = (e: unknown) => (e instanceof z.ZodError ? e.issues.map((i) => i.message).join(" ") : e instanceof Error ? e.message : "Unbekannter Fehler.");
const txt = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const ganz = (f: FormData, k: string) => {
  const n = Number(txt(f, k).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};
const slugAus = (s: string) =>
  s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

/** Fotos kommen bereits im Browser verkleinert an; die Grenze liegt unter dem Limit der Hoster (ca. 4,5 MB je Anfrage). */
const FOTO_MAX = 3.5 * 1024 * 1024;

async function aktion(f: () => Promise<string | void>): Promise<Ergebnis> {
  await erfordereAdmin();
  try {
    const ok = await f();
    refresh();
    return { ok: ok || "Gespeichert." };
  } catch (e) {
    // redirect() wirft absichtlich – durchreichen
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
    return { fehler: fehlerText(e) };
  }
}

// ───────────────────────── Bestellungen ─────────────────────────

export async function statusAendern(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  return aktion(async () => {
    await setzeStatus(txt(f, "id"), txt(f, "status") as BestellStatus);
    return "Status geändert.";
  });
}

export async function versenden(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  return aktion(async () => {
    const jeEmpfaenger: Record<number, string> = {};
    for (const [k, v] of f.entries()) if (k.startsWith("emp_")) jeEmpfaenger[Number(k.slice(4))] = String(v);
    const kosten = txt(f, "versandkosten") ? parseEuro(txt(f, "versandkosten")) : null;
    if (txt(f, "versandkosten") && kosten == null) throw new Error("Versandkosten bitte als Betrag eingeben, z. B. 7,69.");
    await versende(txt(f, "id"), { sendungsnummer: txt(f, "sendungsnummer"), jeEmpfaenger, versandKostenCent: kosten });
    return "Gespeichert – die Versandmail ist raus.";
  });
}

export async function bestellungNotiz(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  return aktion(async () => {
    const kosten = txt(f, "versandkosten") ? parseEuro(txt(f, "versandkosten")) : null;
    if (txt(f, "versandkosten") && kosten == null) throw new Error("Versandkosten bitte als Betrag eingeben, z. B. 7,69.");
    await db
      .update(schema.orders)
      .set({ interneNotiz: txt(f, "notiz").slice(0, 4000), ...(f.has("versandkosten") ? { echtVersandKostenCent: kosten } : {}) })
      .where(eq(schema.orders.id, txt(f, "id")));
  });
}

export async function erstatten(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  return aktion(async () => {
    if (txt(f, "bestaetigung").toUpperCase() !== "ERSTATTEN") throw new Error("Bitte zur Bestätigung ERSTATTEN eintippen.");
    const betrag = txt(f, "betrag") ? parseEuro(txt(f, "betrag")) : undefined;
    if (betrag === null) throw new Error("Betrag bitte als Zahl eingeben, z. B. 45,00.");
    await erstatte(txt(f, "id"), betrag);
    return "Erstattung bei Stripe angestoßen.";
  });
}

export async function stripeDatenHolen(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  return aktion(async () => {
    const { gebuehrCent } = await aktualisiereStripeDaten(txt(f, "id"));
    return gebuehrCent == null ? "Stripe hat die Gebühr noch nicht verbucht – später erneut versuchen." : "Gebühr und Rechnung aktualisiert.";
  });
}

export async function bestaetigungErneut(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  return aktion(async () => {
    await sendeBestaetigungErneut(txt(f, "id"));
    return "Bestätigung erneut gesendet.";
  });
}

// ───────────────────────── Einkauf & Bestand ─────────────────────────

export async function einkaufBuchen(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  return aktion(async () => {
    const articleId = txt(f, "articleId");
    const menge = ganz(f, "menge");
    const gesamt = parseEuro(txt(f, "bezahlt"));
    if (!Number.isInteger(menge) || menge < 1 || menge > 10000) throw new Error("Menge bitte als ganze Zahl eingeben.");
    if (gesamt == null || gesamt < 0) throw new Error("Bezahlten Gesamtbetrag eingeben, z. B. 27,45.");
    const stueckpreisCent = Math.round(gesamt / menge);
    await db.transaction(async (tx) => {
      const [a] = await tx.select().from(schema.articles).where(eq(schema.articles.id, articleId)).for("update");
      if (!a) throw new Error("Artikel nicht gefunden.");
      await tx.insert(schema.purchases).values({ articleId, menge, stueckpreisCent, laden: txt(f, "laden") || a.laden, gekauftAm: heuteBerlin() });
      await tx
        .update(schema.articles)
        .set({ bestand: a.bestand + menge, einstandCent: neuerEinstand(a.bestand, a.einstandCent, menge, stueckpreisCent), updatedAt: new Date() })
        .where(eq(schema.articles.id, articleId));
      await tx.insert(schema.stockMovements).values({ articleId, delta: menge, grund: "einkauf" });
    });
    return `${menge} Stück gebucht.`;
  });
}

export async function alleEingekauft(): Promise<Ergebnis> {
  return aktion(async () => {
    const neu = await db.select({ id: schema.orders.id }).from(schema.orders).where(eq(schema.orders.status, "neu"));
    for (const b of neu) await setzeStatus(b.id, "eingekauft");
    return `${neu.length} Bestellung(en) auf „Eingekauft“ gesetzt.`;
  });
}

export async function bestandSetzen(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  return aktion(async () => {
    const id = txt(f, "id");
    const bestand = ganz(f, "bestand");
    const mindest = ganz(f, "mindestbestand");
    if (Number.isNaN(bestand) || Number.isNaN(mindest)) throw new Error("Bitte Zahlen eingeben.");
    if (txt(f, "typ") === "verpackung") {
      const [p] = await db.select().from(schema.packagingItems).where(eq(schema.packagingItems.id, id));
      if (!p) throw new Error("Nicht gefunden.");
      await db.update(schema.packagingItems).set({ bestand, mindestbestand: mindest }).where(eq(schema.packagingItems.id, id));
      if (bestand !== p.bestand) await db.insert(schema.stockMovements).values({ packagingId: id, delta: bestand - p.bestand, grund: "korrektur" });
    } else {
      const [a] = await db.select().from(schema.articles).where(eq(schema.articles.id, id));
      if (!a) throw new Error("Nicht gefunden.");
      await db.update(schema.articles).set({ bestand: Math.round(bestand), mindestbestand: Math.round(mindest) }).where(eq(schema.articles.id, id));
      if (Math.round(bestand) !== a.bestand) await db.insert(schema.stockMovements).values({ articleId: id, delta: Math.round(bestand) - a.bestand, grund: "korrektur" });
    }
  });
}

// ───────────────────────── Artikel ─────────────────────────

const artikelSchema = z.object({
  name: z.string().min(2, "Name fehlt.").max(160),
  marke: z.string().max(80),
  groesse: z.string().max(40),
  kategorie: z.string().max(60),
  laden: z.string().min(1, "Laden fehlt.").max(60),
  ersatz: z.string().max(400),
  quelleUrl: z.string().max(600),
  quelleHinweis: z.string().max(400),
  status: z.enum(["belegt", "richtwert", "geschaetzt"]),
  mhd: z.string().max(200),
  allergene: z.string().max(600),
  zutaten: z.string().max(3000),
  alkoholVol: z.string().max(40),
});

export async function artikelSpeichern(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  let ziel: string | null = null;
  const ergebnis = await aktion(async () => {
    const daten = artikelSchema.parse(Object.fromEntries(Object.keys(artikelSchema.shape).map((k) => [k, txt(f, k)])));
    const preisCent = parseEuro(txt(f, "preis"));
    if (preisCent == null || preisCent < 0) throw new Error("Preis bitte als Betrag eingeben, z. B. 3,49.");
    const gewicht = ganz(f, "gewichtGramm");
    if (!Number.isInteger(gewicht) || gewicht < 0) throw new Error("Gewicht in Gramm als ganze Zahl eingeben.");
    const id = txt(f, "id");
    const alkohol = f.get("alkohol") === "on";
    const werte = {
      ...daten,
      preisCent,
      gewichtGramm: gewicht,
      alkohol,
      alkoholVol: alkohol ? daten.alkoholVol || null : null,
      ersatzOhneAlkoholId: alkohol ? txt(f, "ersatzOhneAlkoholId") || null : null,
      allergeneGeprueft: f.get("allergeneGeprueft") === "on",
      aktiv: f.get("aktiv") === "on",
      updatedAt: new Date(),
    };
    if (id) {
      const [alt] = await db.select().from(schema.articles).where(eq(schema.articles.id, id));
      if (!alt) throw new Error("Artikel nicht gefunden.");
      // Preisänderung oder ausdrückliche Bestätigung setzt das Prüfdatum neu
      const geprueftAm = alt.preisCent !== preisCent || f.get("preisGeprueft") === "on" ? heuteBerlin() : alt.geprueftAm;
      await db.update(schema.articles).set({ ...werte, geprueftAm }).where(eq(schema.articles.id, id));
    } else {
      const neuId = slugAus(`${daten.marke} ${daten.name} ${daten.groesse}`) || `artikel-${Date.now()}`;
      const [vorhanden] = await db.select({ id: schema.articles.id }).from(schema.articles).where(eq(schema.articles.id, neuId));
      if (vorhanden) throw new Error("Diesen Artikel gibt es schon.");
      await db.insert(schema.articles).values({ id: neuId, ...werte, geprueftAm: heuteBerlin() });
      ziel = `/admin/artikel/${neuId}`;
    }
    updateTag("katalog");
  });
  if (ziel && ergebnis?.ok) redirect(ziel);
  return ergebnis;
}

export async function preisBestaetigen(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  return aktion(async () => {
    await db.update(schema.articles).set({ geprueftAm: heuteBerlin(), status: "belegt", updatedAt: new Date() }).where(eq(schema.articles.id, txt(f, "id")));
    return "Preis als heute geprüft markiert.";
  });
}

// ───────────────────────── Boxen ─────────────────────────

const boxSchema = z.object({
  id: z.number().int().nullable(),
  name: z.string().trim().min(2, "Name fehlt.").max(80),
  slug: z.string().trim().max(60),
  collectionId: z.number().int(),
  anlass: z.string().max(160),
  zielgruppe: z.string().max(200),
  kurz: z.string().max(200),
  text: z.string().max(1500),
  preisCent: z.number().int().min(100, "Preis fehlt.").max(1_000_000),
  groesse: z.enum(["klein", "flach", "mittel", "gross"]),
  packMinuten: z.number().int().min(0).max(120),
  bestseller: z.boolean(),
  aktiv: z.boolean(),
  sichtbarVon: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  sichtbarBis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  sortierung: z.number().int(),
  band: z.string().max(30),
  seoTitel: z.string().max(70),
  seoBeschreibung: z.string().max(170),
  artikel: z.array(z.object({ articleId: z.string(), menge: z.number().int().min(1).max(50) })).max(30),
  verpackung: z.array(z.object({ packagingId: z.string(), menge: z.number().min(0.001).max(100) })).max(20),
});
export type BoxEingabe = z.infer<typeof boxSchema>;

export async function boxSpeichern(eingabe: BoxEingabe): Promise<{ ok?: string; fehler?: string; id?: number }> {
  await erfordereAdmin();
  try {
    const d = boxSchema.parse(eingabe);
    const slug = slugAus(d.slug || d.name);
    if (!slug) throw new Error("Bitte einen Namen angeben.");
    const { id, artikel, verpackung, ...rest } = d;
    const werte = { ...rest, slug, updatedAt: new Date() };
    const boxId = await db.transaction(async (tx) => {
      const [gleich] = await tx.select({ id: schema.boxes.id }).from(schema.boxes).where(eq(schema.boxes.slug, slug));
      if (gleich && gleich.id !== id) throw new Error(`Die Adresse „${slug}“ wird schon von einer anderen Box verwendet.`);
      let ziel = id;
      if (ziel) await tx.update(schema.boxes).set(werte).where(eq(schema.boxes.id, ziel));
      else ziel = (await tx.insert(schema.boxes).values(werte).returning({ id: schema.boxes.id }))[0].id;
      await tx.delete(schema.boxItems).where(eq(schema.boxItems.boxId, ziel));
      const eindeutig = [...new Map(artikel.map((a) => [a.articleId, a])).values()];
      if (eindeutig.length) await tx.insert(schema.boxItems).values(eindeutig.map((a, i) => ({ boxId: ziel!, articleId: a.articleId, menge: a.menge, sortierung: i })));
      await tx.delete(schema.boxPackaging).where(eq(schema.boxPackaging.boxId, ziel));
      const vEindeutig = [...new Map(verpackung.map((v) => [v.packagingId, v])).values()];
      if (vEindeutig.length) await tx.insert(schema.boxPackaging).values(vEindeutig.map((v) => ({ boxId: ziel!, packagingId: v.packagingId, menge: v.menge })));
      return ziel;
    });
    updateTag("katalog");
    refresh();
    return { ok: "Gespeichert – der Shop zeigt die Änderung sofort.", id: boxId };
  } catch (e) {
    return { fehler: fehlerText(e) };
  }
}

export async function bildHochladen(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  return aktion(async () => {
    const boxId = Number(txt(f, "boxId"));
    const ersetzeId = txt(f, "bildId") ? Number(txt(f, "bildId")) : null;
    const datei = f.get("datei");
    if (!(datei instanceof File) || datei.size === 0) throw new Error("Bitte ein Foto auswählen.");
    if (datei.size > FOTO_MAX) throw new Error("Das Foto ist größer als 3,5 MB. Bitte kleiner exportieren.");
    const roh = Buffer.from(await datei.arrayBuffer());
    if (!erkenneTyp(roh, ["image/jpeg", "image/png", "image/webp"])) throw new Error("Bitte ein JPG-, PNG- oder WebP-Foto hochladen.");
    const [box] = await db.select().from(schema.boxes).where(eq(schema.boxes.id, boxId));
    if (!box) throw new Error("Box nicht gefunden.");
    const { dateien, breite, hoehe, blur } = await erzeugeVarianten(roh);
    const art = (txt(f, "art") || "foto") as "hero" | "flatlay" | "geschlossen" | "foto";
    const varianten: BildVarianten = { avif: {}, webp: {} };
    const basis = `geschenkbox-${box.slug}-${art}-${Date.now().toString(36)}`;
    for (const d of dateien) varianten[d.format][String(d.breite)] = await speichereDatei("boxen", `${basis}-${d.breite}.${d.format}`, d.daten, `image/${d.format}`);
    const alt = txt(f, "alt") || `Geschenkbox „${box.name}“ – ${box.kurz.replace(/\.$/, "")}`;
    if (ersetzeId) {
      await db.update(schema.boxImages).set({ varianten, breite, hoehe, blur, alt, platzhalter: false }).where(and(eq(schema.boxImages.id, ersetzeId), eq(schema.boxImages.boxId, boxId)));
    } else {
      const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${schema.boxImages.sortierung}), -1)::int` }).from(schema.boxImages).where(eq(schema.boxImages.boxId, boxId));
      await db.insert(schema.boxImages).values({ boxId, art, varianten, breite, hoehe, blur, alt, platzhalter: false, sortierung: max + 1 });
    }
    updateTag("katalog");
    return "Foto gespeichert. Der Hinweis „Beispielabbildung“ entfällt bei diesem Bild.";
  });
}

export async function bildLoeschen(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  return aktion(async () => {
    await db.delete(schema.boxImages).where(eq(schema.boxImages.id, Number(txt(f, "bildId"))));
    updateTag("katalog");
    return "Bild entfernt.";
  });
}

// ───────────────────────── Ausgaben ─────────────────────────

/** Kategorien, die schon in den Bestellkosten stecken und nicht noch einmal umgelegt werden. */
const IN_BESTELLKOSTEN = ["Verpackung (Vorrat)", "Wareneinkauf (ohne Einkaufsliste)", "Porto / Versand"];

export async function ausgabeAnlegen(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  return aktion(async () => {
    const betragCent = parseEuro(txt(f, "betrag"));
    if (betragCent == null || betragCent <= 0) throw new Error("Betrag bitte als Zahl eingeben, z. B. 89,00.");
    const datum = txt(f, "datum") || heuteBerlin();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) throw new Error("Datum fehlt.");
    const kategorie = txt(f, "kategorie") || "Sonstiges";
    await db.insert(schema.expenses).values({
      datum,
      kategorie,
      beschreibung: txt(f, "beschreibung").slice(0, 300),
      betragCent,
      campaignId: txt(f, "campaignId") ? Number(txt(f, "campaignId")) : null,
      inBestellkosten: IN_BESTELLKOSTEN.includes(kategorie),
    });
    return "Ausgabe gespeichert.";
  });
}

export async function ausgabeLoeschen(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  return aktion(async () => {
    await db.delete(schema.expenses).where(eq(schema.expenses.id, Number(txt(f, "id"))));
    return "Gelöscht.";
  });
}

// ───────────────────────── Kampagnen ─────────────────────────

export async function kampagneSpeichern(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  return aktion(async () => {
    const name = txt(f, "name");
    if (name.length < 2) throw new Error("Name fehlt.");
    const slug = slugAus(txt(f, "slug") || name);
    if (!slug) throw new Error("Kurzlink fehlt.");
    const kosten = txt(f, "kosten") ? parseEuro(txt(f, "kosten")) : 0;
    if (kosten == null) throw new Error("Kosten bitte als Betrag eingeben.");
    const ziel = txt(f, "ziel") || "/";
    if (!ziel.startsWith("/") || ziel.startsWith("//")) throw new Error("Das Ziel muss eine Seite dieser Website sein, z. B. / oder /boxen.");
    const werte = { name, slug, kanal: txt(f, "kanal") || "flyer", ziel, kostenCent: kosten, rabattCode: txt(f, "rabattCode").toUpperCase() || null, notiz: txt(f, "notiz").slice(0, 500), aktiv: f.get("aktiv") !== "aus" };
    const id = txt(f, "id");
    const [gleich] = await db.select({ id: schema.campaigns.id }).from(schema.campaigns).where(eq(schema.campaigns.slug, slug));
    if (gleich && String(gleich.id) !== id) throw new Error(`Den Kurzlink /k/${slug} gibt es schon.`);
    if (id) await db.update(schema.campaigns).set(werte).where(eq(schema.campaigns.id, Number(id)));
    else await db.insert(schema.campaigns).values(werte);
    return id ? "Kampagne gespeichert." : `Kampagne angelegt: /k/${slug}`;
  });
}

// ───────────────────────── Anfragen ─────────────────────────

export async function anfrageBearbeiten(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  return aktion(async () => {
    await db
      .update(schema.inquiries)
      .set({ status: txt(f, "status") === "erledigt" ? "erledigt" : "offen", notiz: txt(f, "notiz").slice(0, 2000) })
      .where(eq(schema.inquiries.id, Number(txt(f, "id"))));
  });
}

// ───────────────────────── Rabattcodes ─────────────────────────

export async function rabattcodeAnlegen(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  return aktion(async () => {
    const code = txt(f, "code").toUpperCase();
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) throw new Error("Code: 3–40 Zeichen, nur Buchstaben, Ziffern, - und _.");
    const art = txt(f, "art") === "betrag" ? "betrag" : "prozent";
    const wert = art === "prozent" ? ganz(f, "wert") : (parseEuro(txt(f, "wert")) ?? NaN);
    if (!Number.isFinite(wert) || wert <= 0 || (art === "prozent" && (wert > 100 || !Number.isInteger(wert)))) throw new Error(art === "prozent" ? "Prozent als ganze Zahl von 1 bis 100." : "Betrag bitte als Zahl eingeben, z. B. 10,00.");
    const bis = txt(f, "gueltigBis");
    const gueltigBis = bis ? new Date(`${bis}T23:59:59+01:00`) : null;
    if (gueltigBis && gueltigBis.getTime() < Date.now()) throw new Error("Das Ablaufdatum liegt in der Vergangenheit.");
    const max = txt(f, "max") ? ganz(f, "max") : null;
    if (max != null && (!Number.isInteger(max) || max < 1)) throw new Error("Nutzungslimit als ganze Zahl.");
    const [vorhanden] = await db.select({ id: schema.discountCodes.id }).from(schema.discountCodes).where(eq(schema.discountCodes.code, code));
    if (vorhanden) throw new Error("Diesen Code gibt es schon.");
    if (!stripeKonfiguriert()) throw new Error("Stripe ist nicht eingerichtet (STRIPE_SECRET_KEY fehlt) – Rabattcodes werden als Stripe Promotion Codes angelegt.");
    const s = stripe();
    const coupon = await s.coupons.create({
      name: `Dankeskiste ${code}`,
      duration: "once",
      ...(art === "prozent" ? { percent_off: wert } : { amount_off: wert, currency: "eur" }),
    });
    const promo = await s.promotionCodes.create({
      promotion: { type: "coupon", coupon: coupon.id },
      code,
      ...(gueltigBis ? { expires_at: Math.floor(gueltigBis.getTime() / 1000) } : {}),
      ...(max ? { max_redemptions: max } : {}),
    });
    await db.insert(schema.discountCodes).values({ code, art, wert, gueltigBis, maxEinloesungen: max, stripeCouponId: coupon.id, stripePromotionCodeId: promo.id });
    return `Code ${code} angelegt.`;
  });
}

export async function rabattcodeUmschalten(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  return aktion(async () => {
    const [c] = await db.select().from(schema.discountCodes).where(eq(schema.discountCodes.id, Number(txt(f, "id"))));
    if (!c) throw new Error("Code nicht gefunden.");
    const aktiv = !c.aktiv;
    if (c.stripePromotionCodeId && stripeKonfiguriert()) await stripe().promotionCodes.update(c.stripePromotionCodeId, { active: aktiv });
    await db.update(schema.discountCodes).set({ aktiv }).where(eq(schema.discountCodes.id, c.id));
    return aktiv ? "Code aktiviert." : "Code deaktiviert.";
  });
}

// ───────────────────────── Einstellungen ─────────────────────────

export async function einstellungenSpeichern(eingabe: unknown): Promise<{ ok?: string; fehler?: string }> {
  await erfordereAdmin();
  const ergebnis = einstellungenSchema.safeParse(eingabe);
  if (!ergebnis.success) return { fehler: ergebnis.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ") };
  const e = ergebnis.data;
  if (e.fristen.versand.bestellschluss > e.fristen.versand.lieferungBis) return { fehler: "Versand: Der Bestellschluss liegt nach dem Liefertermin." };
  if (e.fristen.persoenlich.fensterVon > e.fristen.persoenlich.fensterBis) return { fehler: "Persönliche Lieferung: Das Lieferfenster endet vor seinem Beginn." };
  const stufen = [...e.versand.stufen].sort((a, b) => a.bisGramm - b.bisGramm);
  // Das Inhaberfoto wird getrennt hochgeladen und darf vom Editor nicht überschrieben werden.
  const fotoUrl = (await ladeEinstellungenFrisch()).kontakt.fotoUrl;
  await speichereEinstellungen({ ...e, kontakt: { ...e.kontakt, fotoUrl }, versand: { ...e.versand, stufen }, staffeln: [...e.staffeln].sort((a, b) => a.ab - b.ab) });
  updateTag("einstellungen");
  updateTag("katalog");
  refresh();
  return { ok: "Gespeichert – gilt ab sofort für neue Bestellungen." };
}

export async function inhaberFotoSpeichern(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  return aktion(async () => {
    const datei = f.get("datei");
    if (!(datei instanceof File) || datei.size === 0) throw new Error("Bitte ein Foto auswählen.");
    if (datei.size > FOTO_MAX) throw new Error("Das Foto ist größer als 3,5 MB. Bitte kleiner exportieren.");
    const roh = Buffer.from(await datei.arrayBuffer());
    if (!erkenneTyp(roh, ["image/jpeg", "image/png", "image/webp"])) throw new Error("Bitte ein JPG-, PNG- oder WebP-Foto hochladen.");
    const { default: sharp } = await import("sharp");
    const bild = await sharp(roh, { failOn: "error" }).rotate().resize(960, 1200, { fit: "cover", position: "attention" }).webp({ quality: 80 }).toBuffer();
    const fotoUrl = await speichereDatei("inhaber", `inhaber-${Date.now().toString(36)}.webp`, bild, "image/webp");
    const e = await ladeEinstellungenFrisch();
    await speichereEinstellungen({ ...e, kontakt: { ...e.kontakt, fotoUrl } });
    updateTag("einstellungen");
    return "Foto gespeichert – es erscheint auf der Startseite.";
  });
}

export async function inhaberFotoEntfernen(): Promise<Ergebnis> {
  return aktion(async () => {
    const e = await ladeEinstellungenFrisch();
    await speichereEinstellungen({ ...e, kontakt: { ...e.kontakt, fotoUrl: "" } });
    updateTag("einstellungen");
    return "Foto entfernt.";
  });
}

export async function kollektionSpeichern(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  return aktion(async () => {
    const datum = (k: string) => (/^\d{4}-\d{2}-\d{2}$/.test(txt(f, k)) ? txt(f, k) : null);
    await db
      .update(schema.collections)
      .set({ name: txt(f, "name"), kurz: txt(f, "kurz"), beschreibung: txt(f, "beschreibung"), sichtbarVon: datum("sichtbarVon"), sichtbarBis: datum("sichtbarBis"), aktiv: f.get("aktiv") === "on" })
      .where(eq(schema.collections.id, Number(txt(f, "id"))));
    updateTag("katalog");
  });
}

export async function mehrereStatus(_: Ergebnis, f: FormData): Promise<Ergebnis> {
  return aktion(async () => {
    const ids = f.getAll("ids").map(String);
    const status = txt(f, "status") as BestellStatus;
    if (!ids.length) throw new Error("Keine Bestellung ausgewählt.");
    const vorhandene = await db.select({ id: schema.orders.id }).from(schema.orders).where(inArray(schema.orders.id, ids));
    for (const b of vorhandene) await setzeStatus(b.id, status);
    return `${vorhandene.length} Bestellung(en) geändert.`;
  });
}
