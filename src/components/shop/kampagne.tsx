"use client";

import { useEffect } from "react";

/**
 * Kampagnen-Zuordnung ohne Cookie und ohne Speicher auf dem Gerät: Die UTM-Parameter des
 * ersten Seitenaufrufs werden nur im Arbeitsspeicher dieser Seite gehalten und mit der
 * Bestellung gesendet. Nach einem vollständigen Neuladen sind sie weg – das ist gewollt.
 */
let gemerkt: { kampagne?: string; utm: Record<string, string> } = { utm: {} };

export function leseKampagne() {
  return gemerkt;
}

export function KampagneMerken() {
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign"]) {
      const v = q.get(k);
      if (v) utm[k] = v.slice(0, 120);
    }
    if (utm.utm_campaign) gemerkt = { kampagne: utm.utm_campaign, utm };
  }, []);
  return null;
}
