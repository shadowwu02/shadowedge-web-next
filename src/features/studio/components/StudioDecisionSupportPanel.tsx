"use client";

import { useEffect, useState } from "react";
import {
  STUDIO_TRADEOFF_METRICS,
  studioDecisionOptionLabel,
  studioTradeoffMetricLabel,
  type StudioDecisionSupportBundle,
} from "@/features/studio/capabilities/studioDecisionSupport";
import { getStudioDecisionSupport } from "@/lib/studio-decision-support-api";

export function StudioDecisionSupportPanel({ projectId }: { projectId: string }) {
  const [bundleState, setBundleState] = useState<{ projectId: string; bundle: StudioDecisionSupportBundle } | null>(null);
  const [errorState, setErrorState] = useState<{ projectId: string; message: string } | null>(null);
  const bundle = bundleState?.projectId === projectId ? bundleState.bundle : null;
  const error = errorState?.projectId === projectId ? errorState.message : "";

  useEffect(() => {
    let active = true;
    void getStudioDecisionSupport(projectId)
      .then((value) => {
        if (!active) return;
        setBundleState({ projectId, bundle: value });
        setErrorState(null);
      })
      .catch(() => {
        if (active) setErrorState({ projectId, message: "Decision Support is temporarily unavailable." });
      });
    return () => { active = false; };
  }, [projectId]);

  return (
    <section className="studio-decision-support" aria-label="Creative Decision Support">
      <header>
        <div><span>Multi-objective planning</span><strong>Decision Support</strong></div>
        <small>{bundle ? `${bundle.summary.optionCount} options · ${bundle.summary.confidence}` : "Private"}</small>
      </header>
      {bundle ? (
        <>
          {bundle.conflicts.map((conflict) => (
            <div className="studio-decision-conflict" key={conflict.conflictId}>
              <strong>TRADEOFF_CONFLICT</strong>
              <span>{conflict.reason}</span>
              <small>No automatic choice. Compare both objectives and choose in Action Center.</small>
            </div>
          ))}
          <div className="studio-decision-options">
            {bundle.options.map((option) => (
              <article key={option.optionId}>
                <header>
                  <div><span>Option</span><strong>{studioDecisionOptionLabel(option.optionType)}</strong></div>
                  <small>{option.confidence}</small>
                </header>
                <p>{option.goal}</p>
                <div className="studio-decision-metrics" aria-label={`${studioDecisionOptionLabel(option.optionType)} tradeoff metrics`}>
                  {STUDIO_TRADEOFF_METRICS.map((type) => {
                    const metric = option.metrics[type];
                    return (
                      <div data-effect={metric.effect} key={type}>
                        <span>{studioTradeoffMetricLabel(type)}</span>
                        <strong>{metric.display}</strong>
                      </div>
                    );
                  })}
                </div>
                <div className="studio-decision-tradeoffs">
                  <small><b>Advantages</b> {option.tradeoffs.advantages.join(" · ") || "No measured advantage"}</small>
                  <small><b>Risks</b> {option.tradeoffs.risks.join(" · ") || "No measured risk"}</small>
                </div>
                <small>{option.tradeoffs.disclaimer}</small>
              </article>
            ))}
          </div>
        </>
      ) : error ? (
        <span className="studio-project-copilot-error" role="alert">{error}</span>
      ) : (
        <span className="studio-project-copilot-empty">Comparing quality, cost, speed, brand alignment, and efficiency...</span>
      )}
      <small>Compare options here, then Preview your preferred option in Action Center. Confirm creates a Decision Selection Draft only; nothing is selected or executed automatically.</small>
    </section>
  );
}
