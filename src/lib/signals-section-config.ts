export interface SignalDefinition {
  name: string;
  description: string;
  weight: number;
  exampleValue: number; // 0-100 for the mockup bar fill
}

export const signalsSectionConfig = {
  badge: "Introducing",
  title: "Feedback Signals",
  description:
    "Most tools count votes. Plaudera scores demand confidence using 9 weighted signals — so you know whether a feature request represents real, diverse demand or just a loud minority.",
  signals: [
    {
      name: "Organic Votes",
      description: "Direct votes from unique contributors",
      weight: 15,
      exampleValue: 85,
    },
    {
      name: "Contributor Diversity",
      description: "Number of unique people behind the demand",
      weight: 15,
      exampleValue: 72,
    },
    {
      name: "Recency",
      description: "Ratio of votes in the last 14 days",
      weight: 15,
      exampleValue: 90,
    },
    {
      name: "Velocity",
      description: "Votes per week since the idea was created",
      weight: 15,
      exampleValue: 78,
    },
    {
      name: "Duplicate Clusters",
      description: "AI-detected similar requests merged together",
      weight: 10,
      exampleValue: 60,
    },
    {
      name: "Submission Richness",
      description: "Quality and detail of the original submission",
      weight: 10,
      exampleValue: 95,
    },
    {
      name: "Frequency",
      description: "How often the contributor encounters the problem",
      weight: 8,
      exampleValue: 65,
    },
    {
      name: "Impact",
      description: "Severity of the workflow impact reported",
      weight: 7,
      exampleValue: 50,
    },
    {
      name: "Inherited Votes",
      description: "Votes carried over from merged duplicates",
      weight: 5,
      exampleValue: 40,
    },
  ] satisfies SignalDefinition[],
};
