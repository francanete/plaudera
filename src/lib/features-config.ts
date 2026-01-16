import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import { Bell, BarChart3, Users } from "lucide-react";
import { NotificationCardMockup } from "@/components/features/mockups/notification-card";
import { AnalyticsChartMockup } from "@/components/features/mockups/analytics-chart";
import { TeamCollaborationMockup } from "@/components/features/mockups/team-collaboration";

/**
 * Alignment options for feature showcase
 */
export type FeatureAlignment = "left" | "right";

/**
 * Optional category for future filtering/grouping
 */
export type FeatureCategory =
  | "core"
  | "integration"
  | "analytics"
  | "collaboration"
  | "security";

/**
 * Props passed to all mockup components for consistency
 */
export interface MockupProps {
  className?: string;
  isInView?: boolean;
}

/**
 * Individual feature definition
 */
export interface FeatureDefinition {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  mockup: ComponentType<MockupProps>;
  alignment: FeatureAlignment;
  category?: FeatureCategory;
  badge?: string;
}

/**
 * Section header configuration
 */
export interface FeaturesSectionHeader {
  title: string;
  description: string;
  badge?: string;
}

/**
 * Features section configuration
 */
export interface FeaturesSectionConfig {
  id: string;
  header: FeaturesSectionHeader;
  features: FeatureDefinition[];
}

/**
 * Homepage features configuration
 */
export const homepageFeaturesConfig: FeaturesSectionConfig = {
  id: "features",
  header: {
    title: "Built for modern teams",
    description: "Everything you need to run your business, all in one place.",
  },
  features: [
    {
      id: "real-time-notifications",
      title: "Real-time notifications",
      description:
        "Stay informed with instant updates. Get notified about important events as they happen, across all your devices.",
      icon: Bell,
      mockup: NotificationCardMockup,
      alignment: "left",
      category: "core",
    },
    {
      id: "advanced-analytics",
      title: "Advanced analytics",
      description:
        "Make data-driven decisions with powerful insights. Track performance, identify trends, and optimize your operations.",
      icon: BarChart3,
      mockup: AnalyticsChartMockup,
      alignment: "right",
      category: "analytics",
    },
    {
      id: "team-collaboration",
      title: "Team collaboration",
      description:
        "Work together seamlessly. Share updates, coordinate tasks, and keep everyone aligned in real-time.",
      icon: Users,
      mockup: TeamCollaborationMockup,
      alignment: "left",
      category: "collaboration",
    },
  ],
};
