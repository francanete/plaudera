import type { Plan } from "./db/schema";

export type BillingCycle = "ltd" | "monthly" | "annual";
type PolarEnv = "sandbox" | "production";

/**
 * Polar product IDs per environment.
 * POLAR_SERVER env var controls which set is used.
 */
const polarProductIdsByEnv: Record<
  PolarEnv,
  Record<PaidTier, Record<BillingCycle, string>>
> = {
  sandbox: {
    STARTER: {
      ltd: "",
      monthly: "09b7c379-03f4-45de-af9a-79af85d695ac",
      annual: "94dae15a-fb93-449a-bd50-e4aa1cdbcae2",
    },
    GROWTH: { ltd: "", monthly: "", annual: "" },
    SCALE: { ltd: "", monthly: "", annual: "" },
  },
  production: {
    STARTER: {
      ltd: "", // TODO: Add production ID
      monthly: "ecaed00a-eede-49cb-9354-c6cad0923ba7",
      annual: "c4b18ec4-7889-4c7f-8ad9-37cb8259702f",
    },
    GROWTH: { ltd: "", monthly: "", annual: "" },
    SCALE: { ltd: "", monthly: "", annual: "" },
  },
};

const polarEnv = (process.env.POLAR_SERVER || "sandbox") as PolarEnv;
const polarProductIds = polarProductIdsByEnv[polarEnv];
export type PaidTier = Exclude<Plan, "FREE">;

export type TierMarketing = {
  name: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  badge?: string;
};

export type TierConfig = {
  enabled: boolean;
  /** Prices in cents */
  prices: Record<BillingCycle, number>;
  /** Original prices in cents (for strikethrough when discount active) */
  originalPrices?: Record<BillingCycle, number>;
  /** Polar product IDs - get from Polar dashboard */
  polarProductIds: Record<BillingCycle, string>;
  marketing: TierMarketing;
};

export type FeatureRateLimits = {
  requestsPerDay: number | null; // null = unlimited
  tokensPerDay?: number | null;
};

export type PlanRateLimits = {
  [feature: string]: FeatureRateLimits;
};

export type ResendSegments = {
  waitlist: string;
};

export type AppConfig = {
  name: string;
  description: string;
  email: { from: string };
  resendSegments: ResendSegments;
  team: { name: string };
  socials: {
    twitter: string;
    github: string;
    linkedin: string;
    twitterHandle: string;
  };
  pricing: {
    mode: "subscription" | "ltd";
    allowFreePlan: boolean;
    tiers: Record<PaidTier, TierConfig>;
    freeMarketing: TierMarketing;
    ltdExtraFeatures: string[];
    /** Rate limits per plan per feature. null = unlimited */
    rateLimits: Record<Plan, PlanRateLimits>;
  };
  plans: { hierarchy: Record<Plan, number> };
  legal: {
    company: {
      name: string;
      registrationNumber: string;
      registeredAddress: string;
      contactLink: string;
    };
    dataHandling: { subProcessors: string[] };
    terms: { minimumAge: number; jurisdiction: string };
    lastUpdated: string;
  };
  seo: {
    siteUrl: string;
    title: { default: string; template: string };
    description: string;
    keywords: string[];
    openGraph: { type: "website"; locale: string; siteName: string };
    twitter: { card: "summary_large_image"; site: string; creator: string };
    organization: { name: string; logo: string; sameAs: string[] };
    product: {
      name: string;
      applicationCategory: string;
      operatingSystem: string;
    };
    verification: { google: string | null };
    robots: {
      index: boolean;
      follow: boolean;
      googleBot: {
        index: boolean;
        follow: boolean;
        "max-video-preview": number;
        "max-image-preview": "large";
        "max-snippet": number;
      };
    };
  };
};

