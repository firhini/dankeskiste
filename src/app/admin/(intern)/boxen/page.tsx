import type { Metadata } from "next";
import Link from "next/link";
import { erfordereAdmin } from "@/auth";
import { AKnopf, Ampel, Block, Seite, Tabelle } from "@/components/admin/ui";
import { datumZahl, heuteBerlin } from "@/lib/calc/deadlines";
import { euro, gramm } from "@/lib/geld";
import { ladeBoxenMitKalkulation } from "@/lib/server/admin-daten";
import { ladeEinstellungenFrisch } from "@/lib/server/einstellungen";

/** Admin-Seiten rendern bewusst blockierend auf dem Server (kein Prerender, keine Sofort-Navigation). */
export const instant = false;

export const metadata: Metadata = { title: "Boxen" };

export default async function Boxen() {
  await erfordereAdmin();
  const e = await ladeEinstellungenFrisch();
  const boxen = await ladeBoxenMitKalkulation(e);
  const heute = heuteBerlin();
  const kollektionen = [...new Set(boxen.map((b) => b.kollektion))];
  return (
    <Seite titel="Boxen" hinweis={`Marge = Rohertrag nach Einkauf, Verpackung und Zahlungsgebühr. Warnung unter ${e.margen.zielProzent} %, rot unter ${e.margen.minProzent} %.`} aktionen={<AKnopf href="/admin/boxen/neu">Neue Box</AKnopf>}>
      {kollektionen.map((k) => (
        <Block key={k} titel={k}>
          <Tabelle kopf={["Box", "Preis", "Kosten", "Rohertrag", "Marge", "Gewicht", "Bilder", "Sichtbar"]}>
            {boxen.filter((b) => b.kollektion === k).map((b) => {
              const sichtbar = b.box.aktiv && (!b.box.sichtbarVon || heute >= b.box.sichtbarVon) && (!b.box.sichtbarBis || heute <= b.box.sichtbarBis);
              const fotos = b.bilder.filter((x) => !x.platzhalter).length;
              return (
                <tr key={b.box.id} className={b.box.aktiv ? "" : "opacity-60"}>
                  <td>
                    <Link href={`/admin/boxen/${b.box.id}`} className="textlink">{b.box.name}</Link>
                    <div className="text-dunkel">{b.artikel.length} Artikel{b.artikel.some((x) => x.artikel.alkohol) ? " · Alkohol" : ""}</div>
                  </td>
                  <td className="zahl whitespace-nowrap">{euro(b.kalk.preisCent)}</td>
                  <td className="zahl whitespace-nowrap">{euro(b.kalk.kostenCent, { immerCent: true })}</td>
                  <td className="zahl whitespace-nowrap">{euro(b.kalk.rohertragCent, { immerCent: true })}</td>
                  <td><Ampel marge={b.kalk.margeProzent} ziel={e.margen.zielProzent} min={e.margen.minProzent} /></td>
                  <td className="zahl whitespace-nowrap">{gramm(b.gewichtGramm)}</td>
                  <td className="whitespace-nowrap">{b.bilder.length === 0 ? "keine" : fotos ? `${fotos} Foto(s)` : `${b.bilder.length} Beispiel`}</td>
                  <td className="whitespace-nowrap">{!b.box.aktiv ? "inaktiv" : sichtbar ? "ja" : b.box.sichtbarVon && heute < b.box.sichtbarVon ? `ab ${datumZahl(b.box.sichtbarVon)}` : "abgelaufen"}</td>
                </tr>
              );
            })}
          </Tabelle>
        </Block>
      ))}
    </Seite>
  );
}
