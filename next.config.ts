import type { NextConfig } from "next";

// Toutes les images/fichiers uploadés sont servis via les routes API de
// l'app (jamais un lien direct vers Supabase Storage dans le navigateur),
// donc img-src 'self' suffit — pas besoin d'ouvrir vers Supabase.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // React dev mode a besoin d'eval() pour reconstruire les piles d'appel
  // (jamais en production, "React will never use eval() in production
  // mode") — CSP appliquée seulement en production pour ne pas casser le
  // rechargement à chaud en local.
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY }]
    : []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.22"],
  devIndicators: false,
  serverExternalPackages: ["imapflow", "mailparser", "nodemailer"],
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
