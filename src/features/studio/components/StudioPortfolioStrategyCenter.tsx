"use client";

import { useEffect, useState } from "react";
import {
  studioPortfolioStrategyLabel,
  type StudioPortfolioStrategyPreview,
  type StudioPortfolioStrategySnapshot,
} from "@/features/studio/capabilities/studioPortfolioStrategy";
import {
  confirmStudioPortfolioStrategy,
  getStudioPortfolioStrategy,
  previewStudioPortfolioStrategy,
} from "@/lib/studio-portfolio-strategy-api";

export function StudioPortfolioStrategyCenter() {
  const [snapshot, setSnapshot] = useState<StudioPortfolioStrategySnapshot | null>(null);
  const [preview, setPreview] = useState<StudioPortfolioStrategyPreview | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void getStudioPortfolioStrategy(controller.signal)
      .then((value) => {
        setSnapshot(value);
        setError("");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Portfolio Strategy is unavailable.");
      });
    return () => controller.abort();
  }, []);

  const refresh = async () => {
    setSnapshot(await getStudioPortfolioStrategy());
  };

  const previewDraft = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await previewStudioPortfolioStrategy();
      setPreview(result);
      await refresh();
      setMessage("Portfolio Strategy preview ready. Priorities and projects remain unchanged.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Portfolio Strategy preview failed.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDraft = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await confirmStudioPortfolioStrategy();
      await refresh();
      setMessage(`Portfolio Strategy Draft created: ${result.draft.draftId}. Human review remains required.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Portfolio Strategy Draft could not be created.");
    } finally {
      setBusy(false);
    }
  };

  const status = snapshot?.action?.status || "SUGGESTED";

  return (
    <section className="studio-portfolio-strategy" aria-label="Portfolio Strategy Center">
      <header>
        <div>
          <span>Portfolio Data - Strategy Insight - Human Draft</span>
          <h2>Portfolio Strategy Center</h2>
          <p>Cross-project vision, relationships, priorities, risks, and evidence for the current user only.</p>
        </div>
        <div className={`studio-portfolio-strategy-confidence is-${snapshot?.confidence.toLowerCase() || "waiting"}`}>
          <strong>{snapshot?.confidence || "--"}</strong>
          <span>Strategy confidence</span>
          <small>Priorities not applied</small>
        </div>
      </header>

      {error ? (
        <div className="studio-portfolio-strategy-empty" role="status">
          <strong>Portfolio Strategy unavailable</strong>
          <span>{error}</span>
        </div>
      ) : !snapshot ? (
        <div className="studio-portfolio-strategy-empty">Connecting Portfolio Intelligence and Project Roadmaps...</div>
      ) : (
        <>
          <section className="studio-portfolio-strategy-vision">
            <div>
              <span>Portfolio vision</span>
              <strong>{snapshot.vision.statement}</strong>
            </div>
            <div>
              {snapshot.vision.goals.map((goal) => (
                <span key={goal}>{studioPortfolioStrategyLabel(goal)}</span>
              ))}
            </div>
          </section>

          <div className="studio-portfolio-strategy-grid">
            <section>
              <header><strong>Project portfolio</strong><span>{snapshot.projects.length} projects</span></header>
              <div className="studio-portfolio-strategy-projects">
                {snapshot.projects.map((project) => {
                  const priority = snapshot.priorities.find((item) => item.projectId === project.projectId);
                  return (
                    <article key={project.projectId}>
                      <header>
                        <strong>{project.name}</strong>
                        <span>{priority?.priority || "LOW"} suggestion</span>
                      </header>
                      <p>{project.currentGoal || "Current direction forming"}</p>
                      <small>Next: {project.nextGoal || "More evidence required"}</small>
                      <footer>
                        <span>{project.confidence} roadmap</span>
                        <span>{priority ? studioPortfolioStrategyLabel(priority.role) : "Experimental"}</span>
                      </footer>
                    </article>
                  );
                })}
              </div>
            </section>

            <section>
              <header><strong>Relationships and risks</strong><span>{snapshot.relationships.length} signals</span></header>
              <div className="studio-portfolio-strategy-relationships">
                {snapshot.relationships.slice(0, 6).map((relationship) => (
                  <article key={relationship.relationshipId}>
                    <header>
                      <span>{studioPortfolioStrategyLabel(relationship.type)}</span>
                      <strong>{relationship.confidence}</strong>
                    </header>
                    <p>{relationship.summary}</p>
                    <small>{relationship.projectIds.length} linked projects</small>
                  </article>
                ))}
                {!snapshot.relationships.length ? <p>No cross-project relationship signal yet.</p> : null}
              </div>
              <footer>
                {snapshot.riskFlags.length
                  ? snapshot.riskFlags.map((risk) => <span key={risk}>{studioPortfolioStrategyLabel(risk)}</span>)
                  : <span>No active portfolio risk flag</span>}
              </footer>
            </section>
          </div>

          <section className="studio-portfolio-strategy-recommendations">
            <header><strong>Strategic suggestions</strong><span>Evidence-backed / Draft only</span></header>
            <div>
              {snapshot.strategies.map((strategy) => (
                <article key={strategy.strategyId}>
                  <header>
                    <span>{studioPortfolioStrategyLabel(strategy.type)}</span>
                    <strong>{strategy.confidence}</strong>
                  </header>
                  <p>{strategy.summary}</p>
                  <small>{strategy.evidenceRefs.length} evidence references</small>
                </article>
              ))}
            </div>
          </section>

          {preview && status !== "CONFIRMED" ? (
            <div className="studio-portfolio-strategy-preview">
              <strong>PORTFOLIO_STRATEGY_DRAFT preview</strong>
              <span>{preview.preview.strategies.length} strategies / {preview.preview.priorities.length} priority suggestions</span>
              <small>No priority change, project mutation, Workflow execution, cross-user read, or Credits.</small>
            </div>
          ) : null}

          <footer className="studio-portfolio-strategy-footer">
            <div>
              <span>Current user projects only</span>
              <span>Priority suggestions are not applied</span>
              <span>No project mutation, Workflow execution, or Credits</span>
            </div>
            {status === "CONFIRMED" ? (
              <button disabled type="button">Portfolio Strategy Draft created</button>
            ) : status === "PREVIEWED" ? (
              <button disabled={busy} onClick={() => void confirmDraft()} type="button">
                {busy ? "Creating Draft..." : "Confirm Portfolio Strategy Draft"}
              </button>
            ) : (
              <button disabled={busy} onClick={() => void previewDraft()} type="button">
                {busy ? "Preparing Preview..." : "Preview Portfolio Strategy"}
              </button>
            )}
          </footer>
          {message ? <div className="studio-portfolio-strategy-message" role="status">{message}</div> : null}
        </>
      )}
    </section>
  );
}
