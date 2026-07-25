export const STUDIO_PORTFOLIO_FORECAST_TYPES = [
  "QUALITY_TREND",
  "DELIVERY_TREND",
  "COST_TREND",
  "RESOURCE_TREND",
  "GROWTH_TREND",
] as const;

export const STUDIO_PORTFOLIO_FORECAST_SCENARIOS = [
  "CONTINUE_CURRENT_STRATEGY",
  "INCREASE_RESOURCE_REVIEW",
  "QUALITY_FOCUS_REVIEW",
  "COST_CONTROL_REVIEW",
] as const;

export type StudioPortfolioForecastType = typeof STUDIO_PORTFOLIO_FORECAST_TYPES[number];
export type StudioPortfolioForecastScenarioType = typeof STUDIO_PORTFOLIO_FORECAST_SCENARIOS[number];
export type StudioPortfolioForecastConfidence = "HIGH" | "MEDIUM" | "LOW";

export type StudioPortfolioForecastSnapshot = Readonly<{
  portfolioId: string;
  trends: readonly Readonly<{
    trendId: string;
    type: StudioPortfolioForecastType;
    history: readonly Readonly<{
      timestamp: string;
      value: number;
      source: "PORTFOLIO_PERFORMANCE" | "PORTFOLIO_RESOURCE";
    }>[];
    current: number | null;
    previous: number | null;
    change: number | null;
    direction: "INCREASING" | "DECREASING" | "STABLE" | "INSUFFICIENT_HISTORY";
    possibleFutureDirection: string;
    basis: string;
    confidence: StudioPortfolioForecastConfidence;
    limitation: string;
  }>[];
  forecasts: readonly Readonly<{
    forecastId: string;
    type: StudioPortfolioForecastType;
    horizon: "NEXT_PROJECT_PHASE";
    expectedDirection: string;
    expectedImpact: string;
    assumptions: readonly string[];
    confidence: StudioPortfolioForecastConfidence;
    evidenceRefs: readonly string[];
    status: "POSSIBLE_OUTCOME_NOT_GUARANTEED";
  }>[];
  scenarios: readonly Readonly<{
    scenarioId: string;
    type: StudioPortfolioForecastScenarioType;
    title: string;
    assumptions: readonly string[];
    possibleOutcome: string;
    affectedForecasts: readonly StudioPortfolioForecastType[];
    risks: readonly string[];
    confidence: StudioPortfolioForecastConfidence;
    evidenceRefs: readonly string[];
    status: "SUGGESTED_NOT_APPLIED";
    disclaimer: "Scenario outcomes are estimates, not guarantees.";
  }>[];
  confidence: StudioPortfolioForecastConfidence;
  evidence: readonly Readonly<{
    evidenceId: string;
    type: "PERFORMANCE_HISTORY" | "PORTFOLIO_STRATEGY" | "PORTFOLIO_RESOURCE" | "PROJECT_ROADMAP" | "PROJECT_MEMORY";
    sourceRef: string;
    projectIds: readonly string[];
    summary: string;
    confidence: StudioPortfolioForecastConfidence;
  }>[];
  createdAt: string;
  disclaimer: string;
  privacy: "CURRENT_USER_PORTFOLIO_FORECAST_ONLY";
  forecastMode: "READ_ONLY_POSSIBLE_OUTCOMES";
  action: Readonly<{
    actionId: string;
    status: "PREVIEWED" | "CONFIRMED";
    draft: StudioPortfolioForecastDraft | null;
  }> | null;
  controlBoundary: Readonly<{
    analysisOnly: true;
    outcomeGuarantee: false;
    strategyMutation: false;
    resourceAllocation: false;
    projectExecution: false;
    creditsDeducted: false;
  }>;
}>;

export type StudioPortfolioForecastDraft = Readonly<{
  draftId: string;
  portfolioId: string;
  actionId: string;
  draftType: "PORTFOLIO_FORECAST_DRAFT";
  trends: StudioPortfolioForecastSnapshot["trends"];
  forecasts: StudioPortfolioForecastSnapshot["forecasts"];
  scenarios: StudioPortfolioForecastSnapshot["scenarios"];
  evidence: StudioPortfolioForecastSnapshot["evidence"];
  disclaimer: string;
  status: "DRAFT";
  createdAt: string;
}>;

export type StudioPortfolioForecastPreview = Readonly<{
  forecast: StudioPortfolioForecastSnapshot;
  action: Readonly<{
    actionId: string;
    status: "PREVIEWED" | "CONFIRMED";
  }>;
  preview: Readonly<{
    draftType: "PORTFOLIO_FORECAST_DRAFT";
    portfolioId: string;
    trends: StudioPortfolioForecastSnapshot["trends"];
    forecasts: StudioPortfolioForecastSnapshot["forecasts"];
    scenarios: StudioPortfolioForecastSnapshot["scenarios"];
    impactScope: "PORTFOLIO_FORECAST_DRAFT_ONLY";
    requiresConfirmation: true;
  }>;
  draft: StudioPortfolioForecastDraft | null;
}>;

export function studioPortfolioForecastLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}
