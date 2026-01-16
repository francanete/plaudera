export interface ComparisonItem {
  title: string;
  description: string;
}

export interface BenefitComparisonConfig {
  header: {
    title: string;
    subtitle: string;
  };
  oldWay: {
    label: string;
    items: ComparisonItem[];
  };
  modernApproach: {
    label: string;
    items: ComparisonItem[];
  };
}

export const benefitComparisonConfig: BenefitComparisonConfig = {
  header: {
    title: "The cost of staying put",
    subtitle:
      "Every day without the right infrastructure means lost revenue, frustrated teams, and mounting technical debt.",
  },
  oldWay: {
    label: "The old way",
    items: [
      {
        title: "Manual reconciliation",
        description: "Hours lost to spreadsheets and data mismatches",
      },
      {
        title: "Fragmented tools",
        description: "Data scattered across disconnected systems",
      },
      {
        title: "Slow onboarding",
        description: "Days of setup before customers see value",
      },
      {
        title: "Security gaps",
        description: "Patchwork compliance that keeps you up at night",
      },
    ],
  },
  modernApproach: {
    label: "The modern approach",
    items: [
      {
        title: "Real-time sync",
        description: "Automated accuracy across every platform",
      },
      {
        title: "Single source of truth",
        description: "One unified view for confident decisions",
      },
      {
        title: "Instant provisioning",
        description: "Customers live in under 60 seconds",
      },
      {
        title: "Enterprise security",
        description: "SOC 2 compliant infrastructure from day one",
      },
    ],
  },
};
