"use client";

import { useEffect, useState } from "react";
import {
  studioProjectRecommendationLabel,
  type StudioProjectActionPreview,
  type StudioProjectCopilotSnapshot,
} from "@/features/studio/capabilities/studioProjectCopilotCenter";
import { useStudioStore } from "@/features/studio/store/studioStore";
import { useI18n } from "@/i18n/useI18n";
import {
  confirmStudioProjectAction,
  getStudioProjectCopilotCenter,
  previewStudioProjectAction,
} from "@/lib/studio-project-copilot-center-api";

function displayLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export function StudioProjectCopilotCommandCenter() {
  const { t, tf } = useI18n();
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
          error: reason instanceof Error ? reason.message : t("studio.command.fallbackError"),
        });
      });
    return () => controller.abort();
  }, [projectId, t]);

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
      setMessage(t("studio.command.previewReady"));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.command.previewFailed"));
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
      setMessage(tf("studio.command.confirmed", { id: result.draft.draftId }));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : t("studio.command.confirmFailed"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="studio-project-command-center" aria-label={t("studio.command.title")}>
      <header>
        <div>
          <span>{t("studio.command.flow")}</span>
          <h2>{t("studio.command.title")}</h2>
          <p>{t("studio.command.description")}</p>
        </div>
        <div className={`studio-project-command-health is-${snapshot?.health.status.toLowerCase() || "waiting"}`}>
          <strong>{snapshot?.health.score ?? "—"}</strong>
          <span>{snapshot?.health.status || t("studio.command.waiting")}</span>
          <small>{t("studio.command.health")}</small>
        </div>
      </header>

      {!projectId ? (
        <div className="studio-project-command-empty">{t("studio.command.empty")}</div>
      ) : loading ? (
        <div className="studio-project-command-empty">{t("studio.command.loading")}</div>
      ) : error ? (
        <div className="studio-project-command-error" role="status"><strong>{t("studio.command.error")}</strong><span>{error}</span></div>
      ) : snapshot ? (
        <>
          <div className="studio-project-command-summary">
            <div><span>{t("studio.command.progress")}</span><strong>{snapshot.health.progress}%</strong></div>
            <div><span>{t("studio.command.quality")}</span><strong>{snapshot.health.qualityScore ?? t("studio.command.unknown")}</strong></div>
            <div><span>{t("studio.command.completion")}</span><strong>{snapshot.health.completionRate}%</strong></div>
            <div><span>{t("studio.command.risks")}</span><strong>{snapshot.risks.length}</strong></div>
            <div><span>{t("studio.command.insights")}</span><strong>{snapshot.insights.length}</strong></div>
            <div><span>{t("studio.command.actions")}</span><strong>{snapshot.recommendations.length}</strong></div>
          </div>

          <div className="studio-project-command-body">
            <aside>
              <section className="studio-project-command-risks">
                <header><strong>{t("studio.command.riskRadar")}</strong><span>{snapshot.health.riskStatus}</span></header>
                {snapshot.risks.length ? snapshot.risks.map((risk) => (
                  <div key={`${risk.category}-${risk.type}`}>
                    <span>{risk.category}</span>
                    <strong>{displayLabel(risk.type)}</strong>
                    <small>{risk.severity} · {risk.evidence}</small>
                  </div>
                )) : <p>{t("studio.command.noRisk")}</p>}
              </section>
              <section className="studio-project-command-insights">
                <header><strong>{t("studio.command.insightTitle")}</strong><span>{t("studio.copilot.draftOnly")}</span></header>
                {snapshot.insights.length ? snapshot.insights.slice(0, 4).map((insight) => (
                  <article key={insight.insightId}>
                    <span>{displayLabel(insight.type)}</span>
                    <strong>{insight.summary}</strong>
                    <small>{tf("studio.command.confidence", { value: insight.confidence })} · {displayLabel(insight.evidence)}</small>
                  </article>
                )) : <p>{t("studio.command.noInsight")}</p>}
              </section>
            </aside>

            <section className="studio-project-command-recommendations">
              <header><strong>{t("studio.command.recommendations")}</strong><span>{t("studio.command.flowPreview")}</span></header>
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
                        <small>{tf("studio.command.priority", { value: recommendation.priority })}</small>
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
                        <span>{tf("studio.command.confidence", { value: recommendation.confidence })}</span>
                        <span>{actionStatus}</span>
                      </footer>
                      {activePreview && actionStatus !== "CONFIRMED" ? (
                        <div className="studio-project-command-preview">
                          <strong>{t("studio.command.previewTitle")}</strong>
                          <span>{displayLabel(activePreview.preview.impactScope)}</span>
                          <small>{t("studio.command.previewBoundary")}</small>
                        </div>
                      ) : null}
                      <div className="studio-project-command-actions">
                        {actionStatus === "CONFIRMED" ? (
                          <button disabled type="button">{t("studio.command.draftCreated")}</button>
                        ) : actionStatus === "PREVIEWED" ? (
                          <button disabled={Boolean(busyId)} onClick={() => void confirm(recommendation.recommendationId)} type="button">
                            {isBusy ? t("studio.command.creatingDraft") : t("studio.command.confirmDraft")}
                          </button>
                        ) : (
                          <button disabled={Boolean(busyId)} onClick={() => void preview(recommendation.recommendationId)} type="button">
                            {isBusy ? t("studio.command.preparingPreview") : t("studio.command.previewAction")}
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
            <span>{t("studio.command.boundary.drafts")}</span>
            <span>{t("studio.command.boundary.mutation")}</span>
            <span>{t("studio.command.boundary.execution")}</span>
            <time dateTime={snapshot.updatedAt}>{tf("studio.common.updated", { time: new Date(snapshot.updatedAt).toLocaleString() })}</time>
          </footer>
          {message ? <div className="studio-project-command-message" role="status">{message}</div> : null}
        </>
      ) : null}
    </section>
  );
}
