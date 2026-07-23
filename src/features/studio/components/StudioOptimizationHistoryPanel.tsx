"use client";

import { useEffect, useState } from "react";
import { studioOptimizationLabel } from "@/features/studio/capabilities/studioCreativeOptimizations";
import {
  studioOptimizationDelta,
  studioOptimizationLearningLabel,
  type StudioOptimizationHistoryBundle,
} from "@/features/studio/capabilities/studioOptimizationLearning";
import { getStudioOptimizationHistory } from "@/lib/studio-optimization-history-api";

function percentage(value: number) {
  return `${Number(value.toFixed(1))}%`;
}

export function StudioOptimizationHistoryPanel({ projectId }: { projectId: string }) {
  const [bundleState, setBundleState] = useState<{ projectId: string; bundle: StudioOptimizationHistoryBundle } | null>(null);
  const [errorState, setErrorState] = useState<{ projectId: string; message: string } | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const bundle = bundleState?.projectId === projectId ? bundleState.bundle : null;
  const error = errorState?.projectId === projectId ? errorState.message : "";

  useEffect(() => {
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId?: string }>).detail;
      if (!detail?.projectId || detail.projectId === projectId) setRefreshVersion((value) => value + 1);
    };
    window.addEventListener("studio:optimization-history-updated", refresh);
    return () => window.removeEventListener("studio:optimization-history-updated", refresh);
  }, [projectId]);

  useEffect(() => {
    let active = true;
    void getStudioOptimizationHistory(projectId)
      .then((value) => {
        if (!active) return;
        setBundleState({ projectId, bundle: value });
        setErrorState(null);
      })
      .catch(() => { if (active) setErrorState({ projectId, message: "Optimization History is temporarily unavailable." }); });
    return () => { active = false; };
  }, [projectId, refreshVersion]);

  return (
    <section className="studio-optimization-history" aria-label="Optimization History Panel">
      <header>
        <div><span>Closed-loop learning</span><strong>Optimization History</strong></div>
        <small>{bundle ? `${bundle.metrics.outcomeCount} measured outcomes` : "Read only"}</small>
      </header>
      {bundle ? (
        <>
          <div className="studio-optimization-history-metrics" aria-label="Optimization learning metrics">
            <div><span>Decisions</span><strong>{bundle.metrics.decisionCount}</strong></div>
            <div><span>Adoption</span><strong>{percentage(bundle.metrics.adoptionRate)}</strong></div>
            <div><span>Outcomes</span><strong>{bundle.metrics.outcomeCount}</strong></div>
            <div><span>Effective</span><strong>{percentage(bundle.metrics.effectiveRate)}</strong></div>
          </div>
          <div className="studio-optimization-history-list">
            {bundle.history.map((item) => {
              const outcome = item.outcomes.at(-1) || null;
              return (
                <article key={item.proposal.proposalId}>
                  <header>
                    <strong>{studioOptimizationLabel(item.proposal.optimizationType)}</strong>
                    <span>{item.decision?.decision || "NO DECISION"}</span>
                  </header>
                  <div><span>Learning signal</span><strong>{studioOptimizationLearningLabel(item.learningSignal)}</strong></div>
                  <div><span>Impact</span><strong>{outcome?.impact.status || "PENDING"}</strong></div>
                  <div className="studio-optimization-history-deltas">
                    <small>Cost {studioOptimizationDelta(outcome?.impact.costChange ?? null)}</small>
                    <small>Quality {studioOptimizationDelta(outcome?.qualityChange ?? null)}</small>
                    <small>Efficiency {studioOptimizationDelta(outcome?.impact.efficiencyChange ?? null)}</small>
                    <small>Revision {studioOptimizationDelta(outcome?.impact.revisionRateChange ?? null, "%")}</small>
                  </div>
                  {item.decision?.reason ? <p>{item.decision.reason}</p> : null}
                </article>
              );
            })}
          </div>
        </>
      ) : error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : <span className="studio-project-copilot-empty">Loading optimization decisions and measured outcomes...</span>}
      <small>Learning signals are analytics only. They never apply an optimization, edit Workflow, switch models, execute, call a Provider, or charge Credits.</small>
    </section>
  );
}
