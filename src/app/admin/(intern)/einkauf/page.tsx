import type { Metadata } from "next";
import Link from "next/link";
import { erfordereAdmin } from "@/auth";
import { DruckKnopf } from "@/components/admin/druck";
import { Absenden, Formular } from "@/components/admin/formular";
import { Block, Leer, Seite, feldKlein, knopfKlein } from "@/components/admin/ui";
import { euro } from "@/lib/geld";
import { ladeEinkaufsliste } from "@/lib/server/admin-daten";
import { alleEingekauft, einkaufBuchen } from "../../aktionen";

/** Admin-Seiten rendern bewusst blockierend auf dem Server (kein Prerender, keine Sofort-Navigation). */
export const instant = false;

export const metadata: Metadata = { title: "Einkaufsliste" };

async function AlleEingekauftKnopf() {
  "use server";
  await alleEingekauft();
}

export default async function Einkauf() {
  await erfordereAdmin();
  const liste = await ladeEinkaufsliste();
  const offen = liste.gruppen.reduce((s, g) => s + g.zeilen.filter((z) => z.kaufen > 0).length, 0);
  return (
    <Seite
      titel="Einkaufsliste"
      hinweis={`Bedarf aus ${liste.offeneBestellungen} bezahlten, noch nicht gepackten Bestellung(en), abzüglich Bestand. Beim Abhaken den bezahlten Gesamtbetrag eintragen – er fließt als Einstandspreis in den echten Gewinn.`}
      aktionen={<DruckKnopf />}
    >
      {liste.gruppen.length === 0 ? (
        <Block>
          <Leer>Nichts einzukaufen. Neue Bestellungen erscheinen hier automatisch.</Leer>
        </Block>
      ) : (
        <>
          <div className="klein mb-5 flex flex-wrap items-center justify-between gap-3">
            <p>
              Noch <strong className="zahl">{offen}</strong> Artikel offen · erwartete Kosten <strong className="zahl">{euro(liste.summeCent, { immerCent: true })}</strong>
            </p>
            {offen === 0 ? (
              <form action={AlleEingekauftKnopf} className="nicht-drucken">
                <button className={knopfKlein}>Alle neuen Bestellungen auf „Eingekauft“ setzen</button>
              </form>
            ) : null}
          </div>
          {liste.gruppen.map((g) => (
            <Block key={g.laden} titel={`${g.laden} · ${g.zeilen.filter((z) => z.kaufen > 0).length} offen`} rechts={<span className="klein zahl text-dunkel">{euro(g.summeCent, { immerCent: true })}</span>}>
              <ul className="divide-y divide-salbei/60">
                {g.zeilen.map((z) => {
                  const fertig = z.kaufen === 0;
                  return (
                    <li key={z.artikel.id} className={`py-3 first:pt-0 last:pb-0 ${fertig ? "text-dunkel" : ""}`}>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <p className={fertig ? "line-through decoration-salbei" : "font-semibold"}>
                          <span className="zahl mr-2 inline-block min-w-8 font-serif text-xl no-underline">{fertig ? "✓" : `${z.kaufen}×`}</span>
                          {z.artikel.marke} {z.artikel.name}, {z.artikel.groesse}
                        </p>
                        <p className="klein zahl whitespace-nowrap">
                          Bedarf {z.bedarf} · Bestand {z.bestand} · Katalog {euro(z.artikel.preisCent, { immerCent: true })}
                        </p>
                      </div>
                      <p className="klein mt-0.5 text-dunkel">
                        für {z.bestellungen.join(", ")}
                        {z.artikel.ersatz ? ` · Ersatz: ${z.artikel.ersatz}` : ""}
                        {" · "}
                        <Link href={`/admin/artikel/${z.artikel.id}`} className="textlink nicht-drucken">
                          Artikel
                        </Link>
                      </p>
                      {!fertig ? (
                        <Formular aktion={einkaufBuchen} className="nicht-drucken mt-2 flex flex-wrap items-end gap-2">
                          <input type="hidden" name="articleId" value={z.artikel.id} />
                          <div>
                            <label htmlFor={`m-${z.artikel.id}`} className="label mb-1 block text-dunkel">
                              Gekauft
                            </label>
                            <input id={`m-${z.artikel.id}`} name="menge" type="number" min={1} defaultValue={z.kaufen} inputMode="numeric" className={`${feldKlein} w-20`} />
                          </div>
                          <div>
                            <label htmlFor={`b-${z.artikel.id}`} className="label mb-1 block text-dunkel">
                              Bezahlt gesamt (€)
                            </label>
                            <input id={`b-${z.artikel.id}`} name="bezahlt" inputMode="decimal" defaultValue={(z.erwartetCent / 100).toFixed(2).replace(".", ",")} className={`${feldKlein} w-28`} />
                          </div>
                          <Absenden>Abhaken</Absenden>
                        </Formular>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Block>
          ))}
        </>
      )}
    </Seite>
  );
}
