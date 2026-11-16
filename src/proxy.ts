import { NextResponse, type NextRequest } from "next/server";

/**
 * Schneller Vor-Check für den Admin: ohne Session-Cookie direkt zum Login.
 * Die eigentliche Prüfung (gültige Session + Adresse in ADMIN_EMAILS) passiert serverseitig
 * in jeder Admin-Seite, Server Action und Admin-Route über `erfordereAdmin()`.
 */
export function proxy(request: NextRequest) {
  const hatSession = request.cookies.has("authjs.session-token") || request.cookies.has("__Secure-authjs.session-token");
  if (!hatSession) {
    const ziel = request.nextUrl.clone();
    ziel.pathname = "/admin/login";
    ziel.search = "";
    return NextResponse.redirect(ziel);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/((?!login).*)"],
};
