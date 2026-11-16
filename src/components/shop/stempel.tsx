/** Runder Stempel „Von Hand gepackt in Schwetzingen“ – reine Linienzeichnung, erbt die Textfarbe. */
export function Stempel({ className = "", id = "stempel" }: { className?: string; id?: string }) {
  return (
    <svg viewBox="0 0 160 160" className={className} role="img" aria-label="Von Hand gepackt in Schwetzingen">
      <defs>
        <path id={`${id}-kreis`} d="M80 80 m-58 0 a58 58 0 1 1 116 0 a58 58 0 1 1 -116 0" />
      </defs>
      <circle cx="80" cy="80" r="76" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="80" cy="80" r="71.5" fill="none" stroke="currentColor" strokeWidth="0.6" />
      <circle cx="80" cy="80" r="43" fill="none" stroke="currentColor" strokeWidth="0.6" />
      <text fill="currentColor" fontSize="10.6" fontWeight="600" style={{ fontFamily: "var(--font-sans)" }}>
        <textPath href={`#${id}-kreis`} startOffset="0" textLength="358" lengthAdjust="spacing">
          VON HAND GEPACKT · IN SCHWETZINGEN ·
        </textPath>
      </text>
      {/* Kiste mit Band */}
      <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
        <path d="M58 72 80 62l22 10v24L80 106 58 96z" />
        <path d="M58 72 80 82l22-10M80 82v24" />
        <path d="M69 67l22 10v9" />
        <path d="M80 62c-3-6-9-7-10-3s5 5 10 3zM80 62c3-6 9-7 10-3s-5 5-10 3z" />
      </g>
    </svg>
  );
}
