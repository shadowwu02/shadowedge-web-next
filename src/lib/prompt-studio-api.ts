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

export type PromptStudioMode = "generate" | "optimize" | "convert" | "layerEdit" | "storyboard" | "styleCard" | "referenceStyle" | "project" | "all";

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
  possibleStyles?: string[];
  reusableStyleSummary?: string;
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
  provider?: "B.AI" | "OpenAI" | "fallback" | string | null;
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

export type PromptStudioReferencePreserveMode = "composition" | "subject" | "pose" | "scene" | "firstFrame" | "fullReference";
export type PromptStudioReferenceStyleMode = "selectedLibraries" | "styleCard" | "manual";

export type PromptStudioReferenceStylePromptResult = {
  analysisSource: "vlm" | "fallback";
  provider?: "B.AI" | "OpenAI" | "fallback" | string | null;
  fallbackReason?: string;
  target?: "video" | "image" | string;
  engine?: string;
  preserveMode: PromptStudioReferencePreserveMode;
  styleMode: PromptStudioReferenceStyleMode;
  image?: {
    fileName?: string;
    mimeType?: string;
    size?: number;
  };
  referenceSummary: {
    subject: string[];
    composition: string[];
    spatialLayout: string[];
    poseOrAction: string[];
    cameraAngle: string[];
    lighting: string[];
    colorPalette: string[];
    sceneElements: string[];
  };
  preserveDirectives: string[];
  styleDirectives: string[];
  matchedLibraries: PromptStudioMatchedLibrary[];
  prompts: {
    imageToImagePrompt: string;
    imageToVideoPrompt: string;
    enhancedPrompt: string;
    negativePrompt?: string;
  };
  usageTips: string[];
  safety: {
    containsPerson?: boolean;
    containsFace?: boolean;
    caution?: string[];
  };
};

export type PromptStudioProjectType = "short-film" | "short-drama" | "commercial" | "music-video" | "storyboard";

export type PromptStudioProjectPlanResult = {
  projectTitle: string;
  projectLogline: string;
  projectType?: PromptStudioProjectType | string;
  target?: "video" | "storyboard" | string;
  engine?: string;
  aspectRatio?: string;
  shotCount?: number;
  styleConstitution: {
    visualStyle: string[];
    colorPalette: string[];
    lightingRules: string[];
    cameraRules: string[];
    compositionRules: string[];
    textureAndMedium?: string[];
    negativeRules?: string[];
    continuityRules: string[];
  };
  assetPlan: {
    characters: Array<{
      assetTag: string;
      name: string;
      role?: string;
      description: string;
      identityLock?: {
        face?: string[];
        hair?: string[];
        costume?: string[];
        body?: string[];
        signatureDetails?: string[];
      };
      consistencyRules: string[];
      threeViewPrompt: string;
      portraitPrompt: string;
      imageWorkspacePrompt?: string;
      negativePrompt?: string;
      usageNotes?: string[];
    }>;
    locations: Array<{
      assetTag: string;
      name: string;
      description: string;
      environmentPrompt: string;
      imageWorkspacePrompt?: string;
      continuityRules: string[];
      keyVisualElements?: string[];
      usageNotes?: string[];
    }>;
    props: Array<{
      assetTag: string;
      name: string;
      description: string;
      propDesignPrompt: string;
      imageWorkspacePrompt?: string;
      continuityRules: string[];
      keyDesignElements?: string[];
      negativePrompt?: string;
      usageNotes?: string[];
    }>;
  };
  shotPlan: Array<{
    shotNumber: number;
    title: string;
    storyPurpose: string;
    assetReferences: string[];
    requiredAssets?: Array<{
      assetTag: string;
      usage: string;
    }>;
    assetContinuityPrompt?: string;
    keyframeImagePrompt: string;
    videoPrompt: string;
    cameraMove: string;
    durationHint: string;
    continuityNotes: string[];
  }>;
  assetReferenceGuide: string[];
  continuityChecklist: string[];
  productionTips: string[];
  selectedKnowledge?: Array<{
    id: string;
    nameZh: string;
    category: string;
    path: string;
    keyPhrases?: string[];
    appliedAs?: string;
    knowledgeProfile?: PromptStudioKnowledgeProfile;
  }>;
  warnings?: string[];
  exportText: string;
};

