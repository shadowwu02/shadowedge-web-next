"use client";

import { useCallback, useMemo, useState } from "react";
import { getCurrentUserProfile } from "@/lib/auth-api";
import { createVideoTask, getVideoHistory, getVideoStatus, saveVideoHistory } from "@/lib/video-api";
import { buildMediaAwarePrompt, getReadyMentionableMediaItems, toGenerationMediaList } from "@/lib/video-mentions";
import { getVideoHistoryStableKey, mergeVideoHistory } from "@/lib/video/historyUtils";
import { serializeMentionBindings, type VideoMentionBinding } from "@/lib/video/videoMentionBindings";
import { getVideoOutputUrl, isVideoActiveStatus, isVideoCompletedStatus, isVideoFailedStatus } from "@/lib/utils";
import type { UploadMediaItem, VideoGenerationRequest, VideoHistoryItem, VideoModel, VideoStatusResponse, VideoTaskRecord } from "@/types/video";

type SubmitVideoOptions = {
  prompt: string;
  model: VideoModel;
  duration: number;
  ratio: string;
  quality: string;
  generateAudio: boolean;
  media: UploadMediaItem[];
  mentionBindings?: VideoMentionBinding[];
  maxConcurrency?: number | null;
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
  const mentionBindings = serializeMentionBindings(options.mentionBindings || []);
  const enhancedPrompt = buildMediaAwarePrompt(options.prompt, mentionMediaItems, mentionBindings);
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
      mentionBindings,
    },
  };
}

function getActiveTaskCount(records: VideoTaskRecord[]) {
  return records.filter((record) => isVideoActiveStatus(record.status)).length;
}

function activeTaskMessage() {
  return "You already have active generation tasks. Please wait until one finishes.";
}

export function useVideoGeneration() {
  const [task, setTask] = useState<VideoTaskRecord | null>(null);
  const [localHistory, setLocalHistory] = useState<VideoTaskRecord[]>([]);
  const [serverHistory, setServerHistory] = useState<VideoHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const visibleHistory = useMemo(
    () => mergeVideoHistory(localHistory, serverHistory),
    [localHistory, serverHistory],
  );

  const activeTaskCount = useMemo(() => {
    const activeIds = new Set<string>();
    visibleHistory.forEach((record) => {
      if (!isVideoActiveStatus(record.status)) return;
      activeIds.add(getVideoHistoryStableKey(record, `active:${record.createdAt}`));
    });
    if (task && isVideoActiveStatus(task.status)) activeIds.add(getVideoHistoryStableKey(task, "current"));
    return activeIds.size;
  }, [task, visibleHistory]);

  const refreshCredits = useCallback(async () => {
    try {
      await getCurrentUserProfile();
    } catch (creditsError) {
      console.warn("[ShadowEdge Next] credits refresh failed:", creditsError);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    setHistoryError("");

    try {
      const items = await getVideoHistory(80);
      setServerHistory(items);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Server history failed to load.";
      setHistoryError(message);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const submit = useCallback(async (options: SubmitVideoOptions) => {
    if (isSubmitting) {
      setError(activeTaskMessage());
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const currentActiveCount = getActiveTaskCount(visibleHistory);

      if (currentActiveCount > 0) {
        throw new Error(activeTaskMessage());
      }

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
        meta: request.meta,
        outputUrls: [],
        videoUrl: "",
        createdAt: Date.now(),
      };

      setTask(nextTask);
      setLocalHistory((current) => [nextTask, ...current.filter((item) => item.jobId !== nextTask.jobId)].slice(0, 20));
      void saveVideoHistory({ ...nextTask, source: "local" }).catch((saveError) => {
        console.warn("[ShadowEdge Next] save video history failed:", saveError);
      });
      void refreshCredits();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Video generation request failed.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, refreshCredits, visibleHistory]);

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

      setLocalHistory((items) => [next, ...items.filter((item) => item.jobId !== next.jobId)].slice(0, 20));
      if (isVideoCompletedStatus(next.status) || isVideoFailedStatus(next.status) || getVideoOutputUrl(next)) {
        void saveVideoHistory({ ...next, source: "local" }).catch((saveError) => {
          console.warn("[ShadowEdge Next] save completed video history failed:", saveError);
        });
        void refreshCredits();
      }
      return next;
    });

    return result as VideoStatusResponse;
  }, [refreshCredits]);

  return {
    activeTaskCount,
    task,
    history: visibleHistory,
    historyError,
    isHistoryLoading,
    error,
    isSubmitting,
    loadHistory,
    refreshCredits,
    submit,
    refreshTask,
  };
}
