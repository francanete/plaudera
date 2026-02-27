import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import { MessageSquare, Code2, Sparkles, Map, Scale } from "lucide-react";
import { FeedbackBoardMockup } from "@/components/features/mockups/feedback-board-mockup";
import { WidgetEmbedMockup } from "@/components/features/mockups/widget-embed-mockup";
import { AiDuplicatesMockup } from "@/components/features/mockups/ai-duplicates-mockup";
import { PublicRoadmapMockup } from "@/components/features/mockups/public-roadmap-mockup";
import { DecisionTimelineMockup } from "@/components/features/mockups/decision-timeline-mockup";

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
    title: "Stop building features nobody asked for",
    description:
      "Every feature you ship based on gut feel is a bet. Plaudera replaces guesswork with evidence — capturing real user pain, scoring demand confidence, and making every decision transparent.",
  },
  features: [
    {
      id: "public-feedback-boards",
      title: "Problem-first feedback boards",
      description:
        "Most feedback tools collect wish lists. Plaudera captures the pain behind the request — how often it happens, how bad it hurts, and who it affects. You stop guessing which requests actually matter.",
      icon: MessageSquare,
      mockup: FeedbackBoardMockup,
      alignment: "left",
      category: "core",
    },
    {
      id: "public-roadmap",
      title: "Public roadmap + Won't Build transparency",
      description:
        "Share what you're building and why. Show declined ideas with honest reasoning in a public Won't Build lane — so users see every decision, not just the wins.",
      icon: Map,
      mockup: PublicRoadmapMockup,
      alignment: "right",
      category: "core",
    },
    {
      id: "embeddable-widget",
      title: "Embeddable feedback & pulse polls",
      description:
        "Drop a widget into your app with a single snippet. Capture feature ideas and run quick pulse polls — all without leaving your product. One question, real pain signals, zero friction.",
      icon: Code2,
      mockup: WidgetEmbedMockup,
      alignment: "left",
      category: "integration",
    },
    {
      id: "ai-demand-intelligence",
      title: "AI-powered demand intelligence",
      description:
        "Three vocal users can look like a movement. Plaudera's AI scores every idea across votes, velocity, and contributor diversity — then labels demand as Strong, Emerging, or Anecdotal. You'll never mistake noise for signal again.",
      icon: Sparkles,
      mockup: AiDuplicatesMockup,
      alignment: "right",
      category: "analytics",
      badge: "AI",
    },
    {
      id: "decision-audit-trail",
      title: "Decision audit trail",
      description:
        "Every prioritization and decline leaves a rationale. See who decided what, when, and why — with a timeline that keeps your team aligned and your users informed.",
      icon: Scale,
      mockup: DecisionTimelineMockup,
      alignment: "left",
      category: "core",
    },
  ],
};
