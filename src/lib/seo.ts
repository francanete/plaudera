import type { Metadata } from "next";
import { appConfig } from "./config";

/**
 * Get the base URL for the site.
 * Handles different environments (local, Vercel preview, production).
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/**
 * Generate canonical URL for a given path.
 */
export function getCanonicalUrl(path: string = ""): string {
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * SEO metadata options for pages.
 */
export interface PageSEOOptions {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  keywords?: string[];
  article?: {
    publishedTime: string;
    modifiedTime?: string;
    authors?: string[];
    tags?: string[];
  };
}

/**
 * Generate metadata for a page.
 * Merges with defaults from config.
 */
export function generatePageMetadata(options: PageSEOOptions): Metadata {
  const {
    title,
    description,
    path = "",
    image,
    noIndex = false,
    keywords,
    article,
  } = options;

  const canonicalUrl = getCanonicalUrl(path);
  const ogImage = image || `${getBaseUrl()}/opengraph-image`;

  return {
    title,
    description,
    keywords: keywords || [...appConfig.seo.keywords],

    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),

    alternates: {
      canonical: canonicalUrl,
    },

    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: appConfig.seo.openGraph.siteName,
      type: article ? "article" : "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(article && {
        publishedTime: article.publishedTime,
        modifiedTime: article.modifiedTime,
        authors: article.authors,
        tags: article.tags,
      }),
    },

    twitter: {
      card: appConfig.seo.twitter.card,
      title,
      description,
      images: [ogImage],
    },
  };
}

/**
 * Shorthand helpers for common page types.
 */
export const seo = {
  page: generatePageMetadata,

  article: (
    options: Omit<PageSEOOptions, "article"> & {
      publishedTime: string;
      modifiedTime?: string;
      authors?: string[];
      tags?: string[];
    }
  ) =>
    generatePageMetadata({
      ...options,
      article: {
        publishedTime: options.publishedTime,
        modifiedTime: options.modifiedTime,
        authors: options.authors,
        tags: options.tags,
      },
    }),
};
