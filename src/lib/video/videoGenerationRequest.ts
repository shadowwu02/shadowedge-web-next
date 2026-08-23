import {
  buildMediaAwarePrompt,
  findPromptMentions,
  getReadyMentionableMediaItems,
  getReferencePromptBindings,
  toGenerationMediaList,
} from "@/lib/video-mentions";
import { estimateVideoCreditsForParams, getVideoModelRuleFromRegistry } from "@/lib/video/videoModelRules";
import { assertCanonicalReferenceItems } from "@/lib/video/canonicalReferenceAssets";
import {
  sanitizeVideoMentionBindings,
  serializeMentionBindings,
  type VideoMentionBinding,
} from "@/lib/video/videoMentionBindings";
import type {
  UploadMediaItem,
  VideoGenerationRequest,
  VideoModel,
} from "@/types/video";
import { createVideoClientRequestId, normalizeVideoClientRequestId } from "@/lib/video/videoClientRequestId";

export type BuildVideoGenerationRequestInput = {
  prompt: string;
  model: VideoModel;
  duration: number;
  ratio: string;
  quality: string;
  generateAudio: boolean;
  media: UploadMediaItem[];
  mentionBindings?: VideoMentionBinding[];
  meta?: Record<string, unknown>;
  estimatedCredits?: number;
  clientRequestId?: string;
};

export function buildVideoGenerationRequest(
  options: BuildVideoGenerationRequestInput,
): VideoGenerationRequest {
  const clientRequestId = normalizeVideoClientRequestId(options.clientRequestId) || createVideoClientRequestId();
  const mentionMediaItems = getReadyMentionableMediaItems(options.media);
  const mentionBindings = sanitizeVideoMentionBindings(
    options.prompt,
    serializeMentionBindings(options.mentionBindings || []),
    options.media,
  ).mentionBindings;
  // Reference transport is opt-in: ready attachments are sent only when the
  // prompt explicitly binds them through @Image/@Video/@Audio mentions.
  const referencedMediaItems = findPromptMentions(options.prompt).length
    ? getReferencePromptBindings(options.prompt, mentionMediaItems, mentionBindings)
    : [];
  const mediaList = toGenerationMediaList(referencedMediaItems);
  assertCanonicalReferenceItems(referencedMediaItems);
  const images = mediaList
    .filter((item) => item.type === "image")
    .map((item) => item.url);
  const videos = mediaList
    .filter((item) => item.type === "video")
    .map((item) => item.url);
  const audios = mediaList
    .filter((item) => item.type === "audio")
    .map((item) => item.url);
  const imageAssetIds = referencedMediaItems.filter((item) => item.type === "image").map((item) => item.assetId!);
  const videoAssetIds = referencedMediaItems.filter((item) => item.type === "video").map((item) => item.assetId!);
  const audioAssetIds = referencedMediaItems.filter((item) => item.type === "audio").map((item) => item.assetId!);
  const enhancedPrompt = buildMediaAwarePrompt(
    options.prompt,
    referencedMediaItems,
    mentionBindings,
    { aspectRatio: options.ratio },
  );
  const primaryImageUrl = images[0] || "";
  const primaryVideoUrl = videos[0] || "";
  const estimatedCredits =
    typeof options.estimatedCredits === "number" &&
    Number.isFinite(options.estimatedCredits)
    ? options.estimatedCredits
    : estimateVideoCreditsForParams(
        getVideoModelRuleFromRegistry(options.model),
        {
          duration: options.duration,
          generateAudio: options.generateAudio,
          quality: options.quality,
          ratio: options.ratio,
        },
        options.model.credits,
      );

  return {
    clientRequestId,
    client_request_id: clientRequestId,
    prompt: enhancedPrompt,
    frontendModel: options.model.label,
    model: options.model.id,
    modelId: options.model.id,
    providerModel: options.model.providerModel || "",
    duration: options.duration,
    aspect_ratio: options.ratio,
    ratio: options.ratio,
    resolution: options.quality,
    quality: options.quality,
    generate_audio: options.generateAudio,
    assets: { images, videos, audios },
    first_frame_image: "",
    last_frame_image: "",
    reference_images: images,
    reference_videos: videos,
    reference_audios: audios,
    reference_image_asset_ids: imageAssetIds,
    reference_video_asset_ids: videoAssetIds,
    reference_audio_asset_ids: audioAssetIds,
    mediaList,
    mode: mediaList.length ? "media-to-video" : "text-to-video",
    image: primaryImageUrl,
    imageUrl: primaryImageUrl,
    video: primaryVideoUrl,
    videoUrl: primaryVideoUrl,
    upload_assets: { media: mediaList },
    clientCost: estimatedCredits,
    meta: {
      clientRequestId,
      client_request_id: clientRequestId,
      frontend_model: options.model.label,
      model_id: options.model.id,
      duration: `${options.duration}s`,
      ratio: options.ratio,
      quality: options.quality,
      generate_audio: options.generateAudio,
      generateAudio: options.generateAudio,
      original_prompt: options.prompt,
      enhanced_prompt: enhancedPrompt,
      mode: mediaList.length ? "media-to-video" : "text-to-video",
      assets: { images, videos, audios },
      reference_images: images,
      reference_videos: videos,
      reference_audios: audios,
      mediaList,
      mentionBindings,
      ...(options.meta || {}),
    },
  };
}
