export const STUDIO_COPILOT_SUGGESTION_TYPES = [
  "NEXT_STEP",
  "STYLE_IMPROVEMENT",
  "WORKFLOW_SUGGESTION",
  "COST_WARNING",
  "QUALITY_WARNING",
  "STRATEGY_PROPOSAL",
  "FUTURE_PLAN_PROPOSAL",
  "GOAL_ALIGNMENT_REVIEW",
  "PORTFOLIO_PRIORITY_SUGGESTION",
  "RESOURCE_REUSE_SUGGESTION",
  "PRODUCTION_EFFICIENCY_SUGGESTION",
  "CREATIVE_QUALITY_SUGGESTION",
] as const;

export type StudioCopilotSuggestionType = typeof STUDIO_COPILOT_SUGGESTION_TYPES[number];
export type StudioCopilotSuggestionAction = "ACCEPT" | "DISMISS";

export const STUDIO_COPILOT_ACTION_TYPES = [
  "CREATE_DRAFT",
  "IMPROVE_PLAN",
  "REVIEW_WORKFLOW",
  "CHECK_COST",
  "CHECK_QUALITY",
  "REVIEW_STRATEGY",
  "REVIEW_FUTURE_PLAN",
  "REVIEW_GOALS",
  "REVIEW_PORTFOLIO",
  "REVIEW_ASSET_REUSE",
  "REVIEW_EFFICIENCY",
  "REVIEW_CREATIVE_QUALITY",
] as const;

export const STUDIO_COPILOT_DRAFT_TYPES = [
  "CHARACTER_DRAFT",
  "STORYBOARD_DRAFT",
  "WORKFLOW_DRAFT",
  "PROMPT_DRAFT",
  "STRATEGY_DRAFT",
  "FUTURE_PLAN_DRAFT",
  "GOAL_REVIEW_DRAFT",
  "PORTFOLIO_STRATEGY_DRAFT",
  "ASSET_REUSE_DRAFT",
  "EFFICIENCY_OPTIMIZATION_DRAFT",
  "QUALITY_IMPROVEMENT_DRAFT",
] as const;

export type StudioCopilotActionType = typeof STUDIO_COPILOT_ACTION_TYPES[number];
export type StudioCopilotDraftType = typeof STUDIO_COPILOT_DRAFT_TYPES[number];
export type StudioCopilotActionStatus = "SUGGESTED" | "PREVIEWED" | "CONFIRMED" | "DISMISSED";

export type StudioCopilotSuggestion = Readonly<{
  suggestionId: string;
  type: StudioCopilotSuggestionType;
  message: string;
  source: string;
  sourceId: string | null;
  goalAlignment: Readonly<{
    status: "ALIGNED" | "PARTIAL" | "MISALIGNED";
    missionId: string;
    goalIds: readonly string[];
    alignmentId: string | null;
  }>;
  portfolioContext: Readonly<{
    portfolioId: string;
    goals: readonly ("GROWTH" | "BRAND_BUILDING" | "CONTENT_SCALE" | "EFFICIENCY")[];
    projectPriority: "HIGH" | "MEDIUM" | "LOW";
    projectRole: "STRATEGIC_ANCHOR" | "SUPPORTING" | "EXPERIMENTAL";
    relatedInsightIds: readonly string[];
  }>;
  resourceContext: Readonly<{
    assetIds: readonly string[];
    relatedInsightIds: readonly string[];
    highestReuseScore: number;
  }>;
  efficiencyContext: Readonly<{
    workflowIds: readonly string[];
    relatedInsightIds: readonly string[];
    bottleneckCount: number;
  }>;
  qualityContext: Readonly<{
    evaluationIds: readonly string[];
    relatedIssueIds: readonly string[];
    averageOutputQuality: number | null;
  }>;
  createdAt: string;
}>;

export type StudioCopilotDraft = Readonly<{
  draftId: string;
  suggestionId: string;
  type: StudioCopilotSuggestionType;
  message: string;
  source: string;
  sourceId?: string | null;
  actionId?: string;
  actionType?: StudioCopilotActionType;
  draftType?: StudioCopilotDraftType;
  impactScope?: string;
  status: "DRAFT";
  createdAt: string;
}>;

export type StudioCopilotAction = Readonly<{
  actionId: string;
  suggestionId: string;
  type: StudioCopilotActionType;
  payload: Readonly<{
    draftType: StudioCopilotDraftType;
    reason: string;
    impactScope: string;
    requiresConfirmation: true;
    existingFlowTarget: "PROJECT_COPILOT_DRAFT_REVIEW";
  }>;
  status: StudioCopilotActionStatus;
  draft: StudioCopilotDraft | null;
  createdAt: string;
  updatedAt: string | null;
}>;

