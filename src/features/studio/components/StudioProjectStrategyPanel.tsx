"use client";

import { useEffect, useState } from "react";
import {
  studioProjectStrategyLabel,
  type StudioProjectStrategyBundle,
} from "@/features/studio/capabilities/studioProjectStrategies";
import { getStudioProjectStrategies } from "@/lib/studio-project-strategies-api";

export function StudioProjectStrategyPanel({ projectId }: { projectId: string }) {
  const [bundleState, setBundleState] = useState<{ projectId: string; bundle: StudioProjectStrategyBundle } | null>(null);
  const [errorState, setErrorState] = useState<{ projectId: string; message: string } | null>(null);
  const bundle = bundleState?.projectId === projectId ? bundleState.bundle : null;
  const error = errorState?.projectId === projectId ? errorState.message : "";

  useEffect(() => {
    let active = true;
    void getStudioProjectStrategies(projectId)
      .then((value) => { if (active) { setBundleState({ projectId, bundle: value }); setErrorState(null); } })
      .catch(() => { if (active) setErrorState({ projectId, message: "Project Strategies are temporarily unavailable." }); });
    return () => { active = false; };
  }, [projectId]);

  return (
    <section className="studio-project-strategies" aria-label="Project Strategy Panel">
      <div className="studio-project-strategies-heading">
        <div><span>Planning intelligence</span><strong>Project Strategy</strong></div>
        {bundle ? <small>{bundle.strategies.length} proposals</small> : null}
      </div>
      {bundle ? (
        <>
          <div className="studio-project-strategies-goal"><span>Current goal</span><strong>{bundle.goal}</strong></div>
          <div className="studio-project-strategies-list">
            {bundle.strategies.map((strategy) => (
              <article key={strategy.strategyId}>
                <header><strong>{studioProjectStrategyLabel(strategy.type)}</strong><span>{strategy.confidence} confidence</span></header>
                <ul>{strategy.recommendations.map((recommendation) => <li key={recommendation}>{recommendation}</li>)}</ul>
                <footer>{strategy.supportingInsights.length} linked insight{strategy.supportingInsights.length === 1 ? "" : "s"} · Evidence preserved</footer>
              </article>
            ))}
          </div>
        </>
      ) : error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : <span className="studio-project-copilot-empty">Preparing project strategy…</span>}
      <small>Strategy proposals appear in the Action Center as STRATEGY_DRAFT actions. Preview and Confirm are required; no project or Workflow change is applied automatically.</small>
    </section>
  );
}
