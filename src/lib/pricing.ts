import {
  appConfig,
  type BillingCycle,
  type PaidTier,
  type TierMarketing,
} from "./config";

export type PricingMode = "ltd" | "subscription";

export const pricingMode: PricingMode = appConfig.pricing.mode;

// ----- SLUG UTILITIES -----

/**
 * Generate a product slug from tier and billing cycle. Format: {tier}-{billing}
 * (e.g., "starter-monthly", "growth-annual")
 */
export function generateSlug(tier: PaidTier, billing: BillingCycle): string {
  return `${tier.toLowerCase()}-${billing}`;
}

/**
 * Parse a slug back to tier and billing cycle. Supports both new format and
 * legacy "pro-*" slugs.
 */
export function parseSlug(
  slug: string
): { tier: PaidTier; billing: BillingCycle } | null {
  // Legacy slug support: "pro-*" maps to STARTER
  const legacyMap: Record<string, { tier: PaidTier; billing: BillingCycle }> = {
    "pro-ltd": { tier: "STARTER", billing: "ltd" },
    "pro-monthly": { tier: "STARTER", billing: "monthly" },
    "pro-annual": { tier: "STARTER", billing: "annual" },
  };

  if (legacyMap[slug]) {
    return legacyMap[slug];
  }

  // New format: {tier}-{billing}
  const match = slug.match(/^(starter|growth|scale)-(ltd|monthly|annual)$/);
  if (!match) return null;

  return {
    tier: match[1].toUpperCase() as PaidTier,
    billing: match[2] as BillingCycle,
  };
}

// ----- TIER UTILITIES -----

/**
 * Get all enabled tiers from config.
 */
export function getEnabledTiers(): PaidTier[] {
  return (
    Object.entries(appConfig.pricing.tiers) as [
      PaidTier,
      { enabled: boolean },
    ][]
  )
    .filter(([, config]) => config.enabled)
    .map(([tier]) => tier);
}

// ----- POLAR PRODUCTS -----

export type PolarProduct = {
  productId: string;
  slug: string;
  tier: PaidTier;
  billing: BillingCycle;
};

/**
 Get Polar products based on pricing mode and enabled tiers. -
 * LTD mode: lifetime product for enabled tiers with configured ltd productId -
 * Subscription mode: monthly/annual products for enabled tiers with configured
 * productIds Note: Tiers with empty polarProductIds for the current billing
 * cycle are skipped.
 */
export function getPolarProducts(): PolarProduct[] {
  const enabledTiers = getEnabledTiers();
  const products: PolarProduct[] = [];

  for (const tier of enabledTiers) {
    const config = appConfig.pricing.tiers[tier];
    const { polarProductIds } = config;

    if (pricingMode === "ltd") {
      // LTD mode: only lifetime product
      if (polarProductIds.ltd) {
        products.push({
          productId: polarProductIds.ltd,
          slug: generateSlug(tier, "ltd"),
          tier,
          billing: "ltd",
        });
      }
    } else {
      // Subscription mode: monthly and annual
      if (polarProductIds.monthly) {
        products.push({
          productId: polarProductIds.monthly,
          slug: generateSlug(tier, "monthly"),
          tier,
          billing: "monthly",
        });
      }
      if (polarProductIds.annual) {
        products.push({
          productId: polarProductIds.annual,
          slug: generateSlug(tier, "annual"),
          tier,
          billing: "annual",
        });
      }
    }
  }

  return products;
}

// ----- PRICING DISPLAY -----

export type PlanDisplay = {
  name: string;
  price: string;
  originalPrice?: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  slug?: string;
  href?: string;
  highlighted: boolean;
  badge?: string;
};

/**
 * Format price in cents to display string.
 */
function formatPrice(amountInCents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amountInCents / 100);
}

/**
 * Get pricing plans for display on the pricing page. Returns FREE plan + paid
 * plans based on mode and enabled tiers.
 */
