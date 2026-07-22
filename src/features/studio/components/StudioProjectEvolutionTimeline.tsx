"use client";

import { useEffect, useState } from "react";
import {
  studioProjectEvolutionInsightLabel,
  studioProjectEvolutionMilestoneLabel,
  type StudioProjectEvolutionBundle,
} from "@/features/studio/capabilities/studioProjectEvolution";
import { getStudioProjectEvolution } from "@/lib/studio-project-evolution-api";

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Recorded" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function StudioProjectEvolutionTimeline({ projectId }: { projectId: string }) {
  const [bundleState, setBundleState] = useState<{ projectId: string; bundle: StudioProjectEvolutionBundle } | null>(null);
  const [errorState, setErrorState] = useState<{ projectId: string; message: string } | null>(null);
  const bundle = bundleState?.projectId === projectId ? bundleState.bundle : null;
  const error = errorState?.projectId === projectId ? errorState.message : "";

  useEffect(() => {
    let active = true;
    void getStudioProjectEvolution(projectId)
      .then((value) => { if (active) { setBundleState({ projectId, bundle: value }); setErrorState(null); } })
      .catch(() => { if (active) setErrorState({ projectId, message: "Project Evolution is temporarily unavailable." }); });
    return () => { active = false; };
  }, [projectId]);

  return (
    <section className="studio-project-evolution" aria-label="Project Evolution Timeline">
      <div className="studio-project-evolution-heading">
        <div><span>Long-term memory</span><strong>Project Evolution</strong></div>
        {bundle ? <small>{bundle.timeline.length} milestones</small> : null}
      </div>
      {bundle ? (
        <>
          {bundle.insights.length ? (
            <div className="studio-project-evolution-trends" aria-label="Long-term project trends">
              {bundle.insights.map((insight) => (
                <article key={insight.evolutionInsightId}>
                  <span>{studioProjectEvolutionInsightLabel(insight.type)} · {insight.confidence}</span>
                  <strong>{insight.trend.replaceAll("_", " ")}</strong>
                  <p>{insight.message}</p>
                </article>
              ))}
            </div>
          ) : <span className="studio-project-copilot-empty">More confirmed history is needed before long-term trends can be measured.</span>}
          <div className="studio-project-evolution-timeline">
            {bundle.timeline.map((record) => (
              <article key={record.evolutionId}>
                <i aria-hidden="true" />
                <div>
                  <span>{displayDate(record.createdAt)}</span>
                  <strong>{studioProjectEvolutionMilestoneLabel(record.milestone)}</strong>
                  {record.changes.map((change, index) => <p key={`${record.evolutionId}:${change.field}:${index}`}>{change.field.replaceAll("_", " ")}: {change.to.replaceAll("_", " ")}</p>)}
                  {(record.relatedStrategies.length || record.relatedResults.length) ? <small>{record.relatedStrategies.length} strategies · {record.relatedResults.length} results linked</small> : null}
                </div>
              </article>
            ))}
          </div>
        </>
      ) : error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : <span className="studio-project-copilot-empty">Retrieving the project timeline…</span>}
      <small>Evolution Memory is append-only, project-isolated, and read-only. It never changes Context, project direction, Workflow, execution, Billing, or Credits.</small>
    </section>
  );
}
