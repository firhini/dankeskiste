export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
export const SITE_NAME = "Dankeskiste";

export function absolut(pfad: string): string {
  return `${SITE_URL}${pfad.startsWith("/") ? pfad : `/${pfad}`}`;
}
