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
      title: "Users share & vote",
      description:
        "Your users start submitting feature ideas and voting on what matters most to them. No sign-up friction.",
    },
    {
      number: 3,
      title: "Build what matters",
      description:
        "Identify real user-driven opportunities backed by data. No more guessing — you know exactly what to build next.",
    },
  ],
};
