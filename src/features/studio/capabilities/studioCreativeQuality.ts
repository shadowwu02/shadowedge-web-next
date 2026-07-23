export const STUDIO_QUALITY_ISSUE_TYPES = [
  "STYLE_DRIFT",
  "CHARACTER_DRIFT",
  "LOW_QUALITY",
  "WORKFLOW_MISMATCH",
  "USER_DISSATISFACTION",
] as const;

export type StudioQualityIssueType = typeof STUDIO_QUALITY_ISSUE_TYPES[number];
export type StudioQualityConfidence = "HIGH" | "MEDIUM" | "LOW";

export type StudioCreativeQualityMetrics = Readonly<{
  visualConsistency: number | null;
  styleMatch: number | null;
  colorConsistency: number | null;
  characterConsistency: number | null;
  appearanceStability: number | null;
  workflowQuality: number | null;
  revisionRate: number | null;
  userAcceptance: number | null;
  outputQuality: number | null;
  feedbackRating: number | null;
  completionQuality: number | null;
}>;

export type StudioQualityIssue = Readonly<{
  issueId: string;
  evaluationId: string;
  projectId: string;
  resultId: string;
  type: StudioQualityIssueType;
  severity: "HIGH" | "MEDIUM";
  message: string;
  suggestion: string;
  confidence: StudioQualityConfidence;
  sourceRefs: readonly string[];
  createdAt: string;
}>;

export type StudioCreativeQualityEvaluation = Readonly<{
  evaluationId: string;
  projectId: string;
  resultId: string;
  result: Readonly<{
    nodeId: string;
    assetId: string | null;
    jobId: string | null;
    videoUrl: string | null;
    status: string;
  }>;
  qualityMetrics: StudioCreativeQualityMetrics;
  issues: readonly StudioQualityIssue[];
  confidence: StudioQualityConfidence;
  createdAt: string;
}>;

export type StudioCreativeQuality = Readonly<{
  projectId: string;
  evaluations: readonly StudioCreativeQualityEvaluation[];
  issues: readonly StudioQualityIssue[];
  summary: Readonly<{
    resultCount: number;
    issueCount: number;
    averageOutputQuality: number | null;
    averageStyleMatch: number | null;
    averageCharacterConsistency: number | null;
    feedbackRating: number | null;
  }>;
  generatedAt: string;
  privacy: "CURRENT_USER_CURRENT_PROJECT_QUALITY_METADATA_ONLY";
  actionBoundary: "PREVIEW_CONFIRM_CREATES_QUALITY_IMPROVEMENT_DRAFT_ONLY";
}>;

export function studioQualityIssueLabel(type: StudioQualityIssueType) {
  return type.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

export function studioQualityScore(value: number | null) {
  return value === null ? "Unknown" : `${Math.round(value)}/100`;
}
