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
import type {
  StudioCanvasJson,
  StudioCanvasSnapshot,
  StudioEdge,
  StudioNode,
  StudioNodeData,
  StudioNodeType,
  StudioProject,
  StudioProjectSummary,
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
  if (type === "imageGenerate") {
    return {
      kind: "imageGenerate",
      title: "Image generation",
      model: "Model placeholder",
      promptInput: "prompt-1",
      assetInput: "asset-1",
      status: "idle",
      result: "",
    };
  }
  if (type === "videoGenerate") {
    return {
      kind: "videoGenerate",
      title: "Video generation",
      model: "Model placeholder",
      promptInput: "prompt-1",
      imageInput: "asset-1",
      videoInput: "",
      status: "idle",
      result: "",
    };
  }
  return {
    kind: "output",
    title: "Workflow output",
    resultPreview: "Awaiting an upstream result",
    outputType: "video",
    createdAt: "",
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
  addNode: (type: StudioNodeType) => void;
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
  loadProject: (project: StudioProject) => void;
  markProjectSaved: (project: StudioProject) => void;
  undo: () => void;
  redo: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

const initialNodes = createInitialNodes();
const initialEdges = createInitialEdges();

export const useStudioStore = create<StudioState>()(
  persist(
    (set) => ({
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

      loadProject: (project) =>
        set({
          projectId: project.id,
          projectName: project.name,
          nodes: project.canvasJson.nodes,
          edges: project.canvasJson.edges,
          viewport: project.canvasJson.viewport,
          updatedAt: project.updatedAt,
          selectedNodeId: null,
          past: [],
          future: [],
          dirty: false,
          projectError: "",
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
