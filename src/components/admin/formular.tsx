"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export type Ergebnis = { ok?: string; fehler?: string } | null;
export type Aktion = (vorher: Ergebnis, formData: FormData) => Promise<Ergebnis>;

export function Formular({ aktion, children, className, bestaetigen }: { aktion: Aktion; children: ReactNode; className?: string; bestaetigen?: string }) {
  const [ergebnis, action] = useActionState(aktion, null);
  return (
    <form
      action={action}
      className={className}
      onSubmit={
        bestaetigen
          ? (e) => {
              if (!window.confirm(bestaetigen)) e.preventDefault();
            }
          : undefined
      }
    >
      {children}
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
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className} name={name} value={value}>
      {pending ? "Speichert …" : children}
    </button>
  );
}
