export const STUDIO_PROJECT_RECOMMENDATION_TYPES = [
  "QUALITY_ACTION",
  "COST_ACTION",
  "WORKFLOW_ACTION",
  "REVISION_ACTION",
  "DELIVERY_ACTION",
] as const;

export type StudioProjectRecommendationType = typeof STUDIO_PROJECT_RECOMMENDATION_TYPES[number];
export type StudioProjectRecommendationConfidence = "HIGH" | "MEDIUM" | "LOW";
export type StudioProjectRecommendationPriority = "HIGH" | "MEDIUM" | "LOW";

export type StudioProjectRecommendationEvidence = Readonly<{
  source: string;
  metric: string;
  value: string | number;
  reference: string;
}>;

export type StudioProjectCopilotRecommendation = Readonly<{
  recommendationId: string;
  type: StudioProjectRecommendationType;
  title: string;
  message: string;
  evidence: readonly StudioProjectRecommendationEvidence[];
  confidence: StudioProjectRecommendationConfidence;
  priority: StudioProjectRecommendationPriority;
  actionType: "PROJECT_ACTION_DRAFT";
  requiresPreview: true;
  requiresConfirmation: true;
  action: Readonly<{
    actionId: string;
    status: "PREVIEWED" | "CONFIRMED";
    draftId: string | null;
  }> | null;
}>;

export type StudioProjectCopilotSnapshot = Readonly<{
  projectId: string;
  health: Readonly<{
    score: number;
    status: "EXCELLENT" | "HEALTHY" | "WATCH" | "RISK" | "INSUFFICIENT_DATA";
    progress: number;
    qualityScore: number | null;
    completionRate: number;
    riskStatus: "HEALTHY" | "WARNING" | "CRITICAL";
  }>;
  insights: readonly Readonly<{
    insightId: string;
    type: string;
    severity: string;
    summary: string;
    confidence: string;
    evidence: string;
    actionBoundary: "DRAFT_ONLY";
  }>[];
  risks: readonly Readonly<{
    category: "PRODUCTION" | "QUALITY" | "COST" | "REVISION";
    type: string;
    severity: "WARNING" | "CRITICAL";
    evidence: string;
  }>[];
  recommendations: readonly StudioProjectCopilotRecommendation[];
  updatedAt: string;
  controlBoundary: Readonly<{
    analysisOnly: true;
    draftOnly: true;
    projectMutation: false;
    workflowExecution: false;
    automaticGeneration: false;
    automaticPublish: false;
    creditsDeducted: false;
  }>;
}>;

export type StudioProjectActionDraft = Readonly<{
  draftId: string;
  projectId: string;
  suggestionId: string;
  actionId: string;
  actionType: "PROJECT_ACTION_DRAFT";
  draftType: "PROJECT_ACTION_DRAFT";
  recommendationType: StudioProjectRecommendationType;
  title: string;
  message: string;
  evidence: readonly StudioProjectRecommendationEvidence[];
  confidence: StudioProjectRecommendationConfidence;
  source: "PROJECT_COPILOT_CENTER";
  sourceId: string;
  impactScope: "PROJECT_REVIEW_DRAFT_ONLY";
  status: "DRAFT";
  createdAt: string;
}>;

export type StudioProjectActionPreview = Readonly<{
  action: Readonly<{
    actionId: string;
    suggestionId: string;
    type: "PROJECT_ACTION_DRAFT";
    status: "PREVIEWED" | "CONFIRMED";
  }>;
  preview: Readonly<{
    draftType: "PROJECT_ACTION_DRAFT";
    recommendationType: StudioProjectRecommendationType;
    title: string;
    reason: string;
    evidence: readonly StudioProjectRecommendationEvidence[];
    confidence: StudioProjectRecommendationConfidence;
    impactScope: "PROJECT_REVIEW_DRAFT_ONLY";
    requiresConfirmation: true;
    safety: "NO_PROJECT_MUTATION_NO_EXECUTION_NO_GENERATION_NO_PUBLISH_NO_CREDITS";
  }>;
  draft: StudioProjectActionDraft | null;
}>;

export function studioProjectRecommendationLabel(type: StudioProjectRecommendationType) {
  return ({
    QUALITY_ACTION: "Quality action",
    COST_ACTION: "Cost action",
    WORKFLOW_ACTION: "Workflow action",
    REVISION_ACTION: "Revision action",
    DELIVERY_ACTION: "Delivery action",
  } as const)[type];
}
