"use client";

import { useEffect, useState } from "react";
import {
  studioPortfolioPerformanceLabel,
  type StudioPortfolioPerformancePreview,
  type StudioPortfolioPerformanceSnapshot,
} from "@/features/studio/capabilities/studioPortfolioPerformance";
import {
  confirmStudioPortfolioPerformanceDraft,
  getStudioPortfolioPerformance,
  previewStudioPortfolioPerformanceDraft,
} from "@/lib/studio-portfolio-performance-api";

function valueOrDash(value: number | null, suffix = "") {
  return value === null ? "—" : `${value}${suffix}`;
}

export function StudioPortfolioPerformanceCenter() {
  const [snapshot, setSnapshot] = useState<StudioPortfolioPerformanceSnapshot | null>(null);
  const [preview, setPreview] = useState<StudioPortfolioPerformancePreview | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void getStudioPortfolioPerformance(controller.signal)
      .then((value) => {
        setSnapshot(value);
        setError("");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Portfolio Performance is unavailable.");
      });
    return () => controller.abort();
  }, []);

  const refresh = async () => {
    setSnapshot(await getStudioPortfolioPerformance());
  };

  const previewDraft = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await previewStudioPortfolioPerformanceDraft();
      setPreview(result);
      await refresh();
      setMessage("Performance Draft preview ready. No project, resource, priority, or Workflow changed.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Performance Draft preview failed.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDraft = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await confirmStudioPortfolioPerformanceDraft();
      await refresh();
      setMessage(`Portfolio Performance Draft created: ${result.draft.draftId}. Human review remains required.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Portfolio Performance Draft could not be created.");
    } finally {
      setBusy(false);
    }
  };

  const status = snapshot?.action?.status || "SUGGESTED";

  return (
    <section className="studio-portfolio-performance" aria-label="Portfolio Performance Center">
      <header>
        <div>
          <span>Results · Quality · Cost · Delivery · Feedback · Revision</span>
          <h2>Portfolio Performance Center</h2>
          <p>Compare project outcomes, success patterns, risks, and evidence across your portfolio.</p>
        </div>
        <div className={`studio-portfolio-performance-confidence is-${snapshot?.confidence.toLowerCase() || "waiting"}`}>
          <strong>{snapshot?.confidence || "—"}</strong>
          <span>Benchmark confidence</span>
          <small>Analysis only</small>
        </div>
      </header>

      {error ? (
        <div className="studio-portfolio-performance-empty" role="status">
          <strong>Portfolio Performance unavailable</strong>
          <span>{error}</span>
        </div>
      ) : !snapshot ? (
        <div className="studio-portfolio-performance-empty">
          Connecting Portfolio Strategy, Resources, Project Intelligence, Quality, Delivery, and Revision evidence...
        </div>
      ) : (
        <>
          <section className="studio-portfolio-performance-summary" aria-label="Portfolio Performance summary">
            <article>
              <span>Quality</span>
              <strong>{valueOrDash(snapshot.quality.averageScore)}</strong>
              <small>{snapshot.quality.highQualityProjects} high-quality projects</small>
            </article>
            <article>
              <span>Delivery success</span>
              <strong>{valueOrDash(snapshot.delivery.successRate, "%")}</strong>
              <small>{snapshot.delivery.totalVersions} approved versions</small>
            </article>
            <article>
              <span>Client feedback</span>
              <strong>{valueOrDash(snapshot.feedback.averageRating, "/5")}</strong>
              <small>{snapshot.feedback.ratedProjects} rated projects</small>
            </article>
            <article>
              <span>Actual Credits</span>
              <strong>{snapshot.cost.actualCredits}</strong>
              <small>{snapshot.cost.confidence} cost confidence</small>
            </article>
            <article>
              <span>Revision rate</span>
              <strong>{valueOrDash(snapshot.revision.averageRate, "%")}</strong>
              <small>{snapshot.revision.total} Revision Plans</small>
            </article>
          </section>

          <section className="studio-portfolio-performance-ranking">
            <header>
              <strong>Project ranking</strong>
              <span>{snapshot.projects.length} owned projects · suggestion only</span>
            </header>
            <div>
              {snapshot.projects.map((project) => (
                <article key={project.projectId}>
                  <strong className="studio-portfolio-performance-rank">#{project.rank}</strong>
                  <div>
                    <strong>{project.name}</strong>
                    <span>{project.priority} priority context · {project.evidenceCount} evidence groups</span>
                  </div>
                  <dl>
                    <div><dt>Score</dt><dd>{valueOrDash(project.performanceScore)}</dd></div>
                    <div><dt>Quality</dt><dd>{valueOrDash(project.qualityScore)}</dd></div>
                    <div><dt>Delivery</dt><dd>{project.deliveryVersions}</dd></div>
                    <div><dt>Feedback</dt><dd>{valueOrDash(project.feedbackRating, "/5")}</dd></div>
                    <div><dt>Revision</dt><dd>{project.revisionRate}%</dd></div>
                    <div><dt>Workflow</dt><dd>{valueOrDash(project.workflowSuccess, "%")}</dd></div>
                  </dl>
                  <footer>
                    {project.riskFlags.length
                      ? project.riskFlags.map((risk) => <span key={risk}>{studioPortfolioPerformanceLabel(risk)}</span>)
                      : <span className="is-healthy">No current performance risk</span>}
                  </footer>
                </article>
              ))}
            </div>
          </section>

          <div className="studio-portfolio-performance-analysis">
            <section>
              <header><strong>Project benchmarks</strong><span>Cross-project comparison</span></header>
              <div>
                {snapshot.benchmarks.map((benchmark) => (
                  <article key={benchmark.benchmarkId}>
                    <header>
                      <strong>{studioPortfolioPerformanceLabel(benchmark.metric)}</strong>
                      <span>{benchmark.confidence}</span>
                    </header>
                    <p>{benchmark.leader ? `${benchmark.leader.name} leads at ${benchmark.leader.score}` : "Insufficient evidence"}</p>
                    <small>Average {valueOrDash(benchmark.average)} · spread {benchmark.spread} · n={benchmark.sampleSize}</small>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <header><strong>Success and risk patterns</strong><span>Draft-only insight</span></header>
              <div className="studio-portfolio-performance-signals">
                {snapshot.successSignals.map((signal) => (
                  <article key={signal.signalId}>
                    <strong>{studioPortfolioPerformanceLabel(signal.type)}</strong>
                    <span>{signal.message}</span>
                  </article>
                ))}
                {snapshot.risks.map((risk) => (
                  <article className="is-risk" key={risk}>
                    <strong>{studioPortfolioPerformanceLabel(risk)}</strong>
                    <span>Review evidence before any portfolio decision.</span>
                  </article>
                ))}
                {!snapshot.successSignals.length && !snapshot.risks.length ? (
                  <article><strong>Insufficient pattern evidence</strong><span>More completed projects or feedback is required.</span></article>
                ) : null}
              </div>
            </section>
          </div>

          {preview && status !== "CONFIRMED" ? (
            <div className="studio-portfolio-performance-preview">
              <strong>PORTFOLIO_PERFORMANCE_DRAFT preview</strong>
              <span>{preview.preview.benchmarks.length} benchmarks · {preview.preview.insights.length} insights</span>
              <small>No project closure, priority adjustment, resource movement, Workflow change, execution, or Credits.</small>
            </div>
          ) : null}

          <footer className="studio-portfolio-performance-footer">
            <div>
              <span>Current user portfolio only</span>
              <span>Missing evidence remains visible</span>
              <span>Benchmark suggestions are not applied</span>
            </div>
            {status === "CONFIRMED" ? (
              <button disabled type="button">Portfolio Performance Draft created</button>
            ) : status === "PREVIEWED" ? (
              <button disabled={busy} onClick={() => void confirmDraft()} type="button">
                {busy ? "Creating Draft..." : "Confirm Performance Draft"}
              </button>
            ) : (
              <button disabled={busy} onClick={() => void previewDraft()} type="button">
                {busy ? "Preparing Preview..." : "Preview Performance Insight"}
              </button>
            )}
          </footer>
          {message ? <div className="studio-portfolio-performance-message" role="status">{message}</div> : null}
        </>
      )}
    </section>
  );
}
