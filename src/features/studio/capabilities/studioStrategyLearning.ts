import type { StudioProjectStrategyProposal } from "@/features/studio/capabilities/studioProjectStrategies";

export const STUDIO_STRATEGY_DECISIONS = ["ACCEPTED", "REJECTED", "MODIFIED", "IGNORED"] as const;
export const STUDIO_STRATEGY_EXECUTION_RESULTS = ["COMPLETED", "FAILED", "PARTIAL", "UNKNOWN"] as const;
export const STUDIO_STRATEGY_QUALITY_SIGNALS = ["IMPROVED", "STABLE", "DECLINED", "UNKNOWN"] as const;

export type StudioStrategyDecision = typeof STUDIO_STRATEGY_DECISIONS[number];
export type StudioStrategyExecutionResultStatus = typeof STUDIO_STRATEGY_EXECUTION_RESULTS[number];
export type StudioStrategyQualitySignal = typeof STUDIO_STRATEGY_QUALITY_SIGNALS[number];

export type StudioStrategyDecisionRecord = Readonly<{
  decisionId: string;
  strategyId: string;
  projectId: string;
  decision: StudioStrategyDecision;
  reason: string;
  createdAt: string;
}>;

export type StudioStrategyOutcomeRecord = Readonly<{
  outcomeId: string;
  strategyId: string;
  projectId: string;
  executionResult: Readonly<{
    executionId: string | null;
    jobId: string | null;
    status: StudioStrategyExecutionResultStatus;
    completedAt: string | null;
  }>;
  qualitySignal: StudioStrategyQualitySignal;
  feedback: Readonly<{ rating: number | null; feedbackType: string | null; revisionRequired: boolean }> | null;
  createdAt: string;
}>;

export type StudioStrategyHistoryBundle = Readonly<{
  projectId: string;
  history: readonly Readonly<{
    strategy: StudioProjectStrategyProposal;
    decision: StudioStrategyDecisionRecord | null;
    decisions: readonly StudioStrategyDecisionRecord[];
    outcomes: readonly StudioStrategyOutcomeRecord[];
    effect: "POSITIVE" | "MIXED" | "NEGATIVE" | "PENDING";
  }>[];
  metrics: Readonly<{
    strategyCount: number;
    outcomeCount: number;
    acceptanceRate: number;
    successRate: number;
    qualityImprovement: number;
    userRating: number | null;
    revisionRate: number;
  }>;
  learningSignals: readonly Readonly<{ strategyType: string; strategyId: string; signal: string; sampleSize: number }>[];
  generatedAt: string;
  privacy: "CURRENT_USER_CURRENT_PROJECT_ONLY";
  learningBoundary: "READ_ONLY_SIGNALS_NO_RULE_OR_WORKFLOW_MUTATION";
}>;
