export type StudioProjectRiskStatus = "HEALTHY" | "WARNING" | "CRITICAL";
export type StudioProjectCostConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type StudioCreativeProjectSnapshot = Readonly<{
  projectId: string;
  progress: number;
  productionStats: Readonly<{
    sceneCount: number;
    shotCount: number;
    completed: number;
    running: number;
    failed: number;
    pending: number;
    status: string;
  }>;
  qualityStats: Readonly<{
    qualityScore: number | null;
    issues: number;
    reviewStatus: string;
    revisionCount: number;
    resultCount: number;
  }>;
  costStats: Readonly<{
    estimatedCost: Readonly<{
      productionCredits: number;
      revisionCredits: number;
      totalCredits: number;
    }>;
    actualCost: Readonly<{
      amount: number | null;
      currency: string | null;
      shadowCredits: number;
    }>;
    confidence: StudioProjectCostConfidence;
    knownCostRatio: number;
    unknownCost: number;
  }>;
  revisionStats: Readonly<{
    total: number;
    previewed: number;
    confirmed: number;
    blocked: number;
    latestStatus: string;
    sourceVersion: string | null;
    targetVersion: string | null;
    latestAffectedShots: readonly string[];
  }>;
  riskStats: Readonly<{
    productionRisk: readonly string[];
    qualityRisk: readonly string[];
    costRisk: readonly string[];
    revisionRisk: readonly string[];
    total: number;
    status: StudioProjectRiskStatus;
  }>;
  deliveryStats: Readonly<{
    versions: number;
    latestVersion: string | null;
    status: string;
  }>;
  timelineStats: Readonly<{
    totalResults: number;
    completedClips: number;
    missingResults: number;
  }>;
  copilotInsights: readonly Readonly<{
    insightId: string;
    type: string;
    severity: string;
    message: string;
    confidence: string;
    source: string;
    actionBoundary: "DRAFT_ONLY";
  }>[];
  updatedAt: string;
  privacy: "CURRENT_USER_CURRENT_PROJECT_AGGREGATES_ONLY";
  controlBoundary: Readonly<{
    readOnly: true;
    insightDraftOnly: true;
    productionMutation: false;
    workflowMutation: false;
    automaticExecution: false;
    automaticGeneration: false;
    creditsDeducted: false;
  }>;
}>;

export function formatProjectMetricLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}
