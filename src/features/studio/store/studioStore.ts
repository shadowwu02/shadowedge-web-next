"use client";

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type Viewport,
} from "@xyflow/react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { activeBrand, type BrandId } from "@/config/brand";
import { STUDIO_GENERATION_ORCHESTRATOR_ENABLED } from "@/config/studioFeatures";
import {
  listStudioRunHistory,
  saveStudioRunRecord,
} from "@/features/studio/lib/studioRunHistory";
import {
  listStudioGenerationPlans,
  saveStudioGenerationPlan,
} from "@/features/studio/lib/studioGenerationPlans";
import { getStudioExecutor } from "@/features/studio/runtime/executorRegistry";
import {
  buildStudioGenerationPlan,
  MAX_CONCURRENT_VIDEO_GENERATIONS,
  MAX_STUDIO_VIDEO_TASKS_PER_RUN,
  type StudioGenerationPlan,
} from "@/features/studio/runtime/generationQueue";
import {
  getStudioRetryPreflight,
  runSingleStudioNode,
  runStudioGraph,
} from "@/features/studio/runtime/runStudioGraph";
import type {
  NodeExecutionStatus,
  StudioRunLockState,
  StudioRunRecord,
  StudioNodeRuntimeState,
  StudioRuntimeState,
} from "@/features/studio/runtime/types";
import type {
  StudioCanvasJson,
  StudioCanvasSnapshot,
  StudioEdge,
  StudioNode,
  StudioNodeData,
  StudioNodeType,
  StudioProject,
  StudioProjectSummary,
  StudioAssetItem,
  StudioAudioTimelineClip,
  StudioAudioTimelineTrack,
  StudioTimeline,
  StudioSubtitlePosition,
  StudioSubtitleTimelineClip,
  StudioSubtitleTimelineTrack,
  StudioVideoTimelineClip,
  StudioVideoTimelineTrack,
} from "@/features/studio/types/studioTypes";

export const SHADOWEDGE_STUDIO_CANVAS_STORAGE_KEY = "shadowedge_studio_canvas_v1";

export function getStudioCanvasStorageKey(brandId: BrandId) {
  return brandId === "shadowedge"
    ? SHADOWEDGE_STUDIO_CANVAS_STORAGE_KEY
    : brandId + "_studio_canvas_v1";
}

export const STUDIO_CANVAS_STORAGE_KEY = getStudioCanvasStorageKey(activeBrand.id);

const defaultViewport: Viewport = { x: 8, y: 36, zoom: 0.82 };
const STUDIO_CANVAS_VERSION = 7;
const DEFAULT_VIDEO_TRACK_ID = "track-video-1";
const DEFAULT_AUDIO_TRACK_ID = "track-audio-1";
const DEFAULT_SUBTITLE_TRACK_ID = "track-subtitle-1";
const historyLimit = 50;
let nodeSequence = 0;

function nowIso() {
  return new Date().toISOString();
}

function createEmptyTimeline(): StudioTimeline {
  return {
    tracks: [
      { id: DEFAULT_VIDEO_TRACK_ID, type: "video", clips: [] },
      { id: DEFAULT_AUDIO_TRACK_ID, type: "audio", clips: [] },
      { id: DEFAULT_SUBTITLE_TRACK_ID, type: "subtitle", clips: [] },
    ],
  };
}

function positiveDuration(value: unknown, fallback = 4) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0
    ? Math.round(duration * 1000) / 1000
    : fallback;
}

function nonNegativeTime(value: unknown, fallback = 0) {
  const time = Number(value);
  return Number.isFinite(time) && time >= 0
    ? Math.round(time * 1000) / 1000
    : fallback;
}

function clampVolume(value: unknown, fallback = 1) {
  const volume = Number(value);
  return Number.isFinite(volume)
    ? Math.round(Math.min(1, Math.max(0, volume)) * 100) / 100
    : fallback;
}

function subtitleFontSize(value: unknown, fallback = 32) {
  const size = Number(value);
  return Number.isFinite(size)
    ? Math.round(Math.min(96, Math.max(12, size)))
    : fallback;
}

function subtitlePosition(value: unknown): StudioSubtitlePosition {
  return value === "top" || value === "center" ? value : "bottom";
}

function reflowTimelineClips(clips: StudioVideoTimelineClip[]) {
  let start = 0;
  return clips.map((clip) => {
    const duration = positiveDuration(clip.duration);
    const normalized = { ...clip, start, duration };
    start += duration;
    return normalized;
  });
}

function normalizeStudioTimeline(timeline?: StudioTimeline): StudioTimeline {
  const tracks = timeline && Array.isArray(timeline.tracks) ? timeline.tracks : [];
  const videoTrack = tracks.find((track) => track?.type === "video");
  const audioTrack = tracks.find((track) => track?.type === "audio");
  const subtitleTrack = tracks.find((track) => track?.type === "subtitle");

  const normalizedVideo: StudioVideoTimelineTrack = {
    id: String(videoTrack?.id || DEFAULT_VIDEO_TRACK_ID),
    type: "video",
    clips:
      videoTrack?.type === "video" && Array.isArray(videoTrack.clips)
        ? videoTrack.clips.map((clip) => ({
            ...clip,
            start: nonNegativeTime(clip.start),
            duration: positiveDuration(clip.duration),
            metadata: clip.metadata || {},
          }))
        : [],
  };
  const normalizedAudio: StudioAudioTimelineTrack = {
    id: String(audioTrack?.id || DEFAULT_AUDIO_TRACK_ID),
    type: "audio",
    clips:
      audioTrack?.type === "audio" && Array.isArray(audioTrack.clips)
        ? audioTrack.clips
            .filter((clip) => Boolean(clip?.url))
            .map((clip) => ({
              ...clip,
              sourceNodeId: String(clip.sourceNodeId || ""),
              sourceType: clip.sourceType === "generated" ? "generated" : "asset",
              url: String(clip.url || ""),
              thumbnail: String(clip.thumbnail || ""),
              start: nonNegativeTime(clip.start),
              duration: positiveDuration(clip.duration),
              createdAt: String(clip.createdAt || nowIso()),
              metadata: {
                title: String(clip.metadata?.title || "Audio clip"),
                volume: clampVolume(clip.metadata?.volume),
              },
            }))
        : [],
  };
  const normalizedSubtitles: StudioSubtitleTimelineTrack = {
    id: String(subtitleTrack?.id || DEFAULT_SUBTITLE_TRACK_ID),
    type: "subtitle",
    clips:
      subtitleTrack?.type === "subtitle" && Array.isArray(subtitleTrack.clips)
        ? subtitleTrack.clips
            .filter((clip) => Boolean(String(clip?.text || "").trim()))
            .map((clip) => ({
              id: String(clip.id || `subtitle-${Date.now()}-${++nodeSequence}`),
              text: String(clip.text || "").trim().slice(0, 2_000),
              start: nonNegativeTime(clip.start),
              duration: positiveDuration(clip.duration, 3),
              createdAt: String(clip.createdAt || nowIso()),
              style: {
                fontSize: subtitleFontSize(clip.style?.fontSize),
                position: subtitlePosition(clip.style?.position),
              },
            }))
        : [],
  };

  return { tracks: [normalizedVideo, normalizedAudio, normalizedSubtitles] };
}

function createTimelineClip(
  sourceNode: StudioNode,
  nodes: StudioNode[],
):
  | { trackType: "video"; clip: StudioVideoTimelineClip }
  | { trackType: "audio"; clip: StudioAudioTimelineClip }
  | null {
  const createdAt = nowIso();
  const id = `timeline-clip-${Date.now()}-${++nodeSequence}`;

  if (sourceNode.data.kind === "videoGenerate") {
    const url = sourceNode.data.videoUrl || sourceNode.data.result;
    if (sourceNode.data.status !== "completed" || !url.trim()) return null;
    return {
      trackType: "video",
      clip: {
        id,
        sourceNodeId: sourceNode.id,
        sourceType: "video_node",
        thumbnail: sourceNode.data.thumbnail || "",
        url,
        start: 0,
        duration: positiveDuration(sourceNode.data.duration),
        createdAt,
        metadata: {
          title: sourceNode.data.title,
          model: sourceNode.data.model,
          status: sourceNode.data.status,
        },
      },
    };
  }

  if (sourceNode.data.kind === "videoEdit") {
    const result = sourceNode.data.result;
    if (
      sourceNode.data.status !== "completed" ||
      !result?.videoUrl.trim()
    ) {
      return null;
    }
    const sourceVideo = sourceNode.data.sourceVideo;
    const sourceAsset = sourceVideo
      ? nodes.find((node) => node.id === sourceVideo.sourceNodeId)
      : null;
    const sourceDuration =
      sourceAsset?.data.kind === "asset"
        ? sourceAsset.data.metadata?.duration
        : undefined;
    return {
      trackType: "video",
      clip: {
        id,
        sourceNodeId: sourceNode.id,
        sourceType: "video_node",
        thumbnail: result.thumbnail || "",
        url: result.videoUrl,
        start: 0,
        duration: positiveDuration(sourceDuration),
        createdAt,
        metadata: {
          title: sourceNode.data.title,
          model: "Mock Video Edit",
          status: sourceNode.data.status,
        },
      },
    };
  }

  if (sourceNode.data.kind === "remakeShot") {
    return {
      trackType: "video",
      clip: {
        id,
        sourceNodeId: sourceNode.id,
        sourceType: "shot_node",
        thumbnail: sourceNode.data.referenceFrames[0] || "",
        url: "",
        start: 0,
        duration: positiveDuration(sourceNode.data.duration),
        createdAt,
        metadata: {
          title: `Shot ${sourceNode.data.shotNumber}`,
          model: sourceNode.data.model,
          status: sourceNode.data.status,
        },
      },
    };
  }

  if (
    sourceNode.data.kind === "asset" &&
    sourceNode.data.assetType === "video" &&
    sourceNode.data.status === "ready" &&
    sourceNode.data.url.trim()
  ) {
    const originNode = nodes.find((node) => node.id === sourceNode.data.originNodeId);
    const originDuration =
      originNode?.data.kind === "videoGenerate" ? originNode.data.duration : undefined;
    return {
      trackType: "video",
      clip: {
        id,
        sourceNodeId: sourceNode.id,
        sourceType: "asset",
        thumbnail: sourceNode.data.thumbnail || "",
        url: sourceNode.data.url,
        start: 0,
        duration: positiveDuration(
          sourceNode.data.metadata?.duration,
          positiveDuration(originDuration),
        ),
        createdAt,
        metadata: {
          title: sourceNode.data.title,
          model:
            typeof sourceNode.data.metadata?.model === "string"
              ? sourceNode.data.metadata.model
              : undefined,
          status: sourceNode.data.status,
        },
      },
    };
  }

  if (
    sourceNode.data.kind === "asset" &&
    sourceNode.data.assetType === "audio" &&
    sourceNode.data.status === "ready" &&
    sourceNode.data.url.trim()
  ) {
    return {
      trackType: "audio",
      clip: {
        id,
        sourceNodeId: sourceNode.id,
        sourceType:
          sourceNode.data.source === "generated" ? "generated" : "asset",
        url: sourceNode.data.url,
        thumbnail: sourceNode.data.thumbnail || "",
        start: 0,
        duration: positiveDuration(sourceNode.data.metadata?.duration, 5),
        createdAt,
        metadata: {
          title: sourceNode.data.title,
          volume: clampVolume(sourceNode.data.metadata?.volume),
        },
      },
    };
  }

  return null;
}

