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

export type StudioCreativeCanvasNodeType = typeof STUDIO_CREATIVE_CANVAS_NODE_TYPES[number];
export type StudioCreativeCanvasEdgeType = typeof STUDIO_CREATIVE_CANVAS_EDGE_TYPES[number];

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

export function studioCreativeCanvasNodeLabel(type: StudioCreativeCanvasNodeType) {
  return type.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}
