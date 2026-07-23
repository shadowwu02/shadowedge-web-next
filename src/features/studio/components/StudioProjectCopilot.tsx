"use client";

import { useEffect, useState } from "react";
import {
  studioCopilotActionLabel,
  studioCopilotDraftLabel,
  studioCopilotSuggestionLabel,
  type StudioProjectCopilotState,
} from "@/features/studio/capabilities/studioProjectCopilot";
import {
  actOnStudioCopilotSuggestion,
  confirmStudioCopilotAction,
  getStudioProjectCopilot,
  previewStudioCopilotAction,
} from "@/lib/studio-project-copilot-api";
import { StudioCopilotChat } from "@/features/studio/components/StudioCopilotChat";
import { StudioProjectIntelligence } from "@/features/studio/components/StudioProjectIntelligence";
import { StudioProjectInsights } from "@/features/studio/components/StudioProjectInsights";
import { StudioProjectStrategyPanel } from "@/features/studio/components/StudioProjectStrategyPanel";
import { StudioProjectStrategyHistory } from "@/features/studio/components/StudioProjectStrategyHistory";
import { StudioProjectEvolutionTimeline } from "@/features/studio/components/StudioProjectEvolutionTimeline";
import { StudioFuturePlanningPanel } from "@/features/studio/components/StudioFuturePlanningPanel";
import { StudioProjectGoalsPanel } from "@/features/studio/components/StudioProjectGoalsPanel";
import { StudioPortfolioIntelligencePanel } from "@/features/studio/components/StudioPortfolioIntelligencePanel";
import { StudioResourceIntelligencePanel } from "@/features/studio/components/StudioResourceIntelligencePanel";
import { StudioProductionEfficiencyPanel } from "@/features/studio/components/StudioProductionEfficiencyPanel";
import { StudioCreativeQualityPanel } from "@/features/studio/components/StudioCreativeQualityPanel";
import { StudioOptimizationCenter } from "@/features/studio/components/StudioOptimizationCenter";

