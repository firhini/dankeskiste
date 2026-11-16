import type { Metadata } from "next";
import { Suspense } from "react";
import { anmelden } from "../aktionen-login";

export const metadata: Metadata = { title: "Anmelden", robots: { index: false, follow: false } };

async function Hinweis({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  if (q.gesendet) {
    return (
      <p role="status" className="klein mb-6 border-l-2 border-dunkel pl-3">
        Wenn diese Adresse berechtigt ist, ist der Anmeldelink jetzt unterwegs. Er gilt 15&nbsp;Minuten.
      </p>
    );
  }
  if (q.error) {
    return (
      <p role="alert" className="klein mb-6 border-l-2 border-ink pl-3 font-semibold">
        Der Link ist abgelaufen oder wurde schon benutzt. Bitte fordern Sie einen neuen an.
      </p>
    );
  }
  if (q.limit) {
    return (
      <p role="alert" className="klein mb-6 border-l-2 border-ink pl-3 font-semibold">
        Zu viele Versuche. Bitte warten Sie ein paar Minuten.
      </p>
    );
  }
  return null;
}

export default function Login({ searchParams }: PageProps<"/admin/login">) {
  return (
    <main className="rand flex min-h-dvh items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <p className="font-serif text-2xl text-dunkel">Dankeskiste</p>
        <h1 className="mb-6 mt-2 !text-[2.25rem]">Anmelden</h1>
        <Suspense>
          <Hinweis searchParams={searchParams} />
        </Suspense>
        <form action={anmelden}>
          <label htmlFor="email" className="feldname">
            E-Mail-Adresse
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" className="feld" />
          <button type="submit" className="knopf mt-4 w-full">
            Anmeldelink schicken
          </button>
        </form>
        <p className="klein mt-6 text-dunkel">Sie bekommen einen Link per Mail. Ein Passwort gibt es nicht.</p>
      </div>
    </main>
  );
}
