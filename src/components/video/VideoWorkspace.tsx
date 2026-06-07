"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { GenerateButton } from "@/components/video/GenerateButton";
import { HistoryPanel } from "@/components/video/HistoryPanel";
import { ModelSelector } from "@/components/video/ModelSelector";
import { PromptBox } from "@/components/video/PromptBox";
import { ReferenceMediaMention } from "@/components/video/ReferenceMediaMention";
import { ResultViewer } from "@/components/video/ResultViewer";
import { UploadBox } from "@/components/video/UploadBox";
import { type VideoParams, VideoParamsPanel } from "@/components/video/VideoParamsPanel";
import { useTaskPolling } from "@/hooks/useTaskPolling";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useCredits } from "@/hooks/useCredits";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import { getVideoModels } from "@/lib/video-api";
import { isVideoActiveStatus } from "@/lib/utils";
import type { UploadMediaItem, VideoModel, VideoStatusResponse } from "@/types/video";

const fallbackModels: VideoModel[] = [
  {
    id: "seedance_2_0",
    label: "Seedance 2.0",
    provider: "auto",
    providerModel: "seedance_2_0",
    desc: "General video generation model. Replace with live model registry when available.",
    credits: 12,
    durations: [5, 8, 10],
    durationDefault: 5,
    ratios: ["16:9", "9:16", "1:1"],
    qualities: ["720p", "1080p"],
    uploadSlots: ["media"],
  },
  {
    id: "veo3_1",
    label: "Veo 3.1",
    provider: "auto",
    providerModel: "veo3_1",
    desc: "Cinematic video model placeholder.",
    credits: 16,
    durations: [5, 8],
    durationDefault: 5,
    ratios: ["16:9", "9:16"],
    qualities: ["720p", "1080p"],
    uploadSlots: ["image", "last_frame_image"],
  },
];

function buildRetryMedia(record: { mediaList?: UploadMediaItem[] | Array<{ id?: string; type: UploadMediaItem["type"]; url: string; name?: string; mimeType?: string; size?: number; duration?: number }>; reference_images?: string[]; reference_videos?: string[]; reference_audios?: string[] }) {
  const mediaList = Array.isArray(record.mediaList) ? record.mediaList : [];
  const fromMediaList = mediaList.map((item, index) => ({
    id: item.id || `retry-media-${index}`,
    type: item.type,
    name: item.name || `Retry ${item.type} ${index + 1}`,
    url: item.url,
    previewUrl: item.type === "image" ? item.url : "",
    size: item.size,
    mimeType: item.mimeType,
    duration: item.duration,
    uploadStatus: "ready" as const,
  }));

  const fromRefs = [
    ...(record.reference_images || []).map((url, index) => ({ type: "image" as const, url, index })),
    ...(record.reference_videos || []).map((url, index) => ({ type: "video" as const, url, index })),
    ...(record.reference_audios || []).map((url, index) => ({ type: "audio" as const, url, index })),
  ]
    .filter((item) => !fromMediaList.some((mediaItem) => mediaItem.url === item.url))
    .map((item) => ({
      id: `retry-${item.type}-${item.index}-${item.url}`,
      type: item.type,
      name: `Retry ${item.type} ${item.index + 1}`,
      url: item.url,
      previewUrl: item.type === "image" ? item.url : "",
      uploadStatus: "ready" as const,
    }));

  return [...fromMediaList, ...fromRefs];
}

