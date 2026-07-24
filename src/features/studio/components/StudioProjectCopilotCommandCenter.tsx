"use client";

import { useEffect, useState } from "react";
import {
  studioProjectRecommendationLabel,
  type StudioProjectActionPreview,
  type StudioProjectCopilotSnapshot,
} from "@/features/studio/capabilities/studioProjectCopilotCenter";
import { useStudioStore } from "@/features/studio/store/studioStore";
import {
  confirmStudioProjectAction,
  getStudioProjectCopilotCenter,
  previewStudioProjectAction,
} from "@/lib/studio-project-copilot-center-api";

function displayLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export function StudioProjectCopilotCommandCenter() {
  const projectId = useStudioStore((state) => state.projectId);
  const [state, setState] = useState<Readonly<{
    projectId: string;
    snapshot: StudioProjectCopilotSnapshot | null;
    error: string;
  }> | null>(null);
  const [previews, setPreviews] = useState<Record<string, StudioProjectActionPreview>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    void getStudioProjectCopilotCenter(projectId, controller.signal)
      .then((snapshot) => setState({ projectId, snapshot, error: "" }))
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          projectId,
          snapshot: null,
          error: reason instanceof Error ? reason.message : "Project Copilot Center is unavailable.",
        });
      });
    return () => controller.abort();
  }, [projectId]);

  const snapshot = state?.projectId === projectId ? state.snapshot : null;
  const error = state?.projectId === projectId ? state.error : "";
  const loading = Boolean(projectId && state?.projectId !== projectId);

  const refresh = async (activeProjectId: string) => {
    const next = await getStudioProjectCopilotCenter(activeProjectId);
    setState({ projectId: activeProjectId, snapshot: next, error: "" });
  };

  const preview = async (recommendationId: string) => {
    if (!projectId || busyId) return;
    setBusyId(recommendationId);
    setMessage("");
    try {
      const result = await previewStudioProjectAction(projectId, recommendationId);
      setPreviews((current) => ({ ...current, [recommendationId]: result }));
      await refresh(projectId);
      setMessage("Project Action preview ready. Nothing changes until you confirm the Draft.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Project Action preview failed.");
    } finally {
      setBusyId(null);
    }
  };

  const confirm = async (recommendationId: string) => {
    if (!projectId || busyId) return;
    setBusyId(recommendationId);
    setMessage("");
    try {
      const result = await confirmStudioProjectAction(projectId, recommendationId);
      await refresh(projectId);
      setMessage(`Project Action Draft created: ${result.draft.draftId}. Review it before any workflow change.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Project Action Draft could not be created.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="studio-project-command-center" aria-label="Project Copilot Center">
      <header>
        <div>
          <span>Analysis → recommendation → draft</span>
          <h2>Project Copilot Center</h2>
          <p>Project health, risks, evidence, and human-controlled next actions in one command view.</p>
        </div>
        <div className={`studio-project-command-health is-${snapshot?.health.status.toLowerCase() || "waiting"}`}>
          <strong>{snapshot?.health.score ?? "—"}</strong>
          <span>{snapshot?.health.status || "WAITING"}</span>
          <small>Project health</small>
        </div>
      </header>

      {!projectId ? (
        <div className="studio-project-command-empty">Open a project to start project-level Copilot analysis.</div>
      ) : loading ? (
        <div className="studio-project-command-empty">Connecting Intelligence, Insights, Risks, and Draft Actions…</div>
      ) : error ? (
        <div className="studio-project-command-error" role="status"><strong>Copilot Center unavailable</strong><span>{error}</span></div>
      ) : snapshot ? (
        <>
          <div className="studio-project-command-summary">
            <div><span>Progress</span><strong>{snapshot.health.progress}%</strong></div>
            <div><span>Quality</span><strong>{snapshot.health.qualityScore ?? "Unknown"}</strong></div>
            <div><span>Completion</span><strong>{snapshot.health.completionRate}%</strong></div>
            <div><span>Risks</span><strong>{snapshot.risks.length}</strong></div>
            <div><span>Insights</span><strong>{snapshot.insights.length}</strong></div>
            <div><span>Actions</span><strong>{snapshot.recommendations.length}</strong></div>
          </div>

          <div className="studio-project-command-body">
            <aside>
              <section className="studio-project-command-risks">
                <header><strong>Risk radar</strong><span>{snapshot.health.riskStatus}</span></header>
                {snapshot.risks.length ? snapshot.risks.map((risk) => (
                  <div key={`${risk.category}-${risk.type}`}>
                    <span>{risk.category}</span>
                    <strong>{displayLabel(risk.type)}</strong>
                    <small>{risk.severity} · {risk.evidence}</small>
                  </div>
                )) : <p>No active project risk.</p>}
              </section>
              <section className="studio-project-command-insights">
                <header><strong>Evidence-backed insights</strong><span>Draft-only</span></header>
                {snapshot.insights.length ? snapshot.insights.slice(0, 4).map((insight) => (
                  <article key={insight.insightId}>
                    <span>{displayLabel(insight.type)}</span>
                    <strong>{insight.summary}</strong>
                    <small>{insight.confidence} confidence · {displayLabel(insight.evidence)}</small>
                  </article>
                )) : <p>No project insight needs attention.</p>}
              </section>
            </aside>

            <section className="studio-project-command-recommendations">
              <header><strong>Recommended actions</strong><span>Preview → Confirm → Draft</span></header>
              <div>
                {snapshot.recommendations.map((recommendation) => {
                  const actionStatus = recommendation.action?.status || "SUGGESTED";
                  const activePreview = previews[recommendation.recommendationId];
                  const isBusy = busyId === recommendation.recommendationId;
                  return (
                    <article className={`is-${recommendation.priority.toLowerCase()}`} key={recommendation.recommendationId}>
                      <header>
                        <div>
                          <span>{studioProjectRecommendationLabel(recommendation.type)}</span>
                          <strong>{recommendation.title}</strong>
                        </div>
                        <small>{recommendation.priority} priority</small>
                      </header>
                      <p>{recommendation.message}</p>
                      <div className="studio-project-command-evidence">
                        {recommendation.evidence.map((item) => (
                          <span key={`${item.source}-${item.metric}`}>
                            <b>{displayLabel(item.metric)}</b>
                            <small>{String(item.value)} · {displayLabel(item.source)}</small>
                          </span>
                        ))}
                      </div>
                      <footer>
                        <span>{recommendation.confidence} confidence</span>
                        <span>{actionStatus}</span>
                      </footer>
                      {activePreview && actionStatus !== "CONFIRMED" ? (
                        <div className="studio-project-command-preview">
                          <strong>Draft impact preview</strong>
                          <span>{displayLabel(activePreview.preview.impactScope)}</span>
                          <small>No project mutation, execution, generation, publishing, or Credits.</small>
                        </div>
                      ) : null}
                      <div className="studio-project-command-actions">
                        {actionStatus === "CONFIRMED" ? (
                          <button disabled type="button">Draft created</button>
                        ) : actionStatus === "PREVIEWED" ? (
                          <button disabled={Boolean(busyId)} onClick={() => void confirm(recommendation.recommendationId)} type="button">
                            {isBusy ? "Creating Draft…" : "Confirm Draft"}
                          </button>
                        ) : (
                          <button disabled={Boolean(busyId)} onClick={() => void preview(recommendation.recommendationId)} type="button">
                            {isBusy ? "Preparing Preview…" : "Preview Action"}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>

          <footer className="studio-project-command-boundary">
            <span>Human-controlled Drafts only</span>
            <span>No project or Workflow mutation</span>
            <span>No generation, publish, or Credits deduction</span>
            <time dateTime={snapshot.updatedAt}>Updated {new Date(snapshot.updatedAt).toLocaleString()}</time>
          </footer>
          {message ? <div className="studio-project-command-message" role="status">{message}</div> : null}
        </>
      ) : null}
    </section>
  );
}
