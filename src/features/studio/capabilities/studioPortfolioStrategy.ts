export const STUDIO_PORTFOLIO_STRATEGY_GOALS = [
  "BRAND_GROWTH",
  "CONTENT_SCALE",
  "MARKET_EXPANSION",
  "EFFICIENCY",
] as const;
export const STUDIO_PORTFOLIO_RELATIONSHIPS = [
  "PROJECT_RELATION",
  "GOAL_CONFLICT",
  "RESOURCE_OPPORTUNITY",
  "STYLE_CONSISTENCY",
] as const;

export type StudioPortfolioStrategyGoal = typeof STUDIO_PORTFOLIO_STRATEGY_GOALS[number];
export type StudioPortfolioRelationshipType = typeof STUDIO_PORTFOLIO_RELATIONSHIPS[number];
export type StudioPortfolioStrategyConfidence = "HIGH" | "MEDIUM" | "LOW";

export type StudioPortfolioStrategyEvidence = Readonly<{
  evidenceId: string;
  type: "PORTFOLIO_INTELLIGENCE" | "PROJECT_ROADMAP" | "STRATEGY_EVOLUTION";
  sourceRef: string;
  projectIds: readonly string[];
  summary: string;
  confidence: StudioPortfolioStrategyConfidence;
}>;

export type StudioPortfolioStrategySnapshot = Readonly<{
  portfolioId: string;
  projects: readonly Readonly<{
    projectId: string;
    name: string;
    roadmapId: string | null;
    currentGoal: string;
    nextGoal: string;
    confidence: StudioPortfolioStrategyConfidence;
  }>[];
  vision: Readonly<{
    statement: string;
    goals: readonly StudioPortfolioStrategyGoal[];
  }>;
  strategies: readonly Readonly<{
    strategyId: string;
    type: StudioPortfolioStrategyGoal;
    summary: string;
    projectIds: readonly string[];
    evidenceRefs: readonly string[];
    confidence: StudioPortfolioStrategyConfidence;
  }>[];
  priorities: readonly Readonly<{
    projectId: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    role: "STRATEGIC_ANCHOR" | "SUPPORTING" | "EXPERIMENTAL";
    reason: string;
    status: "SUGGESTED_NOT_APPLIED";
  }>[];
  evidence: readonly StudioPortfolioStrategyEvidence[];
  confidence: StudioPortfolioStrategyConfidence;
  createdAt: string;
  relationships: readonly Readonly<{
    relationshipId: string;
    type: StudioPortfolioRelationshipType;
    projectIds: readonly string[];
    summary: string;
    confidence: StudioPortfolioStrategyConfidence;
  }>[];
  riskFlags: readonly ("GOAL_CONFLICT" | "RESOURCE_CONFLICT" | "LOW_ROADMAP_CONFIDENCE")[];
  priorityMode: "SUGGESTED_NOT_APPLIED";
  privacy: "CURRENT_USER_PROJECTS_ONLY";
  action: Readonly<{
    actionId: string;
    status: "PREVIEWED" | "CONFIRMED";
    draftId: string | null;
  }> | null;
  controlBoundary: Readonly<{
    portfolioAnalysisOnly: true;
    priorityMutation: false;
    projectMutation: false;
    workflowExecution: false;
    crossUserRead: false;
    creditsDeducted: false;
  }>;
}>;

export type StudioPortfolioStrategyDraft = Readonly<{
  draftId: string;
  portfolioId: string;
  actionId: string;
  draftType: "PORTFOLIO_STRATEGY_DRAFT";
  vision: StudioPortfolioStrategySnapshot["vision"];
  strategies: StudioPortfolioStrategySnapshot["strategies"];
  priorities: StudioPortfolioStrategySnapshot["priorities"];
  evidence: StudioPortfolioStrategySnapshot["evidence"];
  status: "DRAFT";
  createdAt: string;
}>;

export type StudioPortfolioStrategyPreview = Readonly<{
  strategy: StudioPortfolioStrategySnapshot;
  action: Readonly<{
    actionId: string;
    status: "PREVIEWED" | "CONFIRMED";
  }>;
  preview: Readonly<{
    draftType: "PORTFOLIO_STRATEGY_DRAFT";
    portfolioId: string;
    vision: StudioPortfolioStrategySnapshot["vision"];
    strategies: StudioPortfolioStrategySnapshot["strategies"];
    priorities: StudioPortfolioStrategySnapshot["priorities"];
    riskFlags: StudioPortfolioStrategySnapshot["riskFlags"];
    impactScope: "PORTFOLIO_STRATEGY_DRAFT_ONLY";
    requiresConfirmation: true;
  }>;
  draft: StudioPortfolioStrategyDraft | null;
}>;

export function studioPortfolioStrategyLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}
