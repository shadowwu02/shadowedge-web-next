export const STUDIO_COPILOT_EVIDENCE_TYPES = [
  "PROJECT_CONTEXT",
  "USER_PREFERENCE",
  "DECISION_PATTERN",
  "HISTORICAL_RESULT",
  "WORKFLOW_SUCCESS",
  "QUALITY_SIGNAL",
  "COST_SIGNAL",
] as const;

export type StudioCopilotEvidenceType = typeof STUDIO_COPILOT_EVIDENCE_TYPES[number];
export type StudioCopilotConfidence = "HIGH" | "MEDIUM" | "LOW";
export type StudioCopilotEvidenceStrength = "STRONG" | "MEDIUM" | "LIMITED" | "VERIFIED" | "UNKNOWN";

export type StudioCopilotExplanation = Readonly<{
  explanationId: string;
  recommendationId: string;
  evidence: readonly Readonly<{
    type: StudioCopilotEvidenceType;
    label: string;
    summary: string;
    strength: StudioCopilotEvidenceStrength;
    sourceIds: readonly string[];
  }>[];
  reasoningFactors: readonly Readonly<{
    factor: string;
    impact: "POSITIVE" | "NEUTRAL" | "CAUTION";
    reason: string;
  }>[];
  confidence: Readonly<{
    overall: StudioCopilotConfidence;
    breakdown: readonly Readonly<{
      factor: string;
      level: StudioCopilotEvidenceStrength;
      reason: string;
    }>[];
  }>;
  createdAt: string;
  privacy: "CURRENT_USER_CURRENT_PROJECT_SANITIZED_EVIDENCE_ONLY";
  disclosureBoundary: "NO_RAW_PROMPT_NO_OTHER_USER_DATA_NO_PROVIDER_INTERNALS_NO_POLICY_SECRETS";
}>;

export type StudioCopilotExplanationBundle = Readonly<{
  projectId: string;
  explanations: readonly StudioCopilotExplanation[];
  summary: Readonly<{
    total: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  }>;
  generatedAt: string;
  privacy: "CURRENT_USER_CURRENT_PROJECT_SANITIZED_EVIDENCE_ONLY";
  actionBoundary: "EXPLANATION_ONLY_NO_RECOMMENDATION_MUTATION_NO_EXECUTION";
}>;

export function studioCopilotEvidenceLabel(type: StudioCopilotEvidenceType) {
  return ({
    PROJECT_CONTEXT: "Project context",
    USER_PREFERENCE: "Your preferences",
    DECISION_PATTERN: "Your decision history",
    HISTORICAL_RESULT: "Project results",
    WORKFLOW_SUCCESS: "Workflow history",
    QUALITY_SIGNAL: "Quality signal",
    COST_SIGNAL: "Cost confidence",
  } as const)[type];
}
