import { existsSync } from "node:fs";
import path from "node:path";
import { desc, gte, sql } from "drizzle-orm";
import { PLATZHALTER, type Einstellungen } from "@/lib/einstellungen";
import { speicherArt } from "@/lib/server/storage";
import { stripe } from "@/lib/server/stripe";
import { db, schema } from "../../../db";
import { Block } from "./ui";

type Zustand = "ok" | "offen" | "hinweis";
interface Zeile {
  name: string;
  zustand: Zustand;
  text: string;
}

const FELDNAME: Record<string, string> = { inhaber: "Name des Inhabers", strasse: "Straße", telefon: "Telefon", email: "E-Mail", steuernummer: "Steuernummer", plzOrt: "PLZ und Ort", firma: "Firmenname" };

const datum = (d: Date) => d.toLocaleString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

async function stripeZeile(): Promise<Zeile> {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key) return { name: "Stripe-Schlüssel", zustand: "offen", text: "STRIPE_SECRET_KEY fehlt – es kann niemand bezahlen." };
  const modus = key.startsWith("sk_live_") || key.startsWith("rk_live_") ? "Live-Modus" : "Testmodus";
  try {
    const konto = await Promise.race([
      stripe().accounts.retrieveCurrent(),
      new Promise<never>((_, ab) => setTimeout(() => ab(new Error("Zeitüberschreitung")), 4000)),
    ]);
    if (modus === "Live-Modus" && !konto.charges_enabled) {
      return { name: "Stripe-Schlüssel", zustand: "offen", text: "Live-Schlüssel ist gültig, aber Zahlungen sind bei Stripe noch nicht freigeschaltet (Konto vervollständigen)." };
    }
    return { name: "Stripe-Schlüssel", zustand: modus === "Live-Modus" ? "ok" : "hinweis", text: modus === "Live-Modus" ? "Live-Modus, Schlüssel ist gültig, Zahlungen sind freigeschaltet." : "Testmodus – der Schlüssel ist gültig, es fließt kein echtes Geld." };
  } catch (e) {
    const grund = e instanceof Error ? e.message.slice(0, 120) : "unbekannt";
    return { name: "Stripe-Schlüssel", zustand: "offen", text: `${modus}: Stripe hat den Schlüssel nicht bestätigt (${grund}).` };
  }
}

const vorTagen = (tage: number) => new Date(Date.now() - tage * 86_400_000);

