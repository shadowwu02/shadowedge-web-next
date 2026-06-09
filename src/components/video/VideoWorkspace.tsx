"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { GenerateButton } from "@/components/video/GenerateButton";
import { ModelSelector } from "@/components/video/ModelSelector";
import { PromptBox } from "@/components/video/PromptBox";
import { ReferenceMediaTray } from "@/components/video/ReferenceMediaTray";
import { UploadBox } from "@/components/video/UploadBox";
import { VideoGenerationStream, type VideoHistoryFilter } from "@/components/video/VideoGenerationStream";
import { VideoHowItWorks } from "@/components/video/VideoHowItWorks";
import { type VideoParams, VideoParamsPanel } from "@/components/video/VideoParamsPanel";
import { RemakeStoryboardPanel } from "@/components/video/remake/RemakeStoryboardPanel";
import { VideoRemakeWorkspace } from "@/components/video/remake/VideoRemakeWorkspace";
import { buildMockRemakeStoryboard } from "@/components/video/remake/remakeMockData";
import { getRemakeShotGenerationKey } from "@/components/video/remake/remakeTypes";
import type {
  RemakeMode,
  RemakeSegment,
  RemakeShot,
  RemakeShotGenerationState,
  RemakeSourceVideo,
  RemakeSourceVideoMetadata,
  RemakeStoryboard,
  RemakeTargetRegion,
} from "@/components/video/remake/remakeTypes";
import { useTaskPolling } from "@/hooks/useTaskPolling";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useCredits } from "@/hooks/useCredits";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import { useI18n } from "@/i18n/useI18n";
import { collectGeneratedResultMediaAssets, collectHistoryInputMediaAssets, collectReusableVideoAssets, mergeMediaAssets } from "@/lib/media-assets";
import { getVideoModels, reverseAnalyzeVideoRemake, uploadMedia } from "@/lib/video-api";
import { getSafeHistoryOutputUrl, isVideoStaleActiveRecord } from "@/lib/video/historyUtils";
import { readVideoDraft, saveVideoDraft, type VideoWorkspaceDraft } from "@/lib/video/videoDraft";
import { getVideoModelRule, hasVideoModelRule, normalizeVideoParamsForModel } from "@/lib/video/videoModelRules";
import {
  parseMentionBindings,
  reconcileMentionBindings,
  serializeMentionBindings,
  type VideoMentionBinding,
} from "@/lib/video/videoMentionBindings";
import { getReferenceRoleIssue, validateReferenceSelectionForRule } from "@/lib/video/videoReferenceRules";
import { isVideoActiveStatus, isVideoFailedStatus } from "@/lib/utils";
import type { UploadMediaItem, UploadMediaRole, VideoModel, VideoStatusResponse, VideoTaskRecord } from "@/types/video";

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

type MainPanel = "history" | "guide";
type WorkspaceMode = "create" | "edit" | "motion" | "remake";

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

function stripReconciledMentionBindings(bindings: ReturnType<typeof reconcileMentionBindings>): VideoMentionBinding[] {
  return bindings.map((binding) => ({
    tokenId: binding.tokenId,
    mediaId: binding.mediaId,
    mediaType: binding.mediaType,
    displayLabel: binding.displayLabel,
    sourceTokenText: binding.sourceTokenText,
    createdAt: binding.createdAt,
    updatedAt: binding.updatedAt,
  }));
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
  mentionBindings: VideoMentionBinding[];
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
    mentionBindings: snapshot.mentionBindings,
  });
}

function buildRetryMedia(
  record: VideoTaskRecord,
  getFallbackName: (type: UploadMediaItem["type"], index: number) => string = (type, index) => `Retry ${type} ${index + 1}`,
) {
  const mediaList = Array.isArray(record.mediaList) ? record.mediaList : [];
  const fromMediaList = mediaList.map((item, index) => ({
    id: item.id || `retry-media-${index}`,
    type: item.type,
    name: item.name || getFallbackName(item.type, index),
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
      name: getFallbackName(item.type, item.index),
      url: item.url,
      previewUrl: item.type === "image" ? item.url : "",
      uploadStatus: "ready" as const,
    }));

  return mergeMediaAssets([...fromMediaList, ...fromRefs], collectHistoryInputMediaAssets([record]));
}

