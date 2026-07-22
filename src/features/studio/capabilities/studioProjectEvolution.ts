export const STUDIO_PROJECT_EVOLUTION_MILESTONES = ["PROJECT_STARTED", "STYLE_DEFINED", "FIRST_RESULT", "STRATEGY_CHANGED", "MAJOR_REVISION", "PROJECT_COMPLETED"] as const;
export const STUDIO_PROJECT_EVOLUTION_INSIGHT_TYPES = ["CREATIVE_DIRECTION", "STYLE_TREND", "QUALITY_TREND", "WORKFLOW_TREND"] as const;
export const STUDIO_PROJECT_EVOLUTION_CONFIDENCE = ["HIGH", "MEDIUM", "LOW"] as const;

export type StudioProjectEvolutionMilestone = typeof STUDIO_PROJECT_EVOLUTION_MILESTONES[number];
export type StudioProjectEvolutionInsightType = typeof STUDIO_PROJECT_EVOLUTION_INSIGHT_TYPES[number];
export type StudioProjectEvolutionConfidence = typeof STUDIO_PROJECT_EVOLUTION_CONFIDENCE[number];

export type StudioProjectEvolutionRecord = Readonly<{
  evolutionId: string;
  projectId: string;
  milestone: StudioProjectEvolutionMilestone;
  changes: readonly Readonly<{ field: string; from: string | null; to: string; source: string }>[];
  relatedStrategies: readonly string[];
  relatedResults: readonly string[];
  createdAt: string;
}>;

export type StudioProjectEvolutionInsight = Readonly<{
  evolutionInsightId: string;
  projectId: string;
  type: StudioProjectEvolutionInsightType;
  trend: string;
  message: string;
  sourceEvolutionIds: readonly string[];
  confidence: StudioProjectEvolutionConfidence;
  createdAt: string;
}>;

export type StudioProjectEvolutionBundle = Readonly<{
  projectId: string;
  timeline: readonly StudioProjectEvolutionRecord[];
  insights: readonly StudioProjectEvolutionInsight[];
  trends: readonly Readonly<{ type: StudioProjectEvolutionInsightType; trend: string; confidence: StudioProjectEvolutionConfidence }>[];
  generatedAt: string;
  privacy: "CURRENT_USER_CURRENT_PROJECT_ONLY";
  memoryMode: "APPEND_ONLY_HISTORICAL_RETRIEVAL";
  safety: "READ_ONLY_ANALYSIS_NO_CONTEXT_PROJECT_OR_EXECUTION_MUTATION";
}>;

export function studioProjectEvolutionMilestoneLabel(milestone: StudioProjectEvolutionMilestone) {
  return ({ PROJECT_STARTED: "Project started", STYLE_DEFINED: "Style defined", FIRST_RESULT: "First result", STRATEGY_CHANGED: "Strategy changed", MAJOR_REVISION: "Major revision", PROJECT_COMPLETED: "Project completed" } as const)[milestone];
}

export function studioProjectEvolutionInsightLabel(type: StudioProjectEvolutionInsightType) {
  return ({ CREATIVE_DIRECTION: "Creative direction", STYLE_TREND: "Style trend", QUALITY_TREND: "Quality trend", WORKFLOW_TREND: "Workflow trend" } as const)[type];
}
