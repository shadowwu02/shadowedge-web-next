import {
  buildMediaAwarePrompt,
  getReadyMentionableMediaItems,
  toGenerationMediaList,
} from "@/lib/video-mentions";
import { estimateVideoCreditsForParams } from "@/lib/video/videoModelRules";
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
};

export function buildVideoGenerationRequest(
  options: BuildVideoGenerationRequestInput,
): VideoGenerationRequest {
  const mentionMediaItems = getReadyMentionableMediaItems(options.media);
  const mediaList = toGenerationMediaList(mentionMediaItems);
  const images = mediaList
    .filter((item) => item.type === "image")
    .map((item) => item.url);
  const videos = mediaList
    .filter((item) => item.type === "video")
    .map((item) => item.url);
  const audios = mediaList
    .filter((item) => item.type === "audio")
    .map((item) => item.url);
  const mentionBindings = sanitizeVideoMentionBindings(
    options.prompt,
    serializeMentionBindings(options.mentionBindings || []),
    options.media,
  ).mentionBindings;
  const enhancedPrompt = buildMediaAwarePrompt(
    options.prompt,
    mentionMediaItems,
    mentionBindings,
    { aspectRatio: options.ratio },
  );
  const primaryImageUrl = images[0] || "";
  const primaryVideoUrl = videos[0] || "";
  const estimatedCredits = estimateVideoCreditsForParams(
    options.model.id || options.model.providerModel || options.model.label,
    {
      duration: options.duration,
      generateAudio: options.generateAudio,
      quality: options.quality,
      ratio: options.ratio,
    },
    options.model.credits,
  );

  return {
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
    mediaList,
    mode: mediaList.length ? "media-to-video" : "text-to-video",
    image: primaryImageUrl,
    imageUrl: primaryImageUrl,
    video: primaryVideoUrl,
    videoUrl: primaryVideoUrl,
    upload_assets: { media: mediaList },
    clientCost: estimatedCredits,
    meta: {
      frontend_model: options.model.label,
      model_id: options.model.id,
      duration: `${options.duration}s`,
      ratio: options.ratio,
      quality: options.quality,
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
