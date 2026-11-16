import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/server/storage";

const TYPEN: Record<string, string> = { png: "image/png", jpg: "image/jpeg", pdf: "application/pdf", svg: "image/svg+xml", webp: "image/webp", avif: "image/avif" };

/**
 * Liefert lokal abgelegte Uploads aus (nur Entwicklung/Tests – in Produktion liegen Dateien in Vercel Blob).
 * SVG und PDF werden immer als Download ausgeliefert, nie im Seitenkontext gerendert.
 */
export async function GET(_: Request, { params }: RouteContext<"/api/datei/[name]">) {
  const { name } = await params;
  if (process.env.BLOB_READ_WRITE_TOKEN || !/^[A-Za-z0-9_-]{20,}-[a-z0-9.-]+$/.test(name)) return new Response("Nicht gefunden", { status: 404 });
  const endung = name.split(".").pop() ?? "";
  try {
    const inhalt = await readFile(path.join(UPLOAD_DIR, path.basename(name)));
    const bild = ["png", "jpg", "webp", "avif"].includes(endung);
    return new Response(new Uint8Array(inhalt), {
      headers: {
        "Content-Type": TYPEN[endung] ?? "application/octet-stream",
        "Content-Disposition": bild ? "inline" : `attachment; filename="${name.replace(/^[A-Za-z0-9_-]+?-/, "")}"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Nicht gefunden", { status: 404 });
  }
}
