import type { UploadMediaItem, VideoModel } from "@/types/video";

export const FLUXPROXY_INTERNATIONAL_MODEL_IDS = [
  "seedance_2_0_international",
  "seedance_2_0_fast_international",
  "seedance_2_0_mini_international",
  "seedance_2_5_international",
] as const;

export type FluxProxyMentionRole = "reference_image" | "first_frame" | "last_frame" | "reference_video" | "reference_audio";

export function isFluxProxyInternationalModel(model?: Pick<VideoModel, "id" | "provider" | "productLine"> | null) {
  return Boolean(model && (model.provider === "fluxproxy" || model.productLine === "international" || FLUXPROXY_INTERNATIONAL_MODEL_IDS.includes(model.id as typeof FLUXPROXY_INTERNATIONAL_MODEL_IDS[number])));
}

export function getVideoWorkspaceModelState(model: VideoModel) {
  const international = isFluxProxyInternationalModel(model);
  const catalogVisible = model.catalogVisible !== false;
  const catalogSelectable = model.catalogSelectable === true || (
    model.catalogSelectable !== false && model.available !== false
  );
  const configurationEnabled = model.configurationEnabled === true || (
    model.configurationEnabled !== false && catalogSelectable
  );
  const executionEnabled = model.available !== false && (
    !international || model.customerExecutionEnabled !== false
  );

  return Object.freeze({
    catalogVisible,
    catalogSelectable,
    configurationEnabled,
    executionEnabled,
    executionBlockedReason: configurationEnabled && !executionEnabled && international
      ? "INTERNATIONAL_BETA_GATE_OFF" as const
      : null,
  });
}

export function getFluxProxyMediaLimits(model: VideoModel) {
  const capability = model.internationalCapabilities;
  return Object.freeze({
    image: capability?.referenceCountLimitsVerified ? Math.max(0, Number(capability.imageMax || model.maxReferenceImages || 0)) : null,
    video: capability?.referenceCountLimitsVerified ? Math.max(0, Number(capability.videoMax || model.maxReferenceVideos || 0)) : null,
    audio: capability?.referenceCountLimitsVerified ? Math.max(0, Number(capability.audioMax || model.maxReferenceAudios || 0)) : null,
    videoTotalDuration: capability?.videoTotalDurationMax || null,
    audioTotalDuration: capability?.audioTotalDurationMax || null,
    referenceCountLimitsVerified: capability?.referenceCountLimitsVerified === true,
  });
}

export function getFluxProxyInputSlots(model: VideoModel) {
  const limits = getFluxProxyMediaLimits(model);
  return Object.freeze([
    { type: "image" as const, label: "Images", max: limits.image, roles: ["reference_image", "first_frame", "last_frame"] as FluxProxyMentionRole[] },
    { type: "video" as const, label: "Videos", max: limits.video, roles: ["reference_video"] as FluxProxyMentionRole[] },
    { type: "audio" as const, label: "Audio", max: limits.audio, roles: ["reference_audio"] as FluxProxyMentionRole[] },
  ].filter((slot) => slot.max === null || slot.max > 0));
}

const INTERNATIONAL_MODEL_NAMES = Object.freeze({
  seedance_2_0_international: { en: "Seedance 2.0 International", zh: "Seedance 2.0 国际版" },
  seedance_2_0_fast_international: { en: "Seedance 2.0 Fast International", zh: "Seedance 2.0 Fast 国际版" },
  seedance_2_0_mini_international: { en: "Seedance 2.0 Mini International", zh: "Seedance 2.0 Mini 国际版" },
  seedance_2_5_international: { en: "Seedance 2.5 International", zh: "Seedance 2.5 国际版" },
});

export function getFluxProxyInternationalDisplayName(model: Pick<VideoModel, "id" | "label">, locale: "en" | "zh") {
  return INTERNATIONAL_MODEL_NAMES[model.id as keyof typeof INTERNATIONAL_MODEL_NAMES]?.[locale] || model.label;
}

export function toFluxProxyReferenceRole(item: Pick<UploadMediaItem, "type" | "role">): FluxProxyMentionRole {
  if (item.type === "video") return "reference_video";
  if (item.type === "audio") return "reference_audio";
  if (item.role === "start_frame") return "first_frame";
  if (item.role === "end_frame") return "last_frame";
  return "reference_image";
}

export function getFluxProxyMediaCounters(media: UploadMediaItem[]) {
  const count = (type: UploadMediaItem["type"]) => media.filter((item) => item.type === type).length;
  const duration = (type: UploadMediaItem["type"]) => media.filter((item) => item.type === type).reduce((sum, item) => sum + (item.duration || 0), 0);
  return Object.freeze({ images: count("image"), videos: count("video"), audios: count("audio"), videoDuration: duration("video"), audioDuration: duration("audio") });
}

export function getFluxProxyMentionToken(item: UploadMediaItem, typeIndex: number, locale: "en" | "zh" = "zh"): string {
  const labels = locale === "zh"
    ? { image: "图", video: "视频", audio: "音频" }
    : { image: "Image", video: "Video", audio: "Audio" };
  return `@${labels[item.type]}${typeIndex}`;
}

export function listFluxProxyMentionBindings(media: UploadMediaItem[], locale: "en" | "zh" = "zh") {
  const indexes = { image: 0, video: 0, audio: 0 };
  return media.map((item) => {
    indexes[item.type] += 1;
    return Object.freeze({
      token: getFluxProxyMentionToken(item, indexes[item.type], locale),
      assetId: item.assetId,
      type: item.type,
      role: item.role,
    });
  });
}

export function listFluxProxyMentionTokens(media: UploadMediaItem[], locale: "en" | "zh" = "zh") {
  return listFluxProxyMentionBindings(media, locale).map((binding) => binding.token);
}

export function getFluxProxyReviewSummary(media: UploadMediaItem[], referenceBindingProfileId?: string) {
  let preparing = 0; let failed = 0; let active = 0; let modelMismatch = 0; let staleAuthority = 0; let assetTypeMismatch = 0;
  const expectedProfileIsOpaque = typeof referenceBindingProfileId === "string" && /^rbp_[a-f0-9]{16,64}$/.test(referenceBindingProfileId);
  for (const item of media) {
    const review = item.providerAssetReview;
    if (!review) preparing += 1;
    else if (!expectedProfileIsOpaque || !/^rbp_[a-f0-9]{16,64}$/.test(review.referenceBindingProfileId) || review.referenceBindingProfileId !== referenceBindingProfileId) modelMismatch += 1;
    else if (review.assetType !== item.type) assetTypeMismatch += 1;
    else if (review.isCurrent !== true) { staleAuthority += 1; preparing += 1; }
    else if (review.status === "NOT_SUBMITTED" || review.status === "PROCESSING") preparing += 1;
    else if (review.status === "FAILED") failed += 1;
    else if (review.status === "ACTIVE") active += 1;
  }
  return Object.freeze({ preparing, failed, active, modelMismatch, staleAuthority, assetTypeMismatch, ready: media.length === active });
}
