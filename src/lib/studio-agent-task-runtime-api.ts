import { apiRequest } from "@/lib/api";
import type {
  StudioAgentTaskRuntimeBundle,
  StudioHumanCheckpointDecision,
  StudioHumanCheckpointType,
} from "@/features/studio/capabilities/studioAgentTaskRuntime";

export async function getStudioProjectAgentTaskRuntime(projectId: string) {
  const envelope = await apiRequest<StudioAgentTaskRuntimeBundle>(
    `/api/projects/${encodeURIComponent(projectId)}/agent-task-runtime`,
  );
  if (!envelope.data) throw new Error("Agent Task Runtime state was not returned.");
  return envelope.data;
}

export async function submitStudioAgentTaskCheckpoint(input: {
  runtimeTaskId: string;
  projectId: string;
  type: StudioHumanCheckpointType;
  decision: StudioHumanCheckpointDecision;
  reason?: string;
}) {
  const envelope = await apiRequest<StudioAgentTaskRuntimeBundle>(
    `/api/agent/tasks/${encodeURIComponent(input.runtimeTaskId)}/checkpoint`,
    {
      method: "POST",
      body: JSON.stringify({
        projectId: input.projectId,
        type: input.type,
        decision: input.decision,
        reason: input.reason,
      }),
    },
  );
  if (!envelope.data?.runtime) throw new Error("Human Checkpoint state was not returned.");
  return envelope.data;
}
