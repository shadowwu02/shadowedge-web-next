"use client";

import { useEffect, useState, type CSSProperties, type KeyboardEvent } from "react";
import { STUDIO_RENDER_ENABLED } from "@/config/studioFeatures";
import { useStudioStore } from "@/features/studio/store/studioStore";
import type {
  StudioTimelineClip,
  StudioTimelineClipSource,
} from "@/features/studio/types/studioTypes";
import {
  createStudioRender,
  getStudioRender,
  type StudioRenderJob,
} from "@/lib/studio-render-api";

const VIDEO_TRACK_ID = "track-video-1";
const MAX_RENDER_CLIPS = 20;
const MAX_RENDER_DURATION_SECONDS = 300;
const MAX_RENDER_CLIP_DURATION_SECONDS = 60;

function clipLabel(sourceType: StudioTimelineClipSource) {
  if (sourceType === "shot_node") return "Shot placeholder";
  if (sourceType === "asset") return "Video asset";
  return "Generated video";
}

function selectClipFromKeyboard(
  event: KeyboardEvent<HTMLElement>,
  select: () => void,
) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  select();
}

function TimelineClipInspector({
  clip,
  trackId,
}: {
  clip: StudioTimelineClip | null;
  trackId: string;
}) {
  const deleteTimelineClip = useStudioStore((state) => state.deleteTimelineClip);
  const duplicateTimelineClip = useStudioStore(
    (state) => state.duplicateTimelineClip,
  );
  const updateTimelineClip = useStudioStore((state) => state.updateTimelineClip);

  if (!clip) {
    return (
      <aside className="studio-clip-inspector studio-clip-inspector-empty">
        <p>Clip Inspector</p>
        <strong>Select a clip</strong>
        <span>Choose a Timeline clip to edit its timing or manage the clip.</span>
      </aside>
    );
  }

  return (
    <aside className="studio-clip-inspector" aria-label="Selected clip inspector">
      <div className="studio-clip-inspector-heading">
        <div>
          <p>Clip Inspector</p>
          <h3>{clip.metadata?.title || "Timeline Clip"}</h3>
        </div>
        <span>{clip.url ? "Media" : "Placeholder"}</span>
      </div>

      <dl className="studio-clip-inspector-meta">
        <div>
          <dt>Source</dt>
          <dd>{clipLabel(clip.sourceType)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{clip.metadata?.status || (clip.url ? "ready" : "placeholder")}</dd>
        </div>
        {clip.metadata?.model ? (
          <div>
            <dt>Model</dt>
            <dd>{clip.metadata.model}</dd>
          </div>
        ) : null}
      </dl>

      <div className="studio-clip-inspector-fields">
        <label>
          <span>Start</span>
          <div>
            <input
              aria-label="Clip start in seconds"
              min="0"
              onChange={(event) =>
                updateTimelineClip(trackId, clip.id, {
                  start: event.currentTarget.valueAsNumber,
                })
              }
              step="0.1"
              type="number"
              value={clip.start}
            />
            <span>s</span>
          </div>
        </label>
        <label>
          <span>Duration</span>
          <div>
            <input
              aria-label="Clip duration in seconds"
              min="0.1"
              onChange={(event) =>
                updateTimelineClip(trackId, clip.id, {
                  duration: event.currentTarget.valueAsNumber,
                })
              }
              step="0.1"
              type="number"
              value={clip.duration}
            />
            <span>s</span>
          </div>
        </label>
      </div>

      <p className="studio-clip-inspector-note">
        Reordering normalizes clips into a continuous sequence starting at 0s.
      </p>
      <div className="studio-clip-inspector-actions">
        <button onClick={() => duplicateTimelineClip(trackId, clip.id)} type="button">
          Duplicate
        </button>
        <button
          className="studio-clip-delete-button"
          onClick={() => deleteTimelineClip(trackId, clip.id)}
          type="button"
        >
          Delete Clip
        </button>
      </div>
      <small>Source nodes, assets, and generated results are never deleted here.</small>
    </aside>
  );
}

export function StudioTimelinePanel() {
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null);
  const [renderJob, setRenderJob] = useState<StudioRenderJob | null>(null);
  const [renderError, setRenderError] = useState("");
  const timeline = useStudioStore((state) => state.timeline);
  const projectId = useStudioStore((state) => state.projectId);
  const addRenderedAssetNode = useStudioStore(
    (state) => state.addRenderedAssetNode,
  );
  const selectedTimelineClipId = useStudioStore(
    (state) => state.selectedTimelineClipId,
  );
  const moveTimelineClip = useStudioStore((state) => state.moveTimelineClip);
  const reorderTimelineClip = useStudioStore(
    (state) => state.reorderTimelineClip,
  );
  const selectTimelineClip = useStudioStore((state) => state.selectTimelineClip);
  const videoTrack = timeline.tracks.find((track) => track.type === "video");
  const trackId = videoTrack?.id || VIDEO_TRACK_ID;
  const clips = videoTrack?.clips || [];
  const selectedClip =
    clips.find((clip) => clip.id === selectedTimelineClipId) || null;
  const totalDuration = clips.reduce((total, clip) => total + clip.duration, 0);
  const maxEnd = clips.reduce(
    (maximum, clip) => Math.max(maximum, clip.start + clip.duration),
    0,
  );
  const rulerEnd = Math.max(10, Math.ceil(maxEnd / 5) * 5);
  const rulerMarkers = Array.from(
    { length: rulerEnd / 5 + 1 },
    (_, index) => index * 5,
  );
  const rulerStyle = {
    "--studio-ruler-width": `${Math.max(600, rulerEnd * 20)}px`,
  } as CSSProperties;
  const renderIsActive =
    renderJob?.status === "queued" || renderJob?.status === "processing";
  const missingMedia = clips.some((clip) => !clip.url.trim());
  const oversizedClip = clips.some(
    (clip) => clip.duration > MAX_RENDER_CLIP_DURATION_SECONDS,
  );
  const renderBlockedReason = !STUDIO_RENDER_ENABLED
    ? "Studio rendering is not enabled in this environment."
    : !projectId
      ? "Create or save the Studio project before rendering."
      : !clips.length
        ? "Add at least one completed video clip before rendering."
        : missingMedia
          ? "Replace every Shot placeholder with a completed video before rendering."
          : clips.length > MAX_RENDER_CLIPS
            ? `Render supports at most ${MAX_RENDER_CLIPS} clips.`
            : oversizedClip
              ? `Each clip must be ${MAX_RENDER_CLIP_DURATION_SECONDS} seconds or shorter.`
              : totalDuration > MAX_RENDER_DURATION_SECONDS
                ? `Render supports at most ${MAX_RENDER_DURATION_SECONDS} seconds.`
                : "";

  useEffect(() => {
    const jobId = renderJob?.jobId;
    if (!jobId || !renderIsActive) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const poll = async () => {
      try {
        const nextJob = await getStudioRender(jobId);
        if (cancelled) return;
        setRenderJob(nextJob);
        setRenderError("");
        if (nextJob.status === "queued" || nextJob.status === "processing") {
          timer = setTimeout(poll, 2_000);
        }
      } catch (error) {
        if (cancelled) return;
        setRenderError(
          error instanceof Error ? error.message : "Could not refresh render status.",
        );
        timer = setTimeout(poll, 4_000);
      }
    };

    timer = setTimeout(poll, 1_000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [renderIsActive, renderJob?.jobId]);

  useEffect(() => {
    if (renderJob?.status !== "completed" || !renderJob.outputUrl) return;
    addRenderedAssetNode({
      jobId: renderJob.jobId,
      url: renderJob.outputUrl,
    });
  }, [addRenderedAssetNode, renderJob?.jobId, renderJob?.outputUrl, renderJob?.status]);

  const startRender = async () => {
    if (renderBlockedReason || renderIsActive || !projectId) return;
    setRenderError("");
    try {
      setRenderJob(await createStudioRender(projectId, timeline));
    } catch (error) {
      setRenderError(
        error instanceof Error ? error.message : "Could not start Studio render.",
      );
    }
  };

  return (
    <section className="studio-timeline-panel" aria-label="Studio video timeline">
      <header className="studio-timeline-heading">
        <div>
          <p>Timeline</p>
          <h2>Video assembly</h2>
        </div>
        <div className="studio-timeline-render-controls">
          <span>
            {clips.length} {clips.length === 1 ? "clip" : "clips"} · {totalDuration}s
          </span>
          <button
            disabled={Boolean(renderBlockedReason) || renderIsActive}
            onClick={() => void startRender()}
            title={renderBlockedReason || "Render Timeline clips into one MP4"}
            type="button"
          >
            {renderIsActive
              ? renderJob?.status === "queued"
                ? "Queued"
                : "Rendering…"
              : renderJob?.status === "completed"
                ? "Render again"
                : "Render"}
          </button>
          {renderJob?.status === "completed" && renderJob.outputUrl ? (
            <a href={renderJob.outputUrl} rel="noreferrer" target="_blank">
              Open Video
            </a>
          ) : null}
          {renderJob?.status === "failed" || renderError ? (
            <small className="studio-timeline-render-error">
              {renderError || renderJob?.error || "Render failed."}
            </small>
          ) : renderJob?.status === "completed" ? (
            <small>Completed · added as a Rendered Asset</small>
          ) : renderIsActive ? (
            <small>
              {renderJob?.status === "queued"
                ? "Waiting for worker"
                : "FFmpeg is assembling clips"}
            </small>
          ) : renderBlockedReason ? (
            <small>{renderBlockedReason}</small>
          ) : null}
        </div>
      </header>

      <div className="studio-timeline-editor-body">
        <div className="studio-timeline-sequence">
          <div className="studio-timeline-ruler-row">
            <div className="studio-timeline-ruler-label">Time</div>
            <div className="studio-timeline-ruler-scroll">
              <div className="studio-timeline-ruler" style={rulerStyle}>
                {rulerMarkers.map((marker) => (
                  <span key={marker}>{marker}s</span>
                ))}
              </div>
            </div>
          </div>

          <div className="studio-timeline-track-row">
            <div className="studio-timeline-track-label">
              <strong>V1</strong>
              <span>Video Track</span>
            </div>
            <div
              aria-label="Timeline clips"
              className="studio-timeline-track"
              role="listbox"
            >
              {clips.length ? (
                clips.map((clip, index) => {
                  const clipStyle = {
                    "--studio-clip-width": `${Math.min(260, Math.max(150, clip.duration * 20))}px`,
                  } as CSSProperties;
                  const selected = clip.id === selectedTimelineClipId;
                  return (
                    <article
                      aria-selected={selected}
                      className={[
                        "studio-timeline-clip",
                        clip.url ? "" : "studio-timeline-clip-placeholder",
                        selected ? "studio-timeline-clip-selected" : "",
                        draggedClipId === clip.id ? "studio-timeline-clip-dragging" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      draggable
                      key={clip.id}
                      onClick={() => selectTimelineClip(clip.id)}
                      onDragEnd={() => setDraggedClipId(null)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                      }}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", clip.id);
                        setDraggedClipId(clip.id);
                        selectTimelineClip(clip.id);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const sourceId =
                          draggedClipId || event.dataTransfer.getData("text/plain");
                        if (sourceId) reorderTimelineClip(trackId, sourceId, clip.id);
                        setDraggedClipId(null);
                      }}
                      onKeyDown={(event) =>
                        selectClipFromKeyboard(event, () => selectTimelineClip(clip.id))
                      }
                      role="option"
                      style={clipStyle}
                      tabIndex={0}
                    >
                      <div className="studio-timeline-clip-preview">
                        {clip.thumbnail ? (
                          // Timeline thumbnails can be signed URLs from existing project media.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt="" src={clip.thumbnail} />
                        ) : (
                          <span aria-hidden="true">{clip.url ? "▶" : "◇"}</span>
                        )}
                      </div>
                      <div className="studio-timeline-clip-copy">
                        <strong>{clip.metadata?.title || `Clip ${index + 1}`}</strong>
                        <span>{clipLabel(clip.sourceType)}</span>
                        <small>
                          {clip.start}s – {clip.start + clip.duration}s · {clip.duration}s
                        </small>
                      </div>
                      <div
                        className="studio-timeline-clip-actions"
                        aria-label={`Reorder clip ${index + 1}`}
                      >
                        <button
                          aria-label={`Move clip ${index + 1} earlier`}
                          disabled={index === 0}
                          onClick={(event) => {
                            event.stopPropagation();
                            moveTimelineClip(trackId, clip.id, "earlier");
                          }}
                          type="button"
                        >
                          ←
                        </button>
                        <button
                          aria-label={`Move clip ${index + 1} later`}
                          disabled={index === clips.length - 1}
                          onClick={(event) => {
                            event.stopPropagation();
                            moveTimelineClip(trackId, clip.id, "later");
                          }}
                          type="button"
                        >
                          →
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="studio-timeline-empty">
                  <strong>No clips yet</strong>
                  <span>
                    Add a completed video, video asset, or Remake shot from the Canvas.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <TimelineClipInspector clip={selectedClip} trackId={trackId} />
      </div>
      <p className="studio-timeline-note">
        Sequential video render only · audio tracks, subtitles, transitions, and effects are not enabled.
      </p>
    </section>
  );
}
