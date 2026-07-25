"use client";

import { useEffect, useState } from "react";
import {
  studioPortfolioResourceLabel,
  type StudioPortfolioResourcePreview,
  type StudioPortfolioResourceSnapshot,
} from "@/features/studio/capabilities/studioPortfolioResources";
import {
  confirmStudioPortfolioResourceDraft,
  getStudioPortfolioResources,
  previewStudioPortfolioResourceDraft,
} from "@/lib/studio-portfolio-resource-api";

export function StudioPortfolioResourceCenter() {
  const [snapshot, setSnapshot] = useState<StudioPortfolioResourceSnapshot | null>(null);
  const [preview, setPreview] = useState<StudioPortfolioResourcePreview | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void getStudioPortfolioResources(controller.signal)
      .then((value) => {
        setSnapshot(value);
        setError("");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Portfolio Resources are unavailable.");
      });
    return () => controller.abort();
  }, []);

  const refresh = async () => {
    setSnapshot(await getStudioPortfolioResources());
  };

  const previewDraft = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await previewStudioPortfolioResourceDraft();
      setPreview(result);
      await refresh();
      setMessage("Resource optimization preview ready. No allocation or project state changed.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Resource optimization preview failed.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDraft = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await confirmStudioPortfolioResourceDraft();
      await refresh();
      setMessage(`Portfolio Resource Draft created: ${result.draft.draftId}. Human review remains required.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Portfolio Resource Draft could not be created.");
    } finally {
      setBusy(false);
    }
  };

  const status = snapshot?.action?.status || "SUGGESTED";

  return (
    <section className="studio-portfolio-resource-center" aria-label="Portfolio Resource Center">
      <header>
        <div>
          <span>Assets - Agents - Workflows - Cost - Priority</span>
          <h2>Portfolio Resource Center</h2>
          <p>Resource utilization, allocation insights, opportunities, and risks across the current user&apos;s projects.</p>
        </div>
        <div className={`studio-portfolio-resource-confidence is-${snapshot?.confidence.toLowerCase() || "waiting"}`}>
          <strong>{snapshot?.confidence || "--"}</strong>
          <span>Evidence confidence</span>
          <small>Allocation not applied</small>
        </div>
      </header>

      {error ? (
        <div className="studio-portfolio-resource-empty" role="status">
          <strong>Portfolio Resources unavailable</strong>
          <span>{error}</span>
        </div>
      ) : !snapshot ? (
        <div className="studio-portfolio-resource-empty">Connecting Portfolio Strategy, Resource, Agent, Workflow, and Cost evidence...</div>
      ) : (
        <>
          <section className="studio-portfolio-resource-summary" aria-label="Portfolio Resource summary">
            <article><span>Assets</span><strong>{snapshot.assets.length}</strong><small>{snapshot.usage.assetUses} confirmed uses</small></article>
            <article><span>Agent roles</span><strong>{snapshot.usage.allocatedAgentRoles}</strong><small>{snapshot.usage.activeAgentTasks} active tasks</small></article>
            <article><span>Workflows</span><strong>{snapshot.usage.activeWorkflows}</strong><small>{snapshot.usage.workflowUses} confirmed uses</small></article>
            <article><span>Estimated Credits</span><strong>{snapshot.cost.estimatedCredits}</strong><small>{snapshot.cost.knownCostRatio}% known cost</small></article>
          </section>

          <div className="studio-portfolio-resource-layout">
            <section>
              <header><strong>Project allocation view</strong><span>{snapshot.usage.projects.length} projects</span></header>
              <div className="studio-portfolio-resource-projects">
                {snapshot.usage.projects.map((project) => (
                  <article key={project.projectId}>
                    <header>
                      <strong>{project.projectName}</strong>
                      <span>{project.priority} suggestion</span>
                    </header>
                    <div>
                      <span>{project.assetCount} assets</span>
                      <span>{project.agentRoles} agent roles</span>
                      <span>{project.activeTasks} active tasks</span>
                      <span>{project.estimatedCredits} estimated Credits</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <header><strong>Resource utilization</strong><span>Read-only</span></header>
              <div className="studio-portfolio-resource-utilization">
                <article>
                  <span>High-value Assets</span>
                  <strong>{snapshot.usage.reusableAssets}</strong>
                  <small>{snapshot.assets.filter((asset) => asset.utilization === "LOW").length} low-utilization Assets</small>
                </article>
                <article>
                  <span>Agent capacity</span>
                  <strong>{snapshot.agents.filter((agent) => agent.status === "ALLOCATED").length}/{snapshot.agents.length}</strong>
                  <small>projects with confirmed roles</small>
                </article>
                <article>
                  <span>Cost evidence</span>
                  <strong>{snapshot.cost.confidence}</strong>
                  <small>{snapshot.cost.unknownCost} unknown cost signals</small>
                </article>
              </div>
              <footer>
                {snapshot.risks.length
                  ? snapshot.risks.map((risk) => <span key={risk}>{studioPortfolioResourceLabel(risk)}</span>)
                  : <span>No current resource risk flag</span>}
              </footer>
            </section>
          </div>

          <section className="studio-portfolio-resource-opportunities">
            <header><strong>Optimization opportunities</strong><span>{snapshot.opportunities.length} suggestions</span></header>
            <div>
              {snapshot.opportunities.map((opportunity) => (
                <article key={opportunity.opportunityId}>
                  <header>
                    <span>{studioPortfolioResourceLabel(opportunity.type)}</span>
                    <strong>{opportunity.confidence}</strong>
                  </header>
                  <p>{opportunity.summary}</p>
                  <small>{opportunity.expectedImpact}</small>
                  <footer>{opportunity.evidenceRefs.length} evidence references / not applied</footer>
                </article>
              ))}
            </div>
          </section>

          {preview && status !== "CONFIRMED" ? (
            <div className="studio-portfolio-resource-preview">
              <strong>PORTFOLIO_RESOURCE_DRAFT preview</strong>
              <span>{preview.preview.opportunities.length} opportunities / {preview.preview.priorities.length} priority signals</span>
              <small>No priority change, resource movement, Workflow modification, execution, or Credits.</small>
            </div>
          ) : null}

          <footer className="studio-portfolio-resource-footer">
            <div>
              <span>Current user portfolio only</span>
              <span>Allocation suggestions are not applied</span>
              <span>No resource movement, Workflow mutation, execution, or Credits</span>
            </div>
            {status === "CONFIRMED" ? (
              <button disabled type="button">Portfolio Resource Draft created</button>
            ) : status === "PREVIEWED" ? (
              <button disabled={busy} onClick={() => void confirmDraft()} type="button">
                {busy ? "Creating Draft..." : "Confirm Portfolio Resource Draft"}
              </button>
            ) : (
              <button disabled={busy} onClick={() => void previewDraft()} type="button">
                {busy ? "Preparing Preview..." : "Preview Resource Optimization"}
              </button>
            )}
          </footer>
          {message ? <div className="studio-portfolio-resource-message" role="status">{message}</div> : null}
        </>
      )}
    </section>
  );
}
