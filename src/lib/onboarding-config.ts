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
        id: "chat",
        title: "AI Chat",
        content: "Chat with AI to get help with your projects and tasks.",
        selector: "#tour-nav-chat",
        position: "right",
        desktopOnly: true,
      },
      {
        id: "projects",
        title: "Your Projects",
        content:
          "Track all your active projects here. This is your command center.",
        selector: "#tour-stat-projects",
        position: "bottom",
      },
      {
        id: "plan",
        title: "Your Plan",
        content: "View your current subscription plan and usage limits.",
        selector: "#tour-stat-plan",
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
