export const STUDIO_CREATIVE_CANVAS_SCHEMA_VERSION = "creative-canvas/v1";

export const STUDIO_CREATIVE_CANVAS_NODE_TYPES = [
  "GOAL",
  "STRATEGY",
  "AGENT",
  "SCENE",
  "STORYBOARD",
  "SHOT",
  "ASSET",
  "EXECUTION",
  "OUTPUT",
  "DELIVERY",
] as const;

export const STUDIO_CREATIVE_CANVAS_EDGE_TYPES = [
  "INFORMS",
  "PLANS",
  "CONTAINS",
  "GENERATES",
  "PRODUCES",
  "DELIVERS",
] as const;

export const STUDIO_CREATIVE_CANVAS_EDIT_STATUSES = [
  "DRAFT",
  "REVIEW",
  "CONFIRMED",
  "REJECTED",
  "EXPIRED",
] as const;

export const STUDIO_CREATIVE_CANVAS_CHANGE_TYPES = [
  "ADD_NODE",
  "REMOVE_NODE",
  "MOVE_NODE",
  "CONNECT_EDGE",
  "DISCONNECT_EDGE",
  "UPDATE_CONFIG",
] as const;

export const STUDIO_CREATIVE_CANVAS_VALIDATION_TYPES = [
  "CYCLE_DETECTION",
  "MISSING_DEPENDENCY",
  "CAPABILITY",
  "POLICY",
  "SCOPE",
] as const;

export type StudioCreativeCanvasNodeType = typeof STUDIO_CREATIVE_CANVAS_NODE_TYPES[number];
export type StudioCreativeCanvasEdgeType = typeof STUDIO_CREATIVE_CANVAS_EDGE_TYPES[number];
export type StudioCreativeCanvasEditStatus = typeof STUDIO_CREATIVE_CANVAS_EDIT_STATUSES[number];
export type StudioCreativeCanvasChangeType = typeof STUDIO_CREATIVE_CANVAS_CHANGE_TYPES[number];

export type StudioCreativeCanvasNode = Readonly<{
  nodeId: string;
  projectId: string;
  nodeType: StudioCreativeCanvasNodeType;
  referenceId: string;
  status: string;
  metadata: Readonly<Record<string, unknown>> & {
    title?: string;
    source?: string;
    timelineRef?: string | null;
    outputUrl?: string | null;
    version?: string | null;
    readOnly?: boolean;
  };
  createdAt: string;
}>;

export type StudioCreativeCanvasEdge = Readonly<{
  edgeId: string;
  source: string;
  target: string;
  edgeType: StudioCreativeCanvasEdgeType;
  metadata: Readonly<Record<string, unknown>>;
}>;

export type StudioCreativeCanvasGraph = Readonly<{
  graphId: string;
  projectId: string;
  schemaVersion: typeof STUDIO_CREATIVE_CANVAS_SCHEMA_VERSION;
  nodes: readonly StudioCreativeCanvasNode[];
  edges: readonly StudioCreativeCanvasEdge[];
  createdAt: string;
  sourceRevisions: Readonly<{
    agentCanvas: string | null;
    timeline: string | null;
  }>;
  migrationPlan: Readonly<{
    legacyRoute: "/workspace/canvas";
    legacyName: "Legacy Canvas";
    targetRoute: string;
    targetName: "Studio Creative Canvas";
    mode: "READ_ONLY_ADAPTER";
    automaticMigration: false;
    productionDataMutation: false;
    legacyStoragePreserved: true;
  }>;
  draftCompatibility: Readonly<{
    workflowDraftsPreserved: true;
    legacyNodeReferencesPreserved: true;
    unifiedGraphMutationAllowed: false;
    confirmationBoundaryPreserved: true;
  }>;
  mode: "READ_ONLY";
  storage: "DERIVED_FROM_EXISTING_SOURCES";
  safety: "NO_PROJECT_MUTATION_NO_AUTOMATIC_MIGRATION_NO_EXECUTION_NO_PROVIDER";
}>;

export type StudioCreativeCanvasGraphChange = Readonly<{
  changeId: string;
  type: StudioCreativeCanvasChangeType;
  nodeId?: string;
  node?: Partial<StudioCreativeCanvasNode> & Pick<StudioCreativeCanvasNode, "nodeType" | "referenceId">;
  position?: Readonly<{ x: number; y: number }>;
  source?: string;
  target?: string;
  edgeId?: string;
  edgeType?: StudioCreativeCanvasEdgeType;
  config?: Readonly<Record<string, unknown>>;
}>;

export type StudioCreativeCanvasValidationCheck = Readonly<{
  type: typeof STUDIO_CREATIVE_CANVAS_VALIDATION_TYPES[number];
  passed: boolean;
  status: "PASS" | "BLOCKED";
  issues: readonly string[];
  evidence: readonly string[];
}>;

export type StudioCreativeCanvasEditSession = Readonly<{
  sessionId: string;
  projectId: string;
  baseGraphVersion: string;
  draftGraph: Omit<StudioCreativeCanvasGraph, "schemaVersion" | "sourceRevisions" | "migrationPlan" | "draftCompatibility" | "mode" | "storage" | "safety"> & {
    schemaVersion: string;
    mode: "DRAFT";
  };
  changes: readonly StudioCreativeCanvasGraphChange[];
  diff: Readonly<{
    addedNodes: readonly StudioCreativeCanvasNode[];
    removedNodes: readonly StudioCreativeCanvasNode[];
    movedNodes: readonly Readonly<{ nodeId: string; before: unknown; after: unknown }>[];
    changedEdges: Readonly<{
      added: readonly StudioCreativeCanvasEdge[];
      removed: readonly StudioCreativeCanvasEdge[];
    }>;
    configChanges: readonly Readonly<{ nodeId: string; before: unknown; after: unknown }>[];
    summary: Readonly<{
      addedNodes: number;
      removedNodes: number;
      movedNodes: number;
      changedEdges: number;
      configChanges: number;
    }>;
  }>;
  validation: Readonly<{
    status: "READY" | "BLOCKED";
    checks: readonly StudioCreativeCanvasValidationCheck[];
    validatedAt: string;
  }>;
  status: StudioCreativeCanvasEditStatus;
  createdAt: string;
  confirmedAt?: string;
  confirmedDraft?: Readonly<{
    draftId: string;
    graphId: string;
    status: "DRAFT";
    requiresExecutionPreview: true;
    executionAllowed: false;
    productionGraphApplied: false;
  }>;
  boundary: string;
}>;

export function studioCreativeCanvasNodeLabel(type: StudioCreativeCanvasNodeType) {
  return type.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}
