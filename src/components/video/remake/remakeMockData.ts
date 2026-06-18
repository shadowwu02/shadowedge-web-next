import type { RemakeSettings, RemakeShot, RemakeSourceVideo, RemakeStoryboard } from "@/components/video/remake/remakeTypes";

function buildShotPrompt(input: {
  action: string;
  camera: string;
  emotion: string;
  motion: string;
  position: string;
  sceneStyle: string;
  targetRegion: string;
}) {
  return [
    "editable fallback storyboard draft",
    `localized for ${input.targetRegion}`,
    input.sceneStyle,
    input.camera,
    input.motion,
    input.position,
    input.action,
    input.emotion,
    "preserve the original characters, setting, actions, camera angle, lighting, and spatial relationships",
    "do not invent unrelated plot details",
  ]
    .filter(Boolean)
    .join(", ");
}

export function buildMockRemakeStoryboard(settings: RemakeSettings, sourceVideo: RemakeSourceVideo | null): RemakeStoryboard {
  const storyId = `remake-storyboard-${Date.now()}`;
  const sourceTitle = sourceVideo?.name || "Authorized source clip";
  const defaultStyle = settings.sceneStyle || "Reconstruct the scene using the uploaded reference frames.";
  const defaultCharacters = settings.characterRules || "Preserve original characters from the uploaded reference frames.";

  const baseShots: Omit<RemakeShot, "generationParams" | "prompt" | "referenceHints">[] = [
    {
      action: "Reconstruct the visible action from the uploaded reference frames.",
      audio: "Dialogue or room tone matching the source clip.",
      camera: "medium shot, eye-level",
      dialogue: settings.translateDialogue ? "Localized dialogue follows the source timing and intent." : "Original dialogue cue translated for localization.",
      duration: 3.6,
      emotion: "Keep the original emotional tone shown in the source video.",
      motion: "subtle push-in matching the source clip",
      position: "Preserve the subject positions visible in the extracted keyframes.",
      shot: 1,
      shotGroupId: settings.mode === "full_film" ? "chapter-1-shot-group-1" : "single-clip-shot-group-1",
      sourceTimeRange: { end: 3.6, start: 0 },
    },
    {
      action: "Continue the source action without adding unrelated story beats.",
      audio: "Dialogue close-up, room tone, no music swell.",
      camera: "close-up, slight low angle",
      dialogue: settings.translateDialogue ? "Localized reaction line follows the source dialogue intent." : "Localized reaction line placeholder.",
      duration: 3.6,
      emotion: "Maintain the visible facial expression and tension from the source.",
      motion: "locked-off close-up with source-matched handheld drift",
      position: "Preserve the foreground and background relationship shown in the keyframes.",
      shot: 2,
      shotGroupId: settings.mode === "full_film" ? "chapter-1-shot-group-1" : "single-clip-shot-group-1",
      sourceTimeRange: { end: 7.2, start: 3.6 },
    },
    {
      action: "Recreate the transition visible in the source clip.",
      audio: "Footsteps, room tone, or ambience only when suggested by the source.",
      camera: "wide shot, source-matched blocking",
      dialogue: settings.translateDialogue ? "Localized transition line follows the source dialogue intent." : "Localized transition line placeholder.",
      duration: 4.3,
      emotion: "Preserve the source clip's dramatic tone without changing the story.",
      motion: "gentle lateral move following the source camera language",
      position: "Keep the visible subject placement and environment from the extracted frames.",
      shot: 3,
      shotGroupId: settings.mode === "full_film" ? "chapter-1-shot-group-2" : "single-clip-shot-group-1",
      sourceTimeRange: { end: 11.5, start: 7.2 },
    },
  ];

  const shots = baseShots.map((shot) => ({
    ...shot,
    generationParams: {
      duration: Math.round(shot.duration),
      modelId: "seedance_2_0",
      quality: "720p",
      ratio: "16:9",
    },
    prompt: buildShotPrompt({
      action: shot.action,
      camera: shot.camera,
      emotion: shot.emotion,
      motion: shot.motion,
      position: shot.position,
      sceneStyle: defaultStyle,
      targetRegion: settings.targetRegion,
    }),
    referenceHints: {
      audios: settings.translateDialogue ? ["localized dialogue guide", "room tone"] : ["original dialogue rhythm", "room tone"],
      characters: defaultCharacters
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean),
      images: ["uploaded keyframes", "source scene lighting reference"],
      videos: [sourceTitle],
    },
  }));

  return {
    characterRules: defaultCharacters,
    id: storyId,
    mode: settings.mode,
    sceneStyle: defaultStyle,
    shots,
    sourceTitle,
    targetRegion: settings.targetRegion,
    translateDialogue: settings.translateDialogue,
  };
}
