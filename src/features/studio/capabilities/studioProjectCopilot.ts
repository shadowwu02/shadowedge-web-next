export const STUDIO_COPILOT_SUGGESTION_TYPES = [
  "NEXT_STEP",
  "STYLE_IMPROVEMENT",
  "WORKFLOW_SUGGESTION",
  "COST_WARNING",
  "QUALITY_WARNING",
] as const;

export type StudioCopilotSuggestionType = typeof STUDIO_COPILOT_SUGGESTION_TYPES[number];
export type StudioCopilotSuggestionAction = "ACCEPT" | "DISMISS";

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
  status: "DRAFT";
  createdAt: string;
}>;

export type StudioProjectCopilotState = Readonly<{
  projectId: string;
  summary: string;
  currentGoal: string;
  suggestions: readonly StudioCopilotSuggestion[];
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
  actionBoundary: "ACCEPT_CREATES_DRAFT_ONLY_NO_EXECUTION";
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
