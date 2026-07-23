"use client";

import { useEffect, useState } from "react";
import {
  studioDecisionPatternConfidenceLabel,
  studioDecisionPatternLabel,
  type StudioDecisionPatternBundle,
} from "@/features/studio/capabilities/studioDecisionPattern";
import {
  deleteStudioDecisionPattern,
  getStudioDecisionPatterns,
} from "@/lib/studio-decision-patterns-api";

export function StudioDecisionPatternsPanel() {
  const [bundle, setBundle] = useState<StudioDecisionPatternBundle | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const value = await getStudioDecisionPatterns();
    setBundle(value);
    setError("");
  };

  useEffect(() => {
    let active = true;
    void getStudioDecisionPatterns()
      .then((value) => { if (active) setBundle(value); })
      .catch(() => { if (active) setError("Decision Patterns are temporarily unavailable."); });
    return () => { active = false; };
  }, []);

  const remove = async (patternId: string) => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await deleteStudioDecisionPattern(patternId);
      await load();
      setPendingDeleteId(null);
      setMessage("Decision Pattern removed from future Copilot suggestions.");
    } catch {
      setError("This Decision Pattern could not be removed. No preferences or project data changed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="studio-decision-patterns" aria-label="My Decision Patterns">
      <header>
        <div><span>Choice memory</span><strong>My Decision Patterns</strong></div>
        <small>{bundle ? `${bundle.summary.total} private signals` : "Private"}</small>
      </header>
      {bundle ? (
        bundle.patterns.length ? (
          <div className="studio-decision-pattern-list">
            {bundle.patterns.map((pattern) => (
              <article key={pattern.patternId}>
                <header>
                  <strong>{studioDecisionPatternLabel(pattern.decisionType)}</strong>
                  <span>{studioDecisionPatternConfidenceLabel(pattern.confidence)}</span>
                </header>
                <p>Usually chose: {pattern.choiceSignals.selectedValue.replaceAll("_", " ").toLowerCase()}</p>
                <small>{pattern.choiceSignals.selectionCount} confirmed choice(s) · {pattern.choiceSignals.successfulOutcomeCount} successful outcome(s)</small>
                <small>Source: {pattern.sources.map((source) => source.label).filter(Boolean).join(", ")}</small>
                {pendingDeleteId === pattern.patternId ? (
                  <div className="studio-decision-pattern-delete">
                    <span>Stop using this pattern in future suggestions?</span>
                    <button disabled={busy} onClick={() => void remove(pattern.patternId)} type="button">{busy ? "Removing..." : "Confirm remove"}</button>
                    <button disabled={busy} onClick={() => setPendingDeleteId(null)} type="button">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setPendingDeleteId(pattern.patternId)} type="button">Remove</button>
                )}
              </article>
            ))}
          </div>
        ) : <span className="studio-project-copilot-empty">No reusable decision pattern yet. Confirmed Decision and Scenario choices can appear here.</span>
      ) : error ? (
        <span className="studio-project-copilot-error" role="alert">{error}</span>
      ) : (
        <span className="studio-project-copilot-empty">Reviewing your confirmed creative choices...</span>
      )}
      {message ? <span className="studio-project-copilot-message" role="status">{message}</span> : null}
      {bundle && error ? <span className="studio-project-copilot-error" role="alert">{error}</span> : null}
      <small>Patterns are private, user-controlled personalization signals. Copilot does not change Creative Preferences, choose for you, execute, call a Provider, or charge Credits.</small>
    </section>
  );
}
