import "server-only";
import type { schema } from "../../../db";
import { datumLang } from "../calc/deadlines";
import { euro, euroMinus } from "../geld";
import { RECHNUNG_FUSS } from "./stripe";
import { SITE_URL } from "../site";

type Bestellung = typeof schema.orders.$inferSelect;
type Position = typeof schema.orderItems.$inferSelect;
type EmpfaengerZeile = typeof schema.orderRecipients.$inferSelect;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function rahmen(titel: string, inhalt: string): string {
  return `<!doctype html><html lang="de"><body style="margin:0;background:#ebebd8;color:#1f2416;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
<tr><td style="padding:0 0 18px;border-bottom:1px solid #9ba685;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#455230">Dankeskiste</td></tr>
<tr><td style="padding:26px 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;color:#455230">${titel}</td></tr>
<tr><td style="padding:8px 0 28px">${inhalt}</td></tr>
<tr><td style="padding:16px 0 0;border-top:1px solid #9ba685;font-size:13px;color:#455230">Dankeskiste · von Hand gepackt in Schwetzingen · Angebot ausschließlich für Unternehmer (§ 14 BGB) · ${RECHNUNG_FUSS}</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (t: string) => `<p style="margin:0 0 14px">${t}</p>`;
const knopf = (url: string, text: string) =>
  `<p style="margin:20px 0"><a href="${esc(url)}" style="display:inline-block;background:#455230;color:#ebebd8;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:2px">${esc(text)}</a></p>`;

export function anmeldeMail(url: string) {
  return {
    betreff: "Ihr Anmeldelink für Dankeskiste",
    html: rahmen("Anmelden", p("Mit diesem Link melden Sie sich im Admin an. Er gilt 15 Minuten und nur einmal.") + knopf(url, "Jetzt anmelden") + p("Falls Sie den Link nicht angefordert haben, können Sie diese Mail ignorieren.")),
    text: `Anmeldelink für Dankeskiste (15 Minuten gültig):\n${url}\n`,
  };
}

const LIEFERART_TEXT = { versand: "DHL-Versand an eine Adresse", mehrfach: "DHL-Versand an mehrere Empfänger", persoenlich: "Persönliche Lieferung" } as const;

function terminText(b: Bestellung, lieferungBis: string | null): string {
  if (b.lieferart === "persoenlich") return /^\d{4}-/.test(b.termin) ? `Wunschtermin: ${datumLang(b.termin, true)}` : "Termin nach Absprache";
  if (b.termin === "saison" && lieferungBis) return `Zustellung bis ${datumLang(lieferungBis, true)}`;
  return "Versand so bald wie möglich";
}

function positionenHtml(b: Bestellung, positionen: Position[]): string {
  const zeile = (links: string, rechts: string, fett = false) =>
    `<tr><td style="padding:6px 0;border-bottom:1px solid #d5d9c2${fett ? ";font-weight:bold" : ""}">${links}</td><td align="right" style="padding:6px 0;border-bottom:1px solid #d5d9c2;white-space:nowrap${fett ? ";font-weight:bold" : ""}">${rechts}</td></tr>`;
  let html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px">`;
  for (const pos of positionen) html += zeile(`${pos.menge} × ${esc(pos.boxName)} <span style="color:#455230">(je ${euro(pos.stueckpreisCent)})</span>`, euro(pos.stueckpreisCent * pos.menge));
  if (b.staffelRabattCent > 0) html += zeile(`darin Mengenrabatt ${String(b.staffelProzent).replace(".", ",")} %`, euroMinus(b.staffelRabattCent));
  if (b.personalisierungCent > 0) html += zeile("Personalisierung", euro(b.personalisierungCent));
  if (b.rabattCodeCent > 0) html += zeile(`Rabattcode ${esc(b.rabattCode ?? "")}`, euroMinus(b.rabattCodeCent));
  html += zeile(LIEFERART_TEXT[b.lieferart], b.versandCent === 0 ? "kostenlos" : euro(b.versandCent));
  html += zeile("Gesamt", euro(b.bezahltCent ?? b.summeCent), true);
  return html + `</table>`;
}

