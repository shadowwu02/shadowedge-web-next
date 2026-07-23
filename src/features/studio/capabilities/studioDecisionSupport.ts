export const STUDIO_TRADEOFF_METRICS = [
  "QUALITY",
  "COST",
  "SPEED",
  "BRAND_ALIGNMENT",
  "EFFICIENCY",
] as const;

export const STUDIO_DECISION_OPTION_TYPES = [
  "QUALITY_FIRST",
  "COST_OPTIMIZATION",
  "SPEED_FIRST",
  "BRAND_ALIGNMENT_FIRST",
] as const;

export type StudioTradeoffMetricType = typeof STUDIO_TRADEOFF_METRICS[number];
export type StudioDecisionOptionType = typeof STUDIO_DECISION_OPTION_TYPES[number];

export type StudioTradeoffMetric = Readonly<{
  type: StudioTradeoffMetricType;
  relativeChangePercent: number;
  display: string;
  effect: "BENEFIT" | "RISK" | "NEUTRAL";
  label: string;
  baselineValue: number | null;
  estimate: true;
}>;

export type StudioCreativeDecisionOption = Readonly<{
  optionId: string;
  projectId: string;
  optionType: StudioDecisionOptionType;
  goal: string;
  tradeoffs: Readonly<{
    advantages: readonly string[];
    risks: readonly string[];
    disclaimer: string;
  }>;
  metrics: Readonly<Record<StudioTradeoffMetricType, StudioTradeoffMetric>>;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidence: Readonly<{
    sourceIds: readonly string[];
    costStatus: string;
  }>;
  createdAt: string;
}>;

export type StudioDecisionSupportBundle = Readonly<{
  snapshotId: string;
  projectId: string;
  options: readonly StudioCreativeDecisionOption[];
  conflicts: readonly Readonly<{
    conflictId: string;
    code: "TRADEOFF_CONFLICT";
    objectives: readonly StudioDecisionOptionType[];
    reason: string;
    resolution: "USER_CHOICE_REQUIRED_NO_AUTOMATIC_SELECTION";
    createdAt: string;
  }>[];
  baseline: Readonly<{
    quality: number | null;
    cost: number | null;
    costStatus: string;
    speedMs: number | null;
    brandAlignment: number | null;
    efficiency: number | null;
  }>;
  summary: Readonly<{
    optionCount: number;
    conflictCount: number;
    confidence: "HIGH" | "MEDIUM" | "LOW";
  }>;
  generatedAt: string;
  privacy: "CURRENT_USER_CURRENT_PROJECT_ONLY";
  actionBoundary: "OPTION_COMPARISON_PREVIEW_USER_CHOICE_CONFIRM_CREATES_DECISION_SELECTION_DRAFT_ONLY";
}>;

export function studioDecisionOptionLabel(type: StudioDecisionOptionType) {
  return ({
    QUALITY_FIRST: "Quality first",
    COST_OPTIMIZATION: "Cost optimization",
    SPEED_FIRST: "Speed first",
    BRAND_ALIGNMENT_FIRST: "Brand alignment",
  } as const)[type];
}

export function studioTradeoffMetricLabel(type: StudioTradeoffMetricType) {
  return ({
    QUALITY: "Quality",
    COST: "Cost",
    SPEED: "Speed",
    BRAND_ALIGNMENT: "Brand",
    EFFICIENCY: "Efficiency",
  } as const)[type];
}
