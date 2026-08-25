import { apiRequest } from "@/lib/api";
import type { StudioProviderModelInventory } from "@/features/studio/capabilities/studioVideoModelResolver";
import { getVideoModels } from "@/lib/video-api";
import type { VideoModel } from "@/types/video";

export function projectStudioPublicVideoCatalog(
  inputModels: VideoModel[],
  now = new Date(),
): StudioProviderModelInventory {
  const models = inputModels.filter((model) => model.available !== false);
  return {
    providerId: "seedance",
    capability: "video_generate",
    models: models.map((model) => ({
      id: model.id,
      providerId: "seedance",
      capability: "video_generate",
      runtimeAdapter: "existing_video_api",
      label: model.label,
      enabled: true,
      catalogModel: model,
      metadata: {
        providerModel: model.providerModel || model.id,
        description: model.desc || "Video generation",
        defaultMode: "video",
        modes: ["video"],
        credits: null,
        creditBase: model.creditBase || null,
        creditTable: model.creditRules?.table || {},
        supportsAudio: model.supportsAudio === true,
        hot: false,
      },
      limits: {
        durations: [...model.durations],
        ratios: [...model.ratios],
        resolutions: [...model.qualities],
        uploadSlots: [...(model.uploadSlots || [])],
        acceptedMediaTypes: [
          ...(model.referenceImages ? ["image"] : []),
          ...(model.referenceVideos ? ["video"] : []),
          ...(model.referenceAudios ? ["audio"] : []),
        ],
      },
      readiness: {
        status: "READY",
        executable: true,
        verifiedScopes: ["PUBLIC_CATALOG"],
        verifiedParameters: [],
        blockers: [],
      },
    })),
    metadata: {
      source: "public_video_catalog",
      dynamic: true,
      fetchedAt: now.toISOString(),
      modelCount: models.length,
    },
    limits: { source: "public_video_catalog", perModel: true },
    readiness: {
      provider: "seedance",
      ready: models.length > 0,
      checks: {
        catalog: models.length > 0,
        auth: true,
        credential: true,
        transport: true,
        runtime: true,
        workspace: true,
        cost: true,
      },
      blockers: [],
      error: null,
      credential: {
        strategy: "backend_session",
        configured: true,
        environmentVariables: [],
      },
      checkedAt: now.toISOString(),
      cached: false,
    },
    enabled: models.length > 0,
  };
}

async function getPublicVideoCatalogInventory(): Promise<StudioProviderModelInventory> {
  return projectStudioPublicVideoCatalog(await getVideoModels());
}

const inventoryCache = new Map<string, StudioProviderModelInventory>();
const inventoryRequests = new Map<string, Promise<StudioProviderModelInventory>>();

function inventoryKey(providerId: string, capability: string) {
  return `${providerId}:${capability}`;
}

export async function getStudioProviderModelInventory(
  providerId = "seedance",
  capability = "video_generate",
) {
  if (providerId === "seedance") {
    const inventory = await getPublicVideoCatalogInventory();
    inventoryCache.set(inventoryKey(providerId, capability), inventory);
    return inventory;
  }
  const params = new URLSearchParams({ providerId, capability });
  const envelope = await apiRequest<{ inventory: StudioProviderModelInventory }>(
    `/api/studio/provider-models?${params.toString()}`,
    { method: "GET" },
  );
  const inventory = envelope.data?.inventory;
  if (!inventory) {
    throw new Error("Studio provider model inventory returned no data.");
  }
  inventoryCache.set(inventoryKey(providerId, capability), inventory);
  return inventory;
}

export function loadStudioProviderModelInventory(
  providerId = "seedance",
  capability = "video_generate",
) {
  const key = inventoryKey(providerId, capability);
  const cached = inventoryCache.get(key);
  if (cached) return Promise.resolve(cached);
  const existing = inventoryRequests.get(key);
  if (existing) return existing;
  const request = getStudioProviderModelInventory(providerId, capability)
    .finally(() => inventoryRequests.delete(key));
  inventoryRequests.set(key, request);
  return request;
}

export function getCachedStudioProviderModelInventory(
  providerId = "seedance",
  capability = "video_generate",
) {
  return inventoryCache.get(inventoryKey(providerId, capability)) || null;
}
