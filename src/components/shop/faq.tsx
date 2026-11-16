import type { ReactNode } from "react";
import { JsonLd } from "./jsonld";
import { Plus } from "./zeichen";

export interface Frage {
  frage: string;
  /** Klartext für strukturierte Daten */
  text: string;
  /** Optional reichere Darstellung */
  antwort?: ReactNode;
}

export function Faq({ fragen, mitDaten = true }: { fragen: Frage[]; mitDaten?: boolean }) {
  return (
    <>
      <div className="border-t border-salbei">
        {fragen.map((f) => (
          <details key={f.frage} className="group border-b border-salbei">
            <summary className="flex items-start justify-between gap-6 py-5">
              <h3 className="!font-sans !text-[1.0625rem] !font-semibold !leading-snug !tracking-normal">{f.frage}</h3>
              <Plus className="mt-1 h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-45" />
            </summary>
            <div className="mass pb-6 pr-10">{f.antwort ?? <p>{f.text}</p>}</div>
          </details>
        ))}
      </div>
      {mitDaten ? (
        <JsonLd
          daten={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: fragen.map((f) => ({ "@type": "Question", name: f.frage, acceptedAnswer: { "@type": "Answer", text: f.text } })),
          }}
        />
      ) : null}
    </>
  );
}
