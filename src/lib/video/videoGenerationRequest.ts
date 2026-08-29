import { buildMediaAwarePrompt, toGenerationMediaList } from "@/lib/video-mentions";
import {
  assertVideoGenerationParamsForRule,
  estimateVideoCreditsForParams,
  getVideoModelRuleFromRegistry,
} from "@/lib/video/videoModelRules";
import { assertCanonicalReferenceItems } from "@/lib/video/canonicalReferenceAssets";
import { type VideoMentionBinding } from "@/lib/video/videoMentionBindings";
import type {
  UploadMediaItem,
  VideoGenerationRequest,
  VideoModel,
} from "@/types/video";
import { createVideoClientRequestId, normalizeVideoClientRequestId } from "@/lib/video/videoClientRequestId";
import { assertVideoTupleForGeneration, getVideoTuplePricingDecision } from "@/lib/video/videoTupleAuthority";
import { isFluxProxyInternationalModel, toFluxProxyReferenceRole } from "@/lib/video/fluxproxyInternational";
import { resolveVideoPromptBoundReferences } from "@/lib/video/videoPromptBoundReferences";
import {
  getGeneratedAudioReferenceIssue,
  validateReferenceSelectionForRule,
} from "@/lib/video/videoReferenceRules";

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
  const modelRule = getVideoModelRuleFromRegistry(options.model);
  assertVideoGenerationParamsForRule(modelRule, {
    duration: options.duration,
    generateAudio: options.generateAudio,
    quality: options.quality,
    ratio: options.ratio,
  });
  const catalogTuple = assertVideoTupleForGeneration(options.model, {
    duration: options.duration,
    generateAudio: options.generateAudio,
    ratio: options.ratio,
    resolution: options.quality,
  });
  const catalogPricing = catalogTuple ? getVideoTuplePricingDecision(options.model, {
    duration: options.duration,
    resolution: options.quality,
    generateAudio: options.generateAudio,
  }) : null;
  if (options.generateAudio && options.model.supportsAudio === false) {
    throw Object.assign(new Error("Generated audio is not available for the selected video model."), {
      code: "VIDEO_AUDIO_UNSUPPORTED",
    });
  }
  const clientRequestId = normalizeVideoClientRequestId(options.clientRequestId) || createVideoClientRequestId();
  const promptReferences = resolveVideoPromptBoundReferences({
    media: options.media,
    mentionBindings: options.mentionBindings,
    prompt: options.prompt,
  });
  const mentionBindings = promptReferences.mentionBindings;
  if (promptReferences.unresolvedMentions.length) {
    throw Object.assign(new Error("One or more Prompt references are no longer available."), {
      code: "VIDEO_PROMPT_REFERENCE_UNRESOLVED",
    });
  }
  assertCanonicalReferenceItems(promptReferences.resolvedItems);
  const referencedMediaItems = promptReferences.activeBindings;
  const referenceSelectionIssue = validateReferenceSelectionForRule(modelRule, [], promptReferences.activeItems);
  if (referenceSelectionIssue) {
    throw Object.assign(new Error(referenceSelectionIssue), {
      code: "VIDEO_PROMPT_REFERENCE_SELECTION_INVALID",
    });
  }
  const generatedAudioReferenceIssue = getGeneratedAudioReferenceIssue(
    modelRule,
    options.generateAudio,
    referencedMediaItems,
  );
  if (generatedAudioReferenceIssue) {
    throw Object.assign(new Error(generatedAudioReferenceIssue), {
      code: "VIDEO_AUDIO_REFERENCE_GENERATED_AUDIO_CONFLICT",
    });
  }
  const mediaList = toGenerationMediaList(referencedMediaItems);
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
  const isFluxProxyInternational = isFluxProxyInternationalModel(options.model);
  const fluxProxyReferences = isFluxProxyInternational
    ? referencedMediaItems.map((item) => ({
        assetId: item.assetId!,
        type: item.type,
        role: toFluxProxyReferenceRole(item),
      }))
    : undefined;
  const enhancedPrompt = buildMediaAwarePrompt(
    options.prompt,
    referencedMediaItems,
    mentionBindings,
    { aspectRatio: options.ratio },
  );
  const transportMediaList = isFluxProxyInternational ? [] : mediaList;
  const transportImages = isFluxProxyInternational ? [] : images;
  const transportVideos = isFluxProxyInternational ? [] : videos;
  const transportAudios = isFluxProxyInternational ? [] : audios;
  const primaryImageUrl = transportImages[0] || "";
  const primaryVideoUrl = transportVideos[0] || "";
  const estimatedCredits = catalogPricing?.creditAmount ?? (
    typeof options.estimatedCredits === "number" && Number.isFinite(options.estimatedCredits)
      ? options.estimatedCredits
      : estimateVideoCreditsForParams(
        modelRule,
        {
          duration: options.duration,
          generateAudio: options.generateAudio,
          quality: options.quality,
          ratio: options.ratio,
        },
        options.model.credits,
      )
  );

  return {
    clientRequestId,
    client_request_id: clientRequestId,
    prompt: enhancedPrompt,
    frontendModel: options.model.label,
    model: options.model.id,
    modelId: options.model.id,
    providerModel: isFluxProxyInternational ? "" : options.model.providerModel || "",
    duration: options.duration,
    aspect_ratio: options.ratio,
    ratio: options.ratio,
    resolution: options.quality,
    quality: options.quality,
    generate_audio: options.generateAudio,
    assets: { images: transportImages, videos: transportVideos, audios: transportAudios },
    first_frame_image: "",
    last_frame_image: "",
    reference_images: transportImages,
    reference_videos: transportVideos,
    reference_audios: transportAudios,
    reference_image_asset_ids: imageAssetIds,
    reference_video_asset_ids: videoAssetIds,
    reference_audio_asset_ids: audioAssetIds,
    ...(fluxProxyReferences ? { references: fluxProxyReferences } : {}),
    mediaList: transportMediaList,
    mode: referencedMediaItems.length ? "media-to-video" : "text-to-video",
    image: primaryImageUrl,
    imageUrl: primaryImageUrl,
    video: primaryVideoUrl,
    videoUrl: primaryVideoUrl,
    upload_assets: { media: transportMediaList },
    clientCost: estimatedCredits,
    ...(catalogPricing ? {
      pricingVersion: catalogPricing.pricingVersion,
      pricing_version: catalogPricing.pricingVersion,
      creditAmount: catalogPricing.creditAmount,
    } : {}),
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
      ...(catalogPricing ? {
        pricingVersion: catalogPricing.pricingVersion,
        creditAmount: catalogPricing.creditAmount,
      } : {}),
      original_prompt: options.prompt,
      enhanced_prompt: enhancedPrompt,
      mode: referencedMediaItems.length ? "media-to-video" : "text-to-video",
      assets: { images: transportImages, videos: transportVideos, audios: transportAudios },
      reference_images: transportImages,
      reference_videos: transportVideos,
      reference_audios: transportAudios,
      mediaList: transportMediaList,
      mentionBindings,
      ...(options.meta || {}),
    },
  };
}
