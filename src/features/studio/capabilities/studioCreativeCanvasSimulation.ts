export const STUDIO_CANVAS_IMPACT_METRICS = [
  "QUALITY_IMPACT",
  "COST_IMPACT",
  "SPEED_IMPACT",
  "REVISION_IMPACT",
  "RISK_IMPACT",
] as const;

export const STUDIO_CANVAS_SIMULATION_RISK_TYPES = [
  "COST_RISK",
  "COMPLEXITY_RISK",
  "EXECUTION_RISK",
  "QUALITY_RISK",
] as const;

export type StudioCanvasImpactMetric = typeof STUDIO_CANVAS_IMPACT_METRICS[number];
export type StudioCanvasSimulationRiskType = typeof STUDIO_CANVAS_SIMULATION_RISK_TYPES[number];
export type StudioCanvasSimulationConfidence = "HIGH" | "MEDIUM" | "LOW";
export type StudioCanvasSimulationSeverity = "INFO" | "WARNING" | "CRITICAL";

export type StudioCanvasSimulationState = Readonly<{
  graphVersion: string;
  nodeCount: number;
  edgeCount: number;
  agentCount: number;
  qualityAgentCount: number;
  sceneCount: number;
  shotCount: number;
  executionNodeCount: number;
  outputNodeCount: number;
  nodeTypeCounts: Readonly<Record<string, number>>;
  agentRoles: readonly string[];
}>;

export type StudioCanvasChangeSimulation = Readonly<{
  simulationId: string;
  draftId: string;
  draftSource:
    | "CANVAS_AUTO_PLAN_DRAFT"
    | "CANVAS_WORKFLOW_OPTIMIZATION_DRAFT"
    | "CREATIVE_CANVAS_EDIT_SESSION";
  beforeState: StudioCanvasSimulationState;
  afterState: StudioCanvasSimulationState;
  impact: readonly Readonly<{
    metric: StudioCanvasImpactMetric;
    before: number;
    after: number;
    assessment:
      | "POSITIVE"
      | "NEGATIVE"
      | "NEUTRAL"
      | "POSSIBLE_INCREASE"
      | "POSSIBLE_DECREASE"
      | "POSSIBLE_IMPROVEMENT"
      | "POSSIBLE_SLOWDOWN"
      | "INCREASED"
      | "REDUCED"
      | "STABLE";
    summary: string;
  }>[];
  risks: readonly Readonly<{
    riskId: string;
    type: StudioCanvasSimulationRiskType;
    severity: StudioCanvasSimulationSeverity;
    message: string;
    evidence: readonly string[];
  }>[];
  confidence: StudioCanvasSimulationConfidence;
  createdAt: string;
  comparison: Readonly<{
    addedAgents: readonly string[];
    removedAgents: readonly string[];
    nodeDelta: number;
    edgeDelta: number;
  }>;
  boundary: "SIMULATION_ONLY_NO_DRAFT_CONFIRMATION_NO_PRODUCTION_MUTATION_NO_EXECUTION_NO_COST_CHANGE";
}>;

export function studioCanvasImpactLabel(metric: StudioCanvasImpactMetric) {
  return ({
    QUALITY_IMPACT: "Quality impact",
    COST_IMPACT: "Cost impact",
    SPEED_IMPACT: "Speed impact",
    REVISION_IMPACT: "Revision impact",
    RISK_IMPACT: "Risk impact",
  } as const)[metric];
}
