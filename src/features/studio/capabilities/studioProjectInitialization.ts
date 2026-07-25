export type StudioProjectInitializationRequest = Readonly<{
  requestId: string;
  prompt: string;
  brandContext: string | null;
  goal: string;
  constraints: Readonly<Record<string, string | number | boolean>>;
  createdAt: string;
}>;

export type StudioAIProjectDraft = Readonly<{
  draftId: string;
  draftProjectId: string;
  status: "PREVIEW" | "PROJECT_DRAFT";
  initializationRequest: StudioProjectInitializationRequest;
  intent: string;
  projectGoal: Readonly<{
    goalId: string;
    type: string;
    description: string;
    priority: string;
    status: "DRAFT";
  }>;
  strategy: Readonly<{
    strategyId: string;
    type: string;
    goal: string;
    recommendations: readonly string[];
    status: "DRAFT";
  }>;
  canvasGraph: Readonly<{
    graphId: string;
    projectId: string;
    schemaVersion: string;
    nodes: readonly Readonly<{ nodeId: string; nodeType: string; metadata: Readonly<Record<string, unknown>> }>[];
    edges: readonly Readonly<{ edgeId: string; source: string; target: string; edgeType: string }>[];
  }>;
  roadmap: Readonly<{
    roadmapId: string;
    phases: readonly Readonly<{ phase: "CURRENT" | "NEXT" | "FUTURE"; goal: string }>[];
  }>;
  timelineStructure: Readonly<{
    scenes: readonly Readonly<{ sceneId: string; name: string; clips: readonly unknown[]; status: "PLACEHOLDER" }>[];
    sourceOfTruth: string;
  }>;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidence: readonly Readonly<{
    evidenceId: string;
    type: string;
    referenceId: string;
    summary: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
  }>[];
  createdAt: string;
  confirmedAt: string | null;
  boundary: string;
}>;
