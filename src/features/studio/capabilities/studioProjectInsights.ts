export const STUDIO_PROJECT_INSIGHT_TYPES = ["STYLE_INCONSISTENCY", "MISSING_REFERENCE", "WORKFLOW_RISK", "QUALITY_RISK", "COST_RISK", "CHARACTER_INCONSISTENCY"] as const;
export const STUDIO_PROJECT_INSIGHT_SEVERITIES = ["INFO", "WARNING", "CRITICAL"] as const;
export const STUDIO_PROJECT_INSIGHT_CONFIDENCE = ["HIGH", "MEDIUM", "LOW"] as const;

export type StudioProjectInsightType = typeof STUDIO_PROJECT_INSIGHT_TYPES[number];
export type StudioProjectInsightSeverity = typeof STUDIO_PROJECT_INSIGHT_SEVERITIES[number];
export type StudioProjectInsightConfidence = typeof STUDIO_PROJECT_INSIGHT_CONFIDENCE[number];

export type StudioProjectInsight = Readonly<{
  insightId: string;
  projectId: string;
  type: StudioProjectInsightType;
  severity: StudioProjectInsightSeverity;
  sourceNodes: readonly string[];
  message: string;
  confidence: StudioProjectInsightConfidence;
  createdAt: string;
}>;

export type StudioProjectInsightBundle = Readonly<{
  projectId: string;
  insights: readonly StudioProjectInsight[];
  generatedAt: string;
  privacy: "CURRENT_USER_CURRENT_PROJECT_ONLY";
  actionBoundary: "INSIGHT_TO_DRAFT_SUGGESTION_REQUIRES_PREVIEW_AND_CONFIRM";
  safety: "READ_ONLY_REASONING_NO_PROJECT_MUTATION_OR_EXECUTION";
}>;

export function studioProjectInsightLabel(type: StudioProjectInsightType) {
  return ({ STYLE_INCONSISTENCY: "Style consistency", MISSING_REFERENCE: "Missing reference", WORKFLOW_RISK: "Workflow risk", QUALITY_RISK: "Quality risk", COST_RISK: "Cost risk", CHARACTER_INCONSISTENCY: "Character consistency" } as const)[type];
}

export function studioProjectInsightAction(type: StudioProjectInsightType) {
  return ({ STYLE_INCONSISTENCY: "Improve plan Draft", MISSING_REFERENCE: "Review workflow Draft", WORKFLOW_RISK: "Review workflow Draft", QUALITY_RISK: "Check quality Draft", COST_RISK: "Check cost Draft", CHARACTER_INCONSISTENCY: "Improve plan Draft" } as const)[type];
}
