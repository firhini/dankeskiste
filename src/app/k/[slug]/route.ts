import { and, eq, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { heuteBerlin } from "@/lib/calc/deadlines";
import { SITE_URL } from "@/lib/site";
import { db, schema } from "../../../../db";

const BOT = /bot|crawl|spider|preview|slurp|facebookexternalhit|whatsapp|telegram|linkedin|pinterest|monitor|curl|wget|python|headless|lighthouse/i;

/**
 * Kurzlink für Flyer und Visitenkarten: zählt den Scan (nur Tageszähler – keine IP,
 * kein User-Agent, kein Cookie) und leitet mit UTM-Parametern weiter.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/k/[slug]">) {
  const { slug } = await params;
  const sauber = slug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
  const [k] = sauber ? await db.select().from(schema.campaigns).where(and(eq(schema.campaigns.slug, sauber), eq(schema.campaigns.aktiv, true))) : [];
  const ziel = new URL(k?.ziel ?? "/", SITE_URL);
  if (k) {
    ziel.searchParams.set("utm_source", k.kanal);
    ziel.searchParams.set("utm_medium", "offline");
    ziel.searchParams.set("utm_campaign", k.slug);
    const ua = request.headers.get("user-agent") ?? "";
    const vorabruf = request.headers.get("purpose") === "prefetch" || request.headers.get("sec-purpose")?.includes("prefetch");
    if (!BOT.test(ua) && !vorabruf) {
      await db
        .insert(schema.campaignScans)
        .values({ campaignId: k.id, tag: heuteBerlin(), anzahl: 1 })
        .onConflictDoUpdate({ target: [schema.campaignScans.campaignId, schema.campaignScans.tag], set: { anzahl: sql`${schema.campaignScans.anzahl} + 1` } })
        .catch(() => {});
    }
  }
  return new Response(null, { status: 302, headers: { Location: ziel.toString(), "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
