export type StudioCreativeAgentMemoryType =
  | "STYLE_PREFERENCE"
  | "CHARACTER_REFERENCE"
  | "PROJECT_GOAL"
  | "WORKFLOW_PREFERENCE"
  | "MODEL_PREFERENCE"
  | "USER_FEEDBACK_SUMMARY";

export type StudioProjectCreativeContext = {
  projectId: string;
  userId: string;
  brandContext: string;
  visualStyle: string;
  characters: string[];
  preferredModels: string[];
  creativeGoals: string[];
  updatedAt: string;
};

export type StudioCreativeAgentMemory = {
  memoryId: string;
  projectId: string;
  sessionId: string | null;
  type: StudioCreativeAgentMemoryType;
  content: unknown;
  confidence: number;
  source: "USER_EXPLICIT_INPUT" | "USER_CONFIRMED_PLAN" | "USER_FEEDBACK" | "PROJECT_ASSET_METADATA";
  createdAt: string;
  updatedAt: string;
};

export type StudioProjectAgentContextBundle = {
  context: StudioProjectCreativeContext;
  memories: StudioCreativeAgentMemory[];
  memoryCount: number;
  privacy: "CURRENT_USER_CURRENT_PROJECT_ONLY";
  executionBoundary: "RECOMMENDATION_AND_PLANNING_HINTS_ONLY";
};

export type StudioCreativeAgentPlanningContext = {
  projectId: string;
  usedMemoryIds: string[];
  memoryCount: number;
  projectContext: StudioProjectCreativeContext;
  safety: {
    bypassAvailability: false;
    bypassReadiness: false;
    bypassVerifiedScope: false;
    bypassCostGate: false;
  };
};

export function formatStudioMemoryContent(memory: StudioCreativeAgentMemory) {
  if (!memory.content || typeof memory.content !== "object") return "Saved project preference";
  const content = memory.content as Record<string, unknown>;
  if (typeof content.value === "string") return content.value;
  if (Array.isArray(content.value)) return content.value.join(", ");
  if (Array.isArray(content.capabilities)) return content.capabilities.join(" → ");
  if (typeof content.feedbackType === "string") return `${content.feedbackType.replaceAll("_", " ")} · ${Number(content.rating || 0)}/5`;
  return "Saved project preference";
}
