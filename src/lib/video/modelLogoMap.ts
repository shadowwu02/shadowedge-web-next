type VideoModelLogoEntry = {
  src: string;
  aliases: string[];
};

export const VIDEO_MODEL_LOGO_PATHS = {
  gptImage2: "/model-icons/gpt-image-2.png",
  grok: "/model-icons/grok.png",
  hailuo: "/model-icons/hailuo.png",
  kling: "/model-icons/kling.png",
  seedance: "/model-icons/seedance.png",
  veo: "/model-icons/veo.png",
  wan: "/model-icons/wan.png",
} as const;

const videoModelLogoEntries: VideoModelLogoEntry[] = [
  {
    src: VIDEO_MODEL_LOGO_PATHS.seedance,
    aliases: ["seedance", "seedance 2.0", "seedance_2_0", "seedance20", "seedance_v2_0", "seedance fast"],
  },
  {
    src: VIDEO_MODEL_LOGO_PATHS.kling,
    aliases: ["kling", "kling 2.6", "kling2_6", "kling 3.0", "kling3_0", "kling 4k"],
  },
  {
    src: VIDEO_MODEL_LOGO_PATHS.veo,
    aliases: ["veo", "google veo", "veo 3", "veo3", "veo 3.1", "veo3_1", "veo 3.1 lite"],
  },
  {
    src: VIDEO_MODEL_LOGO_PATHS.wan,
    aliases: ["wan", "wan 2.6", "wan2_6", "wan 2.7", "wan2_7", "wan i2v"],
  },
  {
    src: VIDEO_MODEL_LOGO_PATHS.grok,
    aliases: ["grok", "grok video", "grok_video", "grok imagine", "grok imagine video"],
  },
  {
    src: VIDEO_MODEL_LOGO_PATHS.hailuo,
    aliases: ["hailuo", "minimax", "minimax hailuo", "minimax_hailuo"],
  },
  {
    src: VIDEO_MODEL_LOGO_PATHS.gptImage2,
    aliases: ["gpt-image-2", "gpt image 2", "gpt_image", "gpt image", "openai image"],
  },
];

function normalizeModelLogoLookup(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9.]+/g, " ")
    .trim();
}

function compactModelLogoLookup(value: string) {
  return normalizeModelLogoLookup(value).replace(/[^a-z0-9]+/g, "");
}

export function getVideoModelLogo(modelIdOrProvider: string | undefined | null): string | null {
  if (!modelIdOrProvider) return null;

  const normalizedValue = normalizeModelLogoLookup(modelIdOrProvider);
  const compactValue = compactModelLogoLookup(modelIdOrProvider);
  if (!normalizedValue && !compactValue) return null;

  const entry = videoModelLogoEntries.find(({ aliases }) =>
    aliases.some((alias) => {
      const normalizedAlias = normalizeModelLogoLookup(alias);
      const compactAlias = compactModelLogoLookup(alias);

      return (
        (normalizedAlias.length > 1 && normalizedValue.includes(normalizedAlias)) ||
        (compactAlias.length > 1 && compactValue.includes(compactAlias))
      );
    }),
  );

  return entry?.src || null;
}
