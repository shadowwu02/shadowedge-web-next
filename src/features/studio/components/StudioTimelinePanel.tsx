"use client";

import type { CSSProperties } from "react";
import { useStudioStore } from "@/features/studio/store/studioStore";

const VIDEO_TRACK_ID = "track-video-1";

function clipLabel(sourceType: "video_node" | "shot_node" | "asset") {
  if (sourceType === "shot_node") return "Shot placeholder";
  if (sourceType === "asset") return "Video asset";
  return "Generated video";
}

export function StudioTimelinePanel() {
  const timeline = useStudioStore((state) => state.timeline);
  const moveTimelineClip = useStudioStore((state) => state.moveTimelineClip);
  const videoTrack = timeline.tracks.find((track) => track.type === "video");
  const clips = videoTrack?.clips || [];
  const totalDuration = clips.reduce((total, clip) => total + clip.duration, 0);

  return (
    <section className="studio-timeline-panel" aria-label="Studio video timeline">
      <header className="studio-timeline-heading">
        <div>
          <p>Timeline</p>
          <h2>Video assembly</h2>
        </div>
        <span>
          {clips.length} {clips.length === 1 ? "clip" : "clips"} · {totalDuration}s
        </span>
      </header>

      <div className="studio-timeline-track-row">
        <div className="studio-timeline-track-label">
          <strong>V1</strong>
          <span>Video Track</span>
        </div>
        <div className="studio-timeline-track" role="list">
          {clips.length ? (
            clips.map((clip, index) => {
              const clipStyle = {
                "--studio-clip-width": `${Math.min(260, Math.max(150, clip.duration * 20))}px`,
              } as CSSProperties;
              return (
                <article
                  className={`studio-timeline-clip${clip.url ? "" : " studio-timeline-clip-placeholder"}`}
                  key={clip.id}
                  role="listitem"
                  style={clipStyle}
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
                    <strong>Clip {index + 1}</strong>
                    <span>{clipLabel(clip.sourceType)}</span>
                    <small>
                      {clip.start}s – {clip.start + clip.duration}s · {clip.duration}s
                    </small>
                  </div>
                  <div className="studio-timeline-clip-actions" aria-label={`Reorder clip ${index + 1}`}>
                    <button
                      aria-label={`Move clip ${index + 1} earlier`}
                      disabled={index === 0}
                      onClick={() =>
                        moveTimelineClip(videoTrack?.id || VIDEO_TRACK_ID, clip.id, "earlier")
                      }
                      type="button"
                    >
                      ←
                    </button>
                    <button
                      aria-label={`Move clip ${index + 1} later`}
                      disabled={index === clips.length - 1}
                      onClick={() =>
                        moveTimelineClip(videoTrack?.id || VIDEO_TRACK_ID, clip.id, "later")
                      }
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
              <span>Add a completed video, video asset, or Remake shot from the Canvas.</span>
            </div>
          )}
        </div>
      </div>
      <p className="studio-timeline-note">
        Sequence planning only · trimming, audio, transitions, rendering, and export are not enabled.
      </p>
    </section>
  );
}
