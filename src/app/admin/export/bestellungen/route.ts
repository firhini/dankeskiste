import type { NextRequest } from "next/server";
import { adminOder401 } from "@/auth";
import { ladeAuswertung } from "@/lib/server/admin-daten";
import { alsCsv, centText, csvAntwort } from "@/lib/server/csv";

/** Einnahmen für die EÜR: eine Zeile je bezahlter Bestellung, mit geplantem und echtem Gewinn. */
export async function GET(request: NextRequest) {
  const admin = await adminOder401();
  if (admin instanceof Response) return admin;
  const jahr = /^\d{4}$/.test(request.nextUrl.searchParams.get("jahr") ?? "") ? request.nextUrl.searchParams.get("jahr")! : String(new Date().getFullYear());
  const a = await ladeAuswertung({ von: `${jahr}-01-01`, bis: `${jahr}-12-31` });
  const zeilen = a.zeilen.map(({ bestellung: b, boxen, gewinn: g }) => [
    b.nummer,
    b.bezahltAm?.toISOString().slice(0, 10) ?? "",
    b.firma,
    b.rechnungPlz,
    b.rechnungOrt,
    b.status,
    b.lieferart,
    boxen,
    centText(b.warenCent),
    centText(b.personalisierungCent),
    centText(b.versandCent),
    centText(b.rabattCodeCent),
    b.rabattCode ?? "",
    centText(b.bezahltCent ?? b.summeCent),
    centText(b.erstattetCent),
    centText(g.echt.umsatzCent),
    "0,00",
    centText(g.echt.artikelCent),
    centText(g.echt.verpackungCent),
    centText(g.echt.persoCent),
    centText(g.echt.versandCent),
    centText(g.echt.gebuehrCent),
    centText(g.echt.ausgabenCent),
    centText(g.geplant.gewinnCent),
    centText(g.echt.gewinnCent),
    b.stripePaymentIntentId ?? "",
    b.stripeRechnungUrl ?? "",
  ]);
  return csvAntwort(
    `dankeskiste-einnahmen-${jahr}.csv`,
    alsCsv(
      ["Bestellnummer", "Zahlungsdatum", "Firma", "PLZ", "Ort", "Status", "Lieferart", "Boxen", "Waren", "Personalisierung", "Versand", "Rabattcode-Betrag", "Rabattcode", "Bezahlt", "Erstattet", "Einnahme netto Erstattung", "Umsatzsteuer (§ 19 UStG)", "Artikelkosten", "Verpackung", "Personalisierung Material", "Versandkosten", "Stripe-Gebühr", "Anteilige Ausgaben", "Gewinn geplant", "Gewinn echt", "Stripe-Zahlung", "Rechnung"],
      zeilen,
    ),
  );
}
