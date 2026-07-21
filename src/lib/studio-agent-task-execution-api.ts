import { apiRequest } from "@/lib/api";
import type { StudioAgentTaskExecutionBundle } from "@/features/studio/capabilities/studioAgentTaskExecutionBinding";

export async function createStudioAgentTaskExecutionPreview(input: {
  runtimeTaskId: string;
  projectId: string;
  sourcePlanId: string;
  executionPlanId?: string;
  capability?: string;
}) {
  const envelope = await apiRequest<StudioAgentTaskExecutionBundle>(
    `/api/agent/tasks/${encodeURIComponent(input.runtimeTaskId)}/execution-preview`,
    {
      method: "POST",
      body: JSON.stringify({
        projectId: input.projectId,
        sourcePlanId: input.sourcePlanId,
        executionPlanId: input.executionPlanId,
        capability: input.capability,
      }),
    },
  );
  if (!envelope.data?.binding?.executionNodeId) throw new Error("Agent Task Execution Preview returned no binding.");
  return envelope.data;
}

export async function getStudioAgentTaskExecutionStatus(runtimeTaskId: string) {
  const envelope = await apiRequest<StudioAgentTaskExecutionBundle>(
    `/api/agent/tasks/${encodeURIComponent(runtimeTaskId)}/execution-status`,
  );
  if (!envelope.data?.binding?.executionNodeId) throw new Error("Agent Task Execution status returned no binding.");
  return envelope.data;
}
