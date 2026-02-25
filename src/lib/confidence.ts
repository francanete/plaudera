import type { FrequencyTag, WorkflowImpact } from "@/lib/db/schema";

// ============ Types ============

export type ConfidenceLabel = "strong" | "emerging" | "anecdotal";
export type Richness = "sparse" | "medium" | "rich";

export interface ConfidenceSignals {
  organicVotes: number;
  inheritedVotes: number;
  uniqueContributors: number;
  recencyRatio: number; // votes in last 14d / total votes (0-1)
  ageVelocity: number; // votes per week since idea created
  dupeStrength: number; // cluster_size * avg_similarity / 100
  richness: Richness;
  frequency: number; // 0-4
  impact: number; // 0-4
  topDomainShare: number; // 0-1
  topDomain: string | null;
  isFreemailDominant: boolean;
}

export interface ConcentrationWarning {
  type: "loud_minority";
  domain: string;
  share: number; // percentage, e.g. 67
  blocksStrong: boolean;
}

export interface SignalBreakdown {
  organicVotes: number;
  inheritedVotes: number;
  contributors: number;
  recency: number;
  ageVelocity: number;
  dupeStrength: number;
  richness: number;
  frequency: number;
  impact: number;
}

export interface ConfidenceResult {
  label: ConfidenceLabel;
  intraScore: number; // 0-100
  concentrationWarning: ConcentrationWarning | null;
  signalBreakdown: SignalBreakdown;
}

// ============ Constants ============

const FREEMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "yahoo.co.uk",
  "icloud.com",
  "me.com",
  "protonmail.com",
  "pm.me",
]);

const FREQUENCY_MAP: Record<string, number> = {
  daily: 4,
  weekly: 3,
  monthly: 2,
  rarely: 1,
};

const IMPACT_MAP: Record<string, number> = {
  blocker: 4,
  major: 3,
  minor: 2,
  nice_to_have: 1,
};

const RICHNESS_SCORE: Record<Richness, number> = {
  sparse: 0,
  medium: 0.5,
  rich: 1.0,
};

// ============ Normalization ============

export function normalizeLog2(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(Math.log2(1 + value) / Math.log2(1 + max), 1);
}

// ============ Helpers ============

export function isFreemailDomain(domain: string): boolean {
  return FREEMAIL_DOMAINS.has(domain.toLowerCase());
}

export function deriveRichness(
  description: string | null | undefined,
  problemStatement: string | null | undefined
): Richness {
  const totalChars =
    (description?.length ?? 0) + (problemStatement?.length ?? 0);
  if (totalChars >= 200) return "rich";
  if (totalChars >= 50) return "medium";
  return "sparse";
}

export function mapFrequency(tag: FrequencyTag | null | undefined): number {
  return tag ? (FREQUENCY_MAP[tag] ?? 0) : 0;
}

export function mapImpact(impact: WorkflowImpact | null | undefined): number {
  return impact ? (IMPACT_MAP[impact] ?? 0) : 0;
}

// ============ Concentration Detection ============

function detectConcentration(
  signals: ConfidenceSignals
): ConcentrationWarning | null {
  if (!signals.topDomain || signals.topDomainShare <= 0.6) return null;
  if (signals.isFreemailDominant) return null;

  return {
    type: "loud_minority",
    domain: signals.topDomain,
    share: Math.round(signals.topDomainShare * 100),
    blocksStrong: signals.topDomainShare > 0.75,
  };
}

// ============ Label Assignment ============

function assignLabel(
  signals: ConfidenceSignals,
  concentration: ConcentrationWarning | null
): ConfidenceLabel {
  const totalVotes = signals.organicVotes + signals.inheritedVotes;

  // Strong: votes>=5, contributors>=3, recency>=0.30, no high concentration
  if (
    totalVotes >= 5 &&
    signals.uniqueContributors >= 3 &&
    signals.recencyRatio >= 0.3 &&
    !concentration?.blocksStrong
  ) {
    return "strong";
  }

  // Emerging: votes>=3, (contributors>=2 OR recency>=0.20)
  if (
    totalVotes >= 3 &&
    (signals.uniqueContributors >= 2 || signals.recencyRatio >= 0.2)
  ) {
    return "emerging";
  }

  return "anecdotal";
}

// ============ Intra-Score Computation ============

function computeIntraScore(signals: ConfidenceSignals): SignalBreakdown {
  const organicVotes = normalizeLog2(signals.organicVotes, 50) * 0.15;
  const contributors = normalizeLog2(signals.uniqueContributors, 30) * 0.15;
  const recency = signals.recencyRatio * 0.15;
  const ageVelocity = normalizeLog2(signals.ageVelocity, 10) * 0.15;
  const dupeStrength = normalizeLog2(signals.dupeStrength, 5) * 0.1;
  const richness = RICHNESS_SCORE[signals.richness] * 0.1;
  const frequency = (signals.frequency / 4) * 0.08;
  const impact = (signals.impact / 4) * 0.07;
  const inheritedVotes = normalizeLog2(signals.inheritedVotes, 50) * 0.05;

  return {
    organicVotes,
    inheritedVotes,
    contributors,
    recency,
    ageVelocity,
    dupeStrength,
    richness,
    frequency,
    impact,
  };
}

// ============ Main Function ============

export function computeConfidence(
  signals: ConfidenceSignals
): ConfidenceResult {
  const concentrationWarning = detectConcentration(signals);
  const label = assignLabel(signals, concentrationWarning);
  const signalBreakdown = computeIntraScore(signals);

  const rawScore =
    signalBreakdown.organicVotes +
    signalBreakdown.inheritedVotes +
    signalBreakdown.contributors +
    signalBreakdown.recency +
    signalBreakdown.ageVelocity +
    signalBreakdown.dupeStrength +
    signalBreakdown.richness +
    signalBreakdown.frequency +
    signalBreakdown.impact;

  const intraScore = Math.round(rawScore * 100);

  return {
    label,
    intraScore,
    concentrationWarning,
    signalBreakdown,
  };
}
