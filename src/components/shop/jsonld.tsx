/** JSON-LD als Script-Tag; `<` wird maskiert, damit Inhalte das Tag nicht schließen können. */
export function JsonLd({ daten }: { daten: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(daten).replace(/</g, "\\u003c") }} />;
}
