import type { BildVarianten } from "../../db/schema";

export interface BildDaten {
  varianten: BildVarianten;
  breite: number;
  hoehe: number;
  blur: string;
  alt: string;
}

function srcset(v: Record<string, string>): string {
  return Object.entries(v)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([w, url]) => `${url} ${w}w`)
    .join(", ");
}

/**
 * Responsives Bild: AVIF mit WebP-Fallback, mehrere Breiten, Blur-Platzhalter als Hintergrund.
 * `prio` für das LCP-Bild (eager + fetchpriority=high), sonst lazy.
 */
export function Bild({ bild, sizes, className = "", prio = false, alt }: { bild: BildDaten; sizes: string; className?: string; prio?: boolean; alt?: string }) {
  const webp = Object.entries(bild.varianten.webp).sort((a, b) => Number(a[0]) - Number(b[0]));
  const fallback = webp[Math.min(1, webp.length - 1)]?.[1] ?? Object.values(bild.varianten.avif)[0];
  return (
    <picture>
      {Object.keys(bild.varianten.avif).length ? <source type="image/avif" srcSet={srcset(bild.varianten.avif)} sizes={sizes} /> : null}
      {webp.length ? <source type="image/webp" srcSet={srcset(bild.varianten.webp)} sizes={sizes} /> : null}
      <img
        src={fallback}
        alt={alt ?? bild.alt}
        width={bild.breite}
        height={bild.hoehe}
        loading={prio ? "eager" : "lazy"}
        fetchPriority={prio ? "high" : "auto"}
        decoding={prio ? "sync" : "async"}
        className={className}
        style={bild.blur ? { backgroundImage: `url(${bild.blur})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      />
    </picture>
  );
}
