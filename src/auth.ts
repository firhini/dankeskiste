import "server-only";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db, schema } from "../db";
import { sendeMail } from "./lib/server/mail";
import { anmeldeMail } from "./lib/server/mails";

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function istAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email) && adminEmails().includes(email!.trim().toLowerCase());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  trustHost: true,
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY ?? "lokal",
      from: process.env.MAIL_FROM,
      maxAge: 15 * 60,
      async sendVerificationRequest({ identifier, url }) {
        if (!istAdminEmail(identifier)) return;
        await sendeMail({ an: identifier, art: "anmeldung", ...anmeldeMail(url) });
      },
    }),
  ],
  pages: { signIn: "/admin/login", verifyRequest: "/admin/login?gesendet=1", error: "/admin/login" },
  callbacks: {
    // Greift beim Anfordern UND beim Einlösen des Links
    signIn({ user }) {
      return istAdminEmail(user.email);
    },
    session({ session }) {
      return session;
    },
  },
});

/** Für jede Admin-Seite, Server Action und Admin-API: ohne gültige Admin-Session → Login. */
export async function erfordereAdmin(): Promise<{ email: string }> {
  await connection();
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !istAdminEmail(email)) redirect("/admin/login");
  return { email };
}

/** Variante für Route Handler (kein Redirect, sondern 401). */
export async function adminOder401(): Promise<{ email: string } | Response> {
  await connection();
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !istAdminEmail(email)) return new Response("Nicht angemeldet", { status: 401 });
  return { email };
}
