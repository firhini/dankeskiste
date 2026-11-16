import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdsConversion, WarenkorbLeeren } from "@/components/shop/consent";
import { Stempel } from "@/components/shop/stempel";
import { euro } from "@/lib/geld";
import { bestaetigeSession } from "@/lib/server/bestellungen";

export const metadata: Metadata = { title: "Danke für Ihre Bestellung", robots: { index: false, follow: false } };

async function Bestaetigung({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const sessionId = typeof q.session_id === "string" ? q.session_id : "";
  const b = sessionId ? await bestaetigeSession(sessionId) : null;
  if (!b) {
    return (
      <>
        <h1 className="text-oliv">Danke für Ihren <em>Besuch</em></h1>
        <p className="lead mt-6 max-w-[44ch]">Zu diesem Link haben wir keine Bestellung gefunden. Wenn Sie gerade bezahlt haben, kommt die Bestätigung in wenigen Minuten per E-Mail.</p>
        <Link href="/" className="knopf mt-8">Zur Startseite</Link>
      </>
    );
  }
  const bezahlt = !["offen", "zahlung_ausstehend", "storniert"].includes(b.status);
  const mail = b.email.replace(/^(.).*(@.*)$/, "$1…$2");
  return (
    <>
      <p className="label text-dunkel">Bestellung <span className="zahl" data-testid="bestellnummer">{b.nummer}</span></p>
      <h1 className="mt-4 text-oliv">{bezahlt ? <>Danke – <em>wir legen los.</em></> : <>Danke – <em>fast geschafft.</em></>}</h1>
      <p className="lead mt-6 max-w-[46ch]">
        {bezahlt
          ? <>Ihre Zahlung über {euro(b.summeCent, { immerCent: true })} ist eingegangen. Die Bestätigung und die Rechnung sind unterwegs an {mail}.</>
          : <>Ihre Bestellung ist angelegt. Sobald die Zahlung bestätigt ist, bekommen Sie eine E-Mail an {mail} – bei SEPA-Lastschrift kann das einige Tage dauern.</>}
      </p>
      <ol className="mass mt-10 border-t border-salbei">
        {[
          ["Einkauf", "Wir kaufen frisch für Ihre Bestellung ein – nichts liegt monatelang im Lager."],
          ["Packen", "Jede Box wird einzeln gepackt, mit Ihrem Logo und Ihrer Karte."],
          [b.lieferart === "persoenlich" ? "Lieferung" : "Versand", b.lieferart === "persoenlich" ? "Wir bringen die Boxen am gewählten Tag persönlich vorbei." : "Sobald die Pakete bei DHL sind, bekommen Sie die Sendungsnummern per Mail."],
        ].map(([titel, text], i) => (
          <li key={titel} className="grid grid-cols-[auto_1fr] gap-x-6 border-b border-salbei py-5">
            <span className="font-serif text-[2.5rem] leading-none text-salbei" aria-hidden>0{i + 1}</span>
            <div><h2 className="!text-[1.375rem]">{titel}</h2><p className="mt-1">{text}</p></div>
          </li>
        ))}
      </ol>
      <p className="mt-8">Etwas vergessen oder falsch eingegeben? Antworten Sie einfach auf die Bestätigungsmail.</p>
      <Link href="/" className="textlink mt-6 inline-block">Zurück zur Startseite</Link>
      {bezahlt ? <><WarenkorbLeeren /><AdsConversion wertCent={b.summeCent} bestellnummer={b.nummer} /></> : null}
    </>
  );
}

export default function Danke({ searchParams }: PageProps<"/danke">) {
  return (
    <div className="rand raster pb-24 pt-12 lg:pt-20">
      <div className="col-span-12 lg:col-span-8">
        <Suspense fallback={<p className="lead">Einen Moment, wir prüfen Ihre Zahlung …</p>}>
          <Bestaetigung searchParams={searchParams} />
        </Suspense>
      </div>
      <div className="col-span-12 hidden lg:col-span-3 lg:col-start-10 lg:block">
        <Stempel id="stempel-danke" className="h-44 w-44 rotate-6 text-dunkel" />
      </div>
    </div>
  );
}
