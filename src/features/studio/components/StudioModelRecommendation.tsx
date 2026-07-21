"use client";

import { useState } from "react";
import {
  createStudioModelRecommendationContext,
  createStudioModelRecommendationPatch,
  type StudioModelRecommendation,
  type StudioModelRecommendationCandidate,
  type StudioModelRecommendationContext,
  type StudioModelRecommendationInput,
} from "@/features/studio/capabilities/studioModelRecommendation";
import type { StudioProviderModelInventory } from "@/features/studio/capabilities/studioVideoModelResolver";
import {
  getStudioModelRecommendation,
  recordStudioModelRecommendationSelection,
} from "@/lib/studio-model-recommendation-api";

type Preference = StudioModelRecommendationInput["userPreference"]["priority"];

export function StudioModelRecommendation({
  inventory,
  prompt,
  duration,
  ratio,
  qualityGoal,
  referenceMedia,
  onApply,
  onObserved,
}: {
  inventory: StudioProviderModelInventory;
  prompt: string;
  duration: number;
  ratio: string;
  qualityGoal: string;
  referenceMedia: StudioModelRecommendationInput["referenceMedia"];
  onApply: (patch: Record<string, unknown>) => void;
  onObserved: (context: StudioModelRecommendationContext) => void;
}) {
  const [preference, setPreference] = useState<Preference>("balanced");
  const [recommendationState, setRecommendationState] = useState<{
    key: string;
    value: StudioModelRecommendation;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const referenceSignature = referenceMedia.map((item) => item.type).sort().join(",");
  const recommendationKey = JSON.stringify({
    duration,
    prompt,
    qualityGoal,
    ratio,
    referenceSignature,
    preference,
  });
  const recommendation = recommendationState?.key === recommendationKey
    ? recommendationState.value
    : null;

  const requestRecommendation = async () => {
    setLoading(true);
    setError("");
    try {
      const value = await getStudioModelRecommendation({
        prompt,
        duration,
        ratio,
        qualityGoal,
        referenceMedia,
        userPreference: { priority: preference },
      });
      setRecommendationState({ key: recommendationKey, value });
      const context = createStudioModelRecommendationContext(value);
      if (context) onObserved(context);
    } catch {
      setRecommendationState(null);
      setError("Smart model recommendation is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const apply = (candidate: StudioModelRecommendationCandidate) => {
    try {
      const selectedAt = new Date().toISOString();
      const context = recommendation
        ? createStudioModelRecommendationContext(recommendation, candidate.modelId, selectedAt)
        : null;
      onApply(createStudioModelRecommendationPatch(inventory, candidate, context));
      if (context) {
        void recordStudioModelRecommendationSelection(
          context.recommendationId,
          candidate.modelId,
        ).catch(() => undefined);
      }
      setError("");
    } catch {
      setError("This recommendation is stale. Refresh the model inventory and try again.");
    }
  };

  return (
    <section className="studio-model-recommendation" aria-label="Smart model recommendation">
      <div className="studio-model-recommendation-heading">
        <div>
          <strong>Smart model selection</strong>
          <span>Recommendations never change your model until you confirm.</span>
        </div>
        <select
          aria-label="Recommendation priority"
          value={preference}
          onChange={(event) => {
            setPreference(event.target.value as Preference);
            setError("");
          }}
        >
          <option value="balanced">Balanced</option>
          <option value="quality">Best quality</option>
          <option value="reliability">Reliability</option>
          <option value="cost">Lower cost</option>
        </select>
      </div>
      <button
        className="studio-node-action studio-model-recommendation-request"
        disabled={loading || !duration || !ratio || !qualityGoal}
        onClick={() => void requestRecommendation()}
        type="button"
      >
        {loading ? "Checking verified models..." : "Recommend a model"}
      </button>
      {recommendation?.status === "INSUFFICIENT_DATA" ? (
        <div className="studio-model-recommendation-empty" role="status">
          <strong>No safe recommendation</strong>
          <span>{recommendation.reason}</span>
        </div>
      ) : null}
      {recommendation?.recommended ? (
        <div className="studio-model-recommendation-result" role="status">
          <p>Recommended for your prompt</p>
          <strong>✨ {recommendation.recommended.displayName}</strong>
          <span>{recommendation.recommended.reason}</span>
          {recommendation.personalization?.applied ? (
            <span className="studio-model-recommendation-personalization">
              Personalized · {recommendation.personalization.preferenceType.replaceAll("_", " ")} · {recommendation.personalization.sampleSize} generation signals
            </span>
          ) : (
            <span className="studio-model-recommendation-personalization">
              No personal history applied yet. Global model intelligence was used.
            </span>
          )}
          {recommendation.recommended.preferenceMatch?.reasons?.length ? (
            <span>{recommendation.recommended.preferenceMatch.reasons.join(" · ")}</span>
          ) : null}
          <div className="studio-model-recommendation-facts">
            <span>{recommendation.recommended.scope.duration}s</span>
            <span>{recommendation.recommended.scope.resolution}</span>
            <span>{recommendation.recommended.scope.ratio}</span>
            <span>{recommendation.recommended.estimatedCredits} estimated credits</span>
            <span>{recommendation.recommended.confidence} confidence</span>
          </div>
          <button
            className="studio-node-action"
            onClick={() => apply(recommendation.recommended as StudioModelRecommendationCandidate)}
            type="button"
          >
            Use {recommendation.recommended.displayName}
          </button>
        </div>
      ) : null}
      {recommendation?.alternatives?.length ? (
        <div className="studio-model-recommendation-alternatives">
          <strong>Alternatives</strong>
          {recommendation.alternatives.map((candidate) => (
            <div key={candidate.modelId}>
              <span>{candidate.displayName} · {candidate.estimatedCredits} estimated credits</span>
              <button onClick={() => apply(candidate)} type="button">Use alternative</button>
            </div>
          ))}
        </div>
      ) : null}
      {error ? <p className="studio-inspector-error" role="alert">{error}</p> : null}
    </section>
  );
}
