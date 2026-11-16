import Link from "next/link";

export default function NichtGefunden() {
  return (
    <main className="rand flex min-h-[70dvh] flex-col justify-center py-20">
      <p className="label text-dunkel">Fehler 404</p>
      <h1 className="mt-4 max-w-[14ch] text-oliv">Diese Seite gibt es <em>nicht mehr.</em></h1>
      <p className="lead mt-6 max-w-[44ch]">Vielleicht war es eine Box aus einer vergangenen Saison. Alle aktuellen Kisten finden Sie in der Übersicht.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/boxen" className="knopf">Alle Boxen ansehen</Link>
        <Link href="/" className="knopf knopf-hell">Zur Startseite</Link>
      </div>
    </main>
  );
}
