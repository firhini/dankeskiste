"use client";

import { createContext, useActionState, useContext, useEffect, useRef, useTransition, type ReactNode } from "react";

export type Ergebnis = { ok?: string; fehler?: string } | null;
export type Aktion = (vorher: Ergebnis, formData: FormData) => Promise<Ergebnis>;

const Laeuft = createContext(false);

/**
 * Formular für Server Actions. Die Aktion wird bewusst von Hand ausgelöst (nicht über das
 * `action`-Attribut): So bleiben die Eingaben nach einer Fehlermeldung stehen. Mit `leeren`
 * wird das Formular nach Erfolg zurückgesetzt (für „Neu anlegen“-Formulare).
 */
export function Formular({ aktion, children, className, bestaetigen, leeren }: { aktion: Aktion; children: ReactNode; className?: string; bestaetigen?: string; leeren?: boolean }) {
  const [ergebnis, action] = useActionState(aktion, null);
  const [laeuft, starte] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (leeren && ergebnis?.ok) ref.current?.reset();
  }, [ergebnis, leeren]);
  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (laeuft) return;
        if (bestaetigen && !window.confirm(bestaetigen)) return;
        const daten = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        starte(() => action(daten));
      }}
    >
      <Laeuft value={laeuft}>{children}</Laeuft>
      {ergebnis?.fehler ? (
        <p role="alert" className="klein mt-2 basis-full border-l-2 border-signal pl-2 font-semibold text-signal">
          {ergebnis.fehler}
        </p>
      ) : null}
      {ergebnis?.ok ? (
        <p role="status" className="klein mt-2 basis-full border-l-2 border-dunkel pl-2 text-dunkel">
          {ergebnis.ok}
        </p>
      ) : null}
    </form>
  );
}

export function Absenden({ children, className = "knopf !min-h-10 !px-3.5 !py-2 !text-[0.9375rem]", name, value }: { children: ReactNode; className?: string; name?: string; value?: string }) {
  const laeuft = useContext(Laeuft);
  return (
    <button type="submit" disabled={laeuft} aria-busy={laeuft} className={className} name={name} value={value}>
      {laeuft ? "Speichert …" : children}
    </button>
  );
}
