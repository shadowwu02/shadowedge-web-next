export type RemakeMode = "single_clip" | "full_film";

export type RemakeTargetRegion = "US" | "Middle East" | "Japan" | "Southeast Asia";

export type RemakeSourceVideo = {
  lastModified: number;
  name: string;
  size: number;
  type: string;
};

export type RemakeShot = {
  shotGroupId: string;
  shot: number;
  sourceTimeRange: {
    start: number;
    end: number;
  };
  duration: number;
  camera: string;
  motion: string;
  position: string;
  action: string;
  emotion: string;
  dialogue: string;
  audio: string;
  prompt: string;
  referenceHints: {
    images: string[];
    videos: string[];
    audios: string[];
    characters: string[];
  };
  generationParams: {
    modelId: string;
    ratio: string;
    duration: number;
    quality: string;
  };
};

export type RemakeStoryboard = {
  id: string;
  mode: RemakeMode;
  sourceTitle?: string;
  targetRegion: RemakeTargetRegion;
  characterRules: string;
  sceneStyle: string;
  translateDialogue: boolean;
  shots: RemakeShot[];
};

export type RemakeSettings = {
  characterRules: string;
  mode: RemakeMode;
  sceneStyle: string;
  targetRegion: RemakeTargetRegion;
  translateDialogue: boolean;
};
