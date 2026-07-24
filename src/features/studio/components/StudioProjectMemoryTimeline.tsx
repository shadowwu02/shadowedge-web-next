"use client";

import { useEffect, useState } from "react";
import {
  studioProjectMemoryTypeLabel,
  type StudioProjectMemorySnapshot,
} from "@/features/studio/capabilities/studioProjectContinuityMemory";
import { useStudioStore } from "@/features/studio/store/studioStore";
import { getStudioProjectContinuityMemory } from "@/lib/studio-project-continuity-memory-api";

function displayLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

function shortDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function StudioProjectMemoryTimeline() {
  const projectId = useStudioStore((state) => state.projectId);
  const [state, setState] = useState<Readonly<{
    projectId: string;
    snapshot: StudioProjectMemorySnapshot | null;
    error: string;
  }> | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    void getStudioProjectContinuityMemory(projectId, controller.signal)
      .then((snapshot) => setState({ projectId, snapshot, error: "" }))
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          projectId,
          snapshot: null,
          error: reason instanceof Error ? reason.message : "Project Memory is unavailable.",
        });
      });
    return () => controller.abort();
  }, [projectId]);

  const snapshot = state?.projectId === projectId ? state.snapshot : null;
  const error = state?.projectId === projectId ? state.error : "";
  const loading = Boolean(projectId && state?.projectId !== projectId);

  return (
    <section className="studio-project-memory" aria-label="Project Memory Timeline">
      <header>
        <div>
          <span>History → continuity → better suggestions</span>
          <h2>Project Memory Timeline</h2>
          <p>Qualified milestones, decisions, successful patterns, and lessons from this project only.</p>
        </div>
        <div className="studio-project-memory-count">
          <strong>{snapshot ? snapshot.milestones.length + snapshot.decisions.length : "—"}</strong>
          <span>Continuity records</span>
          <small>Read-only</small>
        </div>
      </header>

      {!projectId ? (
        <div className="studio-project-memory-empty">Open a project to retrieve its long-term creative memory.</div>
      ) : loading ? (
        <div className="studio-project-memory-empty">Retrieving qualified project history…</div>
      ) : error ? (
        <div className="studio-project-memory-error" role="status">
          <strong>Project Memory unavailable</strong>
          <span>{error}</span>
        </div>
      ) : snapshot ? (
        <>
          <div className="studio-project-memory-summary">
            <div><span>Milestones</span><strong>{snapshot.milestones.length}</strong></div>
            <div><span>Decisions</span><strong>{snapshot.decisions.length}</strong></div>
            <div><span>Successful patterns</span><strong>{snapshot.successfulPatterns.length}</strong></div>
            <div><span>Lessons</span><strong>{snapshot.lessons.length}</strong></div>
          </div>

          <section className="studio-project-memory-stream" aria-label="Qualified project history">
            <header>
              <strong>Creative continuity</strong>
              <span>Chronological · qualified sources only</span>
            </header>
            {snapshot.milestones.length ? (
              <div>
                {snapshot.milestones.map((milestone, index) => (
                  <article key={milestone.memoryId}>
                    <div className="studio-project-memory-marker">
                      <span>{index + 1}</span>
                    </div>
                    <div>
                      <header>
                        <span>{studioProjectMemoryTypeLabel(milestone.type)}</span>
                        <time dateTime={milestone.createdAt}>{shortDate(milestone.createdAt)}</time>
                      </header>
                      <strong>{displayLabel(milestone.milestone)}</strong>
                      <p>{milestone.summary}</p>
                      <small>{milestone.confidence} confidence · {displayLabel(milestone.source.qualification)}</small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p>No qualified milestone has been recorded yet.</p>
            )}
          </section>

          <div className="studio-project-memory-grid">
            <section>
              <header><strong>Decision history</strong><span>{snapshot.decisions.length}</span></header>
              {snapshot.decisions.length ? snapshot.decisions.map((decision) => (
                <article key={decision.memoryId}>
                  <span>{studioProjectMemoryTypeLabel(decision.type)}</span>
                  <strong>{displayLabel(decision.choice)}</strong>
                  <p>{decision.summary}</p>
                  <small>{decision.confidence} · successful outcome required</small>
                </article>
              )) : <p>No successful project-attributed decision pattern yet.</p>}
            </section>

            <section>
              <header><strong>Successful patterns</strong><span>{snapshot.successfulPatterns.length}</span></header>
              {snapshot.successfulPatterns.length ? snapshot.successfulPatterns.map((pattern) => (
                <article key={pattern.memoryId}>
                  <span>{displayLabel(pattern.pattern)}</span>
                  <strong>{studioProjectMemoryTypeLabel(pattern.type)}</strong>
                  <p>{pattern.summary}</p>
                  <small>{pattern.confidence} · {displayLabel(pattern.source.qualification)}</small>
                </article>
              )) : <p>No completed outcome has qualified as a reusable pattern.</p>}
            </section>

            <section>
              <header><strong>Lessons</strong><span>{snapshot.lessons.length}</span></header>
              {snapshot.lessons.length ? snapshot.lessons.map((lesson) => (
                <article key={lesson.memoryId}>
                  <span>{studioProjectMemoryTypeLabel(lesson.type)}</span>
                  <strong>{lesson.summary}</strong>
                  <small>{lesson.confidence} · {displayLabel(lesson.source.sourceType)}</small>
                </article>
              )) : <p>No qualified long-term lesson has been recorded.</p>}
            </section>
          </div>

          <footer>
            <span>Current user + current project only</span>
            <span>No Context or project-direction mutation</span>
            <span>No execution, Provider, or Credits</span>
            <time dateTime={snapshot.updatedAt}>Updated {new Date(snapshot.updatedAt).toLocaleString()}</time>
          </footer>
        </>
      ) : null}
    </section>
  );
}
