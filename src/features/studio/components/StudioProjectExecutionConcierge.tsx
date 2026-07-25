"use client";

import { useEffect, useState } from "react";
import type { StudioProjectExecutionSnapshot } from "@/features/studio/capabilities/studioProjectExecutionConcierge";
import { getStudioProjectExecutionAssistant } from "@/lib/studio-project-execution-concierge-api";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export function StudioProjectExecutionConcierge({ projectId }: { projectId: string | null }) {
  const [state, setState] = useState<{
    projectId: string;
    snapshot: StudioProjectExecutionSnapshot | null;
    error: string;
  } | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    void getStudioProjectExecutionAssistant(projectId, controller.signal)
      .then((snapshot) => setState({ projectId, snapshot, error: "" }))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            projectId,
            snapshot: null,
            error: reason instanceof Error ? reason.message : "Project Execution Assistant is unavailable.",
          });
        }
      });
    return () => controller.abort();
  }, [projectId]);

  if (!projectId) return <section className="studio-execution-concierge-empty">Open a project for execution guidance.</section>;
  const snapshot = state?.projectId === projectId ? state.snapshot : null;
  const error = state?.projectId === projectId ? state.error : "";

  return (
    <section className="studio-execution-concierge" aria-label="Project Copilot Assistant">
      <header>
        <div><span>PROJECT MONITOR</span><strong>Project Copilot Assistant</strong></div>
        <b>{snapshot?.progress ?? "—"}%</b>
      </header>
      {error ? <p className="is-error">{error}</p> : !snapshot ? (
        <p>Analyzing Progress, Risks, Quality, Timeline, and Pending Actions…</p>
      ) : (
        <>
          <div className="studio-execution-concierge-stage">
            <span>Current stage</span>
            <strong>{label(snapshot.currentStage)}</strong>
            <small>{snapshot.blockedItems.length} blocked items</small>
          </div>
          {snapshot.blockedItems.length ? (
            <div className="studio-execution-concierge-blocks">
              {snapshot.blockedItems.map((item) => <span key={item}>{label(item)}</span>)}
            </div>
          ) : null}
          <section>
            <header><strong>Risk insight</strong><span>{snapshot.risks.length}</span></header>
            {snapshot.risks.slice(0, 3).map((risk) => (
              <article className={`is-${risk.severity.toLowerCase()}`} key={risk.riskId}>
                <div><strong>{label(risk.type)}</strong><b>{risk.severity}</b></div>
                <small>{risk.evidence}</small>
              </article>
            ))}
            {!snapshot.risks.length ? <p>No active risk needs attention.</p> : null}
          </section>
          <section>
            <header><strong>Next actions</strong><span>Preview → Draft</span></header>
            {snapshot.nextActions.slice(0, 4).map((action) => (
              <article key={action.actionId}>
                <div><strong>{action.title}</strong><b>{label(action.type)}</b></div>
                <p>{action.summary}</p>
                <div className="studio-execution-concierge-evidence">
                  {action.evidence.slice(0, 3).map((item) => (
                    <small key={`${item.source}-${item.metric}`}>{label(item.source)} · {item.metric}: {String(item.value)}</small>
                  ))}
                </div>
                <footer><span>{action.confidence} confidence</span><span>Human confirm required</span></footer>
              </article>
            ))}
          </section>
          <footer>Monitoring and Draft suggestions only. No task execution, Workflow mutation, Job, generation, Provider call, or Credits action.</footer>
        </>
      )}
    </section>
  );
}
