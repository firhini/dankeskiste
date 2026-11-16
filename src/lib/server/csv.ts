import "server-only";

/** CSV für Excel/DATEV-Import: Semikolon, deutsches Dezimalkomma, UTF-8 mit BOM. */
export function alsCsv(kopf: string[], zeilen: (string | number | null | undefined)[][]): string {
  const feld = (v: string | number | null | undefined) => {
    let s = v == null ? "" : String(v);
    // Formel-Injektion in Tabellenprogrammen verhindern
    if (/^[=+\-@\t\r]/.test(s) && typeof v === "string") s = `'${s}`;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [kopf, ...zeilen].map((z) => z.map(feld).join(";")).join("\r\n") + "\r\n";
}

export const centText = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));

export function csvAntwort(name: string, inhalt: string): Response {
  return new Response(inhalt, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" } });
}
