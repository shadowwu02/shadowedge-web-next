import type {
  StudioProductionDeliveryCollection,
  StudioProductionDeliveryPackage,
} from "@/features/studio/capabilities/studioProductionDelivery";
import { apiRequest } from "@/lib/api";

function assertPackage(data: StudioProductionDeliveryPackage | undefined) {
  if (
    !data?.packageId ||
    !data.productionId ||
    !data.version ||
    !Array.isArray(data.outputs) ||
    !Array.isArray(data.assets)
  ) {
    throw new Error("Production Delivery Package was not returned.");
  }
  return data;
}

export async function getStudioProductionDeliveryPackages(
  projectId: string,
  signal?: AbortSignal,
) {
  const response = await apiRequest<StudioProductionDeliveryCollection>(
    `/api/projects/${encodeURIComponent(projectId)}/delivery-packages`,
    { signal },
  );
  if (
    !response.data?.productionId ||
    !Array.isArray(response.data.packages) ||
    !Array.isArray(response.data.allowedVersions)
  ) {
    throw new Error("Production Delivery Workspace was not returned.");
  }
  return response.data;
}

export async function createStudioProductionDeliveryPackage(
  projectId: string,
  version: string,
) {
  const response = await apiRequest<StudioProductionDeliveryPackage>(
    `/api/projects/${encodeURIComponent(projectId)}/delivery-package`,
    {
      method: "POST",
      body: JSON.stringify({ version }),
    },
  );
  return assertPackage(response.data);
}
