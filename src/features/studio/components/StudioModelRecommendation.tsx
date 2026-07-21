"use client";

import { useState } from "react";
import {
  STUDIO_CREATIVE_CAPABILITY_CHOICES,
  type StudioCapabilityIntentResolution,
} from "@/features/studio/capabilities/studioCreativeIntent";
import {
  createStudioModelRecommendationContext,
  createStudioModelRecommendationPatch,
  type StudioModelRecommendation,
  type StudioModelRecommendationCandidate,
  type StudioModelRecommendationContext,
  type StudioModelRecommendationInput,
} from "@/features/studio/capabilities/studioModelRecommendation";
import type { StudioProviderModelInventory } from "@/features/studio/capabilities/studioVideoModelResolver";
import { recordStudioModelRecommendationSelection } from "@/lib/studio-model-recommendation-api";
import { resolveStudioCapabilityIntent } from "@/lib/studio-capability-intent-api";

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
  const [intentState, setIntentState] = useState<{ key: string; value: StudioCapabilityIntentResolution } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const referenceSignature = referenceMedia.map((item) => item.type).sort().join(",");
  const recommendationKey = JSON.stringify({
    providerId: inventory.providerId,
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
  const intentResolution = intentState?.key === recommendationKey ? intentState.value : null;

  const requestRecommendation = async () => {
    setLoading(true);
    setError("");
    try {
      const resolution = await resolveStudioCapabilityIntent({
        prompt,
        media: referenceMedia,
        constraints: { duration, ratio, resolution: qualityGoal, audio: false },
        userPreferences: { priority: preference },
      });
      const value = resolution.recommendations;
      setIntentState({ key: recommendationKey, value: resolution });
      setRecommendationState({ key: recommendationKey, value });
      const context = createStudioModelRecommendationContext(value);
      if (context) onObserved(context);
    } catch {
      setRecommendationState(null);
      setIntentState(null);
      setError("Creative intent routing is temporarily unavailable.");
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
          candidate.providerId,
        ).catch(() => undefined);
      }
      setError("");
    } catch {
      setError("This recommendation is stale. Refresh the model inventory and try again.");
    }
  };

  return (
    <section className="studio-model-recommendation" aria-label="Smart model recommendation">
      <div className="studio-intent-routing">
        <strong>What do you want to create?</strong>
        <span>Describe the result in your Prompt. Studio recommends a Capability first, then a safe model.</span>
        <div className="studio-intent-capability-grid" aria-label="Creative capability examples">
          {STUDIO_CREATIVE_CAPABILITY_CHOICES.map((choice) => (
            <div className={intentResolution?.capability?.capabilityId === choice.capabilityId ? "is-recommended" : ""} key={choice.capabilityId}>
              <strong>{choice.label}</strong>
              <span>{choice.example}</span>
            </div>
          ))}
        </div>
        {intentResolution ? (
          <div className="studio-intent-result" role="status">
            <span>Detected intent: {intentResolution.intent.intentType.replaceAll("_", " ")}</span>
            <strong>{intentResolution.capability?.name || "No supported Capability detected"}</strong>
            <span>{Math.round(intentResolution.intent.confidence * 100)}% confidence</span>
            {intentResolution.blockers.length ? <span>Blocked: {intentResolution.blockers.join(", ")}</span> : null}
          </div>
        ) : null}
      </div>
      <div className="studio-model-recommendation-heading">
        <div>
          <strong>Capability-driven model recommendation</strong>
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
        {loading ? "Resolving intent and verified models..." : "Find capability and model"}
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
