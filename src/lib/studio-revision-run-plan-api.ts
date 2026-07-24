import type {
  StudioRevisionRunPlanResponse,
  StudioRevisionScopeItem,
} from "@/features/studio/capabilities/studioRevisionRunPlan";
import { apiRequest } from "@/lib/api";

function assertPlan(data: StudioRevisionRunPlanResponse | undefined) {
  if (!data?.plan?.revisionRunId) {
    throw new Error("Revision Run Plan was not returned.");
  }
  return data;
}

export async function getStudioRevisionRunPlan(
  projectId: string,
  deliveryPackageId: string,
  signal?: AbortSignal,
) {
  const response = await apiRequest<StudioRevisionRunPlanResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/revision-run-plan?deliveryPackageId=${encodeURIComponent(deliveryPackageId)}`,
    { signal },
  );
  return assertPlan(response.data);
}

export async function createStudioRevisionRunPlan(
  projectId: string,
  input: Readonly<{
    proposalId: string;
    deliveryPackageId: string;
    revisionScope?: readonly StudioRevisionScopeItem[];
  }>,
) {
  const response = await apiRequest<StudioRevisionRunPlanResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/revision-run-plan`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return assertPlan(response.data);
}

export async function confirmStudioRevisionRunPlan(
  projectId: string,
  revisionRunId: string,
  deliveryPackageId: string,
) {
  const response = await apiRequest<StudioRevisionRunPlanResponse>(
    `/api/projects/${encodeURIComponent(projectId)}/revision-run-plan`,
    {
      method: "POST",
      body: JSON.stringify({ revisionRunId, deliveryPackageId, confirm: true }),
    },
  );
  return assertPlan(response.data);
}
