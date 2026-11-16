"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PUNKTE: [string, string][] = [
  ["/admin", "Übersicht"],
  ["/admin/bestellungen", "Bestellungen"],
  ["/admin/einkauf", "Einkaufsliste"],
  ["/admin/boxen", "Boxen"],
  ["/admin/artikel", "Artikel"],
  ["/admin/bestand", "Bestand"],
  ["/admin/ausgaben", "Ausgaben"],
  ["/admin/kampagnen", "Kampagnen"],
  ["/admin/anfragen", "Anfragen"],
  ["/admin/rabattcodes", "Rabattcodes"],
  ["/admin/einstellungen", "Einstellungen"],
  ["/admin/export", "Export"],
];

export function AdminNav() {
  const pfad = usePathname();
  return (
    <nav aria-label="Admin" className="mx-auto max-w-[90rem] overflow-x-auto px-2 sm:px-4">
      <ul className="flex min-w-max gap-0.5">
        {PUNKTE.map(([href, name]) => {
          const aktiv = href === "/admin" ? pfad === "/admin" : pfad.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={aktiv ? "page" : undefined}
                className={`klein block whitespace-nowrap border-b-2 px-2.5 py-2.5 no-underline ${aktiv ? "border-dunkel font-semibold text-ink" : "border-transparent text-dunkel hover:border-salbei"}`}
              >
                {name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
