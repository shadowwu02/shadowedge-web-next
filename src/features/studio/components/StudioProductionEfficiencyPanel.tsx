"use client";

import { useEffect, useState } from "react";
import {
  studioEfficiencyDuration,
  studioEfficiencyInsightLabel,
  type StudioProductionEfficiency,
} from "@/features/studio/capabilities/studioProductionEfficiency";
import { getStudioProductionEfficiency } from "@/lib/studio-production-efficiency-api";

export function StudioProductionEfficiencyPanel({ currentProjectId }: { currentProjectId: string }) {
  const [efficiency, setEfficiency] = useState<StudioProductionEfficiency | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getStudioProductionEfficiency()
      .then((value) => {
        if (!active) return;
        setEfficiency(value);
        setError("");
      })
      .catch(() => { if (active) setError("Production Efficiency is temporarily unavailable."); });
    return () => { active = false; };
  }, []);

  const record = efficiency?.records.find((item) => item.projectId === currentProjectId) || null;
  const insights = efficiency?.insights.filter((item) => item.projectId === currentProjectId) || [];

  return (
    <section className="studio-production-efficiency" aria-label="Production Efficiency Panel">
      <header>
        <div><span>Workflow intelligence</span><strong>Production Efficiency</strong></div>
        <small>Analysis only</small>
      </header>
      {efficiency && record ? (
        <>
          <div className="studio-efficiency-summary" aria-label="Production Efficiency summary">
            <span>{record.workflowMetrics.successRate}% success</span>
            <span>{record.workflowMetrics.revisionCount} revisions</span>
            <span>{record.costMetrics.shadowCredits} credits</span>
            <span>{insights.length} insights</span>
          </div>
          <div className="studio-efficiency-metrics" aria-label="Workflow Task Execution and Cost metrics">
            <article><span>Workflow</span><strong>{studioEfficiencyDuration(record.workflowMetrics.averageCompletionMs)}</strong><small>{record.workflowMetrics.modificationRate}% modification rate</small></article>
            <article><span>Task wait</span><strong>{studioEfficiencyDuration(record.taskMetrics.averageWaitMs)}</strong><small>{record.taskMetrics.humanInterventions} human checkpoints · {record.taskMetrics.failureRate}% failed</small></article>
            <article><span>Execution</span><strong>{studioEfficiencyDuration(record.executionMetrics.averageRuntimeMs)}</strong><small>Provider latency {studioEfficiencyDuration(record.executionMetrics.averageProviderLatencyMs)}</small></article>
            <article><span>Cost efficiency</span><strong>{record.costMetrics.creditsPerCompletedExecution === null ? "No completed run" : `${record.costMetrics.creditsPerCompletedExecution} cr/run`}</strong><small>{record.costMetrics.costStatus} · {record.costMetrics.confidence} confidence</small></article>
            <article><span>Quality</span><strong>{record.qualityMetrics.averageRating === null ? "No rating" : `${record.qualityMetrics.averageRating}/5`}</strong><small>{record.qualityMetrics.qualityScore}/100 workflow quality</small></article>
            <article><span>Assets</span><strong>{record.assetMetrics.assetCount}</strong><small>{record.assetMetrics.reuseOpportunityCount} reuse opportunities</small></article>
          </div>
          <div className="studio-efficiency-insights" aria-label="Production bottlenecks and optimization opportunities">
            {insights.length ? insights.map((insight) => (
              <article key={insight.insightId}>
                <div><span>{studioEfficiencyInsightLabel(insight.type)}</span><strong>{insight.confidence}</strong></div>
                <p>{insight.message}</p>
                <small>{insight.suggestion}</small>
              </article>
            )) : <span className="studio-project-copilot-empty">No production bottleneck has enough evidence yet.</span>}
          </div>
        </>
      ) : efficiency ? <span className="studio-project-copilot-empty">No owned Workflow metrics are available for this project yet.</span> : error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : <span className="studio-project-copilot-empty">Analyzing Workflow, Tasks, Execution, Assets, Feedback, and Cost...</span>}
      <small>Optimization remains a suggestion. Preview and confirmation create Draft metadata only; Copilot never changes a Workflow, switches a model, executes work, or charges Credits.</small>
    </section>
  );
}
