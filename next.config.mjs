/** @type {import('next').NextConfig} */
const watchContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss: blob:",
  "media-src 'self' https: blob:",
  "frame-src https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const baseSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

const relaySecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "default-src 'self' https://getplay-cdn.com; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; script-src 'self' 'unsafe-inline' https://getplay-cdn.com; style-src 'self' 'unsafe-inline' https://getplay-cdn.com; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https://getplay-cdn.com https: wss: blob:; media-src 'self' https: blob:; frame-src 'self' https:; worker-src 'self' blob:" },
  { key: "Referrer-Policy", value: "no-referrer" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: baseSecurityHeaders,
      },
      {
        source: "/watch/:path*",
        headers: [
          { key: "Content-Security-Policy", value: watchContentSecurityPolicy },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/api/playback/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, nosnippet" },
        ],
      },
      {
        source: "/api/getplay-relay/:path*",
        headers: relaySecurityHeaders,
      },
    ];
  },
};

export default nextConfig;
