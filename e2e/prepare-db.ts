/** Bereitet die Test-Datenbank vor: Schema frisch anlegen, migrieren, Sortiment einspielen. */
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL!;
  if (!/_test(\?|$)/.test(url)) throw new Error("E2E-Tests laufen nur gegen eine Datenbank, deren Name auf _test endet.");
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
  await client.end();
  execSync("npx drizzle-kit migrate", { stdio: "inherit", env: process.env });
  execSync("npx tsx db/seed.ts", { stdio: "inherit", env: process.env });
  rmSync(".mail-outbox", { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