export async function Systemstatus({ e }: { e: Einstellungen }) {
  const vor7Tagen = vorTagen(7);
  const [stripeInfo, [ereignis], [mail], [{ fehler }], [{ offen, gesamt }], speicher] = await Promise.all([
    stripeZeile(),
    db.select().from(schema.stripeEvents).orderBy(desc(schema.stripeEvents.verarbeitetAm)).limit(1),
    db.select().from(schema.mailLog).orderBy(desc(schema.mailLog.createdAt)).limit(1),
    db.select({ fehler: sql<number>`count(*) filter (where ${schema.mailLog.status} = 'fehler')::int` }).from(schema.mailLog).where(gte(schema.mailLog.createdAt, vor7Tagen)),
    db.select({ offen: sql<number>`count(*) filter (where ${schema.articles.status} <> 'belegt')::int`, gesamt: sql<number>`count(*)::int` }).from(schema.articles),
    speicherArt(),
  ]);

  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const fehlend = (Object.entries(e.kontakt) as [string, string][]).filter(([, wert]) => wert === PLATZHALTER).map(([name]) => FELDNAME[name] ?? name);
  const foto = Boolean(e.kontakt.fotoUrl) || existsSync(path.join(process.cwd(), "public/images/inhaber.jpg"));

  const zeilen: Zeile[] = [
    {
      name: "Adresse der Website",
      zustand: /^https:\/\//.test(url) && !/localhost|netlify\.app|vercel\.app/.test(url) ? "ok" : url ? "hinweis" : "offen",
      text: url ? `${url}${/netlify\.app|vercel\.app/.test(url) ? " – noch die Adresse des Hosters; nach dem Verbinden der Domain NEXT_PUBLIC_SITE_URL umstellen." : ""}` : "NEXT_PUBLIC_SITE_URL fehlt.",
    },
    stripeInfo,
    {
      name: "Stripe-Webhook",
      zustand: !process.env.STRIPE_WEBHOOK_SECRET ? "offen" : ereignis ? "ok" : "hinweis",
      text: !process.env.STRIPE_WEBHOOK_SECRET
        ? "STRIPE_WEBHOOK_SECRET fehlt – bezahlte Bestellungen würden nicht als bezahlt erkannt."
        : ereignis
          ? `Letztes Ereignis empfangen am ${datum(ereignis.verarbeitetAm)} (${ereignis.typ}).`
          : "Geheimnis ist gesetzt, aber es kam noch kein Ereignis an. Nach der ersten Testbestellung muss hier ein Datum stehen.",
    },
    {
      name: "E-Mail-Versand",
      zustand: !process.env.RESEND_API_KEY || !process.env.MAIL_FROM || !process.env.OWNER_EMAIL ? "offen" : fehler > 0 ? "offen" : mail ? "ok" : "hinweis",
      text: !process.env.RESEND_API_KEY
        ? "RESEND_API_KEY fehlt."
        : !process.env.MAIL_FROM || !process.env.OWNER_EMAIL
          ? "MAIL_FROM oder OWNER_EMAIL fehlt."
          : fehler > 0
            ? `${fehler} fehlgeschlagene Mail(s) in den letzten 7 Tagen – meist ist die Absender-Domain bei Resend noch nicht bestätigt.`
            : mail
              ? `Letzte Mail am ${datum(mail.createdAt)} („${mail.betreff.slice(0, 50)}“).`
              : "Eingerichtet, es wurde aber noch keine Mail verschickt.",
    },
    {
      name: "Speicher für Logos und Bilder",
      zustand: speicher === "fehlt" ? "offen" : "ok",
      text: speicher === "netlify" ? "Netlify Blobs (automatisch)." : speicher === "vercel" ? "Vercel Blob." : speicher === "lokal" ? "Lokaler Ordner (nur Entwicklung)." : "Kein Speicher verfügbar – Logo-Uploads schlagen fehl.",
    },
    {
      name: "Impressum und Kontakt",
      zustand: fehlend.length ? "offen" : "ok",
      text: fehlend.length ? `Noch nicht ausgefüllt: ${fehlend.join(", ")} (weiter unten unter „Kontakt und Impressum“).` : "Alle Angaben sind ausgefüllt.",
    },
    {
      name: "Foto „Wer packt Ihre Kiste?“",
      zustand: foto ? "ok" : "hinweis",
      text: foto ? "Vorhanden." : "Fehlt noch – der Abschnitt erscheint nur mit Text. Ein echtes Foto schafft Vertrauen (direkt hier darunter hochladen).",
    },
    {
      name: "Einkaufspreise",
      zustand: offen === 0 ? "ok" : "hinweis",
      text: offen === 0 ? `Alle ${gesamt} Artikelpreise sind belegt.` : `${offen} von ${gesamt} Artikelpreisen sind Richtwerte oder geschätzt – im Markt prüfen und unter „Artikel“ nachtragen.`,
    },
    {
      name: "Google Ads / Search Console",
      zustand: "hinweis",
      text: `${process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ? "Ads-Messung ist eingerichtet" : "Ads-Messung ist nicht eingerichtet"}; ${process.env.NEXT_PUBLIC_GSC_VERIFICATION ? "Search Console ist bestätigt." : "Search Console ist nicht bestätigt."} Beides ist freiwillig.`,
    },
  ];
  const offene = zeilen.filter((z) => z.zustand === "offen").length;

  return (
    <Block titel="Livegang-Check" rechts={<span className={`label ${offene ? "text-signal" : "text-dunkel"}`}>{offene ? `${offene} offen` : "nichts offen"}</span>}>
      <table className="klein w-full">
        <caption className="nur-sr">Was für den Livegang eingerichtet ist und was noch fehlt</caption>
        <tbody>
          {zeilen.map((z) => (
            <tr key={z.name} className="border-b border-salbei/60 align-top last:border-0">
              <th scope="row" className="w-[34%] py-2.5 pr-4 text-left font-semibold">{z.name}</th>
              <td className="w-[5.5rem] py-2.5 pr-3">
                <span className={`label inline-block whitespace-nowrap rounded-[2px] px-2 py-1 !text-[0.6875rem] ${z.zustand === "ok" ? "bg-salbei text-ink" : z.zustand === "offen" ? "bg-signal text-creme" : "border border-salbei text-dunkel"}`}>
                  {z.zustand === "ok" ? "fertig" : z.zustand === "offen" ? "offen" : "Hinweis"}
                </span>
              </td>
              <td className="py-2.5">{z.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="klein mt-3 text-dunkel">Schlüssel und Adressen werden beim Hoster als Umgebungsvariablen gesetzt, nicht im Code. Die Reihenfolge steht in LIVEGANG.md.</p>
    </Block>
  );
}