export type StudioProjectCopilotState = Readonly<{
  projectId: string;
  summary: string;
  currentGoal: string;
  suggestions: readonly StudioCopilotSuggestion[];
  actions: readonly StudioCopilotAction[];
  pendingActions: readonly StudioCopilotDraft[];
  taskStatus: Readonly<{
    total: number;
    pending: number;
    waitingHuman: number;
    completed: number;
    failed: number;
  }>;
  context: Readonly<{ memoryCount: number; workflowTemplateCount: number; insightCount: number; strategyCount: number; futurePlanCount: number; goalCount: number; resourceInsightCount: number; efficiencyInsightCount: number; qualityIssueCount: number }>;
  mission: Readonly<{ missionId: string; projectId: string; mission: string; vision: string; createdAt: string; updatedAt: string }>;
  portfolio: Readonly<{
    portfolioId: string;
    projectCount: number;
    goals: readonly ("GROWTH" | "BRAND_BUILDING" | "CONTENT_SCALE" | "EFFICIENCY")[];
    priorityMode: "SUGGESTED_NOT_APPLIED";
  }>;
  resources: Readonly<{
    assetCount: number;
    highValueAssetCount: number;
    insightCount: number;
    actionBoundary: "PREVIEW_CONFIRM_CREATES_ASSET_REUSE_DRAFT_ONLY";
  }>;
  efficiency: Readonly<{
    workflowCount: number;
    insightCount: number;
    bottleneckCount: number;
    totalShadowCredits: number;
    overallSuccessRate: number;
    actionBoundary: "PREVIEW_CONFIRM_CREATES_EFFICIENCY_OPTIMIZATION_DRAFT_ONLY";
  }>;
  quality: Readonly<{
    resultCount: number;
    issueCount: number;
    averageOutputQuality: number | null;
    averageStyleMatch: number | null;
    averageCharacterConsistency: number | null;
    feedbackRating: number | null;
    actionBoundary: "PREVIEW_CONFIRM_CREATES_QUALITY_IMPROVEMENT_DRAFT_ONLY";
  }>;
  updatedAt: string;
  privacy: "CURRENT_USER_CURRENT_PROJECT_ONLY";
  actionBoundary: "PREVIEW_CONFIRM_CREATES_DRAFT_ONLY_NO_EXECUTION";
}>;

export type StudioCopilotActionPreviewResult = Readonly<{
  action: StudioCopilotAction;
  preview: Readonly<{
    reason: string;
    impactScope: string;
    draftType: StudioCopilotDraftType;
    requiresConfirmation: true;
    safety: "NO_PROJECT_MUTATION_NO_EXECUTION_NO_PROVIDER_NO_CREDITS";
  }>;
  state: StudioProjectCopilotState;
}>;

export type StudioCopilotActionConfirmResult = Readonly<{
  action: StudioCopilotAction;
  draft: StudioCopilotDraft;
  state: StudioProjectCopilotState;
}>;

export type StudioCopilotSuggestionActionResult = Readonly<{
  action: Readonly<{
    actionId: string;
    suggestionId: string;
    decision: StudioCopilotSuggestionAction;
    draft: StudioCopilotDraft | null;
    createdAt: string;
  }>;
  state: StudioProjectCopilotState;
}>;

export function studioCopilotSuggestionLabel(type: StudioCopilotSuggestionType) {
  return ({
    NEXT_STEP: "Next step",
    STYLE_IMPROVEMENT: "Style improvement",
    WORKFLOW_SUGGESTION: "Workflow suggestion",
    COST_WARNING: "Cost warning",
    QUALITY_WARNING: "Quality warning",
    STRATEGY_PROPOSAL: "Strategy proposal",
    FUTURE_PLAN_PROPOSAL: "Future plan proposal",
    GOAL_ALIGNMENT_REVIEW: "Goal alignment review",
    PORTFOLIO_PRIORITY_SUGGESTION: "Portfolio priority suggestion",
    RESOURCE_REUSE_SUGGESTION: "Resource reuse suggestion",
    PRODUCTION_EFFICIENCY_SUGGESTION: "Production efficiency suggestion",
    CREATIVE_QUALITY_SUGGESTION: "Creative quality suggestion",
  } as const)[type];
}

export function studioCopilotActionLabel(type: StudioCopilotActionType) {
  return ({
    CREATE_DRAFT: "Create draft",
    IMPROVE_PLAN: "Improve plan",
    REVIEW_WORKFLOW: "Review workflow",
    CHECK_COST: "Check cost",
    CHECK_QUALITY: "Check quality",
    REVIEW_STRATEGY: "Review strategy",
    REVIEW_FUTURE_PLAN: "Review future plan",
    REVIEW_GOALS: "Review goals",
    REVIEW_PORTFOLIO: "Review portfolio",
    REVIEW_ASSET_REUSE: "Review asset reuse",
    REVIEW_EFFICIENCY: "Review efficiency",
    REVIEW_CREATIVE_QUALITY: "Review creative quality",
  } as const)[type];
}

export function studioCopilotDraftLabel(type: StudioCopilotDraftType | undefined) {
  if (!type) return "Draft";
  return ({
    CHARACTER_DRAFT: "Character Draft",
    STORYBOARD_DRAFT: "Storyboard Draft",
    WORKFLOW_DRAFT: "Workflow Draft",
    PROMPT_DRAFT: "Prompt Draft",
    STRATEGY_DRAFT: "Strategy Draft",
    FUTURE_PLAN_DRAFT: "Future Plan Draft",
    GOAL_REVIEW_DRAFT: "Goal Review Draft",
    PORTFOLIO_STRATEGY_DRAFT: "Portfolio Strategy Draft",
    ASSET_REUSE_DRAFT: "Asset Reuse Draft",
    EFFICIENCY_OPTIMIZATION_DRAFT: "Efficiency Optimization Draft",
    QUALITY_IMPROVEMENT_DRAFT: "Quality Improvement Draft",
  } as const)[type];
}
