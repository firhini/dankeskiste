import { defineConfig, devices } from "@playwright/test";

const APP_PORT = 3210;
const STRIPE_PORT = 4010;
const BASIS = `http://localhost:${APP_PORT}`;

/**
 * Ende-zu-Ende-Tests. Standard: gegen den lokalen Stripe-Nachbau (e2e/fake-stripe), damit die
 * komplette Bestellung ohne Schlüssel und Netz durchläuft. Die App wird dafür gebaut und im
 * Produktionsmodus gestartet (wie auf Vercel).
 */
const env: Record<string, string> = {
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgres://dk:dk@localhost:5432/dankeskiste_test",
  AUTH_SECRET: "e2e-nur-fuer-tests-0123456789abcdef0123456789",
  AUTH_URL: BASIS,
  ADMIN_EMAILS: "admin@dankeskiste.test",
  OWNER_EMAIL: "admin@dankeskiste.test",
  MAIL_FROM: "Dankeskiste <hallo@dankeskiste.test>",
  NEXT_PUBLIC_SITE_URL: BASIS,
  STRIPE_SECRET_KEY: "sk_test_lokaler_nachbau",
  STRIPE_WEBHOOK_SECRET: "whsec_test",
  STRIPE_API_BASE: `http://localhost:${STRIPE_PORT}`,
  FAKE_STRIPE_PORT: String(STRIPE_PORT),
  FAKE_STRIPE_WEBHOOK_URL: `${BASIS}/api/stripe/webhook`,
  RATE_LIMIT_FAKTOR: "20",
  MAIL_LOKAL: "1",
  UPLOAD_LOKAL: "1",
  RESEND_API_KEY: "",
  BLOB_READ_WRITE_TOKEN: "",
};
Object.assign(process.env, env);

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: { baseURL: BASIS, locale: "de-DE", timezoneId: "Europe/Berlin", trace: "off" },
  projects: [
    { name: "handy", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true }, testMatch: /bestellung\.spec\.ts/ },
    { name: "sicherheit", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } }, testMatch: /sicherheit\.spec\.ts/, dependencies: ["handy"] },
    { name: "admin", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } }, testMatch: /admin\.spec\.ts/, dependencies: ["sicherheit"] },
  ],
  webServer: [
    { command: "node e2e/fake-stripe/server.mjs", url: `http://localhost:${STRIPE_PORT}/__test/gesund`, reuseExistingServer: false, env },
    { command: `npx tsx e2e/prepare-db.ts && npx next build && npx next start -p ${APP_PORT}`, url: `${BASIS}/robots.txt`, reuseExistingServer: false, timeout: 600_000, env },
  ],
});
