"use client";

import { useEffect, useState } from "react";
import {
  studioAdaptationLabel,
  type StudioAdaptivePlanningBundle,
} from "@/features/studio/capabilities/studioAdaptivePlanning";
import { getStudioAdaptiveSuggestions } from "@/lib/studio-adaptive-planning-api";

export function StudioAdaptiveSuggestionsPanel({ projectId }: { projectId: string }) {
  const [bundleState, setBundleState] = useState<{ projectId: string; bundle: StudioAdaptivePlanningBundle } | null>(null);
  const [errorState, setErrorState] = useState<{ projectId: string; message: string } | null>(null);
  const bundle = bundleState?.projectId === projectId ? bundleState.bundle : null;
  const error = errorState?.projectId === projectId ? errorState.message : "";

  useEffect(() => {
    let active = true;
    void getStudioAdaptiveSuggestions(projectId)
      .then((value) => { if (active) { setBundleState({ projectId, bundle: value }); setErrorState(null); } })
      .catch(() => { if (active) setErrorState({ projectId, message: "Personalized Suggestions are temporarily unavailable." }); });
    return () => { active = false; };
  }, [projectId]);

  return (
    <section className="studio-adaptive-suggestions" aria-label="Personalized Suggestions">
      <header>
        <div><span>Adaptive planning</span><strong>Personalized Suggestions</strong></div>
        <small>{bundle ? `${bundle.summary.conflicts} conflicts` : "Private"}</small>
      </header>
      {bundle ? (
        bundle.suggestions.length ? (
          <div className="studio-adaptive-suggestions-list">
            {bundle.suggestions.map((suggestion) => (
              <article key={suggestion.suggestionId} data-status={suggestion.status}>
                <header>
                  <strong>{studioAdaptationLabel(suggestion.adaptationType)}</strong>
                  <span>{suggestion.status === "PREFERENCE_CONFLICT" ? "Needs your decision" : suggestion.confidence}</span>
                </header>
                <p>{suggestion.reason}</p>
                <div className="studio-adaptive-signals">
                  {suggestion.preferenceSignals.map((signal) => (
                    <small key={signal.preferenceId}>{signal.type.replaceAll("_", " ")}: {signal.value.replaceAll("_", " ")} · {signal.confidence.replaceAll("_", " ")}</small>
                  ))}
                </div>
                {suggestion.recommendedChanges.map((change) => <small key={change.message}>Suggested: {change.message}</small>)}
                <small>Evidence: {suggestion.evidence.goalIds.length} goals · {suggestion.evidence.experienceIds.length} successful experiences</small>
                {suggestion.conflict ? <strong className="studio-adaptive-conflict">PREFERENCE_CONFLICT · No automatic choice</strong> : null}
              </article>
            ))}
          </div>
        ) : <span className="studio-project-copilot-empty">Add or confirm Creative Preferences to receive personalized planning suggestions.</span>
      ) : error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : <span className="studio-project-copilot-empty">Matching your preferences, goals, context, and successful experience...</span>}
      <small>Suggestions are planning guidance only. Review them in Action Center before creating an Adaptive Plan Draft; no Workflow, model, execution, Provider, Billing, or Credits change occurs automatically.</small>
    </section>
  );
}
