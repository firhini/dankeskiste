import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  var __dkPool: Pool | undefined;
}

function erzeugePool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ist nicht gesetzt.");
  const lokal = /localhost|127\.0\.0\.1/.test(url);
  return new Pool({
    connectionString: url,
    max: lokal ? 10 : 5,
    idleTimeoutMillis: 20_000,
    ssl: lokal || /sslmode=disable/.test(url) ? undefined : { rejectUnauthorized: true },
  });
}

// In der Entwicklung über Hot-Reloads hinweg denselben Pool behalten.
const pool = globalThis.__dkPool ?? erzeugePool();
if (process.env.NODE_ENV !== "production") globalThis.__dkPool = pool;

export const db = drizzle(pool, { schema });
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export { schema, pool };
