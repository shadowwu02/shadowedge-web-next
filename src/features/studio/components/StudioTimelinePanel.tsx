"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { STUDIO_RENDER_ENABLED } from "@/config/studioFeatures";
import { useStudioStore } from "@/features/studio/store/studioStore";
import type {
  StudioAudioTimelineClip,
  StudioSubtitleTimelineClip,
  StudioTimeline,
  StudioTimelineClipSource,
  StudioVideoTimelineClip,
} from "@/features/studio/types/studioTypes";
import {
  createStudioRender,
  getStudioRender,
  type StudioRenderJob,
} from "@/lib/studio-render-api";

const MAX_RENDER_CLIPS = 20;
const MAX_RENDER_DURATION_SECONDS = 300;
const MAX_RENDER_CLIP_DURATION_SECONDS = 60;

type TimelineSelection =
  | { trackId: string; type: "video"; clip: StudioVideoTimelineClip }
  | { trackId: string; type: "audio"; clip: StudioAudioTimelineClip }
  | { trackId: string; type: "subtitle"; clip: StudioSubtitleTimelineClip };

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

function findTimelineSelection(
  timeline: StudioTimeline,
  clipId: string | null,
): TimelineSelection | null {
  if (!clipId) return null;
  for (const track of timeline.tracks) {
    if (track.type === "video") {
      const clip = track.clips.find((item) => item.id === clipId);
      if (clip) return { trackId: track.id, type: "video", clip };
    } else if (track.type === "audio") {
      const clip = track.clips.find((item) => item.id === clipId);
      if (clip) return { trackId: track.id, type: "audio", clip };
    } else {
      const clip = track.clips.find((item) => item.id === clipId);
      if (clip) return { trackId: track.id, type: "subtitle", clip };
    }
  }
  return null;
}

function TimingFields({ selection }: { selection: TimelineSelection }) {
  const updateTimelineClip = useStudioStore((state) => state.updateTimelineClip);
  return (
    <div className="studio-clip-inspector-fields">
      <label>
        <span>Start</span>
        <div>
          <input
            aria-label="Clip start in seconds"
            min="0"
            onChange={(event) =>
              updateTimelineClip(selection.trackId, selection.clip.id, {
                start: event.currentTarget.valueAsNumber,
              })
            }
            step="0.1"
            type="number"
            value={selection.clip.start}
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
              updateTimelineClip(selection.trackId, selection.clip.id, {
                duration: event.currentTarget.valueAsNumber,
              })
            }
            step="0.1"
            type="number"
            value={selection.clip.duration}
          />
          <span>s</span>
        </div>
      </label>
    </div>
  );
}

