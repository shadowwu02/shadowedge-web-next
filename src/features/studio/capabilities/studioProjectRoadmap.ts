export const STUDIO_ROADMAP_PHASES = ["CURRENT", "NEXT", "FUTURE"] as const;
export type StudioRoadmapPhaseType = typeof STUDIO_ROADMAP_PHASES[number];
export type StudioRoadmapConfidence = "HIGH" | "MEDIUM" | "LOW";

export type StudioRoadmapEvidence = Readonly<{
  type: "PROJECT_MEMORY" | "STRATEGY_OUTCOME" | "FUTURE_PLAN";
  referenceId: string;
  summary: string;
  confidence: string;
}>;

export type StudioRoadmapPhase = Readonly<{
  phaseId: string;
  phase: StudioRoadmapPhaseType;
  goal: string;
  status: "ACTIVE" | "PROPOSED";
  milestones: readonly string[];
  strategies: readonly string[];
  evidence: readonly StudioRoadmapEvidence[];
  confidence: StudioRoadmapConfidence;
}>;

export type StudioStrategyEvolutionRecord = Readonly<{
  evolutionId: string;
  pastStrategies: readonly Readonly<{
    strategyId: string;
    type: string;
    decision: string;
    effect: string;
    createdAt: string;
  }>[];
  currentStrategy: Readonly<{
    strategyId: string;
    type: string;
    goal: string;
    decision: string;
    effect: string;
    confidence: StudioRoadmapConfidence;
  }> | null;
  futureSuggestions: readonly Readonly<{
    proposalId: string;
    type: string;
    goal: string;
    confidence: StudioRoadmapConfidence;
  }>[];
  evidence: readonly StudioRoadmapEvidence[];
  confidence: StudioRoadmapConfidence;
  createdAt: string;
}>;

export type StudioProjectRoadmap = Readonly<{
  roadmapId: string;
  projectId: string;
  phases: readonly StudioRoadmapPhase[];
  milestones: readonly Readonly<{
    milestoneId: string;
    type: string;
    phase: "CURRENT";
    summary: string;
    confidence: string;
    createdAt: string;
  }>[];
  strategies: readonly StudioStrategyEvolutionRecord[];
  confidence: StudioRoadmapConfidence;
  createdAt: string;
  evidenceSummary: Readonly<{
    memoryMilestones: number;
    successfulPatterns: number;
    governedStrategies: number;
    futurePlans: number;
  }>;
  action: Readonly<{
    actionId: string;
    status: "PREVIEWED" | "CONFIRMED";
    draftId: string | null;
  }> | null;
  controlBoundary: Readonly<{
    analysisOnly: true;
    projectDirectionMutation: false;
    workflowCreation: false;
    execution: false;
    automaticPublish: false;
    creditsDeducted: false;
  }>;
}>;

export type StudioProjectRoadmapPreview = Readonly<{
  roadmap: StudioProjectRoadmap;
  action: Readonly<{
    actionId: string;
    status: "PREVIEWED" | "CONFIRMED";
  }>;
  preview: Readonly<{
    draftType: "PROJECT_ACTION_DRAFT";
    roadmapDraftType: "PROJECT_ROADMAP_DRAFT";
    roadmapId: string;
    phases: readonly StudioRoadmapPhase[];
    confidence: StudioRoadmapConfidence;
    impactScope: "ROADMAP_REVIEW_DRAFT_ONLY";
    requiresConfirmation: true;
    safety: "NO_PROJECT_DIRECTION_MUTATION_NO_WORKFLOW_CREATION_NO_EXECUTION_NO_PUBLISH_NO_CREDITS";
  }>;
  draft: StudioProjectRoadmapDraft | null;
}>;

export type StudioProjectRoadmapDraft = Readonly<{
  draftId: string;
  projectId: string;
  actionId: string;
  suggestionId: string;
  actionType: "PROJECT_ACTION_DRAFT";
  draftType: "PROJECT_ACTION_DRAFT";
  roadmapDraftType: "PROJECT_ROADMAP_DRAFT";
  source: "PROJECT_ROADMAP";
  sourceId: string;
  phases: readonly StudioRoadmapPhase[];
  strategies: readonly StudioStrategyEvolutionRecord[];
  confidence: StudioRoadmapConfidence;
  status: "DRAFT";
  createdAt: string;
}>;

export function studioRoadmapPhaseLabel(phase: StudioRoadmapPhaseType) {
  return ({
    CURRENT: "Current phase",
    NEXT: "Next phase",
    FUTURE: "Future direction",
  } as const)[phase];
}
