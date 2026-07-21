import { apiRequest } from "@/lib/api";
import type { StudioCreativeWorkflowReviewBundle } from "@/features/studio/capabilities/studioCreativeWorkflowReview";

type ReviewAction = "CREATE" | "LOCK_NODE" | "UNLOCK_NODE" | "EDIT_NODE" | "CONFIRM_REVIEW";

function requireReview(data: StudioCreativeWorkflowReviewBundle | undefined) {
  if (!data?.review?.reviewId || !data.session?.sessionId || !data.creativePlan?.planId) throw new Error("Workflow Review was not returned.");
  return data;
}

export async function updateStudioCreativeWorkflowReview(
  sessionId: string,
  input: { action: ReviewAction; nodeId?: string; instruction?: string; reason?: string },
) {
  const envelope = await apiRequest<StudioCreativeWorkflowReviewBundle>(
    `/api/agent/workflows/${encodeURIComponent(sessionId)}/review`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return requireReview(envelope.data);
}

export async function replanStudioCreativeWorkflowNode(
  sessionId: string,
  input: { nodeId: string; instruction: string; reason?: string },
) {
  const envelope = await apiRequest<StudioCreativeWorkflowReviewBundle>(
    `/api/agent/workflows/${encodeURIComponent(sessionId)}/replan`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return requireReview(envelope.data);
}
