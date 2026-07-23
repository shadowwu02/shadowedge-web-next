"use client";

import { useEffect, useState } from "react";
import {
  studioCopilotEvidenceLabel,
  type StudioCopilotExplanationBundle,
} from "@/features/studio/capabilities/studioCopilotExplanation";
import type { StudioCopilotSuggestion } from "@/features/studio/capabilities/studioProjectCopilot";
import { getStudioCopilotExplanations } from "@/lib/studio-copilot-explanations-api";

export function StudioCopilotTrustCenter({
  projectId,
  recommendations,
}: {
  projectId: string;
  recommendations: readonly StudioCopilotSuggestion[];
}) {
  const [bundle, setBundle] = useState<StudioCopilotExplanationBundle | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getStudioCopilotExplanations(projectId)
      .then((value) => { if (active) { setBundle(value); setError(""); } })
      .catch(() => { if (active) setError("Recommendation explanations are temporarily unavailable."); });
    return () => { active = false; };
  }, [projectId]);

  const recommendationsById = new Map(recommendations.map((item) => [item.suggestionId, item]));

  return (
    <section className="studio-copilot-trust-center" aria-label="Why Copilot">
      <header>
        <div><span>Trust center</span><strong>Why Copilot?</strong></div>
        <small>{bundle ? `${bundle.summary.total} explained recommendations` : "Project evidence only"}</small>
      </header>
      {bundle ? (
        bundle.explanations.length ? (
          <div className="studio-copilot-explanation-list">
            {bundle.explanations.map((explanation, index) => {
              const recommendation = recommendationsById.get(explanation.recommendationId);
              return (
                <details key={explanation.explanationId} open={index === 0 && Boolean(recommendation)}>
                  <summary>
                    <span>{recommendation?.message || "Saved recommendation explanation"}</span>
                    <strong>{explanation.confidence.overall} confidence</strong>
                  </summary>
                  <div className="studio-copilot-confidence-breakdown" aria-label="Confidence breakdown">
                    {explanation.confidence.breakdown.map((item) => (
                      <span key={item.factor}><b>{item.factor}</b>{item.level}</span>
                    ))}
                  </div>
                  <div className="studio-copilot-reasoning-factors" aria-label="Reasoning factors">
                    {explanation.reasoningFactors.map((item) => (
                      <p key={item.factor} data-impact={item.impact}><b>{item.factor.replaceAll("_", " ")}</b>{item.reason}</p>
                    ))}
                  </div>
                  <div className="studio-copilot-evidence-list" aria-label="Evidence used">
                    {explanation.evidence.map((item) => (
                      <article key={item.type}>
                        <header><strong>{studioCopilotEvidenceLabel(item.type)}</strong><span>{item.strength}</span></header>
                        <p>{item.summary}</p>
                      </article>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        ) : <span className="studio-project-copilot-empty">No recommendation explanation is available yet.</span>
      ) : error ? (
        <span className="studio-project-copilot-error" role="alert">{error}</span>
      ) : (
        <span className="studio-project-copilot-empty">Preparing a safe evidence summary...</span>
      )}
      <small>Explanations use sanitized evidence from this project and your own preferences. Raw prompts, other users, Provider internals, and hidden policy details are never shown. Explanations do not change recommendations or execute actions.</small>
    </section>
  );
}
