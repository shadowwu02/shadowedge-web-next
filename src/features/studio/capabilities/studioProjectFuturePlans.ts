export const STUDIO_PROJECT_FUTURE_PLAN_TYPES = ["NEXT_PHASE", "CONTENT_EXPANSION", "QUALITY_IMPROVEMENT", "WORKFLOW_EVOLUTION", "COST_OPTIMIZATION"] as const;
export const STUDIO_PROJECT_FUTURE_PLAN_CONFIDENCE = ["HIGH", "MEDIUM", "LOW"] as const;

export type StudioProjectFuturePlanType = typeof STUDIO_PROJECT_FUTURE_PLAN_TYPES[number];
export type StudioProjectFuturePlanConfidence = typeof STUDIO_PROJECT_FUTURE_PLAN_CONFIDENCE[number];

export type StudioProjectFuturePlanProposal = Readonly<{
  proposalId: string;
  projectId: string;
  type: StudioProjectFuturePlanType;
  currentState: string;
  futureGoal: string;
  recommendedSteps: readonly string[];
  supportingEvidence: readonly Readonly<{ type: string; sourceId: string; label?: string }>[];
  confidence: StudioProjectFuturePlanConfidence;
  createdAt: string;
}>;

export type StudioProjectFuturePlansBundle = Readonly<{
  projectId: string;
  plans: readonly StudioProjectFuturePlanProposal[];
  generatedAt: string;
  privacy: "CURRENT_USER_CURRENT_PROJECT_ONLY";
  planningBoundary: "PROPOSAL_PREVIEW_CONFIRM_CREATES_FUTURE_PLAN_DRAFT_ONLY";
  safety: "NO_PROJECT_GOAL_OR_WORKFLOW_MUTATION_NO_EXECUTION_NO_PROVIDER_NO_CREDITS";
}>;

export function studioProjectFuturePlanLabel(type: StudioProjectFuturePlanType) {
  return ({ NEXT_PHASE: "Next phase", CONTENT_EXPANSION: "Content expansion", QUALITY_IMPROVEMENT: "Quality improvement", WORKFLOW_EVOLUTION: "Workflow evolution", COST_OPTIMIZATION: "Cost optimization" } as const)[type];
}
