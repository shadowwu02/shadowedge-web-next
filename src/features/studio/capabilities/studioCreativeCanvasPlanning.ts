import type {
  StudioCreativeCanvasEditSession,
  StudioCreativeCanvasGraph,
  StudioCreativeCanvasGraphChange,
} from "@/features/studio/capabilities/studioCreativeCanvas";

export const STUDIO_CANVAS_PLANNING_INTENTS = [
  "CREATE_VIDEO",
  "EDIT_VIDEO",
  "TRANSFER_MOTION",
  "CREATE_CHARACTER",
  "CAMERA_EFFECT",
  "UNKNOWN",
] as const;

export type StudioCanvasPlanningIntent = typeof STUDIO_CANVAS_PLANNING_INTENTS[number];
export type StudioCanvasPlanConfidence = "HIGH" | "MEDIUM" | "LOW";

export type StudioCanvasPlanningRequest = Readonly<{
  requestId: string;
  projectId: string;
  intent: StudioCanvasPlanningIntent;
  goal: string;
  constraints: Readonly<Record<string, string | number | boolean>>;
  references: readonly Readonly<{
    referenceId: string;
    type: string;
  }>[];
  createdAt: string;
}>;

export type StudioCanvasPlanningEvidence = Readonly<{
  evidenceId: string;
  type:
    | "USER_PROMPT"
    | "PROJECT_GOAL"
    | "PROJECT_MISSION"
    | "PROJECT_STRATEGY"
    | "PROJECT_MEMORY"
    | "WORKFLOW_TEMPLATE"
    | "PAST_SUCCESS_PATTERN"
    | "PROJECT_REFERENCE";
  referenceId: string;
  summary: string;
  confidence: StudioCanvasPlanConfidence;
}>;

export type StudioAIPlannedCanvasDraft = Readonly<{
  draftId: string;
  requestId: string;
  planningRequest: StudioCanvasPlanningRequest;
  graph: Omit<StudioCreativeCanvasGraph, "schemaVersion" | "sourceRevisions" | "migrationPlan" | "draftCompatibility" | "mode" | "storage" | "safety"> & {
    schemaVersion: string;
    mode: "DRAFT";
  };
  reasoning: readonly Readonly<{
    nodeId: string;
    nodeType: string;
    label: string;
    reason: string;
    evidenceRefs: readonly string[];
  }>[];
  evidence: readonly StudioCanvasPlanningEvidence[];
  confidence: StudioCanvasPlanConfidence;
  changes: readonly StudioCreativeCanvasGraphChange[];
  diff: StudioCreativeCanvasEditSession["diff"];
  validation: StudioCreativeCanvasEditSession["validation"];
  editSession: StudioCreativeCanvasEditSession;
  actionCenter: Readonly<{
    actionType: "CANVAS_AUTO_PLAN_DRAFT";
    status: "PREVIEWED";
    previewRequired: true;
    humanConfirmRequired: true;
    confirmationTarget: "CREATIVE_CANVAS_EDIT_SESSION";
  }>;
  createdAt: string;
  boundary: "AI_PLAN_DRAFT_ONLY_NO_PRODUCTION_GRAPH_MUTATION_NO_EXECUTION";
}>;

export type CreateStudioCanvasPlanInput = Readonly<{
  prompt: string;
  intent?: StudioCanvasPlanningIntent;
  goal?: string;
  constraints?: Readonly<Record<string, string | number | boolean>>;
  references?: readonly Readonly<{ referenceId: string; type: string }>[];
}>;
