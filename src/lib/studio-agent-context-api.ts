import { apiRequest } from "@/lib/api";
import type {
  StudioProjectAgentContextBundle,
  StudioProjectCreativeContext,
} from "@/features/studio/capabilities/studioCreativeAgentMemory";

export type StudioProjectContextUpdate = Pick<
  StudioProjectCreativeContext,
  "brandContext" | "visualStyle" | "characters" | "preferredModels" | "creativeGoals"
>;

export async function getStudioProjectAgentContext(projectId: string) {
  const envelope = await apiRequest<StudioProjectAgentContextBundle>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-context`,
  );
  if (!envelope.data?.context?.projectId) throw new Error("Project context was not returned.");
  return envelope.data;
}

export async function updateStudioProjectAgentContext(projectId: string, input: StudioProjectContextUpdate) {
  const envelope = await apiRequest<StudioProjectAgentContextBundle>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-context`,
    { method: "PUT", body: JSON.stringify(input) },
  );
  if (!envelope.data?.context?.projectId) throw new Error("Project context was not saved.");
  return envelope.data;
}

export async function deleteStudioProjectAgentMemory(projectId: string, memoryId: string) {
  const envelope = await apiRequest<{ deleted: boolean; memoryId: string }>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-context/memories/${encodeURIComponent(memoryId)}`,
    { method: "DELETE" },
  );
  if (!envelope.data?.deleted) throw new Error("Project memory was not deleted.");
  return envelope.data;
}
