export const STUDIO_AGENT_CANVAS_NODE_TYPES = ["GOAL", "STRATEGY", "AGENT_TEAM", "TASK", "EXECUTION", "ASSET"] as const;

export type StudioAgentCanvasNodeType = typeof STUDIO_AGENT_CANVAS_NODE_TYPES[number];

export type StudioAgentCanvasInsightMarker = Readonly<{
  insightId: string;
  type: string;
  severity: string;
  label: string;
  href: string;
}>;

export type StudioAgentCanvasNode = Readonly<{
  nodeId: string;
  projectId: string;
  nodeType: StudioAgentCanvasNodeType;
  referenceId: string;
  status: string;
  metadata: Readonly<Record<string, unknown>> & {
    title?: string;
    source?: string;
    confidence?: string;
    evidence?: readonly unknown[];
    insightMarkers?: readonly StudioAgentCanvasInsightMarker[];
  };
  createdAt: string;
}>;

export type StudioAgentCanvasEdge = Readonly<{
  edgeId: string;
  source: string;
  target: string;
  relationType: string;
}>;

export type StudioAgentCanvasGraph = Readonly<{
  projectId: string;
  nodes: readonly StudioAgentCanvasNode[];
  edges: readonly StudioAgentCanvasEdge[];
  generatedAt: string;
  mode: "READ_ONLY";
  storage: "DERIVED_FROM_EXISTING_PROJECT_DATA";
  interactionBoundary: "VIEW_DETAILS_AND_NAVIGATE_ONLY";
  safety: "NO_CANVAS_WRITE_NO_EXECUTION_NO_PROVIDER_NO_BILLING_NO_CREDITS";
}>;

export function studioAgentCanvasNodeLabel(type: StudioAgentCanvasNodeType) {
  return ({
    GOAL: "Goal",
    STRATEGY: "Strategy",
    AGENT_TEAM: "Agent Team",
    TASK: "Task",
    EXECUTION: "Execution",
    ASSET: "Asset"
  } as const)[type];
}
