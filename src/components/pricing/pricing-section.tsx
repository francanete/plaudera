import { getTierPricing, pricingMode } from "@/lib/pricing";
import { PricingCards } from "./pricing-cards";

export function PricingSection() {
  const tiers = getTierPricing();
  return <PricingCards tiers={tiers} mode={pricingMode} />;
}
