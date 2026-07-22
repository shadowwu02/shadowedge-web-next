import { apiRequest } from "@/lib/api";
import type { StudioProjectFuturePlansBundle } from "@/features/studio/capabilities/studioProjectFuturePlans";

export async function getStudioProjectFuturePlans(projectId: string) {
  const envelope = await apiRequest<StudioProjectFuturePlansBundle>(
    `/api/projects/${encodeURIComponent(projectId)}/future-plans`,
  );
  if (!envelope.data?.projectId || !Array.isArray(envelope.data.plans)) throw new Error("Project Future Plans were not returned.");
  return envelope.data;
}
