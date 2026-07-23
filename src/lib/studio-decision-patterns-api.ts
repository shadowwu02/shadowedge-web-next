import type { StudioDecisionPatternBundle } from "@/features/studio/capabilities/studioDecisionPattern";
import { apiRequest } from "@/lib/api";

export async function getStudioDecisionPatterns() {
  const envelope = await apiRequest<StudioDecisionPatternBundle>("/api/user/decision-patterns");
  if (!Array.isArray(envelope.data?.patterns)) throw new Error("Decision Patterns were not returned.");
  return envelope.data;
}

export async function deleteStudioDecisionPattern(patternId: string) {
  const envelope = await apiRequest<{ deleted: true; patternId: string }>(
    `/api/user/decision-patterns/${encodeURIComponent(patternId)}`,
    { method: "DELETE" },
  );
  if (!envelope.data?.deleted) throw new Error("Decision Pattern was not deleted.");
  return envelope.data;
}