function TimelineClipInspector({ selection }: { selection: TimelineSelection | null }) {
  const deleteTimelineClip = useStudioStore((state) => state.deleteTimelineClip);
  const duplicateTimelineClip = useStudioStore(
    (state) => state.duplicateTimelineClip,
  );
  const updateTimelineClip = useStudioStore((state) => state.updateTimelineClip);

  if (!selection) {
    return (
      <aside className="studio-clip-inspector studio-clip-inspector-empty">
        <p>Clip Inspector</p>
        <strong>Select a clip</strong>
        <span>Edit video timing, audio volume, or subtitle text and placement.</span>
      </aside>
    );
  }

  if (selection.type === "audio") {
    const { clip, trackId } = selection;
    return (
      <aside className="studio-clip-inspector" aria-label="Audio clip inspector">
        <div className="studio-clip-inspector-heading">
          <div>
            <p>Audio Inspector</p>
            <h3>{clip.metadata.title || "Audio clip"}</h3>
          </div>
          <span>Audio</span>
        </div>
        <dl className="studio-clip-inspector-meta">
          <div><dt>Source</dt><dd>{clip.sourceType}</dd></div>
          <div><dt>Duration</dt><dd>{clip.duration}s</dd></div>
        </dl>
        <TimingFields selection={selection} />
        <label className="studio-clip-inspector-control">
          <span>Volume</span>
          <div>
            <input
              aria-label="Audio volume"
              max="1"
              min="0"
              onChange={(event) =>
                updateTimelineClip(trackId, clip.id, {
                  volume: event.currentTarget.valueAsNumber,
                })
              }
              step="0.05"
              type="range"
              value={clip.metadata.volume ?? 1}
            />
            <strong>{Math.round((clip.metadata.volume ?? 1) * 100)}%</strong>
          </div>
        </label>
        <div className="studio-clip-inspector-actions studio-clip-inspector-actions-single">
          <button
            className="studio-clip-delete-button"
            onClick={() => deleteTimelineClip(trackId, clip.id)}
            type="button"
          >
            Delete Audio Clip
          </button>
        </div>
        <small>Audio is stored in the project but is not mixed into P1-A3 renders yet.</small>
      </aside>
    );
  }

  if (selection.type === "subtitle") {
    const { clip, trackId } = selection;
    return (
      <aside className="studio-clip-inspector" aria-label="Subtitle clip inspector">
        <div className="studio-clip-inspector-heading">
          <div>
            <p>Subtitle Inspector</p>
            <h3>{clip.text}</h3>
          </div>
          <span>Subtitle</span>
        </div>
        <label className="studio-clip-inspector-textarea">
          <span>Text</span>
          <textarea
            maxLength={2_000}
            onChange={(event) =>
              updateTimelineClip(trackId, clip.id, { text: event.currentTarget.value })
            }
            rows={4}
            value={clip.text}
          />
        </label>
        <TimingFields selection={selection} />
        <div className="studio-clip-inspector-fields">
          <label>
            <span>Font size</span>
            <div>
              <input
                aria-label="Subtitle font size"
                max="96"
                min="12"
                onChange={(event) =>
                  updateTimelineClip(trackId, clip.id, {
                    fontSize: event.currentTarget.valueAsNumber,
                  })
                }
                type="number"
                value={clip.style?.fontSize || 32}
              />
              <span>px</span>
            </div>
          </label>
          <label>
            <span>Position</span>
            <select
              aria-label="Subtitle position"
              onChange={(event) =>
                updateTimelineClip(trackId, clip.id, {
                  position: event.currentTarget.value as "top" | "center" | "bottom",
                })
              }
              value={clip.style?.position || "bottom"}
            >
              <option value="top">Top</option>
              <option value="center">Center</option>
              <option value="bottom">Bottom</option>
            </select>
          </label>
        </div>
        <div className="studio-clip-inspector-actions studio-clip-inspector-actions-single">
          <button
            className="studio-clip-delete-button"
            onClick={() => deleteTimelineClip(trackId, clip.id)}
            type="button"
          >
            Delete Subtitle
          </button>
        </div>
      </aside>
    );
  }

  const { clip, trackId } = selection;
  return (
    <aside className="studio-clip-inspector" aria-label="Video clip inspector">
      <div className="studio-clip-inspector-heading">
        <div>
          <p>Video Inspector</p>
          <h3>{clip.metadata?.title || "Timeline Clip"}</h3>
        </div>
        <span>{clip.url ? "Media" : "Placeholder"}</span>
      </div>
      <dl className="studio-clip-inspector-meta">
        <div><dt>Source</dt><dd>{clipLabel(clip.sourceType)}</dd></div>
        <div><dt>Status</dt><dd>{clip.metadata?.status || (clip.url ? "ready" : "placeholder")}</dd></div>
        {clip.metadata?.model ? <div><dt>Model</dt><dd>{clip.metadata.model}</dd></div> : null}
      </dl>
      <TimingFields selection={selection} />
      <p className="studio-clip-inspector-note">
        Reordering normalizes video clips into a continuous sequence starting at 0s.
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

function SubtitleComposer({ defaultStart }: { defaultStart: number }) {
  const addSubtitleTimelineClip = useStudioStore(
    (state) => state.addSubtitleTimelineClip,
  );
  const [text, setText] = useState("");
  const [start, setStart] = useState(defaultStart);
  const [duration, setDuration] = useState(3);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!text.trim()) return;
    addSubtitleTimelineClip({ text, start, duration });
    setText("");
    setStart(Math.round((start + duration) * 1000) / 1000);
  };

  return (
    <form className="studio-subtitle-composer" onSubmit={submit}>
      <input
        aria-label="Subtitle text"
        maxLength={2_000}
        onChange={(event) => setText(event.currentTarget.value)}
        placeholder="Add subtitle text"
        value={text}
      />
      <input
        aria-label="Subtitle start in seconds"
        min="0"
        onChange={(event) => setStart(event.currentTarget.valueAsNumber)}
        step="0.1"
        type="number"
        value={start}
      />
      <input
        aria-label="Subtitle duration in seconds"
        min="0.1"
        onChange={(event) => setDuration(event.currentTarget.valueAsNumber)}
        step="0.1"
        type="number"
        value={duration}
      />
      <button disabled={!text.trim()} type="submit">Add Subtitle</button>
    </form>
  );
}

