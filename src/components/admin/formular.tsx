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

/**
 * Dateifeld für Fotos. Große Handyfotos werden vor dem Hochladen im Browser auf höchstens
 * 2400 px Kantenlänge verkleinert – sonst scheitert der Upload an der Größengrenze des Hosters.
 */
export function FotoEingabe({ id, name = "datei", required = true }: { id: string; name?: string; required?: boolean }) {
  return (
    <input
      id={id}
      name={name}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      required={required}
      className="klein w-full"
      onChange={async (ev) => {
        const feld = ev.currentTarget;
        const datei = feld.files?.[0];
        if (!datei || datei.size < 1_500_000) return;
        try {
          const bild = await createImageBitmap(datei, { imageOrientation: "from-image" });
          const faktor = Math.min(1, 2400 / Math.max(bild.width, bild.height));
          const flaeche = document.createElement("canvas");
          flaeche.width = Math.round(bild.width * faktor);
          flaeche.height = Math.round(bild.height * faktor);
          flaeche.getContext("2d")?.drawImage(bild, 0, 0, flaeche.width, flaeche.height);
          const klein = await new Promise<Blob | null>((fertig) => flaeche.toBlob(fertig, "image/jpeg", 0.86));
          if (!klein || klein.size >= datei.size) return;
          const ersatz = new DataTransfer();
          ersatz.items.add(new File([klein], datei.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }));
          feld.files = ersatz.files;
        } catch {
          // Verkleinern nicht möglich – die Datei geht unverändert hoch, der Server prüft die Größe.
        }
      }}
    />
  );
}
