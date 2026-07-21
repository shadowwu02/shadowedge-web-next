import { apiRequest } from "@/lib/api";
import type {
  StudioExecutionStatus,
  StudioWorkflowExecutionPlan,
} from "@/features/studio/capabilities/studioWorkflowExecutionPlan";

export async function createStudioWorkflowExecutionPreview(sourcePlanId: string) {
  const envelope = await apiRequest<StudioWorkflowExecutionPlan>(
    `/api/capabilities/plans/${encodeURIComponent(sourcePlanId)}/execution-preview`,
    { method: "POST", body: JSON.stringify({ preview: true }) },
  );
  if (!envelope.data?.executionPlanId) throw new Error("Execution Preview returned no plan.");
  return envelope.data;
}

export async function confirmStudioWorkflowExecutionPlan(executionPlanId: string) {
  const envelope = await apiRequest<StudioWorkflowExecutionPlan>(
    `/api/execution-plans/${encodeURIComponent(executionPlanId)}/confirm`,
    { method: "POST", body: JSON.stringify({ confirmation: "USER_CONFIRMED" }) },
  );
  if (envelope.data?.status !== "CONFIRMED") throw new Error("Execution Plan was not confirmed.");
  return envelope.data;
}

export async function getStudioWorkflowExecutionStatus(executionPlanId: string) {
  const envelope = await apiRequest<StudioExecutionStatus>(
    `/api/execution-plans/${encodeURIComponent(executionPlanId)}/status`,
  );
  if (!envelope.data?.executionPlanId) throw new Error("Execution status returned no plan.");
  return envelope.data;
}

export async function executeStudioWorkflowNode(
  executionNodeId: string,
  input: {
    prompt: string;
    materialization: {
      projectId: string;
      sourceNodeId: string;
      outputNodeId?: string;
    };
  },
) {
  const envelope = await apiRequest<StudioExecutionStatus>(
    `/api/execution-nodes/${encodeURIComponent(executionNodeId)}/execute`,
    {
      method: "POST",
      body: JSON.stringify({
        confirmation: "EXECUTE_NODE",
        input: { prompt: input.prompt },
        materialization: input.materialization,
      }),
    },
  );
  if (!envelope.data?.executionPlanId) throw new Error("Execution Runtime returned no plan status.");
  return envelope.data;
}
