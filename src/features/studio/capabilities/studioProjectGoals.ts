export const STUDIO_PROJECT_GOAL_TYPES = ["BUSINESS_GOAL", "CREATIVE_GOAL", "QUALITY_GOAL", "EFFICIENCY_GOAL", "BRAND_GOAL"] as const;
export const STUDIO_GOAL_ALIGNMENT_STATUSES = ["ALIGNED", "PARTIAL", "MISALIGNED"] as const;

export type StudioProjectGoalType = typeof STUDIO_PROJECT_GOAL_TYPES[number];
export type StudioGoalAlignmentStatus = typeof STUDIO_GOAL_ALIGNMENT_STATUSES[number];

export type StudioProjectMission = Readonly<{
  missionId: string;
  projectId: string;
  mission: string;
  vision: string;
  createdAt: string;
  updatedAt: string;
}>;

export type StudioProjectGoal = Readonly<{
  goalId: string;
  projectId: string;
  type: StudioProjectGoalType;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  createdAt: string;
}>;

export type StudioGoalAlignment = Readonly<{
  alignmentId: string;
  projectId: string;
  sourceType: "PROJECT_STRATEGY" | "PROJECT_FUTURE_PLAN";
  sourceId: string;
  status: StudioGoalAlignmentStatus;
  matchedGoalIds: readonly string[];
  missionId: string;
  reason: string;
  createdAt: string;
}>;

export type StudioProjectGoalsBundle = Readonly<{
  projectId: string;
  mission: StudioProjectMission;
  goals: readonly StudioProjectGoal[];
  alignments: readonly StudioGoalAlignment[];
  summary: Readonly<{ aligned: number; partial: number; misaligned: number }>;
  generatedAt: string;
  privacy: "CURRENT_USER_CURRENT_PROJECT_ONLY";
  actionBoundary: "GOAL_REVIEW_PREVIEW_CONFIRM_CREATES_DRAFT_ONLY";
}>;

export function studioProjectGoalLabel(type: StudioProjectGoalType) {
  return type.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (value) => value.toUpperCase());
}
