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
import { getStudioExecutor } from "@/features/studio/runtime/executorRegistry";
import { runStudioGraph } from "@/features/studio/runtime/runStudioGraph";
import type {
  NodeExecutionStatus,
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
} from "@/features/studio/types/studioTypes";

export const SHADOWEDGE_STUDIO_CANVAS_STORAGE_KEY = "shadowedge_studio_canvas_v1";

export function getStudioCanvasStorageKey(brandId: BrandId) {
  return brandId === "shadowedge"
    ? SHADOWEDGE_STUDIO_CANVAS_STORAGE_KEY
    : brandId + "_studio_canvas_v1";
}

export const STUDIO_CANVAS_STORAGE_KEY = getStudioCanvasStorageKey(activeBrand.id);

const defaultViewport: Viewport = { x: 8, y: 36, zoom: 0.82 };
const historyLimit = 50;
let nodeSequence = 0;

function nowIso() {
  return new Date().toISOString();
}

function createNodeData(type: StudioNodeType): StudioNodeData {
  if (type === "asset") {
    return {
      kind: "asset",
      title: "Reference asset",
      assetId: "",
      assetType: "image",
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

function takeSnapshot(state: Pick<StudioState, "nodes" | "edges" | "viewport" | "updatedAt">): StudioCanvasSnapshot {
  return {
    nodes: state.nodes,
    edges: state.edges,
    viewport: state.viewport,
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
  runtimeError: string;
  addNode: (type: StudioNodeType) => void;
  addAssetNode: (asset: StudioAssetItem) => void;
  createAssetFromVideoNode: (nodeId: string) => void;
  createVideoNodeFromRemakeShot: (nodeId: string) => void;
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
  markProjectSaved: (project: StudioProject) => void;
  undo: () => void;
  redo: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  runNodes: () => Promise<void>;
};

const initialNodes = createInitialNodes();
const initialEdges = createInitialEdges();

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      nodes: initialNodes,
      edges: initialEdges,
      viewport: defaultViewport,
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
      runtimeError: "",

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

      createAssetFromVideoNode: (nodeId) =>
        set((state) => {
          const sourceNode = state.nodes.find(
            (node) => node.id === nodeId && node.data.kind === "videoGenerate",
          );
          if (!sourceNode || sourceNode.data.kind !== "videoGenerate") return state;
          const videoUrl = sourceNode.data.videoUrl || sourceNode.data.result;
          if (sourceNode.data.status !== "completed" || !videoUrl) return state;

          const existingAsset = state.nodes.find(
            (node) =>
              node.data.kind === "asset" &&
              node.data.metadata?.sourceNodeId === sourceNode.id,
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
              assetId: sourceNode.data.jobId || `generated:${sourceNode.id}`,
              assetType: "video",
              status: "ready",
              url: videoUrl,
              thumbnail: sourceNode.data.thumbnail || videoUrl,
              source: "generated",
              metadata: {
                sourceNodeId: sourceNode.id,
                jobId: sourceNode.data.jobId,
                model: sourceNode.data.model,
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
          updatedAt: project.updatedAt,
          selectedNodeId: null,
          past: [],
          future: [],
          dirty: false,
          projectError: "",
          runtimeState: {},
          runtimeRunning: false,
          runtimeError: "",
        }),

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
            past: appendHistory(state.past, takeSnapshot(state)),
            future: state.future.slice(1),
            updatedAt: nowIso(),
            dirty: true,
          };
        }),

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      runNodes: async () => {
        const state = get();
        if (state.runtimeRunning) return;

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

        set({
          runtimeState: readyState,
          runtimeRunning: true,
          runtimeError: "",
        });

        try {
          await runStudioGraph({
            projectId: state.projectId,
            nodes: state.nodes,
            edges: state.edges,
            onNodeStart: (nodeRuntime) =>
              set((current) => ({
                runtimeState: {
                  ...current.runtimeState,
                  [nodeRuntime.nodeId]: nodeRuntime,
                },
              })),
            onNodeProgress: (nodeRuntime) =>
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
              }),
            onNodeResult: (nodeRuntime) =>
              set((current) => {
                const canvas = applyRuntimeOutputToCanvas(current.nodes, nodeRuntime);
                const materialized =
                  nodeRuntime.status === "completed"
                    ? materializeRemakeShotNodes(canvas.nodes, current.edges, nodeRuntime)
                    : { changed: false, nodes: canvas.nodes, edges: current.edges };
                const changed = canvas.changed || materialized.changed;
                return {
                  runtimeState: {
                    ...current.runtimeState,
                    [nodeRuntime.nodeId]: nodeRuntime,
                  },
                  nodes: materialized.nodes,
                  edges: materialized.edges,
                  dirty: changed ? true : current.dirty,
                  updatedAt: changed ? nowIso() : current.updatedAt,
                };
              }),
          });
        } catch (error) {
          set({
            runtimeError:
              error instanceof Error ? error.message : "Studio runtime failed",
          });
        } finally {
          set({ runtimeRunning: false });
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
        updatedAt: state.updatedAt,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<StudioState>;
        return {
          ...currentState,
          ...persisted,
          nodes: normalizeStudioNodes(persisted.nodes || currentState.nodes),
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
    version: 1,
    nodes: state.nodes,
    edges: state.edges,
    viewport: state.viewport,
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
