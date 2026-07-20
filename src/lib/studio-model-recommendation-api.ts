import { apiRequest } from "@/lib/api";
import type {
  StudioModelRecommendation,
  StudioModelRecommendationInput,
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
