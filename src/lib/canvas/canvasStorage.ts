import type { CanvasNode, CanvasPosition, CanvasWorkflow } from "@/components/canvas/canvasTypes";

export const CANVAS_WORKFLOW_STORAGE_KEY = "shadowedge_next_canvas_workflow_v1";

const defaultPositions: Record<string, CanvasPosition> = {
  prompt: { x: 32, y: 74 },
  image: { x: 332, y: 130 },
  video: { x: 648, y: 288 },
  history: { x: 426, y: 480 },
};

function nowIso() {
  return new Date().toISOString();
}

export function createDefaultCanvasWorkflow(): CanvasWorkflow {
  const nodes: Record<string, CanvasNode> = {
    prompt: {
      id: "prompt",
      type: "prompt",
      title: "Prompt Node",
      prompt: "A cinematic product reveal with warm rim light.",
    },
    image: {
      id: "image",
      type: "image",
      title: "Image Node",
      model: "Auto",
      ratio: "16:9",
      quality: "standard",
    },
    video: {
      id: "video",
      type: "video",
      title: "Video Node",
      model: "Seedance 2.0",
      duration: 5,
      ratio: "16:9",
      quality: "standard",
      resolution: "720p",
    },
    history: {
      id: "history",
      type: "history",
      title: "History Node",
    },
  };

  return {
    version: "1",
    selectedNodeId: "prompt",
    nodes,
    positions: { ...defaultPositions },
    updatedAt: nowIso(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeNode(id: string, value: unknown, fallback: CanvasNode): CanvasNode {
  if (!isRecord(value)) return fallback;
  const type = value.type === "prompt" || value.type === "image" || value.type === "video" || value.type === "history" ? value.type : fallback.type;
  return {
    ...fallback,
    id,
    type,
    title: typeof value.title === "string" && value.title.trim() ? value.title : fallback.title,
    prompt: typeof value.prompt === "string" ? value.prompt : fallback.prompt,
    model: typeof value.model === "string" ? value.model : fallback.model,
    ratio: typeof value.ratio === "string" ? value.ratio : fallback.ratio,
    quality: typeof value.quality === "string" ? value.quality : fallback.quality,
    duration: typeof value.duration === "number" && Number.isFinite(value.duration) ? value.duration : fallback.duration,
    resolution: typeof value.resolution === "string" ? value.resolution : fallback.resolution,
  };
}

function normalizePosition(value: unknown, fallback: CanvasPosition): CanvasPosition {
  if (!isRecord(value)) return fallback;
  const x = typeof value.x === "number" && Number.isFinite(value.x) ? value.x : fallback.x;
  const y = typeof value.y === "number" && Number.isFinite(value.y) ? value.y : fallback.y;
  return {
    x: Math.round(Math.max(0, x)),
    y: Math.round(Math.max(0, y)),
  };
}

export function normalizeCanvasWorkflow(value: unknown): CanvasWorkflow {
  const fallback = createDefaultCanvasWorkflow();
  if (!isRecord(value)) return fallback;
  const rawNodes = isRecord(value.nodes) ? value.nodes : {};
  const rawPositions = isRecord(value.positions) ? value.positions : {};

  const nodes = Object.fromEntries(
    Object.entries(fallback.nodes).map(([id, node]) => [id, normalizeNode(id, rawNodes[id], node)]),
  ) as Record<string, CanvasNode>;

  const positions = Object.fromEntries(
    Object.entries(fallback.positions).map(([id, position]) => [id, normalizePosition(rawPositions[id], position)]),
  ) as Record<string, CanvasPosition>;

  const selectedNodeId =
    typeof value.selectedNodeId === "string" && nodes[value.selectedNodeId] ? value.selectedNodeId : fallback.selectedNodeId;

  return {
    version: "1",
    selectedNodeId,
    nodes,
    positions,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : fallback.updatedAt,
  };
}

export function readCanvasWorkflow(): CanvasWorkflow {
  if (typeof window === "undefined") return createDefaultCanvasWorkflow();
  try {
    const raw = window.localStorage.getItem(CANVAS_WORKFLOW_STORAGE_KEY);
    if (!raw) return createDefaultCanvasWorkflow();
    return normalizeCanvasWorkflow(JSON.parse(raw));
  } catch {
    return createDefaultCanvasWorkflow();
  }
}

export function saveCanvasWorkflow(workflow: CanvasWorkflow) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(CANVAS_WORKFLOW_STORAGE_KEY, JSON.stringify(workflow));
    return true;
  } catch {
    return false;
  }
}

export function withCanvasUpdatedAt(workflow: CanvasWorkflow): CanvasWorkflow {
  return {
    ...workflow,
    updatedAt: nowIso(),
  };
}