function createNodeData(type: StudioNodeType): StudioNodeData {
  if (type === "asset") {
    return {
      kind: "asset",
      title: "Reference asset",
      assetId: "",
      assetType: "image",
      originNodeId: "",
      status: "missing",
      url: "",
      source: "upload",
      metadata: {},
    };
  }
  if (type === "prompt") {
    return {
      kind: "prompt",
      title: "Creative prompt",
      prompt: "A cinematic product reveal with warm rim light.",
      style: "Cinematic",
      camera: "Slow dolly in",
      duration: 5,
      ratio: "16:9",
    };
  }
  if (type === "remakeAnalysis") {
    return {
      kind: "remakeAnalysis",
      title: "Remake analysis",
      videoInput: "",
      mode: "single_clip",
      targetRegion: "US",
      targetRatio: "16:9",
      characterRules: "Keep the main character visually consistent.",
      sceneStyle: "Cinematic localized short drama",
      translateDialogue: true,
      status: "idle",
      storyboardId: "",
      analysisSource: "",
      shotCount: 0,
      providerCallMade: false,
      vlmCalled: false,
      errorCode: "",
      errorMessage: "",
    };
  }
  if (type === "remake_pipeline") {
    return {
      kind: "remakePipeline",
      title: "Remake auto movie plan",
      sourceVideo: null,
      analysisNodeId: "",
      status: "idle",
      shotCount: 0,
      videoNodeCount: 0,
      timelineClipCount: 0,
      shotNodeIds: [],
      videoNodeIds: [],
      timelineClipIds: [],
      confirmationState: "none",
      generationPlanId: "",
      estimatedCredits: 0,
      generationStarted: false,
      providerCallMade: false,
      errorCode: "",
      errorMessage: "",
    };
  }
  if (type === "remakeShot") {
    return {
      kind: "remakeShot",
      title: "Remake shot",
      analysisNodeId: "",
      storyboardId: "",
      shotId: "",
      shotNumber: 1,
      description: "Storyboard shot awaiting analysis data.",
      prompt: "",
      duration: 4,
      camera: "",
      referenceFrames: [],
      sourceTimeRange: { start: 0, end: 4 },
      model: "seedance_2_0",
      ratio: "16:9",
      quality: "720p",
      status: "ready",
    };
  }
  if (type === "imageGenerate") {
    return {
      kind: "imageGenerate",
      title: "Image generation",
      model: "image_auto",
      ratio: "auto",
      quality: "",
      size: "",
      count: 1,
      promptInput: "prompt-1",
      assetInput: "asset-1",
      status: "idle",
      result: "",
      jobId: "",
      imageUrl: "",
      thumbnail: "",
      errorCode: "",
      errorMessage: "",
    };
  }
  if (type === "videoGenerate") {
    return {
      kind: "videoGenerate",
      title: "Video generation",
      model: "seedance_2_0",
      duration: 4,
      ratio: "16:9",
      quality: "480p",
      resolution: "480p",
      references: [],
      promptInput: "prompt-1",
      imageInput: "asset-1",
      videoInput: "",
      status: "idle",
      result: "",
      jobId: "",
      videoUrl: "",
      thumbnail: "",
      errorCode: "",
      errorMessage: "",
      sourceShotId: "",
      sourcePipelineId: "",
      pipelineExecutionBlocked: false,
      queueStatus: null,
    };
  }
  if (type === "video_edit") {
    return {
      kind: "videoEdit",
      title: "AI video edit",
      sourceVideo: null,
      mode: "video_to_video",
      prompt: "Transform the scene while preserving the subject and motion.",
      status: "idle",
      result: null,
      errorCode: "",
      errorMessage: "",
    };
  }
  return {
    kind: "output",
    title: "Workflow output",
    resultPreview: "Awaiting an upstream result",
    outputType: "video",
    createdAt: "",
    status: "idle",
    jobId: "",
    thumbnail: "",
    errorMessage: "",
  };
}

function createStudioNode(
  type: StudioNodeType,
  id: string,
  position: { x: number; y: number },
): StudioNode {
  return {
    id,
    type,
    position,
    data: createNodeData(type),
  };
}

function createInitialNodes(): StudioNode[] {
  return [
    createStudioNode("asset", "asset-1", { x: 30, y: 190 }),
    createStudioNode("prompt", "prompt-1", { x: 340, y: 105 }),
    createStudioNode("imageGenerate", "image-generate-1", { x: 675, y: 30 }),
    createStudioNode("videoGenerate", "video-generate-1", { x: 675, y: 295 }),
    createStudioNode("output", "output-1", { x: 1030, y: 220 }),
  ];
}

function createInitialEdges(): StudioEdge[] {
  return [
    {
      id: "edge-asset-prompt",
      source: "asset-1",
      target: "prompt-1",
      type: "smoothstep",
      animated: true,
    },
    {
      id: "edge-prompt-video",
      source: "prompt-1",
      target: "video-generate-1",
      type: "smoothstep",
      animated: true,
    },
    {
      id: "edge-video-output",
      source: "video-generate-1",
      target: "output-1",
      type: "smoothstep",
      animated: true,
    },
  ];
}

function normalizeStudioNodes(nodes: StudioNode[]) {
  return nodes.map((node) => {
    const data = {
      ...createNodeData(node.type),
      ...node.data,
    } as StudioNodeData;
    if (
      data.kind === "videoGenerate" &&
      (!data.model || data.model === "Model placeholder")
    ) {
      data.model = "seedance_2_0";
    }
    return { ...node, data } satisfies StudioNode;
  });
}

function takeSnapshot(state: Pick<StudioState, "nodes" | "edges" | "viewport" | "timeline" | "updatedAt">): StudioCanvasSnapshot {
  return {
    nodes: state.nodes,
    edges: state.edges,
    viewport: state.viewport,
    timeline: state.timeline,
    updatedAt: state.updatedAt,
  };
}

function appendHistory(history: StudioCanvasSnapshot[], snapshot: StudioCanvasSnapshot) {
  return [...history, snapshot].slice(-historyLimit);
}

