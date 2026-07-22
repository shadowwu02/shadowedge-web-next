"use client";

import { useEffect, useState } from "react";
import { studioProjectFuturePlanLabel, type StudioProjectFuturePlansBundle } from "@/features/studio/capabilities/studioProjectFuturePlans";
import { getStudioProjectFuturePlans } from "@/lib/studio-project-future-plans-api";

export function StudioFuturePlanningPanel({ projectId }: { projectId: string }) {
  const [bundleState, setBundleState] = useState<{ projectId: string; bundle: StudioProjectFuturePlansBundle } | null>(null);
  const [errorState, setErrorState] = useState<{ projectId: string; message: string } | null>(null);
  const bundle = bundleState?.projectId === projectId ? bundleState.bundle : null;
  const error = errorState?.projectId === projectId ? errorState.message : "";

  useEffect(() => {
    let active = true;
    void getStudioProjectFuturePlans(projectId)
      .then((value) => { if (active) { setBundleState({ projectId, bundle: value }); setErrorState(null); } })
      .catch(() => { if (active) setErrorState({ projectId, message: "Future Planning is temporarily unavailable." }); });
    return () => { active = false; };
  }, [projectId]);

  return (
    <section className="studio-future-planning" aria-label="Future Planning Panel">
      <div className="studio-future-planning-heading">
        <div><span>Roadmap intelligence</span><strong>Future Planning</strong></div>
        <small>Proposal only</small>
      </div>
      {bundle ? (
        <div className="studio-future-planning-list">
          {bundle.plans.map((plan) => (
            <article key={plan.proposalId}>
              <header><span>{studioProjectFuturePlanLabel(plan.type)}</span><strong>{plan.confidence}</strong></header>
              <div><span>Current stage</span><p>{plan.currentState}</p></div>
              <div><span>Next-stage goal</span><p>{plan.futureGoal}</p></div>
              <ol>{plan.recommendedSteps.map((step) => <li key={step}>{step}</li>)}</ol>
              <small>{plan.supportingEvidence.length} evidence links · Evolution, Strategy outcomes, Insights, Workflow, Results, and Feedback only</small>
            </article>
          ))}
        </div>
      ) : error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : <span className="studio-project-copilot-empty">Preparing evidence-linked future plans…</span>}
      <small>Use the Action Center to Preview, then Confirm a Future Plan Draft. Nothing here changes goals, creates Workflow, executes, calls a Provider, or charges Credits.</small>
    </section>
  );
}
