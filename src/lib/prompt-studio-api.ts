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
  advancedControls?: PromptStudioAdvancedControlSets;
};

export type PromptStudioAdvancedOption = {
  id: string;
  labelZh: string;
  labelEn: string;
  prompt?: string;
};

export type PromptStudioAdvancedControlSets = {
  shotSizes?: PromptStudioAdvancedOption[];
  cameraAngles?: PromptStudioAdvancedOption[];
  cameraMoves?: PromptStudioAdvancedOption[];
  lightingOptions?: PromptStudioAdvancedOption[];
  colorTones?: PromptStudioAdvancedOption[];
  moods?: PromptStudioAdvancedOption[];
  timeWeather?: PromptStudioAdvancedOption[];
  subjects?: PromptStudioAdvancedOption[];
};

export type PromptStudioMode = "generate" | "optimize" | "convert" | "layerEdit" | "storyboard" | "styleCard" | "all";

export type PromptStudioAdvancedControls = {
  shotSize?: string;
  cameraAngle?: string;
  cameraMove?: string;
  lighting?: string;
  colorTone?: string;
  mood?: string;
  timeWeather?: string;
  subject?: string;
};

export type PromptStudioGenerateRequest = {
  intent?: string;
  existingPrompt?: string;
  target: "video" | "image" | "storyboard";
  engine: "seedance" | "higgsfield" | "gpt-image" | "nano-banana";
  aspectRatio?: string;
  selectedStyles?: string[];
  selectedModules?: string[];
  duration?: string;
  language?: "zh" | "en";
  mode?: PromptStudioMode | "basic" | "standard" | "enhanced";
  transformGoal?: string;
  layerEditType?: "lighting" | "color" | "composition" | "camera" | "mood" | "style" | string;
  preserveOriginal?: boolean;
  advancedControls?: PromptStudioAdvancedControls;
};

export type PromptStudioStoryboardShot = {
  shotNumber: number;
  title: string;
  storyPurpose: string;
  keyframeImagePrompt: string;
  videoPrompt: string;
  cameraMove: string;
  durationHint: string;
  continuityNotes: string;
};

export type PromptStudioStyleBible = {
  visualStyle: string;
  colorPalette: string;
  lightingRules: string;
  cameraRules: string;
  continuityRules: string;
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
    keyPhrases?: string[];
    appliedAs?: string;
    knowledgeProfile?: PromptStudioKnowledgeProfile;
  }>;
  warnings: string[];
  mode?: PromptStudioMode;
  target?: string;
  engine?: string;
  diagnosis?: string[];
  optimizedPrompt?: string;
  changes?: string[];
  convertedPrompt?: string;
  preservedElements?: string[];
  changedElements?: string[];
  revisedPrompt?: string;
  unchangedElements?: string[];
  editedLayer?: {
    type: string;
    instruction: string;
  };
  styleBible?: PromptStudioStyleBible;
  shots?: PromptStudioStoryboardShot[];
  continuityChecklist?: string[];
};

export type PromptStudioKnowledgeProfile = {
  visualLanguage?: string[];
  cinematography?: string[];
  lighting?: string[];
  composition?: string[];
  colorGrading?: string[];
  textureAndMedium?: string[];
  cameraMovement?: string[];
  characterDirection?: string[];
  continuityRules?: string[];
  negativeConstraints?: string[];
  usageTips?: string[];
};

export type PromptStudioReferenceStyleCard = {
  subjectMatter: string[];
  composition: string[];
  shotSize: string[];
  cameraAngle: string[];
  depthOfField: string[];
  lighting: string[];
  colorPalette: string[];
  textureAndMedium: string[];
  mood: string[];
  visualEra?: string[];
  cameraMovementSuggestion?: string[];
};

export type PromptStudioMatchedLibrary = {
  id: string;
  nameZh: string;
  nameEn?: string;
  category: string;
  confidence: number;
  reason: string;
  kind?: "style" | "module" | string;
};

export type PromptStudioReferenceAnalysisResult = {
  analysisSource: "vlm" | "fallback";
  fallbackReason?: string;
  vlmProvider?: string | null;
  target?: string;
  engine?: string;
  image?: {
    fileName?: string;
    mimeType?: string;
    size?: number;
  };
  styleCard: PromptStudioReferenceStyleCard;
  matchedLibraries: PromptStudioMatchedLibrary[];
  reusablePrompt: {
    imagePrompt: string;
    videoPrompt: string;
    enhancedPrompt: string;
    negativePrompt?: string;
  };
  detectedSignals: {
    scene: string[];
    subject: string[];
    lighting: string[];
    color: string[];
    mood: string[];
    composition: string[];
    texture: string[];
  };
  safety: {
    containsPerson?: boolean;
    containsFace?: boolean;
    caution?: string[];
  };
  usageTips: string[];
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

export async function analyzePromptStudioReference(input: {
  image: File;
  target?: PromptStudioGenerateRequest["target"];
  engine?: PromptStudioGenerateRequest["engine"];
  language?: "zh" | "en";
}) {
  const formData = new FormData();
  formData.append("image", input.image);
  if (input.target) formData.append("target", input.target);
  if (input.engine) formData.append("engine", input.engine);
  if (input.language) formData.append("language", input.language);

  const payload = await apiRequest<PromptStudioReferenceAnalysisResult>("/api/prompt-studio/analyze-reference", {
    method: "POST",
    token: "",
    body: formData,
  });
  return payload.data;
}
