import Link from "next/link";
import { absolut } from "@/lib/site";
import { JsonLd } from "./jsonld";

export function Brotkrumen({ pfad }: { pfad: [string, string][] }) {
  const alle: [string, string][] = [["Start", "/"], ...pfad];
  return (
    <>
      <nav aria-label="Brotkrumen" className="klein">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-dunkel">
          {alle.map(([name, href], i) => (
            <li key={href} className="flex items-center gap-2">
              {i > 0 ? <span aria-hidden className="text-salbei">/</span> : null}
              {i === alle.length - 1 ? <span aria-current="page">{name}</span> : <Link href={href} className="no-underline hover:underline">{name}</Link>}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        daten={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: alle.map(([name, href], i) => ({ "@type": "ListItem", position: i + 1, name, item: absolut(href) })),
        }}
      />
    </>
  );
}
