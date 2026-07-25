import type {
  StudioCanvasDecisionHistory,
  StudioCanvasDecisionOptionId,
  StudioCanvasDecisionRecord,
  StudioCanvasDecisionOutcome,
} from "@/features/studio/capabilities/studioCreativeCanvasDecision";
import { apiRequest } from "@/lib/api";

const base = (projectId: string) =>
  `/api/projects/${encodeURIComponent(projectId)}/creative-canvas`;

export async function getStudioCreativeCanvasDecisionHistory(
  projectId: string,
  signal?: AbortSignal,
) {
  const response = await apiRequest<StudioCanvasDecisionHistory>(
    `${base(projectId)}/decision-history`,
    { signal },
  );
  if (!response.data?.projectId || !Array.isArray(response.data.decisions)) {
    throw new Error("Canvas Decision History response was incomplete.");
  }
  return response.data;
}

export async function recordStudioCreativeCanvasDecision(
  projectId: string,
  input: {
    simulationId: string;
    selectedOption: StudioCanvasDecisionOptionId;
    reason: string;
  },
) {
  const response = await apiRequest<StudioCanvasDecisionRecord>(
    `${base(projectId)}/decision`,
    { method: "POST", body: JSON.stringify(input) },
  );
  if (!response.data?.decisionId) throw new Error("Canvas Decision was not recorded.");
  return response.data;
}

export async function bindStudioCreativeCanvasDecisionOutcome(
  projectId: string,
  decisionId: string,
  outcome: Omit<StudioCanvasDecisionOutcome, "createdAt">,
) {
  const response = await apiRequest<StudioCanvasDecisionRecord>(
    `${base(projectId)}/decision`,
    { method: "POST", body: JSON.stringify({ decisionId, outcome }) },
  );
  if (!response.data?.decisionId) throw new Error("Canvas Decision Outcome was not recorded.");
  return response.data;
}
