import type { Edge, Node, Viewport } from "@xyflow/react";

export type StudioNodeType =
  | "asset"
  | "prompt"
  | "imageGenerate"
  | "videoGenerate"
  | "output";

export type AssetType = "image" | "video" | "audio";
export type AssetStatus = "ready" | "missing" | "processing";
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
  promptInput: string;
  assetInput: string;
  status: GenerationNodeStatus;
  result: string;
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
    description: "UI-only image generation step",
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
