import Link from "next/link";

export function Kopf({ kollektionen }: { kollektionen: { slug: string; name: string }[] }) {
  const punkte: [string, string][] = [["/boxen", "Alle Boxen"], ...kollektionen.slice(0, 3).map((k) => [`/kollektionen/${k.slug}`, k.name] as [string, string]), ["/firmengeschenke-mit-logo", "Mit Logo"], ["/#lieferung", "Lieferung"]];
  return (
    <header className="nicht-drucken sticky top-0 z-30 border-b border-salbei bg-creme">
      <div className="rand flex h-16 items-center justify-between gap-4">
        <Link href="/" className="font-serif text-[1.6rem] leading-none tracking-[-0.02em] text-dunkel no-underline" aria-label="Dankeskiste – zur Startseite">
          Dankes<span className="italic">kiste</span>
        </Link>
        <nav aria-label="Hauptnavigation" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {punkte.map(([href, name]) => (
              <li key={href}>
                <Link href={href} className="klein text-ink no-underline decoration-salbei decoration-1 underline-offset-[6px] hover:underline">
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/bestellen" className="knopf !min-h-11 !px-4 !py-2 !text-[0.9375rem]">
            Bestellen
          </Link>
          <details className="group relative lg:hidden">
            <summary className="flex h-11 w-11 items-center justify-center rounded-[2px] border border-salbei" aria-label="Menü">
              <svg viewBox="0 0 20 20" className="h-5 w-5 group-open:hidden" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
                <path d="M3 6h14M3 10h14M3 14h14" />
              </svg>
              <svg viewBox="0 0 20 20" className="hidden h-5 w-5 group-open:block" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
                <path d="m5 5 10 10M15 5 5 15" />
              </svg>
            </summary>
            <nav aria-label="Menü" className="absolute right-0 top-[3.4rem] w-[min(18rem,calc(100vw-2.5rem))] border border-salbei bg-creme">
              <ul>
                {punkte.map(([href, name]) => (
                  <li key={href} className="border-b border-salbei last:border-0">
                    <Link href={href} className="block px-4 py-3.5 no-underline">
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
