import { readFile } from "node:fs/promises";
import path from "node:path";
import { netlifySpeicher, UPLOAD_DIR } from "@/lib/server/storage";

const TYPEN: Record<string, string> = { png: "image/png", jpg: "image/jpeg", pdf: "application/pdf", svg: "image/svg+xml", webp: "image/webp", avif: "image/avif" };

/**
 * Liefert Uploads aus: auf Netlify aus Netlify Blobs, lokal aus .uploads/ (mit Vercel Blob haben Dateien eigene URLs).
 * SVG und PDF werden immer als Download ausgeliefert, nie im Seitenkontext gerendert.
 */
export async function GET(_: Request, { params }: RouteContext<"/api/datei/[name]">) {
  const { name } = await params;
  if (process.env.BLOB_READ_WRITE_TOKEN || !/^[A-Za-z0-9_-]{20,}-[a-z0-9.-]+$/.test(name)) return new Response("Nicht gefunden", { status: 404 });
  const endung = name.split(".").pop() ?? "";
  try {
    const netlify = await netlifySpeicher();
    const ausBlob = netlify ? await netlify.get(path.basename(name), { type: "arrayBuffer" }) : null;
    if (netlify && !ausBlob) return new Response("Nicht gefunden", { status: 404 });
    const inhalt = ausBlob ? new Uint8Array(ausBlob) : await readFile(path.join(UPLOAD_DIR, path.basename(name)));
    const bild = ["png", "jpg", "webp", "avif"].includes(endung);
    // AVIF/WebP entstehen nur als Varianten der Produktbilder: öffentlich und unveränderlich.
    const produktbild = endung === "avif" || endung === "webp";
    return new Response(new Uint8Array(inhalt), {
      headers: {
        "Content-Type": TYPEN[endung] ?? "application/octet-stream",
        "Content-Disposition": bild ? "inline" : `attachment; filename="${name.replace(/^[A-Za-z0-9_-]+?-/, "")}"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cache-Control": produktbild ? "public, max-age=31536000, immutable" : "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Nicht gefunden", { status: 404 });
  }
}
