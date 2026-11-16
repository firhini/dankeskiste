/**
 * Lokaler Stripe-Nachbau für Ende-zu-Ende-Tests – KEIN Ersatz für den echten Stripe-Testmodus.
 * Bildet genau die Endpunkte nach, die die App über das offizielle Stripe-SDK aufruft, rechnet
 * Summen wie Stripe (Positionen, Promotion Code, Versand), zeigt eine Bezahlseite und stellt
 * korrekt signierte Webhooks zu. Die App erreicht ihn nur mit einem sk_test_-Schlüssel und
 * gesetztem STRIPE_API_BASE.
 */
import { createHmac, randomBytes } from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.FAKE_STRIPE_PORT ?? 4010);
const WEBHOOK_URL = process.env.FAKE_STRIPE_WEBHOOK_URL ?? "http://localhost:3210/api/stripe/webhook";
const SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_test";
const id = (p) => `${p}_test_${randomBytes(9).toString("hex")}`;
const jetzt = () => Math.floor(Date.now() / 1000);

const db = { customers: new Map(), sessions: new Map(), intents: new Map(), charges: new Map(), txns: new Map(), coupons: new Map(), promos: new Map(), invoices: new Map(), events: [], requests: [] };

/** a[b][0][c]=1 → verschachteltes Objekt */
function parseForm(text) {
  const out = {};
  for (const [k, v] of new URLSearchParams(text)) {
    const pfad = k.replace(/\]/g, "").split("[");
    let o = out;
    pfad.forEach((teil, i) => {
      if (i === pfad.length - 1) o[teil] = v;
      else o = o[teil] ??= {};
    });
  }
  const zuArrays = (x) => {
    if (x && typeof x === "object") {
      const keys = Object.keys(x);
      for (const k of keys) x[k] = zuArrays(x[k]);
      if (keys.length && keys.every((k) => /^\d+$/.test(k))) return keys.sort((a, b) => a - b).map((k) => x[k]);
    }
    return x;
  };
  return zuArrays(out);
}

function berechne(s) {
  const zeilen = (s.params.line_items ?? []).map((li) => ({ name: li.price_data.product_data.name, menge: Number(li.quantity), einzel: Number(li.price_data.unit_amount) }));
  const subtotal = zeilen.reduce((a, z) => a + z.menge * z.einzel, 0);
  let rabatt = 0;
  const promoId = s.params.discounts?.[0]?.promotion_code;
  if (promoId) {
    const promo = db.promos.get(promoId);
    const coupon = promo && db.coupons.get(promo.coupon);
    if (!promo || !promo.active || !coupon) throw fehler(400, `No such promotion code: '${promoId}'`);
    rabatt = coupon.percent_off ? Math.round((subtotal * coupon.percent_off) / 100) : Math.min(subtotal, coupon.amount_off);
  }
  const versand = Number(s.params.shipping_options?.[0]?.shipping_rate_data?.fixed_amount?.amount ?? 0);
  return { zeilen, subtotal, rabatt, versand, total: subtotal - rabatt + versand };
}

const fehler = (status, message) => Object.assign(new Error(message), { status });

function sessionObjekt(s, expandInvoice = false) {
  const b = berechne(s);
  return {
    id: s.id, object: "checkout.session", mode: "payment", livemode: false, url: s.status === "open" ? `http://localhost:${PORT}/pay/${s.id}` : null,
    status: s.status, payment_status: s.status === "complete" ? "paid" : "unpaid", customer: s.params.customer ?? null,
    amount_subtotal: b.subtotal, amount_total: b.total, currency: "eur",
    total_details: { amount_discount: b.rabatt, amount_shipping: b.versand, amount_tax: 0 },
    metadata: s.params.metadata ?? {}, client_reference_id: s.params.client_reference_id ?? null,
    payment_intent: s.paymentIntent ?? null, invoice: s.invoice ? (expandInvoice ? db.invoices.get(s.invoice) : s.invoice) : null,
    success_url: s.params.success_url, cancel_url: s.params.cancel_url, locale: s.params.locale ?? null,
    billing_address_collection: s.params.billing_address_collection ?? null, created: s.created,
  };
}

