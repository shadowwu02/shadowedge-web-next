export const STUDIO_DECISION_PATTERN_TYPES = [
  "QUALITY_VS_COST",
  "QUALITY_VS_SPEED",
  "COST_VS_SPEED",
  "STYLE_CHOICE",
  "WORKFLOW_CHOICE",
  "RESOURCE_CHOICE",
] as const;

export const STUDIO_DECISION_PATTERN_CONFIDENCE = [
  "EXPLICIT",
  "STRONG_PATTERN",
  "EARLY_SIGNAL",
] as const;

export type StudioDecisionPatternType = typeof STUDIO_DECISION_PATTERN_TYPES[number];
export type StudioDecisionPatternConfidence = typeof STUDIO_DECISION_PATTERN_CONFIDENCE[number];

export type StudioCreativeDecisionPattern = Readonly<{
  patternId: string;
  userId: string;
  decisionType: StudioDecisionPatternType;
  choiceSignals: Readonly<{
    selectedValue: string;
    selectionCount: number;
    projectCount: number;
    successfulOutcomeCount: number;
    optionTypes: readonly string[];
    scenarioTypes: readonly string[];
    personalizationSignal: string;
  }>;
  confidence: StudioDecisionPatternConfidence;
  sources: readonly Readonly<{
    type: string;
    sourceId: string;
    projectId: string;
    label: string;
    createdAt: string | null;
    attribution?: string;
  }>[];
  createdAt: string;
}>;

export type StudioDecisionPatternBundle = Readonly<{
  userId: string;
  patterns: readonly StudioCreativeDecisionPattern[];
  summary: Readonly<{
    total: number;
    explicit: number;
    strongPatterns: number;
    earlySignals: number;
  }>;
  generatedAt: string;
  privacy: "CURRENT_USER_ONLY_NO_CROSS_USER_LEARNING";
  personalizationBoundary: "READ_ONLY_SIGNAL_NO_AUTOMATIC_DECISION_NO_PREFERENCE_MUTATION_NO_EXECUTION";
}>;

export function studioDecisionPatternLabel(type: StudioDecisionPatternType) {
  return ({
    QUALITY_VS_COST: "Quality vs cost",
    QUALITY_VS_SPEED: "Quality vs speed",
    COST_VS_SPEED: "Cost vs speed",
    STYLE_CHOICE: "Style choice",
    WORKFLOW_CHOICE: "Workflow choice",
    RESOURCE_CHOICE: "Resource choice",
  } as const)[type];
}

export function studioDecisionPatternConfidenceLabel(confidence: StudioDecisionPatternConfidence) {
  return ({
    EXPLICIT: "Explicit choice",
    STRONG_PATTERN: "Strong pattern",
    EARLY_SIGNAL: "Early signal",
  } as const)[confidence];
}
