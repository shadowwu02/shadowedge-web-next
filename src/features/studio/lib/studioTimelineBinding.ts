import type {
  StudioTimeline,
  StudioVideoTimelineClip,
  StudioVideoTimelineTrack,
} from "@/features/studio/types/studioTypes";

export const TIMELINE_BIND_FAILED = "TIMELINE_BIND_FAILED";

type CompletedVideoTimelineInput = {
  timeline: StudioTimeline;
  sourceNodeId: string;
  url: string;
  thumbnail?: string;
  duration: number;
  title?: string;
  model?: string;
  createdAt?: string;
};

type CompletedVideoTimelineOptions = {
  createClipId?: () => string;
};

export type CompletedVideoTimelineBindingResult = {
  timeline: StudioTimeline;
  changed: boolean;
  bound: boolean;
  existing: boolean;
  clipId: string;
  errorCode: "" | typeof TIMELINE_BIND_FAILED;
};

function cleanDuration(value: unknown) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0
    ? Math.round(duration * 1000) / 1000
    : 4;
}

function safeIdPart(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "video";
}

function unchanged(
  input: CompletedVideoTimelineInput,
  errorCode: "" | typeof TIMELINE_BIND_FAILED = "",
): CompletedVideoTimelineBindingResult {
  return {
    timeline: input.timeline,
    changed: false,
    bound: false,
    existing: false,
    clipId: "",
    errorCode,
  };
}

export function bindCompletedVideoResultToTimeline(
  input: CompletedVideoTimelineInput,
  options: CompletedVideoTimelineOptions = {},
): CompletedVideoTimelineBindingResult {
  const sourceNodeId = input.sourceNodeId.trim();
  const url = input.url.trim();
  if (!sourceNodeId || !url || !Array.isArray(input.timeline?.tracks)) {
    return unchanged(input, TIMELINE_BIND_FAILED);
  }

  try {
    const duration = cleanDuration(input.duration);
    const thumbnail = String(input.thumbnail || url);
    const createdAt = String(input.createdAt || new Date().toISOString());
    const videoTrack = input.timeline.tracks.find(
      (track): track is StudioVideoTimelineTrack => track.type === "video",
    );
    const existingClip = videoTrack?.clips.find(
      (clip) => clip.sourceNodeId === sourceNodeId,
    );

    if (videoTrack && existingClip) {
      const nextClip: StudioVideoTimelineClip = {
        ...existingClip,
        url,
        thumbnail,
        duration,
        metadata: {
          ...existingClip.metadata,
          title: input.title || existingClip.metadata?.title,
          model: input.model || existingClip.metadata?.model,
          status: "completed",
        },
      };
      const changed =
        existingClip.url !== nextClip.url ||
        existingClip.thumbnail !== nextClip.thumbnail ||
        existingClip.duration !== nextClip.duration ||
        existingClip.metadata?.title !== nextClip.metadata?.title ||
        existingClip.metadata?.model !== nextClip.metadata?.model ||
        existingClip.metadata?.status !== "completed";
      const tracks = changed
        ? input.timeline.tracks.map((track) =>
            track.type === "video" && track.id === videoTrack.id
              ? {
                  ...track,
                  clips: track.clips.map((clip) =>
                    clip.id === existingClip.id ? nextClip : clip,
                  ),
                }
              : track,
          )
        : input.timeline.tracks;

      return {
        timeline: changed ? { tracks } : input.timeline,
        changed,
        bound: true,
        existing: true,
        clipId: existingClip.id,
        errorCode: "",
      };
    }

    const currentClips = videoTrack?.clips || [];
    const start = currentClips.reduce(
      (maximum, clip) => Math.max(maximum, clip.start + clip.duration),
      0,
    );
    const clipId = options.createClipId
      ? options.createClipId()
      : `timeline-clip-${safeIdPart(sourceNodeId)}-${Date.now()}`;
    if (!String(clipId || "").trim()) {
      throw new Error("Timeline clip id is required.");
    }
    const clip: StudioVideoTimelineClip = {
      id: clipId,
      sourceNodeId,
      sourceType: "video_node",
      url,
      thumbnail,
      start,
      duration,
      createdAt,
      metadata: {
        title: input.title || "Generated video",
        model: input.model || "",
        status: "completed",
      },
    };
    const nextTrack: StudioVideoTimelineTrack = {
      id: videoTrack?.id || "track-video-1",
      type: "video",
      clips: [...currentClips, clip],
    };
    const tracks = videoTrack
      ? input.timeline.tracks.map((track) =>
          track.type === "video" && track.id === videoTrack.id ? nextTrack : track,
        )
      : [nextTrack, ...input.timeline.tracks];

    return {
      timeline: { tracks },
      changed: true,
      bound: true,
      existing: false,
      clipId,
      errorCode: "",
    };
  } catch {
    return unchanged(input, TIMELINE_BIND_FAILED);
  }
}
