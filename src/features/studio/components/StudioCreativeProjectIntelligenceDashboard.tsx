"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  formatProjectMetricLabel,
  type StudioCreativeProjectSnapshot,
} from "@/features/studio/capabilities/studioCreativeProjectIntelligence";
import { useStudioStore } from "@/features/studio/store/studioStore";
import { getStudioCreativeProjectIntelligence } from "@/lib/studio-project-intelligence-dashboard-api";

type SnapshotState = Readonly<{
  projectId: string;
  snapshot: StudioCreativeProjectSnapshot | null;
  error: string;
}>;

function Metric({
  label,
  value,
  detail,
}: Readonly<{ label: string; value: string | number; detail?: string }>) {
  return (
    <div className="studio-project-intelligence-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function RiskGroup({
  label,
  risks,
}: Readonly<{ label: string; risks: readonly string[] }>) {
  return (
    <div className="studio-project-intelligence-risk-group">
      <header>
        <span>{label}</span>
        <strong>{risks.length}</strong>
      </header>
      {risks.length ? (
        <div>{risks.slice(0, 3).map((risk) => <small key={risk}>{formatProjectMetricLabel(risk)}</small>)}</div>
      ) : <small className="is-clear">No active risk</small>}
    </div>
  );
}

export function StudioCreativeProjectIntelligenceDashboard() {
  const projectId = useStudioStore((state) => state.projectId);
  const projectName = useStudioStore((state) => state.projectName);
  const [state, setState] = useState<SnapshotState | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    void getStudioCreativeProjectIntelligence(projectId, controller.signal)
      .then((snapshot) => setState({ projectId, snapshot, error: "" }))
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          projectId,
          snapshot: null,
          error: reason instanceof Error ? reason.message : "Project Intelligence is unavailable.",
        });
      });
    return () => controller.abort();
  }, [projectId]);

  const snapshot = state?.projectId === projectId ? state.snapshot : null;
  const error = state?.projectId === projectId ? state.error : "";
  const loading = Boolean(projectId && state?.projectId !== projectId);
  const progressStyle = { "--project-progress": `${snapshot?.progress || 0}%` } as CSSProperties;
  const actualCost = snapshot?.costStats.actualCost.amount;

  return (
    <section className="studio-project-intelligence" aria-label="Project Intelligence Dashboard">
      <header className="studio-project-intelligence-header">
        <div>
          <span>Creative project command view</span>
          <h2>Project Intelligence</h2>
          <p>Production, quality, cost, timeline, revisions, and risks—one read-only health snapshot.</p>
        </div>
        <div className="studio-project-intelligence-progress" style={progressStyle}>
          <strong>{snapshot?.progress ?? 0}%</strong>
          <span>{snapshot ? snapshot.riskStats.status : "WAITING"}</span>
          <small>{projectId ? projectName : "No project open"}</small>
        </div>
      </header>

      {!projectId ? (
        <div className="studio-project-intelligence-empty">
          <strong>Open a project to see its intelligence snapshot.</strong>
          <span>Production and execution remain unchanged.</span>
        </div>
      ) : loading ? (
        <div className="studio-project-intelligence-empty">Building the project health snapshot…</div>
      ) : error ? (
        <div className="studio-project-intelligence-error" role="status">
          <strong>Project Intelligence unavailable</strong>
          <span>{error}</span>
        </div>
      ) : snapshot ? (
        <>
          <div className="studio-project-intelligence-grid">
            <article>
              <header><span>01</span><strong>Production</strong><small>{formatProjectMetricLabel(snapshot.productionStats.status)}</small></header>
              <div className="studio-project-intelligence-metrics">
                <Metric label="Scenes" value={snapshot.productionStats.sceneCount} />
                <Metric label="Shots" value={snapshot.productionStats.shotCount} />
                <Metric label="Completed" value={snapshot.productionStats.completed} />
                <Metric label="Running" value={snapshot.productionStats.running} />
                <Metric label="Failed" value={snapshot.productionStats.failed} />
              </div>
            </article>

            <article>
              <header><span>02</span><strong>Quality</strong><small>{formatProjectMetricLabel(snapshot.qualityStats.reviewStatus)}</small></header>
              <div className="studio-project-intelligence-metrics">
                <Metric label="Score" value={snapshot.qualityStats.qualityScore ?? "—"} detail="/ 100" />
                <Metric label="Issues" value={snapshot.qualityStats.issues} />
                <Metric label="Results" value={snapshot.qualityStats.resultCount} />
                <Metric label="Revisions" value={snapshot.qualityStats.revisionCount} />
              </div>
            </article>

            <article>
              <header><span>03</span><strong>Cost</strong><small>{snapshot.costStats.confidence} confidence</small></header>
              <div className="studio-project-intelligence-metrics">
                <Metric label="Estimated" value={snapshot.costStats.estimatedCost.totalCredits} detail="credits" />
                <Metric
                  label="Actual"
                  value={actualCost === null || actualCost === undefined ? "Unknown" : actualCost}
                  detail={actualCost === null || actualCost === undefined ? "not inferred" : snapshot.costStats.actualCost.currency || ""}
                />
                <Metric label="Used" value={snapshot.costStats.actualCost.shadowCredits} detail="credits" />
                <Metric label="Known" value={`${snapshot.costStats.knownCostRatio}%`} />
              </div>
            </article>

            <article>
              <header><span>04</span><strong>Timeline & Delivery</strong><small>{snapshot.deliveryStats.latestVersion || "No version"}</small></header>
              <div className="studio-project-intelligence-metrics">
                <Metric label="Results" value={snapshot.timelineStats.totalResults} />
                <Metric label="Clips" value={snapshot.timelineStats.completedClips} />
                <Metric label="Missing" value={snapshot.timelineStats.missingResults} />
                <Metric label="Versions" value={snapshot.deliveryStats.versions} />
              </div>
            </article>

            <article>
              <header><span>05</span><strong>Revision</strong><small>{formatProjectMetricLabel(snapshot.revisionStats.latestStatus)}</small></header>
              <div className="studio-project-intelligence-metrics">
                <Metric label="Total" value={snapshot.revisionStats.total} />
                <Metric label="Confirmed" value={snapshot.revisionStats.confirmed} />
                <Metric label="Blocked" value={snapshot.revisionStats.blocked} />
                <Metric
                  label="Version loop"
                  value={snapshot.revisionStats.targetVersion || "—"}
                  detail={snapshot.revisionStats.sourceVersion ? `from ${snapshot.revisionStats.sourceVersion}` : ""}
                />
              </div>
            </article>
          </div>

          <section className={`studio-project-intelligence-risks is-${snapshot.riskStats.status.toLowerCase()}`}>
            <header>
              <div><span>Risk summary</span><strong>{snapshot.riskStats.status}</strong></div>
              <small>{snapshot.riskStats.total} active signal{snapshot.riskStats.total === 1 ? "" : "s"}</small>
            </header>
            <div>
              <RiskGroup label="Production" risks={snapshot.riskStats.productionRisk} />
              <RiskGroup label="Quality" risks={snapshot.riskStats.qualityRisk} />
              <RiskGroup label="Cost" risks={snapshot.riskStats.costRisk} />
              <RiskGroup label="Revision" risks={snapshot.riskStats.revisionRisk} />
            </div>
          </section>

          <section className="studio-project-intelligence-insights" aria-label="Copilot Project Insights">
            <header><span>Copilot project insights</span><small>Draft-only · human review required</small></header>
            {snapshot.copilotInsights.length ? (
              <div>{snapshot.copilotInsights.map((insight) => (
                <article key={insight.insightId}>
                  <span>{formatProjectMetricLabel(insight.type)}</span>
                  <strong>{insight.message}</strong>
                  <small>{insight.confidence} confidence · {formatProjectMetricLabel(insight.source)}</small>
                </article>
              ))}</div>
            ) : <p>No project-level insight needs attention.</p>}
          </section>

          <footer>
            <span>Read-only analytics</span>
            <span>No production or workflow changes</span>
            <span>No generation or credit deduction</span>
            <time dateTime={snapshot.updatedAt}>Updated {new Date(snapshot.updatedAt).toLocaleString()}</time>
          </footer>
        </>
      ) : null}
    </section>
  );
}
