export interface TourStep {
  id: string;
  title: string;
  content: string;
  selector: string;
  position: "top" | "bottom" | "left" | "right";
  /** If true, this step is skipped on mobile devices */
  desktopOnly?: boolean;
}

export interface OnboardingFlow {
  id: string;
  name: string;
  description?: string;
  steps: TourStep[];
  /** If true, tour auto-starts for new users (default: true) */
  autoStart?: boolean;
  /** Delay in ms before auto-starting (default: 500) */
  autoStartDelay?: number;
}

/**
 * All onboarding flows keyed by flowId.
 * Each flow can have independent steps and completion tracking.
 */
export const onboardingFlows: Record<string, OnboardingFlow> = {
  dashboard: {
    id: "dashboard",
    name: "Dashboard Tour",
    description: "Learn the basics of your dashboard",
    autoStart: true,
    autoStartDelay: 500,
    steps: [
      {
        id: "public-board",
        title: "Your Public Board",
        content:
          "Share this link with your users to collect feedback. Copy or open it to see your board in action.",
        selector: "#tour-public-board",
        position: "bottom",
      },
      {
        id: "pending-review",
        title: "Pending Reviews",
        content:
          "New ideas land here for your review. Click to approve or manage submissions from your users.",
        selector: "#tour-stat-pending",
        position: "bottom",
      },
      {
        id: "quick-actions",
        title: "Quick Actions",
        content:
          "Jump into common tasks right from your dashboard. You're all set!",
        selector: "#tour-quick-actions",
        position: "bottom",
      },
    ],
  },
  settings: {
    id: "settings",
    name: "Settings Tour",
    description: "Learn how to configure your account",
    autoStart: true,
    autoStartDelay: 500,
    steps: [
      {
        id: "tabs",
        title: "Settings Navigation",
        content:
          "Switch between Profile and Billing tabs to manage different aspects of your account.",
        selector: "#tour-settings-tabs",
        position: "bottom",
      },
      {
        id: "profile",
        title: "Profile Settings",
        content:
          "Update your name and personal details here. Your avatar syncs from your login provider.",
        selector: "#tour-settings-profile",
        position: "top",
      },
      {
        id: "billing",
        title: "Billing & Subscription",
        content:
          "View your current plan, billing cycle, and manage your subscription. You're all set!",
        selector: "#tour-settings-billing",
        position: "top",
      },
    ],
  },
  widgetPreview: {
    id: "widgetPreview",
    name: "Widget Preview Tour",
    description: "See how your feedback widget works",
    autoStart: true,
    autoStartDelay: 1000,
    steps: [
      {
        id: "widget-button",
        title: "Your Feedback Widget",
        content:
          "This is your feedback widget! Click it to open the feedback panel where users can submit ideas and vote.",
        selector: "#tour-widgetPreview-widget-button",
        position: "top",
      },
    ],
  },
};

/**
 * Get an onboarding flow by its ID.
 */
export function getOnboardingFlow(flowId: string): OnboardingFlow | undefined {
  return onboardingFlows[flowId];
}

/**
 * Type for valid flow IDs (derived from config keys).
 */
export type FlowId = keyof typeof onboardingFlows;

/**
 * Legacy export for backward compatibility.
 * @deprecated Use getOnboardingFlow("dashboard").steps instead
 */
export const tourSteps = onboardingFlows.dashboard.steps;
