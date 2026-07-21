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
import {
  formatStudioCapabilityLabel,
  type StudioCapabilityExecutionPlan,
} from "@/features/studio/capabilities/studioCapabilityExecutionPlan";
import {
  confirmStudioCapabilityExecutionPlan,
  createStudioCapabilityExecutionPlan,
} from "@/lib/studio-capability-plan-api";
import {
  STUDIO_EXECUTION_GATE_LABELS,
  type StudioWorkflowExecutionPlan,
} from "@/features/studio/capabilities/studioWorkflowExecutionPlan";
import {
  confirmStudioWorkflowExecutionPlan,
  createStudioWorkflowExecutionPreview,
} from "@/lib/studio-workflow-execution-api";

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
  const [planState, setPlanState] = useState<{ key: string; value: StudioCapabilityExecutionPlan } | null>(null);
  const [executionPlanState, setExecutionPlanState] = useState<StudioWorkflowExecutionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [confirmingPlan, setConfirmingPlan] = useState(false);
  const [buildingExecutionPreview, setBuildingExecutionPreview] = useState(false);
  const [confirmingExecution, setConfirmingExecution] = useState(false);
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
  const capabilityPlan = planState?.key === recommendationKey ? planState.value : null;
  const executionPlan = executionPlanState?.sourcePlanId === capabilityPlan?.planId
    ? executionPlanState
    : null;

  const planningInput = {
    prompt,
    media: referenceMedia,
    constraints: { duration, ratio, resolution: qualityGoal, audio: false },
    userPreferences: { priority: preference },
  } as const;

  const requestRecommendation = async () => {
    setLoading(true);
    setError("");
    try {
      const resolution = await resolveStudioCapabilityIntent(planningInput);
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

  const reviewPlan = async () => {
    setPlanning(true);
    setError("");
    try {
      setPlanState({ key: recommendationKey, value: await createStudioCapabilityExecutionPlan(planningInput) });
      setExecutionPlanState(null);
    } catch {
      setPlanState(null);
      setError("Creative workflow planning is temporarily unavailable.");
    } finally {
      setPlanning(false);
    }
  };

  const confirmPlan = async () => {
    if (!capabilityPlan) return;
    setConfirmingPlan(true);
    setError("");
    try {
      setPlanState({ key: recommendationKey, value: await confirmStudioCapabilityExecutionPlan(capabilityPlan.planId) });
      setExecutionPlanState(null);
    } catch {
      setError("This workflow cannot be confirmed until every readiness and cost blocker is cleared.");
    } finally {
      setConfirmingPlan(false);
    }
  };

  const buildExecutionPreview = async () => {
    if (!capabilityPlan || capabilityPlan.status !== "CONFIRMED") return;
    setBuildingExecutionPreview(true);
    setError("");
    try {
      setExecutionPlanState(await createStudioWorkflowExecutionPreview(capabilityPlan.planId));
    } catch {
      setExecutionPlanState(null);
      setError("Execution Preview is unavailable. Readiness, scope, or cost may have changed.");
    } finally {
      setBuildingExecutionPreview(false);
    }
  };

  const confirmExecution = async () => {
    if (!executionPlan || executionPlan.status !== "READY") return;
    setConfirmingExecution(true);
    setError("");
    try {
      setExecutionPlanState(await confirmStudioWorkflowExecutionPlan(executionPlan.executionPlanId));
    } catch {
      setError("Execution confirmation is blocked by the current readiness, verified scope, or cost gate.");
    } finally {
      setConfirmingExecution(false);
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
        {intentResolution ? (
          <button
            className="studio-node-action studio-creative-plan-review"
            disabled={planning}
            onClick={() => void reviewPlan()}
            type="button"
          >
            {planning ? "Building safe workflow draft..." : capabilityPlan ? "Review Plan" : "Create Creative Plan"}
          </button>
        ) : null}
        {capabilityPlan ? (
          <section className="studio-creative-plan" aria-label="Creative Plan">
            <div className="studio-creative-plan-heading">
              <div><span>Creative Plan</span><strong>{capabilityPlan.status.replaceAll("_", " ")}</strong></div>
              <span>{capabilityPlan.estimatedCost.estimatedCredits === null ? "Cost unavailable" : `${capabilityPlan.estimatedCost.estimatedCredits} estimated credits`} · {capabilityPlan.estimatedCost.confidence} confidence</span>
            </div>
            <ol className="studio-creative-plan-graph">
              {capabilityPlan.nodes.map((node) => (
                <li className={node.status === "BLOCKED" ? "is-blocked" : ""} key={node.nodeId}>
                  <span>{node.nodeId.replace("node-", "")}</span>
                  <div>
                    <strong>{formatStudioCapabilityLabel(node.capability)}</strong>
                    <small>{node.dependencies.length ? `After ${node.dependencies.join(", ")}` : "Starting step"}</small>
                    {node.recommendation?.modelId ? <small>{node.recommendation.providerId} · {node.recommendation.modelId}</small> : null}
                    {node.blockers.length ? <small>Blocked: {node.blockers.join(", ")}</small> : null}
                  </div>
                </li>
              ))}
            </ol>
            {capabilityPlan.status === "CONFIRMED" ? (
              <div className="studio-creative-plan-confirmed">
                <span role="status">Workflow confirmed. Build an Execution Preview before using the existing Generation Plan controls.</span>
                <button
                  className="studio-node-action"
                  disabled={buildingExecutionPreview}
                  onClick={() => void buildExecutionPreview()}
                  type="button"
                >
                  {buildingExecutionPreview ? "Checking execution gates..." : executionPlan ? "Refresh Execution Preview" : "Build Execution Preview"}
                </button>
              </div>
            ) : (
              <button
                className="studio-node-action"
                disabled={!capabilityPlan.confirmationAllowed || confirmingPlan}
                onClick={() => void confirmPlan()}
                type="button"
              >
                {confirmingPlan ? "Confirming workflow..." : "Confirm Workflow"}
              </button>
            )}
            <span className="studio-creative-plan-boundary">Plan confirmation never creates a Job, enters Queue, calls a Provider, or deducts Credits.</span>
            {executionPlan ? (
              <section className="studio-execution-preview" aria-label="Execution Preview">
                <div className="studio-execution-preview-heading">
                  <div><span>Execution Preview</span><strong>{executionPlan.status}</strong></div>
                  <span>{executionPlan.nodes.length} node{executionPlan.nodes.length === 1 ? "" : "s"} · {executionPlan.estimatedCredits === null ? "Cost unavailable" : `${executionPlan.estimatedCredits} estimated credits`}</span>
                </div>
                <div className="studio-execution-preview-models">
                  {executionPlan.models.map((model) => (
                    <span key={`${model.providerId}:${model.modelId}`}>{model.providerId} / {model.modelId} / {model.verifiedScope || "No verified scope"}</span>
                  ))}
                </div>
                {executionPlan.nodes.map((node) => (
                  <div className={node.status === "BLOCKED" ? "studio-execution-node is-blocked" : "studio-execution-node"} key={node.executionNodeId}>
                    <div><strong>{formatStudioCapabilityLabel(node.capability)}</strong><span>{node.candidateType.replaceAll("_", " ")}</span></div>
                    <div className="studio-execution-gates">
                      {Object.entries(node.gates).map(([name, value]) => (
                        <span className={value.passed ? "is-passed" : "is-blocked"} key={name}>
                          {STUDIO_EXECUTION_GATE_LABELS[name as keyof typeof STUDIO_EXECUTION_GATE_LABELS]}: {value.passed ? "Pass" : value.blocker}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {executionPlan.risks.length ? <p className="studio-execution-risks">Risks: {executionPlan.risks.join(", ")}</p> : null}
                {executionPlan.blockers.length ? <p className="studio-execution-blockers">Blocked: {executionPlan.blockers.join(", ")}</p> : null}
                {executionPlan.status === "CONFIRMED" ? (
                  <p className="studio-execution-confirmed" role="status">Execution handoff confirmed. Creating the existing Generation Plan remains a separate explicit user action.</p>
                ) : (
                  <button
                    className="studio-node-action"
                    disabled={executionPlan.status !== "READY" || confirmingExecution}
                    onClick={() => void confirmExecution()}
                    type="button"
                  >
                    {confirmingExecution ? "Rechecking gates..." : "Confirm Execution Plan"}
                  </button>
                )}
                <span className="studio-creative-plan-boundary">Confirmation only prepares a handoff candidate. It does not create a Generation Plan, Job, Queue entry, Usage record, or Credits charge.</span>
              </section>
            ) : null}
          </section>
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
