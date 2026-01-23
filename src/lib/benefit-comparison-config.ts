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
    title: "The cost of ignoring feedback",
    subtitle:
      "Every feature request lost in a Slack thread or buried in a support ticket is a missed opportunity to build what your users actually want.",
  },
  oldWay: {
    label: "Without Plaudera",
    items: [
      {
        title: "Feedback scattered everywhere",
        description:
          "Ideas buried in emails, Slack, support tickets, and spreadsheets nobody maintains",
      },
      {
        title: "No way to prioritize",
        description:
          "Guessing which features matter most without data to back it up",
      },
      {
        title: "Duplicate requests pile up",
        description:
          "The same idea submitted ten different ways, inflating your backlog",
      },
      {
        title: "Users feel unheard",
        description:
          "No visibility into what's planned, so customers stop sharing feedback entirely",
      },
    ],
  },
  modernApproach: {
    label: "With Plaudera",
    items: [
      {
        title: "One place for all feedback",
        description:
          "A public board where users submit, vote, and track ideas in real time",
      },
      {
        title: "Data-driven prioritization",
        description:
          "See exactly which features have the most votes and engagement",
      },
      {
        title: "AI-powered deduplication",
        description:
          "Automatically detect and merge similar ideas to keep your board clean",
      },
      {
        title: "Users stay in the loop",
        description:
          "Status updates and an embeddable widget keep the feedback flowing",
      },
    ],
  },
};
