export const STUDIO_EFFICIENCY_INSIGHT_TYPES = [
  "WORKFLOW_BOTTLENECK",
  "TASK_DELAY",
  "HIGH_REVISION_AREA",
  "COST_INEFFICIENCY",
  "QUALITY_DROP",
] as const;

export type StudioEfficiencyInsightType = typeof STUDIO_EFFICIENCY_INSIGHT_TYPES[number];

export type StudioProductionEfficiencyRecord = Readonly<{
  projectId: string;
  workflowId: string;
  workflowMetrics: Readonly<{
    averageCompletionMs: number | null;
    revisionCount: number;
    modificationRate: number;
    successRate: number;
    failureRate: number;
  }>;
  taskMetrics: Readonly<{
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageWaitMs: number | null;
    failureRate: number;
    humanInterventions: number;
    waitingHumanTasks: number;
  }>;
  executionMetrics: Readonly<{
    totalExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
    averageRuntimeMs: number | null;
    averageProviderLatencyMs: number | null;
  }>;
  costMetrics: Readonly<{
    shadowCredits: number;
    providerCost: number | null;
    providerCostCurrency: string | null;
    costStatus: "VERIFIED" | "PARTIAL" | "QUOTE_ONLY" | "UNKNOWN";
    confidence: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
    creditsPerCompletedExecution: number | null;
  }>;
  qualityMetrics: Readonly<{
    averageRating: number | null;
    qualityScore: number;
    feedbackCount: number;
    revisionRate: number;
  }>;
  assetMetrics: Readonly<{
    assetCount: number;
    reuseOpportunityCount: number;
    averageReuseScore: number | null;
  }>;
  createdAt: string;
}>;

export type StudioEfficiencyInsight = Readonly<{
  insightId: string;
  projectId: string;
  workflowId: string;
  type: StudioEfficiencyInsightType;
  severity: "HIGH" | "MEDIUM";
  message: string;
  suggestion: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidence: Readonly<Record<string, string | number | null>>;
  createdAt: string;
}>;

export type StudioProductionEfficiency = Readonly<{
  snapshotId: string;
  portfolioId: string;
  records: readonly StudioProductionEfficiencyRecord[];
  insights: readonly StudioEfficiencyInsight[];
  summary: Readonly<{
    projectCount: number;
    workflowCount: number;
    insightCount: number;
    bottleneckCount: number;
    totalShadowCredits: number;
    overallSuccessRate: number;
  }>;
  generatedAt: string;
  privacy: "CURRENT_USER_PROJECTS_AND_EFFICIENCY_METADATA_ONLY";
  actionBoundary: "PREVIEW_CONFIRM_CREATES_EFFICIENCY_OPTIMIZATION_DRAFT_ONLY";
}>;

export function studioEfficiencyInsightLabel(type: StudioEfficiencyInsightType) {
  return type.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

export function studioEfficiencyDuration(milliseconds: number | null) {
  if (milliseconds === null) return "No data";
  if (milliseconds < 60_000) return `${Math.round(milliseconds / 1000)}s`;
  if (milliseconds < 3_600_000) return `${Math.round(milliseconds / 60_000)}m`;
  return `${(milliseconds / 3_600_000).toFixed(1)}h`;
}
