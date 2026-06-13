export type CanvasNodeType = "prompt" | "image" | "video" | "history";

export type CanvasNode = {
  id: string;
  type: CanvasNodeType;
  title: string;
  prompt?: string;
  model?: string;
  ratio?: string;
  quality?: string;
  duration?: number;
  resolution?: string;
};

export type CanvasPosition = {
  x: number;
  y: number;
};

export type CanvasWorkflow = {
  version: "1";
  selectedNodeId: string;
  nodes: Record<string, CanvasNode>;
  positions: Record<string, CanvasPosition>;
  updatedAt: string;
};

export type CanvasTemplateId = "short-video" | "anime-shot" | "movie-scene" | "product-video";

export type CanvasTemplate = {
  id: CanvasTemplateId;
  index: string;
  titleKey: CanvasI18nKey;
  descriptionKey: CanvasI18nKey;
  promptKey: CanvasI18nKey;
  image: Pick<CanvasNode, "model" | "ratio" | "quality">;
  video: Pick<CanvasNode, "model" | "ratio" | "quality" | "duration" | "resolution">;
};

export type CanvasI18nKey =
  | "canvas.template.shortVideo.title"
  | "canvas.template.shortVideo.description"
  | "canvas.template.shortVideo.prompt"
  | "canvas.template.animeShot.title"
  | "canvas.template.animeShot.description"
  | "canvas.template.animeShot.prompt"
  | "canvas.template.movieScene.title"
  | "canvas.template.movieScene.description"
  | "canvas.template.movieScene.prompt"
  | "canvas.template.productVideo.title"
  | "canvas.template.productVideo.description"
  | "canvas.template.productVideo.prompt";