export function bestellMailKunde(b: Bestellung, positionen: Position[], lieferungBis: string | null) {
  const rechnung = b.stripeRechnungUrl ? p(`Ihre Rechnung: <a href="${esc(b.stripeRechnungUrl)}" style="color:#455230">online ansehen und als PDF laden</a>. Sie kommt zusätzlich in einer eigenen Mail von unserem Zahlungsdienst Stripe.`) : p("Ihre Rechnung erhalten Sie in einer eigenen Mail von unserem Zahlungsdienst Stripe.");
  const inhalt =
    p(`Guten Tag ${esc(b.ansprechpartner)},`) +
    p(`vielen Dank für Ihre Bestellung <strong>${esc(b.nummer)}</strong>. Die Zahlung ist eingegangen; wir kaufen jetzt ein und packen Ihre Kisten von Hand.`) +
    positionenHtml(b, positionen) +
    p(`<strong>Lieferung:</strong> ${LIEFERART_TEXT[b.lieferart]} · ${terminText(b, lieferungBis)}`) +
    (b.ohneAlkohol ? p("Alle Boxen werden ohne Alkohol gepackt.") : "") +
    rechnung +
    p("Wenn sich etwas ändert oder Sie Fragen haben, antworten Sie einfach auf diese Mail.") +
    p("Herzliche Grüße aus Schwetzingen<br>Ihre Dankeskiste");
  return {
    betreff: `Ihre Bestellung ${b.nummer} bei Dankeskiste`,
    html: rahmen("Danke für Ihre Bestellung", inhalt),
    text: `Guten Tag ${b.ansprechpartner},\n\nvielen Dank für Ihre Bestellung ${b.nummer}.\n\n${positionen.map((x) => `${x.menge} x ${x.boxName}: ${euro(x.stueckpreisCent * x.menge)}`).join("\n")}\nGesamt: ${euro(b.bezahltCent ?? b.summeCent)}\n\nLieferung: ${LIEFERART_TEXT[b.lieferart]} – ${terminText(b, lieferungBis)}\n${b.stripeRechnungUrl ? `Rechnung: ${b.stripeRechnungUrl}\n` : ""}\n${RECHNUNG_FUSS}\n\nHerzliche Grüße aus Schwetzingen\nIhre Dankeskiste\n`,
  };
}

export function bestellMailInhaber(b: Bestellung, positionen: Position[]) {
  const link = `${SITE_URL}/admin/bestellungen/${b.id}`;
  const inhalt =
    p(`<strong>${esc(b.firma)}</strong> · ${esc(b.ansprechpartner)} · ${esc(b.email)}${b.telefon ? ` · ${esc(b.telefon)}` : ""}`) +
    positionenHtml(b, positionen) +
    p(`${LIEFERART_TEXT[b.lieferart]} · ${b.termin}${b.ohneAlkohol ? " · ohne Alkohol" : ""}`) +
    (b.kundenNotiz ? p(`Notiz: ${esc(b.kundenNotiz)}`) : "") +
    knopf(link, "Bestellung öffnen");
  return {
    betreff: `Neue Bestellung ${b.nummer}: ${positionen.reduce((s, x) => s + x.menge, 0)} Boxen, ${euro(b.bezahltCent ?? b.summeCent)}`,
    html: rahmen(`Neue Bestellung ${esc(b.nummer)}`, inhalt),
    text: `Neue Bestellung ${b.nummer} von ${b.firma} (${b.email}), ${euro(b.bezahltCent ?? b.summeCent)}.\n${link}\n`,
  };
}

export function dhlLink(nummer: string): string {
  return `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${encodeURIComponent(nummer)}`;
}

