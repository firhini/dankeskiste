import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { adminOder401 } from "@/auth";
import { BEZAHLT_STATUS } from "@/lib/server/bestellungen";
import { alsCsv, centText, csvAntwort } from "@/lib/server/csv";
import { db, schema } from "../../../../../db";

/**
 * Ausgaben für die EÜR nach Zahlungsdatum: erfasste Ausgaben, Wareneinkäufe aus der Einkaufsliste,
 * Stripe-Gebühren und tatsächlich bezahltes Porto je Bestellung.
 */
export async function GET(request: NextRequest) {
  const admin = await adminOder401();
  if (admin instanceof Response) return admin;
  const jahr = /^\d{4}$/.test(request.nextUrl.searchParams.get("jahr") ?? "") ? request.nextUrl.searchParams.get("jahr")! : String(new Date().getFullYear());
  const von = `${jahr}-01-01`;
  const bis = `${jahr}-12-31`;
  const [ausgaben, einkaeufe, bestellungen] = await Promise.all([
    db.select().from(schema.expenses).where(and(gte(schema.expenses.datum, von), lte(schema.expenses.datum, bis))).orderBy(asc(schema.expenses.datum)),
    db
      .select({ k: schema.purchases, name: schema.articles.name, marke: schema.articles.marke })
      .from(schema.purchases)
      .innerJoin(schema.articles, eq(schema.articles.id, schema.purchases.articleId))
      .where(and(gte(schema.purchases.gekauftAm, von), lte(schema.purchases.gekauftAm, bis))),
    db
      .select()
      .from(schema.orders)
      .where(and(inArray(schema.orders.status, BEZAHLT_STATUS), gte(schema.orders.bezahltAm, new Date(`${von}T00:00:00+01:00`)), lte(schema.orders.bezahltAm, new Date(`${bis}T23:59:59+01:00`)))),
  ]);
  const zeilen: (string | number)[][] = [
    ...ausgaben.map((a) => [a.datum, a.kategorie, a.beschreibung, centText(a.betragCent), "Ausgabe"]),
    ...einkaeufe.map(({ k, name, marke }) => [k.gekauftAm, "Wareneinkauf", `${k.menge} × ${marke} ${name} (${k.laden})`, centText(k.menge * k.stueckpreisCent), "Einkaufsliste"]),
    ...bestellungen.filter((b) => b.stripeGebuehrCent != null).map((b) => [b.bezahltAm!.toISOString().slice(0, 10), "Zahlungsgebühren", `Stripe-Gebühr ${b.nummer}`, centText(b.stripeGebuehrCent), "Stripe"]),
    ...bestellungen.filter((b) => b.echtVersandKostenCent != null && b.echtVersandKostenCent > 0).map((b) => [(b.versendetAm ?? b.bezahltAm)!.toISOString().slice(0, 10), "Porto / Versand", `Porto ${b.nummer}`, centText(b.echtVersandKostenCent), "Bestellung"]),
  ].sort((x, y) => String(x[0]).localeCompare(String(y[0])));
  return csvAntwort(`dankeskiste-ausgaben-${jahr}.csv`, alsCsv(["Datum", "Kategorie", "Beschreibung", "Betrag brutto", "Quelle"], zeilen));
}
