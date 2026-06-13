"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { VideoModelLogo } from "@/components/video/VideoModelLogo";
import { getImageModels } from "@/lib/image-api";
import { estimateImageCredits, getDefaultImageParams, normalizeImageModel } from "@/lib/image/imageModelRules";
import { getImageModelLogoLookup } from "@/lib/image/imageModelLogo";
import { getVideoModels } from "@/lib/video-api";
import { estimateVideoCreditsForParams, videoModelRules } from "@/lib/video/videoModelRules";
import { useI18n } from "@/i18n/useI18n";
import type { ImageModel } from "@/types/image";
import type { VideoModel } from "@/types/video";

type I18nKey = Parameters<ReturnType<typeof useI18n>["t"]>[0];
type ModelLibraryKind = "image" | "remake" | "video";
type ModelLibraryFilter = "all" | "image" | "video" | "remake" | "references" | "audio" | "fast" | "premium";

type ModelLibraryCard = {
  capabilities: I18nKey[];
  categories: Set<ModelLibraryFilter>;
  ctaHref: string;
  ctaKey: I18nKey;
  descriptionKey: I18nKey;
  detailItems: Array<{ labelKey: I18nKey; value?: string; valueKey?: I18nKey }>;
  id: string;
  kind: ModelLibraryKind;
  logoLabel: string;
  logoLookup: string;
  name: string;
  nameKey?: I18nKey;
  searchText: string;
  startingCredits: number;
};

const filterItems: Array<{ key: ModelLibraryFilter; labelKey: I18nKey }> = [
  { key: "all", labelKey: "models.filters.all" },
  { key: "image", labelKey: "models.filters.image" },
  { key: "video", labelKey: "models.filters.video" },
  { key: "remake", labelKey: "models.filters.remake" },
  { key: "references", labelKey: "models.filters.references" },
  { key: "audio", labelKey: "models.filters.audio" },
  { key: "fast", labelKey: "models.filters.fast" },
  { key: "premium", labelKey: "models.filters.premium" },
];

const fallbackImageModels = [
  {
    id: "image_auto",
    name: "Auto",
    providerModel: "image_auto",
    provider: "auto",
    capabilities: {
      textToImage: true,
      imageToImage: true,
      maxReferences: 0,
      maxBatchCount: 1,
      ratios: ["auto", "1:1", "16:9", "9:16"],
    },
    creditRules: { baseCredits: 1, unit: "image", batchMultiplier: true },
    defaults: { ratio: "auto", batchCount: 1 },
  },
  {
    id: "nano_banana_flash",
    name: "Nano Banana Flash",
    providerModel: "nano_banana_flash",
    provider: "google",
    capabilities: {
      textToImage: true,
      imageToImage: true,
      maxReferences: 3,
      maxBatchCount: 1,
      ratios: ["1:1", "4:3", "3:4", "16:9", "9:16"],
    },
    creditRules: { baseCredits: 2, unit: "image", batchMultiplier: true },
    defaults: { ratio: "1:1", batchCount: 1 },
  },
  {
    id: "seedream_v5_lite",
    name: "Seedream 5.0 Lite",
    providerModel: "seedream_v5_lite",
    provider: "seedream",
    capabilities: {
      textToImage: true,
      imageToImage: true,
      maxReferences: 3,
      maxBatchCount: 1,
      ratios: ["1:1", "4:3", "3:4", "16:9", "9:16"],
    },
    creditRules: { baseCredits: 2, unit: "image", batchMultiplier: true },
    defaults: { ratio: "1:1", batchCount: 1 },
  },
  {
    id: "gpt_image_2",
    name: "GPT Image 2",
    providerModel: "gpt-image-2",
    provider: "openai",
    capabilities: {
      textToImage: true,
      imageToImage: true,
      maxReferences: 4,
      maxBatchCount: 1,
      ratios: ["1:1", "4:3", "3:4", "16:9", "9:16"],
    },
    creditRules: { baseCredits: 4, unit: "image", batchMultiplier: true },
    defaults: { ratio: "1:1", batchCount: 1 },
  },
].map(normalizeImageModel);

