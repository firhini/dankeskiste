"use client";

import { useEffect, useState } from "react";

const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const ADS_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL;
const SCHLUESSEL = "dk-einwilligung";

function lese(): "ja" | "nein" | null {
  try {
    const v = window.localStorage.getItem(SCHLUESSEL);
    return v === "ja" || v === "nein" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Schlanker Einwilligungs-Hinweis. Erscheint nur, wenn Conversion-Messung konfiguriert ist
 * (NEXT_PUBLIC_GOOGLE_ADS_ID). Ohne diese Variable setzt die Website keine Cookies und lädt
 * keine Dritt-Skripte – dann gibt es auch keinen Banner.
 */
export function Einwilligung() {
  const [offen, setOffen] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Entscheidung liegt nur im Browser vor
    if (ADS_ID && lese() === null) setOffen(true);
  }, []);
  if (!ADS_ID || !offen) return null;
  const waehle = (v: "ja" | "nein") => {
    try {
      window.localStorage.setItem(SCHLUESSEL, v);
    } catch {}
    setOffen(false);
  };
  return (
    <section aria-label="Einwilligung zur Erfolgsmessung" className="nicht-drucken fixed inset-x-3 bottom-3 z-40 mx-auto max-w-xl rounded-[2px] border border-dunkel bg-creme p-5 sm:inset-x-auto sm:right-5 sm:bottom-5">
      <p className="font-serif text-[1.375rem] leading-tight text-dunkel">Dürfen wir Bestellungen zählen?</p>
      <p className="klein mt-2">
        Wenn Sie zustimmen, meldet diese Seite nach einer Bestellung an Google Ads, dass eine Anzeige zu einem Kauf geführt hat. Dafür setzt Google Cookies. Ohne Zustimmung passiert nichts davon – der Shop funktioniert genauso. <a href="/datenschutz#messung" className="textlink">Details</a>
      </p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <button type="button" onClick={() => waehle("nein")} className="knopf knopf-hell !min-h-11 flex-1">Nein, danke</button>
        <button type="button" onClick={() => waehle("ja")} className="knopf !min-h-11 flex-1">Einverstanden</button>
      </div>
    </section>
  );
}

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/** Meldet die Bestellung an Google Ads – nur mit konfigurierter ID und erteilter Einwilligung. */
export function AdsConversion({ wertCent, bestellnummer }: { wertCent: number; bestellnummer: string }) {
  useEffect(() => {
    if (!ADS_ID || !ADS_LABEL || lese() !== "ja") return;
    const markierung = `dk-conv-${bestellnummer}`;
    try {
      if (window.sessionStorage.getItem(markierung)) return;
      window.sessionStorage.setItem(markierung, "1");
    } catch {}
    window.dataLayer = window.dataLayer ?? [];
    const gtag = (...args: unknown[]) => window.dataLayer!.push(args);
    gtag("js", new Date());
    gtag("config", ADS_ID);
    gtag("event", "conversion", { send_to: `${ADS_ID}/${ADS_LABEL}`, value: wertCent / 100, currency: "EUR", transaction_id: bestellnummer });
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ADS_ID)}`;
    document.head.appendChild(s);
  }, [wertCent, bestellnummer]);
  return null;
}

export function WarenkorbLeeren() {
  useEffect(() => {
    try {
      window.sessionStorage.removeItem("dk-bestellung-v1");
    } catch {}
  }, []);
  return null;
}
