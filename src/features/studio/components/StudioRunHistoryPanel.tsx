"use client";

import { useMemo } from "react";
import { STUDIO_RUNS_STORAGE_KEY } from "@/features/studio/lib/studioRunHistory";
import { useStudioStore } from "@/features/studio/store/studioStore";
import type { StudioNodeType } from "@/features/studio/types/studioTypes";

const nodeLabels: Record<StudioNodeType, string> = {
  asset: "Asset",
  prompt: "Prompt",
  remakeAnalysis: "Remake Analysis",
  remake_pipeline: "Remake Pipeline",
  remakeShot: "Remake Shot",
  imageGenerate: "Image Generate",
  videoGenerate: "Video Generate",
  video_edit: "Video Edit",
  output: "Output",
};

function relativeTime(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return "just now";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} day ago`;
}

export function StudioRunHistoryPanel() {
  const projectId = useStudioStore((state) => state.projectId || "local");
  const runHistory = useStudioStore((state) => state.runHistory);
  const projectRuns = useMemo(
    () => runHistory.filter((run) => run.projectId === projectId),
    [projectId, runHistory],
  );
  const runs = projectRuns.slice(0, 8);

  return (
    <section className="studio-run-history" aria-label="Studio run history">
      <div className="studio-run-history-heading">
        <div>
          <p>Runs</p>
          <h2>Execution history</h2>
        </div>
        <span title={STUDIO_RUNS_STORAGE_KEY}>Local</span>
      </div>

      {runs.length ? (
        <div className="studio-run-history-list">
          {runs.map((run, index) => {
            const focusNode =
              run.nodes.find((node) => node.status === "failed") ||
              run.nodes.find(
                (node) =>
                  node.type === "videoGenerate" ||
                  node.type === "imageGenerate" ||
                  node.type === "remakeAnalysis" ||
                  node.type === "remake_pipeline",
              ) ||
              run.nodes[0];
            return (
              <article key={run.id}>
                <div className="studio-run-history-title">
                  <strong>Run #{projectRuns.length - index}</strong>
                  <span className={`studio-run-history-status studio-run-history-status-${run.status}`}>
                    {run.status}
                  </span>
                </div>
                <p>{focusNode ? nodeLabels[focusNode.type] : "Workflow"}</p>
                <small>
                  {run.mode === "retry" ? "Single-node retry" : `${run.nodes.length} nodes`} ·{" "}
                  {relativeTime(run.createdAt)}
                </small>
                {focusNode?.errorCode || focusNode?.message ? (
                  <span className="studio-run-history-error">
                    {focusNode.errorCode || focusNode.message}
                  </span>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="studio-run-history-empty">No runs recorded for this project yet.</p>
      )}
    </section>
  );
}
