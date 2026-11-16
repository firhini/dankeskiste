import { rateLimit, zuVieleAnfragen } from "@/lib/server/ratelimit";
import { erkenneTyp, speichereDatei, svgIstUnbedenklich } from "@/lib/server/storage";

const MAX = 5 * 1024 * 1024;
const ERLAUBT = ["image/png", "image/jpeg", "image/svg+xml", "application/pdf"];

/** Logo-Upload: Typ wird am Dateiinhalt geprüft, Größe begrenzt, Ablage unter nicht erratbarer URL. */
export async function POST(request: Request) {
  const limit = await rateLimit("upload", 15, 600);
  if (!limit.ok) return zuVieleAnfragen();
  const laenge = Number(request.headers.get("content-length") ?? 0);
  if (laenge > MAX + 64 * 1024) return Response.json({ fehler: "Die Datei ist größer als 5 MB." }, { status: 413 });
  let datei: FormDataEntryValue | null;
  try {
    datei = (await request.formData()).get("datei");
  } catch {
    return Response.json({ fehler: "Der Upload war nicht lesbar." }, { status: 400 });
  }
  if (!(datei instanceof File) || datei.size === 0) return Response.json({ fehler: "Bitte wählen Sie eine Datei aus." }, { status: 400 });
  if (datei.size > MAX) return Response.json({ fehler: "Die Datei ist größer als 5 MB. Bitte laden Sie eine kleinere Version hoch." }, { status: 413 });
  const inhalt = Buffer.from(await datei.arrayBuffer());
  const typ = erkenneTyp(inhalt, ERLAUBT);
  if (!typ) return Response.json({ fehler: "Dieses Format können wir nicht verwenden. Bitte laden Sie PNG, JPG, SVG oder PDF hoch." }, { status: 415 });
  if (typ.typ === "image/svg+xml" && !svgIstUnbedenklich(inhalt)) {
    return Response.json({ fehler: "Diese SVG-Datei enthält Skripte oder eingebettete Inhalte. Bitte exportieren Sie das Logo als reines SVG, PNG oder PDF." }, { status: 415 });
  }
  const basis = datei.name.replace(/\.[^.]+$/, "").slice(0, 60) || "logo";
  try {
    const url = await speichereDatei("logos", `${basis}.${typ.endung}`, inhalt, typ.typ);
    return Response.json({ url, name: datei.name.slice(0, 120) });
  } catch (e) {
    console.error("[upload]", e);
    return Response.json({ fehler: "Der Upload ist gerade nicht möglich. Sie können das Logo auch nach der Bestellung per Mail schicken." }, { status: 503 });
  }
}
