"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { getCurrentUserProfile } from "@/lib/auth-api";
import { createVideoTask, getVideoHistory, getVideoStatus, saveVideoHistory } from "@/lib/video-api";
import { buildMediaAwarePrompt, getReadyMentionableMediaItems, toGenerationMediaList } from "@/lib/video-mentions";
import { estimateVideoCreditsForParams } from "@/lib/video/videoModelRules";
import {
  getSafeHistoryOutputUrl,
  getVideoHistoryStableKey,
  isVideoStaleActiveRecord,
  isVideoTerminalPollingRecord,
  mergeVideoHistory,
  normalizeVideoPollingStatus,
  preferLatestVideoTask,
  selectRecoverableVideoPollingTask,
} from "@/lib/video/historyUtils";
import { serializeMentionBindings, type VideoMentionBinding } from "@/lib/video/videoMentionBindings";
import { isVideoActiveStatus } from "@/lib/utils";
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
  meta?: Record<string, unknown>;
  maxConcurrency?: number | null;
  onSubmitError?: (message: string) => void;
};

type SubmitValidationCopy = {
  activeGeneration: string;
  localPreviewMedia: string;
  mediaFailedBeforeGenerate: string;
  mediaUploading: string;
  promptRequired: string;
  remoteMediaOnly: string;
};

function isRemoteUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function validateSubmitOptions(options: SubmitVideoOptions, copy: SubmitValidationCopy) {
  if (!options.prompt.trim()) {
    return copy.promptRequired;
  }

  if (options.media.some((item) => item.uploadStatus === "uploading")) {
    return copy.mediaUploading;
  }

  if (options.media.some((item) => item.uploadStatus === "failed")) {
    return copy.mediaFailedBeforeGenerate;
  }

  if (options.media.some((item) => item.previewUrl?.startsWith("blob:") && !item.url)) {
    return copy.localPreviewMedia;
  }

  if (options.media.some((item) => item.url && !isRemoteUrl(item.url))) {
    return copy.remoteMediaOnly;
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
    upload_assets: {
      media: mediaList,
    },
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

function getActiveTaskCount(records: VideoTaskRecord[]) {
  return records.filter((record) => isVideoActiveStatus(record.status) && !isVideoStaleActiveRecord(record)).length;
}

function findTaskByJobId(records: VideoTaskRecord[], jobId: string) {
  return records.find((record) =>
    [record.jobId, record.providerJobId, record.dbJobId].filter(Boolean).some((value) => String(value) === String(jobId)),
  );
}

function mergeStatusIntoTask(base: VideoTaskRecord, result: VideoStatusResponse): VideoTaskRecord {
  const candidate = {
    ...base,
    ...result,
  };
  const outputUrl = getSafeHistoryOutputUrl(candidate) || base.videoUrl || base.outputUrl || base.outputUrls?.[0] || "";
  const status = normalizeVideoPollingStatus(result.status || base.status, outputUrl);

  return {
    ...base,
    status,
    videoUrl: outputUrl || base.videoUrl,
    outputUrl: outputUrl || base.outputUrl,
    outputUrls: outputUrl ? [outputUrl] : base.outputUrls,
    provider: result.provider || base.provider,
    providerModel: result.providerModel || result.model || base.providerModel,
    completedAt: result.completedAt || result.completed_at || base.completedAt,
    updatedAt: Date.now(),
    error_message: result.error_message || result.errorMessage || result.error || base.error_message,
    message: result.message || base.message,
    cost_credits: result.cost_credits ?? base.cost_credits,
  };
}

function markStatusCheckExpired(base: VideoTaskRecord, message: string): VideoTaskRecord {
  return {
    ...base,
    status: "failed",
    error_message: message,
    message,
    updatedAt: Date.now(),
    meta: {
      ...(base.meta || {}),
      statusCheckExpired: true,
      status_check_expired: true,
    },
  };
}

export function useVideoGeneration() {
  const { t } = useI18n();
  const [task, setTask] = useState<VideoTaskRecord | null>(null);
  const [localHistory, setLocalHistory] = useState<VideoTaskRecord[]>([]);
  const [serverHistory, setServerHistory] = useState<VideoHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [hiddenHistoryKeys, setHiddenHistoryKeys] = useState<Set<string>>(() => new Set());
  const taskRef = useRef<VideoTaskRecord | null>(null);
  const visibleHistoryRef = useRef<VideoTaskRecord[]>([]);

  const visibleHistory = useMemo(
    () => mergeVideoHistory(localHistory, serverHistory).filter((record, index) => !hiddenHistoryKeys.has(getVideoHistoryStableKey(record, `history:${index}`))),
    [hiddenHistoryKeys, localHistory, serverHistory],
  );

  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  useEffect(() => {
    visibleHistoryRef.current = visibleHistory;
  }, [visibleHistory]);

  const activeTaskCount = useMemo(() => {
    const activeIds = new Set<string>();
    visibleHistory.forEach((record) => {
      if (!isVideoActiveStatus(record.status)) return;
      if (isVideoStaleActiveRecord(record)) return;
      activeIds.add(getVideoHistoryStableKey(record, `active:${record.createdAt}`));
    });
    if (task && isVideoActiveStatus(task.status) && !isVideoStaleActiveRecord(task)) activeIds.add(getVideoHistoryStableKey(task, "current"));
    return activeIds.size;
  }, [task, visibleHistory]);

  const refreshCredits = useCallback(async () => {
    try {
      await getCurrentUserProfile();
    } catch (creditsError) {
      console.warn("[ShadowEdge Next] credits refresh failed:", creditsError);
    }
  }, []);

  const submitValidationCopy = useMemo<SubmitValidationCopy>(() => ({
    activeGeneration: t("video.errors.activeGeneration"),
    localPreviewMedia: t("video.errors.localPreviewMedia"),
    mediaFailedBeforeGenerate: t("video.errors.mediaFailedBeforeGenerate"),
    mediaUploading: t("video.errors.mediaUploading"),
    promptRequired: t("video.errors.promptRequired"),
    remoteMediaOnly: t("video.errors.remoteMediaOnly"),
  }), [t]);

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    setHistoryError("");

    try {
      const items = await getVideoHistory(80);
      setServerHistory(items);
      setTask((current) => {
        const recoverableTask = selectRecoverableVideoPollingTask(mergeVideoHistory(visibleHistoryRef.current, items));
        return preferLatestVideoTask(current, recoverableTask);
      });
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : t("video.errors.serverHistoryLoadFailed");
      setHistoryError(message);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [t]);

  const submit = useCallback(async (options: SubmitVideoOptions): Promise<VideoTaskRecord | null> => {
    if (isSubmitting) {
      const message = submitValidationCopy.activeGeneration;
      setError(message);
      options.onSubmitError?.(message);
      return null;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const currentActiveCount = getActiveTaskCount(visibleHistory);

      if (currentActiveCount > 0) {
        throw new Error(submitValidationCopy.activeGeneration);
      }

      const validationMessage = validateSubmitOptions(options, submitValidationCopy);
      if (validationMessage) {
        throw new Error(validationMessage);
      }

      const request = buildVideoRequest(options);
      const response = await createVideoTask(request);
      const result = response.data;

      if (!result?.jobId) {
        throw new Error(t("video.errors.noJobId"));
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
        updatedAt: Date.now(),
      };

      setTask((current) => preferLatestVideoTask(current, nextTask));
      setLocalHistory((current) => [nextTask, ...current.filter((item) => item.jobId !== nextTask.jobId)].slice(0, 20));
      void saveVideoHistory({ ...nextTask, source: "local" }).catch((saveError) => {
        console.warn("[ShadowEdge Next] save video history failed:", saveError);
      });
      void refreshCredits();
      return nextTask;
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : t("video.errors.generationRequestFailed");
      setError(message);
      options.onSubmitError?.(message);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, refreshCredits, submitValidationCopy, t, visibleHistory]);

  const refreshTask = useCallback(async (jobId: string) => {
    const currentTask = taskRef.current;
    const baseTask =
      (currentTask && findTaskByJobId([currentTask], jobId)) ||
      findTaskByJobId(visibleHistoryRef.current, jobId);
    let response;
    const expiredStatusMessage = t("video.result.statusExpired");
    try {
      response = await getVideoStatus(jobId);
    } catch (statusError) {
      if (baseTask && isVideoStaleActiveRecord(baseTask)) {
        const next = markStatusCheckExpired(baseTask, expiredStatusMessage);
        setLocalHistory((items) => [next, ...items.filter((item) => item.jobId !== next.jobId)].slice(0, 20));
        setTask((current) => (current && getVideoHistoryStableKey(current, "") === getVideoHistoryStableKey(next, "") ? next : current));
        setError(expiredStatusMessage);
        return {
          jobId,
          status: "failed",
          error_message: expiredStatusMessage,
          message: expiredStatusMessage,
        } as VideoStatusResponse;
      }

      const message = statusError instanceof Error ? statusError.message : t("video.errors.statusRefreshFailed");
      setError(message === "Unable to check generation status. Please contact support." ? expiredStatusMessage : message);
      throw statusError;
    }

    const result = response.data || {};

    if (baseTask) {
      const next = mergeStatusIntoTask(baseTask, result as VideoStatusResponse);
      setLocalHistory((items) => [next, ...items.filter((item) => item.jobId !== next.jobId)].slice(0, 20));
      setTask((current) => preferLatestVideoTask(current, next));

      if (isVideoTerminalPollingRecord(next)) {
        void saveVideoHistory({ ...next, source: "local" }).catch((saveError) => {
          console.warn("[ShadowEdge Next] save completed video history failed:", saveError);
        });
        void refreshCredits();
      }
    }

    return result as VideoStatusResponse;
  }, [refreshCredits, t]);

  const hideHistoryRecord = useCallback((record: VideoTaskRecord) => {
    const key = getVideoHistoryStableKey(record, record.jobId || record.providerJobId || record.dbJobId || String(record.createdAt || ""));
    if (!key) return;
    setHiddenHistoryKeys((current) => {
      const next = new Set(current);
      next.add(key);
      return next;
    });
  }, []);

  return {
    activeTaskCount,
    task,
    history: visibleHistory,
    historyError,
    isHistoryLoading,
    error,
    isSubmitting,
    loadHistory,
    hideHistoryRecord,
    refreshCredits,
    submit,
    refreshTask,
  };
}
