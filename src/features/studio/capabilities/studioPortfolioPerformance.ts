export const STUDIO_PORTFOLIO_PERFORMANCE_METRICS = [
  "QUALITY_SCORE",
  "DELIVERY_SUCCESS",
  "CLIENT_FEEDBACK",
  "REVISION_RATE",
  "COST_EFFICIENCY",
  "WORKFLOW_SUCCESS",
] as const;

export type StudioPortfolioPerformanceMetric =
  typeof STUDIO_PORTFOLIO_PERFORMANCE_METRICS[number];
export type StudioPortfolioPerformanceConfidence = "HIGH" | "MEDIUM" | "LOW";

export type StudioPortfolioPerformanceSnapshot = Readonly<{
  portfolioId: string;
  projects: readonly Readonly<{
    projectId: string;
    name: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    progress: number;
    rank: number;
    performanceScore: number | null;
    metrics: readonly Readonly<{
      metric: StudioPortfolioPerformanceMetric;
      value: number | null;
      score: number | null;
      unit: string;
    }>[];
    qualityScore: number | null;
    deliveryVersions: number;
    deliveryStatus: string;
    feedbackRating: number | null;
    revisionRate: number;
    revisionCount: number;
    estimatedCredits: number;
    actualCredits: number;
    costConfidence: string;
    workflowSuccess: number | null;
    riskFlags: readonly string[];
    evidenceCount: number;
    status: "ANALYZED_NOT_APPLIED";
  }>[];
  quality: Readonly<{
    averageScore: number | null;
    highQualityProjects: number;
    atRiskProjects: number;
  }>;
  cost: Readonly<{
    estimatedCredits: number;
    actualCredits: number;
    averageEfficiency: number | null;
    confidence: string;
    unknownCost: number;
  }>;
  delivery: Readonly<{
    totalVersions: number;
    successfulProjects: number;
    successRate: number | null;
  }>;
  feedback: Readonly<{
    averageRating: number | null;
    ratedProjects: number;
    positiveProjects: number;
  }>;
  revision: Readonly<{
    total: number;
    averageRate: number | null;
    highRevisionProjects: number;
  }>;
  successSignals: readonly Readonly<{
    signalId: string;
    type: string;
    projectIds: readonly string[];
    message: string;
    status: "OBSERVED_NOT_APPLIED";
  }>[];
  confidence: StudioPortfolioPerformanceConfidence;
  createdAt: string;
  benchmarks: readonly Readonly<{
    benchmarkId: string;
    metric: StudioPortfolioPerformanceMetric;
    average: number | null;
    leader: Readonly<{
      projectId: string;
      name: string;
      score: number;
    }> | null;
    spread: number;
    sampleSize: number;
    confidence: StudioPortfolioPerformanceConfidence;
    comparison: readonly Readonly<{
      projectId: string;
      name: string;
      score: number;
    }>[];
    status: "BENCHMARK_SUGGESTION_ONLY";
  }>[];
  insights: readonly Readonly<{
    insightId: string;
    type: string;
    message: string;
    projectIds: readonly string[];
    confidence: StudioPortfolioPerformanceConfidence;
    actionBoundary: "DRAFT_ONLY";
  }>[];
  risks: readonly string[];
  evidence: readonly Readonly<{
    evidenceId: string;
    type: "PORTFOLIO_STRATEGY" | "PORTFOLIO_RESOURCE" | "PROJECT_PERFORMANCE";
    projectIds: readonly string[];
    summary: string;
    confidence: StudioPortfolioPerformanceConfidence;
  }>[];
  privacy: "CURRENT_USER_PORTFOLIO_PERFORMANCE_ONLY";
  analysisMode: "READ_ONLY_BENCHMARK_SUGGESTIONS";
  action: Readonly<{
    actionId: string;
    status: "PREVIEWED" | "CONFIRMED";
    draft: StudioPortfolioPerformanceDraft | null;
  }> | null;
  controlBoundary: Readonly<{
    analysisOnly: true;
    projectClosure: false;
    priorityMutation: false;
    resourceMovement: false;
    workflowMutation: false;
    automaticExecution: false;
    creditsDeducted: false;
  }>;
}>;

export type StudioPortfolioPerformanceDraft = Readonly<{
  draftId: string;
  portfolioId: string;
  actionId: string;
  draftType: "PORTFOLIO_PERFORMANCE_DRAFT";
  benchmarks: StudioPortfolioPerformanceSnapshot["benchmarks"];
  insights: StudioPortfolioPerformanceSnapshot["insights"];
  successSignals: StudioPortfolioPerformanceSnapshot["successSignals"];
  evidence: StudioPortfolioPerformanceSnapshot["evidence"];
  status: "DRAFT";
  createdAt: string;
}>;

export type StudioPortfolioPerformancePreview = Readonly<{
  performance: StudioPortfolioPerformanceSnapshot;
  action: Readonly<{
    actionId: string;
    status: "PREVIEWED" | "CONFIRMED";
  }>;
  preview: Readonly<{
    draftType: "PORTFOLIO_PERFORMANCE_DRAFT";
    portfolioId: string;
    benchmarks: StudioPortfolioPerformanceSnapshot["benchmarks"];
    insights: StudioPortfolioPerformanceSnapshot["insights"];
    successSignals: StudioPortfolioPerformanceSnapshot["successSignals"];
    risks: readonly string[];
    impactScope: "PORTFOLIO_PERFORMANCE_DRAFT_ONLY";
    requiresConfirmation: true;
  }>;
  draft: StudioPortfolioPerformanceDraft | null;
}>;

export function studioPortfolioPerformanceLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}
