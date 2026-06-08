"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { GenerateButton } from "@/components/video/GenerateButton";
import { HistoryPanel } from "@/components/video/HistoryPanel";
import { ModelSelector } from "@/components/video/ModelSelector";
import { PromptBox } from "@/components/video/PromptBox";
import { ReferenceMediaTray } from "@/components/video/ReferenceMediaTray";
import { ResultViewer } from "@/components/video/ResultViewer";
import { UploadBox } from "@/components/video/UploadBox";
import { type VideoParams, VideoParamsPanel } from "@/components/video/VideoParamsPanel";
import { useTaskPolling } from "@/hooks/useTaskPolling";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useCredits } from "@/hooks/useCredits";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import { getVideoModels } from "@/lib/video-api";
import { readVideoDraft, saveVideoDraft, type VideoWorkspaceDraft } from "@/lib/video/videoDraft";
import { getVideoModelRule, hasVideoModelRule, normalizeVideoParamsForModel } from "@/lib/video/videoModelRules";
import { isVideoActiveStatus } from "@/lib/utils";
import type { UploadMediaItem, UploadMediaRole, VideoModel, VideoStatusResponse } from "@/types/video";

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

function getVideoModelRuleId(model: VideoModel) {
  const candidates = [model.id, model.providerModel, model.label].filter((value): value is string => Boolean(value));
  return candidates.find((candidate) => hasVideoModelRule(candidate)) || candidates[0] || "generic";
}

function buildParamsForModel(model: VideoModel, current?: Partial<VideoParams>): VideoParams {
  const normalized = normalizeVideoParamsForModel(getVideoModelRuleId(model), {
    duration: current?.duration ?? model.durationDefault,
    ratio: current?.ratio ?? model.ratios[0],
    quality: current?.quality ?? model.qualities[0],
    generateAudio: current?.generateAudio ?? false,
  });

  return {
    duration: normalized.duration,
    ratio: normalized.ratio,
    quality: normalized.quality,
    generateAudio: Boolean(normalized.generateAudio),
  };
}

function normalizeModelLookup(value: string | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[./\s-]+/g, "_")
    .replace(/[^\w]/g, "");
}

function findDraftModel(draft: VideoWorkspaceDraft | null, modelList: VideoModel[]) {
  if (!draft) return null;
  const candidates = [draft.modelId, draft.providerModel, draft.modelLabel].map(normalizeModelLookup).filter(Boolean);
  if (!candidates.length) return null;

  return (
    modelList.find((model) =>
      [model.id, model.providerModel, model.label].map(normalizeModelLookup).some((value) => candidates.includes(value)),
    ) || null
  );
}

