import type { StudioProductionExecutionApproval } from "@/features/studio/capabilities/studioProductionExecutionApproval";
import { apiRequest } from "@/lib/api";

export async function createStudioProductionExecutionApproval(projectId: string, runId: string) {
  const response = await apiRequest<StudioProductionExecutionApproval>(
    `/api/projects/${encodeURIComponent(projectId)}/production-run/approval`,
    { method: "POST", body: JSON.stringify({ runId }) },
  );
  if (!response.data?.approvalId) {
    throw new Error("Production Execution Approval Package was not returned.");
  }
  return response.data;
}

export async function confirmStudioProductionExecutionApproval(
  projectId: string,
  approvalId: string,
) {
  const response = await apiRequest<StudioProductionExecutionApproval>(
    `/api/projects/${encodeURIComponent(projectId)}/production-run/approval/${encodeURIComponent(approvalId)}/confirm`,
    { method: "POST", body: JSON.stringify({ confirm: true }) },
  );
  if (!response.data?.approvalId || response.data.status !== "APPROVED") {
    throw new Error("Approved Production Execution Package was not returned.");
  }
  return response.data;
}
