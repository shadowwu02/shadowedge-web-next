"use client";

import { useEffect, useState } from "react";
import { studioResourceInsightLabel, type StudioResourceIntelligence } from "@/features/studio/capabilities/studioResourceIntelligence";
import { getStudioResourceIntelligence } from "@/lib/studio-resource-intelligence-api";

export function StudioResourceIntelligencePanel({ currentProjectId }: { currentProjectId: string }) {
  const [resources, setResources] = useState<StudioResourceIntelligence | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getStudioResourceIntelligence()
      .then((value) => {
        if (!active) return;
        setResources(value);
        setError("");
      })
      .catch(() => { if (active) setError("Resource Intelligence is temporarily unavailable."); });
    return () => { active = false; };
  }, []);

  const highValueAssets = resources?.assets.filter((asset) => asset.reuseScore >= 60).slice(0, 5) || [];

  return (
    <section className="studio-resource-intelligence" aria-label="Resource Intelligence Panel">
      <header>
        <div><span>Portfolio resources</span><strong>Resource Intelligence</strong></div>
        <small>Analysis only</small>
      </header>
      {resources ? (
        <>
          <div className="studio-resource-summary" aria-label="Resource Intelligence summary">
            <span>{resources.summary.assetCount} assets</span>
            <span>{resources.summary.highValueAssetCount} high value</span>
            <span>{resources.summary.insightCount} insights</span>
          </div>
          <div className="studio-resource-assets" aria-label="High-value Assets">
            {highValueAssets.length ? highValueAssets.map((asset) => (
              <article className={asset.relatedProjects.includes(currentProjectId) ? "is-current" : ""} key={asset.assetId}>
                <div><strong>{asset.displayName}</strong><span>{asset.reuseScore}/100 reuse</span></div>
                <p>{asset.usageCount} use{asset.usageCount === 1 ? "" : "s"} across {asset.relatedProjects.length} project{asset.relatedProjects.length === 1 ? "" : "s"}</p>
                <small>{asset.styleTags.length ? `Styles: ${asset.styleTags.join(", ")}` : "No confirmed style tags"}</small>
              </article>
            )) : <span className="studio-project-copilot-empty">No high-value reusable Asset has enough evidence yet.</span>}
          </div>
          <div className="studio-resource-insights" aria-label="Resource reuse opportunities">
            {resources.insights.map((insight) => (
              <article key={insight.insightId}>
                <div><span>{studioResourceInsightLabel(insight.type)}</span><strong>{insight.confidence}</strong></div>
                <p>{insight.message}</p>
                <small>{insight.assets.length} assets · {insight.projects.length} projects</small>
              </article>
            ))}
          </div>
        </>
      ) : error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : <span className="studio-project-copilot-empty">Analyzing owned Assets, Characters, Styles, Scenes, and Workflows...</span>}
      <small>Reuse remains a suggestion. Copilot never copies, replaces, or modifies an Asset or project, and never executes a Workflow or changes Billing/Credits.</small>
    </section>
  );
}