export function getPricingPlans(): PlanDisplay[] {
  const freeMarketing = appConfig.pricing.freeMarketing;
  const freePlan: PlanDisplay = {
    name: freeMarketing.name,
    price: "$0",
    description: freeMarketing.description,
    features: freeMarketing.features,
    cta: freeMarketing.cta,
    highlighted: freeMarketing.highlighted,
    href: "/login",
  };

  const products = getPolarProducts();

  const paidPlans: PlanDisplay[] = products.map((product) => {
    const tierConfig = appConfig.pricing.tiers[product.tier];
    const marketing = tierConfig.marketing as TierMarketing;
    const priceAmount = tierConfig.prices[product.billing];

    // Build display name and enhance marketing based on billing type
    let name = marketing.name;
    let description = marketing.description;
    let features = [...marketing.features];
    let period: string | undefined;
    let badge: string | undefined = marketing.badge;
    let highlighted = marketing.highlighted;
    let originalPrice: string | undefined;

    if (product.billing === "monthly") {
      name = `${marketing.name} Monthly`;
      period = "/month";
    } else if (product.billing === "annual") {
      name = `${marketing.name} Annual`;
      period = "/year";
      description = `${marketing.description} - best value`;
      highlighted = true;
      // Show monthly × 12 as strikethrough
      const monthlyPrice = tierConfig.prices.monthly;
      if (monthlyPrice > 0) {
        originalPrice = formatPrice(monthlyPrice * 12);
      }
    } else if (product.billing === "ltd") {
      name = `${marketing.name} Lifetime`;
      description = "Pay once, use forever";
      features = [...features, ...appConfig.pricing.ltdExtraFeatures];
      badge = badge || "Lifetime";
      highlighted = true;
    }

    return {
      name,
      price: formatPrice(priceAmount),
      originalPrice,
      period,
      description,
      features,
      cta: marketing.cta,
      slug: product.slug,
      highlighted,
      badge,
    };
  });

  // Only include free plan if paid access is not required
  if (!appConfig.pricing.requirePaidAccess) {
    return [freePlan, ...paidPlans];
  }

  return paidPlans;
}

// ----- SYNC VERSION (for client components using server-fetched data) -----

export type SerializedPricingData = {
  plans: PlanDisplay[];
  mode: PricingMode;
};

// ----- TIER PRICING FOR TOGGLE UI -----

export type TierPricingDisplay = {
  tier: PaidTier;
  name: string;
  description: string;
  features: string[];
  cta: string;
  // Prices in formatted strings
  monthlyPrice: string;
  annualPrice: string;
  ltdPrice: string;
  // Original prices (for strikethrough when discount active)
  originalMonthlyPrice: string | null;
  originalAnnualPrice: string | null;
  originalLtdPrice: string | null;
  // Savings calculation
  annualSavings: string | null;
  // Slugs for checkout
  monthlySlug: string;
  annualSlug: string;
  ltdSlug: string;
};

/**
 * Get tier pricing data for toggle UI. Returns all price options per tier so
 * client can toggle without refetch.
 */
export function getTierPricing(): TierPricingDisplay[] {
  const enabledTiers = getEnabledTiers();

  return enabledTiers.map((tier) => {
    const config = appConfig.pricing.tiers[tier];
    const marketing = config.marketing as TierMarketing;
    const prices = config.prices;
    const originalPrices =
      "originalPrices" in config ? config.originalPrices : undefined;

    // Calculate annual savings (monthly × 12 - annual)
    const annualSavings =
      prices.monthly > 0 ? prices.monthly * 12 - prices.annual : 0;

    // Get features - add LTD extras if in LTD mode
    const features =
      pricingMode === "ltd"
        ? [...marketing.features, ...appConfig.pricing.ltdExtraFeatures]
        : [...marketing.features];

    // Calculate original prices for strikethrough (only if discount active)
    const originalMonthlyPrice =
      originalPrices && originalPrices.monthly > prices.monthly
        ? formatPrice(originalPrices.monthly)
        : null;
    const originalAnnualPrice =
      originalPrices && originalPrices.annual > prices.annual
        ? formatPrice(originalPrices.annual)
        : null;
    const originalLtdPrice =
      originalPrices && originalPrices.ltd > prices.ltd
        ? formatPrice(originalPrices.ltd)
        : null;

    return {
      tier,
      name: marketing.name,
      description: marketing.description,
      features,
      cta: marketing.cta,
      monthlyPrice: formatPrice(prices.monthly),
      annualPrice: formatPrice(prices.annual),
      ltdPrice: formatPrice(prices.ltd),
      originalMonthlyPrice,
      originalAnnualPrice,
      originalLtdPrice,
      annualSavings: annualSavings > 0 ? formatPrice(annualSavings) : null,
      monthlySlug: generateSlug(tier, "monthly"),
      annualSlug: generateSlug(tier, "annual"),
      ltdSlug: generateSlug(tier, "ltd"),
    };
  });
}
