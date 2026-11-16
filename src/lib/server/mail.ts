import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db, schema } from "../../../db";

export interface Mail {
  an: string;
  betreff: string;
  html: string;
  text: string;
  /** Kategorie fürs Protokoll, z. B. "bestellung-kunde" */
  art: string;
  orderId?: string | null;
  antwortAn?: string;
}

export const MAIL_OUTBOX = path.join(process.cwd(), ".mail-outbox");

/**
 * Versendet über Resend. Ohne RESEND_API_KEY (nur außerhalb von Produktion bzw. im E2E-Test)
 * wird die Mail als JSON-Datei in .mail-outbox/ abgelegt. Jede Mail wird protokolliert;
 * Fehler werfen nicht, damit z. B. der Stripe-Webhook nicht an einer Mail scheitert.
 */
export async function sendeMail(mail: Mail): Promise<{ ok: boolean; fehler?: string }> {
  const von = process.env.MAIL_FROM || "Dankeskiste <hallo@dankeskiste.test>";
  let status: "gesendet" | "lokal" | "fehler" = "fehler";
  let fehler: string | undefined;
  try {
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const antwort = await resend.emails.send({
        from: von,
        to: mail.an,
        subject: mail.betreff,
        html: mail.html,
        text: mail.text,
        ...(mail.antwortAn ? { replyTo: mail.antwortAn } : {}),
      });
      if (antwort.error) throw new Error(antwort.error.message);
      status = "gesendet";
    } else if (process.env.NODE_ENV !== "production" || process.env.MAIL_LOKAL === "1") {
      await mkdir(MAIL_OUTBOX, { recursive: true });
      const datei = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${mail.art}.json`;
      await writeFile(path.join(MAIL_OUTBOX, datei), JSON.stringify({ von, ...mail, zeit: new Date().toISOString() }, null, 2));
      status = "lokal";
    } else {
      throw new Error("RESEND_API_KEY fehlt – Mail wurde nicht versendet.");
    }
  } catch (e) {
    fehler = e instanceof Error ? e.message : String(e);
    console.error(`[mail] ${mail.art} an ${mail.an} fehlgeschlagen: ${fehler}`);
  }
  try {
    await db.insert(schema.mailLog).values({ an: mail.an, betreff: mail.betreff, art: mail.art, orderId: mail.orderId ?? null, status, fehler: fehler ?? null });
  } catch (e) {
    console.error("[mail] Protokoll fehlgeschlagen", e);
  }
  return { ok: status !== "fehler", fehler };
}
