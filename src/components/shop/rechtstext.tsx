import type { ReactNode } from "react";
import { PLATZHALTER } from "@/lib/einstellungen";
import { Brotkrumen } from "./brotkrumen";

/** Markiert Platzhalter sichtbar, damit vor dem Livegang nichts übersehen wird. */
export function Wert({ children }: { children: string }) {
  if (!children || children === PLATZHALTER) {
    return <mark className="bg-salbei px-1.5 py-0.5 font-semibold text-ink">vor Livegang ausfüllen</mark>;
  }
  return <>{children}</>;
}

export function Rechtstext({ titel, pfad, stand, entwurf, children }: { titel: string; pfad: string; stand: string; entwurf?: string; children: ReactNode }) {
  return (
    <div className="rand pb-24 pt-8 lg:pt-12">
      <Brotkrumen pfad={[[titel, pfad]]} />
      <h1 className="mt-8 !text-[clamp(2.2rem,1.6rem+2.8vw,3.75rem)] text-oliv">{titel}</h1>
      <p className="klein mt-3 text-dunkel">Stand: {stand}</p>
      {entwurf ? (
        <p className="mass mt-6 border border-dunkel p-4">
          <strong>Hinweis für den Inhaber (vor Livegang entfernen):</strong> {entwurf}
        </p>
      ) : null}
      <div className="mass mt-10 space-y-4 [&_a]:underline [&_a]:decoration-salbei [&_a]:underline-offset-4 [&_h2]:!mt-12 [&_h2]:!text-[1.75rem] [&_h2]:text-dunkel [&_h3]:!mt-6 [&_h3]:!font-sans [&_h3]:!text-[1.0625rem] [&_h3]:!font-semibold [&_li]:mt-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </div>
    </div>
  );
}
