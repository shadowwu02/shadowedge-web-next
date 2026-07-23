export const STUDIO_ADAPTATION_TYPES = [
  "WORKFLOW_STYLE_ADAPTATION",
  "QUALITY_LEVEL_ADAPTATION",
  "COST_LEVEL_ADAPTATION",
  "SPEED_LEVEL_ADAPTATION",
  "MODEL_PREFERENCE_ALIGNMENT",
] as const;

export type StudioAdaptationType = typeof STUDIO_ADAPTATION_TYPES[number];
export type StudioAdaptiveSuggestionStatus = "RECOMMENDED" | "PREFERENCE_CONFLICT";

export type StudioAdaptivePlanSuggestion = Readonly<{
  suggestionId: string;
  projectId: string;
  adaptationType: StudioAdaptationType;
  status: StudioAdaptiveSuggestionStatus;
  preferenceSignals: readonly Readonly<{
    preferenceId: string;
    type: string;
    value: string;
    confidence: "EXPLICIT" | "STRONG_SIGNAL" | "WEAK_SIGNAL";
    sourceTypes: readonly string[];
  }>[];
  recommendedChanges: readonly Readonly<{
    message: string;
    boundary: "DRAFT_ONLY";
  }>[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
  conflict: Readonly<{
    code: "PREFERENCE_CONFLICT";
    preference: readonly string[];
    projectGoals: readonly string[];
    resolution: "USER_REVIEW_REQUIRED_NO_AUTOMATIC_CHOICE";
  }> | null;
  evidence: Readonly<{
    goalIds: readonly string[];
    experienceIds: readonly string[];
    context: Readonly<{
      visualStyle: string;
      preferredModels: readonly string[];
      creativeGoals: readonly string[];
    }>;
  }>;
  createdAt: string;
}>;

export type StudioAdaptivePlanningBundle = Readonly<{
  projectId: string;
  suggestions: readonly StudioAdaptivePlanSuggestion[];
  summary: Readonly<{
    total: number;
    conflicts: number;
    highConfidence: number;
  }>;
  inputs: Readonly<{
    preferenceProfileId: string;
    preferenceCount: number;
    experienceIds: readonly string[];
    goalIds: readonly string[];
    projectContextUpdatedAt: string | null;
  }>;
  generatedAt: string;
  privacy: "CURRENT_USER_CURRENT_PROJECT_PLUS_OWN_EXPERIENCE_ONLY";
  actionBoundary: "SUGGESTION_ONLY_PREVIEW_CONFIRM_CREATES_ADAPTIVE_PLAN_DRAFT_NO_WORKFLOW_OR_MODEL_MUTATION_NO_EXECUTION";
}>;

export function studioAdaptationLabel(type: StudioAdaptationType) {
  return ({
    WORKFLOW_STYLE_ADAPTATION: "Workflow & style",
    QUALITY_LEVEL_ADAPTATION: "Quality level",
    COST_LEVEL_ADAPTATION: "Cost level",
    SPEED_LEVEL_ADAPTATION: "Planning speed",
    MODEL_PREFERENCE_ALIGNMENT: "Model alignment",
  } as const)[type];
}
