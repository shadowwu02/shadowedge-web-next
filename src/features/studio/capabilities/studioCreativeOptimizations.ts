export const STUDIO_OPTIMIZATION_TYPES = [
  "QUALITY_OPTIMIZATION",
  "COST_OPTIMIZATION",
  "WORKFLOW_OPTIMIZATION",
  "RESOURCE_OPTIMIZATION",
  "STYLE_OPTIMIZATION",
] as const;

export type StudioOptimizationType = typeof STUDIO_OPTIMIZATION_TYPES[number];
export type StudioOptimizationConfidence = "HIGH" | "MEDIUM" | "LOW";

export type StudioOptimizationIssue = Readonly<{
  type: string;
  sourceId: string;
  message: string;
}>;

export type StudioOptimizationEvidence = Readonly<{
  source:
    | "QUALITY_EVALUATION"
    | "QUALITY_ISSUE"
    | "EFFICIENCY_INSIGHT"
    | "PROJECT_COST_RECORD"
    | "RESOURCE_INSIGHT"
    | "USER_FEEDBACK"
    | "STRATEGY_OUTCOME"
    | "STRATEGY_SIGNAL";
  sourceId: string;
  confidence: StudioOptimizationConfidence;
  summary: string;
}>;

export type StudioCreativeOptimizationProposal = Readonly<{
  proposalId: string;
  projectId: string;
  optimizationType: StudioOptimizationType;
  issues: readonly StudioOptimizationIssue[];
  recommendations: readonly string[];
  expectedImpact: string;
  impactDisclaimer: "ESTIMATE_ONLY_NO_RESULT_GUARANTEE";
  evidence: readonly StudioOptimizationEvidence[];
  confidence: StudioOptimizationConfidence;
  createdAt: string;
}>;

export type StudioCreativeOptimizations = Readonly<{
  projectId: string;
  proposals: readonly StudioCreativeOptimizationProposal[];
  summary: Readonly<{
    proposalCount: number;
    types: readonly StudioOptimizationType[];
    highConfidenceCount: number;
    evidenceCount: number;
  }>;
  generatedAt: string;
  privacy: "CURRENT_USER_CURRENT_PROJECT_OPTIMIZATION_METADATA_ONLY";
  actionBoundary: "PREVIEW_CONFIRM_CREATES_OPTIMIZATION_DRAFT_ONLY";
  safety: string;
}>;

export function studioOptimizationLabel(type: StudioOptimizationType) {
  return type.replace("_OPTIMIZATION", "").replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

export function studioOptimizationImpactLabel(value: string) {
  return value.replaceAll("_", " ").replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}
