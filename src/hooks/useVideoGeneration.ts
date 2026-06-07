"use client";

import { useCallback, useMemo, useState } from "react";
import { createVideoTask, getVideoStatus } from "@/lib/video-api";
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

function mediaUrl(item: UploadMediaItem) {
  return item.url || item.previewUrl || "";
}

function buildVideoRequest(options: SubmitVideoOptions): VideoGenerationRequest {
  const images = options.media.filter((item) => item.type === "image").map(mediaUrl).filter(Boolean);
  const videos = options.media.filter((item) => item.type === "video").map(mediaUrl).filter(Boolean);
  const audios = options.media.filter((item) => item.type === "audio").map(mediaUrl).filter(Boolean);

  return {
    prompt: options.prompt,
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
    mediaList: [
      ...images.map((url) => ({ type: "image" as const, url, role: "reference" })),
      ...videos.map((url) => ({ type: "video" as const, url, role: "reference" })),
      ...audios.map((url) => ({ type: "audio" as const, url, role: "reference" })),
    ],
    clientCost: options.model.credits,
    meta: {
      frontend_model: options.model.label,
      model_id: options.model.id,
      duration: `${options.duration}s`,
      ratio: options.ratio,
      quality: options.quality,
      reference_images: images,
      reference_videos: videos,
      reference_audios: audios,
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
        prompt: options.prompt,
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
    const response = await getVideoStatus(jobId);
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
