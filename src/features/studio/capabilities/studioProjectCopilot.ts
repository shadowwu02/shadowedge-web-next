export const STUDIO_COPILOT_SUGGESTION_TYPES = [
  "NEXT_STEP",
  "STYLE_IMPROVEMENT",
  "WORKFLOW_SUGGESTION",
  "COST_WARNING",
  "QUALITY_WARNING",
] as const;

export type StudioCopilotSuggestionType = typeof STUDIO_COPILOT_SUGGESTION_TYPES[number];
export type StudioCopilotSuggestionAction = "ACCEPT" | "DISMISS";

export const STUDIO_COPILOT_ACTION_TYPES = [
  "CREATE_DRAFT",
  "IMPROVE_PLAN",
  "REVIEW_WORKFLOW",
  "CHECK_COST",
  "CHECK_QUALITY",
] as const;

export const STUDIO_COPILOT_DRAFT_TYPES = [
  "CHARACTER_DRAFT",
  "STORYBOARD_DRAFT",
  "WORKFLOW_DRAFT",
  "PROMPT_DRAFT",
] as const;

export type StudioCopilotActionType = typeof STUDIO_COPILOT_ACTION_TYPES[number];
export type StudioCopilotDraftType = typeof STUDIO_COPILOT_DRAFT_TYPES[number];
export type StudioCopilotActionStatus = "SUGGESTED" | "PREVIEWED" | "CONFIRMED" | "DISMISSED";

export type StudioCopilotSuggestion = Readonly<{
  suggestionId: string;
  type: StudioCopilotSuggestionType;
  message: string;
  source: string;
  createdAt: string;
}>;

export type StudioCopilotDraft = Readonly<{
  draftId: string;
  suggestionId: string;
  type: StudioCopilotSuggestionType;
  message: string;
  source: string;
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
  context: Readonly<{ memoryCount: number; workflowTemplateCount: number }>;
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
  } as const)[type];
}

export function studioCopilotActionLabel(type: StudioCopilotActionType) {
  return ({
    CREATE_DRAFT: "Create draft",
    IMPROVE_PLAN: "Improve plan",
    REVIEW_WORKFLOW: "Review workflow",
    CHECK_COST: "Check cost",
    CHECK_QUALITY: "Check quality",
  } as const)[type];
}

export function studioCopilotDraftLabel(type: StudioCopilotDraftType | undefined) {
  if (!type) return "Draft";
  return ({
    CHARACTER_DRAFT: "Character Draft",
    STORYBOARD_DRAFT: "Storyboard Draft",
    WORKFLOW_DRAFT: "Workflow Draft",
    PROMPT_DRAFT: "Prompt Draft",
  } as const)[type];
}
