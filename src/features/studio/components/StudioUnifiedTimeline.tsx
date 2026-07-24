"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  studioTimelineClipLabel,
  type StudioCreativeScene,
  type StudioUnifiedTimeline,
} from "@/features/studio/capabilities/studioUnifiedTimeline";
import { useStudioStore } from "@/features/studio/store/studioStore";
import {
  getStudioCreativeScenes,
  getStudioUnifiedTimeline,
} from "@/lib/studio-unified-timeline-api";

function formatTime(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.max(0, value - minutes * 60);
  return minutes ? `${minutes}:${seconds.toFixed(1).padStart(4, "0")}` : `${seconds.toFixed(1)}s`;
}

function sceneStructure(scene: StudioCreativeScene) {
  const labels = new Map([
    ["VIDEO_CLIP", "Video output"],
    ["IMAGE_CLIP", "Image reference"],
    ["AUDIO_CLIP", "Audio"],
    ["SUBTITLE_CLIP", "Subtitle"],
  ]);
  return scene.clips
    .filter((clip) => clip.type !== "SCENE_MARKER")
    .map((clip) => ({
      key: clip.clipId,
      label: labels.get(clip.type) || "Asset",
      value: clip.metadata.label,
    }));
}

export function StudioUnifiedTimeline() {
  const projectId = useStudioStore((state) => state.projectId);
  const [projection, setProjection] = useState<{
    projectId: string;
    timeline: StudioUnifiedTimeline | null;
    scenes: readonly StudioCreativeScene[];
    error: string;
  } | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    void Promise.all([
      getStudioUnifiedTimeline(projectId, controller.signal),
      getStudioCreativeScenes(projectId, controller.signal),
    ]).then(([nextTimeline, nextScenes]) => {
      setProjection({
        projectId,
        timeline: nextTimeline,
        scenes: nextScenes.scenes,
        error: "",
      });
      setSelectedSceneId((current) =>
        nextScenes.scenes.some((scene) => scene.sceneId === current)
          ? current
          : nextScenes.scenes[0]?.sceneId || null,
      );
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return;
      setProjection({
        projectId,
        timeline: null,
        scenes: [],
        error: reason instanceof Error ? reason.message : "Unified Timeline is unavailable.",
      });
    });
    return () => controller.abort();
  }, [projectId]);

  const timeline = projection?.projectId === projectId ? projection.timeline : null;
  const scenes = projection?.projectId === projectId ? projection.scenes : [];
  const error = projection?.projectId === projectId ? projection.error : "";
  const loading = Boolean(projectId && projection?.projectId !== projectId);
  const selectedScene = scenes.find((scene) => scene.sceneId === selectedSceneId) || scenes[0] || null;
  const duration = Math.max(1, timeline?.duration || 1);

  return (
    <section className="studio-unified-timeline" aria-label="Unified Timeline">
      <header>
        <div>
          <span>Creative production workspace</span>
          <h2>Unified Timeline</h2>
          <p>Scenes, multimodal clips, Agent sources, Output, and Assets in one read-only view.</p>
        </div>
        <div className="studio-unified-timeline-status">
          <strong>{scenes.length} scenes</strong>
          <span>{timeline?.clips.length || 0} clips · {formatTime(timeline?.duration || 0)}</span>
          <small>Timeline source of truth · no execution controls</small>
        </div>
      </header>

      {!projectId ? (
        <div className="studio-unified-timeline-empty">Save or open a project to build its unified production timeline.</div>
      ) : loading ? (
        <div className="studio-unified-timeline-empty">Connecting Canvas, Timeline, Output, and Assets…</div>
      ) : error ? (
        <div className="studio-unified-timeline-error" role="status">
          <strong>Timeline unavailable</strong>
          <span>{error}</span>
        </div>
      ) : !timeline?.clips.length ? (
        <div className="studio-unified-timeline-empty">No media clips yet. Completed results will appear from the existing Timeline and Asset bindings.</div>
      ) : (
        <>
          <div className="studio-unified-scene-tabs" aria-label="Scene structure">
            {scenes.map((scene) => (
              <button
                className={scene.sceneId === selectedScene?.sceneId ? "is-active" : ""}
                key={scene.sceneId}
                onClick={() => setSelectedSceneId(scene.sceneId)}
                type="button"
              >
                <strong>{scene.name}</strong>
                <span>{scene.clips.filter((clip) => clip.type !== "SCENE_MARKER").length} clips</span>
              </button>
            ))}
          </div>

          <div className="studio-unified-timeline-grid">
            <div className="studio-unified-track-list" aria-label="Multimodal timeline clips">
              {timeline.clips.map((clip) => {
                const clipStyle = {
                  "--unified-start": `${(clip.start / duration) * 100}%`,
                  "--unified-width": `${Math.max(4, (clip.duration / duration) * 100)}%`,
                } as CSSProperties;
                return (
                  <article className={`studio-unified-clip is-${clip.type.toLowerCase()}`} key={clip.clipId}>
                    <div>
                      <span>{studioTimelineClipLabel(clip.type)}</span>
                      <strong>{clip.metadata.label}</strong>
                      <small>{formatTime(clip.start)} · {formatTime(clip.duration)}</small>
                    </div>
                    <div className="studio-unified-clip-lane">
                      <i style={clipStyle} />
                    </div>
                    <dl>
                      <div><dt>Agent</dt><dd>{clip.metadata.agentOrigin || "Project"}</dd></div>
                      <div><dt>Asset</dt><dd>{clip.metadata.assetRef || "Reference only"}</dd></div>
                      <div><dt>Status</dt><dd>{clip.metadata.qualityStatus || clip.metadata.assetStatus || "Bound"}</dd></div>
                    </dl>
                  </article>
                );
              })}
            </div>

            <aside className="studio-unified-scene-detail" aria-label="Selected scene details">
              <span>Scene structure</span>
              <h3>{selectedScene?.name || "No scene selected"}</h3>
              <small>{selectedScene?.agents.length ? `Agent source: ${selectedScene.agents.join(", ")}` : "Project source"}</small>
              <div className="studio-unified-scene-tree">
                {selectedScene && sceneStructure(selectedScene).length ? sceneStructure(selectedScene).map((item) => (
                  <div key={item.key}>
                    <b>{item.label}</b>
                    <span>{item.value}</span>
                  </div>
                )) : <p>No bound scene resources.</p>}
              </div>
              <div className="studio-unified-bindings">
                <strong>Canvas ↔ Timeline</strong>
                <span>{timeline.bindings.filter((binding) => binding.sceneId === selectedScene?.sceneId).length} stable references</span>
              </div>
            </aside>
          </div>

          {timeline.insights.length ? (
            <section className="studio-unified-insights" aria-label="Copilot Timeline Insights">
              <header><span>Copilot Timeline Insights</span><small>Draft suggestions only</small></header>
              <div>
                {timeline.insights.map((insight) => (
                  <article key={insight.insightId}>
                    <strong>{insight.severity === "WARNING" ? "⚠" : "💡"} {insight.type.replaceAll("_", " ")}</strong>
                    <p>{insight.message || "Review the linked project evidence."}</p>
                    <a href={`/studio?projectId=${encodeURIComponent(projectId)}&view=insights&insightId=${encodeURIComponent(insight.insightId)}&action=draft`}>
                      Create Draft Suggestion
                    </a>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </section>
  );
}