export const appConfig: AppConfig = {
  name: "Plaudera",
  description:
    "Collect, organize, and prioritize customer feedback with public boards, embeddable widgets, and AI-powered insights.",
  email: {
    from: "noreply@app.plaudera.com",
  },
  resendSegments: {
    waitlist: "4697f202-5b77-40d6-acfa-15789e6c5828",
  },
  team: {
    name: "Plaudera Team",
  },
  socials: {
    twitter: "https://twitter.com/plauderaapp",
    github: "https://github.com/plauderaapp",
    linkedin: "https://linkedin.com/company/plauderaapp",
    twitterHandle: "@plauderaapp",
  },
  pricing: {
    mode: "subscription" as const, // "subscription" | "ltd"
    allowFreePlan: false, // Show free plan on pricing page & allow FREE users in dashboard
    tiers: {
      STARTER: {
        enabled: true,
        prices: { ltd: 6700, monthly: 1900, annual: 19000 },
        originalPrices: { ltd: 9900, monthly: 1900, annual: 22800 },
        polarProductIds: polarProductIds.STARTER,
        marketing: {
          name: "Starter",
          description:
            "Everything you need to collect and manage customer feedback",
          features: [
            "Public feedback board with custom URL",
            "Embeddable widget for any website",
            "AI-powered duplicate detection",
            "Unlimited idea submissions",
            "Contributor voting system",
            "Dashboard analytics",
            "Widget customization (position, colors, page rules)",
            "AI insights chat",
          ],
          cta: "GET STARTED",
          highlighted: false,
        },
      },
      /** No Growth plan at the moment */
      GROWTH: {
        enabled: false,
        prices: { ltd: 0, monthly: 0, annual: 0 },
        polarProductIds: polarProductIds.GROWTH,
        marketing: {
          name: "Growth",
          description: "For growing businesses",
          features: [
            "Everything in Starter",
            "Advanced team management",
            "Custom workflows",
            "Priority support",
            "API access",
            "Dedicated account manager",
          ],
          cta: "Start Free Trial",
          highlighted: true,
          badge: "Popular",
        },
      },
      /** No Scale plan at the moment */
      SCALE: {
        enabled: false,
        prices: { ltd: 0, monthly: 0, annual: 0 },
        polarProductIds: polarProductIds.SCALE,
        marketing: {
          name: "Scale",
          description: "For enterprises",
          features: [
            "Everything in Growth",
            "SSO & SAML",
            "Custom SLAs",
            "Dedicated support",
            "On-premise deployment",
            "Custom contracts",
          ],
          cta: "Contact Sales",
          highlighted: false,
        },
      },
    } satisfies Record<PaidTier, TierConfig>,

    freeMarketing: {
      name: "Free",
      description: "For individuals getting started",
      features: [
        "1 feedback board",
        "Up to 50 ideas",
        "Basic widget embed",
        "Community support",
      ],
      cta: "Get Started",
      highlighted: false,
    } satisfies TierMarketing,

    /** Extra features for LTD plans (appended to tier features) */
    ltdExtraFeatures: [
      "Lifetime access to all features",
      "All future updates included",
      "No recurring fees ever",
    ],

    /** Rate limits per plan. null = unlimited */
    rateLimits: {
      FREE: {
        chat: { requestsPerDay: 10, tokensPerDay: 10000 },
      },
      STARTER: {
        chat: { requestsPerDay: 50, tokensPerDay: 50000 },
      },
      GROWTH: {
        chat: { requestsPerDay: 200, tokensPerDay: 200000 },
      },
      SCALE: {
        chat: { requestsPerDay: 1000, tokensPerDay: 1000000 },
      },
    },
  },
  plans: {
    hierarchy: {
      FREE: 0,
      STARTER: 1,
      GROWTH: 2,
      SCALE: 3,
    } as const satisfies Record<Plan, number>,
  },
  /**
   * Legal configuration - REQUIRED for UK compliance
   * Update these fields before launching
   */
  legal: {
    company: {
      name: "Emmerit Business Consulting Ltd",
      registrationNumber: "08361828",
      registeredAddress:
        "3 Hardman Square, Spinningfields, Manchester, United Kingdom, M3 3EB",
      contactLink: "https://tally.so/r/eqrMWE?ref=plaudera",
    },
    dataHandling: {
      subProcessors: [
        "Neon - Database (US)",
        "Polar - Payments (EU)",
        "Resend - Email (US)",
        "Google Cloud - AI (US)",
        "Vercel - Hosting (US)",
      ],
    },
    terms: {
      minimumAge: 18,
      jurisdiction: "England and Wales",
    },
    lastUpdated: "January 2025",
  },
  seo: {
    siteUrl: process.env.NEXT_PUBLIC_APP_URL || "https://yourdomain.com",
    title: {
      default: "Plaudera - Customer Feedback Made Simple",
      template: "%s | Plaudera",
    },
    description:
      "Collect, organize, and prioritize customer feedback with public boards, embeddable widgets, and AI-powered duplicate detection.",
    keywords: [
      "customer feedback",
      "feedback board",
      "feature requests",
      "product feedback",
      "embeddable widget",
      "duplicate detection",
      "public roadmap",
    ],
    openGraph: {
      type: "website" as const,
      locale: "en_US",
      siteName: "Plaudera",
    },
    twitter: {
      card: "summary_large_image" as const,
      site: "@plauderaapp",
      creator: "@plauderaapp",
    },
    organization: {
      name: "Plaudera",
      logo: "/logo.png",
      sameAs: [
        "https://twitter.com/plauderaapp",
        "https://github.com/plauderaapp",
        "https://linkedin.com/company/plauderaapp",
      ],
    },
    product: {
      name: "Plaudera",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || null,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large" as const,
        "max-snippet": -1,
      },
    },
  },
} as const;

/**
 * Build product-to-tier mapping from tiers config.
 * Called once and cached.
 */
function buildProductToTierMap(): Record<string, Plan> {
  const map: Record<string, Plan> = {};
  const tiers = appConfig.pricing.tiers;

  for (const [tier, config] of Object.entries(tiers)) {
    const { polarProductIds } = config;
    if (polarProductIds.ltd) map[polarProductIds.ltd] = tier as Plan;
    if (polarProductIds.monthly) map[polarProductIds.monthly] = tier as Plan;
    if (polarProductIds.annual) map[polarProductIds.annual] = tier as Plan;
  }

  return map;
}

// Cached product-to-tier map
let productToTierMap: Record<string, Plan> | null = null;

/**
 * Get the app tier for a Polar product ID.
 * Defaults to FREE if product ID is not mapped.
 */
export function getPlanFromPolarProduct(
  polarProductId: string | null | undefined
): Plan {
  if (!polarProductId) return "FREE";

  if (!productToTierMap) {
    productToTierMap = buildProductToTierMap();
  }

  const plan = productToTierMap[polarProductId];

  if (!plan) {
    console.error(
      `[CRITICAL] Unknown Polar product ID: "${polarProductId}" - defaulting to FREE. ` +
        `Check appConfig.pricing.tiers.polarProductIds. ` +
        `Known IDs: ${JSON.stringify(Object.keys(productToTierMap))}`
    );
    return "FREE";
  }

  return plan;
}
