import type { Edge, Node, Viewport } from "@xyflow/react";

export type StudioNodeType =
  | "asset"
  | "prompt"
  | "imageGenerate"
  | "videoGenerate"
  | "output";

export type AssetType = "image" | "video" | "audio";
export type AssetStatus = "ready" | "missing" | "processing";
export type StudioAssetSource = "upload" | "history" | "generated" | "remake";
export type GenerationNodeStatus = "idle" | "ready" | "processing" | "completed" | "failed";
export type OutputType = "image" | "video" | "audio";

type StudioNodeBase = {
  title: string;
};

export type AssetNodeData = StudioNodeBase & {
  kind: "asset";
  assetId: string;
  assetType: AssetType;
  status: AssetStatus;
  url: string;
  thumbnail?: string;
  source: StudioAssetSource;
  metadata: Record<string, unknown>;
};

export type StudioAssetItem = {
  id: string;
  type: AssetType;
  name: string;
  url: string;
  thumbnail?: string;
  source: StudioAssetSource;
  createdAt?: string;
  status: AssetStatus;
  metadata: Record<string, unknown>;
};

export type PromptNodeData = StudioNodeBase & {
  kind: "prompt";
  prompt: string;
  style: string;
  camera: string;
  duration: number;
  ratio: string;
};

export type ImageGenerateNodeData = StudioNodeBase & {
  kind: "imageGenerate";
  model: string;
  ratio: string;
  quality: string;
  size: string;
  count: number;
  promptInput: string;
  assetInput: string;
  status: GenerationNodeStatus;
  result: string;
  jobId: string;
  imageUrl: string;
  thumbnail: string;
  errorCode: string;
  errorMessage: string;
};

export type VideoGenerateNodeData = StudioNodeBase & {
  kind: "videoGenerate";
  model: string;
  promptInput: string;
  imageInput: string;
  videoInput: string;
  status: GenerationNodeStatus;
  result: string;
};

export type OutputNodeData = StudioNodeBase & {
  kind: "output";
  resultPreview: string;
  outputType: OutputType;
  createdAt: string;
};

export type StudioNodeData = (
  | AssetNodeData
  | PromptNodeData
  | ImageGenerateNodeData
  | VideoGenerateNodeData
  | OutputNodeData
) &
  Record<string, unknown>;

export type StudioNode = Node<StudioNodeData, StudioNodeType>;
export type StudioEdge = Edge;

export type StudioCanvasSnapshot = {
  nodes: StudioNode[];
  edges: StudioEdge[];
  viewport: Viewport;
  updatedAt: string;
};

export type StudioCanvasJson = {
  version: number | string;
  nodes: StudioNode[];
  edges: StudioEdge[];
  viewport: Viewport;
};

export type StudioProjectSummary = {
  id: string;
  name: string;
  thumbnail: string | null;
  updatedAt: string;
};

export type StudioProject = StudioProjectSummary & {
  canvasJson: StudioCanvasJson;
  createdAt: string;
};

export const STUDIO_NODE_DEFINITIONS: Array<{
  type: StudioNodeType;
  label: string;
  description: string;
}> = [
  {
    type: "asset",
    label: "Asset",
    description: "Image, video, or audio input",
  },
  {
    type: "prompt",
    label: "Prompt",
    description: "Creative direction and shot settings",
  },
  {
    type: "imageGenerate",
    label: "Image Generate",
    description: "Image generation through the existing API",
  },
  {
    type: "videoGenerate",
    label: "Video Generate",
    description: "UI-only video generation step",
  },
  {
    type: "output",
    label: "Output",
    description: "Final result placeholder",
  },
];
