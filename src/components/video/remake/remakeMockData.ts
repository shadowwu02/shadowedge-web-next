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
    "cinematic western short drama",
    `localized for ${input.targetRegion}`,
    input.sceneStyle,
    input.camera,
    input.motion,
    input.position,
    input.action,
    input.emotion,
    "natural lighting, premium episodic drama, consistent characters, clear blocking",
  ]
    .filter(Boolean)
    .join(", ");
}

export function buildMockRemakeStoryboard(settings: RemakeSettings, sourceVideo: RemakeSourceVideo | null): RemakeStoryboard {
  const storyId = `remake-storyboard-${Date.now()}`;
  const sourceTitle = sourceVideo?.name || "Authorized source clip";
  const defaultStyle = settings.sceneStyle || "New York finance office, western short drama style";
  const defaultCharacters = settings.characterRules || "Male lead=Alex; Female lead=Emma; Assistant=Assistant";

  const baseShots: Omit<RemakeShot, "generationParams" | "prompt" | "referenceHints">[] = [
    {
      action: "Alex leans forward and questions Emma while the assistant watches without interrupting.",
      audio: "Low room tone with a subtle dramatic pulse.",
      camera: "medium shot, eye-level",
      dialogue: settings.translateDialogue ? 'Alex: "Tell me the truth."' : "Original dialogue cue translated for localization.",
      duration: 3.6,
      emotion: "Alex is cold and dominant; Emma looks nervous but controlled.",
      motion: "slow push-in",
      position: "Alex stands in the left foreground; Emma sits at the center; Assistant stays near the right background.",
      shot: 1,
      shotGroupId: settings.mode === "full_film" ? "chapter-1-shot-group-1" : "single-clip-shot-group-1",
      sourceTimeRange: { end: 3.6, start: 0 },
    },
    {
      action: "Emma raises her eyes, pauses, then answers with hesitation while Alex stays still.",
      audio: "Dialogue close-up, room tone, no music swell.",
      camera: "close-up, slight low angle",
      dialogue: settings.translateDialogue ? 'Emma: "I did what I had to do."' : "Localized reaction line placeholder.",
      duration: 3.6,
      emotion: "Emma is anxious but determined; Alex remains unreadable.",
      motion: "locked-off close-up with a tiny handheld drift",
      position: "Emma fills the center frame; Alex is suggested as an off-screen presence.",
      shot: 2,
      shotGroupId: settings.mode === "full_film" ? "chapter-1-shot-group-1" : "single-clip-shot-group-1",
      sourceTimeRange: { end: 7.2, start: 3.6 },
    },
    {
      action: "The assistant steps between them, creating a visible triangle of tension before Alex turns away.",
      audio: "Footstep, chair movement, restrained dramatic score.",
      camera: "wide shot, three-character blocking",
      dialogue: settings.translateDialogue ? 'Assistant: "We should handle this privately."' : "Localized transition line placeholder.",
      duration: 4.3,
      emotion: "The assistant is cautious; Alex shows restrained anger; Emma looks relieved for a moment.",
      motion: "gentle lateral move",
      position: "Alex moves to frame right; Emma remains seated center-left; Assistant enters from the right background.",
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
      images: ["lead character wardrobe", "office lighting reference"],
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
