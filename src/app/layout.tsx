import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { Providers } from "./providers";
import { appConfig } from "@/lib/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(appConfig.seo.siteUrl),
  title: {
    default: appConfig.seo.title.default,
    template: appConfig.seo.title.template,
  },
  description: appConfig.seo.description,
  keywords: [...appConfig.seo.keywords],
  authors: [{ name: appConfig.name }],
  creator: appConfig.name,
  publisher: appConfig.name,
  robots: appConfig.seo.robots,
  openGraph: {
    type: appConfig.seo.openGraph.type,
    locale: appConfig.seo.openGraph.locale,
    siteName: appConfig.seo.openGraph.siteName,
    title: {
      default: appConfig.seo.title.default,
      template: appConfig.seo.title.template,
    },
    description: appConfig.seo.description,
    url: appConfig.seo.siteUrl,
  },
  twitter: {
    card: appConfig.seo.twitter.card,
    site: appConfig.seo.twitter.site,
    creator: appConfig.seo.twitter.creator,
    title: {
      default: appConfig.seo.title.default,
      template: appConfig.seo.title.template,
    },
    description: appConfig.seo.description,
  },
  ...(appConfig.seo.verification.google && {
    verification: {
      google: appConfig.seo.verification.google,
    },
  }),
  alternates: {
    canonical: appConfig.seo.siteUrl,
  },
  applicationName: appConfig.name,
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
