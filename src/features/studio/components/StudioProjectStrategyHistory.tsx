"use client";

import { useEffect, useState } from "react";
import { studioProjectStrategyLabel } from "@/features/studio/capabilities/studioProjectStrategies";
import type { StudioStrategyHistoryBundle } from "@/features/studio/capabilities/studioStrategyLearning";
import { getStudioStrategyHistory } from "@/lib/studio-strategy-history-api";

function metric(value: number) { return `${value.toFixed(value % 1 ? 1 : 0)}%`; }

export function StudioProjectStrategyHistory({ projectId }: { projectId: string }) {
  const [bundleState, setBundleState] = useState<{ projectId: string; bundle: StudioStrategyHistoryBundle } | null>(null);
  const [errorState, setErrorState] = useState<{ projectId: string; message: string } | null>(null);
  const bundle = bundleState?.projectId === projectId ? bundleState.bundle : null;
  const error = errorState?.projectId === projectId ? errorState.message : "";

  useEffect(() => {
    let active = true;
    void getStudioStrategyHistory(projectId)
      .then((value) => { if (active) { setBundleState({ projectId, bundle: value }); setErrorState(null); } })
      .catch(() => { if (active) setErrorState({ projectId, message: "Project Strategy History is temporarily unavailable." }); });
    return () => { active = false; };
  }, [projectId]);

  return (
    <section className="studio-strategy-history" aria-label="Project Strategy History">
      <div className="studio-strategy-history-heading">
        <div><span>Decision memory</span><strong>Strategy History</strong></div>
        {bundle ? <small>{bundle.metrics.outcomeCount} measured outcomes</small> : null}
      </div>
      {bundle ? (
        <>
          <div className="studio-strategy-history-metrics" aria-label="Strategy outcome metrics">
            <div><span>Acceptance</span><strong>{metric(bundle.metrics.acceptanceRate)}</strong></div>
            <div><span>Success</span><strong>{metric(bundle.metrics.successRate)}</strong></div>
            <div><span>Quality improved</span><strong>{metric(bundle.metrics.qualityImprovement)}</strong></div>
            <div><span>User rating</span><strong>{bundle.metrics.userRating === null ? "No data" : `${bundle.metrics.userRating}/5`}</strong></div>
            <div><span>Revision</span><strong>{metric(bundle.metrics.revisionRate)}</strong></div>
          </div>
          <div className="studio-strategy-history-list">
            {bundle.history.map((item) => {
              const latestOutcome = item.outcomes.at(-1) || null;
              const signal = bundle.learningSignals.find((candidate) => candidate.strategyId === item.strategy.strategyId);
              return (
                <article key={item.strategy.strategyId}>
                  <header><strong>{studioProjectStrategyLabel(item.strategy.type)}</strong><span>{item.decision?.decision || "NO DECISION"}</span></header>
                  <div><span>Result</span><strong>{latestOutcome?.executionResult.status || "PENDING"}</strong></div>
                  <div><span>Effect</span><strong>{item.effect}</strong></div>
                  <div><span>Learning signal</span><strong>{signal?.signal.replaceAll("_", " ") || "insufficient data"}</strong></div>
                  {item.decision?.reason ? <p>{item.decision.reason}</p> : null}
                </article>
              );
            })}
          </div>
        </>
      ) : error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : <span className="studio-project-copilot-empty">Loading strategy decisions…</span>}
      <small>Learning signals are read-only. They never change Strategy rules, Workflow, execution, Provider behavior, Billing, or Credits.</small>
    </section>
  );
}
