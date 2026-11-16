import Link from "next/link";
import { PLATZHALTER, type Einstellungen } from "@/lib/einstellungen";
import { Stempel } from "./stempel";

export function Fuss({ kontakt, kollektionen }: { kontakt: Einstellungen["kontakt"]; kollektionen: { slug: string; name: string }[] }) {
  const mailOk = kontakt.email && kontakt.email !== PLATZHALTER;
  const telOk = kontakt.telefon && kontakt.telefon !== PLATZHALTER;
  return (
    <footer className="auf-dunkel bg-dunkel text-creme">
      <div className="rand raster gap-y-12 py-16 lg:py-20">
        <div className="col-span-12 lg:col-span-5">
          <p className="font-serif text-[2rem] leading-none tracking-[-0.02em]">
            Dankes<span className="italic">kiste</span>
          </p>
          <p className="mt-5 max-w-[34ch]">Geschenkboxen für Mitarbeiter und Kunden. Eingekauft, gepackt und verschickt in Schwetzingen.</p>
          <Stempel id="stempel-fuss" className="mt-8 h-28 w-28" />
        </div>
        <nav aria-label="Sortiment" className="col-span-6 lg:col-span-2">
          <p className="label mb-4">Sortiment</p>
          <ul className="klein space-y-2.5">
            <li><Link href="/boxen" className="no-underline hover:underline">Alle Boxen</Link></li>
            {kollektionen.map((k) => (
              <li key={k.slug}><Link href={`/kollektionen/${k.slug}`} className="no-underline hover:underline">{k.name}</Link></li>
            ))}
            <li><Link href="/bestellen" className="no-underline hover:underline">Bestellen</Link></li>
          </ul>
        </nav>
        <nav aria-label="Ratgeber" className="col-span-6 lg:col-span-3">
          <p className="label mb-4">Gut zu wissen</p>
          <ul className="klein space-y-2.5">
            <li><Link href="/weihnachtsgeschenke-mitarbeiter" className="no-underline hover:underline">Weihnachtsgeschenke für Mitarbeiter</Link></li>
            <li><Link href="/kundengeschenke" className="no-underline hover:underline">Kundengeschenke</Link></li>
            <li><Link href="/firmengeschenke-mit-logo" className="no-underline hover:underline">Firmengeschenke mit Logo</Link></li>
            <li><Link href="/onboarding-geschenk" className="no-underline hover:underline">Onboarding-Geschenk</Link></li>
            <li><Link href="/lieferung-schwetzingen-mannheim-heidelberg" className="no-underline hover:underline">Lieferung Rhein-Neckar</Link></li>
          </ul>
        </nav>
        <div className="col-span-12 lg:col-span-2">
          <p className="label mb-4">Kontakt</p>
          <address className="klein space-y-2.5 not-italic">
            <p>{kontakt.plzOrt}</p>
            {mailOk ? <p><a href={`mailto:${kontakt.email}`} className="no-underline hover:underline">{kontakt.email}</a></p> : null}
            {telOk ? <p><a href={`tel:${kontakt.telefon.replace(/[^\d+]/g, "")}`} className="no-underline hover:underline">{kontakt.telefon}</a></p> : null}
            <p><Link href="/#anfrage" className="underline decoration-salbei underline-offset-4">Angebot anfragen</Link></p>
          </address>
        </div>
      </div>
      <div className="border-t border-creme/25">
        <div className="rand klein flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-[70ch]">
            Angebot ausschließlich für Unternehmer im Sinne von §&nbsp;14 BGB. Gemäß §&nbsp;19 UStG wird keine Umsatzsteuer berechnet.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li><Link href="/impressum" className="no-underline hover:underline">Impressum</Link></li>
            <li><Link href="/datenschutz" className="no-underline hover:underline">Datenschutz</Link></li>
            <li><Link href="/agb" className="no-underline hover:underline">AGB</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
