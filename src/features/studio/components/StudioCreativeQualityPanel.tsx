"use client";

import { useEffect, useState } from "react";
import {
  studioQualityIssueLabel,
  studioQualityScore,
  type StudioCreativeQuality,
} from "@/features/studio/capabilities/studioCreativeQuality";
import { getStudioCreativeQuality } from "@/lib/studio-creative-quality-api";

export function StudioCreativeQualityPanel({ projectId }: { projectId: string }) {
  const [quality, setQuality] = useState<StudioCreativeQuality | null>(null);
  const [errorState, setErrorState] = useState<{ projectId: string; message: string } | null>(null);
  const currentQuality = quality?.projectId === projectId ? quality : null;
  const error = errorState?.projectId === projectId ? errorState.message : "";

  useEffect(() => {
    let active = true;
    void getStudioCreativeQuality(projectId)
      .then((value) => {
        if (!active) return;
        setQuality(value);
        setErrorState(null);
      })
      .catch(() => { if (active) setErrorState({ projectId, message: "Creative Quality is temporarily unavailable." }); });
    return () => { active = false; };
  }, [projectId]);

  const evaluation = currentQuality?.evaluations[0] || null;
  const metrics = evaluation?.qualityMetrics || null;

  return (
    <section className="studio-creative-quality" aria-label="Creative Quality Panel">
      <header>
        <div><span>Creative QA</span><strong>Creative Quality</strong></div>
        <small>Analysis only</small>
      </header>
      {currentQuality && evaluation && metrics ? (
        <>
          <div className="studio-quality-summary" aria-label="Creative Quality summary">
            <strong>{studioQualityScore(currentQuality.summary.averageOutputQuality)}</strong>
            <span>{currentQuality.summary.resultCount} result{currentQuality.summary.resultCount === 1 ? "" : "s"}</span>
            <span>{currentQuality.summary.issueCount} issue{currentQuality.summary.issueCount === 1 ? "" : "s"}</span>
            <span>{evaluation.confidence} confidence</span>
          </div>
          <div className="studio-quality-metrics" aria-label="Creative output quality metrics">
            <article><span>Visual consistency</span><strong>{studioQualityScore(metrics.visualConsistency)}</strong><small>Color: {studioQualityScore(metrics.colorConsistency)}</small></article>
            <article><span>Style match</span><strong>{studioQualityScore(metrics.styleMatch)}</strong><small>Declared style evidence</small></article>
            <article><span>Character</span><strong>{studioQualityScore(metrics.characterConsistency)}</strong><small>Appearance: {studioQualityScore(metrics.appearanceStability)}</small></article>
            <article><span>Workflow</span><strong>{studioQualityScore(metrics.workflowQuality)}</strong><small>{metrics.revisionRate === null ? "No revision data" : `${Math.round(metrics.revisionRate)}% revision rate`}</small></article>
            <article><span>User acceptance</span><strong>{metrics.feedbackRating === null ? "No rating" : `${metrics.feedbackRating.toFixed(1)}/5`}</strong><small>{metrics.userAcceptance === null ? "No acceptance signal" : `${Math.round(metrics.userAcceptance)}% positive`}</small></article>
            <article><span>Completion</span><strong>{studioQualityScore(metrics.completionQuality)}</strong><small>Output: {studioQualityScore(metrics.outputQuality)}</small></article>
          </div>
          <div className="studio-quality-issues" aria-label="Creative QA issues and improvement suggestions">
            {currentQuality.issues.length ? currentQuality.issues.map((issue) => (
              <article key={issue.issueId}>
                <div><span>{studioQualityIssueLabel(issue.type)}</span><strong>{issue.severity} · {issue.confidence}</strong></div>
                <p>{issue.message}</p>
                <small>{issue.suggestion}</small>
              </article>
            )) : <span className="studio-project-copilot-empty">No Creative QA issue has enough evidence yet.</span>}
          </div>
        </>
      ) : currentQuality ? <span className="studio-project-copilot-empty">No completed result is available for Creative QA yet.</span> : error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : <span className="studio-project-copilot-empty">Analyzing output, style, character, Workflow, and Feedback evidence...</span>}
      <small>Creative QA is read-only. Improvement suggestions require Preview and Confirm to create a Draft; no result, Asset, Workflow, Provider, Billing, or Credits are changed.</small>
    </section>
  );
}
