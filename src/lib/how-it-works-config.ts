export interface HowItWorksStep {
  number: number;
  title: string;
  description: string;
}

export interface HowItWorksConfig {
  header: {
    title: string;
    subtitle: string;
  };
  steps: HowItWorksStep[];
}

export const howItWorksConfig: HowItWorksConfig = {
  header: {
    title: "Up and running in under 5 minutes",
    subtitle:
      "No complex setup, no lengthy onboarding. Three simple steps to start learning what your users actually want.",
  },
  steps: [
    {
      number: 1,
      title: "Set up your workspace",
      description:
        "Create a public feedback board and embed the widget directly in your app. Ready to collect ideas in minutes.",
    },
    {
      number: 2,
      title: "Users share pain, not just wishes",
      description:
        "Your users describe the problem they're facing, how often it happens, and how much it affects them. They vote, you get real signal.",
    },
    {
      number: 3,
      title: "Decide with confidence",
      description:
        "Every idea gets a confidence score. See which requests have strong, diverse demand vs. loud-minority noise — and document every decision with a rationale.",
    },
  ],
};
