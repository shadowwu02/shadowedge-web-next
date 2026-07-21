import { apiRequest } from "@/lib/api";
import type {
  StudioCreativeAgentRoleBundle,
  StudioCreativeAgentTaskBundle,
} from "@/features/studio/capabilities/studioCreativeAgentCollaboration";

export async function getStudioCreativeAgentRoles() {
  const envelope = await apiRequest<StudioCreativeAgentRoleBundle>("/api/agent/roles");
  if (!Array.isArray(envelope.data?.roles)) throw new Error("Creative Agent Roles were not returned.");
  return envelope.data;
}

export async function getStudioProjectAgentTasks(projectId: string) {
  const envelope = await apiRequest<StudioCreativeAgentTaskBundle>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-tasks`,
  );
  if (envelope.data?.projectId !== projectId || !Array.isArray(envelope.data.tasks)) throw new Error("Creative Agent Tasks were not returned.");
  return envelope.data;
}
