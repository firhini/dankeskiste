import Link from "next/link";
import type { ReactNode } from "react";
import type { BestellStatus } from "../../../db/schema";

export function Seite({ titel, hinweis, aktionen, children }: { titel: string; hinweis?: ReactNode; aktionen?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-salbei pb-4">
        <div>
          <h1 className="!text-[clamp(1.75rem,1.4rem+1.6vw,2.5rem)] !leading-tight">{titel}</h1>
          {hinweis ? <p className="klein mt-1 max-w-[70ch] text-dunkel">{hinweis}</p> : null}
        </div>
        {aktionen ? <div className="nicht-drucken flex flex-wrap gap-2">{aktionen}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function Block({ titel, rechts, children, className = "" }: { titel?: ReactNode; rechts?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`mb-6 rounded-[4px] border border-salbei ${className}`}>
      {titel ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-salbei px-4 py-2.5">
          <h2 className="label !font-sans !text-[0.75rem] !tracking-[0.12em] text-dunkel">{titel}</h2>
          {rechts}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Kennzahl({ name, wert, unter, ton }: { name: string; wert: ReactNode; unter?: ReactNode; ton?: "rot" | "warnung" }) {
  return (
    <div className="rounded-[4px] border border-salbei p-4">
      <div className="label text-dunkel">{name}</div>
      <div className={`zahl mt-1.5 font-serif text-[1.9rem] leading-none ${ton === "rot" ? "text-signal" : ""}`}>{wert}</div>
      {unter ? <div className="klein zahl mt-1.5 text-dunkel">{unter}</div> : null}
    </div>
  );
}

const STATUS_STIL: Record<BestellStatus, string> = {
  offen: "border border-salbei text-dunkel",
  zahlung_ausstehend: "border border-ink text-ink",
  neu: "bg-dunkel text-creme",
  eingekauft: "border-2 border-oliv text-dunkel",
  gepackt: "bg-salbei text-ink",
  versendet: "border border-dunkel text-dunkel",
  geliefert: "border border-dunkel text-dunkel",
  abgeschlossen: "border border-salbei text-dunkel",
  storniert: "border border-signal text-signal",
};
const STATUS_NAME: Record<BestellStatus, string> = {
  offen: "Nicht bezahlt", zahlung_ausstehend: "Zahlung offen", neu: "Neu", eingekauft: "Eingekauft", gepackt: "Gepackt",
  versendet: "Versendet", geliefert: "Geliefert", abgeschlossen: "Abgeschlossen", storniert: "Storniert",
};

export function StatusMarke({ status }: { status: BestellStatus }) {
  return <span className={`label inline-block whitespace-nowrap rounded-[2px] px-2 py-1 !text-[0.6875rem] ${STATUS_STIL[status]}`}>{STATUS_NAME[status]}</span>;
}

export function Ampel({ marge, ziel = 45, min = 35 }: { marge: number; ziel?: number; min?: number }) {
  const rot = marge < min;
  const warn = !rot && marge < ziel;
  return (
    <span className={`zahl inline-flex items-center gap-1.5 whitespace-nowrap rounded-[2px] px-2 py-0.5 font-semibold ${rot ? "bg-signal text-creme" : warn ? "border border-ink text-ink" : "bg-salbei text-ink"}`}>
      {marge.toFixed(1).replace(".", ",")}&nbsp;%{rot ? " · zu niedrig" : warn ? " · Warnung" : ""}
    </span>
  );
}

export function Meldung({ art = "info", children }: { art?: "info" | "fehler" | "ok"; children: ReactNode }) {
  return (
    <div role={art === "fehler" ? "alert" : "status"} className={`klein mb-5 rounded-[4px] border px-4 py-3 ${art === "fehler" ? "border-signal text-signal" : "border-dunkel text-ink"}`}>
      {children}
    </div>
  );
}

export function Tabelle({ kopf, children, className = "" }: { kopf: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={`-mx-4 overflow-x-auto px-4 ${className}`}>
      <table className="klein w-full min-w-[36rem] text-left">
        <thead>
          <tr className="border-b border-salbei">
            {kopf.map((k, i) => (
              <th key={i} scope="col" className="label whitespace-nowrap px-2 py-2 !text-[0.6875rem] text-dunkel first:pl-0 last:pr-0">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-salbei/50 [&>tr:last-child]:border-0 [&_td]:px-2 [&_td]:py-2.5 [&_td]:align-top [&_td:first-child]:pl-0 [&_td:last-child]:pr-0">{children}</tbody>
      </table>
    </div>
  );
}

export function Leer({ children }: { children: ReactNode }) {
  return <p className="klein py-6 text-center text-dunkel">{children}</p>;
}

export function AKnopf({ href, children, hell }: { href: string; children: ReactNode; hell?: boolean }) {
  return (
    <Link href={href} className={`knopf !min-h-10 !px-3.5 !py-2 !text-[0.9375rem] ${hell ? "knopf-hell" : ""}`}>
      {children}
    </Link>
  );
}

export const knopfKlein = "knopf !min-h-10 !px-3.5 !py-2 !text-[0.9375rem]";
export const feldKlein = "feld !min-h-10 !py-2 !text-[0.9375rem]";
