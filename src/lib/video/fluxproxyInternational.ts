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

export function getFluxProxyMediaLimits(model: VideoModel) {
  const family25 = model.id === "seedance_2_5_international";
  return Object.freeze({
    image: family25 ? 30 : null,
    video: family25 ? 10 : null,
    audio: family25 ? 10 : null,
    videoTotalDuration: family25 ? 30 : null,
    audioTotalDuration: family25 ? 30 : null,
    referenceCountLimitsVerified: family25,
  });
}

export function getFluxProxyInputSlots(model: VideoModel) {
  const limits = getFluxProxyMediaLimits(model);
  return Object.freeze([
    { type: "image" as const, label: "Images", max: limits.image, roles: ["reference_image", "first_frame", "last_frame"] as FluxProxyMentionRole[] },
    { type: "video" as const, label: "Videos", max: limits.video, roles: ["reference_video"] as FluxProxyMentionRole[] },
    { type: "audio" as const, label: "Audio", max: limits.audio, roles: ["reference_audio"] as FluxProxyMentionRole[] },
  ]);
}

export function getFluxProxyMediaCounters(media: UploadMediaItem[]) {
  const count = (type: UploadMediaItem["type"]) => media.filter((item) => item.type === type).length;
  const duration = (type: UploadMediaItem["type"]) => media.filter((item) => item.type === type).reduce((sum, item) => sum + (item.duration || 0), 0);
  return Object.freeze({ images: count("image"), videos: count("video"), audios: count("audio"), videoDuration: duration("video"), audioDuration: duration("audio") });
}

export function getFluxProxyMentionToken(item: UploadMediaItem, typeIndex: number): string {
  if (item.type === "image") {
    if (item.role === "start_frame") return "@FirstFrame";
    if (item.role === "end_frame") return "@LastFrame";
    return `@Image${typeIndex}`;
  }
  if (item.type === "video") return `@Video${typeIndex}`;
  return `@Audio${typeIndex}`;
}

export function listFluxProxyMentionTokens(media: UploadMediaItem[]) {
  const indexes = { image: 0, video: 0, audio: 0 };
  return media.map((item) => {
    indexes[item.type] += 1;
    return getFluxProxyMentionToken(item, indexes[item.type]);
  });
}

export function getFluxProxyReviewSummary(media: UploadMediaItem[], providerModel?: string) {
  let preparing = 0; let failed = 0; let active = 0; let modelMismatch = 0;
  for (const item of media) {
    const review = item.providerAssetReview;
    if (!review || review.status === "NOT_SUBMITTED" || review.status === "PROCESSING") preparing += 1;
    else if (review.status === "FAILED") failed += 1;
    else if (review.providerModel !== providerModel) modelMismatch += 1;
    else active += 1;
  }
  return Object.freeze({ preparing, failed, active, modelMismatch, ready: media.length === active });
}
