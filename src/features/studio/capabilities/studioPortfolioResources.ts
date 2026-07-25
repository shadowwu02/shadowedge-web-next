export const STUDIO_PORTFOLIO_RESOURCE_OPPORTUNITIES = [
  "ASSET_REUSE",
  "WORKFLOW_REUSE",
  "AGENT_CAPACITY",
  "COST_OPTIMIZATION",
  "PROJECT_PRIORITY",
] as const;

export type StudioPortfolioResourceOpportunityType =
  typeof STUDIO_PORTFOLIO_RESOURCE_OPPORTUNITIES[number];
export type StudioPortfolioResourceConfidence = "HIGH" | "MEDIUM" | "LOW";

export type StudioPortfolioResourceSnapshot = Readonly<{
  portfolioId: string;
  assets: readonly Readonly<{
    assetId: string;
    name: string;
    mediaType: string;
    usageCount: number;
    projectIds: readonly string[];
    reuseScore: number;
    utilization: "HIGH" | "MEDIUM" | "LOW";
  }>[];
  agents: readonly Readonly<{
    projectId: string;
    roles: readonly string[];
    taskCount: number;
    activeTasks: number;
    utilization: number;
    status: "ALLOCATED" | "UNALLOCATED";
  }>[];
  workflows: readonly Readonly<{
    templateId: string;
    name: string;
    capabilities: readonly string[];
    roleCount: number;
    usageCount: number;
    qualityScore: number;
    status: string;
    reuseScore: number;
  }>[];
  usage: Readonly<{
    assetUses: number;
    reusableAssets: number;
    allocatedAgentRoles: number;
    activeAgentTasks: number;
    activeWorkflows: number;
    workflowUses: number;
    projects: readonly Readonly<{
      projectId: string;
      projectName: string;
      priority: "HIGH" | "MEDIUM" | "LOW";
      assetCount: number;
      assetUses: number;
      agentRoles: number;
      activeTasks: number;
      estimatedCredits: number;
    }>[];
  }>;
  cost: Readonly<{
    estimatedCredits: number;
    shadowCredits: number;
    providerCost: number | null;
    currency: string | null;
    unknownCost: number;
    knownCostRatio: number;
    confidence: StudioPortfolioResourceConfidence;
  }>;
  opportunities: readonly Readonly<{
    opportunityId: string;
    type: StudioPortfolioResourceOpportunityType;
    projectIds: readonly string[];
    summary: string;
    expectedImpact: string;
    evidenceRefs: readonly string[];
    confidence: StudioPortfolioResourceConfidence;
    status: "SUGGESTED_NOT_APPLIED";
  }>[];
  confidence: StudioPortfolioResourceConfidence;
  createdAt: string;
  risks: readonly string[];
  evidence: readonly Readonly<{
    evidenceId: string;
    type: "PORTFOLIO_STRATEGY" | "RESOURCE_INTELLIGENCE" | "PROJECT_INTELLIGENCE" | "WORKFLOW_TEMPLATE";
    sourceRef: string;
    projectIds: readonly string[];
    summary: string;
    confidence: StudioPortfolioResourceConfidence;
  }>[];
  priorities: readonly Readonly<{
    projectId: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    status: "SUGGESTED_NOT_APPLIED";
  }>[];
  privacy: "CURRENT_USER_PORTFOLIO_RESOURCES_ONLY";
  allocationMode: "SUGGESTED_NOT_APPLIED";
  action: Readonly<{
    actionId: string;
    status: "PREVIEWED" | "CONFIRMED";
    draftId: string | null;
  }> | null;
  controlBoundary: Readonly<{
    analysisOnly: true;
    priorityMutation: false;
    resourceMovement: false;
    workflowMutation: false;
    automaticExecution: false;
    creditsDeducted: false;
  }>;
}>;

export type StudioPortfolioResourceDraft = Readonly<{
  draftId: string;
  portfolioId: string;
  actionId: string;
  draftType: "PORTFOLIO_RESOURCE_DRAFT";
  opportunities: StudioPortfolioResourceSnapshot["opportunities"];
  priorities: StudioPortfolioResourceSnapshot["priorities"];
  evidence: StudioPortfolioResourceSnapshot["evidence"];
  status: "DRAFT";
  createdAt: string;
}>;

export type StudioPortfolioResourcePreview = Readonly<{
  resources: StudioPortfolioResourceSnapshot;
  action: Readonly<{
    actionId: string;
    status: "PREVIEWED" | "CONFIRMED";
  }>;
  preview: Readonly<{
    draftType: "PORTFOLIO_RESOURCE_DRAFT";
    portfolioId: string;
    opportunities: StudioPortfolioResourceSnapshot["opportunities"];
    priorities: StudioPortfolioResourceSnapshot["priorities"];
    risks: readonly string[];
    impactScope: "PORTFOLIO_RESOURCE_DRAFT_ONLY";
    requiresConfirmation: true;
  }>;
  draft: StudioPortfolioResourceDraft | null;
}>;

export function studioPortfolioResourceLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}
