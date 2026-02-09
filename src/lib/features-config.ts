import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import { MessageSquare, Code2, Sparkles, Map } from "lucide-react";
import { FeedbackBoardMockup } from "@/components/features/mockups/feedback-board-mockup";
import { WidgetEmbedMockup } from "@/components/features/mockups/widget-embed-mockup";
import { AiDuplicatesMockup } from "@/components/features/mockups/ai-duplicates-mockup";
import { PublicRoadmapMockup } from "@/components/features/mockups/public-roadmap-mockup";

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
    title: "Your feature request board & feedback widget in one place",
    description:
      "Public boards for voting. An embeddable widget for in-app feedback. AI that merges duplicates automatically.",
  },
  features: [
    {
      id: "public-feedback-boards",
      title: "Public feedback boards",
      description:
        "Let users submit ideas, vote on what matters, and see your roadmap — on a branded board you control.",
      icon: MessageSquare,
      mockup: FeedbackBoardMockup,
      alignment: "left",
      category: "core",
    },
    {
      id: "public-roadmap",
      title: "Public roadmap",
      description:
        "Share your product roadmap publicly. Let users see what's planned, in progress, and released — building trust and reducing duplicate requests.",
      icon: Map,
      mockup: PublicRoadmapMockup,
      alignment: "right",
      category: "core",
    },
    {
      id: "embeddable-widget",
      title: "Embeddable feedback widget",
      description:
        "Drop a lightweight widget into your app with a single code snippet. Capture feedback right where your users are, without breaking their flow.",
      icon: Code2,
      mockup: WidgetEmbedMockup,
      alignment: "left",
      category: "integration",
    },
    {
      id: "ai-duplicate-detection",
      title: "AI-powered duplicate detection",
      description:
        "Stop wasting time on duplicate ideas. Our AI surfaces similar submissions automatically, so you can merge them, consolidate votes, and keep your board clean.",
      icon: Sparkles,
      mockup: AiDuplicatesMockup,
      alignment: "right",
      category: "analytics",
      badge: "AI",
    },
  ],
};
