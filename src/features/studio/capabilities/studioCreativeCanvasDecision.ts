export const STUDIO_CANVAS_LEARNING_SIGNALS = [
  "QUALITY_FIRST_PATTERN",
  "COST_OPTIMIZATION_PATTERN",
  "SPEED_PRIORITY_PATTERN",
  "RISK_AVOIDANCE_PATTERN",
] as const;

export type StudioCanvasLearningSignal = typeof STUDIO_CANVAS_LEARNING_SIGNALS[number];
export type StudioCanvasDecisionOptionId = "SELECT_DRAFT" | "KEEP_CURRENT";

export type StudioCanvasDecisionOutcome = Readonly<{
  quality: string | number | boolean | null;
  cost: string | number | boolean | null;
  revision: string | number | boolean | null;
  delivery: string | number | boolean | null;
  userFeedback: string | null;
  createdAt: string;
}>;

export type StudioCanvasDecisionRecord = Readonly<{
  decisionId: string;
  projectId: string;
  sourceDraft: Readonly<{
    draftId: string;
    draftSource: string;
    simulationId: string;
  }>;
  options: readonly Readonly<{
    optionId: StudioCanvasDecisionOptionId;
    label: string;
    signals: readonly StudioCanvasLearningSignal[];
  }>[];
  selectedOption: StudioCanvasDecisionOptionId;
  reason: string;
  learningSignals: readonly StudioCanvasLearningSignal[];
  createdAt: string;
  outcome: StudioCanvasDecisionOutcome | null;
}>;

export type StudioCanvasDecisionHistory = Readonly<{
  projectId: string;
  decisions: readonly StudioCanvasDecisionRecord[];
  learningSignals: readonly Readonly<{
    signal: StudioCanvasLearningSignal;
    count: number;
    confidence: "STRONG_PATTERN" | "EARLY_SIGNAL" | "INSUFFICIENT_DATA";
    futureSuggestionOnly: true;
  }>[];
  outcomeAnalysis: Readonly<{
    recorded: number;
    pending: number;
  }>;
  boundary: "RECORD_AND_ANALYZE_ONLY_NO_AUTOMATIC_SELECTION_NO_PREFERENCE_MUTATION_NO_EXECUTION";
}>;

export function studioCanvasLearningSignalLabel(signal: StudioCanvasLearningSignal) {
  return signal.replaceAll("_", " ").toLowerCase();
}
