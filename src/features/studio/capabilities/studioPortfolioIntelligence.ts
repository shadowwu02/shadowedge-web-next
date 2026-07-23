export const STUDIO_PORTFOLIO_GOALS = ["GROWTH", "BRAND_BUILDING", "CONTENT_SCALE", "EFFICIENCY"] as const;
export const STUDIO_PORTFOLIO_INSIGHT_TYPES = ["PROJECT_OVERLAP", "RESOURCE_CONFLICT", "GOAL_ALIGNMENT", "CONTENT_OPPORTUNITY"] as const;

export type StudioPortfolioGoal = typeof STUDIO_PORTFOLIO_GOALS[number];
export type StudioPortfolioInsightType = typeof STUDIO_PORTFOLIO_INSIGHT_TYPES[number];

export type StudioCreativePortfolio = Readonly<{
  portfolioId: string;
  userId: string;
  name: string;
  projects: readonly string[];
  goals: readonly StudioPortfolioGoal[];
  createdAt: string;
}>;

export type StudioPortfolioProjectRelation = Readonly<{
  portfolioId: string;
  projectId: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  role: "STRATEGIC_ANCHOR" | "SUPPORTING" | "EXPERIMENTAL";
  createdAt: string;
}>;

export type StudioPortfolioInsight = Readonly<{
  insightId: string;
  portfolioId: string;
  type: StudioPortfolioInsightType;
  projectIds: readonly string[];
  message: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  createdAt: string;
}>;

export type StudioPortfolioIntelligence = Readonly<{
  snapshotId: string;
  portfolio: StudioCreativePortfolio;
  relations: readonly StudioPortfolioProjectRelation[];
  projectSummaries: readonly Readonly<{
    projectId: string;
    name: string;
    mission: Readonly<{ missionId: string; mission: string; vision: string }>;
    goalCount: number;
    strategyCount: number;
    evolutionCount: number;
    insightCount: number;
  }>[];
  insights: readonly StudioPortfolioInsight[];
  generatedAt: string;
  priorityMode: "SUGGESTED_NOT_APPLIED";
  privacy: "CURRENT_USER_PROJECTS_ONLY";
}>;

export function studioPortfolioLabel(value: StudioPortfolioGoal | StudioPortfolioInsightType | StudioPortfolioProjectRelation["role"]) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}