async function sendeEvent(type, object) {
  const event = { id: id("evt"), object: "event", api_version: "2026-10-28.endive", created: jetzt(), type, livemode: false, pending_webhooks: 1, request: { id: null, idempotency_key: null }, data: { object } };
  db.events.push(event);
  return liefere(event);
}

async function liefere(event) {
  const payload = JSON.stringify(event);
  const t = jetzt();
  const v1 = createHmac("sha256", SECRET).update(`${t}.${payload}`).digest("hex");
  const antwort = await fetch(WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json", "Stripe-Signature": `t=${t},v1=${v1}` }, body: payload });
  return { status: antwort.status, body: await antwort.text() };
}

async function bezahle(s) {
  if (s.status !== "open") return;
  const b = berechne(s);
  // Gebühr wie Standardkarte EWR (1,5 % + 0,25 €) plus 0,4 % für die Rechnung
  const fee = Math.round(b.total * 0.015) + 25 + Math.round(b.total * 0.004);
  const txn = { id: id("txn"), object: "balance_transaction", amount: b.total, fee, net: b.total - fee, currency: "eur" };
  const charge = { id: id("ch"), object: "charge", amount: b.total, amount_refunded: 0, balance_transaction: txn.id, metadata: s.params.payment_intent_data?.metadata ?? {}, refunded: false };
  const pi = { id: id("pi"), object: "payment_intent", amount: b.total, status: "succeeded", latest_charge: charge.id, metadata: charge.metadata };
  const kunde = db.customers.get(s.params.customer);
  const inv = {
    id: id("in"), object: "invoice", status: "paid", customer_name: kunde?.name ?? null, footer: s.params.invoice_creation?.invoice_data?.footer ?? null,
    description: s.params.invoice_creation?.invoice_data?.description ?? null, custom_fields: s.params.invoice_creation?.invoice_data?.custom_fields ?? [],
    metadata: s.params.invoice_creation?.invoice_data?.metadata ?? {}, total: b.total, tax: null,
    hosted_invoice_url: `http://localhost:${PORT}/rechnung/${s.id}`, invoice_pdf: `http://localhost:${PORT}/rechnung/${s.id}?pdf=1`,
  };
  db.txns.set(txn.id, txn); db.charges.set(charge.id, charge); db.intents.set(pi.id, pi); db.invoices.set(inv.id, inv);
  s.status = "complete"; s.paymentIntent = pi.id; s.invoice = s.params.invoice_creation?.enabled === "true" ? inv.id : null;
  const promoId = s.params.discounts?.[0]?.promotion_code;
  if (promoId) db.promos.get(promoId).times_redeemed += 1;
  await sendeEvent("checkout.session.completed", sessionObjekt(s));
  await sendeEvent("charge.succeeded", { ...charge });
  if (s.invoice) await sendeEvent("invoice.paid", inv);
}

const html = (titel, inhalt) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titel}</title>
<style>body{font-family:system-ui,sans-serif;max-width:34rem;margin:2rem auto;padding:0 1rem;line-height:1.5}table{width:100%;border-collapse:collapse}td{padding:.4rem 0;border-bottom:1px solid #ddd}td:last-child{text-align:right;white-space:nowrap}button{font:inherit;padding:.8rem 1.2rem;margin:.3rem .3rem 0 0}.hinweis{background:#fff3cd;padding:.6rem .8rem;font-size:.9rem}</style></head><body>${inhalt}</body></html>`;
const eur = (c) => `${(c / 100).toFixed(2).replace(".", ",")} €`;
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

async function behandle(req, res, body) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  const json = (obj, status = 200) => { res.writeHead(status, { "Content-Type": "application/json", "Request-Id": id("req") }); res.end(JSON.stringify(obj)); };
  const seite = (text, status = 200) => { res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" }); res.end(text); };
  const form = req.method === "POST" && p.startsWith("/v1/") ? parseForm(body) : {};
  if (p.startsWith("/v1/")) db.requests.push({ method: req.method, path: p, form });
  let m;

  // ── Bezahlseite ──
  if ((m = p.match(/^\/pay\/(cs_test_\w+)$/)) && req.method === "GET") {
    const s = db.sessions.get(m[1]);
    if (!s) return seite(html("Nicht gefunden", "<h1>Session nicht gefunden</h1>"), 404);
    const b = berechne(s);
    const kunde = db.customers.get(s.params.customer);
    return seite(html("Zahlung (Stripe-Nachbau)", `<p class="hinweis">Lokaler Stripe-Nachbau für Tests – hier fließt kein Geld.</p><h1>Zahlung</h1><p data-testid="kunde">${esc(kunde?.name)} · ${esc(kunde?.email)}</p>
<table>${b.zeilen.map((z) => `<tr><td>${z.menge} × ${esc(z.name)}</td><td>${eur(z.menge * z.einzel)}</td></tr>`).join("")}
${b.rabatt ? `<tr><td>Rabatt</td><td data-testid="rabatt">−${eur(b.rabatt)}</td></tr>` : ""}
<tr><td data-testid="versandart">${esc(s.params.shipping_options?.[0]?.shipping_rate_data?.display_name ?? "Versand")}</td><td data-testid="versand">${eur(b.versand)}</td></tr>
<tr><td><strong>Gesamt</strong></td><td><strong data-testid="total">${eur(b.total)}</strong></td></tr></table>
<p data-testid="submit-hinweis">${esc(s.params.custom_text?.submit?.message ?? "")}</p>
<p>Rechnungsfuß: <span data-testid="rechnung-fuss">${esc(s.params.invoice_creation?.invoice_data?.footer ?? "")}</span></p>
<form method="post" action="/pay/${s.id}/confirm"><button data-testid="bezahlen">Bezahlen</button></form>
<form method="get" action="${esc(s.params.cancel_url)}"><button data-testid="abbrechen">Abbrechen</button></form>`));
  }
  if ((m = p.match(/^\/pay\/(cs_test_\w+)\/confirm$/)) && req.method === "POST") {
    const s = db.sessions.get(m[1]);
    if (!s) return seite("nicht gefunden", 404);
    await bezahle(s);
    res.writeHead(303, { Location: s.params.success_url.replace("{CHECKOUT_SESSION_ID}", s.id) });
    return res.end();
  }
  if ((m = p.match(/^\/rechnung\/(cs_test_\w+)$/))) {
    const s = db.sessions.get(m[1]);
    const inv = s && db.invoices.get(s.invoice);
    if (!inv) return seite("nicht gefunden", 404);
    return seite(html("Rechnung", `<h1>Rechnung</h1><p data-testid="rechnung-kunde">${esc(inv.customer_name)}</p><p>${esc(inv.description)}</p><p>Summe: <span data-testid="rechnung-summe">${eur(inv.total)}</span> · Umsatzsteuer: keine</p><p data-testid="rechnung-fuss">${esc(inv.footer)}</p>`));
  }

  // ── Test-Hilfen ──
  if (p === "/__test/zustand") return json({ sessions: [...db.sessions.values()].map((s) => ({ ...sessionObjekt(s), params: s.params })), events: db.events.map((e) => ({ id: e.id, type: e.type })), coupons: [...db.coupons.values()], promos: [...db.promos.values()], requests: db.requests.length });
  if ((m = p.match(/^\/__test\/erneut\/(evt_test_\w+)$/))) { const e = db.events.find((x) => x.id === m[1]); return e ? json(await liefere(e)) : json({ error: "unbekannt" }, 404); }
  if (p === "/__test/gesund") return json({ ok: true });

  // ── API ──
  if (!(req.headers.authorization ?? "").startsWith("Bearer sk_test_")) return json({ error: { type: "invalid_request_error", message: "Nur Test-Schlüssel erlaubt." } }, 401);
  if (p === "/v1/customers" && req.method === "POST") { const c = { id: id("cus"), object: "customer", ...form }; db.customers.set(c.id, c); return json(c); }
  if (p === "/v1/checkout/sessions" && req.method === "POST") {
    if (!form.line_items?.length) throw fehler(400, "line_items fehlt");
    if (form.discounts && form.allow_promotion_codes) throw fehler(400, "You may only specify one of these parameters: allow_promotion_codes, discounts.");
    for (const li of form.line_items) if (!(Number(li.price_data?.unit_amount) >= 0) || !(Number(li.quantity) > 0)) throw fehler(400, "Ungültige Position");
    const s = { id: id("cs"), params: form, status: "open", created: jetzt() };
    berechne(s);
    db.sessions.set(s.id, s);
    return json(sessionObjekt(s));
  }
  if ((m = p.match(/^\/v1\/checkout\/sessions\/(cs_test_\w+)$/)) && req.method === "GET") { const s = db.sessions.get(m[1]); if (!s) throw fehler(404, "No such checkout.session"); return json(sessionObjekt(s, url.searchParams.getAll("expand[]").includes("invoice") || url.search.includes("invoice"))); }
  if ((m = p.match(/^\/v1\/payment_intents\/(pi_test_\w+)$/)) && req.method === "GET") {
    const pi = db.intents.get(m[1]); if (!pi) throw fehler(404, "No such payment_intent");
    const expand = url.search.includes("latest_charge");
    const ch = db.charges.get(pi.latest_charge);
    return json({ ...pi, latest_charge: expand ? { ...ch, balance_transaction: url.search.includes("balance_transaction") ? db.txns.get(ch.balance_transaction) : ch.balance_transaction } : pi.latest_charge });
  }
  if ((m = p.match(/^\/v1\/charges\/(ch_test_\w+)$/)) && req.method === "GET") { const ch = db.charges.get(m[1]); if (!ch) throw fehler(404, "No such charge"); return json({ ...ch, balance_transaction: url.search.includes("balance_transaction") ? db.txns.get(ch.balance_transaction) : ch.balance_transaction }); }
  if ((m = p.match(/^\/v1\/balance_transactions\/(txn_test_\w+)$/)) && req.method === "GET") { const t = db.txns.get(m[1]); if (!t) throw fehler(404, "No such balance_transaction"); return json(t); }
  if (p === "/v1/refunds" && req.method === "POST") {
    const pi = db.intents.get(form.payment_intent); if (!pi) throw fehler(404, "No such payment_intent");
    const ch = db.charges.get(pi.latest_charge);
    const betrag = form.amount ? Number(form.amount) : ch.amount - ch.amount_refunded;
    if (betrag <= 0 || betrag > ch.amount - ch.amount_refunded) throw fehler(400, "Refund amount exceeds charge.");
    ch.amount_refunded += betrag; ch.refunded = ch.amount_refunded === ch.amount;
    const r = { id: id("re"), object: "refund", amount: betrag, status: "succeeded", payment_intent: pi.id, charge: ch.id };
    json(r);
    await sendeEvent("charge.refunded", { ...ch });
    return;
  }
  if (p === "/v1/coupons" && req.method === "POST") { const c = { id: id("co"), object: "coupon", name: form.name, duration: form.duration, percent_off: form.percent_off ? Number(form.percent_off) : null, amount_off: form.amount_off ? Number(form.amount_off) : null, currency: form.currency ?? null }; db.coupons.set(c.id, c); return json(c); }
  if (p === "/v1/promotion_codes" && req.method === "POST") {
    const coupon = form.promotion?.coupon ?? form.coupon;
    if (!db.coupons.has(coupon)) throw fehler(400, "No such coupon");
    const pr = { id: id("promo"), object: "promotion_code", code: form.code, coupon, active: true, times_redeemed: 0, expires_at: form.expires_at ? Number(form.expires_at) : null, max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null, promotion: { type: "coupon", coupon } };
    db.promos.set(pr.id, pr); return json(pr);
  }
  if ((m = p.match(/^\/v1\/promotion_codes\/(promo_test_\w+)$/)) && req.method === "POST") { const pr = db.promos.get(m[1]); if (!pr) throw fehler(404, "No such promotion code"); if (form.active !== undefined) pr.active = form.active === "true"; return json(pr); }
  throw fehler(404, `Nicht nachgebaut: ${req.method} ${p}`);
}

createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    behandle(req, res, body).catch((e) => {
      if (!res.headersSent) { res.writeHead(e.status ?? 500, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: { type: "invalid_request_error", message: e.message } })); }
      if (!e.status) console.error("[fake-stripe]", e);
    });
  });
}).listen(PORT, () => console.log(`Stripe-Nachbau läuft auf http://localhost:${PORT}`));
