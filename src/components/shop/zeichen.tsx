/** Eigene feine Linien-Icons (1,4 px), nur wo sie Orientierung geben. */
const basis = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function Pfeil({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden {...basis}>
      <path d="M3 10h13M11.5 5.5 16 10l-4.5 4.5" />
    </svg>
  );
}
export function Haken({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden {...basis}>
      <path d="m4 10.5 4 4 8-9" />
    </svg>
  );
}
export function Plus({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden {...basis}>
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}
export function Minus({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden {...basis}>
      <path d="M4 10h12" />
    </svg>
  );
}
