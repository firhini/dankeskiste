import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { adminOder401 } from "@/auth";
import { SITE_URL } from "@/lib/site";
import { db, schema } from "../../../../../../../db";

/** Druckfertiger QR-Code in den Markenfarben (dunkles Oliv auf Creme), als SVG oder PNG (1.600 px). */
export async function GET(request: NextRequest, { params }: RouteContext<"/admin/kampagnen/[id]/qr">) {
  const admin = await adminOder401();
  if (admin instanceof Response) return admin;
  const { id } = await params;
  const [k] = await db.select().from(schema.campaigns).where(eq(schema.campaigns.id, Number(id) || 0));
  if (!k) return new Response("Nicht gefunden", { status: 404 });
  const url = `${SITE_URL}/k/${k.slug}`;
  const format = request.nextUrl.searchParams.get("format") === "png" ? "png" : "svg";
  const hell = request.nextUrl.searchParams.get("grund") === "weiss" ? "#ffffff" : "#ebebd8";
  const optionen = { errorCorrectionLevel: "Q" as const, margin: 3, color: { dark: "#455230", light: hell } };
  const laden = request.nextUrl.searchParams.has("download") ? `attachment; filename="qr-${k.slug}.${format}"` : "inline";
  if (format === "png") {
    const png = await QRCode.toBuffer(url, { ...optionen, type: "png", width: 1600 });
    return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Content-Disposition": laden, "Cache-Control": "private, no-store" } });
  }
  const svg = await QRCode.toString(url, { ...optionen, type: "svg" });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Content-Disposition": laden, "Cache-Control": "private, no-store" } });
}
