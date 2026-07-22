export const STUDIO_PROJECT_STRATEGY_TYPES = [
  "QUALITY_IMPROVEMENT",
  "COST_OPTIMIZATION",
  "STYLE_ALIGNMENT",
  "WORKFLOW_OPTIMIZATION",
  "CONTENT_DIRECTION",
] as const;
export const STUDIO_PROJECT_STRATEGY_CONFIDENCE = ["HIGH", "MEDIUM", "LOW"] as const;

export type StudioProjectStrategyType = typeof STUDIO_PROJECT_STRATEGY_TYPES[number];
export type StudioProjectStrategyConfidence = typeof STUDIO_PROJECT_STRATEGY_CONFIDENCE[number];

export type StudioProjectStrategyProposal = Readonly<{
  strategyId: string;
  projectId: string;
  type: StudioProjectStrategyType;
  goal: string;
  recommendations: readonly string[];
  supportingInsights: readonly string[];
  confidence: StudioProjectStrategyConfidence;
  createdAt: string;
}>;

export type StudioProjectStrategyBundle = Readonly<{
  projectId: string;
  goal: string;
  strategies: readonly StudioProjectStrategyProposal[];
  generatedAt: string;
  privacy: "CURRENT_USER_CURRENT_PROJECT_ONLY";
  actionBoundary: "STRATEGY_PREVIEW_CONFIRM_CREATES_DRAFT_ONLY";
  safety: "NO_PROJECT_OR_WORKFLOW_MUTATION_NO_EXECUTION_NO_PROVIDER_NO_CREDITS";
}>;

export function studioProjectStrategyLabel(type: StudioProjectStrategyType) {
  return ({
    QUALITY_IMPROVEMENT: "Quality improvement",
    COST_OPTIMIZATION: "Cost optimization",
    STYLE_ALIGNMENT: "Style alignment",
    WORKFLOW_OPTIMIZATION: "Workflow optimization",
    CONTENT_DIRECTION: "Content direction",
  } as const)[type];
}
