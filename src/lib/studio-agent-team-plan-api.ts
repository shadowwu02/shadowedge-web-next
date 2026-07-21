import { apiRequest } from "@/lib/api";
import type { StudioAgentTeamPlanBundle } from "@/features/studio/capabilities/studioDynamicAgentTeamPlan";

export type StudioAgentTeamPlanInput = {
  projectId: string;
  sessionId?: string;
  intent: {
    intentId: string;
    intentType: string;
  };
  capabilities: string[];
};

export async function createStudioAgentTeamPlan(input: StudioAgentTeamPlanInput) {
  const envelope = await apiRequest<StudioAgentTeamPlanBundle>("/api/agent/team-plan", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!envelope.data?.teamPlan) throw new Error("Agent Team Plan was not returned.");
  return envelope.data;
}

export async function getStudioProjectAgentTeamPlan(projectId: string) {
  const envelope = await apiRequest<StudioAgentTeamPlanBundle>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-team-plan`,
  );
  if (!envelope.data) throw new Error("Agent Team Plan state was not returned.");
  return envelope.data;
}

export async function approveStudioAgentTeamPlan(teamPlanId: string, projectId: string) {
  const envelope = await apiRequest<StudioAgentTeamPlanBundle>(
    `/api/agent/team-plan/${encodeURIComponent(teamPlanId)}/approve`,
    { method: "POST", body: JSON.stringify({ projectId }) },
  );
  if (envelope.data?.teamPlan?.status !== "APPROVED") throw new Error("Agent Team Plan approval was not saved.");
  return envelope.data;
}