function includesAny(value: string, terms: string[]) {
  const lower = value.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function formatList(values: Array<string | number | undefined | null>, fallback = "--") {
  const unique = Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
  return unique.length ? unique.slice(0, 6).join(" / ") : fallback;
}

function getKindLabel(kind: ModelLibraryKind, t: ReturnType<typeof useI18n>["t"]) {
  if (kind === "image") return t("models.kind.image");
  if (kind === "remake") return t("models.kind.remake");
  return t("models.kind.video");
}

function getImageDescriptionKey(model: ImageModel): I18nKey {
  const lookup = getImageModelLogoLookup(model).toLowerCase();
  if (includesAny(lookup, ["auto", "image_auto"])) return "models.description.imageAuto";
  if (includesAny(lookup, ["nano", "banana", "gemini", "google"])) return "models.description.nanoBanana";
  if (includesAny(lookup, ["seedream", "seedance", "bytedance"])) return "models.description.seedream";
  if (includesAny(lookup, ["gpt", "openai"])) return "models.description.gptImage";
  return model.capabilities.imageToImage ? "models.description.imageReference" : "models.description.imageGeneric";
}

function getVideoDescriptionKey(model: VideoModel): I18nKey {
  const lookup = [model.id, model.label, model.providerModel].join(" ").toLowerCase();
  if (includesAny(lookup, ["seedance"])) return "models.description.seedance";
  if (includesAny(lookup, ["veo", "google"])) return "models.description.veo";
  if (includesAny(lookup, ["kling"])) return "models.description.kling";
  if (includesAny(lookup, ["grok"])) return "models.description.grok";
  if (includesAny(lookup, ["wan"])) return "models.description.wan";
  if (includesAny(lookup, ["hailuo", "minimax"])) return "models.description.hailuo";
  return "models.description.videoGeneric";
}

function makeSearchText(parts: unknown[]) {
  return parts
    .flat()
    .filter(Boolean)
    .map(String)
    .join(" ")
    .toLowerCase();
}

function makeImageCard(model: ImageModel): ModelLibraryCard {
  const defaults = getDefaultImageParams(model);
  const credits = estimateImageCredits(model, defaults);
  const categories: ModelLibraryCard["categories"] = new Set(["all", "image"]);
  const lookup = getImageModelLogoLookup(model);
  const capabilities: I18nKey[] = ["models.capability.textToImage"];
  const hasReferences = model.capabilities.maxReferences > 0 && model.capabilities.imageToImage;

  if (hasReferences) {
    categories.add("references");
    capabilities.push("models.capability.imageToImage", "models.capability.references");
  }

  if (model.capabilities.maxBatchCount > 1) capabilities.push("models.capability.batch");
  if (includesAny(lookup, ["fast", "flash", "lite", "auto"])) categories.add("fast");
  if (credits >= 4 || includesAny(lookup, ["gpt", "pro", "premium"])) categories.add("premium");

  return {
    capabilities,
    categories,
    ctaHref: "/workspace/image",
    ctaKey: "models.createImage",
    descriptionKey: getImageDescriptionKey(model),
    detailItems: [
      { labelKey: "models.supportedRatios", value: formatList(model.capabilities.ratios, "auto") },
      { labelKey: "models.resolution", value: formatList([...model.capabilities.resolutions, ...model.capabilities.qualities]) },
      { labelKey: "models.references", value: hasReferences ? String(model.capabilities.maxReferences) : "0" },
    ],
    id: `image:${model.id}`,
    kind: "image",
    logoLabel: model.label,
    logoLookup: lookup,
    name: model.label,
    searchText: makeSearchText([
      model.id,
      model.name,
      model.label,
      model.provider,
      model.providerModel,
      model.capabilities.ratios,
      capabilities,
      "image text to image image to image references 图像 参考图",
    ]),
    startingCredits: credits,
  };
}

function makeVideoCard(model: VideoModel): ModelLibraryCard {
  const credits = estimateVideoCreditsForParams(
    model.id,
    {
      duration: model.durationDefault || model.durations[0] || 5,
      quality: model.qualities[0],
      ratio: model.ratios[0],
      resolution: model.qualities[0],
    },
    model.credits || 12,
  );
  const categories: ModelLibraryCard["categories"] = new Set(["all", "video"]);
  const lookup = [model.id, model.providerModel, model.provider, model.label].filter(Boolean).join(" ");
  const capabilities: I18nKey[] = ["models.capability.textToVideo"];
  const uploadSlots = model.uploadSlots || [];
  const hasReferences = uploadSlots.length > 0;

  if (hasReferences) {
    categories.add("references");
    capabilities.push("models.capability.references");
  }

  if (uploadSlots.some((slot) => slot.includes("image") || slot === "media")) capabilities.push("models.capability.imageToVideo");
  if (model.supportsAudio || uploadSlots.some((slot) => slot.includes("audio") || slot === "media")) {
    categories.add("audio");
    capabilities.push("models.capability.audio");
  }
  if (includesAny(lookup, ["fast", "lite"])) categories.add("fast");
  if (credits >= 20 || includesAny(lookup, ["veo", "pro", "4k", "ultra", "premium"])) categories.add("premium");

  return {
    capabilities: Array.from(new Set(capabilities)),
    categories,
    ctaHref: "/workspace/video",
    ctaKey: "models.createVideo",
    descriptionKey: getVideoDescriptionKey(model),
    detailItems: [
      { labelKey: "models.supportedRatios", value: formatList(model.ratios) },
      { labelKey: "models.durations", value: formatList(model.durations.map((duration) => `${duration}s`)) },
      { labelKey: "models.resolution", value: formatList(model.qualities) },
    ],
    id: `video:${model.id}`,
    kind: "video",
    logoLabel: model.label,
    logoLookup: lookup,
    name: model.label,
    searchText: makeSearchText([
      model.id,
      model.label,
      model.provider,
      model.providerModel,
      model.ratios,
      model.durations,
      model.qualities,
      uploadSlots,
      capabilities,
      "video text to video image to video references audio 视频 参考 音频",
    ]),
    startingCredits: credits,
  };
}

function makeRemakeCard(seedanceCredits: number): ModelLibraryCard {
  const capabilities: I18nKey[] = ["models.capability.remake", "models.capability.storyboard", "models.capability.references"];
  const categories: ModelLibraryCard["categories"] = new Set(["all", "remake", "video", "references", "premium"]);

  return {
    capabilities,
    categories,
    ctaHref: "/workspace/video?tab=remake",
    ctaKey: "models.tryRemake",
    descriptionKey: "models.description.remakeWorkflow",
    detailItems: [
      { labelKey: "models.workflow", valueKey: "models.remake.workflowValue" },
      { labelKey: "models.durations", value: "5s - 30s" },
      { labelKey: "models.creditsMode", valueKey: "models.remake.perShot" },
    ],
    id: "workflow:remake",
    kind: "remake",
    logoLabel: "Remake",
    logoLookup: "seedance remake storyboard",
    name: "Remake Workflow",
    nameKey: "models.remake.name",
    searchText: makeSearchText([
      "remake short drama storyboard shot bai seedance 短剧反推 分镜 逐镜头 本地化",
      capabilities,
    ]),
    startingCredits: seedanceCredits,
  };
}

function getFallbackVideoModels(): VideoModel[] {
  return videoModelRules
    .filter((rule) => ["seedance_2_0", "veo3_1", "veo3_1_lite", "grok_video", "kling2_6", "wan2_7"].includes(rule.modelId))
    .map((rule) => ({
      id: rule.modelId,
      label: rule.label,
      provider: rule.provider,
      providerModel: rule.modelId,
      desc: rule.notes[0] || "Video generation",
      credits: rule.credits || rule.creditRules.baseCredits || 12,
      creditBase: rule.creditRules.baseCredits || rule.credits || 12,
      durations: rule.durations,
      durationDefault: rule.defaultDuration,
      ratios: rule.ratios.map(String),
      qualities: rule.qualities.map(String),
      supportsAudio: rule.supportsAudioReference,
      uploadSlots: rule.uploadSlots.map(String),
      raw: rule,
    }));
}

export function ModelLibraryPage() {
  const { t, tf } = useI18n();
  const [activeFilter, setActiveFilter] = useState<ModelLibraryFilter>("all");
  const [imageModels, setImageModels] = useState<ImageModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [videoModels, setVideoModels] = useState<VideoModel[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      setIsLoading(true);
      const [imageResult, videoResult] = await Promise.allSettled([getImageModels(), getVideoModels()]);
      if (cancelled) return;

      setImageModels(imageResult.status === "fulfilled" && imageResult.value.length ? imageResult.value : fallbackImageModels);
      setVideoModels(videoResult.status === "fulfilled" && videoResult.value.length ? videoResult.value : getFallbackVideoModels());
      setIsLoading(false);
    }

    void loadModels();

    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo(() => {
    const imageCards = imageModels.map(makeImageCard);
    const videoCards = videoModels.map(makeVideoCard);
    const seedanceCredits =
      videoCards.find((card) => card.searchText.includes("seedance"))?.startingCredits ||
      videoCards.find((card) => card.kind === "video")?.startingCredits ||
      12;

    return [...imageCards, ...videoCards, makeRemakeCard(seedanceCredits)];
  }, [imageModels, videoModels]);

  const counts = useMemo(() => {
    return filterItems.reduce<Record<ModelLibraryFilter, number>>(
      (next, item) => ({
        ...next,
        [item.key]: cards.filter((card) => card.categories.has(item.key)).length,
      }),
      {
        all: 0,
        audio: 0,
        fast: 0,
        image: 0,
        premium: 0,
        references: 0,
        remake: 0,
        video: 0,
      },
    );
  }, [cards]);

  const visibleCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return cards.filter((card) => {
      const matchesFilter = activeFilter === "all" || card.categories.has(activeFilter);
      const matchesQuery =
        !normalizedQuery ||
        card.name.toLowerCase().includes(normalizedQuery) ||
        card.searchText.includes(normalizedQuery) ||
        card.capabilities.some((key) => t(key).toLowerCase().includes(normalizedQuery)) ||
        t(card.descriptionKey).toLowerCase().includes(normalizedQuery) ||
        getKindLabel(card.kind, t).toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, cards, query, t]);

  return (
    <div className="se-scrollbar h-full overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex min-h-full w-full max-w-[1480px] flex-col gap-4 pb-5">
        <section className="se-card-quiet rounded-[30px] p-5 md:p-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
            <div>
              <p className="se-eyebrow">{t("models.eyebrow")}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#f4f4f4] md:text-4xl">{t("models.title")}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#b9b9b9]/62">{t("models.subtitle")}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-[20px] border border-white/8 bg-[#05070b]/42 p-3">
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#b9b9b9]/42">{t("models.summary.image")}</p>
                <p className="mt-1 text-2xl font-black text-[#f4f4f4]">{counts.image}</p>
              </div>
              <div className="rounded-[20px] border border-white/8 bg-[#05070b]/42 p-3">
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#b9b9b9]/42">{t("models.summary.video")}</p>
                <p className="mt-1 text-2xl font-black text-[#f4f4f4]">{counts.video}</p>
              </div>
              <div className="rounded-[20px] border border-[#ffb44d]/18 bg-[#ffb44d]/10 p-3">
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#ffd08a]/70">{t("models.summary.remake")}</p>
                <p className="mt-1 text-2xl font-black text-[#ffd08a]">{counts.remake}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="se-card-quiet rounded-[26px] p-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="se-segmented flex flex-wrap gap-1.5 rounded-2xl p-1.5">
              {filterItems.map((item) => (
                <button
                  className={`se-segmented-item min-h-8 rounded-full px-3 text-[11px] font-black ${activeFilter === item.key ? "se-segmented-item-active" : ""}`}
                  key={item.key}
                  onClick={() => setActiveFilter(item.key)}
                  type="button"
                >
                  <span>{t(item.labelKey)}</span>
                  <span className="se-segmented-count text-[9px]">{counts[item.key]}</span>
                </button>
              ))}
            </div>

            <label className="relative min-w-0 xl:w-[360px]">
              <span className="sr-only">{t("models.searchLabel")}</span>
              <input
                className="w-full rounded-[18px] border border-white/10 bg-[#05070b]/52 px-4 py-3 text-sm font-medium text-[#f4f4f4] outline-none transition placeholder:text-[#b9b9b9]/36 focus:border-[#ffb44d]/48"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("models.searchPlaceholder")}
                value={query}
              />
            </label>
          </div>
        </section>

        {isLoading ? (
          <section className="se-card-quiet grid min-h-[360px] place-items-center rounded-[28px] p-8 text-center">
            <div>
              <p className="text-sm font-black text-[#f4f4f4]">{t("models.loading")}</p>
              <p className="mt-2 text-sm text-[#b9b9b9]/58">{t("models.loadingHint")}</p>
            </div>
          </section>
        ) : visibleCards.length ? (
          <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {visibleCards.map((card) => (
              <article
                className="se-card-interactive flex min-h-[410px] flex-col rounded-[28px] p-4 shadow-inner shadow-black/8"
                key={card.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <VideoModelLogo label={card.logoLabel} lookup={card.logoLookup} size="lg" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#ffb44d]/72">{getKindLabel(card.kind, t)}</p>
                      <h2 className="mt-1 truncate text-lg font-black text-[#f4f4f4]">{card.nameKey ? t(card.nameKey) : card.name}</h2>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#ffb44d]/22 bg-[#ffb44d]/10 px-2.5 py-1 text-[10px] font-black text-[#ffd08a]">
                    {tf("models.fromCredits", { credits: card.startingCredits })}
                  </span>
                </div>

                <p className="mt-4 min-h-[72px] text-sm leading-6 text-[#b9b9b9]/68">{t(card.descriptionKey)}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {card.capabilities.map((capability) => (
                    <span className="rounded-full border border-white/8 bg-white/[.035] px-2.5 py-1 text-[10px] font-bold text-[#f4f4f4]/66" key={capability}>
                      {t(capability)}
                    </span>
                  ))}
                </div>

                <div className="mt-4 grid gap-2">
                  {card.detailItems.map((item) => (
                    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 rounded-[16px] border border-white/8 bg-[#05070b]/38 px-3 py-2" key={item.labelKey}>
                      <span className="text-[10px] font-black uppercase tracking-[.12em] text-[#b9b9b9]/42">{t(item.labelKey)}</span>
                      <span className="min-w-0 truncate text-xs font-semibold text-[#f4f4f4]/76">{item.valueKey ? t(item.valueKey) : item.value}</span>
                    </div>
                  ))}
                </div>

                <Link className="se-button-secondary mt-auto inline-flex min-h-10 items-center justify-center rounded-[16px] px-4 text-sm font-black" href={card.ctaHref}>
                  {t(card.ctaKey)}
                </Link>
              </article>
            ))}
          </section>
        ) : (
          <section className="se-card-quiet grid min-h-[360px] place-items-center rounded-[28px] p-8 text-center">
            <div>
              <p className="text-lg font-black text-[#f4f4f4]">{t("models.noResults")}</p>
              <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/58">{t("models.noResultsHint")}</p>
            </div>
          </section>
        )}

        <section className="rounded-[24px] border border-[#ffb44d]/16 bg-[#ffb44d]/8 p-4">
          <p className="text-sm leading-6 text-[#f4f4f4]/72">{t("models.creditsNote")}</p>
        </section>
      </div>
    </div>
  );
}
