export const STUDIO_PROJECT_NEXT_ACTION_TYPES = [
  "CONTENT_ACTION",
  "WORKFLOW_ACTION",
  "QUALITY_ACTION",
  "RESOURCE_ACTION",
  "DELIVERY_ACTION",
] as const;

export type StudioProjectNextActionType = typeof STUDIO_PROJECT_NEXT_ACTION_TYPES[number];

export type StudioProjectExecutionSnapshot = Readonly<{
  projectId: string;
  progress: number;
  currentStage: string;
  blockedItems: readonly string[];
  risks: readonly Readonly<{
    riskId: string;
    category: string;
    type: string;
    severity: string;
    evidence: string;
  }>[];
  nextActions: readonly Readonly<{
    actionId: string;
    type: StudioProjectNextActionType;
    title: string;
    summary: string;
    priority: string;
    confidence: string;
    evidence: readonly Readonly<{ source: string; metric: string; value: unknown }>[];
    sourceRecommendationId: string | null;
    status: "PREVIEW";
    draftCandidate: Readonly<{ type: "PROJECT_ACTION_DRAFT"; requiresHumanConfirm: true }>;
  }>[];
  evidence: readonly Readonly<{ source: string; reference: string }>[];
  updatedAt: string;
  boundary: string;
}>;