export function versandMail(b: Bestellung, sendungen: { nummer: string; empfaenger?: string }[]) {
  const persoenlich = b.lieferart === "persoenlich";
  const liste = sendungen.length
    ? `<ul style="margin:0 0 14px;padding-left:20px">${sendungen.map((s) => `<li style="margin:0 0 6px">${s.empfaenger ? `${esc(s.empfaenger)}: ` : ""}<a href="${esc(dhlLink(s.nummer))}" style="color:#455230">${esc(s.nummer)}</a></li>`).join("")}</ul>`
    : "";
  const inhalt = persoenlich
    ? p(`Guten Tag ${esc(b.ansprechpartner)},`) + p(`Ihre Bestellung <strong>${esc(b.nummer)}</strong> wurde heute persönlich zugestellt. Wir hoffen, die Kisten kommen gut an.`) + p("Herzliche Grüße aus Schwetzingen<br>Ihre Dankeskiste")
    : p(`Guten Tag ${esc(b.ansprechpartner)},`) +
      p(`Ihre Bestellung <strong>${esc(b.nummer)}</strong> ist gepackt und an DHL übergeben. ${sendungen.length > 1 ? "Die Sendungen können Sie hier verfolgen:" : "Die Sendung können Sie hier verfolgen:"}`) +
      liste +
      p("Die Zustellung dauert in der Regel ein bis zwei Werktage. Sollte ein Paket beschädigt ankommen, schicken Sie uns bitte ein Foto – wir kümmern uns.") +
      p("Herzliche Grüße aus Schwetzingen<br>Ihre Dankeskiste");
  return {
    betreff: persoenlich ? `Ihre Bestellung ${b.nummer} wurde geliefert` : `Ihre Bestellung ${b.nummer} ist unterwegs`,
    html: rahmen(persoenlich ? "Ihre Kisten sind da" : "Ihre Kisten sind unterwegs", inhalt),
    text: persoenlich
      ? `Ihre Bestellung ${b.nummer} wurde heute persönlich zugestellt.\n`
      : `Ihre Bestellung ${b.nummer} ist unterwegs.\n${sendungen.map((s) => `${s.empfaenger ? s.empfaenger + ": " : ""}${s.nummer} – ${dhlLink(s.nummer)}`).join("\n")}\n`,
  };
}

export function anfrageMailInhaber(a: { art: string; firma: string; name: string; email: string; telefon: string; menge: string; nachricht: string }) {
  const inhalt =
    p(`<strong>${esc(a.firma)}</strong> · ${esc(a.name)} · ${esc(a.email)}${a.telefon ? ` · ${esc(a.telefon)}` : ""}`) +
    p(`Art: ${a.art === "musterbox" ? "Musterbox" : "Angebot"}${a.menge ? ` · Menge: ${esc(a.menge)}` : ""}`) +
    (a.nachricht ? p(esc(a.nachricht).replace(/\n/g, "<br>")) : "") +
    knopf(`${SITE_URL}/admin/anfragen`, "Anfragen öffnen");
  return {
    betreff: `Neue Anfrage von ${a.firma}`,
    html: rahmen("Neue Anfrage", inhalt),
    text: `Neue Anfrage (${a.art}) von ${a.firma}, ${a.name}, ${a.email} ${a.telefon}\nMenge: ${a.menge}\n\n${a.nachricht}\n`,
  };
}

export function anfrageMailKunde(a: { name: string; art: string }) {
  const inhalt =
    p(`Guten Tag ${esc(a.name)},`) +
    p(a.art === "musterbox" ? "Ihre Anfrage für eine Musterbox ist angekommen." : "Ihre Anfrage ist angekommen.") +
    p("Ich melde mich innerhalb eines Werktags persönlich bei Ihnen – per Mail oder, wenn Sie eine Nummer angegeben haben, telefonisch.") +
    p("Herzliche Grüße aus Schwetzingen<br>Ihre Dankeskiste");
  return { betreff: "Ihre Anfrage bei Dankeskiste", html: rahmen("Anfrage erhalten", inhalt), text: `Guten Tag ${a.name},\n\nIhre Anfrage ist angekommen. Ich melde mich innerhalb eines Werktags.\n\nHerzliche Grüße aus Schwetzingen\nIhre Dankeskiste\n` };
}

export type { Bestellung, Position, EmpfaengerZeile };