export function StudioProjectCopilot({ projectId }: { projectId: string }) {
  const [state, setState] = useState<StudioProjectCopilotState | null>(null);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
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

  const preview = async (actionId: string) => {
    if (busyActionId) return;
    setBusyActionId(actionId);
    setErrorState(null);
    setMessage("");
    try {
      const result = await previewStudioCopilotAction(projectId, actionId);
      setState(result.state);
      setMessage("Action preview ready. Nothing changes until you confirm Create Draft.");
    } catch {
      setErrorState({ projectId, message: "This action could not be previewed. No project changes were made." });
    } finally {
      setBusyActionId(null);
    }
  };

  const confirm = async (actionId: string) => {
    if (busyActionId) return;
    setBusyActionId(actionId);
    setErrorState(null);
    setMessage("");
    try {
      const result = await confirmStudioCopilotAction(projectId, actionId);
      setState(result.state);
      setMessage(`${studioCopilotDraftLabel(result.draft.draftType)} created. Review it in the existing workflow before any execution.`);
    } catch {
      setErrorState({ projectId, message: "This Draft could not be created. No project changes were made." });
    } finally {
      setBusyActionId(null);
    }
  };

  const dismiss = async (suggestionId: string, actionId: string) => {
    if (busyActionId) return;
    setBusyActionId(actionId);
    setErrorState(null);
    setMessage("");
    try {
      const result = await actOnStudioCopilotSuggestion(projectId, suggestionId, "DISMISS");
      setState(result.state);
      setMessage("Suggestion dismissed for this project.");
    } catch {
      setErrorState({ projectId, message: "This suggestion could not be dismissed. No project changes were made." });
    } finally {
      setBusyActionId(null);
    }
  };

  return (
    <section className="studio-project-copilot" aria-label="Creative Copilot Action Center">
      <div className="studio-project-copilot-heading">
        <div><span>Creative Copilot</span><strong>Action Center</strong></div>
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
            <span>{currentState.context.insightCount} insights</span>
            <span>{currentState.context.strategyCount} strategies</span>
            <span>{currentState.context.futurePlanCount} future plans</span>
            <span>{currentState.context.goalCount} goals</span>
            <span>{currentState.portfolio.projectCount} portfolio projects</span>
            <span>{currentState.resources.highValueAssetCount} reusable assets</span>
            <span>{currentState.efficiency.bottleneckCount} bottlenecks</span>
            <span>{currentState.quality.issueCount} quality issues</span>
            <span>{currentState.optimizations.proposalCount} optimization proposals</span>
            <span>{currentState.taskStatus.waitingHuman} waiting review</span>
            <span>{currentState.taskStatus.completed}/{currentState.taskStatus.total} tasks done</span>
          </div>
          <StudioPortfolioIntelligencePanel currentProjectId={projectId} />
          <StudioResourceIntelligencePanel currentProjectId={projectId} />
          <StudioProductionEfficiencyPanel currentProjectId={projectId} />
          <StudioCreativeQualityPanel projectId={projectId} />
          <StudioOptimizationCenter projectId={projectId} />
          <StudioProjectIntelligence projectId={projectId} />
          <StudioProjectInsights projectId={projectId} />
          <StudioProjectStrategyPanel projectId={projectId} />
          <StudioProjectStrategyHistory projectId={projectId} />
          <StudioProjectEvolutionTimeline projectId={projectId} />
          <StudioProjectGoalsPanel projectId={projectId} />
          <StudioFuturePlanningPanel projectId={projectId} />
          <StudioCopilotChat projectId={projectId} />
          {currentState.suggestions.length ? (
            <div className="studio-project-copilot-suggestions" aria-label="Creative Copilot guided actions">
              {currentState.suggestions.map((suggestion) => {
                const action = currentState.actions.find((candidate) => candidate.suggestionId === suggestion.suggestionId);
                if (!action) return null;
                const isBusy = busyActionId === action.actionId;
                return (
                  <article key={suggestion.suggestionId}>
                    <div>
                      <span>{studioCopilotSuggestionLabel(suggestion.type)}</span>
                      <strong>{suggestion.message}</strong>
                      <small>Suggested action: {studioCopilotActionLabel(action.type)} · Source: {suggestion.source.replaceAll("_", " ")}</small>
                      <small>Goal alignment: {suggestion.goalAlignment.status} · {suggestion.goalAlignment.goalIds.length} linked goal{suggestion.goalAlignment.goalIds.length === 1 ? "" : "s"}</small>
                      <small>Portfolio: {suggestion.portfolioContext.projectPriority} · {suggestion.portfolioContext.projectRole.replaceAll("_", " ")}</small>
                      <small>Resources: {suggestion.resourceContext.assetIds.length} linked assets · Reuse score {suggestion.resourceContext.highestReuseScore}</small>
                      <small>Efficiency: {suggestion.efficiencyContext.bottleneckCount} bottlenecks · {suggestion.efficiencyContext.workflowIds.length} workflows</small>
                      <small>Quality: {suggestion.qualityContext.relatedIssueIds.length} issues · {suggestion.qualityContext.averageOutputQuality === null ? "score unknown" : `${Math.round(suggestion.qualityContext.averageOutputQuality)}/100`}</small>
                      <small>Optimization: {suggestion.optimizationContext.proposalIds.length} proposals · {suggestion.optimizationContext.highConfidenceCount} high confidence</small>
                    </div>
                    {action.status === "PREVIEWED" ? (
                      <div className="studio-project-copilot-preview" aria-label={`${studioCopilotActionLabel(action.type)} preview`}>
                        <div><span>Reason</span><strong>{action.payload.reason}</strong></div>
                        <div><span>Impact</span><strong>{action.payload.impactScope.replaceAll("_", " ")}</strong></div>
                        <div><span>Draft</span><strong>{studioCopilotDraftLabel(action.payload.draftType)}</strong></div>
                        <small>User confirmation required. This creates Draft metadata only.</small>
                      </div>
                    ) : null}
                    <div className="studio-project-copilot-actions">
                      {action.status === "PREVIEWED" ? (
                        <button className="studio-node-action" disabled={Boolean(busyActionId)} onClick={() => void confirm(action.actionId)} type="button">{isBusy ? "Creating…" : "Create Draft"}</button>
                      ) : (
                        <button className="studio-node-action" disabled={Boolean(busyActionId)} onClick={() => void preview(action.actionId)} type="button">{isBusy ? "Loading…" : "Preview Action"}</button>
                      )}
                      <button disabled={Boolean(busyActionId)} onClick={() => void dismiss(suggestion.suggestionId, action.actionId)} type="button">Dismiss</button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : <span className="studio-project-copilot-empty">No new actions. Existing Drafts remain available for review.</span>}
          {currentState.pendingActions.length ? (
            <div className="studio-project-copilot-drafts" aria-label="Creative Copilot pending Drafts">
              <strong>Pending Drafts</strong>
              {currentState.pendingActions.map((draft) => <span key={draft.draftId}>{studioCopilotDraftLabel(draft.draftType)} · DRAFT</span>)}
            </div>
          ) : null}
          <small>Preview is read-only. Create Draft requires your confirmation and never changes the project, starts planning, executes a node, calls a Provider, or charges Credits.</small>
        </>
      ) : error ? null : <span className="studio-project-copilot-empty">Loading project insights…</span>}
      {message ? <span className="studio-project-copilot-message" role="status">{message}</span> : null}
      {error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : null}
    </section>
  );
}
