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
    title: "You're building your roadmap based on who complains loudest",
    subtitle:
      "Most teams think they're data-driven. Then they realize their entire backlog was shaped by 3 vocal users and a Slack thread.",
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
        title: "Loudest voice wins",
        description:
          "The most vocal users drive your roadmap. Quiet majority pain goes unnoticed.",
      },
      {
        title: "Duplicate requests pile up",
        description:
          "The same idea submitted ten different ways, inflating your backlog",
      },
      {
        title: "Decisions happen in the dark",
        description:
          "No record of why features were built or rejected. Users and teammates are left guessing.",
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
        title: "Confidence-scored prioritization",
        description:
          "Every idea scored across multiple signals — votes, velocity, contributor diversity, and more. Loud minorities get flagged automatically.",
      },
      {
        title: "AI-powered deduplication",
        description:
          "Automatically detect and merge similar ideas to keep your board clean",
      },
      {
        title: "Transparent decisions with audit trails",
        description:
          "Every prioritization and decline has a rationale. Users see a public Won't Build lane alongside your roadmap.",
      },
    ],
  },
};