function outputString(outputs: Record<string, unknown>, key: string) {
  const value = outputs[key];
  return typeof value === "string" ? value : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeNodeIdPart(value: unknown) {
  return String(value || "shot")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "shot";
}

function createRunRecord(
  nodes: StudioNode[],
  projectId: string | null,
  mode: "graph" | "retry",
): StudioRunRecord {
  const createdAt = nowIso();
  return {
    id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId: projectId || "local",
    createdAt,
    status: "running",
    mode,
    nodes: nodes.map((node) => ({
      nodeId: node.id,
      type: node.type,
      status: "ready",
      startedAt: null,
      finishedAt: null,
    })),
  };
}

function createGenerationPlanRunRecord(
  plan: StudioGenerationPlan,
): StudioRunRecord {
  const status =
    plan.status === "completed"
      ? "completed"
      : plan.status === "failed" || plan.status === "cancelled"
        ? "failed"
        : "running";
  return {
    id: `run-${plan.id}`,
    projectId: plan.projectId,
    createdAt: plan.confirmedAt || plan.createdAt,
    status,
    mode: "generation_plan",
    type: "generation_plan",
    tasks: plan.items.length,
    estimatedCredits: plan.estimatedCredits,
    nodes: plan.items.map((item) => ({
      nodeId: item.nodeId,
      type: "videoGenerate",
      status: item.status,
      startedAt: item.startedAt,
      finishedAt: item.finishedAt,
      errorCode: item.errorCode,
      message: item.message,
    })),
  };
}

function updateRunRecordNode(
  record: StudioRunRecord,
  runtime: StudioNodeRuntimeState,
): StudioRunRecord {
  return {
    ...record,
    nodes: record.nodes.map((node) =>
      node.nodeId === runtime.nodeId
        ? {
            ...node,
            status: runtime.status,
            startedAt: runtime.startedAt,
            finishedAt: runtime.finishedAt,
            errorCode: outputString(runtime.outputs, "errorCode") || undefined,
            message:
              outputString(runtime.outputs, "message") || runtime.error || undefined,
          }
        : node,
    ),
  };
}

function applyRuntimeOutputToCanvas(
  nodes: StudioNode[],
  runtime: StudioNodeRuntimeState,
) {
  let changed = false;
  const nodesWithOutput = nodes.map((node) => {
    if (node.id !== runtime.nodeId) return node;

    if (node.data.kind === "remakeAnalysis") {
      const status =
        runtime.status === "completed" || runtime.status === "failed"
          ? runtime.status
          : "processing";
      changed = true;
      return {
        ...node,
        data: {
          ...node.data,
          status,
          storyboardId:
            outputString(runtime.outputs, "storyboardId") || node.data.storyboardId,
          analysisSource:
            outputString(runtime.outputs, "analysisSource") || node.data.analysisSource,
          shotCount: Number(runtime.outputs.shotCount) || node.data.shotCount,
          providerCallMade:
            runtime.outputs.providerCallMade === true || node.data.providerCallMade,
          vlmCalled: runtime.outputs.vlmCalled === true || node.data.vlmCalled,
          errorCode:
            runtime.status === "failed"
              ? outputString(runtime.outputs, "errorCode")
              : "",
          errorMessage:
            runtime.status === "failed"
              ? outputString(runtime.outputs, "message") || runtime.error || ""
              : "",
        },
      } satisfies StudioNode;
    }

    if (node.data.kind === "remakePipeline") {
      const sourceVideo = asRecord(runtime.outputs.sourceVideo);
      const status =
        runtime.status === "completed" || runtime.status === "failed"
          ? runtime.status
          : "processing";
      changed = true;
      return {
        ...node,
        data: {
          ...node.data,
          status,
          sourceVideo:
            sourceVideo.url
              ? {
                  assetId: outputString(sourceVideo, "assetId"),
                  sourceNodeId: outputString(sourceVideo, "sourceNodeId"),
                  url: outputString(sourceVideo, "url"),
                  thumbnail: outputString(sourceVideo, "thumbnail"),
                }
              : node.data.sourceVideo,
          analysisNodeId:
            outputString(runtime.outputs, "analysisNodeId") ||
            node.data.analysisNodeId,
          shotCount: Number(runtime.outputs.shotCount) || node.data.shotCount,
          videoNodeCount:
            Number(runtime.outputs.videoNodeCount) || node.data.videoNodeCount,
          timelineClipCount:
            Number(runtime.outputs.timelineClipCount) ||
            node.data.timelineClipCount,
          confirmationState:
            runtime.status === "completed" ? "awaiting" : node.data.confirmationState,
          generationStarted: false,
          providerCallMade: false,
          errorCode:
            runtime.status === "failed"
              ? outputString(runtime.outputs, "errorCode")
              : "",
          errorMessage:
            runtime.status === "failed"
              ? outputString(runtime.outputs, "message") || runtime.error || ""
              : "",
        },
      } satisfies StudioNode;
    }

    if (node.data.kind === "imageGenerate") {
      const jobId = outputString(runtime.outputs, "jobId");
      const imageUrl = outputString(runtime.outputs, "imageUrl");
      const thumbnail = outputString(runtime.outputs, "thumbnail");
      const errorCode = outputString(runtime.outputs, "errorCode");
      const errorMessage = outputString(runtime.outputs, "message") || runtime.error || "";
      const model = outputString(runtime.outputs, "model");
      const status =
        runtime.status === "completed" || runtime.status === "failed"
          ? runtime.status
          : "processing";
      changed = true;
      return {
        ...node,
        data: {
          ...node.data,
          status,
          jobId: jobId || node.data.jobId,
          model: model || node.data.model,
          imageUrl: imageUrl || node.data.imageUrl,
          thumbnail: thumbnail || imageUrl || node.data.thumbnail,
          result: imageUrl || node.data.result,
          errorCode: runtime.status === "failed" ? errorCode : "",
          errorMessage: runtime.status === "failed" ? errorMessage : "",
        },
      } satisfies StudioNode;
    }

    if (node.data.kind === "videoGenerate") {
      const jobId = outputString(runtime.outputs, "jobId");
      const videoUrl = outputString(runtime.outputs, "videoUrl");
      const thumbnail = outputString(runtime.outputs, "thumbnail");
      const errorCode = outputString(runtime.outputs, "errorCode");
      const errorMessage = outputString(runtime.outputs, "message") || runtime.error || "";
      const model = outputString(runtime.outputs, "model");
      const references = Array.isArray(runtime.outputs.references)
        ? runtime.outputs.references.map(String).filter(Boolean)
        : node.data.references;
      const status =
        runtime.status === "completed" ||
        runtime.status === "failed" ||
        runtime.status === "queued"
          ? runtime.status
          : "processing";
      changed = true;
      return {
        ...node,
        data: {
          ...node.data,
          status,
          jobId: jobId || node.data.jobId,
          model: model || node.data.model,
          duration: Number(runtime.outputs.duration) || node.data.duration,
          ratio: outputString(runtime.outputs, "ratio") || node.data.ratio,
          quality: outputString(runtime.outputs, "quality") || node.data.quality,
          resolution:
            outputString(runtime.outputs, "resolution") || node.data.resolution,
          references,
          videoUrl: videoUrl || node.data.videoUrl,
          thumbnail: thumbnail || videoUrl || node.data.thumbnail,
          result: videoUrl || node.data.result,
          errorCode: runtime.status === "failed" ? errorCode : "",
          errorMessage: runtime.status === "failed" ? errorMessage : "",
        },
      } satisfies StudioNode;
    }

    if (node.data.kind === "videoEdit") {
      const sourceVideo = asRecord(runtime.outputs.sourceVideo);
      const videoUrl = outputString(runtime.outputs, "videoUrl");
      const thumbnail = outputString(runtime.outputs, "thumbnail");
      const jobId = outputString(runtime.outputs, "jobId");
      const errorCode = outputString(runtime.outputs, "errorCode");
      const errorMessage =
        outputString(runtime.outputs, "message") || runtime.error || "";
      const status =
        runtime.status === "completed" || runtime.status === "failed"
          ? runtime.status
          : "processing";
      changed = true;
      return {
        ...node,
        data: {
          ...node.data,
          status,
          sourceVideo:
            sourceVideo.url
              ? {
                  assetId: outputString(sourceVideo, "assetId"),
                  sourceNodeId: outputString(sourceVideo, "sourceNodeId"),
                  url: outputString(sourceVideo, "url"),
                  thumbnail: outputString(sourceVideo, "thumbnail"),
                }
              : node.data.sourceVideo,
          result:
            runtime.status === "completed" && videoUrl
              ? {
                  videoUrl,
                  thumbnail: thumbnail || videoUrl,
                  jobId,
                  mock: runtime.outputs.mock === true,
                }
              : node.data.result,
          errorCode: runtime.status === "failed" ? errorCode : "",
          errorMessage: runtime.status === "failed" ? errorMessage : "",
        },
      } satisfies StudioNode;
    }

    if (node.data.kind === "output" && runtime.status === "failed") {
      changed = true;
      return {
        ...node,
        data: {
          ...node.data,
          status: "failed",
          jobId: outputString(runtime.outputs, "jobId") || node.data.jobId,
          errorMessage:
            outputString(runtime.outputs, "message") ||
            runtime.error ||
            "Upstream generation failed.",
        },
      } satisfies StudioNode;
    }

    if (node.data.kind === "output" && runtime.status === "completed") {
      const videoUrl = outputString(runtime.outputs, "videoUrl");
      const imageUrl = outputString(runtime.outputs, "imageUrl");
      const resultUrl = videoUrl || imageUrl;
      if (!resultUrl) return node;
      changed = true;
      return {
        ...node,
        data: {
          ...node.data,
          resultPreview: resultUrl,
          outputType: videoUrl ? "video" : "image",
          createdAt: runtime.finishedAt || nowIso(),
          status: "completed",
          jobId: outputString(runtime.outputs, "jobId"),
          thumbnail: outputString(runtime.outputs, "thumbnail") || resultUrl,
          errorMessage: "",
        },
      } satisfies StudioNode;
    }

    return node;
  });

  return {
    changed,
    nodes: nodesWithOutput,
  };
}

function applyVideoRuntimeToDownstreamOutputs(
  nodes: StudioNode[],
  edges: StudioEdge[],
  runtime: StudioNodeRuntimeState,
) {
  if (outputString(runtime.outputs, "executor") !== "video_generate") {
    return { changed: false, nodes };
  }

  const targetIds = new Set(
    edges
      .filter((edge) => edge.source === runtime.nodeId)
      .map((edge) => edge.target),
  );
  if (!targetIds.size) return { changed: false, nodes };

  const videoUrl = outputString(runtime.outputs, "videoUrl");
  const thumbnail = outputString(runtime.outputs, "thumbnail") || videoUrl;
  const jobId = outputString(runtime.outputs, "jobId");
  const message = outputString(runtime.outputs, "message") || runtime.error || "";
  let changed = false;
  const nextNodes = nodes.map((node) => {
    if (!targetIds.has(node.id) || node.data.kind !== "output") return node;
    changed = true;
    return {
      ...node,
      data: {
        ...node.data,
        status:
          runtime.status === "completed" || runtime.status === "failed"
            ? runtime.status
            : "processing",
        resultPreview:
          runtime.status === "completed" && videoUrl
            ? videoUrl
            : node.data.resultPreview,
        outputType: videoUrl ? "video" : node.data.outputType,
        createdAt:
          runtime.status === "completed"
            ? runtime.finishedAt || nowIso()
            : node.data.createdAt,
        jobId: jobId || node.data.jobId,
        thumbnail: thumbnail || node.data.thumbnail,
        errorMessage: runtime.status === "failed" ? message : "",
      },
    } satisfies StudioNode;
  });

  return { changed, nodes: nextNodes };
}

function applyVideoRuntimeToTimeline(
  timeline: StudioTimeline,
  runtime: StudioNodeRuntimeState,
) {
  if (outputString(runtime.outputs, "executor") !== "video_generate") {
    return { changed: false, timeline };
  }

  const videoUrl = outputString(runtime.outputs, "videoUrl");
  const thumbnail = outputString(runtime.outputs, "thumbnail") || videoUrl;
  const model = outputString(runtime.outputs, "model");
  const duration = positiveDuration(runtime.outputs.duration, 0);
  let changed = false;
  const tracks = timeline.tracks.map((track) => {
    if (track.type !== "video") return track;
    const clips = track.clips.map((clip) => {
      if (clip.sourceNodeId !== runtime.nodeId) return clip;
      changed = true;
      return {
        ...clip,
        url:
          runtime.status === "completed" && videoUrl ? videoUrl : clip.url,
        thumbnail: thumbnail || clip.thumbnail,
        duration: duration || clip.duration,
        metadata: {
          ...clip.metadata,
          model: model || clip.metadata?.model,
          status: runtime.status,
        },
      };
    });
    return { ...track, clips };
  });

  return { changed, timeline: changed ? { tracks } : timeline };
}

function materializeRemakeShotNodes(
  nodes: StudioNode[],
  edges: StudioEdge[],
  runtime: StudioNodeRuntimeState,
) {
  const sourceNode = nodes.find(
    (node) => node.id === runtime.nodeId && node.data.kind === "remakeAnalysis",
  );
  const shots = Array.isArray(runtime.outputs.shots)
    ? runtime.outputs.shots.map(asRecord)
    : [];
  if (!sourceNode || sourceNode.data.kind !== "remakeAnalysis" || !shots.length) {
    return { changed: false, nodes, edges };
  }

  const storyboardId =
    outputString(runtime.outputs, "storyboardId") || sourceNode.data.storyboardId;
  let changed = false;
  const nextNodes = [...nodes];
  const nextEdges = [...edges];

  shots.forEach((shot, index) => {
    const shotId = String(shot.shotId || `shot-${index + 1}`);
    const existingIndex = nextNodes.findIndex(
      (node) =>
        node.data.kind === "remakeShot" &&
        node.data.analysisNodeId === sourceNode.id &&
        node.data.shotId === shotId,
    );
    const sourceTimeRange = asRecord(shot.sourceTimeRange);
    const shotNumber = Math.max(1, Number(shot.shotNumber) || index + 1);
    const data: StudioNodeData = {
      kind: "remakeShot",
      title: `Shot ${shotNumber}`,
      analysisNodeId: sourceNode.id,
      storyboardId,
      shotId,
      shotNumber,
      description: String(shot.description || `Storyboard shot ${shotNumber}`),
      prompt: String(shot.prompt || ""),
      duration: Math.max(1, Number(shot.duration) || 4),
      camera: String(shot.camera || ""),
      referenceFrames: Array.isArray(shot.referenceFrames)
        ? shot.referenceFrames.map(String).filter(Boolean)
        : [],
      sourceTimeRange: {
        start: Math.max(0, Number(sourceTimeRange.start) || 0),
        end: Math.max(0, Number(sourceTimeRange.end) || 0),
      },
      model: String(shot.model || "seedance_2_0"),
      ratio: String(shot.ratio || sourceNode.data.targetRatio || "16:9"),
      quality: String(shot.quality || "720p"),
      status: "ready",
    };

    let shotNodeId: string;
    if (existingIndex >= 0) {
      const existing = nextNodes[existingIndex];
      shotNodeId = existing.id;
      nextNodes[existingIndex] = { ...existing, data };
    } else {
      shotNodeId = `remake-shot-${safeNodeIdPart(sourceNode.id)}-${safeNodeIdPart(shotId)}`;
      nextNodes.push({
        id: shotNodeId,
        type: "remakeShot",
        position: {
          x: sourceNode.position.x + 340 + Math.floor(index / 4) * 310,
          y: sourceNode.position.y + (index % 4) * 260,
        },
        data,
      });
    }

    if (!nextEdges.some((edge) => edge.source === sourceNode.id && edge.target === shotNodeId)) {
      nextEdges.push({
        id: `edge-${safeNodeIdPart(sourceNode.id)}-${safeNodeIdPart(shotNodeId)}`,
        source: sourceNode.id,
        target: shotNodeId,
        type: "smoothstep",
        animated: true,
      });
    }
    changed = true;
  });

  return { changed, nodes: nextNodes, edges: nextEdges };
}

function materializeRemakePipelinePlan(
  nodes: StudioNode[],
  edges: StudioEdge[],
  timeline: StudioTimeline,
  runtime: StudioNodeRuntimeState,
) {
  const pipelineNode = nodes.find(
    (node) => node.id === runtime.nodeId && node.data.kind === "remakePipeline",
  );
  const shots = Array.isArray(runtime.outputs.shots)
    ? runtime.outputs.shots.map(asRecord)
    : [];
  if (!pipelineNode || pipelineNode.data.kind !== "remakePipeline" || !shots.length) {
    return { changed: false, nodes, edges, timeline };
  }

  const nextNodes = [...nodes];
  const nextEdges = [...edges];
  const shotNodeIds: string[] = [];
  const videoNodeIds: string[] = [];
  const timelineClipIds: string[] = [];
  const analysisNodeId =
    outputString(runtime.outputs, "analysisNodeId") ||
    pipelineNode.data.analysisNodeId;
  const storyboardId = outputString(runtime.outputs, "storyboardId");
  const createdAt = nowIso();
  const videoTrack = timeline.tracks.find((track) => track.type === "video");
  let videoClips = videoTrack?.type === "video" ? [...videoTrack.clips] : [];

  shots.forEach((shot, index) => {
    const shotId = String(shot.shotId || `shot-${index + 1}`);
    const shotNumber = Math.max(1, Number(shot.shotNumber) || index + 1);
    const sourceTimeRange = asRecord(shot.sourceTimeRange);
    const sourceShotNodeId = outputString(shot, "sourceNodeId");
    let shotNode = nextNodes.find(
      (node) =>
        node.data.kind === "remakeShot" &&
        (node.id === sourceShotNodeId ||
          (node.data.analysisNodeId === analysisNodeId &&
            node.data.shotId === shotId)),
    );
    if (!shotNode || shotNode.data.kind !== "remakeShot") {
      const shotNodeId = `remake-shot-${safeNodeIdPart(pipelineNode.id)}-${safeNodeIdPart(shotId)}`;
      shotNode = {
        id: shotNodeId,
        type: "remakeShot",
        position: {
          x: pipelineNode.position.x + 340 + Math.floor(index / 4) * 650,
          y: pipelineNode.position.y + (index % 4) * 280,
        },
        data: {
          kind: "remakeShot",
          title: `Shot ${shotNumber}`,
          analysisNodeId,
          storyboardId,
          shotId,
          shotNumber,
          description: String(shot.description || `Storyboard shot ${shotNumber}`),
          prompt: String(shot.prompt || ""),
          duration: Math.max(1, Number(shot.duration) || 4),
          camera: String(shot.camera || ""),
          referenceFrames: Array.isArray(shot.referenceFrames)
            ? shot.referenceFrames.map(String).filter(Boolean)
            : [],
          sourceTimeRange: {
            start: Math.max(0, Number(sourceTimeRange.start) || 0),
            end: Math.max(0, Number(sourceTimeRange.end) || 0),
          },
          model: String(shot.model || "seedance_2_0"),
          ratio: String(shot.ratio || "16:9"),
          quality: String(shot.quality || "720p"),
          status: "ready",
        },
      };
      nextNodes.push(shotNode);
    }
    if (!shotNode || shotNode.data.kind !== "remakeShot") return;
    const shotData = shotNode.data;
    shotNodeIds.push(shotNode.id);

    if (!nextEdges.some((edge) => edge.source === pipelineNode.id && edge.target === shotNode.id)) {
      nextEdges.push({
        id: `edge-${safeNodeIdPart(pipelineNode.id)}-${safeNodeIdPart(shotNode.id)}`,
        source: pipelineNode.id,
        target: shotNode.id,
        type: "smoothstep",
        animated: true,
      });
    }

    let videoNode = nextNodes.find(
      (node) =>
        node.data.kind === "videoGenerate" &&
        node.data.sourceShotId === shotNode.id,
    );
    if (!videoNode || videoNode.data.kind !== "videoGenerate") {
      const defaults = createNodeData("videoGenerate");
      if (defaults.kind !== "videoGenerate") return;
      const videoNodeId = `video-generate-${safeNodeIdPart(pipelineNode.id)}-${safeNodeIdPart(shotId)}`;
      const newVideoNode: StudioNode = {
        id: videoNodeId,
        type: "videoGenerate",
        position: {
          x: shotNode.position.x + 330,
          y: shotNode.position.y + 20,
        },
        data: {
          ...defaults,
          title: `Generate Shot ${shotNumber}`,
          model: shotData.model,
          duration: shotData.duration,
          ratio: shotData.ratio,
          quality: shotData.quality,
          resolution: shotData.quality,
          references: shotData.referenceFrames,
          promptInput: shotNode.id,
          imageInput: "",
          videoInput: "",
          sourceShotId: shotNode.id,
          sourcePipelineId: pipelineNode.id,
          pipelineExecutionBlocked: true,
          status: "idle",
        },
      };
      videoNode = newVideoNode;
      nextNodes.push(newVideoNode);
    }
    if (!videoNode || videoNode.data.kind !== "videoGenerate") return;
    const videoData = videoNode.data;
    videoNodeIds.push(videoNode.id);

    if (!nextEdges.some((edge) => edge.source === shotNode.id && edge.target === videoNode.id)) {
      nextEdges.push({
        id: `edge-${safeNodeIdPart(shotNode.id)}-${safeNodeIdPart(videoNode.id)}`,
        source: shotNode.id,
        target: videoNode.id,
        type: "smoothstep",
        animated: true,
      });
    }

    const existingClip = videoClips.find((clip) => clip.sourceNodeId === videoNode.id);
    if (existingClip) {
      timelineClipIds.push(existingClip.id);
      return;
    }
    const completedVideo =
      videoData.status === "completed"
        ? videoData.videoUrl || videoData.result
        : "";
    const clipId = `timeline-clip-${safeNodeIdPart(pipelineNode.id)}-${safeNodeIdPart(shotId)}`;
    timelineClipIds.push(clipId);
    videoClips.push({
      id: clipId,
      sourceNodeId: videoNode.id,
      sourceType: "video_node",
      thumbnail: videoData.thumbnail,
      url: completedVideo,
      start: 0,
      duration: positiveDuration(videoData.duration),
      createdAt,
      metadata: {
        title: `Shot ${shotNumber} Video`,
        model: videoData.model,
        status: completedVideo ? "completed" : "planned",
      },
    });
  });

  videoClips = reflowTimelineClips(videoClips);
  const nextVideoTrack: StudioVideoTimelineTrack = {
    id: videoTrack?.id || DEFAULT_VIDEO_TRACK_ID,
    type: "video",
    clips: videoClips,
  };
  const nextTimeline: StudioTimeline = {
    tracks: videoTrack
      ? timeline.tracks.map((track) =>
          track.type === "video" ? nextVideoTrack : track,
        )
      : [nextVideoTrack, ...timeline.tracks],
  };
  const finalizedNodes = nextNodes.map((node) =>
    node.id === pipelineNode.id && node.data.kind === "remakePipeline"
      ? {
          ...node,
          data: {
            ...node.data,
            status: "completed" as const,
            shotCount: shotNodeIds.length,
            videoNodeCount: videoNodeIds.length,
            timelineClipCount: timelineClipIds.length,
            shotNodeIds,
            videoNodeIds,
            timelineClipIds,
            confirmationState: "awaiting" as const,
            generationStarted: false,
            providerCallMade: false,
            errorCode: "",
            errorMessage: "",
          },
        }
      : node,
  );

  return {
    changed: true,
    nodes: finalizedNodes,
    edges: nextEdges,
    timeline: nextTimeline,
  };
}

type StudioState = StudioCanvasSnapshot & {
  projectId: string | null;
  projectName: string;
  projects: StudioProjectSummary[];
  dirty: boolean;
  saving: boolean;
  loadingProject: boolean;
  projectError: string;
  selectedNodeId: string | null;
  past: StudioCanvasSnapshot[];
  future: StudioCanvasSnapshot[];
  hasHydrated: boolean;
  runtimeState: StudioRuntimeState;
  runtimeRunning: boolean;
  runLockState: StudioRunLockState;
  runHistory: StudioRunRecord[];
  generationPlans: StudioGenerationPlan[];
  generationQueue: {
    activePlanId: string | null;
    running: boolean;
    maxConcurrent: number;
  };
  runtimeError: string;
  selectedTimelineClipId: string | null;
  addNode: (type: StudioNodeType) => void;
  addAssetNode: (asset: StudioAssetItem) => void;
  addRenderedAssetNode: (input: {
    jobId: string;
    url: string;
    thumbnail?: string;
  }) => void;
  createAssetFromResultNode: (nodeId: string) => void;
  createVideoNodeFromRemakeShot: (nodeId: string) => void;
  createGenerationPlan: (pipelineNodeId: string) => void;
  startGenerationPlan: (planId: string) => Promise<void>;
  cancelGenerationPlan: (planId: string) => void;
  addNodeToTimeline: (nodeId: string) => void;
  addSubtitleTimelineClip: (input: {
    text: string;
    start: number;
    duration: number;
  }) => void;
  moveTimelineClip: (
    trackId: string,
    clipId: string,
    direction: "earlier" | "later",
  ) => void;
  reorderTimelineClip: (trackId: string, clipId: string, targetClipId: string) => void;
  selectTimelineClip: (clipId: string | null) => void;
  deleteTimelineClip: (trackId: string, clipId: string) => void;
  duplicateTimelineClip: (trackId: string, clipId: string) => void;
  updateTimelineClip: (
    trackId: string,
    clipId: string,
    patch: {
      start?: number;
      duration?: number;
      text?: string;
      volume?: number;
      fontSize?: number;
      position?: StudioSubtitlePosition;
    },
  ) => void;
  deleteNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, patch: Record<string, unknown>) => void;
  selectNode: (nodeId: string | null) => void;
  onNodesChange: (changes: NodeChange<StudioNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<StudioEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  setViewport: (viewport: Viewport) => void;
  rememberSnapshot: (snapshot: StudioCanvasSnapshot) => void;
  setProjectName: (projectName: string) => void;
  setProjects: (projects: StudioProjectSummary[]) => void;
  setSaving: (saving: boolean) => void;
  setLoadingProject: (loadingProject: boolean) => void;
  setProjectError: (projectError: string) => void;
  clearRuntimeError: () => void;
  loadProject: (project: StudioProject) => void;
  loadTemplateCanvas: (canvas: StudioCanvasJson) => void;
  markProjectSaved: (project: StudioProject) => void;
  undo: () => void;
  redo: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  runNodes: () => Promise<void>;
  retryNode: (nodeId: string) => Promise<void>;
};

const initialNodes = createInitialNodes();
const initialEdges = createInitialEdges();

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      nodes: initialNodes,
      edges: initialEdges,
      viewport: defaultViewport,
      timeline: createEmptyTimeline(),
      updatedAt: "",
      projectId: null,
      projectName: "Untitled Project",
      projects: [],
      dirty: false,
      saving: false,
      loadingProject: false,
      projectError: "",
      selectedNodeId: "prompt-1",
      past: [],
      future: [],
      hasHydrated: false,
      runtimeState: {},
      runtimeRunning: false,
      runLockState: "idle",
      runHistory: [],
      generationPlans: [],
      generationQueue: {
        activePlanId: null,
        running: false,
        maxConcurrent: MAX_CONCURRENT_VIDEO_GENERATIONS,
      },
      runtimeError: "",
      selectedTimelineClipId: null,

      addNode: (type) =>
        set((state) => {
          nodeSequence += 1;
          const snapshot = takeSnapshot(state);
          const id = type + "-" + Date.now() + "-" + nodeSequence;
          const offset = state.nodes.length * 28;
          const node = createStudioNode(type, id, {
            x: 140 + (offset % 520),
            y: 130 + (offset % 300),
          });
          return {
            nodes: [...state.nodes, node],
            selectedNodeId: id,
            past: appendHistory(state.past, snapshot),
            future: [],
            updatedAt: nowIso(),
            dirty: true,
          };
        }),

      addAssetNode: (asset) =>
        set((state) => {
          nodeSequence += 1;
          const snapshot = takeSnapshot(state);
          const id = "asset-" + Date.now() + "-" + nodeSequence;
          const offset = state.nodes.length * 31;
          const node: StudioNode = {
            id,
            type: "asset",
            position: {
              x: 110 + (offset % 460),
              y: 120 + (offset % 340),
            },
            data: {
              kind: "asset",
              title: asset.name,
              assetId: asset.id,
              assetType: asset.type,
              originNodeId: "",
              status: asset.status,
              url: asset.url,
              thumbnail: asset.thumbnail,
              source: asset.source,
              metadata: asset.metadata,
            },
          };

          return {
            nodes: [...state.nodes, node],
            selectedNodeId: id,
            past: appendHistory(state.past, snapshot),
            future: [],
            updatedAt: nowIso(),
            dirty: true,
          };
        }),

      addRenderedAssetNode: ({ jobId, url, thumbnail }) =>
        set((state) => {
          const cleanJobId = jobId.trim();
          const cleanUrl = url.trim();
          if (!cleanJobId || !cleanUrl) return state;

          const assetId = `render:${cleanJobId}`;
          const existingAsset = state.nodes.find(
            (node) =>
              node.data.kind === "asset" &&
              (node.data.assetId === assetId ||
                node.data.metadata?.renderJobId === cleanJobId),
          );
          if (existingAsset) return { selectedNodeId: existingAsset.id };

          nodeSequence += 1;
          const snapshot = takeSnapshot(state);
          const id = `asset-render-${safeNodeIdPart(cleanJobId)}-${nodeSequence}`;
          const offset = state.nodes.length * 31;
          const node: StudioNode = {
            id,
            type: "asset",
            position: {
              x: 160 + (offset % 520),
              y: 160 + (offset % 320),
            },
            data: {
              kind: "asset",
              title: "Rendered video",
              assetId,
              assetType: "video",
              originNodeId: "",
              status: "ready",
              url: cleanUrl,
              thumbnail: thumbnail?.trim() || "",
              source: "rendered",
              metadata: {
                renderJobId: cleanJobId,
                projectId: state.projectId,
                source: "studio_render",
              },
            },
          };

          return {
            nodes: [...state.nodes, node],
            selectedNodeId: id,
            past: appendHistory(state.past, snapshot),
            future: [],
            updatedAt: nowIso(),
            dirty: true,
          };
        }),

      createAssetFromResultNode: (nodeId) =>
        set((state) => {
          const sourceNode = state.nodes.find((node) => node.id === nodeId);
          if (!sourceNode) return state;

          let assetType: "image" | "video";
          let url = "";
          let thumbnail = "";
          let jobId = "";
          let model = "";

          if (sourceNode.data.kind === "output") {
            if (
              sourceNode.data.status !== "completed" ||
              (sourceNode.data.outputType !== "image" &&
                sourceNode.data.outputType !== "video")
            ) {
              return state;
            }
            assetType = sourceNode.data.outputType;
            url = sourceNode.data.resultPreview;
            thumbnail = sourceNode.data.thumbnail || url;
            jobId = sourceNode.data.jobId;
          } else if (sourceNode.data.kind === "imageGenerate") {
            if (sourceNode.data.status !== "completed") return state;
            assetType = "image";
            url = sourceNode.data.imageUrl || sourceNode.data.result;
            thumbnail = sourceNode.data.thumbnail || url;
            jobId = sourceNode.data.jobId;
            model = sourceNode.data.model;
          } else if (sourceNode.data.kind === "videoGenerate") {
            if (sourceNode.data.status !== "completed") return state;
            assetType = "video";
            url = sourceNode.data.videoUrl || sourceNode.data.result;
            thumbnail = sourceNode.data.thumbnail || url;
            jobId = sourceNode.data.jobId;
            model = sourceNode.data.model;
          } else if (sourceNode.data.kind === "videoEdit") {
            if (
              sourceNode.data.status !== "completed" ||
              !sourceNode.data.result?.videoUrl
            ) {
              return state;
            }
            assetType = "video";
            url = sourceNode.data.result.videoUrl;
            thumbnail = sourceNode.data.result.thumbnail || url;
            jobId = sourceNode.data.result.jobId;
            model = `video_edit:${sourceNode.data.mode}`;
          } else {
            return state;
          }

          if (!url.trim()) return state;

          const existingAsset = state.nodes.find(
            (node) =>
              node.data.kind === "asset" &&
              (node.data.originNodeId === sourceNode.id ||
                node.data.metadata?.sourceNodeId === sourceNode.id),
          );
          if (existingAsset) {
            return { selectedNodeId: existingAsset.id };
          }

          nodeSequence += 1;
          const snapshot = takeSnapshot(state);
          const id = "asset-" + Date.now() + "-" + nodeSequence;
          const node: StudioNode = {
            id,
            type: "asset",
            position: {
              x: sourceNode.position.x + 340,
              y: sourceNode.position.y + 40,
            },
            data: {
              kind: "asset",
              title: `${sourceNode.data.title} asset`,
              assetId: jobId || `generated:${sourceNode.id}`,
              assetType,
              originNodeId: sourceNode.id,
              status: "ready",
              url,
              thumbnail,
              source: "generated",
              metadata: {
                sourceNodeId: sourceNode.id,
                originNodeId: sourceNode.id,
                jobId,
                model,
              },
            },
          };
          const edge: StudioEdge = {
            id: `edge-${safeNodeIdPart(sourceNode.id)}-${safeNodeIdPart(id)}`,
            source: sourceNode.id,
            target: id,
            type: "smoothstep",
            animated: true,
          };

          return {
            nodes: [...state.nodes, node],
            edges: [...state.edges, edge],
            selectedNodeId: id,
            past: appendHistory(state.past, snapshot),
            future: [],
            updatedAt: nowIso(),
            dirty: true,
          };
        }),

      createVideoNodeFromRemakeShot: (nodeId) =>
        set((state) => {
          const shotNode = state.nodes.find(
            (node) => node.id === nodeId && node.data.kind === "remakeShot",
          );
          if (!shotNode || shotNode.data.kind !== "remakeShot") return state;

          const existingVideo = state.nodes.find(
            (node) =>
              node.data.kind === "videoGenerate" &&
              node.data.sourceShotId === shotNode.id,
          );
          if (existingVideo) return { selectedNodeId: existingVideo.id };

          nodeSequence += 1;
          const snapshot = takeSnapshot(state);
          const id = `video-generate-${Date.now()}-${nodeSequence}`;
          const videoDefaults = createNodeData("videoGenerate");
          if (videoDefaults.kind !== "videoGenerate") return state;
          const node: StudioNode = {
            id,
            type: "videoGenerate",
            position: {
              x: shotNode.position.x + 340,
              y: shotNode.position.y + 20,
            },
            data: {
              ...videoDefaults,
              kind: "videoGenerate",
              title: `Generate Shot ${shotNode.data.shotNumber}`,
              model: shotNode.data.model,
              duration: shotNode.data.duration,
              ratio: shotNode.data.ratio,
              quality: shotNode.data.quality,
              resolution: shotNode.data.quality,
              references: shotNode.data.referenceFrames,
              promptInput: shotNode.id,
              imageInput: "",
              videoInput: "",
              sourceShotId: shotNode.id,
            },
          };
          const edge: StudioEdge = {
            id: `edge-${safeNodeIdPart(shotNode.id)}-${safeNodeIdPart(id)}`,
            source: shotNode.id,
            target: id,
            type: "smoothstep",
            animated: true,
          };

          return {
            nodes: [...state.nodes, node],
            edges: [...state.edges, edge],
            selectedNodeId: id,
            past: appendHistory(state.past, snapshot),
            future: [],
            updatedAt: nowIso(),
            dirty: true,
          };
        }),

      createGenerationPlan: (pipelineNodeId) => {
        const state = get();
        if (state.generationQueue.running || state.runtimeRunning) {
          set({ runtimeError: "Wait for the active Studio runtime to finish." });
          return;
        }
        const pipelineNode = state.nodes.find(
          (node) =>
            node.id === pipelineNodeId && node.data.kind === "remakePipeline",
        );
        if (
          !pipelineNode ||
          pipelineNode.data.kind !== "remakePipeline" ||
          pipelineNode.data.status !== "completed"
        ) {
          set({ runtimeError: "Complete the Remake Pipeline plan first." });
          return;
        }
        const videoNodeIds = new Set(pipelineNode.data.videoNodeIds);
        const videoNodes = state.nodes.filter(
          (node) =>
            videoNodeIds.has(node.id) &&
            node.data.kind === "videoGenerate" &&
            !(
              node.data.status === "completed" &&
              Boolean(node.data.videoUrl || node.data.result)
            ),
        );
        if (!videoNodes.length) {
          set({ runtimeError: "This Remake Pipeline has no unfinished Video Nodes." });
          return;
        }
        if (videoNodes.length > MAX_STUDIO_VIDEO_TASKS_PER_RUN) {
          set({
            runtimeError:
              `STUDIO_GENERATION_LIMIT_EXCEEDED: A controlled plan supports at most ${MAX_STUDIO_VIDEO_TASKS_PER_RUN} video tasks.`,
          });
          return;
        }

        const plan = buildStudioGenerationPlan({
          pipelineNodeId,
          projectId: state.projectId || "local",
          videoNodes,
        });
        const plans = saveStudioGenerationPlan(plan);
        const snapshot = takeSnapshot(state);
        const plannedNodeIds = new Set(plan.items.map((item) => item.nodeId));
        set((current) => ({
          generationPlans: plans,
          nodes: current.nodes.map((node) => {
            if (node.id === pipelineNodeId && node.data.kind === "remakePipeline") {
              return {
                ...node,
                data: {
                  ...node.data,
                  generationPlanId: plan.id,
                  estimatedCredits: plan.estimatedCredits,
                  confirmationState: "awaiting",
                  generationStarted: false,
                },
              };
            }
            if (plannedNodeIds.has(node.id) && node.data.kind === "videoGenerate") {
              return {
                ...node,
                data: { ...node.data, queueStatus: "waiting" },
              };
            }
            return node;
          }),
          past: appendHistory(current.past, snapshot),
          future: [],
          dirty: true,
          updatedAt: nowIso(),
          runtimeError: "",
        }));
      },

      startGenerationPlan: async (planId) => {
        const initialState = get();
        if (initialState.generationQueue.running || initialState.runtimeRunning) {
          set({ runtimeError: "Only one Studio runtime or generation queue can run at a time." });
          return;
        }
        if (!STUDIO_GENERATION_ORCHESTRATOR_ENABLED) {
          set({
            runtimeError:
              "STUDIO_GENERATION_DISABLED: Real Studio generation is disabled in this environment.",
          });
          return;
        }
        const plan = initialState.generationPlans.find((item) => item.id === planId);
        if (!plan || plan.status !== "draft") {
          set({ runtimeError: "Create a new waiting Generation Plan before starting." });
          return;
        }
        if (!plan.items.length || plan.items.length > MAX_STUDIO_VIDEO_TASKS_PER_RUN) {
          set({
            runtimeError:
              `STUDIO_GENERATION_LIMIT_EXCEEDED: A controlled run requires 1-${MAX_STUDIO_VIDEO_TASKS_PER_RUN} video tasks.`,
          });
          return;
        }

        const syncPlan = (updatedPlan: StudioGenerationPlan) => {
          const plans = saveStudioGenerationPlan(updatedPlan);
          const runHistory = updatedPlan.confirmedAt
            ? saveStudioRunRecord(createGenerationPlanRunRecord(updatedPlan))
            : get().runHistory;
          const itemStatusByNodeId = new Map(
            updatedPlan.items.map((item) => [item.nodeId, item.status]),
          );
          set((current) => ({
            generationPlans: plans,
            runHistory,
            nodes: current.nodes.map((node) => {
              if (
                node.id === updatedPlan.pipelineNodeId &&
                node.data.kind === "remakePipeline"
              ) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    generationPlanId: updatedPlan.id,
                    estimatedCredits: updatedPlan.estimatedCredits,
                    confirmationState:
                      updatedPlan.status === "cancelled"
                        ? "cancelled"
                        : "confirmed",
                    generationStarted:
                      updatedPlan.status === "confirmed" ||
                      updatedPlan.status === "running",
                    providerCallMade:
                      node.data.providerCallMade ||
                      updatedPlan.items.some((item) => Boolean(item.jobId)),
                  },
                };
              }
              const queueStatus = itemStatusByNodeId.get(node.id);
              if (queueStatus && node.data.kind === "videoGenerate") {
                return {
                  ...node,
                  data: { ...node.data, queueStatus },
                };
              }
              return node;
            }),
            dirty: true,
            updatedAt: nowIso(),
          }));
        };

        const syncRuntime = (runtime: StudioNodeRuntimeState) => {
          set((current) => {
            const applied = applyRuntimeOutputToCanvas(current.nodes, runtime);
            const downstream = applyVideoRuntimeToDownstreamOutputs(
              applied.nodes,
              current.edges,
              runtime,
            );
            const timeline = applyVideoRuntimeToTimeline(current.timeline, runtime);
            const changed = applied.changed || downstream.changed || timeline.changed;
            return {
              runtimeState: {
                ...current.runtimeState,
                [runtime.nodeId]: runtime,
              },
              nodes: downstream.nodes,
              timeline: timeline.timeline,
              dirty: changed ? true : current.dirty,
              updatedAt: changed ? nowIso() : current.updatedAt,
            };
          });
        };

        const updatePlanItem = (
          nodeId: string,
          status: "queued" | "running" | "processing" | "completed" | "failed",
          runtime?: StudioNodeRuntimeState,
        ) => {
          const latestPlan = get().generationPlans.find(
            (candidate) => candidate.id === planId,
          );
          if (!latestPlan || latestPlan.status === "cancelled") return null;
          const timestamp = nowIso();
          const outputs = runtime?.outputs || {};
          const costCredits = Number(outputs.costCredits);
          const creditsBalance = Number(outputs.creditsBalance);
          const updatedPlan: StudioGenerationPlan = {
            ...latestPlan,
            status: "running",
            updatedAt: timestamp,
            items: latestPlan.items.map((candidate) =>
              candidate.nodeId === nodeId
                ? {
                    ...candidate,
                    status,
                    startedAt:
                      status === "running" || status === "processing"
                        ? candidate.startedAt || runtime?.startedAt || timestamp
                        : candidate.startedAt,
                    finishedAt:
                      status === "completed" || status === "failed"
                        ? runtime?.finishedAt || timestamp
                        : candidate.finishedAt,
                    jobId: outputString(outputs, "jobId") || candidate.jobId,
                    costCredits: Number.isFinite(costCredits)
                      ? costCredits
                      : candidate.costCredits,
                    creditsBalance: Number.isFinite(creditsBalance)
                      ? creditsBalance
                      : candidate.creditsBalance,
                    errorCode:
                      status === "failed"
                        ? outputString(outputs, "errorCode") || "PROVIDER_TEMPORARY"
                        : undefined,
                    message:
                      status === "failed"
                        ? outputString(outputs, "message") ||
                          runtime?.error ||
                          "Video generation failed. Studio did not retry it."
                        : undefined,
                  }
                : candidate,
            ),
          };
          syncPlan(updatedPlan);
          return updatedPlan;
        };

        const confirmedAt = nowIso();
        const confirmedPlan: StudioGenerationPlan = {
          ...plan,
          status: "confirmed",
          confirmedAt,
          updatedAt: confirmedAt,
          completedAt: null,
          items: plan.items.map((item) => ({
            ...item,
            status: "waiting",
            startedAt: null,
            finishedAt: null,
            errorCode: undefined,
            message: undefined,
          })),
        };
        set({
          generationQueue: {
            activePlanId: planId,
            running: true,
            maxConcurrent: MAX_CONCURRENT_VIDEO_GENERATIONS,
          },
          runtimeError: "",
        });
        syncPlan(confirmedPlan);
        syncPlan({ ...confirmedPlan, status: "running", updatedAt: nowIso() });

        try {
          for (const item of confirmedPlan.items) {
            const currentPlan = get().generationPlans.find(
              (candidate) => candidate.id === planId,
            );
            if (!currentPlan || currentPlan.status === "cancelled") break;
            if (item.status === "completed") continue;
            const node = get().nodes.find((candidate) => candidate.id === item.nodeId);
            if (!node || node.data.kind !== "videoGenerate") {
              updatePlanItem(item.nodeId, "failed", {
                nodeId: item.nodeId,
                status: "failed",
                startedAt: null,
                finishedAt: nowIso(),
                outputs: {
                  executor: "video_generate",
                  errorCode: "VIDEO_NODE_NOT_FOUND",
                  message: "The planned Video Node no longer exists.",
                },
                error: "The planned Video Node no longer exists.",
              });
              break;
            }

            if (!updatePlanItem(item.nodeId, "queued")) break;
            const result = await runSingleStudioNode({
              projectId: get().projectId,
              nodeId: item.nodeId,
              nodes: get().nodes,
              edges: get().edges,
              onNodeStart: (runtime) => {
                syncRuntime(runtime);
                updatePlanItem(item.nodeId, "running", runtime);
              },
              onNodeProgress: (runtime) => {
                syncRuntime(runtime);
                updatePlanItem(item.nodeId, "processing", runtime);
              },
              onNodeResult: (runtime) => {
                syncRuntime(runtime);
                updatePlanItem(
                  item.nodeId,
                  runtime.status === "completed" ? "completed" : "failed",
                  runtime,
                );
              },
            });
            if (result.status === "failed") break;
          }

          const latestPlan = get().generationPlans.find(
            (candidate) => candidate.id === planId,
          );
          if (latestPlan && latestPlan.status !== "cancelled") {
            const completedAt = nowIso();
            const completed = latestPlan.items.every(
              (item) => item.status === "completed",
            );
            syncPlan({
              ...latestPlan,
              status: completed ? "completed" : "failed",
              updatedAt: completedAt,
              completedAt,
            });
          }
        } finally {
          set((current) => ({
            generationQueue:
              current.generationQueue.activePlanId === planId
                ? {
                    activePlanId: null,
                    running: false,
                    maxConcurrent: MAX_CONCURRENT_VIDEO_GENERATIONS,
                  }
                : current.generationQueue,
          }));
        }
      },

      cancelGenerationPlan: (planId) => {
        const state = get();
        const plan = state.generationPlans.find((item) => item.id === planId);
        if (!plan || plan.status === "completed" || plan.status === "cancelled") return;
        const cancelledAt = nowIso();
        const cancelledPlan: StudioGenerationPlan = {
          ...plan,
          status: "cancelled",
          updatedAt: cancelledAt,
          completedAt: cancelledAt,
          items: plan.items.map((item) =>
            item.status === "completed"
              ? item
              : {
                  ...item,
                  status: "failed",
                  finishedAt: cancelledAt,
                  errorCode: "GENERATION_QUEUE_CANCELLED",
                  message:
                    item.jobId
                      ? "Queue cancelled. The submitted provider job may still finish; Studio will not retry it automatically."
                      : "Generation queue cancelled before this task was submitted.",
                },
          ),
        };
        const plans = saveStudioGenerationPlan(cancelledPlan);
        const runHistory = cancelledPlan.confirmedAt
          ? saveStudioRunRecord(createGenerationPlanRunRecord(cancelledPlan))
          : state.runHistory;
        const cancelledNodeIds = new Set(
          cancelledPlan.items
            .filter((item) => item.status === "failed")
            .map((item) => item.nodeId),
        );
        set((current) => ({
          generationPlans: plans,
          runHistory,
          generationQueue: current.generationQueue,
          nodes: current.nodes.map((node) => {
            if (node.id === plan.pipelineNodeId && node.data.kind === "remakePipeline") {
              return {
                ...node,
                data: { ...node.data, confirmationState: "cancelled" },
              };
            }
            if (cancelledNodeIds.has(node.id) && node.data.kind === "videoGenerate") {
              return {
                ...node,
                data: { ...node.data, queueStatus: "failed" },
              };
            }
            return node;
          }),
          dirty: true,
          updatedAt: nowIso(),
        }));
      },

      addNodeToTimeline: (nodeId) =>
        set((state) => {
          const sourceNode = state.nodes.find((node) => node.id === nodeId);
          if (!sourceNode) return state;
          const created = createTimelineClip(sourceNode, state.nodes);
          if (!created) return state;

          const snapshot = takeSnapshot(state);
          let tracks = state.timeline.tracks;
          if (created.trackType === "video") {
            const videoTrack = tracks.find((track) => track.type === "video");
            const currentClips = videoTrack?.type === "video" ? videoTrack.clips : [];
            const nextTrack: StudioVideoTimelineTrack = {
              id: videoTrack?.id || DEFAULT_VIDEO_TRACK_ID,
              type: "video",
              clips: reflowTimelineClips([...currentClips, created.clip]),
            };
            tracks = videoTrack
              ? tracks.map((track) => (track.type === "video" ? nextTrack : track))
              : [nextTrack, ...tracks];
          } else {
            const audioTrack = tracks.find((track) => track.type === "audio");
            const currentClips = audioTrack?.type === "audio" ? audioTrack.clips : [];
            const start = currentClips.reduce(
              (maximum, clip) => Math.max(maximum, clip.start + clip.duration),
              0,
            );
            const nextTrack: StudioAudioTimelineTrack = {
              id: audioTrack?.id || DEFAULT_AUDIO_TRACK_ID,
              type: "audio",
              clips: [...currentClips, { ...created.clip, start }],
            };
            tracks = audioTrack
              ? tracks.map((track) => (track.type === "audio" ? nextTrack : track))
              : [...tracks, nextTrack];
          }

          return {
            timeline: { tracks },
            selectedTimelineClipId: created.clip.id,
            past: appendHistory(state.past, snapshot),
            future: [],
            dirty: true,
            updatedAt: nowIso(),
          };
        }),

      addSubtitleTimelineClip: ({ text, start, duration }) =>
        set((state) => {
          const cleanText = text.trim().slice(0, 2_000);
          if (!cleanText) return state;
          const snapshot = takeSnapshot(state);
          const subtitleTrack = state.timeline.tracks.find(
            (track) => track.type === "subtitle",
          );
          const clip: StudioSubtitleTimelineClip = {
            id: `subtitle-${Date.now()}-${++nodeSequence}`,
            text: cleanText,
            start: nonNegativeTime(start),
            duration: positiveDuration(duration, 3),
            createdAt: nowIso(),
            style: { fontSize: 32, position: "bottom" },
          };
          const nextTrack: StudioSubtitleTimelineTrack = {
            id: subtitleTrack?.id || DEFAULT_SUBTITLE_TRACK_ID,
            type: "subtitle",
            clips: [
              ...(subtitleTrack?.type === "subtitle" ? subtitleTrack.clips : []),
              clip,
            ].sort((left, right) => left.start - right.start),
          };
          const tracks = subtitleTrack
            ? state.timeline.tracks.map((track) =>
                track.type === "subtitle" ? nextTrack : track,
              )
            : [...state.timeline.tracks, nextTrack];
          return {
            timeline: { tracks },
            selectedTimelineClipId: clip.id,
            past: appendHistory(state.past, snapshot),
            future: [],
            dirty: true,
            updatedAt: nowIso(),
          };
        }),

      moveTimelineClip: (trackId, clipId, direction) =>
        set((state) => {
          const track = state.timeline.tracks.find((item) => item.id === trackId);
          if (!track || track.type !== "video") return state;
          const index = track.clips.findIndex((clip) => clip.id === clipId);
          const targetIndex = direction === "earlier" ? index - 1 : index + 1;
          if (index < 0 || targetIndex < 0 || targetIndex >= track.clips.length) {
            return state;
          }

          const snapshot = takeSnapshot(state);
          const reordered = [...track.clips];
          [reordered[index], reordered[targetIndex]] = [
            reordered[targetIndex],
            reordered[index],
          ];
          return {
            timeline: {
              tracks: state.timeline.tracks.map((item) =>
                item.type === "video" && item.id === trackId
                  ? { ...item, clips: reflowTimelineClips(reordered) }
                  : item,
              ),
            },
            past: appendHistory(state.past, snapshot),
            future: [],
            dirty: true,
            updatedAt: nowIso(),
          };
        }),

      reorderTimelineClip: (trackId, clipId, targetClipId) =>
        set((state) => {
          if (clipId === targetClipId) return state;
          const track = state.timeline.tracks.find((item) => item.id === trackId);
          if (!track || track.type !== "video") return state;
          const sourceIndex = track.clips.findIndex((clip) => clip.id === clipId);
          const targetIndex = track.clips.findIndex((clip) => clip.id === targetClipId);
          if (sourceIndex < 0 || targetIndex < 0) return state;

          const snapshot = takeSnapshot(state);
          const reordered = [...track.clips];
          const [moved] = reordered.splice(sourceIndex, 1);
          reordered.splice(targetIndex, 0, moved);
          return {
            timeline: {
              tracks: state.timeline.tracks.map((item) =>
                item.type === "video" && item.id === trackId
                  ? { ...item, clips: reflowTimelineClips(reordered) }
                  : item,
              ),
            },
            selectedTimelineClipId: clipId,
            past: appendHistory(state.past, snapshot),
            future: [],
            dirty: true,
            updatedAt: nowIso(),
          };
        }),

      selectTimelineClip: (clipId) => set({ selectedTimelineClipId: clipId }),

      deleteTimelineClip: (trackId, clipId) =>
        set((state) => {
          const track = state.timeline.tracks.find((item) => item.id === trackId);
          if (!track || !track.clips.some((clip) => clip.id === clipId)) return state;
          const snapshot = takeSnapshot(state);
          const tracks = state.timeline.tracks.map((item) => {
            if (item.id !== trackId) return item;
            if (item.type === "video") {
              return {
                ...item,
                clips: reflowTimelineClips(
                  item.clips.filter((clip) => clip.id !== clipId),
                ),
              };
            }
            if (item.type === "audio") {
              return {
                ...item,
                clips: item.clips.filter((clip) => clip.id !== clipId),
              };
            }
            return {
              ...item,
              clips: item.clips.filter((clip) => clip.id !== clipId),
            };
          });
          return {
            timeline: { tracks },
            selectedTimelineClipId:
              state.selectedTimelineClipId === clipId
                ? null
                : state.selectedTimelineClipId,
            past: appendHistory(state.past, snapshot),
            future: [],
            dirty: true,
            updatedAt: nowIso(),
          };
        }),

      duplicateTimelineClip: (trackId, clipId) =>
        set((state) => {
          const track = state.timeline.tracks.find((item) => item.id === trackId);
          if (!track || track.type !== "video") return state;
          const sourceIndex = track?.clips.findIndex((clip) => clip.id === clipId) ?? -1;
          const sourceClip = sourceIndex >= 0 ? track?.clips[sourceIndex] : undefined;
          if (!sourceClip) return state;

          const snapshot = takeSnapshot(state);
          const duplicateId = `timeline-clip-${Date.now()}-${++nodeSequence}`;
          const duplicate = {
            ...sourceClip,
            id: duplicateId,
            createdAt: nowIso(),
            metadata: {
              ...sourceClip.metadata,
              title: sourceClip.metadata?.title
                ? `${sourceClip.metadata.title} Copy`
                : "Clip Copy",
            },
          };
          const clips = [...track.clips];
          clips.splice(sourceIndex + 1, 0, duplicate);
          return {
            timeline: {
              tracks: state.timeline.tracks.map((item) =>
                item.type === "video" && item.id === trackId
                  ? { ...item, clips: reflowTimelineClips(clips) }
                  : item,
              ),
            },
            selectedTimelineClipId: duplicateId,
            past: appendHistory(state.past, snapshot),
            future: [],
            dirty: true,
            updatedAt: nowIso(),
          };
        }),

      updateTimelineClip: (trackId, clipId, patch) =>
        set((state) => {
          const track = state.timeline.tracks.find((item) => item.id === trackId);
          if (!track || !track.clips.some((clip) => clip.id === clipId)) return state;
          const snapshot = takeSnapshot(state);
          const tracks = state.timeline.tracks.map((item) => {
            if (item.id !== trackId) return item;
            if (item.type === "video") {
              return {
                ...item,
                clips: item.clips.map((clip) =>
                  clip.id === clipId
                    ? {
                        ...clip,
                        start:
                          patch.start === undefined
                            ? clip.start
                            : nonNegativeTime(patch.start, clip.start),
                        duration:
                          patch.duration === undefined
                            ? clip.duration
                            : positiveDuration(patch.duration, clip.duration),
                      }
                    : clip,
                ),
              };
            }
            if (item.type === "audio") {
              return {
                ...item,
                clips: item.clips.map((clip) =>
                  clip.id === clipId
                    ? {
                        ...clip,
                        start:
                          patch.start === undefined
                            ? clip.start
                            : nonNegativeTime(patch.start, clip.start),
                        duration:
                          patch.duration === undefined
                            ? clip.duration
                            : positiveDuration(patch.duration, clip.duration),
                        metadata: {
                          ...clip.metadata,
                          volume:
                            patch.volume === undefined
                              ? clip.metadata.volume
                              : clampVolume(patch.volume),
                        },
                      }
                    : clip,
                ),
              };
            }
            return {
              ...item,
              clips: item.clips.map((clip) =>
                clip.id === clipId
                  ? {
                      ...clip,
                      text:
                        patch.text === undefined
                          ? clip.text
                          : patch.text.slice(0, 2_000),
                      start:
                        patch.start === undefined
                          ? clip.start
                          : nonNegativeTime(patch.start, clip.start),
                      duration:
                        patch.duration === undefined
                          ? clip.duration
                          : positiveDuration(patch.duration, clip.duration),
                      style: {
                        ...clip.style,
                        fontSize:
                          patch.fontSize === undefined
                            ? clip.style?.fontSize
                            : subtitleFontSize(patch.fontSize),
                        position:
                          patch.position === undefined
                            ? clip.style?.position
                            : subtitlePosition(patch.position),
                      },
                    }
                  : clip,
              ),
            };
          });
          return {
            timeline: { tracks },
            past: appendHistory(state.past, snapshot),
            future: [],
            dirty: true,
            updatedAt: nowIso(),
          };
        }),

      deleteNode: (nodeId) =>
        set((state) => {
          if (!state.nodes.some((node) => node.id === nodeId)) return state;
          const snapshot = takeSnapshot(state);
          return {
            nodes: state.nodes.filter((node) => node.id !== nodeId),
            edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
            selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
            past: appendHistory(state.past, snapshot),
            future: [],
            updatedAt: nowIso(),
            dirty: true,
          };
        }),

      updateNodeData: (nodeId, patch) =>
        set((state) => {
          const snapshot = takeSnapshot(state);
          const nodes = state.nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    ...patch,
                  } as StudioNodeData,
                }
              : node,
          );
          return {
            nodes,
            past: appendHistory(state.past, snapshot),
            future: [],
            updatedAt: nowIso(),
            dirty: true,
          };
        }),

      selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

      onNodesChange: (changes) =>
        set((state) => {
          const recordsDeletion = changes.some((change) => change.type === "remove");
          const changesCanvas = changes.some(
            (change) => change.type === "position" || change.type === "remove",
          );
          const snapshot = recordsDeletion ? takeSnapshot(state) : null;
          const removedIds = new Set(
            changes
              .filter((change) => change.type === "remove")
              .map((change) => change.id),
          );
          return {
            nodes: applyNodeChanges(changes, state.nodes),
            edges: recordsDeletion
              ? state.edges.filter(
                  (edge) => !removedIds.has(edge.source) && !removedIds.has(edge.target),
                )
              : state.edges,
            selectedNodeId:
              state.selectedNodeId && removedIds.has(state.selectedNodeId)
                ? null
                : state.selectedNodeId,
            past: snapshot ? appendHistory(state.past, snapshot) : state.past,
            future: snapshot ? [] : state.future,
            updatedAt: changesCanvas ? nowIso() : state.updatedAt,
            dirty: changesCanvas ? true : state.dirty,
          };
        }),

      onEdgesChange: (changes) =>
        set((state) => {
          const recordsDeletion = changes.some((change) => change.type === "remove");
          const snapshot = recordsDeletion ? takeSnapshot(state) : null;
          return {
            edges: applyEdgeChanges(changes, state.edges),
            past: snapshot ? appendHistory(state.past, snapshot) : state.past,
            future: snapshot ? [] : state.future,
            updatedAt: recordsDeletion ? nowIso() : state.updatedAt,
            dirty: recordsDeletion ? true : state.dirty,
          };
        }),

      onConnect: (connection) =>
        set((state) => {
          if (
            !connection.source ||
            !connection.target ||
            connection.source === connection.target
          ) {
            return state;
          }
          const snapshot = takeSnapshot(state);
          return {
            edges: addEdge(
              {
                ...connection,
                id:
                  "edge-" +
                  connection.source +
                  "-" +
                  connection.target +
                  "-" +
                  Date.now(),
                type: "smoothstep",
                animated: true,
              },
              state.edges,
            ),
            past: appendHistory(state.past, snapshot),
            future: [],
            updatedAt: nowIso(),
            dirty: true,
          };
        }),

      setViewport: (viewport) => set({ viewport, updatedAt: nowIso(), dirty: true }),

      rememberSnapshot: (snapshot) =>
        set((state) => ({
          past: appendHistory(state.past, snapshot),
          future: [],
          updatedAt: nowIso(),
        })),

      setProjectName: (projectName) =>
        set({ projectName: projectName.slice(0, 180), dirty: true }),

      setProjects: (projects) => set({ projects }),

      setSaving: (saving) => set({ saving }),

      setLoadingProject: (loadingProject) => set({ loadingProject }),

      setProjectError: (projectError) => set({ projectError }),

      clearRuntimeError: () => set({ runtimeError: "" }),

      loadProject: (project) =>
        set({
          projectId: project.id,
          projectName: project.name,
          nodes: normalizeStudioNodes(project.canvasJson.nodes),
          edges: project.canvasJson.edges,
          viewport: project.canvasJson.viewport,
          timeline: normalizeStudioTimeline(project.canvasJson.timeline),
          updatedAt: project.updatedAt,
          selectedNodeId: null,
          past: [],
          future: [],
          dirty: false,
          projectError: "",
          runtimeState: {},
          runtimeRunning: false,
          runLockState: "idle",
          runtimeError: "",
          selectedTimelineClipId: null,
        }),

      loadTemplateCanvas: (canvas) =>
        set((state) => ({
          nodes: normalizeStudioNodes(canvas.nodes),
          edges: canvas.edges,
          viewport: canvas.viewport || defaultViewport,
          timeline: normalizeStudioTimeline(canvas.timeline),
          selectedNodeId: null,
          past: appendHistory(state.past, takeSnapshot(state)),
          future: [],
          dirty: true,
          updatedAt: nowIso(),
          runtimeState: {},
          runtimeRunning: false,
          runLockState: "idle",
          runtimeError: "",
          selectedTimelineClipId: null,
        })),

      markProjectSaved: (project) =>
        set({
          projectId: project.id,
          projectName: project.name,
          updatedAt: project.updatedAt,
          dirty: false,
          projectError: "",
        }),

      undo: () =>
        set((state) => {
          const previous = state.past.at(-1);
          if (!previous) return state;
          return {
            ...previous,
            selectedNodeId: null,
            selectedTimelineClipId: null,
            past: state.past.slice(0, -1),
            future: [takeSnapshot(state), ...state.future].slice(0, historyLimit),
            updatedAt: nowIso(),
            dirty: true,
          };
        }),

      redo: () =>
        set((state) => {
          const next = state.future[0];
          if (!next) return state;
          return {
            ...next,
            selectedNodeId: null,
            selectedTimelineClipId: null,
            past: appendHistory(state.past, takeSnapshot(state)),
            future: state.future.slice(1),
            updatedAt: nowIso(),
            dirty: true,
          };
        }),

      setHasHydrated: (hasHydrated) =>
        set({
          hasHydrated,
          runHistory: hasHydrated ? listStudioRunHistory() : [],
          generationPlans: hasHydrated ? listStudioGenerationPlans() : [],
        }),

      runNodes: async () => {
        const state = get();
        if (state.runtimeRunning || state.generationQueue.running) {
          set({ runLockState: "locked" });
          return;
        }

        const readyState = Object.fromEntries(
          state.nodes.map((node) => {
            getStudioExecutor(node.type);
            return [
              node.id,
              {
                nodeId: node.id,
                status: "ready" as NodeExecutionStatus,
                startedAt: null,
                finishedAt: null,
                outputs: {},
              } satisfies StudioNodeRuntimeState,
            ];
          }),
        );

        let runRecord = createRunRecord(state.nodes, state.projectId, "graph");
        const publishRunRecord = (record: StudioRunRecord) => {
          runRecord = record;
          set({ runHistory: saveStudioRunRecord(record) });
        };
        publishRunRecord(runRecord);

        set({
          runtimeState: readyState,
          runtimeRunning: true,
          runLockState: "running",
          runtimeError: "",
        });

        try {
          await runStudioGraph({
            projectId: state.projectId,
            nodes: state.nodes,
            edges: state.edges,
            onNodeStart: (nodeRuntime) => {
              publishRunRecord(updateRunRecordNode(runRecord, nodeRuntime));
              set((current) => ({
                runtimeState: {
                  ...current.runtimeState,
                  [nodeRuntime.nodeId]: nodeRuntime,
                },
              }));
            },
            onNodeProgress: (nodeRuntime) => {
              publishRunRecord(updateRunRecordNode(runRecord, nodeRuntime));
              set((current) => {
                const canvas = applyRuntimeOutputToCanvas(current.nodes, nodeRuntime);
                return {
                  runtimeState: {
                    ...current.runtimeState,
                    [nodeRuntime.nodeId]: nodeRuntime,
                  },
                  nodes: canvas.nodes,
                  dirty: canvas.changed ? true : current.dirty,
                  updatedAt: canvas.changed ? nowIso() : current.updatedAt,
                };
              });
            },
            onNodeResult: (nodeRuntime) => {
              publishRunRecord(updateRunRecordNode(runRecord, nodeRuntime));
              set((current) => {
                const canvas = applyRuntimeOutputToCanvas(current.nodes, nodeRuntime);
                const materialized =
                  nodeRuntime.status === "completed"
                    ? materializeRemakeShotNodes(canvas.nodes, current.edges, nodeRuntime)
                    : { changed: false, nodes: canvas.nodes, edges: current.edges };
                const pipelinePlan =
                  nodeRuntime.status === "completed"
                    ? materializeRemakePipelinePlan(
                        materialized.nodes,
                        materialized.edges,
                        current.timeline,
                        nodeRuntime,
                      )
                    : {
                        changed: false,
                        nodes: materialized.nodes,
                        edges: materialized.edges,
                        timeline: current.timeline,
                      };
                const changed =
                  canvas.changed || materialized.changed || pipelinePlan.changed;
                return {
                  runtimeState: {
                    ...current.runtimeState,
                    [nodeRuntime.nodeId]: nodeRuntime,
                  },
                  nodes: pipelinePlan.nodes,
                  edges: pipelinePlan.edges,
                  timeline: pipelinePlan.timeline,
                  dirty: changed ? true : current.dirty,
                  updatedAt: changed ? nowIso() : current.updatedAt,
                };
              });
            },
          });
          publishRunRecord({
            ...runRecord,
            status: runRecord.nodes.some((node) => node.status === "failed")
              ? "failed"
              : "completed",
          });
        } catch (error) {
          publishRunRecord({ ...runRecord, status: "failed" });
          set({
            runtimeError:
              error instanceof Error ? error.message : "Studio runtime failed",
          });
        } finally {
          set({ runtimeRunning: false, runLockState: "idle" });
        }
      },

      retryNode: async (nodeId) => {
        const state = get();
        if (state.runtimeRunning || state.generationQueue.running) {
          set({ runLockState: "locked" });
          return;
        }

        const node = state.nodes.find((item) => item.id === nodeId);
        if (!node) {
          set({ runtimeError: "The node no longer exists." });
          return;
        }
        const persistedStatus =
          "status" in node.data ? String(node.data.status || "") : "";
        const runtimeStatus = state.runtimeState[nodeId]?.status;
        if (persistedStatus !== "failed" && runtimeStatus !== "failed") {
          set({ runtimeError: "Only failed nodes can be retried." });
          return;
        }

        let runRecord = createRunRecord([node], state.projectId, "retry");
        const publishRunRecord = (record: StudioRunRecord) => {
          runRecord = record;
          set({ runHistory: saveStudioRunRecord(record) });
        };
        publishRunRecord(runRecord);

        const preflight = getStudioRetryPreflight(
          nodeId,
          state.nodes,
          state.edges,
        );
        if (!preflight.ok) {
          const failedRuntime: StudioNodeRuntimeState = {
            nodeId,
            status: "failed",
            startedAt: nowIso(),
            finishedAt: nowIso(),
            outputs: {
              errorCode: preflight.errorCode,
              message: preflight.message,
            },
            error: preflight.message,
          };
          publishRunRecord({
            ...updateRunRecordNode(runRecord, failedRuntime),
            status: "failed",
          });
          set((current) => ({
            runtimeState: {
              ...current.runtimeState,
              [nodeId]: failedRuntime,
            },
            runtimeError: preflight.message,
            runLockState: "idle",
          }));
          return;
        }

        set((current) => ({
          runtimeRunning: true,
          runLockState: "running",
          runtimeError: "",
          runtimeState: {
            ...current.runtimeState,
            [nodeId]: {
              nodeId,
              status: "ready",
              startedAt: null,
              finishedAt: null,
              outputs: {},
            },
          },
        }));

        try {
          await runSingleStudioNode({
            projectId: state.projectId,
            nodeId,
            nodes: state.nodes,
            edges: state.edges,
            onNodeStart: (nodeRuntime) => {
              publishRunRecord(updateRunRecordNode(runRecord, nodeRuntime));
              set((current) => ({
                runtimeState: {
                  ...current.runtimeState,
                  [nodeId]: nodeRuntime,
                },
              }));
            },
            onNodeProgress: (nodeRuntime) => {
              publishRunRecord(updateRunRecordNode(runRecord, nodeRuntime));
              set((current) => {
                const canvas = applyRuntimeOutputToCanvas(current.nodes, nodeRuntime);
                return {
                  runtimeState: {
                    ...current.runtimeState,
                    [nodeId]: nodeRuntime,
                  },
                  nodes: canvas.nodes,
                  dirty: canvas.changed ? true : current.dirty,
                  updatedAt: canvas.changed ? nowIso() : current.updatedAt,
                };
              });
            },
            onNodeResult: (nodeRuntime) => {
              publishRunRecord(updateRunRecordNode(runRecord, nodeRuntime));
              set((current) => {
                const canvas = applyRuntimeOutputToCanvas(current.nodes, nodeRuntime);
                const materialized =
                  nodeRuntime.status === "completed"
                    ? materializeRemakeShotNodes(canvas.nodes, current.edges, nodeRuntime)
                    : { changed: false, nodes: canvas.nodes, edges: current.edges };
                const pipelinePlan =
                  nodeRuntime.status === "completed"
                    ? materializeRemakePipelinePlan(
                        materialized.nodes,
                        materialized.edges,
                        current.timeline,
                        nodeRuntime,
                      )
                    : {
                        changed: false,
                        nodes: materialized.nodes,
                        edges: materialized.edges,
                        timeline: current.timeline,
                      };
                const changed =
                  canvas.changed || materialized.changed || pipelinePlan.changed;
                return {
                  runtimeState: {
                    ...current.runtimeState,
                    [nodeId]: nodeRuntime,
                  },
                  nodes: pipelinePlan.nodes,
                  edges: pipelinePlan.edges,
                  timeline: pipelinePlan.timeline,
                  dirty: changed ? true : current.dirty,
                  updatedAt: changed ? nowIso() : current.updatedAt,
                };
              });
            },
          });
          publishRunRecord({
            ...runRecord,
            status: runRecord.nodes.some((item) => item.status === "failed")
              ? "failed"
              : "completed",
          });
        } catch (error) {
          publishRunRecord({ ...runRecord, status: "failed" });
          set({
            runtimeError:
              error instanceof Error ? error.message : "Studio retry failed",
          });
        } finally {
          set({ runtimeRunning: false, runLockState: "idle" });
        }
      },
    }),
    {
      name: STUDIO_CANVAS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        projectId: state.projectId,
        projectName: state.projectName,
        nodes: state.nodes,
        edges: state.edges,
        viewport: state.viewport,
        timeline: state.timeline,
        updatedAt: state.updatedAt,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<StudioState>;
        return {
          ...currentState,
          ...persisted,
          nodes: normalizeStudioNodes(persisted.nodes || currentState.nodes),
          timeline: normalizeStudioTimeline(persisted.timeline),
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function getCurrentStudioSnapshot() {
  return takeSnapshot(useStudioStore.getState());
}

export function getCurrentStudioCanvasJson(): StudioCanvasJson {
  const state = useStudioStore.getState();
  return {
    version: STUDIO_CANVAS_VERSION,
    nodes: state.nodes,
    edges: state.edges,
    viewport: state.viewport,
    timeline: state.timeline,
  };
}

export function useStudioNodeRuntimeStatus(
  nodeId: string,
  fallbackStatus: NodeExecutionStatus = "idle",
) {
  return useStudioStore(
    (state) => state.runtimeState[nodeId]?.status || fallbackStatus,
  );
}
