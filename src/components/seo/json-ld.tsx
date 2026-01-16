import { appConfig } from "@/lib/config";
import { getBaseUrl } from "@/lib/seo";

function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Escape < to prevent XSS via </script> injection
  // \u003c is valid JSON and renders correctly for search engines
  const safeJson = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJson }}
    />
  );
}

export function OrganizationJsonLd() {
  const baseUrl = getBaseUrl();
  const { organization, siteUrl } = appConfig.seo;

  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: organization.name,
    url: siteUrl,
    logo: `${baseUrl}${organization.logo}`,
    sameAs: organization.sameAs,
    contactPoint: {
      "@type": "ContactPoint",
      email: appConfig.email.from,
      contactType: "customer service",
    },
  };

  return <JsonLd data={data} />;
}

export function WebSiteJsonLd() {
  const { siteUrl, title } = appConfig.seo;

  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: title.default,
    url: siteUrl,
  };

  return <JsonLd data={data} />;
}

export function SoftwareApplicationJsonLd() {
  const { product, siteUrl } = appConfig.seo;
  const pricing = appConfig.pricing;

  const enabledTiers = Object.values(pricing.tiers).filter(
    (tier) => tier.enabled
  );
  const lowestPrice =
    enabledTiers.length > 0
      ? Math.min(...enabledTiers.map((tier) => tier.prices.monthly)) / 100
      : 0;

  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: product.name,
    applicationCategory: product.applicationCategory,
    operatingSystem: product.operatingSystem,
    url: siteUrl,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: lowestPrice,
      offerCount: enabledTiers.length,
      offers: enabledTiers.map((tier) => ({
        "@type": "Offer",
        name: tier.marketing.name,
        description: tier.marketing.description,
        price: tier.prices.monthly / 100,
        priceCurrency: "USD",
      })),
    },
  };

  return <JsonLd data={data} />;
}

export interface ArticleJsonLdProps {
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author: {
    name: string;
    url?: string;
  };
}

export function ArticleJsonLd({
  title,
  description,
  url,
  image,
  datePublished,
  dateModified,
  author,
}: ArticleJsonLdProps) {
  const baseUrl = getBaseUrl();
  const { organization } = appConfig.seo;

  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description,
    url: url,
    ...(image && {
      image: image.startsWith("http") ? image : `${baseUrl}${image}`,
    }),
    datePublished: datePublished,
    dateModified: dateModified || datePublished,
    author: {
      "@type": "Person",
      name: author.name,
      ...(author.url && { url: author.url }),
    },
    publisher: {
      "@type": "Organization",
      name: organization.name,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}${organization.logo}`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  return <JsonLd data={data} />;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export function FAQJsonLd({ items }: { items: FAQItem[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return <JsonLd data={data} />;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <JsonLd data={data} />;
}