function writeVideoDraft(snapshot: {
  media: UploadMediaItem[];
  params: VideoParams;
  prompt: string;
  selectedModel: VideoModel;
}) {
  return saveVideoDraft({
    prompt: snapshot.prompt,
    modelId: snapshot.selectedModel.id,
    providerModel: snapshot.selectedModel.providerModel,
    modelLabel: snapshot.selectedModel.label,
    params: snapshot.params,
    referenceMedia: snapshot.media,
  });
}

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
  const [params, setParams] = useState<VideoParams>(() => buildParamsForModel(fallbackModels[0]));
  const [isAssetPickerUploading, setIsAssetPickerUploading] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraftSnapshotRef = useRef<{
    media: UploadMediaItem[];
    params: VideoParams;
    prompt: string;
    selectedModel: VideoModel;
  } | null>(null);

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

    function applyModelRegistry(nextModels: VideoModel[], draft: VideoWorkspaceDraft | null) {
      const availableModels = nextModels.length ? nextModels : fallbackModels;
      const draftModel = findDraftModel(draft, availableModels);
      const nextModel = draftModel || availableModels[0];

      setModels(availableModels);
      setSelectedModel(nextModel);
      setParams(buildParamsForModel(nextModel, draft?.params));

      if (draft) {
        setPrompt(draft.prompt);
        setMedia(draft.referenceMedia);
      }

      setDraftReady(true);
    }

    async function loadModels() {
      setModelLoading(true);
      setModelError("");
      const draft = readVideoDraft();

      try {
        const nextModels = await getVideoModels();
        if (cancelled) return;
        applyModelRegistry(nextModels, draft);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Failed to load models.";
        if (!cancelled) {
          setModelError(`${message} Using local fallback models.`);
          applyModelRegistry(fallbackModels, draft);
        }
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
    if (!draftReady) return;

    latestDraftSnapshotRef.current = {
      media,
      params,
      prompt,
      selectedModel,
    };

    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      draftSaveTimerRef.current = null;
      if (latestDraftSnapshotRef.current) writeVideoDraft(latestDraftSnapshotRef.current);
    }, 700);

    return () => {
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }
    };
  }, [draftReady, media, params, prompt, selectedModel]);

  useEffect(() => {
    function flushVideoDraft() {
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }

      if (latestDraftSnapshotRef.current) writeVideoDraft(latestDraftSnapshotRef.current);
    }

    window.addEventListener("beforeunload", flushVideoDraft);

    return () => {
      window.removeEventListener("beforeunload", flushVideoDraft);
      flushVideoDraft();
    };
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleModelChange = useCallback((model: VideoModel) => {
    setSelectedModel(model);
    setParams((current) => buildParamsForModel(model, current));
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

  const removeMedia = useCallback((id: string) => {
    setMedia((currentItems) => currentItems.filter((item) => item.id !== id));
  }, []);

  const updateMediaRole = useCallback((id: string, role: UploadMediaRole) => {
    setMedia((currentItems) => currentItems.map((item) => (item.id === id ? { ...item, role } : item)));
  }, []);

  const isUploadingMedia = isAssetPickerUploading || media.some((item) => item.uploadStatus === "uploading");
  const isProcessing = activeTaskCount > 0 || isVideoActiveStatus(task?.status);
  const hasEnoughCredits = credits === null || selectedModel.credits <= credits;
  const canGenerate = Boolean(selectedModel) && !isSubmitting && !isUploadingMedia && !isProcessing && Boolean(token || isSignedIn) && hasEnoughCredits;
  const selectedModelRuleId = getVideoModelRuleId(selectedModel);
  const selectedModelRule = useMemo(() => getVideoModelRule(selectedModelRuleId), [selectedModelRuleId]);

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
    <div className="se-scrollbar h-full min-h-0 space-y-3 overflow-y-auto overflow-x-hidden xl:grid xl:grid-cols-[minmax(310px,340px)_minmax(0,1fr)_minmax(300px,340px)] xl:gap-3 xl:space-y-0 xl:overflow-hidden 2xl:grid-cols-[340px_minmax(0,1fr)_340px]">
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white/[.04] shadow-2xl shadow-black/20">
        <div className="shrink-0 border-b border-white/10 px-4 py-3">
          <div className="flex gap-4 text-sm font-bold text-white/52">
            <button className="border-b-2 border-[#ffb44d] pb-2 text-white" type="button">
              Create Video
            </button>
            <button className="cursor-not-allowed pb-2 text-white/40" disabled type="button">
              Edit Video
            </button>
            <button className="cursor-not-allowed pb-2 text-white/40" disabled type="button">
              Motion Control
            </button>
          </div>
        </div>

        <div className="se-subtle-scrollbar grid min-h-0 flex-1 content-start gap-3 overflow-y-auto p-3">
          {modelLoading ? <LoadingState label="Loading live model registry..." /> : null}
          <UploadBox media={media} modelRule={selectedModelRule} onBusyChange={setIsAssetPickerUploading} onChange={setMedia} />
          <ReferenceMediaTray media={media} modelRule={selectedModelRule} onRemove={removeMedia} onRoleChange={updateMediaRole} />
          <PromptBox media={media} onChange={setPrompt} value={prompt} />
          <div className="grid grid-cols-2 gap-2">
            <button
              className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black text-white/70 transition hover:border-[#ffb44d]/35 hover:text-[#ffd08a]"
              onClick={() => setPrompt((current) => `${current}${current && !current.endsWith(" ") ? " " : ""}@`)}
              type="button"
            >
              @ Elements
            </button>
            <button
              className={`rounded-2xl border px-3 py-2 text-xs font-black transition ${
                params.generateAudio
                  ? "border-[#ffb44d]/45 bg-[#ffb44d]/14 text-[#ffd08a]"
                  : "border-white/10 bg-black/20 text-white/70 hover:border-[#ffb44d]/35 hover:text-[#ffd08a]"
              }`}
              onClick={() => setParams((current) => ({ ...current, generateAudio: !current.generateAudio }))}
              type="button"
            >
              Audio {params.generateAudio ? "On" : "Off"}
            </button>
          </div>
          <ModelSelector models={models} onChange={handleModelChange} selectedModelId={selectedModel.id} />
          <VideoParamsPanel
            modelId={selectedModelRuleId}
            onChange={setParams}
            value={params}
          />
          {!token && !isSignedIn ? (
            <div className="rounded-[22px] border border-[#ffb44d]/25 bg-[#ffb44d]/10 p-4">
              <p className="text-sm font-black text-[#ffd08a]">Sign in required</p>
              <p className="mt-2 text-sm leading-6 text-white/62">
                Sign in to upload media, launch video jobs, refresh credits, and load generation history.
              </p>
              <Link
                className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[#ffb44d] px-5 text-sm font-black text-[#1f2027] transition hover:bg-[#ffc766]"
                href="/sign-in?next=/workspace/video"
              >
                Sign in
              </Link>
            </div>
          ) : null}
          <ErrorState message={workspaceNotice || error || modelError} />
        </div>

        <div className="shrink-0 border-t border-white/10 p-3">
          <GenerateButton
            credits={selectedModel.credits}
            disabled={!canGenerate}
            isSubmitting={isSubmitting}
            label={generateButtonLabel}
            onClick={submitCurrent}
          />
        </div>
      </aside>

      <main className="min-h-[520px] min-w-0 overflow-hidden xl:min-h-0">
        <ResultViewer task={task} />
      </main>

      <aside className="min-h-[460px] min-w-0 overflow-hidden xl:min-h-0">
        <HistoryPanel error={historyError} history={history} isLoading={isHistoryLoading} onRetry={handleRetry} />
      </aside>
    </div>
  );
}
