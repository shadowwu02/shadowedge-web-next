export const STUDIO_PROJECT_MEMORY_TYPES = [
  "CREATIVE_DIRECTION",
  "STYLE_EVOLUTION",
  "WORKFLOW_EVOLUTION",
  "QUALITY_LEARNING",
  "CLIENT_PREFERENCE",
  "DECISION_HISTORY",
] as const;

export type StudioProjectMemoryType = typeof STUDIO_PROJECT_MEMORY_TYPES[number];
export type StudioProjectMemoryConfidence =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "EXPLICIT"
  | "STRONG_PATTERN"
  | "EARLY_SIGNAL";

export type StudioProjectMemorySource = Readonly<{
  sourceType: string;
  referenceId: string;
  qualification: string;
  createdAt: string | null;
}>;

export type StudioProjectMemoryMilestone = Readonly<{
  memoryId: string;
  type: StudioProjectMemoryType;
  milestone: string;
  summary: string;
  confidence: StudioProjectMemoryConfidence;
  source: StudioProjectMemorySource;
  createdAt: string;
}>;

export type StudioProjectMemoryDecision = Readonly<{
  memoryId: string;
  type: "CLIENT_PREFERENCE" | "DECISION_HISTORY";
  decisionType: string;
  choice: string;
  summary: string;
  confidence: StudioProjectMemoryConfidence;
  sources: readonly StudioProjectMemorySource[];
  createdAt: string;
}>;

export type StudioProjectMemoryPattern = Readonly<{
  memoryId: string;
  type: StudioProjectMemoryType;
  pattern: string;
  summary: string;
  confidence: StudioProjectMemoryConfidence;
  source: StudioProjectMemorySource;
  createdAt: string;
}>;

export type StudioProjectMemoryLesson = Readonly<{
  memoryId: string;
  type: StudioProjectMemoryType;
  summary: string;
  confidence: StudioProjectMemoryConfidence;
  source: StudioProjectMemorySource;
  createdAt: string;
}>;

export type StudioProjectMemorySnapshot = Readonly<{
  projectId: string;
  milestones: readonly StudioProjectMemoryMilestone[];
  decisions: readonly StudioProjectMemoryDecision[];
  successfulPatterns: readonly StudioProjectMemoryPattern[];
  lessons: readonly StudioProjectMemoryLesson[];
  memoryTypes: readonly StudioProjectMemoryType[];
  sourceQualification: Readonly<{
    approvedDeliveries: number;
    successfulRevisions: number;
    decisionPatterns: number;
    projectEvolution: number;
    projectLinkedPostmortems: number;
    excluded: Readonly<{
      unapprovedDeliveries: number;
      unfinishedRevisions: number;
      unqualifiedDecisionPatterns: number;
    }>;
  }>;
  updatedAt: string;
  privacy: "CURRENT_USER_CURRENT_PROJECT_ONLY_NO_CROSS_USER_LEARNING";
  safety: "READ_ONLY_MEMORY_NO_PROJECT_CONTEXT_DIRECTION_EXECUTION_OR_CREDITS_MUTATION";
}>;

export function studioProjectMemoryTypeLabel(type: StudioProjectMemoryType) {
  return ({
    CREATIVE_DIRECTION: "Creative direction",
    STYLE_EVOLUTION: "Style evolution",
    WORKFLOW_EVOLUTION: "Workflow evolution",
    QUALITY_LEARNING: "Quality learning",
    CLIENT_PREFERENCE: "Client preference",
    DECISION_HISTORY: "Decision history",
  } as const)[type];
}
