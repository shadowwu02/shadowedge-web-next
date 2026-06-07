"use client";

import { useCallback, useMemo, useState } from "react";
import { createVideoTask, getVideoStatus } from "@/lib/video-api";
import { buildMediaAwarePrompt, getReadyMentionableMediaItems, toGenerationMediaList } from "@/lib/video-mentions";
import { getVideoOutputUrl, isVideoCompletedStatus, isVideoFailedStatus } from "@/lib/utils";
import type { UploadMediaItem, VideoGenerationRequest, VideoModel, VideoStatusResponse, VideoTaskRecord } from "@/types/video";

type SubmitVideoOptions = {
  prompt: string;
  model: VideoModel;
  duration: number;
  ratio: string;
  quality: string;
  generateAudio: boolean;
  media: UploadMediaItem[];
};

function isRemoteUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function validateSubmitOptions(options: SubmitVideoOptions) {
  if (!options.prompt.trim()) {
    return "Please enter a prompt first.";
  }

  if (options.media.some((item) => item.uploadStatus === "uploading")) {
    return "Media is still uploading. Please wait for uploads to finish.";
  }

  if (options.media.some((item) => item.uploadStatus === "failed")) {
    return "Some media failed to upload. Remove failed items before generating.";
  }

  if (options.media.some((item) => item.previewUrl?.startsWith("blob:") && !item.url)) {
    return "Local preview media cannot be used for generation. Please wait for upload to finish.";
  }

  if (options.media.some((item) => item.url && !isRemoteUrl(item.url))) {
    return "Only uploaded remote media URLs can be used for generation.";
  }

  return "";
}

function buildVideoRequest(options: SubmitVideoOptions): VideoGenerationRequest {
  const mentionMediaItems = getReadyMentionableMediaItems(options.media);
  const mediaList = toGenerationMediaList(mentionMediaItems);
  const images = mediaList.filter((item) => item.type === "image").map((item) => item.url);
  const videos = mediaList.filter((item) => item.type === "video").map((item) => item.url);
  const audios = mediaList.filter((item) => item.type === "audio").map((item) => item.url);
  const enhancedPrompt = buildMediaAwarePrompt(options.prompt, mentionMediaItems);
  const primaryImageUrl = images[0] || "";
  const primaryVideoUrl = videos[0] || "";

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
    upload_assets: {
      media: mediaList,
    },
    clientCost: options.model.credits,
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
    },
  };
}

export function useVideoGeneration() {
  const [task, setTask] = useState<VideoTaskRecord | null>(null);
  const [history, setHistory] = useState<VideoTaskRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = useCallback(async (options: SubmitVideoOptions) => {
    setIsSubmitting(true);
    setError("");

    try {
      const validationMessage = validateSubmitOptions(options);
      if (validationMessage) {
        throw new Error(validationMessage);
      }

      const request = buildVideoRequest(options);
      const response = await createVideoTask(request);
      const result = response.data;

      if (!result?.jobId) {
        throw new Error("No jobId returned by video API.");
      }

      const nextTask: VideoTaskRecord = {
        jobId: result.jobId,
        providerJobId: result.providerJobId || result.jobId,
        dbJobId: result.dbJobId || null,
        status: result.status || "starting",
        model: options.model.label,
        modelId: options.model.id,
        frontendModel: options.model.label,
        providerModel: result.providerModel || options.model.providerModel,
        provider: result.provider || options.model.provider,
        duration: `${options.duration}s`,
        ratio: options.ratio,
        quality: options.quality,
        prompt: options.prompt.trim(),
        reference_images: request.reference_images,
        reference_videos: request.reference_videos,
        reference_audios: request.reference_audios,
        mediaList: request.mediaList,
        outputUrls: [],
        videoUrl: "",
        createdAt: Date.now(),
      };

      setTask(nextTask);
      setHistory((current) => [nextTask, ...current.filter((item) => item.jobId !== nextTask.jobId)].slice(0, 12));
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Video generation request failed.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const refreshTask = useCallback(async (jobId: string) => {
    let response;
    try {
      response = await getVideoStatus(jobId);
    } catch (statusError) {
      const message = statusError instanceof Error ? statusError.message : "Failed to refresh video status.";
      setError(message);
      throw statusError;
    }

    const result = response.data || {};

    setTask((current) => {
      if (!current || current.jobId !== jobId) return current;
      const outputUrl = result.videoUrl || result.outputUrl || result.outputUrls?.[0] || result.output_urls?.[0] || "";
      const next: VideoTaskRecord = {
        ...current,
        status: result.status || current.status,
        videoUrl: outputUrl || current.videoUrl,
        outputUrls: outputUrl ? [outputUrl] : current.outputUrls,
        provider: result.provider || current.provider,
        providerModel: result.providerModel || result.model || current.providerModel,
        completedAt: result.completedAt || result.completed_at || current.completedAt,
        error_message: result.error_message || result.errorMessage || result.error || current.error_message,
        message: result.message || current.message,
        cost_credits: result.cost_credits ?? current.cost_credits,
      };

      setHistory((items) => [next, ...items.filter((item) => item.jobId !== next.jobId)].slice(0, 12));
      return next;
    });

    return result as VideoStatusResponse;
  }, []);

  const visibleHistory = useMemo(
    () => history.filter((record) => isVideoCompletedStatus(record.status) || isVideoFailedStatus(record.status) || getVideoOutputUrl(record)),
    [history],
  );

  return {
    task,
    history: visibleHistory,
    error,
    isSubmitting,
    submit,
    refreshTask,
  };
}