export type PromptStudioProjectSavePayload = {
  title?: string;
  projectType?: PromptStudioProjectType | string;
  brief?: string;
  target?: "video" | "storyboard" | string;
  engine?: PromptStudioGenerateRequest["engine"] | string;
  aspectRatio?: string;
  selectedStyles?: string[];
  selectedModules?: string[];
  projectData: PromptStudioProjectPlanResult;
};

export type PromptStudioSavedProjectSummary = {
  id: string;
  title: string;
  projectType?: PromptStudioProjectType | string;
  brief?: string;
  target?: string;
  engine?: string;
  aspectRatio?: string;
  shotCount?: number;
  assetCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type PromptStudioSavedProject = PromptStudioSavedProjectSummary & {
  selectedStyles?: string[];
  selectedModules?: string[];
  projectData: PromptStudioProjectPlanResult;
};

export async function fetchPromptStudioCatalog() {
  const payload = await apiRequest<PromptStudioCatalog>("/api/prompt-studio/catalog", {
    token: "",
  });
  return payload.data;
}

export async function savePromptStudioProject(input: PromptStudioProjectSavePayload) {
  const payload = await apiRequest<PromptStudioSavedProject>("/api/prompt-studio/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return payload.data;
}

export async function fetchPromptStudioProjects() {
  const payload = await apiRequest<PromptStudioSavedProjectSummary[]>("/api/prompt-studio/projects", {
    method: "GET",
  });
  return payload.data || [];
}

export async function fetchPromptStudioProject(id: string) {
  const payload = await apiRequest<PromptStudioSavedProject>(`/api/prompt-studio/projects/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  return payload.data;
}

export async function updatePromptStudioProject(id: string, input: Partial<PromptStudioProjectSavePayload>) {
  const payload = await apiRequest<PromptStudioSavedProject>(`/api/prompt-studio/projects/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return payload.data;
}

export async function deletePromptStudioProject(id: string) {
  const payload = await apiRequest<{ id: string; deleted: boolean }>(`/api/prompt-studio/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
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

export async function generatePromptStudioReferenceStylePrompt(input: {
  image: File;
  intent?: string;
  target?: "video" | "image";
  engine?: PromptStudioGenerateRequest["engine"];
  aspectRatio?: string;
  duration?: string;
  language?: "zh" | "en";
  preserveMode?: PromptStudioReferencePreserveMode;
  styleMode?: PromptStudioReferenceStyleMode;
  selectedStyles?: string[];
  selectedModules?: string[];
  styleCard?: PromptStudioReferenceStyleCard | null;
  styleInstruction?: string;
  advancedControls?: PromptStudioAdvancedControls;
}) {
  const formData = new FormData();
  formData.append("image", input.image);
  if (input.intent) formData.append("intent", input.intent);
  if (input.target) formData.append("target", input.target);
  if (input.engine) formData.append("engine", input.engine);
  if (input.aspectRatio) formData.append("aspectRatio", input.aspectRatio);
  if (input.duration) formData.append("duration", input.duration);
  if (input.language) formData.append("language", input.language);
  if (input.preserveMode) formData.append("preserveMode", input.preserveMode);
  if (input.styleMode) formData.append("styleMode", input.styleMode);
  if (input.selectedStyles) formData.append("selectedStyles", JSON.stringify(input.selectedStyles));
  if (input.selectedModules) formData.append("selectedModules", JSON.stringify(input.selectedModules));
  if (input.styleCard) formData.append("styleCard", JSON.stringify(input.styleCard));
  if (input.styleInstruction) formData.append("styleInstruction", input.styleInstruction);
  if (input.advancedControls) formData.append("advancedControls", JSON.stringify(input.advancedControls));

  const payload = await apiRequest<PromptStudioReferenceStylePromptResult>("/api/prompt-studio/reference-style-prompt", {
    method: "POST",
    token: "",
    body: formData,
  });
  return payload.data;
}

export async function generatePromptStudioProjectPlan(input: {
  projectBrief: string;
  projectType: PromptStudioProjectType;
  target: "video" | "storyboard";
  engine: PromptStudioGenerateRequest["engine"];
  aspectRatio?: string;
  episodeOrSceneCount?: number;
  shotCount?: number;
  selectedStyles?: string[];
  selectedModules?: string[];
  styleCard?: PromptStudioReferenceStyleCard | null;
  referenceStylePrompt?: string;
  language?: "zh" | "en";
}) {
  const payload = await apiRequest<PromptStudioProjectPlanResult>("/api/prompt-studio/project-plan", {
    method: "POST",
    token: "",
    body: JSON.stringify(input),
  });
  return payload.data;
}
