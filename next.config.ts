import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";
const ads = Boolean(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID);

/**
 * Content-Security-Policy ohne Nonce (siehe DECISIONS.md, T11): Shop-Seiten bleiben statisch.
 * Dritt-Quellen gibt es nur, wenn Google-Ads-Conversion per Env-Variable aktiviert ist.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}${ads ? " https://www.googletagmanager.com https://www.googleadservices.com" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://*.public.blob.vercel-storage.com${ads ? " https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.google.com https://www.google.de" : ""}`,
  "font-src 'self'",
  `connect-src 'self'${dev ? " ws: wss:" : ""}${ads ? " https://www.google.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.googletagmanager.com" : ""}`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  serverExternalPackages: ["sharp", "pg"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "private, no-store" }] },
      { source: "/images/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;
