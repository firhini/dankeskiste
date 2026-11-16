"use client";

import { useState } from "react";
import { leseKampagne } from "./kampagne";

type Zustand = { art: "bereit" } | { art: "sendet" } | { art: "ok" } | { art: "fehler"; text: string; felder?: Record<string, string> };

export function AnfrageFormular({ vorgabe = "angebot", hinweis }: { vorgabe?: "angebot" | "musterbox"; hinweis?: string }) {
  const [z, setZ] = useState<Zustand>({ art: "bereit" });
  const felder = z.art === "fehler" ? (z.felder ?? {}) : {};

  async function senden(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const f = new FormData(ev.currentTarget);
    setZ({ art: "sendet" });
    try {
      const antwort = await fetch("/api/anfrage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(f.entries()), b2b: f.get("b2b") === "on", kampagne: leseKampagne().kampagne }),
      });
      const daten = await antwort.json().catch(() => ({}));
      if (antwort.ok) setZ({ art: "ok" });
      else setZ({ art: "fehler", text: daten.fehler ?? "Das hat nicht geklappt. Bitte versuchen Sie es noch einmal.", felder: daten.felder });
    } catch {
      setZ({ art: "fehler", text: "Keine Verbindung. Bitte prüfen Sie Ihr Netz und versuchen Sie es noch einmal." });
    }
  }

  if (z.art === "ok") {
    return (
      <div role="status" className="border border-dunkel p-6">
        <p className="font-serif text-[1.75rem] leading-tight text-dunkel">Danke – Ihre Anfrage ist da.</p>
        <p className="mt-3">Ich melde mich innerhalb eines Werktags bei Ihnen. Eine Bestätigung ist unterwegs an Ihre E-Mail-Adresse.</p>
      </div>
    );
  }

  const Fehler = ({ name }: { name: string }) => (felder[name] ? <p id={`${name}-fehler`} className="feldfehler">{felder[name]}</p> : null);
  const attr = (name: string) => ({ "aria-invalid": felder[name] ? true : undefined, "aria-describedby": felder[name] ? `${name}-fehler` : undefined });

  return (
    <form onSubmit={senden} noValidate className="grid gap-4 sm:grid-cols-2">
      {hinweis ? <p className="klein sm:col-span-2">{hinweis}</p> : null}
      <fieldset className="sm:col-span-2">
        <legend className="feldname">Worum geht es?</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-2"><input type="radio" name="art" value="angebot" defaultChecked={vorgabe === "angebot"} className="h-5 w-5 accent-[#455230]" /> Angebot für eine größere Bestellung</label>
          <label className="flex items-center gap-2"><input type="radio" name="art" value="musterbox" defaultChecked={vorgabe === "musterbox"} className="h-5 w-5 accent-[#455230]" /> Musterbox</label>
        </div>
      </fieldset>
      <div>
        <label htmlFor="a-firma" className="feldname">Firma</label>
        <input id="a-firma" name="firma" required autoComplete="organization" className="feld" {...attr("firma")} />
        <Fehler name="firma" />
      </div>
      <div>
        <label htmlFor="a-name" className="feldname">Ihr Name</label>
        <input id="a-name" name="name" required autoComplete="name" className="feld" {...attr("name")} />
        <Fehler name="name" />
      </div>
      <div>
        <label htmlFor="a-email" className="feldname">E-Mail</label>
        <input id="a-email" name="email" type="email" required autoComplete="email" inputMode="email" className="feld" {...attr("email")} />
        <Fehler name="email" />
      </div>
      <div>
        <label htmlFor="a-telefon" className="feldname">Telefon <span className="font-normal">(optional)</span></label>
        <input id="a-telefon" name="telefon" type="tel" autoComplete="tel" inputMode="tel" className="feld" />
      </div>
      <div>
        <label htmlFor="a-menge" className="feldname">Ungefähre Menge <span className="font-normal">(optional)</span></label>
        <input id="a-menge" name="menge" placeholder="z. B. 120 Boxen" className="feld" />
      </div>
      {/* Honeypot: für Menschen unsichtbar, Bots füllen es aus */}
      <div className="nur-sr" aria-hidden>
        <label htmlFor="a-website">Website (bitte leer lassen)</label>
        <input id="a-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="a-nachricht" className="feldname">Was haben Sie vor?</label>
        <textarea id="a-nachricht" name="nachricht" rows={4} className="feld" placeholder="Anlass, Wunschtermin, Lieferadressen, besondere Wünsche …" {...attr("nachricht")} />
        <Fehler name="nachricht" />
      </div>
      <div className="sm:col-span-2">
        <label className="klein flex items-start gap-3">
          <input type="checkbox" name="b2b" required className="mt-0.5 h-5 w-5 shrink-0 accent-[#455230]" {...attr("b2b")} />
          <span>Ich frage als Unternehmer im Sinne von §&nbsp;14 BGB an, nicht als Verbraucher.</span>
        </label>
        <Fehler name="b2b" />
      </div>
      <div className="sm:col-span-2">
        <button type="submit" disabled={z.art === "sendet"} className="knopf">
          {z.art === "sendet" ? "Wird gesendet …" : "Anfrage senden"}
        </button>
        {z.art === "fehler" ? <p role="alert" className="feldfehler mt-3">{z.text}</p> : null}
        <p className="klein mt-3">Ihre Angaben nutze ich nur, um Ihre Anfrage zu beantworten. Mehr dazu in der <a href="/datenschutz" className="textlink">Datenschutzerklärung</a>.</p>
      </div>
    </form>
  );
}
