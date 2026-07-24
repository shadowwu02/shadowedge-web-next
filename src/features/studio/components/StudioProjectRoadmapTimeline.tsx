"use client";

import { useEffect, useState } from "react";
import {
  studioRoadmapPhaseLabel,
  type StudioProjectRoadmap,
  type StudioProjectRoadmapPreview,
} from "@/features/studio/capabilities/studioProjectRoadmap";
import { useStudioStore } from "@/features/studio/store/studioStore";
import {
  confirmStudioProjectRoadmap,
  getStudioProjectRoadmap,
  previewStudioProjectRoadmap,
} from "@/lib/studio-project-roadmap-api";

function displayLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export function StudioProjectRoadmapTimeline() {
  const projectId = useStudioStore((state) => state.projectId);
  const [state, setState] = useState<Readonly<{
    projectId: string;
    roadmap: StudioProjectRoadmap | null;
    error: string;
  }> | null>(null);
  const [previewState, setPreviewState] = useState<Readonly<{
    projectId: string;
    preview: StudioProjectRoadmapPreview;
  }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    void getStudioProjectRoadmap(projectId, controller.signal)
      .then((roadmap) => setState({ projectId, roadmap, error: "" }))
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          projectId,
          roadmap: null,
          error: reason instanceof Error ? reason.message : "Project Roadmap is unavailable.",
        });
      });
    return () => controller.abort();
  }, [projectId]);

  const roadmap = state?.projectId === projectId ? state.roadmap : null;
  const error = state?.projectId === projectId ? state.error : "";
  const loading = Boolean(projectId && state?.projectId !== projectId);

  const refresh = async (activeProjectId: string) => {
    const next = await getStudioProjectRoadmap(activeProjectId);
    setState({ projectId: activeProjectId, roadmap: next, error: "" });
  };

  const previewDraft = async () => {
    if (!projectId || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const next = await previewStudioProjectRoadmap(projectId);
      setPreviewState({ projectId, preview: next });
      await refresh(projectId);
      setMessage("Roadmap Draft preview ready. Project direction and Workflow remain unchanged.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Roadmap preview failed.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDraft = async () => {
    if (!projectId || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await confirmStudioProjectRoadmap(projectId);
      await refresh(projectId);
      setMessage(`Roadmap Draft created: ${result.draft.draftId}. Review it before changing project direction.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Roadmap Draft could not be created.");
    } finally {
      setBusy(false);
    }
  };

  const actionStatus = roadmap?.action?.status || "SUGGESTED";
  const strategyEvolution = roadmap?.strategies[0] || null;
  const preview = previewState?.projectId === projectId ? previewState.preview : null;

  return (
    <section className="studio-project-roadmap" aria-label="Project Roadmap Timeline">
      <header>
        <div>
          <span>Memory - Strategy Evolution - Roadmap</span>
          <h2>Project Roadmap Timeline</h2>
          <p>Long-term direction built from qualified project history, governed strategy outcomes, and Future Planning.</p>
        </div>
        <div className={`studio-project-roadmap-confidence is-${roadmap?.confidence.toLowerCase() || "waiting"}`}>
          <strong>{roadmap?.confidence || "--"}</strong>
          <span>Roadmap confidence</span>
          <small>Human review required</small>
        </div>
      </header>

      {!projectId ? (
        <div className="studio-project-roadmap-empty">Open a project to build its long-term roadmap.</div>
      ) : loading ? (
        <div className="studio-project-roadmap-empty">Connecting Memory, Strategy Evolution, and Future Planning...</div>
      ) : error ? (
        <div className="studio-project-roadmap-error" role="status">
          <strong>Project Roadmap unavailable</strong>
          <span>{error}</span>
        </div>
      ) : roadmap ? (
        <>
          <div className="studio-project-roadmap-evidence">
            <div><span>Memory milestones</span><strong>{roadmap.evidenceSummary.memoryMilestones}</strong></div>
            <div><span>Successful patterns</span><strong>{roadmap.evidenceSummary.successfulPatterns}</strong></div>
            <div><span>Governed strategies</span><strong>{roadmap.evidenceSummary.governedStrategies}</strong></div>
            <div><span>Future plans</span><strong>{roadmap.evidenceSummary.futurePlans}</strong></div>
          </div>

          <section className="studio-project-roadmap-phases" aria-label="Roadmap phases">
            {roadmap.phases.map((phase, index) => (
              <article className={`is-${phase.phase.toLowerCase()}`} key={phase.phaseId}>
                <header>
                  <div>
                    <span>0{index + 1}</span>
                    <strong>{studioRoadmapPhaseLabel(phase.phase)}</strong>
                  </div>
                  <small>{phase.status}</small>
                </header>
                <h3>{phase.goal}</h3>
                <div>
                  <span>{phase.milestones.length} milestones</span>
                  <span>{phase.strategies.length} strategies</span>
                  <span>{phase.confidence} confidence</span>
                </div>
                <footer>
                  {phase.evidence.slice(0, 3).map((item) => (
                    <small key={`${phase.phaseId}-${item.type}-${item.referenceId}`}>
                      {displayLabel(item.type)} / {item.confidence}
                    </small>
                  ))}
                </footer>
              </article>
            ))}
          </section>

          <div className="studio-project-roadmap-detail">
            <section>
              <header><strong>Strategy Evolution</strong><span>{strategyEvolution?.confidence || "LOW"} confidence</span></header>
              <div className="studio-project-roadmap-strategy-flow">
                <article>
                  <span>Past</span>
                  <strong>{strategyEvolution?.pastStrategies.length || 0} governed strategies</strong>
                  <small>{strategyEvolution?.pastStrategies.at(-1) ? displayLabel(strategyEvolution.pastStrategies.at(-1)?.type || "") : "No measured past strategy"}</small>
                </article>
                <i>-&gt;</i>
                <article>
                  <span>Current</span>
                  <strong>{strategyEvolution?.currentStrategy ? displayLabel(strategyEvolution.currentStrategy.type) : "Direction forming"}</strong>
                  <small>{strategyEvolution?.currentStrategy?.goal || "More project evidence required"}</small>
                </article>
                <i>-&gt;</i>
                <article>
                  <span>Future suggestions</span>
                  <strong>{strategyEvolution?.futureSuggestions.length || 0} proposals</strong>
                  <small>{strategyEvolution?.futureSuggestions[0]?.goal || "Continue measuring outcomes"}</small>
                </article>
              </div>
            </section>

            <section>
              <header><strong>Roadmap milestones</strong><span>{roadmap.milestones.length}</span></header>
              <div className="studio-project-roadmap-milestones">
                {roadmap.milestones.slice(-6).map((milestone) => (
                  <article key={milestone.milestoneId}>
                    <span>{displayLabel(milestone.type)}</span>
                    <strong>{milestone.summary}</strong>
                    <small>{milestone.confidence} confidence</small>
                  </article>
                ))}
                {!roadmap.milestones.length ? <p>No qualified milestone recorded yet.</p> : null}
              </div>
            </section>
          </div>

          {preview && actionStatus !== "CONFIRMED" ? (
            <div className="studio-project-roadmap-preview">
              <strong>Roadmap Draft impact preview</strong>
              <span>{preview.preview.phases.length} phases / {preview.preview.confidence} confidence</span>
              <small>No project-direction change, Workflow creation, execution, publish, or Credits.</small>
            </div>
          ) : null}

          <footer className="studio-project-roadmap-footer">
            <div>
              <span>Analysis and Draft only</span>
              <span>No automatic project-direction change</span>
              <span>No Workflow creation, execution, publish, or Credits</span>
            </div>
            {actionStatus === "CONFIRMED" ? (
              <button disabled type="button">Roadmap Draft created</button>
            ) : actionStatus === "PREVIEWED" ? (
              <button disabled={busy} onClick={() => void confirmDraft()} type="button">
                {busy ? "Creating Draft..." : "Confirm Roadmap Draft"}
              </button>
            ) : (
              <button disabled={busy} onClick={() => void previewDraft()} type="button">
                {busy ? "Preparing Preview..." : "Preview Roadmap Draft"}
              </button>
            )}
          </footer>
          {message ? <div className="studio-project-roadmap-message" role="status">{message}</div> : null}
        </>
      ) : null}
    </section>
  );
}
