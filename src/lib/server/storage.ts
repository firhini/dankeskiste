import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const UPLOAD_DIR = path.join(process.cwd(), ".uploads");

/**
 * Speichert eine Datei unter einer nicht erratbaren URL.
 * Produktion: Vercel Blob (öffentliche URL mit zufälligem Suffix).
 * Lokal ohne BLOB_READ_WRITE_TOKEN: .uploads/ + Auslieferung über /api/datei/[name].
 */
export async function speichereDatei(ordner: string, dateiname: string, inhalt: Buffer, contentType: string): Promise<string> {
  const sauber = dateiname.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(-60) || "datei";
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`${ordner}/${sauber}`, inhalt, { access: "public", addRandomSuffix: true, contentType });
    return blob.url;
  }
  if (process.env.NODE_ENV === "production" && process.env.UPLOAD_LOKAL !== "1") {
    throw new Error("BLOB_READ_WRITE_TOKEN fehlt – Uploads sind nicht konfiguriert.");
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomBytes(18).toString("base64url")}-${sauber}`;
  await writeFile(path.join(UPLOAD_DIR, name), inhalt);
  return `/api/datei/${name}`;
}

const SIGNATUREN: { typ: string; endung: string; pruefe: (b: Buffer) => boolean }[] = [
  { typ: "image/png", endung: "png", pruefe: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { typ: "image/jpeg", endung: "jpg", pruefe: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { typ: "application/pdf", endung: "pdf", pruefe: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
  { typ: "image/webp", endung: "webp", pruefe: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" },
  {
    typ: "image/svg+xml",
    endung: "svg",
    pruefe: (b) => {
      const kopf = b.subarray(0, 2048).toString("utf8").replace(/^﻿/, "").trimStart().toLowerCase();
      return (kopf.startsWith("<?xml") || kopf.startsWith("<svg") || kopf.startsWith("<!--") || kopf.startsWith("<!doctype svg")) && kopf.includes("<svg");
    },
  },
];

/** Erkennt den Dateityp am Inhalt (nicht an Name oder Content-Type des Clients). */
export function erkenneTyp(inhalt: Buffer, erlaubt: string[]): { typ: string; endung: string } | null {
  const treffer = SIGNATUREN.find((s) => erlaubt.includes(s.typ) && s.pruefe(inhalt));
  return treffer ? { typ: treffer.typ, endung: treffer.endung } : null;
}

/** SVG kann Skripte enthalten – solche Dateien werden abgelehnt (das Logo wird im Admin nur heruntergeladen, nie eingebettet). */
export function svgIstUnbedenklich(inhalt: Buffer): boolean {
  const text = inhalt.toString("utf8").toLowerCase();
  return !/<script|javascript:|\son\w+\s*=|<foreignobject|<iframe|<embed|<object/.test(text);
}
