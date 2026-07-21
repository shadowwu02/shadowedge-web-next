import { apiRequest } from "@/lib/api";
import type { StudioCapabilityIntentResolution } from "@/features/studio/capabilities/studioCreativeIntent";
import type { StudioModelRecommendationInput } from "@/features/studio/capabilities/studioModelRecommendation";

export type StudioCapabilityIntentInput = {
  prompt: string;
  media: StudioModelRecommendationInput["referenceMedia"];
  constraints: {
    duration: number;
    ratio: string;
    resolution: string;
    audio: boolean;
  };
  userPreferences: StudioModelRecommendationInput["userPreference"];
};

export async function resolveStudioCapabilityIntent(input: StudioCapabilityIntentInput) {
  const envelope = await apiRequest<StudioCapabilityIntentResolution>(
    "/api/capabilities/resolve-intent",
    { method: "POST", body: JSON.stringify(input) },
  );
  const resolution = envelope.data;
  if (!resolution?.intent) throw new Error("Capability Intent routing returned no data.");
  return resolution;
}
