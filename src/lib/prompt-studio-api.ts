import { apiRequest } from "@/lib/api";

export type PromptStudioEngine = {
  id: "seedance" | "higgsfield" | "gpt-image" | "nano-banana" | string;
  name: string;
  target: "video" | "image" | string;
  description: string;
};

export type PromptStudioLibraryItem = {
  id: string;
  nameZh: string;
  category: string;
  categoryId: string;
  kind: "style" | "module" | string;
  path: string;
  recommended?: boolean;
};

export type PromptStudioCatalog = {
  engines: PromptStudioEngine[];
  libraryCategories: Array<{
    id: string;
    nameZh: string;
    kind: "style" | "module" | string;
    count: number;
  }>;
  styles: PromptStudioLibraryItem[];
  modules: PromptStudioLibraryItem[];
  recommendedStyles: PromptStudioLibraryItem[];
  aspectRatios: string[];
  shotTypes: string[];
  cameraMoves: string[];
};

export type PromptStudioGenerateRequest = {
  intent: string;
  target: "video" | "image" | "storyboard";
  engine: "seedance" | "higgsfield" | "gpt-image" | "nano-banana";
  aspectRatio?: string;
  selectedStyles?: string[];
  selectedModules?: string[];
  duration?: string;
  language?: "zh" | "en";
  mode?: "basic" | "standard" | "enhanced" | "all";
};

export type PromptStudioGenerateResult = {
  basicPrompt: string;
  standardPrompt: string;
  enhancedPrompt: string;
  negativePrompt?: string;
  detectedSignals?: {
    scenes: string[];
    actions: string[];
    styles: string[];
    lighting: string[];
    mood: string[];
    subjects: string[];
  };
  usageTips: string[];
  selectedKnowledge: Array<{
    id: string;
    nameZh: string;
    category: string;
    path: string;
    summary: string;
  }>;
  warnings: string[];
};

export async function fetchPromptStudioCatalog() {
  const payload = await apiRequest<PromptStudioCatalog>("/api/prompt-studio/catalog", {
    token: "",
  });
  return payload.data;
}

export async function generatePromptStudioPrompt(input: PromptStudioGenerateRequest) {
  const payload = await apiRequest<PromptStudioGenerateResult>("/api/prompt-studio/generate", {
    method: "POST",
    token: "",
    body: JSON.stringify(input),
  });
  return payload.data;
}
