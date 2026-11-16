import type { Metadata } from "next";
import { erfordereAdmin } from "@/auth";
import { Block, Seite } from "@/components/admin/ui";
import { heuteBerlin } from "@/lib/calc/deadlines";
import { euro } from "@/lib/geld";
import { ladeAuswertung } from "@/lib/server/admin-daten";

/** Admin-Seiten rendern bewusst blockierend auf dem Server (kein Prerender, keine Sofort-Navigation). */
export const instant = false;

export const metadata: Metadata = { title: "Export" };

export default async function Export() {
  await erfordereAdmin();
  const jahr = Number(heuteBerlin().slice(0, 4));
  const jahre = [jahr, jahr - 1];
  const auswertungen = await Promise.all(jahre.map((j) => ladeAuswertung({ von: `${j}-01-01`, bis: `${j}-12-31` })));
  return (
    <Seite titel="Export" hinweis="CSV-Dateien für die Einnahmen-Überschuss-Rechnung: Semikolon-getrennt, deutsches Zahlenformat, öffnet direkt in Excel. Als Kleinunternehmer (§ 19 UStG) weisen Sie keine Umsatzsteuer aus.">
      {jahre.map((j, i) => (
        <Block key={j} titel={`Jahr ${j}`}>
          <p className="klein mb-4">
            {auswertungen[i].zeilen.length} bezahlte Bestellungen · Einnahmen <strong className="zahl">{euro(auswertungen[i].echt.umsatzCent, { immerCent: true })}</strong> · Gewinn echt <strong className="zahl">{euro(auswertungen[i].echt.gewinnCent, { immerCent: true })}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            <a className="knopf !min-h-10 !px-3.5 !py-2 !text-[0.9375rem]" href={`/admin/export/bestellungen?jahr=${j}`}>Einnahmen (Bestellungen) als CSV</a>
            <a className="knopf knopf-hell !min-h-10 !px-3.5 !py-2 !text-[0.9375rem]" href={`/admin/export/ausgaben?jahr=${j}`}>Ausgaben als CSV</a>
          </div>
        </Block>
      ))}
      <Block titel="Was steht in den Dateien?">
        <ul className="klein list-disc space-y-1.5 pl-5">
          <li><strong>Einnahmen:</strong> je bezahlter Bestellung Zahlungsdatum, Firma, Beträge, Erstattungen, alle Kostenposten sowie geplanter und echter Gewinn.</li>
          <li><strong>Ausgaben:</strong> erfasste Ausgaben, Wareneinkäufe aus der Einkaufsliste, Stripe-Gebühren und tatsächlich bezahltes Porto – jeweils mit Datum der Zahlung.</li>
          <li>Rechnungen selbst liegen bei Stripe (Dashboard → Rechnungen) und lassen sich dort gesammelt herunterladen.</li>
        </ul>
      </Block>
    </Seite>
  );
}
