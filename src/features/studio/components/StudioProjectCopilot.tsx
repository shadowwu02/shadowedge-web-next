"use client";

import { useEffect, useState } from "react";
import {
  studioCopilotSuggestionLabel,
  type StudioCopilotSuggestionAction,
  type StudioProjectCopilotState,
} from "@/features/studio/capabilities/studioProjectCopilot";
import {
  actOnStudioCopilotSuggestion,
  getStudioProjectCopilot,
} from "@/lib/studio-project-copilot-api";

export function StudioProjectCopilot({ projectId }: { projectId: string }) {
  const [state, setState] = useState<StudioProjectCopilotState | null>(null);
  const [busySuggestionId, setBusySuggestionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorState, setErrorState] = useState<{ projectId: string; message: string } | null>(null);
  const currentState = state?.projectId === projectId ? state : null;
  const error = errorState?.projectId === projectId ? errorState.message : "";

  useEffect(() => {
    let active = true;
    void getStudioProjectCopilot(projectId)
      .then((value) => {
        if (!active) return;
        setState(value);
        setErrorState(null);
      })
      .catch(() => { if (active) setErrorState({ projectId, message: "Creative Copilot is temporarily unavailable." }); });
    return () => { active = false; };
  }, [projectId]);

  const act = async (suggestionId: string, action: StudioCopilotSuggestionAction) => {
    if (busySuggestionId) return;
    setBusySuggestionId(suggestionId);
    setErrorState(null);
    setMessage("");
    try {
      const result = await actOnStudioCopilotSuggestion(projectId, suggestionId, action);
      setState(result.state);
      setMessage(action === "ACCEPT" ? "Draft created. Review it before any planning or execution." : "Suggestion dismissed for this project.");
    } catch {
      setErrorState({ projectId, message: "This suggestion could not be updated. No project changes were made." });
    } finally {
      setBusySuggestionId(null);
    }
  };

  return (
    <section className="studio-project-copilot" aria-label="Creative Copilot Panel">
      <div className="studio-project-copilot-heading">
        <div><span>Creative Copilot</span><strong>Project workspace</strong></div>
        <span>Human controlled</span>
      </div>
      {currentState ? (
        <>
          <div className="studio-project-copilot-overview">
            <div><span>Project summary</span><strong>{currentState.summary}</strong></div>
            <div><span>Current goal</span><strong>{currentState.currentGoal}</strong></div>
          </div>
          <div className="studio-project-copilot-signals" aria-label="Creative Copilot project signals">
            <span>{currentState.context.memoryCount} memories</span>
            <span>{currentState.context.workflowTemplateCount} workflows</span>
            <span>{currentState.taskStatus.waitingHuman} waiting review</span>
            <span>{currentState.taskStatus.completed}/{currentState.taskStatus.total} tasks done</span>
          </div>
          {currentState.suggestions.length ? (
            <div className="studio-project-copilot-suggestions" aria-label="Creative Copilot suggestions">
              {currentState.suggestions.map((suggestion) => (
                <article key={suggestion.suggestionId}>
                  <div>
                    <span>{studioCopilotSuggestionLabel(suggestion.type)}</span>
                    <strong>{suggestion.message}</strong>
                    <small>Source: {suggestion.source.replaceAll("_", " ")}</small>
                  </div>
                  <div className="studio-project-copilot-actions">
                    <button className="studio-node-action" disabled={Boolean(busySuggestionId)} onClick={() => void act(suggestion.suggestionId, "ACCEPT")} type="button">{busySuggestionId === suggestion.suggestionId ? "Saving…" : "Accept as Draft"}</button>
                    <button disabled={Boolean(busySuggestionId)} onClick={() => void act(suggestion.suggestionId, "DISMISS")} type="button">Dismiss</button>
                  </div>
                </article>
              ))}
            </div>
          ) : <span className="studio-project-copilot-empty">No new suggestions. Existing Drafts remain available for review.</span>}
          {currentState.pendingActions.length ? (
            <div className="studio-project-copilot-drafts" aria-label="Creative Copilot pending Drafts">
              <strong>Pending Drafts</strong>
              {currentState.pendingActions.map((draft) => <span key={draft.draftId}>{studioCopilotSuggestionLabel(draft.type)} · DRAFT</span>)}
            </div>
          ) : null}
          <small>Accept creates metadata for a Draft only. Copilot never changes the project, starts planning, executes a node, calls a Provider, or charges Credits.</small>
        </>
      ) : error ? null : <span className="studio-project-copilot-empty">Loading project insights…</span>}
      {message ? <span className="studio-project-copilot-message" role="status">{message}</span> : null}
      {error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : null}
    </section>
  );
}
