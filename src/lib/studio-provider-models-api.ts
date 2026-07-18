import { apiRequest } from "@/lib/api";
import type { StudioProviderModelInventory } from "@/features/studio/capabilities/studioVideoModelResolver";

const inventoryCache = new Map<string, StudioProviderModelInventory>();
const inventoryRequests = new Map<string, Promise<StudioProviderModelInventory>>();

function inventoryKey(providerId: string, capability: string) {
  return `${providerId}:${capability}`;
}

export async function getStudioProviderModelInventory(
  providerId = "higgsfield",
  capability = "video_generate",
) {
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
  providerId = "higgsfield",
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
  providerId = "higgsfield",
  capability = "video_generate",
) {
  return inventoryCache.get(inventoryKey(providerId, capability)) || null;
}
