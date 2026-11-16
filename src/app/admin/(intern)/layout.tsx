import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { erfordereAdmin } from "@/auth";
import { abmelden } from "../aktionen-login";
import { AdminNav } from "@/components/admin/nav";

/** Admin-Seiten rendern bewusst blockierend auf dem Server (kein Prerender, keine Sofort-Navigation). */
export const instant = false;

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };

async function Rahmen({ children }: { children: React.ReactNode }) {
  const admin = await erfordereAdmin();
  return (
    <div className="min-h-dvh">
      <header className="nicht-drucken sticky top-0 z-20 border-b border-salbei bg-creme">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <Link href="/admin" className="font-serif text-xl text-dunkel no-underline">
            Dankeskiste <span className="label ml-1 align-middle text-oliv">Admin</span>
          </Link>
          <form action={abmelden} className="flex items-center gap-3">
            <span className="klein hidden text-dunkel sm:inline">{admin.email}</span>
            <button type="submit" className="textlink klein">
              Abmelden
            </button>
          </form>
        </div>
        <AdminNav />
      </header>
      <main className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<div className="rand py-16 klein text-dunkel">Lädt …</div>}>
      <Rahmen>{children}</Rahmen>
    </Suspense>
  );
}
