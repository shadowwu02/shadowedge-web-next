"use client";

import { useEffect, useState } from "react";
import {
  studioOptimizationImpactLabel,
  studioOptimizationLabel,
  type StudioCreativeOptimizations,
} from "@/features/studio/capabilities/studioCreativeOptimizations";
import { getStudioCreativeOptimizations } from "@/lib/studio-creative-optimizations-api";

export function StudioOptimizationCenter({ projectId }: { projectId: string }) {
  const [optimizations, setOptimizations] = useState<StudioCreativeOptimizations | null>(null);
  const [errorState, setErrorState] = useState<{ projectId: string; message: string } | null>(null);
  const current = optimizations?.projectId === projectId ? optimizations : null;
  const error = errorState?.projectId === projectId ? errorState.message : "";

  useEffect(() => {
    let active = true;
    void getStudioCreativeOptimizations(projectId)
      .then((value) => {
        if (!active) return;
        setOptimizations(value);
        setErrorState(null);
      })
      .catch(() => { if (active) setErrorState({ projectId, message: "Optimization analysis is temporarily unavailable." }); });
    return () => { active = false; };
  }, [projectId]);

  return (
    <section className="studio-optimization-center" aria-label="Creative Optimization Center">
      <header>
        <div><span>Continuous improvement</span><strong>Optimization Center</strong></div>
        <small>Proposal only</small>
      </header>
      {current ? (
        <>
          <div className="studio-optimization-summary" aria-label="Creative optimization summary">
            <strong>{current.summary.proposalCount} proposal{current.summary.proposalCount === 1 ? "" : "s"}</strong>
            <span>{current.summary.evidenceCount} evidence links</span>
            <span>{current.summary.highConfidenceCount} high confidence</span>
          </div>
          <div className="studio-optimization-proposals" aria-label="Creative optimization proposals">
            {current.proposals.length ? current.proposals.map((proposal) => (
              <article key={proposal.proposalId}>
                <div className="studio-optimization-proposal-heading">
                  <span>{studioOptimizationLabel(proposal.optimizationType)}</span>
                  <strong>{proposal.confidence}</strong>
                </div>
                <div>
                  <small>Issues</small>
                  <ul>{proposal.issues.length ? proposal.issues.map((issue) => <li key={`${proposal.proposalId}:${issue.sourceId}`}>{issue.message}</li>) : <li>Combined evidence is ready for review.</li>}</ul>
                </div>
                <div>
                  <small>Recommendations</small>
                  <ul>{proposal.recommendations.length ? proposal.recommendations.map((recommendation) => <li key={`${proposal.proposalId}:${recommendation}`}>{recommendation}</li>) : <li>Preview this proposal before creating a Draft.</li>}</ul>
                </div>
                <div><small>Expected impact</small><p>{studioOptimizationImpactLabel(proposal.expectedImpact)}</p></div>
                <footer>
                  <span>{proposal.evidence.length} source{proposal.evidence.length === 1 ? "" : "s"}</span>
                  <span>{proposal.evidence.map((item) => item.source.replaceAll("_", " ")).join(" · ")}</span>
                </footer>
              </article>
            )) : <span className="studio-project-copilot-empty">No combined optimization proposal has enough evidence yet.</span>}
          </div>
        </>
      ) : error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : <span className="studio-project-copilot-empty">Combining Quality, Efficiency, Cost, Feedback, Resource, and Strategy evidence...</span>}
      <small>Impact is an estimate, not a guaranteed result. Preview and Confirm create an Optimization Draft only; nothing changes the Workflow, model, project, Provider, Billing, or Credits.</small>
    </section>
  );
}
