export const STUDIO_USER_CREATIVE_EXPERIENCE_TYPES = [
  "SUCCESSFUL_WORKFLOW",
  "EFFECTIVE_STRATEGY",
  "EFFECTIVE_OPTIMIZATION",
  "STYLE_PATTERN",
  "RESOURCE_PATTERN",
] as const;

export type StudioUserCreativeExperienceType = typeof STUDIO_USER_CREATIVE_EXPERIENCE_TYPES[number];
export type StudioExperienceConfidence = "HIGH" | "MEDIUM" | "LOW";

export type StudioUserCreativeExperience = Readonly<{
  experienceId: string;
  userId: string;
  sourceProjectId: string;
  sourceProjectName: string;
  type: StudioUserCreativeExperienceType;
  signal: string;
  confidence: StudioExperienceConfidence;
  summary: string;
  evidence: Readonly<Record<string, unknown>>;
  createdAt: string;
}>;

export type StudioUserCreativePatterns = Readonly<{
  userId: string;
  currentProjectId: string | null;
  experiences: readonly StudioUserCreativeExperience[];
  summary: Readonly<{
    total: number;
    highConfidence: number;
    byType: Readonly<Record<StudioUserCreativeExperienceType, number>>;
  }>;
  retrieval: Readonly<{
    retrievalId: string;
    eventType: "COPILOT_EXPERIENCE_RETRIEVED";
    createdAt: string;
  }>;
  privacy: "CURRENT_USER_PROJECTS_ONLY_NO_CROSS_USER_OR_ACCOUNT_LEARNING";
  recommendationBoundary: "SUGGESTION_ONLY_PREVIEW_CONFIRM_CREATES_DRAFT_NO_PROJECT_COPY_NO_EXECUTION";
}>;

export function studioCreativeExperienceLabel(type: StudioUserCreativeExperienceType) {
  return ({
    SUCCESSFUL_WORKFLOW: "Successful workflow",
    EFFECTIVE_STRATEGY: "Effective strategy",
    EFFECTIVE_OPTIMIZATION: "Effective optimization",
    STYLE_PATTERN: "Style pattern",
    RESOURCE_PATTERN: "Resource pattern",
  } as const)[type];
}