function isReadyRemoteMedia(item: UploadMediaItem) {
  return Boolean(item.url && /^https?:\/\//i.test(item.url) && !item.url.startsWith("blob:") && !item.url.startsWith("data:"));
}

function getRecordGenerateAudio(record: { meta?: Record<string, unknown>; generate_audio?: unknown; generateAudio?: unknown }) {
  return Boolean(record.meta?.generate_audio ?? record.meta?.generateAudio ?? record.generate_audio ?? record.generateAudio);
}

function getRecordDuration(record: { duration?: string | number; meta?: Record<string, unknown> }, fallback: number) {
  const value = record.duration ?? record.meta?.duration;
  const duration = Number.parseInt(String(value || "").replace("s", ""), 10);
  return Number.isFinite(duration) && duration > 0 ? duration : fallback;
}

function getRecordMentionBindings(
  record: { meta?: Record<string, unknown>; mentionBindings?: unknown; mention_bindings?: unknown },
  referenceMedia: UploadMediaItem[],
) {
  const rawBindings = record.meta?.mentionBindings ?? record.meta?.mention_bindings ?? record.mentionBindings ?? record.mention_bindings;

  return serializeMentionBindings(
    stripReconciledMentionBindings(reconcileMentionBindings(parseMentionBindings(rawBindings), referenceMedia)),
  );
}

function isSameVideoTaskId(record: VideoTaskRecord, taskId: string) {
  return [record.jobId, record.providerJobId, record.dbJobId]
    .filter(Boolean)
    .some((value) => String(value) === String(taskId));
}

export function VideoWorkspace() {
  const { t, tf } = useI18n();
  const [models, setModels] = useState<VideoModel[]>(fallbackModels);
  const [selectedModel, setSelectedModel] = useState<VideoModel>(fallbackModels[0]);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [media, setMedia] = useState<UploadMediaItem[]>([]);
  const [mentionBindings, setMentionBindings] = useState<VideoMentionBinding[]>([]);
  const [params, setParams] = useState<VideoParams>(() => buildParamsForModel(fallbackModels[0]));
  const [isAssetPickerUploading, setIsAssetPickerUploading] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<VideoHistoryFilter>("all");
  const [mainPanel, setMainPanel] = useState<MainPanel>("history");
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("create");
  const [remakeMode, setRemakeMode] = useState<RemakeMode>("single_clip");
  const [remakeSourceVideo, setRemakeSourceVideo] = useState<RemakeSourceVideo | null>(null);
  const [remakeTargetRegion, setRemakeTargetRegion] = useState<RemakeTargetRegion>("US");
  const [remakeCharacterRules, setRemakeCharacterRules] = useState("");
  const [remakeSceneStyle, setRemakeSceneStyle] = useState("");
  const [remakeTranslateDialogue, setRemakeTranslateDialogue] = useState(true);
  const [remakeStoryboard, setRemakeStoryboard] = useState<RemakeStoryboard | null>(null);
  const [isRemakeAnalyzing, setIsRemakeAnalyzing] = useState(false);
  const [isRemakeSourceUploading, setIsRemakeSourceUploading] = useState(false);
  const [remakeAnalysisMeta, setRemakeAnalysisMeta] = useState<{
    segments?: RemakeSegment[];
    sourceVideo?: RemakeSourceVideoMetadata;
  } | null>(null);
  const [remakeAnalysisError, setRemakeAnalysisError] = useState("");
  const [remakeAnalysisNotice, setRemakeAnalysisNotice] = useState("");
  const [remakeShotGenerations, setRemakeShotGenerations] = useState<Record<string, RemakeShotGenerationState>>({});
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDraftSnapshotRef = useRef<{
    media: UploadMediaItem[];
    mentionBindings: VideoMentionBinding[];
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
    isHistoryLoading,
    isSubmitting,
    loadHistory,
    refreshTask,
    submit,
    task,
  } = useVideoGeneration();
  const [workspaceNotice, setWorkspaceNotice] = useState("");
  const reconciledMentionBindings = useMemo(
    () => serializeMentionBindings(stripReconciledMentionBindings(reconcileMentionBindings(mentionBindings, media))),
    [media, mentionBindings],
  );

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
        setMentionBindings(draft.mentionBindings);
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
        const message = loadError instanceof Error ? loadError.message : t("video.errors.modelLoadFailed");
        if (!cancelled) {
          setModelError(`${message} ${t("video.model.usingFallback")}`);
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
  }, [t]);

  useEffect(() => {
    if (!draftReady) return;

    latestDraftSnapshotRef.current = {
      media,
      mentionBindings: reconciledMentionBindings,
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
  }, [draftReady, media, params, prompt, reconciledMentionBindings, selectedModel]);

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

  const localizedMediaTypeLabel = useCallback(
    (type: UploadMediaItem["type"]) => {
      if (type === "audio") return t("video.media.audio");
      if (type === "video") return t("video.media.video");
      return t("video.media.image");
    },
    [t],
  );

  const getRetryMediaName = useCallback(
    (type: UploadMediaItem["type"], index: number) =>
      tf("video.history.retryMediaName", { index: index + 1, type: localizedMediaTypeLabel(type) }),
    [localizedMediaTypeLabel, tf],
  );
  const getRemakeVlmProviderLabel = useCallback(
    (provider: string) => {
      if (provider.toLowerCase() === "bai") return t("video.remake.vlmProvider.bai");
      return provider;
    },
    [t],
  );

  const handleStatus = useCallback((_result: VideoStatusResponse) => {
    void _result;
  }, []);
  const handlePollError = useCallback((pollError: unknown) => {
    console.warn("[ShadowEdge Next] video polling failed:", pollError);
  }, []);

  useTaskPolling({
    enabled: task ? !isVideoStaleActiveRecord(task) : true,
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

  const handleAnalyzeRemakeStoryboard = useCallback(async () => {
    const settings = {
      characterRules: remakeCharacterRules,
      mode: remakeMode,
      sceneStyle: remakeSceneStyle,
      targetRegion: remakeTargetRegion,
      translateDialogue: remakeTranslateDialogue,
    };

    if (!remakeSourceVideo?.file && !remakeSourceVideo?.url) {
      setRemakeAnalysisError(t("video.remake.sourceRequired"));
      setRemakeAnalysisNotice("");
      setRemakeAnalysisMeta(null);
      setRemakeStoryboard(null);
      return;
    }

    setIsRemakeAnalyzing(true);
    setRemakeAnalysisError("");
    setRemakeAnalysisNotice("");
    setRemakeAnalysisMeta(null);

    try {
      let sourceVideoForAnalyze = remakeSourceVideo;
      let sourceVideoUrl = remakeSourceVideo?.url || "";

      if (!sourceVideoUrl && remakeSourceVideo?.file) {
        setIsRemakeSourceUploading(true);
        setRemakeAnalysisNotice(t("video.remake.uploadingSource"));

        try {
          const uploaded = await uploadMedia(remakeSourceVideo.file);
          sourceVideoUrl = uploaded.url;
          sourceVideoForAnalyze = {
            ...remakeSourceVideo,
            url: uploaded.url,
          };
          setRemakeSourceVideo((current) =>
            current?.lastModified === remakeSourceVideo.lastModified && current.name === remakeSourceVideo.name
              ? {
                  ...current,
                  url: uploaded.url,
                }
              : current,
          );
        } catch (uploadError) {
          setRemakeAnalysisError(
            `${t("video.remake.sourceUploadFailed")} ${
              uploadError instanceof Error ? uploadError.message : t("video.errors.uploadFailed")
            }`,
          );
          return;
        } finally {
          setIsRemakeSourceUploading(false);
        }
      }

      setRemakeAnalysisNotice(t("video.remake.vlmAnalyzing"));
      const result = await reverseAnalyzeVideoRemake({
        ...settings,
        sourceFileName: sourceVideoForAnalyze?.name || "",
        sourceLanguage: "zh",
        sourceVideoUrl,
        targetLanguage: "en",
      });

      setRemakeStoryboard(result.storyboard);
      setRemakeAnalysisMeta({
        segments: result.meta?.segments,
        sourceVideo: result.meta?.sourceVideo,
      });
      if (result.meta?.vlmFailed || result.meta?.vlmUnavailable) {
        setRemakeAnalysisNotice(t("video.remake.vlmFallback"));
      } else if (result.meta?.mock) {
        setRemakeAnalysisNotice(t("video.remake.analysisDraft"));
      } else if (result.meta?.vlmProvider) {
        setRemakeAnalysisNotice(tf("video.remake.vlmProvider", { provider: getRemakeVlmProviderLabel(result.meta.vlmProvider) }));
      } else {
        setRemakeAnalysisNotice("");
      }
    } catch (error) {
      setRemakeStoryboard(buildMockRemakeStoryboard(settings, remakeSourceVideo));
      setRemakeAnalysisMeta(null);
      setRemakeAnalysisError(
        `${t("video.remake.analysisFailed")} ${error instanceof Error ? error.message : t("video.remake.apiUnavailable")}`,
      );
      setRemakeAnalysisNotice(t("video.remake.mockFallback"));
    } finally {
      setIsRemakeAnalyzing(false);
      setIsRemakeSourceUploading(false);
    }
  }, [
    getRemakeVlmProviderLabel,
    remakeCharacterRules,
    remakeMode,
    remakeSceneStyle,
    remakeSourceVideo,
    remakeTargetRegion,
    remakeTranslateDialogue,
    t,
    tf,
  ]);

  const handleRemakeSourceVideoChange = useCallback((source: RemakeSourceVideo | null) => {
    setRemakeSourceVideo((current) => {
      if (
        source &&
        current?.url &&
        !source.url &&
        current.lastModified === source.lastModified &&
        current.name === source.name &&
        current.size === source.size
      ) {
        return {
          ...source,
          url: current.url,
        };
      }

      return source;
    });
  }, []);

  const handleUseRemakePrompt = useCallback(
    (nextPrompt: string) => {
      setPrompt(nextPrompt);
      setWorkspaceMode("create");
      setWorkspaceNotice(t("video.remake.promptLoaded"));
    },
    [t],
  );

  const isUploadingMedia = isAssetPickerUploading || media.some((item) => item.uploadStatus === "uploading");
  const isCurrentTaskProcessing = Boolean(task && isVideoActiveStatus(task.status) && !isVideoStaleActiveRecord(task));
  const isProcessing = activeTaskCount > 0 || isCurrentTaskProcessing;
  const hasEnoughCredits = credits === null || selectedModel.credits <= credits;
  const canGenerate = Boolean(selectedModel) && !isSubmitting && !isUploadingMedia && !isProcessing && Boolean(token || isSignedIn) && hasEnoughCredits;
  const selectedModelRuleId = getVideoModelRuleId(selectedModel);
  const selectedModelRule = useMemo(() => getVideoModelRule(selectedModelRuleId), [selectedModelRuleId]);
  const reusableMedia = useMemo(
    () => collectReusableVideoAssets(task ? [task, ...history] : history),
    [history, task],
  );
  const displayNotice = useMemo(() => {
    const message = workspaceNotice || error || modelError;
    if (!message) return "";

    const exactMessages: Record<string, string> = {
      "Please enter a prompt first.": t("video.errors.promptRequired"),
      "Media is still uploading. Please wait for uploads to finish.": t("video.errors.mediaUploading"),
      "Some media failed to upload. Remove failed items before generating.": t("video.errors.mediaFailedBeforeGenerate"),
      "Local preview media cannot be used for generation. Please wait for upload to finish.": t("video.errors.localPreviewMedia"),
      "Only uploaded remote media URLs can be used for generation.": t("video.errors.remoteMediaOnly"),
      "You already have active generation tasks. Please wait until one finishes.": t("video.errors.activeGeneration"),
      "Video generation request failed.": t("video.errors.generationRequestFailed"),
      "No jobId returned by video API.": t("video.errors.noJobId"),
      "Unable to check this job status. It may be expired. Please check History or retry.": t("video.result.statusExpired"),
      "Failed to refresh video status.": t("video.errors.statusRefreshFailed"),
      "Failed to load models. Using local fallback models.": `${t("video.errors.modelLoadFailed")} ${t("video.model.usingFallback")}`,
    };

    if (exactMessages[message]) return exactMessages[message];
    if (message.includes("does not support image references")) return t("video.errors.unsupportedImageReference");
    if (message.includes("does not support video references")) return t("video.errors.unsupportedVideoReference");
    if (message.includes("does not support audio references")) return t("video.errors.unsupportedAudioReference");
    if (message.includes("Reference limit reached")) return t("video.drawer.referenceLimitReached");
    if (message.includes("Type limit reached")) return t("video.drawer.typeLimitReached");
    if (message.includes("Generated results cannot be used as references")) return t("video.drawer.generatedUnsupported");

    return message;
  }, [error, modelError, t, workspaceNotice]);

  const generateButtonLabel = useMemo(() => {
    if (isUploadingMedia) return t("video.actions.uploadingMedia");
    if (isProcessing) return t("video.status.processing");
    if (!token && !isSignedIn) return t("video.errors.signInRequired");
    if (!hasEnoughCredits) return t("video.credits.notEnough");
    return tf("video.actions.generateWithCredits", { credits: selectedModel.credits });
  }, [hasEnoughCredits, isProcessing, isSignedIn, isUploadingMedia, selectedModel.credits, t, tf, token]);

  const handleGenerateRemakeShot = useCallback(
    async (shot: RemakeShot) => {
      const shotKey = getRemakeShotGenerationKey(remakeStoryboard?.id, shot);
      setWorkspaceNotice("");

      const failShot = (message: string) => {
        setRemakeShotGenerations((current) => ({
          ...current,
          [shotKey]: {
            ...(current[shotKey] || { status: "idle" }),
            error: message,
            status: "failed",
            updatedAt: Date.now(),
          },
        }));
      };

      if (!shot.prompt.trim()) {
        failShot(t("video.errors.promptRequired"));
        return;
      }

      if (isUploadingMedia) {
        setWorkspaceNotice(t("video.errors.mediaUploading"));
        failShot(t("video.errors.mediaUploading"));
        return;
      }

      if (isProcessing) {
        setWorkspaceNotice(t("video.errors.activeGeneration"));
        failShot(t("video.errors.activeGeneration"));
        return;
      }

      if (!token && !isSignedIn) {
        setWorkspaceNotice(t("video.errors.signInRequired"));
        failShot(t("video.errors.signInRequired"));
        return;
      }

      if (!hasEnoughCredits) {
        setWorkspaceNotice(t("video.credits.notEnough"));
        failShot(t("video.credits.notEnough"));
        return;
      }

      const startedAt = Date.now();
      const shotParams = buildParamsForModel(selectedModel, {
        duration: shot.generationParams.duration,
        generateAudio: params.generateAudio,
        quality: shot.generationParams.quality,
        ratio: shot.generationParams.ratio,
      });

      setRemakeShotGenerations((current) => ({
        ...current,
        [shotKey]: {
          error: "",
          outputUrl: "",
          startedAt,
          status: "generating",
          updatedAt: startedAt,
        },
      }));

      const nextTask = await submit({
        prompt: shot.prompt.trim(),
        model: selectedModel,
        duration: shotParams.duration,
        ratio: shotParams.ratio,
        quality: shotParams.quality,
        generateAudio: shotParams.generateAudio,
        media: [],
        mentionBindings: [],
        maxConcurrency,
        meta: {
          source: "remake",
          remake: true,
          remake_source: "storyboard_shot",
          analysisId: remakeStoryboard?.id || "",
          shotGroupId: shot.shotGroupId,
          shotNumber: shot.shot,
          sourceTimeRange: shot.sourceTimeRange,
          remakeDialogue: shot.dialogue,
          audio: shot.audio,
          referenceHints: shot.referenceHints,
          generationParams: shot.generationParams,
          remakeTargetRegion,
          remakeCharacterRules,
          remakeSceneStyle,
          remakeTranslateDialogue,
          sourceVideoName: remakeSourceVideo?.name || remakeStoryboard?.sourceTitle || "",
        },
      });

      if (!nextTask) {
        failShot(t("video.errors.generationRequestFailed"));
        return;
      }

      setRemakeShotGenerations((current) => ({
        ...current,
        [shotKey]: {
          ...(current[shotKey] || {}),
          error: "",
          outputUrl: "",
          startedAt,
          status: "generating",
          taskId: nextTask.jobId,
          updatedAt: Date.now(),
        },
      }));
      setWorkspaceNotice(t("video.remake.shotGenerationStarted"));
    },
    [
      hasEnoughCredits,
      isProcessing,
      isSignedIn,
      isUploadingMedia,
      maxConcurrency,
      params.generateAudio,
      remakeCharacterRules,
      remakeSceneStyle,
      remakeSourceVideo,
      remakeStoryboard,
      remakeTargetRegion,
      remakeTranslateDialogue,
      selectedModel,
      submit,
      t,
      token,
    ],
  );

  const displayedRemakeShotGenerations = useMemo(() => {
    const entries = Object.entries(remakeShotGenerations).filter(([, generation]) => generation.taskId);
    if (!entries.length) return remakeShotGenerations;

    const records = task ? [task, ...history] : history;
    let next = remakeShotGenerations;

    entries.forEach(([key, generation]) => {
      if (!generation.taskId) return;

      const record = records.find((item) => isSameVideoTaskId(item, generation.taskId || ""));
      if (!record) return;

      const outputUrl = getSafeHistoryOutputUrl(record);
      const status = String(record.status || "");
      let derived: RemakeShotGenerationState | null = null;

      if (outputUrl) {
        derived = {
          ...generation,
          error: "",
          outputUrl,
          status: "success",
          updatedAt: generation.updatedAt,
        };
      } else if (isVideoFailedStatus(status)) {
        derived = {
          ...generation,
          error: String(record.error_message || record.message || t("video.remake.shotGenerationFailed")),
          status: "failed",
          updatedAt: generation.updatedAt,
        };
      } else if (isVideoActiveStatus(status)) {
        derived = {
          ...generation,
          status: "generating",
          updatedAt: generation.updatedAt,
        };
      }

      if (!derived) return;
      if (
        derived.status === generation.status &&
        derived.outputUrl === generation.outputUrl &&
        derived.error === generation.error
      ) {
        return;
      }

      if (next === remakeShotGenerations) next = { ...remakeShotGenerations };
      next[key] = derived;
    });

    return next;
  }, [history, remakeShotGenerations, t, task]);

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
      setWorkspaceNotice(t("video.errors.mediaUploading"));
      return;
    }

    if (isProcessing) {
      setWorkspaceNotice(t("video.errors.activeGeneration"));
      return;
    }

    if (!token && !isSignedIn) {
      setWorkspaceNotice(t("video.errors.signInRequired"));
      return;
    }

    if (!hasEnoughCredits) {
      setWorkspaceNotice(t("video.credits.notEnough"));
      return;
    }

    setMainPanel("history");
    void submit({
      prompt: prompt.trim(),
      model: selectedModel,
      duration: params.duration,
      ratio: params.ratio,
      quality: params.quality,
      generateAudio: params.generateAudio,
      maxConcurrency,
      media,
      mentionBindings: reconciledMentionBindings,
    });
  }, [hasEnoughCredits, isProcessing, isSignedIn, isUploadingMedia, maxConcurrency, media, params, prompt, reconciledMentionBindings, selectedModel, submit, t, token]);

  const handleRetry = useCallback(
    (record: (typeof history)[number]) => {
      setWorkspaceNotice("");
      const retryModel = findRetryModel(record);
      if (!retryModel) {
        setWorkspaceNotice(t("video.errors.retryModelUnavailable"));
        return;
      }

      const retryMedia = buildRetryMedia(record, getRetryMediaName);
      const retryMentionBindings = getRecordMentionBindings(record, retryMedia);
      const hasMissingMedia = retryMedia.some((item) => !item.url || item.url.startsWith("blob:") || item.url.startsWith("data:"));
      if (hasMissingMedia) {
        setWorkspaceNotice(t("video.errors.retryMediaMissing"));
        return;
      }

      const promptText = String(record.meta?.original_prompt || record.prompt || "").trim();
      if (!promptText) {
        setWorkspaceNotice(t("video.errors.retryPromptMissing"));
        return;
      }

      const retryParams = buildParamsForModel(retryModel, {
        duration: getRecordDuration(record, retryModel.durationDefault),
        generateAudio: getRecordGenerateAudio(record),
        quality: record.quality,
        ratio: record.ratio,
      });

      setMainPanel("history");
      void submit({
        prompt: promptText,
        model: retryModel,
        duration: retryParams.duration,
        ratio: retryParams.ratio,
        quality: retryParams.quality,
        generateAudio: retryParams.generateAudio,
        media: retryMedia,
        mentionBindings: retryMentionBindings,
        maxConcurrency,
      });
    },
    [findRetryModel, getRetryMediaName, maxConcurrency, submit, t],
  );

  const getGeneratedResultReferenceIssue = useCallback(
    (record: (typeof history)[number]) => {
      if (!getSafeHistoryOutputUrl(record)) return t("video.errors.generatedNoUrl");
      if (!selectedModelRule.supportsGeneratedResultAsReference) {
        return t("video.drawer.generatedUnsupported");
      }

      const generatedAsset = collectGeneratedResultMediaAssets([record])[0];
      if (!generatedAsset) return t("video.errors.generatedNoReusable");

      return validateReferenceSelectionForRule(selectedModelRule, media, [generatedAsset]);
    },
    [media, selectedModelRule, t],
  );

  const localizeReferenceIssue = useCallback(
    (issue: string) => {
      if (!issue) return "";
      if (issue.includes("does not support image references")) return t("video.errors.unsupportedImageReference");
      if (issue.includes("does not support video references")) return t("video.errors.unsupportedVideoReference");
      if (issue.includes("does not support audio references")) return t("video.errors.unsupportedAudioReference");
      if (issue.includes("Reference limit reached")) return t("video.drawer.referenceLimitReached");
      if (issue.includes("Type limit reached")) return t("video.drawer.typeLimitReached");
      if (issue.includes("Start and End frame roles require an image")) return t("video.references.imageOnlyForFrame");
      if (issue.includes("does not support Start Frame")) return t("video.references.startFrameUnsupported");
      if (issue.includes("does not support End Frame")) return t("video.references.endFrameUnsupported");
      return issue;
    },
    [t],
  );

  const getHistoryReferenceAssetIssue = useCallback(
    (asset: UploadMediaItem) => {
      const nextAsset: UploadMediaItem = {
        ...asset,
        role: asset.role || "reference",
        uploadStatus: "ready",
      };

      if (!isReadyRemoteMedia(nextAsset)) return t("video.drawer.urlNotReady");

      const roleIssue = getReferenceRoleIssue(selectedModelRule, nextAsset.type, nextAsset.role || "reference");
      if (roleIssue) return localizeReferenceIssue(roleIssue);

      const selectionIssue = validateReferenceSelectionForRule(selectedModelRule, media, [nextAsset]);
      return localizeReferenceIssue(selectionIssue);
    },
    [localizeReferenceIssue, media, selectedModelRule, t],
  );

  const handleAddHistoryReferenceAsset = useCallback(
    (asset: UploadMediaItem) => {
      const issue = getHistoryReferenceAssetIssue(asset);
      if (issue) {
        setWorkspaceNotice(issue);
        return;
      }

      const nextAsset: UploadMediaItem = {
        ...asset,
        role: asset.role || "reference",
        source: asset.source || "history",
        uploadStatus: "ready",
      };

      setMedia((currentItems) => mergeMediaAssets(currentItems, [nextAsset]));
      setWorkspaceNotice(t("video.generation.referenceAdded"));
    },
    [getHistoryReferenceAssetIssue, t],
  );

  const handleUseResultAsReference = useCallback(
    (record: (typeof history)[number]) => {
      const issue = getGeneratedResultReferenceIssue(record);
      if (issue) {
        setWorkspaceNotice(issue);
        return;
      }

      const generatedAsset = collectGeneratedResultMediaAssets([record])[0];
      if (!generatedAsset) {
        setWorkspaceNotice(t("video.errors.generatedNoReusable"));
        return;
      }

      setMedia((currentItems) => mergeMediaAssets(currentItems, [generatedAsset]));
      setWorkspaceNotice(t("video.notices.generatedAdded"));
    },
    [getGeneratedResultReferenceIssue, t],
  );

  const handleFillFromHistory = useCallback(
    (record: (typeof history)[number]) => {
      const fillModel = findRetryModel(record) || selectedModel;
      const nextMedia = buildRetryMedia(record, getRetryMediaName).filter(isReadyRemoteMedia);
      const nextMentionBindings = getRecordMentionBindings(record, nextMedia);
      const nextParams = buildParamsForModel(fillModel, {
        duration: getRecordDuration(record, fillModel.durationDefault),
        generateAudio: getRecordGenerateAudio(record),
        quality: record.quality,
        ratio: record.ratio,
      });
      const promptText = String(record.meta?.original_prompt || record.prompt || "").trim();

      setSelectedModel(fillModel);
      setParams(nextParams);
      setMedia(nextMedia);
      setMentionBindings(nextMentionBindings);
      setPrompt(promptText);
      if (!nextMedia.length) {
        setWorkspaceNotice(t("video.history.resultNoReusableUrl"));
      } else {
        setWorkspaceNotice(
          findRetryModel(record)
            ? t("video.history.loaded")
            : t("video.history.loadedCurrentModel"),
        );
      }
    },
    [findRetryModel, getRetryMediaName, selectedModel, t],
  );

  const workspaceTabs: Array<{
    disabled?: boolean;
    key: WorkspaceMode;
    label: string;
  }> = [
    { key: "create", label: t("video.workspace.createVideo") },
    { disabled: true, key: "edit", label: t("video.workspace.editVideo") },
    { disabled: true, key: "motion", label: t("video.workspace.motionControl") },
    { key: "remake", label: t("video.remake.tab") },
  ];

  const remakeAnalyzeLabel = isRemakeSourceUploading
    ? t("video.remake.uploadingSource")
    : isRemakeAnalyzing
      ? t("video.remake.vlmAnalyzing")
      : t("video.remake.analyze");

  return (
    <div className="se-scrollbar h-full min-h-0 space-y-3 overflow-y-auto overflow-x-hidden xl:grid xl:grid-cols-[minmax(310px,340px)_minmax(0,1fr)] xl:gap-3 xl:space-y-0 xl:overflow-hidden 2xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="se-panel flex min-h-0 flex-col overflow-hidden rounded-[28px]">
        <div className="shrink-0 border-b border-[rgba(244,244,244,0.08)] px-4 py-3">
          <div className="flex gap-4 text-[13px] font-semibold text-[#b9b9b9]/66">
            {workspaceTabs.map((tab) => {
              const isActive = workspaceMode === tab.key;
              return (
                <button
                  className={`whitespace-nowrap border-b-2 pb-2 transition-colors ${
                    isActive
                      ? "border-[#ffb44d] text-[#f4f4f4]"
                      : tab.disabled
                        ? "cursor-not-allowed border-transparent text-[#b9b9b9]/42"
                        : "border-transparent text-[#b9b9b9]/66 hover:text-[#ffb44d]"
                  }`}
                  disabled={tab.disabled}
                  key={tab.key}
                  onClick={() => {
                    if (!tab.disabled) setWorkspaceMode(tab.key);
                  }}
                  type="button"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="se-subtle-scrollbar grid min-h-0 flex-1 content-start gap-3 overflow-y-auto p-3">
          {workspaceMode === "remake" ? (
            <VideoRemakeWorkspace
              analysisError={remakeAnalysisError}
              analysisNotice={remakeAnalysisNotice}
              analyzeLabel={remakeAnalyzeLabel}
              characterRules={remakeCharacterRules}
              isAnalyzing={isRemakeAnalyzing || isRemakeSourceUploading}
              mode={remakeMode}
              onAnalyze={handleAnalyzeRemakeStoryboard}
              onCharacterRulesChange={setRemakeCharacterRules}
              onModeChange={setRemakeMode}
              onSceneStyleChange={setRemakeSceneStyle}
              onSourceVideoChange={handleRemakeSourceVideoChange}
              onTargetRegionChange={setRemakeTargetRegion}
              onTranslateDialogueChange={setRemakeTranslateDialogue}
              sceneStyle={remakeSceneStyle}
              sourceVideo={remakeSourceVideo}
              targetRegion={remakeTargetRegion}
              translateDialogue={remakeTranslateDialogue}
            />
          ) : (
            <>
              {modelLoading ? <LoadingState label={t("video.model.loading")} /> : null}
              <UploadBox
                media={media}
                modelRule={selectedModelRule}
                onBusyChange={setIsAssetPickerUploading}
                onChange={setMedia}
                reusableMedia={reusableMedia}
              />
              <ReferenceMediaTray media={media} modelRule={selectedModelRule} onRemove={removeMedia} onRoleChange={updateMediaRole} />
              <PromptBox
                media={media}
                mentionBindings={reconciledMentionBindings}
                onChange={setPrompt}
                onMentionBindingsChange={setMentionBindings}
                value={prompt}
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="se-control rounded-[18px] px-3 py-2 text-xs font-semibold text-[#f4f4f4]/76"
                  onClick={() => setPrompt((current) => `${current}${current && !current.endsWith(" ") ? " " : ""}@`)}
                  type="button"
                >
                  {t("video.prompt.elements")}
                </button>
                <button
                  className={`rounded-[18px] border px-3 py-2 text-xs font-semibold transition-colors ${
                    params.generateAudio
                      ? "border-[#ffb44d]/38 bg-[#ffb44d]/12 text-[#ffb44d]"
                      : "border-[rgba(244,244,244,0.08)] bg-[#1a1c22]/66 text-[#f4f4f4]/72 hover:border-[#ffb44d]/34 hover:bg-[#ffb44d]/8 hover:text-[#ffb44d]"
                  }`}
                  onClick={() => setParams((current) => ({ ...current, generateAudio: !current.generateAudio }))}
                  type="button"
                >
                  {params.generateAudio ? t("video.params.audioOn") : t("video.params.audioOff")}
                </button>
              </div>
              <ModelSelector models={models} onChange={handleModelChange} selectedModelId={selectedModel.id} />
              <VideoParamsPanel
                modelId={selectedModelRuleId}
                onChange={setParams}
                value={params}
              />
              {!token && !isSignedIn ? (
                <div className="rounded-[22px] border border-[#ffb44d]/26 bg-[#ffb44d]/8 p-4">
                  <p className="text-sm font-semibold text-[#ffb44d]">{t("video.errors.signInRequired")}</p>
                  <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/70">
                    {t("video.workspace.signInBody")}
                  </p>
                  <Link
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-[#ffd08a]/32 bg-[#ffb44d] px-5 text-sm font-semibold text-[#05070b] transition-colors hover:bg-[#ffc766]"
                    href="/sign-in?next=/workspace/video"
                  >
                    {t("video.actions.signIn")}
                  </Link>
                </div>
              ) : null}
            </>
          )}
          <ErrorState message={displayNotice} />
        </div>

        {workspaceMode === "remake" ? null : (
          <div className="shrink-0 border-t border-[rgba(244,244,244,0.08)] p-3">
            <GenerateButton
              credits={selectedModel.credits}
              disabled={!canGenerate}
              isSubmitting={isSubmitting}
              label={generateButtonLabel}
              onClick={submitCurrent}
            />
          </div>
        )}
      </aside>

      <main className="flex min-h-[520px] min-w-0 flex-col overflow-hidden xl:min-h-0">
        {workspaceMode === "remake" ? (
          <RemakeStoryboardPanel
            analysisNotice={remakeAnalysisNotice}
            metadata={remakeAnalysisMeta || undefined}
            onGenerateShot={handleGenerateRemakeShot}
            onUsePrompt={handleUseRemakePrompt}
            settings={{
              characterRules: remakeCharacterRules,
              mode: remakeMode,
              sceneStyle: remakeSceneStyle,
              targetRegion: remakeTargetRegion,
              translateDialogue: remakeTranslateDialogue,
            }}
            shotGenerations={displayedRemakeShotGenerations}
            storyboard={remakeStoryboard}
          />
        ) : (
          <>
            <div className="mb-2 flex flex-none gap-2 rounded-[24px] border border-[rgba(244,244,244,0.08)] bg-[#111318]/82 p-1.5 shadow-xl shadow-black/16">
              {([
                { key: "history", label: t("video.main.history") },
                { key: "guide", label: t("video.main.howItWorks") },
              ] as const).map((item) => (
                <button
                  className={`min-h-10 rounded-[18px] px-4 text-xs font-semibold transition-colors ${
                    mainPanel === item.key
                      ? "border border-[#ffb44d]/34 bg-[#ffb44d]/12 text-[#ffb44d] shadow-lg shadow-black/14"
                      : "border border-transparent text-[#b9b9b9]/62 hover:bg-[#1a1c22] hover:text-[#f4f4f4]"
                  }`}
                  key={item.key}
                  onClick={() => setMainPanel(item.key)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              {mainPanel === "guide" ? (
                <VideoHowItWorks modelName={selectedModel.label} />
              ) : (
                <VideoGenerationStream
                  filter={historyFilter}
                  getAddReferenceIssue={getHistoryReferenceAssetIssue}
                  getUseResultAsReferenceIssue={getGeneratedResultReferenceIssue}
                  history={history}
                  isLoading={isHistoryLoading}
                  onAddReference={handleAddHistoryReferenceAsset}
                  onFilterChange={setHistoryFilter}
                  onFill={handleFillFromHistory}
                  onRetry={handleRetry}
                  onUseResultAsReference={handleUseResultAsReference}
                  task={task}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
