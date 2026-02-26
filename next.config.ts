import type { NextConfig } from "next";

const baseSecurityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const defaultSecurityHeaders = [
  ...baseSecurityHeaders,
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
];

const embedSecurityHeaders = [
  ...baseSecurityHeaders,
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors *",
  },
];

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  devIndicators: false,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  // Server external packages (for Drizzle + Neon)
  serverExternalPackages: ["@neondatabase/serverless"],

  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Security headers
  async headers() {
    return [
      {
        // Embed routes need to be embeddable in iframes
        source: "/embed/:path*",
        headers: embedSecurityHeaders,
      },
      {
        // All other routes get strict security headers
        source: "/((?!embed).*)",
        headers: defaultSecurityHeaders,
      },
    ];
  },
};

export default nextConfig;
