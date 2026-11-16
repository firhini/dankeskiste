"use client";

export function DruckKnopf() {
  return (
    <button type="button" onClick={() => window.print()} className="knopf !min-h-10 !px-3.5 !py-2 !text-[0.9375rem]">
      Drucken
    </button>
  );
}
