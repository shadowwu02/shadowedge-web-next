"use client";

import { useEffect, useState } from "react";
import { studioPortfolioLabel, type StudioPortfolioIntelligence } from "@/features/studio/capabilities/studioPortfolioIntelligence";
import { getStudioPortfolioIntelligence } from "@/lib/studio-portfolio-intelligence-api";

export function StudioPortfolioIntelligencePanel({ currentProjectId }: { currentProjectId: string }) {
  const [portfolio, setPortfolio] = useState<StudioPortfolioIntelligence | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getStudioPortfolioIntelligence()
      .then((value) => { if (active) { setPortfolio(value); setError(""); } })
      .catch(() => { if (active) setError("Portfolio Intelligence is temporarily unavailable."); });
    return () => { active = false; };
  }, []);

  return (
    <section className="studio-portfolio-intelligence" aria-label="Portfolio Intelligence Panel">
      <header>
        <div><span>Multi-project strategy</span><strong>{portfolio?.portfolio.name || "Creative Portfolio"}</strong></div>
        <small>Suggestions only</small>
      </header>
      {portfolio ? (
        <>
          <div className="studio-portfolio-goals" aria-label="Portfolio Goals">
            {portfolio.portfolio.goals.map((goal) => <span key={goal}>{studioPortfolioLabel(goal)}</span>)}
          </div>
          <div className="studio-portfolio-projects">
            {portfolio.projectSummaries.map((project) => {
              const relation = portfolio.relations.find((item) => item.projectId === project.projectId);
              return (
                <article className={project.projectId === currentProjectId ? "is-current" : ""} key={project.projectId}>
                  <div><strong>{project.name}</strong><span>{relation?.priority || "LOW"}</span></div>
                  <p>{project.mission.mission}</p>
                  <small>{relation ? studioPortfolioLabel(relation.role) : "Experimental"} · {project.goalCount} goals · {project.strategyCount} strategies</small>
                </article>
              );
            })}
          </div>
          <div className="studio-portfolio-insights">
            {portfolio.insights.map((insight) => (
              <article key={insight.insightId}>
                <div><span>{studioPortfolioLabel(insight.type)}</span><strong>{insight.confidence}</strong></div>
                <p>{insight.message}</p>
                <small>{insight.projectIds.length} linked project{insight.projectIds.length === 1 ? "" : "s"}</small>
              </article>
            ))}
          </div>
        </>
      ) : error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : <span className="studio-project-copilot-empty">Analyzing the current user&apos;s project portfolio...</span>}
      <small>Priorities and resource notes are analysis only. Copilot never reprioritizes projects, changes project data, executes, calls a Provider, or changes Billing/Credits.</small>
    </section>
  );
}