export function VideoWorkspace() {
  const [models, setModels] = useState<VideoModel[]>(fallbackModels);
  const [selectedModel, setSelectedModel] = useState<VideoModel>(fallbackModels[0]);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [media, setMedia] = useState<UploadMediaItem[]>([]);
  const [params, setParams] = useState<VideoParams>({
    duration: fallbackModels[0].durationDefault,
    ratio: fallbackModels[0].ratios[0],
    quality: fallbackModels[0].qualities[0],
    generateAudio: false,
  });

  const { isSignedIn, token } = useAuthSession();
  const { credits, maxConcurrency } = useCredits();
  const {
    activeTaskCount,
    error,
    history,
    historyError,
    isHistoryLoading,
    isSubmitting,
    loadHistory,
    refreshTask,
    submit,
    task,
  } = useVideoGeneration();
  const [workspaceNotice, setWorkspaceNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      setModelLoading(true);
      setModelError("");
      try {
        const nextModels = await getVideoModels();
        if (cancelled || !nextModels.length) return;
        setModels(nextModels);
        setSelectedModel(nextModels[0]);
        setParams({
          duration: nextModels[0].durationDefault,
          ratio: nextModels[0].ratios[0] || "16:9",
          quality: nextModels[0].qualities[0] || "720p",
          generateAudio: false,
        });
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Failed to load models.";
        if (!cancelled) setModelError(`${message} Using local fallback models.`);
      } finally {
        if (!cancelled) setModelLoading(false);
      }
    }

    void loadModels();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleModelChange = useCallback((model: VideoModel) => {
    setSelectedModel(model);
    setParams((current) => ({
      ...current,
      duration: model.durations.includes(current.duration) ? current.duration : model.durationDefault,
      ratio: model.ratios.includes(current.ratio) ? current.ratio : model.ratios[0] || "16:9",
      quality: model.qualities.includes(current.quality) ? current.quality : model.qualities[0] || "720p",
    }));
  }, []);

  const handleStatus = useCallback((_result: VideoStatusResponse) => {
    void _result;
  }, []);
  const handlePollError = useCallback((pollError: unknown) => {
    console.warn("[ShadowEdge Next] video polling failed:", pollError);
  }, []);

  useTaskPolling({
    taskId: task?.jobId,
    status: task?.status,
    fetchStatus: refreshTask,
    onStatus: handleStatus,
    onError: handlePollError,
  });

  const modelSummary = useMemo(
    () => ({
      durations: selectedModel.durations.length ? selectedModel.durations : [5],
      ratios: selectedModel.ratios.length ? selectedModel.ratios : ["16:9"],
      qualities: selectedModel.qualities.length ? selectedModel.qualities : ["720p"],
    }),
    [selectedModel],
  );

  const isUploadingMedia = media.some((item) => item.uploadStatus === "uploading");
  const isProcessing = activeTaskCount > 0 || isVideoActiveStatus(task?.status);
  const hasEnoughCredits = credits === null || selectedModel.credits <= credits;
  const canGenerate = Boolean(selectedModel) && !isSubmitting && !isUploadingMedia && !isProcessing && Boolean(token || isSignedIn) && hasEnoughCredits;

  const generateButtonLabel = useMemo(() => {
    if (isUploadingMedia) return "Uploading media";
    if (isProcessing) return "Processing";
    if (!token && !isSignedIn) return "Sign in required";
    if (!hasEnoughCredits) return "Not enough credits";
    return `Generate · ${selectedModel.credits} credits`;
  }, [hasEnoughCredits, isProcessing, isSignedIn, isUploadingMedia, selectedModel.credits, token]);

  const findRetryModel = useCallback((record: { modelId?: string; providerModel?: string; frontendModel?: string; model?: string }) => {
    return (
      models.find((model) => model.id === record.modelId) ||
      models.find((model) => model.providerModel && model.providerModel === record.providerModel) ||
      models.find((model) => model.label === record.frontendModel || model.label === record.model) ||
      null
    );
  }, [models]);

  const submitCurrent = useCallback(() => {
    setWorkspaceNotice("");

    if (isUploadingMedia) {
      setWorkspaceNotice("Media is still uploading. Please wait for uploads to finish.");
      return;
    }

    if (isProcessing) {
      setWorkspaceNotice("You already have active generation tasks. Please wait until one finishes.");
      return;
    }

    if (!token && !isSignedIn) {
      setWorkspaceNotice("Sign in required.");
      return;
    }

    if (!hasEnoughCredits) {
      setWorkspaceNotice("Not enough credits.");
      return;
    }

    void submit({
      prompt: prompt.trim(),
      model: selectedModel,
      duration: params.duration,
      ratio: params.ratio,
      quality: params.quality,
      generateAudio: params.generateAudio,
      maxConcurrency,
      media,
    });
  }, [hasEnoughCredits, isProcessing, isSignedIn, isUploadingMedia, maxConcurrency, media, params, prompt, selectedModel, submit, token]);

  const handleRetry = useCallback(
    (record: (typeof history)[number]) => {
      setWorkspaceNotice("");
      const retryModel = findRetryModel(record);
      if (!retryModel) {
        setWorkspaceNotice("Cannot retry: original model is not available.");
        return;
      }

      const retryMedia = buildRetryMedia(record);
      const hasMissingMedia = retryMedia.some((item) => !item.url || item.url.startsWith("blob:") || item.url.startsWith("data:"));
      if (hasMissingMedia) {
        setWorkspaceNotice("Cannot retry: original media URL is missing.");
        return;
      }

      const promptText = String(record.meta?.original_prompt || record.prompt || "").trim();
      if (!promptText) {
        setWorkspaceNotice("Cannot retry: original prompt is missing.");
        return;
      }

      const duration = Number.parseInt(String(record.duration || retryModel.durationDefault), 10) || retryModel.durationDefault;
      const ratio = record.ratio && retryModel.ratios.includes(record.ratio) ? record.ratio : retryModel.ratios[0] || "16:9";
      const quality = record.quality && retryModel.qualities.includes(record.quality) ? record.quality : retryModel.qualities[0] || "720p";

      void submit({
        prompt: promptText,
        model: retryModel,
        duration,
        ratio,
        quality,
        generateAudio: Boolean(record.meta?.generate_audio),
        media: retryMedia,
        maxConcurrency,
      });
    },
    [findRetryModel, maxConcurrency, submit],
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)_minmax(340px,420px)]">
      <div className="grid gap-5">
        {modelLoading ? <LoadingState label="Loading live model registry..." /> : null}
        <ModelSelector models={models} onChange={handleModelChange} selectedModelId={selectedModel.id} />
        <VideoParamsPanel
          durations={modelSummary.durations}
          onChange={setParams}
          qualities={modelSummary.qualities}
          ratios={modelSummary.ratios}
          value={params}
        />
        <div className="rounded-[24px] border border-white/10 bg-white/[.045] p-4">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-white/40">API contract</p>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-white/58">
            <li>POST /api/video/generate</li>
            <li>GET /api/video/status?jobId=...</li>
            <li>GET /api/video/history</li>
            <li>GET /api/video/models</li>
            <li>POST /api/upload-media</li>
          </ul>
        </div>
      </div>

      <div className="grid gap-5">
        <UploadBox media={media} onChange={setMedia} />
        <ReferenceMediaMention media={media} />
        <PromptBox media={media} onChange={setPrompt} value={prompt} />
        <GenerateButton
          credits={selectedModel.credits}
          disabled={!canGenerate}
          isSubmitting={isSubmitting}
          label={generateButtonLabel}
          onClick={submitCurrent}
        />
        <ErrorState message={workspaceNotice || error || modelError} />
      </div>

      <div className="grid content-start gap-5">
        <ResultViewer task={task} />
        <HistoryPanel error={historyError} history={history} isLoading={isHistoryLoading} onRetry={handleRetry} />
      </div>
    </div>
  );
}
