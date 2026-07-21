import { apiRequest } from "@/lib/api";
import type {
  StudioModelRecommendation,
  StudioModelRecommendationInput,
  StudioUserModelPreferenceProfile,
} from "@/features/studio/capabilities/studioModelRecommendation";

export async function getStudioModelRecommendation(
  input: StudioModelRecommendationInput,
) {
  const envelope = await apiRequest<{ recommendation: StudioModelRecommendation }>(
    "/api/models/recommend",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  const recommendation = envelope.data?.recommendation;
  if (!recommendation) {
    throw new Error("Model recommendation returned no data.");
  }
  return recommendation;
}

export async function getMyStudioModelPreferences() {
  const envelope = await apiRequest<{ profile: StudioUserModelPreferenceProfile }>(
    "/api/me/model-preferences",
  );
  const profile = envelope.data?.profile;
  if (!profile) {
    throw new Error("User model preferences returned no data.");
  }
  return profile;
}

export async function recordStudioModelRecommendationSelection(
  recommendationId: string,
  selectedModelId: string,
  selectedProviderId = "higgsfield",
) {
  const envelope = await apiRequest<{
    selection: {
      recommendationId: string;
      providerId: string;
      selectedModelId: string;
      accepted: boolean;
      selectedAt: string;
    };
  }>(`/api/models/recommend/events/${encodeURIComponent(recommendationId)}/selection`, {
    method: "POST",
    body: JSON.stringify({ selectedModelId, selectedProviderId }),
  });
  return envelope.data?.selection || null;
}
