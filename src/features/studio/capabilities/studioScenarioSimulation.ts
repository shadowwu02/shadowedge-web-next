export const STUDIO_SCENARIO_TYPES = [
  "QUALITY_SCENARIO",
  "COST_SCENARIO",
  "SPEED_SCENARIO",
  "WORKFLOW_SCENARIO",
  "RESOURCE_SCENARIO",
] as const;

export type StudioScenarioType = typeof STUDIO_SCENARIO_TYPES[number];

export type StudioCreativeScenario = Readonly<{
  scenarioId: string;
  projectId: string;
  optionId: string;
  type: StudioScenarioType;
  title: string;
  assumptions: readonly string[];
  expectedImpact: Readonly<{
    costImpact: "lower" | "higher" | "similar";
    qualityImpact: string;
    speedImpact: string;
    brandAlignmentImpact: string;
    efficiencyImpact: string;
    resourceImpact: string;
    risks: readonly string[];
    disclaimer: string;
  }>;
  evidence: Readonly<{
    historicalResultIds: readonly string[];
    evolutionIds: readonly string[];
    evolutionInsightIds: readonly string[];
    optimizationOutcomeIds: readonly string[];
    effectiveOptimizationCount: number;
    userExperienceIds: readonly string[];
    costStatus: string;
    shadowCreditsBaseline: number | null;
    focusMetrics: readonly string[];
  }>;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  createdAt: string;
}>;

export type StudioScenarioSimulationBundle = Readonly<{
  snapshotId: string;
  projectId: string;
  scenarios: readonly StudioCreativeScenario[];
  summary: Readonly<{
    scenarioCount: number;
    highConfidenceCount: number;
    mediumConfidenceCount: number;
    costStatus: string;
  }>;
  generatedAt: string;
  privacy: "CURRENT_USER_CURRENT_PROJECT_WITH_USER_SCOPED_EXPERIENCE_ONLY";
  actionBoundary: "SCENARIO_COMPARE_PREVIEW_USER_CONFIRM_CREATES_SCENARIO_DECISION_DRAFT_ONLY";
}>;

export function studioScenarioTypeLabel(type: StudioScenarioType) {
  return ({
    QUALITY_SCENARIO: "Quality",
    COST_SCENARIO: "Cost",
    SPEED_SCENARIO: "Speed",
    WORKFLOW_SCENARIO: "Workflow",
    RESOURCE_SCENARIO: "Resource",
  } as const)[type];
}
