"use client";

import { useEffect, useState } from "react";
import {
  studioProjectInsightAction,
  studioProjectInsightLabel,
  type StudioProjectInsightBundle,
} from "@/features/studio/capabilities/studioProjectInsights";
import { getStudioProjectInsights } from "@/lib/studio-project-insights-api";

export function StudioProjectInsights({ projectId }: { projectId: string }) {
  const [bundleState, setBundleState] = useState<{ projectId: string; bundle: StudioProjectInsightBundle } | null>(null);
  const [errorState, setErrorState] = useState<{ projectId: string; message: string } | null>(null);
  const bundle = bundleState?.projectId === projectId ? bundleState.bundle : null;
  const error = errorState?.projectId === projectId ? errorState.message : "";

  useEffect(() => {
    let active = true;
    void getStudioProjectInsights(projectId)
      .then((value) => { if (active) { setBundleState({ projectId, bundle: value }); setErrorState(null); } })
      .catch(() => { if (active) setErrorState({ projectId, message: "Project Insights are temporarily unavailable." }); });
    return () => { active = false; };
  }, [projectId]);

  return (
    <section className="studio-project-insights" aria-label="Project Insights Panel">
      <div className="studio-project-insights-heading">
        <div><span>Reasoning</span><strong>Project Insights</strong></div>
        {bundle ? <small>{bundle.insights.length} active</small> : null}
      </div>
      {bundle ? bundle.insights.length ? (
        <div className="studio-project-insights-list">
          {bundle.insights.map((insight) => (
            <article className={`is-${insight.severity.toLowerCase()}`} key={insight.insightId}>
              <div><strong>{studioProjectInsightLabel(insight.type)}</strong><span>{insight.severity}</span></div>
              <p>{insight.message}</p>
              <footer><span>{insight.sourceNodes.length} sources · {insight.confidence} confidence</span><small>Suggested action: {studioProjectInsightAction(insight.type)}</small></footer>
            </article>
          ))}
        </div>
      ) : <span className="studio-project-copilot-empty">No active project risks were detected.</span> : error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : <span className="studio-project-copilot-empty">Analyzing project relationships…</span>}
      <small>Insight actions appear in the Action Center and still require Preview and Confirm before a Draft is created.</small>
    </section>
  );
}