export function StudioTimelinePanel() {
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null);
  const [renderJob, setRenderJob] = useState<StudioRenderJob | null>(null);
  const [renderError, setRenderError] = useState("");
  const timeline = useStudioStore((state) => state.timeline);
  const projectId = useStudioStore((state) => state.projectId);
  const addRenderedAssetNode = useStudioStore((state) => state.addRenderedAssetNode);
  const selectedTimelineClipId = useStudioStore((state) => state.selectedTimelineClipId);
  const moveTimelineClip = useStudioStore((state) => state.moveTimelineClip);
  const reorderTimelineClip = useStudioStore((state) => state.reorderTimelineClip);
  const selectTimelineClip = useStudioStore((state) => state.selectTimelineClip);

  const videoTrack = timeline.tracks.find((track) => track.type === "video");
  const audioTrack = timeline.tracks.find((track) => track.type === "audio");
  const subtitleTrack = timeline.tracks.find((track) => track.type === "subtitle");
  const videoClips = videoTrack?.type === "video" ? videoTrack.clips : [];
  const audioClips = audioTrack?.type === "audio" ? audioTrack.clips : [];
  const subtitleClips = subtitleTrack?.type === "subtitle" ? subtitleTrack.clips : [];
  const selection = findTimelineSelection(timeline, selectedTimelineClipId);
  const totalDuration = videoClips.reduce((total, clip) => total + clip.duration, 0);
  const maxEnd = [...videoClips, ...audioClips, ...subtitleClips].reduce(
    (maximum, clip) => Math.max(maximum, clip.start + clip.duration),
    0,
  );
  const rulerEnd = Math.max(10, Math.ceil(maxEnd / 5) * 5);
  const rulerMarkers = Array.from({ length: rulerEnd / 5 + 1 }, (_, index) => index * 5);
  const rulerStyle = {
    "--studio-ruler-width": `${Math.max(600, rulerEnd * 20)}px`,
  } as CSSProperties;
  const renderIsActive = renderJob?.status === "queued" || renderJob?.status === "processing";
  const missingMedia = videoClips.some((clip) => !clip.url.trim());
  const oversizedClip = videoClips.some((clip) => clip.duration > MAX_RENDER_CLIP_DURATION_SECONDS);
  const renderBlockedReason = !STUDIO_RENDER_ENABLED
    ? "Studio rendering is not enabled in this environment."
    : !projectId
      ? "Create or save the Studio project before rendering."
      : !videoClips.length
        ? "Add at least one completed video clip before rendering."
        : missingMedia
          ? "Replace every Shot placeholder with a completed video before rendering."
          : videoClips.length > MAX_RENDER_CLIPS
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
        setRenderError(error instanceof Error ? error.message : "Could not refresh render status.");
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
    addRenderedAssetNode({ jobId: renderJob.jobId, url: renderJob.outputUrl });
  }, [addRenderedAssetNode, renderJob?.jobId, renderJob?.outputUrl, renderJob?.status]);

  const startRender = async () => {
    if (renderBlockedReason || renderIsActive || !projectId) return;
    setRenderError("");
    try {
      setRenderJob(await createStudioRender(projectId, timeline));
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : "Could not start Studio render.");
    }
  };

  return (
    <section className="studio-timeline-panel" aria-label="Studio media timeline">
      <header className="studio-timeline-heading">
        <div>
          <p>Timeline</p>
          <h2>Media assembly</h2>
        </div>
        <div className="studio-timeline-render-controls">
          <span>{videoClips.length} video · {audioClips.length} audio · {subtitleClips.length} subtitles</span>
          <button
            disabled={Boolean(renderBlockedReason) || renderIsActive}
            onClick={() => void startRender()}
            title={renderBlockedReason || "Render video clips into one MP4"}
            type="button"
          >
            {renderIsActive
              ? renderJob?.status === "queued" ? "Queued" : "Rendering…"
              : renderJob?.status === "completed" ? "Render again" : "Render"}
          </button>
          {renderJob?.status === "completed" && renderJob.outputUrl ? (
            <a href={renderJob.outputUrl} rel="noreferrer" target="_blank">Open Video</a>
          ) : null}
          {renderJob?.status === "failed" || renderError ? (
            <small className="studio-timeline-render-error">
              {renderError || renderJob?.error || "Render failed."}
            </small>
          ) : renderJob?.status === "completed" ? (
            <small>Completed · added as a Rendered Asset</small>
          ) : renderIsActive ? (
            <small>{renderJob?.status === "queued" ? "Waiting for worker" : "FFmpeg is assembling video clips"}</small>
          ) : renderBlockedReason ? <small>{renderBlockedReason}</small> : null}
        </div>
      </header>

      <div className="studio-timeline-editor-body">
        <div className="studio-timeline-sequence">
          <div className="studio-timeline-ruler-row">
            <div className="studio-timeline-ruler-label">Time</div>
            <div className="studio-timeline-ruler-scroll">
              <div className="studio-timeline-ruler" style={rulerStyle}>
                {rulerMarkers.map((marker) => <span key={marker}>{marker}s</span>)}
              </div>
            </div>
          </div>

          <div className="studio-timeline-track-row">
            <div className="studio-timeline-track-label"><strong>V1</strong><span>Video Track</span></div>
            <div aria-label="Video timeline clips" className="studio-timeline-track" role="listbox">
              {videoClips.length ? videoClips.map((clip, index) => {
                const clipStyle = {
                  "--studio-clip-width": `${Math.min(260, Math.max(150, clip.duration * 20))}px`,
                } as CSSProperties;
                const selected = clip.id === selectedTimelineClipId;
                return (
                  <article
                    aria-selected={selected}
                    className={["studio-timeline-clip", clip.url ? "" : "studio-timeline-clip-placeholder", selected ? "studio-timeline-clip-selected" : "", draggedClipId === clip.id ? "studio-timeline-clip-dragging" : ""].filter(Boolean).join(" ")}
                    draggable
                    key={clip.id}
                    onClick={() => selectTimelineClip(clip.id)}
                    onDragEnd={() => setDraggedClipId(null)}
                    onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
                    onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", clip.id); setDraggedClipId(clip.id); selectTimelineClip(clip.id); }}
                    onDrop={(event) => { event.preventDefault(); const sourceId = draggedClipId || event.dataTransfer.getData("text/plain"); if (sourceId && videoTrack) reorderTimelineClip(videoTrack.id, sourceId, clip.id); setDraggedClipId(null); }}
                    onKeyDown={(event) => selectClipFromKeyboard(event, () => selectTimelineClip(clip.id))}
                    role="option"
                    style={clipStyle}
                    tabIndex={0}
                  >
                    <div className="studio-timeline-clip-preview">
                      {clip.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" src={clip.thumbnail} />
                      ) : <span aria-hidden="true">{clip.url ? "▶" : "◇"}</span>}
                    </div>
                    <div className="studio-timeline-clip-copy">
                      <strong>{clip.metadata?.title || `Clip ${index + 1}`}</strong>
                      <span>{clipLabel(clip.sourceType)}</span>
                      <small>{clip.start}s – {clip.start + clip.duration}s · {clip.duration}s</small>
                    </div>
                    <div className="studio-timeline-clip-actions" aria-label={`Reorder clip ${index + 1}`}>
                      <button aria-label={`Move clip ${index + 1} earlier`} disabled={index === 0} onClick={(event) => { event.stopPropagation(); if (videoTrack) moveTimelineClip(videoTrack.id, clip.id, "earlier"); }} type="button">←</button>
                      <button aria-label={`Move clip ${index + 1} later`} disabled={index === videoClips.length - 1} onClick={(event) => { event.stopPropagation(); if (videoTrack) moveTimelineClip(videoTrack.id, clip.id, "later"); }} type="button">→</button>
                    </div>
                  </article>
                );
              }) : (
                <div className="studio-timeline-empty"><strong>No video clips</strong><span>Add a completed video, video asset, or Remake shot.</span></div>
              )}
            </div>
          </div>

          <div className="studio-timeline-track-row studio-timeline-track-row-compact">
            <div className="studio-timeline-track-label"><strong>A1</strong><span>Audio Track</span></div>
            <div aria-label="Audio timeline clips" className="studio-timeline-track" role="listbox">
              {audioClips.length ? audioClips.map((clip) => (
                <article
                  aria-selected={clip.id === selectedTimelineClipId}
                  className={["studio-timeline-clip", "studio-timeline-audio-clip", clip.id === selectedTimelineClipId ? "studio-timeline-clip-selected" : ""].filter(Boolean).join(" ")}
                  key={clip.id}
                  onClick={() => selectTimelineClip(clip.id)}
                  onKeyDown={(event) => selectClipFromKeyboard(event, () => selectTimelineClip(clip.id))}
                  role="option"
                  style={{ "--studio-clip-width": `${Math.min(260, Math.max(150, clip.duration * 20))}px` } as CSSProperties}
                  tabIndex={0}
                >
                  <div className="studio-timeline-clip-preview"><span aria-hidden="true">♪</span></div>
                  <div className="studio-timeline-clip-copy">
                    <strong>{clip.metadata.title || "Audio clip"}</strong>
                    <span>{clip.sourceType} · {Math.round((clip.metadata.volume ?? 1) * 100)}%</span>
                    <small>{clip.start}s – {clip.start + clip.duration}s</small>
                  </div>
                </article>
              )) : (
                <div className="studio-timeline-empty"><strong>No audio clips</strong><span>Add an uploaded or historical Audio Asset Node.</span></div>
              )}
            </div>
          </div>

          <div className="studio-timeline-track-row studio-timeline-track-row-compact">
            <div className="studio-timeline-track-label"><strong>CC1</strong><span>Subtitle Track</span></div>
            <div aria-label="Subtitle timeline clips" className="studio-timeline-track studio-subtitle-track">
              <SubtitleComposer defaultStart={Math.round(maxEnd * 1000) / 1000} />
              {subtitleClips.map((clip) => (
                <article
                  aria-selected={clip.id === selectedTimelineClipId}
                  className={["studio-timeline-clip", "studio-timeline-subtitle-clip", clip.id === selectedTimelineClipId ? "studio-timeline-clip-selected" : ""].filter(Boolean).join(" ")}
                  key={clip.id}
                  onClick={() => selectTimelineClip(clip.id)}
                  onKeyDown={(event) => selectClipFromKeyboard(event, () => selectTimelineClip(clip.id))}
                  role="option"
                  style={{ "--studio-clip-width": `${Math.min(280, Math.max(170, clip.duration * 28))}px` } as CSSProperties}
                  tabIndex={0}
                >
                  <div className="studio-timeline-clip-preview"><span aria-hidden="true">CC</span></div>
                  <div className="studio-timeline-clip-copy">
                    <strong>{clip.text}</strong>
                    <span>{clip.style?.position || "bottom"} · {clip.style?.fontSize || 32}px</span>
                    <small>{clip.start}s – {clip.start + clip.duration}s</small>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <TimelineClipInspector selection={selection} />
      </div>
      <p className="studio-timeline-note">
        Audio and subtitles are saved for future mixing and burn-in · current FFmpeg render remains video-only.
      </p>
    </section>
  );
}
