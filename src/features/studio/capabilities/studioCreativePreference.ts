export const STUDIO_CREATIVE_PREFERENCE_TYPES = [
  "STYLE_PREFERENCE",
  "WORKFLOW_PREFERENCE",
  "QUALITY_PREFERENCE",
  "COST_PREFERENCE",
  "SPEED_PREFERENCE",
  "MODEL_PREFERENCE",
] as const;

export const STUDIO_CREATIVE_PREFERENCE_CONFIDENCE = [
  "EXPLICIT",
  "STRONG_SIGNAL",
  "WEAK_SIGNAL",
] as const;

export type StudioCreativePreferenceType = typeof STUDIO_CREATIVE_PREFERENCE_TYPES[number];
export type StudioCreativePreferenceConfidence = typeof STUDIO_CREATIVE_PREFERENCE_CONFIDENCE[number];

export type StudioCreativePreference = Readonly<{
  preferenceId: string;
  type: StudioCreativePreferenceType;
  value: string;
  confidence: StudioCreativePreferenceConfidence;
  sources: readonly Readonly<{
    type: string;
    sourceId: string;
    projectId: string | null;
    label: string;
    confirmedAt: string | null;
  }>[];
  updatedAt: string;
}>;

export type StudioCreativePreferenceProfile = Readonly<{
  profileId: string;
  userId: string;
  preferences: readonly StudioCreativePreference[];
  confidence: StudioCreativePreferenceConfidence;
  sources: readonly string[];
  updatedAt: string;
  separation: Readonly<{
    userPreference: "REUSABLE_USER_LEVEL_ONLY";
    projectExperience: "EVIDENCE_SOURCE_NOT_COPIED";
    singleStrategy: "PROJECT_SCOPED_NOT_PROMOTED_AUTOMATICALLY";
  }>;
  privacy: "CURRENT_USER_ONLY_NO_SENSITIVE_INFERENCE_NO_CROSS_USER_LEARNING";
  actionBoundary: "VIEW_OR_DELETE_ONLY_NO_AUTOMATIC_PROFILE_MUTATION_NO_EXECUTION";
}>;

export function studioCreativePreferenceLabel(type: StudioCreativePreferenceType) {
  return ({
    STYLE_PREFERENCE: "Style",
    WORKFLOW_PREFERENCE: "Workflow",
    QUALITY_PREFERENCE: "Quality",
    COST_PREFERENCE: "Cost",
    SPEED_PREFERENCE: "Speed",
    MODEL_PREFERENCE: "Model",
  } as const)[type];
}

export function studioCreativePreferenceConfidenceLabel(confidence: StudioCreativePreferenceConfidence) {
  return ({
    EXPLICIT: "Set by you",
    STRONG_SIGNAL: "Strong signal",
    WEAK_SIGNAL: "Early signal",
  } as const)[confidence];
}
