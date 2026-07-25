import type {
  StudioCreativeCanvasEditSession,
  StudioCreativeCanvasGraph,
  StudioCreativeCanvasGraphChange,
} from "@/features/studio/capabilities/studioCreativeCanvas";

export const STUDIO_CANVAS_OPTIMIZATION_TYPES = [
  "QUALITY_IMPROVEMENT",
  "COST_REDUCTION",
  "WORKFLOW_SIMPLIFICATION",
  "REVISION_REDUCTION",
  "DELIVERY_SPEED",
] as const;

export type StudioCanvasOptimizationType = typeof STUDIO_CANVAS_OPTIMIZATION_TYPES[number];
export type StudioCanvasOptimizationConfidence = "HIGH" | "MEDIUM" | "LOW";

export type StudioCanvasOptimizationRequest = Readonly<{
  requestId: string;
  graphVersion: string;
  target: StudioCanvasOptimizationType;
  constraints: Readonly<Record<string, string | number | boolean>>;
  createdAt: string;
}>;

export type StudioCanvasOptimizationEvidence = Readonly<{
  evidenceId: string;
  type:
    | "PRODUCTION_DATA"
    | "QUALITY_DATA"
    | "REVISION_DATA"
    | "COST_DATA"
    | "HISTORICAL_SUCCESS"
    | "GOVERNANCE_KNOWLEDGE"
    | "PROJECT_MEMORY";
  referenceId: string;
  summary: string;
  confidence: StudioCanvasOptimizationConfidence;
}>;

export type StudioAIOptimizedCanvasDraft = Readonly<{
  draftId: string;
  requestId: string;
  optimizationRequest: StudioCanvasOptimizationRequest;
  optimizedGraph: Omit<StudioCreativeCanvasGraph, "schemaVersion" | "sourceRevisions" | "migrationPlan" | "draftCompatibility" | "mode" | "storage" | "safety"> & {
    schemaVersion: string;
    mode: "DRAFT";
  };
  changes: readonly StudioCreativeCanvasGraphChange[];
  reasons: readonly Readonly<{
    reasonId: string;
    type: StudioCanvasOptimizationType;
    summary: string;
    evidenceRefs: readonly string[];
    changeRefs: readonly string[];
  }>[];
  evidence: readonly StudioCanvasOptimizationEvidence[];
  confidence: StudioCanvasOptimizationConfidence;
  diff: StudioCreativeCanvasEditSession["diff"];
  validation: StudioCreativeCanvasEditSession["validation"];
  editSession: StudioCreativeCanvasEditSession;
  actionCenter: Readonly<{
    actionType: "CANVAS_WORKFLOW_OPTIMIZATION_DRAFT";
    status: "PREVIEWED";
    previewRequired: true;
    humanConfirmRequired: true;
    confirmationTarget: "CREATIVE_CANVAS_EDIT_SESSION";
  }>;
  createdAt: string;
  boundary: "AI_OPTIMIZATION_DRAFT_ONLY_NO_PRODUCTION_GRAPH_MUTATION_NO_TASK_NO_EXECUTION";
}>;

export type CreateStudioCanvasOptimizationInput = Readonly<{
  graphVersion: string;
  target: StudioCanvasOptimizationType;
  constraints?: Readonly<Record<string, string | number | boolean>>;
}>;

export function studioCanvasOptimizationLabel(type: StudioCanvasOptimizationType) {
  return ({
    QUALITY_IMPROVEMENT: "Quality improvement",
    COST_REDUCTION: "Cost reduction",
    WORKFLOW_SIMPLIFICATION: "Workflow simplification",
    REVISION_REDUCTION: "Revision reduction",
    DELIVERY_SPEED: "Delivery speed",
  } as const)[type];
}
