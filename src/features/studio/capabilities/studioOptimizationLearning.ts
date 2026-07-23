import type { StudioCreativeOptimizationProposal } from "@/features/studio/capabilities/studioCreativeOptimizations";

export const STUDIO_OPTIMIZATION_DECISIONS = ["ACCEPTED", "REJECTED", "MODIFIED", "IGNORED"] as const;
export const STUDIO_OPTIMIZATION_LEARNING_SIGNALS = ["EFFECTIVE", "INEFFECTIVE", "MIXED", "INSUFFICIENT_DATA"] as const;
export const STUDIO_OPTIMIZATION_IMPACT_STATUSES = ["IMPROVED", "DECLINED", "MIXED", "UNCHANGED", "INSUFFICIENT_DATA"] as const;

export type StudioOptimizationDecision = typeof STUDIO_OPTIMIZATION_DECISIONS[number];
export type StudioOptimizationLearningSignal = typeof STUDIO_OPTIMIZATION_LEARNING_SIGNALS[number];
export type StudioOptimizationImpactStatus = typeof STUDIO_OPTIMIZATION_IMPACT_STATUSES[number];

export type StudioOptimizationMetricSnapshot = Readonly<{
  cost: number | null;
  quality: number | null;
  efficiency: number | null;
  revisionRate: number | null;
}>;

export type StudioOptimizationDecisionRecord = Readonly<{
  decisionId: string;
  proposalId: string;
  projectId: string;
  decision: StudioOptimizationDecision;
  reason: string;
  createdAt: string;
}>;

export type StudioOptimizationOutcomeRecord = Readonly<{
  outcomeId: string;
  proposalId: string;
  projectId: string;
  beforeMetrics: StudioOptimizationMetricSnapshot;
  afterMetrics: StudioOptimizationMetricSnapshot;
  impact: Readonly<{
    status: StudioOptimizationImpactStatus;
    costChange: number | null;
    qualityChange: number | null;
    efficiencyChange: number | null;
    revisionRateChange: number | null;
    improvedDimensions: readonly string[];
    declinedDimensions: readonly string[];
    stableDimensions: readonly string[];
  }>;
  qualityChange: number | null;
  createdAt: string;
}>;

export type StudioOptimizationHistoryBundle = Readonly<{
  projectId: string;
  history: readonly Readonly<{
    proposal: StudioCreativeOptimizationProposal;
    decision: StudioOptimizationDecisionRecord | null;
    decisions: readonly StudioOptimizationDecisionRecord[];
    outcomes: readonly StudioOptimizationOutcomeRecord[];
    learningSignal: StudioOptimizationLearningSignal;
  }>[];
  metrics: Readonly<{
    proposalCount: number;
    decisionCount: number;
    outcomeCount: number;
    adoptionRate: number;
    effectiveRate: number;
  }>;
  learningSignals: readonly Readonly<{
    proposalId: string;
    optimizationType: string;
    signal: StudioOptimizationLearningSignal;
    sampleSize: number;
  }>[];
  generatedAt: string;
  privacy: "CURRENT_USER_CURRENT_PROJECT_OPTIMIZATION_HISTORY_ONLY";
  learningBoundary: "READ_ONLY_SIGNALS_NO_OPTIMIZATION_NO_WORKFLOW_OR_MODEL_MUTATION_NO_EXECUTION";
}>;

export function studioOptimizationLearningLabel(signal: StudioOptimizationLearningSignal) {
  return signal.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

export function studioOptimizationDelta(value: number | null, suffix = "") {
  if (value === null) return "Not measured";
  return `${value > 0 ? "+" : ""}${Number(value.toFixed(2))}${suffix}`;
}
