"use server";

import { redirect } from "next/navigation";
import { istAdminEmail, signIn, signOut } from "@/auth";
import { rateLimit } from "@/lib/server/ratelimit";

export async function anmelden(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const limit = await rateLimit("login", 5, 600);
  if (!limit.ok) redirect("/admin/login?limit=1");
  // Immer dieselbe Antwort – so lässt sich nicht herausfinden, welche Adressen berechtigt sind.
  if (istAdminEmail(email)) {
    await signIn("resend", { email, redirect: false, redirectTo: "/admin" });
  }
  redirect("/admin/login?gesendet=1");
}

export async function abmelden(): Promise<void> {
  await signOut({ redirectTo: "/admin/login" });
}
