import type { StudioCreativeWorkflowNode, StudioCapabilityExecutionPlan } from "@/features/studio/capabilities/studioCapabilityExecutionPlan";
import type { StudioCreativeAgentSession } from "@/features/studio/capabilities/studioCreativeAgentSession";

export type StudioWorkflowNodeLockStatus = "LOCKED" | "UNLOCKED";
export type StudioWorkflowReviewStatus = "DRAFT" | "REVIEW_REQUIRED" | "CONFIRMED";

export type StudioCreativeWorkflowReviewNode = StudioCreativeWorkflowNode & {
  lockStatus: StudioWorkflowNodeLockStatus;
  humanInstructions: string | null;
  revisionStatus: "UNCHANGED" | "EDITED" | "REPLANNED";
};

export type StudioHumanDecisionRecord = {
  changeId: string;
  nodeId: string | null;
  type: "NODE_LOCKED" | "NODE_UNLOCKED" | "NODE_EDITED" | "NODE_REPLANNED" | "REVIEW_CONFIRMED";
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  reason: string | null;
  createdAt: string;
};

export type StudioCreativeWorkflowReview = {
  reviewId: string;
  sessionId: string;
  planId: string;
  nodes: StudioCreativeWorkflowReviewNode[];
  lockedNodes: string[];
  changes: StudioHumanDecisionRecord[];
  status: StudioWorkflowReviewStatus;
  confirmedPlanId: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  executionBoundary: "REVIEW_ONLY_NO_EXECUTION_OR_CHARGE";
};

export type StudioCreativeWorkflowReviewBundle = {
  review: StudioCreativeWorkflowReview;
  creativePlan: StudioCapabilityExecutionPlan;
  session: StudioCreativeAgentSession;
};
