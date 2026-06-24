"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { AudioToggle } from "@/components/video/AudioToggle";
import { GenerateButton } from "@/components/video/GenerateButton";
import { ModelSelector } from "@/components/video/ModelSelector";
import { PromptBox } from "@/components/video/PromptBox";
import { ReferenceMediaTray } from "@/components/video/ReferenceMediaTray";
import { UploadBox } from "@/components/video/UploadBox";
import { VideoGenerationStream, type VideoHistoryFilter } from "@/components/video/VideoGenerationStream";
import { VideoHowItWorks } from "@/components/video/VideoHowItWorks";
import { type VideoParams, VideoParamsPanel } from "@/components/video/VideoParamsPanel";
import { RemakeStoryboardPanel, type RemakeOutputItem, type RemakeOutputScope } from "@/components/video/remake/RemakeStoryboardPanel";
import { VideoRemakeWorkspace } from "@/components/video/remake/VideoRemakeWorkspace";
import { buildMockRemakeStoryboard } from "@/components/video/remake/remakeMockData";
import { getRemakeShotGenerationKey } from "@/components/video/remake/remakeTypes";
import type {
  RemakeKeyframe,
  RemakeMode,
  RemakeSegment,
  RemakeShot,
  RemakeShotGenerationState,
  RemakeShotQueueIntent,
  RemakeShotQueueMode,
  RemakeShotQueueStatus,
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
import { collectHistoryInputMediaAssets, collectReusableVideoAssets, mergeMediaAssets } from "@/lib/media-assets";
import {
  consumePromptStudioToVideoDraft,
  getPromptStudioDraftLocale,
  saveWorkspaceToPromptStudioDraft,
  type PromptStudioBridgeDraft,
} from "@/lib/prompt-studio-draft-bridge";
import { getVideoModels, getVideoStatus, reverseAnalyzeVideoRemake, uploadMedia } from "@/lib/video-api";
import {
  getSafeHistoryOutputUrl,
  getSafeVideoHistoryView,
  getVideoHistoryStableKey,
  getSafeVideoHistoryErrorMessage,
  getVideoHistoryTime,
  isVideoStaleActiveRecord,
} from "@/lib/video/historyUtils";
import {
  clearRemakeStoryboardDraft,
  getRemakeSourceVideoFromDraft,
  readRemakeStoryboardDraft,
  saveRemakeStoryboardDraft,
} from "@/lib/video/remakeStoryboardDraft";
import {
  clearRemakeShotQueueDraft,
  getRemakeQueueUserKeyHash,
  readRemakeShotQueueDraft,
  saveRemakeShotQueueDraft,
} from "@/lib/video/remakeShotQueueDraft";
import { readVideoDraft, saveVideoDraft, type VideoWorkspaceDraft } from "@/lib/video/videoDraft";
import { getReusableVideoOutputUrl, readVideoDraftNotice, sendVideoResultToVideoDraft } from "@/lib/video/videoResultDrafts";
import { estimateVideoCreditsForParams, getVideoModelRule, hasVideoModelRule, normalizeVideoParamsForModel } from "@/lib/video/videoModelRules";
import { VIDEO_PROMPT_FRONTEND_LIMIT } from "@/lib/video/videoPromptLimits";
import {
  parseMentionBindings,
  reconcileMentionBindings,
  serializeMentionBindings,
  type VideoMentionBinding,
} from "@/lib/video/videoMentionBindings";
import { getReferenceRoleIssue, validateReferenceSelectionForRule } from "@/lib/video/videoReferenceRules";
import { isVideoActiveStatus, isVideoFailedStatus } from "@/lib/utils";
import { ApiError } from "@/types/api";
import type { UploadMediaItem, UploadMediaRole, VideoModel, VideoStatusResponse, VideoTaskRecord } from "@/types/video";

const fallbackModels: VideoModel[] = [
  {
    id: "seedance_2_0",
    label: "Seedance 2.0",
    provider: "auto",
    providerModel: "seedance_2_0",
    desc: "General video generation model. Replace with live model registry when available.",
    credits: 12,
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    durationDefault: 4,
    ratios: ["16:9", "9:16", "1:1"],
    qualities: ["480p", "720p", "1080p"],
    supportsAudio: true,
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
    supportsAudio: true,
    uploadSlots: ["image", "last_frame_image"],
  },
];

function isMaintenanceApiError(error: unknown) {
  return error instanceof ApiError && error.kind === "maintenance";
}

type MainPanel = "history" | "guide";
type WorkspaceMode = "create" | "edit" | "motion" | "remake";
type VideoWorkspaceTabQuery = "create" | "history" | "remake";
type RemakeShotQueueMeta = {
  queueIndex?: number;
  queueMode?: RemakeShotQueueMode;
  queueRunId?: string;
  queueTotal?: number;
  retry?: boolean;
  retryAttempt?: number;
  retryOfShotKey?: string;
  retryOfTaskId?: string;
  retryQueueRunId?: string;
};
type RemakeShotQueueState = {
  activeShotKey?: string;
  ignoredShotKeys: string[];
  pausedShotKey?: string;
  queueIntent: RemakeShotQueueIntent;
  queueRunId: string;
  queueTotal: number;
  status: RemakeShotQueueStatus;
  wasInterruptedFromDraft?: boolean;
};
type RemakeActiveShotRecoveryState = {
  error?: string;
  jobId: string;
  shotKey: string;
  status: "checking" | "processing" | "completed" | "failed";
};
type RemakeOutputsView = {
  items: RemakeOutputItem[];
  scope: RemakeOutputScope;
};

const idleRemakeShotQueue: RemakeShotQueueState = {
  ignoredShotKeys: [],
  queueIntent: "generate_all",
  queueRunId: "",
  queueTotal: 0,
  status: "idle",
};

type RemakeHistoryShotCandidate = RemakeShotGenerationState & {
  historyTime: number;
  matchPriority: number;
};

function createRemakeShotQueueRunId() {
  return `remake_queue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createRemakeRetryQueueRunId() {
  return `remake_retry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getVideoWorkspaceTabQuery(value: string | null): VideoWorkspaceTabQuery | null {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "create" || normalized === "history" || normalized === "remake") return normalized;
  return null;
}

function normalizeRemakeQueueDraftShotState(state: RemakeShotGenerationState): RemakeShotGenerationState {
  if (state.status === "success" || state.status === "failed" || state.status === "skipped") return state;

  return {
    ...state,
    status: "idle",
  };
}

function getVideoStatusOutputUrl(result: VideoStatusResponse) {
  if (typeof result.videoUrl === "string" && result.videoUrl) return result.videoUrl;
  if (typeof result.outputUrl === "string" && result.outputUrl) return result.outputUrl;
  if (typeof result.output_url === "string" && result.output_url) return result.output_url;
  if (Array.isArray(result.outputUrls) && result.outputUrls[0]) return result.outputUrls[0];
  if (Array.isArray(result.output_urls) && result.output_urls[0]) return result.output_urls[0];
  return "";
}

function getVideoStatusErrorMessage(result: VideoStatusResponse, fallback: string) {
  return String(result.error_message || result.errorMessage || result.message || result.error || fallback);
}

function getVideoModelRuleId(model: VideoModel) {
  const candidates = [model.id, model.providerModel, model.label].filter((value): value is string => Boolean(value));
  return candidates.find((candidate) => hasVideoModelRule(candidate)) || candidates[0] || "generic";
}

function buildParamsForModel(model: VideoModel, current?: Partial<VideoParams>): VideoParams {
  const normalized = normalizeVideoParamsForModel(getVideoModelRuleId(model), {
    duration: current?.duration ?? model.durationDefault,
    ratio: current?.ratio ?? model.ratios[0],
    quality: current?.quality ?? model.qualities[0],
    generateAudio: current?.generateAudio ?? model.supportsAudio !== false,
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

function getPromptStudioVideoReferences(draft: PromptStudioBridgeDraft | null): UploadMediaItem[] {
  return (draft?.referenceImages || [])
    .filter((reference) => isSafePromptStudioReferenceUrl(reference.url))
    .map((reference) => {
      const fileName = reference.fileName || reference.name || "Prompt Studio reference";
      return {
        id: `prompt-studio-${reference.id || reference.url}`,
        type: "image" as const,
        role: "reference" as const,
        source: "reference_selected" as const,
        name: reference.name || fileName,
        previewUrl: reference.url,
        url: reference.url,
        size: reference.sizeBytes,
        mimeType: reference.mimeType,
        filename: fileName,
        originalName: fileName,
        uploadStatus: "ready" as const,
      };
    });
}

function isSafePromptStudioReferenceUrl(value?: string) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!/^https?:\/\//i.test(normalized)) return false;
  const lower = normalized.toLowerCase();
  return (
    !lower.startsWith("data:") &&
    !lower.startsWith("blob:") &&
    !lower.startsWith("javascript:") &&
    !lower.includes("127.0.0.1") &&
    !lower.includes("localhost") &&
    !lower.includes("0.0.0.0") &&
    !lower.includes("[::1]") &&
    !lower.includes("file://")
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

function findVideoModelByLookup(modelList: VideoModel[], lookup: string | undefined) {
  const normalizedLookup = normalizeModelLookup(lookup);
  if (!normalizedLookup) return null;

  return (
    modelList.find((model) =>
      [model.id, model.providerModel, model.label]
        .map(normalizeModelLookup)
        .some((candidate) => candidate === normalizedLookup),
    ) || null
  );
}

function findRemakeShotModel(shot: RemakeShot, modelList: VideoModel[], fallbackModel: VideoModel) {
  const storyboardModelId = shot.generationParams?.modelId || "";
  return storyboardModelId ? findVideoModelByLookup(modelList, storyboardModelId) : fallbackModel;
}

function appendPromptPart(parts: string[], value: string | undefined) {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) return;

  const existing = parts.join(" ").toLowerCase();
  if (!existing.includes(normalizedValue.toLowerCase())) {
    parts.push(normalizedValue);
  }
}

function buildRemakeShotPrompt(shot: RemakeShot) {
  const parts: string[] = [];
  appendPromptPart(parts, shot.prompt);
  appendPromptPart(parts, shot.camera ? `Camera: ${shot.camera}` : "");
  appendPromptPart(parts, shot.motion ? `Camera movement: ${shot.motion}` : "");
  appendPromptPart(parts, shot.position ? `Blocking: ${shot.position}` : "");
  appendPromptPart(parts, shot.action ? `Action: ${shot.action}` : "");
  appendPromptPart(parts, shot.emotion ? `Emotion: ${shot.emotion}` : "");
  appendPromptPart(parts, shot.dialogue ? `Dialogue cue: ${shot.dialogue}` : "");
  appendPromptPart(parts, shot.audio ? `Audio cue: ${shot.audio}` : "");

  return parts.join("\n").trim();
}

function getRemoteRemakeKeyframes(shot: RemakeShot): RemakeKeyframe[] {
  return (shot.keyframes || []).filter((frame) => /^https?:\/\//i.test(String(frame.url || "")));
}

function buildRemakeShotReferenceMedia(shot: RemakeShot, model: VideoModel): UploadMediaItem[] {
  const rule = getVideoModelRule(getVideoModelRuleId(model));
  const imageLimit = Math.max(0, Number(rule.maxReferences?.image || 0));
  const keyframes = getRemoteRemakeKeyframes(shot).slice(0, imageLimit || 0);

  if (!rule.supportsImageReference || !keyframes.length) return [];

  return keyframes.map((frame, index) => ({
    id: `remake-keyframe-${shot.shotGroupId}-${shot.shot}-${index + 1}`,
    mimeType: "image/jpeg",
    name: `Shot ${shot.shot} keyframe ${index + 1}`,
    previewUrl: frame.url,
    role: (index === 0 && rule.supportsStartFrame ? "start_frame" : "reference") as UploadMediaRole,
    source: "history",
    type: "image",
    uploadStatus: "ready",
    url: frame.url,
  }));
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

function asPlainRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getNestedPlainRecord(source: Record<string, unknown>, key: string) {
  return asPlainRecord(source[key]);
}

function getRemakeHistoryMeta(record: VideoTaskRecord) {
  const raw = asPlainRecord(record);
  const request = getNestedPlainRecord(raw, "request");
  const rawPayload = getNestedPlainRecord(raw, "raw");
  const params = getNestedPlainRecord(raw, "params");
  const data = getNestedPlainRecord(raw, "data");
  const candidates = [
    asPlainRecord(raw.meta),
    asPlainRecord(raw.metadata),
    asPlainRecord(request.meta),
    asPlainRecord(rawPayload.meta),
    asPlainRecord(params.meta),
    asPlainRecord(data.meta),
  ];

  return (
    candidates.find((meta) => String(meta.source || "").trim() === "remake" || meta.remake !== undefined || meta.remake_source !== undefined) ||
    candidates.reduce<Record<string, unknown>>((merged, meta) => ({ ...merged, ...meta }), {})
  );
}

function getRemakeHistoryOutputUrl(record: VideoTaskRecord) {
  const raw = asPlainRecord(record);
  const request = getNestedPlainRecord(raw, "request");
  const rawPayload = getNestedPlainRecord(raw, "raw");
  const params = getNestedPlainRecord(raw, "params");
  const data = getNestedPlainRecord(raw, "data");

  return (
    getSafeHistoryOutputUrl(record) ||
    getSafeHistoryOutputUrl(raw.metadata) ||
    getSafeHistoryOutputUrl(request) ||
    getSafeHistoryOutputUrl(rawPayload) ||
    getSafeHistoryOutputUrl(params) ||
    getSafeHistoryOutputUrl(data)
  );
}

function getStringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function getNumberValue(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function isTrueValue(value: unknown) {
  if (value === true) return true;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return false;
}

function getRemakeHistoryLookupKey(shotGroupId: string, shotNumber: number) {
  return `${shotGroupId}:${String(shotNumber)}`;
}

function getRemakeHistoryTaskId(record: VideoTaskRecord) {
  const meta = getRemakeHistoryMeta(record);
  return (
    getStringValue(record.jobId) ||
    getStringValue(record.providerJobId) ||
    getStringValue(record.dbJobId) ||
    getStringValue(meta.jobId) ||
    getStringValue(meta.providerJobId)
  );
}

function getRemakeOutputStatusKind(statusValue: string, outputUrl: string): RemakeOutputItem["statusKind"] {
  const status = String(statusValue || "").toLowerCase();
  if (isVideoFailedStatus(status)) return "failed";
  if (outputUrl) return "completed";
  if (isVideoActiveStatus(status)) return "processing";
  return "unknown";
}

function findRemakeOutputShot(storyboard: RemakeStoryboard | null, analysisId: string, shotGroupId: string, shotNumber: number) {
  if (!storyboard?.shots.length) return undefined;
  if (analysisId && analysisId !== storyboard.id) return undefined;

  return storyboard.shots.find((shot) => shot.shotGroupId === shotGroupId && String(shot.shot) === String(shotNumber));
}

function toRemakeOutputItem(item: RemakeOutputItem & { historyTime: number }): RemakeOutputItem {
  const output = { ...item } as RemakeOutputItem & { historyTime?: number };
  delete output.historyTime;
  return output;
}

function buildRemakeOutputItems(records: VideoTaskRecord[], storyboard: RemakeStoryboard | null): RemakeOutputsView {
  const outputs = new Map<string, RemakeOutputItem & { historyTime: number }>();

  records.forEach((record, index) => {
    const meta = getRemakeHistoryMeta(record);
    if (getStringValue(meta.source) !== "remake") return;
    if (!isTrueValue(meta.remake)) return;
    if (getStringValue(meta.remake_source) !== "storyboard_shot") return;

    const view = getSafeVideoHistoryView(record, `remake-output:${index}`);
    const outputUrl = getRemakeHistoryOutputUrl(record) || view.outputUrl;
    const statusKind = getRemakeOutputStatusKind(view.status, outputUrl);
    if (statusKind === "unknown" && !outputUrl) return;

    const analysisId = getStringValue(meta.analysisId);
    const shotGroupId = getStringValue(meta.shotGroupId);
    const shotNumber = getNumberValue(meta.shotNumber) || undefined;
    const historyTime = getVideoHistoryTime(record);
    const key = getVideoHistoryStableKey(record, `remake-output:${index}`) || `remake-output:${index}`;
    const item: RemakeOutputItem & { historyTime: number } = {
      analysisId: analysisId || undefined,
      createdAtLabel: view.createdAtLabel,
      duration: view.duration,
      errorMessage: statusKind === "failed" ? getSafeVideoHistoryErrorMessage(record) : "",
      historyTime,
      key,
      modelLabel: view.modelLabel,
      outputUrl: outputUrl || view.outputUrl,
      quality: view.quality,
      ratio: view.ratio,
      shot: shotGroupId && shotNumber ? findRemakeOutputShot(storyboard, analysisId, shotGroupId, shotNumber) : undefined,
      shotGroupId: shotGroupId || undefined,
      shotNumber,
      status: view.status,
      statusKind,
    };
    const current = outputs.get(key);
    if (!current || item.historyTime >= current.historyTime) outputs.set(key, item);
  });

  const allOutputs = Array.from(outputs.values());

  if (storyboard?.id) {
    const exactOutputs = allOutputs.filter((item) => item.analysisId === storyboard.id);
    const scopedOutputs = exactOutputs.length
      ? exactOutputs
      : allOutputs.filter((item) => !item.analysisId && item.shot);

    return {
      items: scopedOutputs
        .sort((a, b) => {
          const shotDelta = (a.shotNumber || Number.MAX_SAFE_INTEGER) - (b.shotNumber || Number.MAX_SAFE_INTEGER);
          if (shotDelta !== 0) return shotDelta;
          return b.historyTime - a.historyTime;
        })
        .map(toRemakeOutputItem),
      scope: "current",
    };
  }

  return {
    items: allOutputs
      .sort((a, b) => b.historyTime - a.historyTime)
      .slice(0, 5)
      .map(toRemakeOutputItem),
    scope: "recent",
  };
}

function preferRemakeHistoryCandidate(current: RemakeHistoryShotCandidate | undefined, candidate: RemakeHistoryShotCandidate) {
  if (!current) return true;
  if (candidate.matchPriority !== current.matchPriority) return candidate.matchPriority > current.matchPriority;
  if (candidate.historyTime !== current.historyTime) return candidate.historyTime > current.historyTime;
  if (candidate.status === "success" && current.status !== "success") return true;
  return false;
}

function toRemakeShotGenerationState(candidate: RemakeHistoryShotCandidate): RemakeShotGenerationState {
  return {
    error: candidate.error,
    outputUrl: candidate.outputUrl,
    queueIndex: candidate.queueIndex,
    queueMode: candidate.queueMode,
    queueRunId: candidate.queueRunId,
    queueTotal: candidate.queueTotal,
    retryAttempt: candidate.retryAttempt,
    retryOfShotKey: candidate.retryOfShotKey,
    retryOfTaskId: candidate.retryOfTaskId,
    retryQueueRunId: candidate.retryQueueRunId,
    status: candidate.status,
    taskId: candidate.taskId,
    updatedAt: candidate.updatedAt,
  };
}

function buildRemakeHistoryShotMap(
  records: VideoTaskRecord[],
  storyboard: RemakeStoryboard | null,
): Record<string, RemakeShotGenerationState> {
  if (!storyboard?.shots.length) return {};

  const exactShotKeys = new Map<string, string>();
  const fallbackShotKeys = new Map<string, string>();
  storyboard.shots.forEach((shot) => {
    const lookupKey = getRemakeHistoryLookupKey(shot.shotGroupId, shot.shot);
    const shotKey = getRemakeShotGenerationKey(storyboard.id, shot);
    exactShotKeys.set(`${storyboard.id}:${lookupKey}`, shotKey);
    fallbackShotKeys.set(lookupKey, shotKey);
  });

  const candidates = new Map<string, RemakeHistoryShotCandidate>();

  records.forEach((record) => {
    const meta = getRemakeHistoryMeta(record);
    if (getStringValue(meta.source) !== "remake") return;
    if (!isTrueValue(meta.remake)) return;
    if (getStringValue(meta.remake_source) !== "storyboard_shot") return;

    const shotGroupId = getStringValue(meta.shotGroupId);
    const shotNumber = getNumberValue(meta.shotNumber);
    if (!shotGroupId || !shotNumber) return;

    const historyAnalysisId = getStringValue(meta.analysisId);
    if (historyAnalysisId && historyAnalysisId !== storyboard.id) return;

    const lookupKey = getRemakeHistoryLookupKey(shotGroupId, shotNumber);
    const isExactMatch = Boolean(historyAnalysisId);
    const shotKey = isExactMatch
      ? exactShotKeys.get(`${historyAnalysisId}:${lookupKey}`)
      : fallbackShotKeys.get(lookupKey);
    if (!shotKey) return;

    const outputUrl = getRemakeHistoryOutputUrl(record);
    const status = String(record.status || "");
    const isSuccess = Boolean(outputUrl);
    const isFailed = isVideoFailedStatus(status);
    if (!isSuccess && !isFailed) return;

    const historyTime = getVideoHistoryTime(record);
    const candidate: RemakeHistoryShotCandidate = {
      error: isFailed ? getSafeVideoHistoryErrorMessage(record) : "",
      historyTime,
      matchPriority: isExactMatch ? 2 : 1,
      outputUrl: isSuccess ? outputUrl : "",
      queueIndex: getNumberValue(meta.queueIndex) || undefined,
      queueMode: getStringValue(meta.queueMode) === "retry_serial" ? "retry_serial" : getStringValue(meta.queueMode) === "serial" ? "serial" : undefined,
      queueRunId: getStringValue(meta.queueRunId) || undefined,
      queueTotal: getNumberValue(meta.queueTotal) || undefined,
      retryAttempt: getNumberValue(meta.retryAttempt) || undefined,
      retryOfShotKey: getStringValue(meta.retryOfShotKey) || undefined,
      retryOfTaskId: getStringValue(meta.retryOfTaskId) || undefined,
      retryQueueRunId: getStringValue(meta.retryQueueRunId) || undefined,
      status: isSuccess ? "success" : "failed",
      taskId: getRemakeHistoryTaskId(record) || undefined,
      updatedAt: historyTime || undefined,
    };

    if (preferRemakeHistoryCandidate(candidates.get(shotKey), candidate)) {
      candidates.set(shotKey, candidate);
    }
  });

  return Object.fromEntries(
    Array.from(candidates.entries()).map(([key, candidate]) => [key, toRemakeShotGenerationState(candidate)]),
  );
}

function shouldApplyRemakeHistoryGeneration(
  current: RemakeShotGenerationState | undefined,
  restored: RemakeShotGenerationState,
) {
  if (!current) return true;
  if (current.status === "queued" || current.status === "generating" || current.status === "skipped") return false;

  const currentTime = current.updatedAt || 0;
  const restoredTime = restored.updatedAt || 0;
  if (
    current.status === restored.status &&
    current.outputUrl === restored.outputUrl &&
    current.error === restored.error &&
    current.taskId === restored.taskId
  ) {
    return false;
  }

  if (current.status === "success" && current.outputUrl && currentTime >= restoredTime) return false;
  if (current.status === "failed" && currentTime > restoredTime) return false;

  return true;
}

function getNextRemakeRetryAttempt(generation: RemakeShotGenerationState | undefined) {
  const attempt = Number(generation?.retryAttempt || 0);
  return Number.isFinite(attempt) && attempt >= 0 ? attempt + 1 : 1;
}

function isSameRemakeSourceVideo(left: RemakeSourceVideo | null, right: RemakeSourceVideo | null) {
  if (!left || !right) return false;
  return left.lastModified === right.lastModified && left.name === right.name && left.size === right.size;
}

export function VideoWorkspace() {
  const { locale, t, tf } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isZh = getPromptStudioDraftLocale(locale) === "zh";
  const tabQuery = getVideoWorkspaceTabQuery(searchParams.get("tab"));
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
    analysisSource?: "fallback" | "vlm";
    fallbackReason?: string;
    mock?: boolean;
    segments?: RemakeSegment[];
    sourceVideo?: RemakeSourceVideoMetadata;
    vlmProvider?: string;
  } | null>(null);
  const [remakeAnalysisError, setRemakeAnalysisError] = useState("");
  const [remakeAnalysisNotice, setRemakeAnalysisNotice] = useState("");
  const [isRemakeDraftRestored, setIsRemakeDraftRestored] = useState(false);
  const [remakeShotGenerations, setRemakeShotGenerations] = useState<Record<string, RemakeShotGenerationState>>({});
  const [remakeShotQueue, setRemakeShotQueue] = useState<RemakeShotQueueState>(idleRemakeShotQueue);
  const [remakeActiveShotRecovery, setRemakeActiveShotRecovery] = useState<RemakeActiveShotRecoveryState | null>(null);
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remakeDraftHydratedRef = useRef(false);
  const remakeQueueDraftHydratedRef = useRef("");
  const remakeQueueDraftSignatureRef = useRef("");
  const remakeActiveRecoveryRef = useRef("");
  const remakeShotGenerationsRef = useRef<Record<string, RemakeShotGenerationState>>({});
  const remakeShotQueueSubmittingRef = useRef(false);
  const remakeSourceRevisionRef = useRef(0);
  const latestDraftSnapshotRef = useRef<{
    media: UploadMediaItem[];
    mentionBindings: VideoMentionBinding[];
    params: VideoParams;
    prompt: string;
    selectedModel: VideoModel;
  } | null>(null);

  const { isLoading: isAuthLoading, isSignedIn, profile, token } = useAuthSession();
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
  const remakeQueueUserKeyHash = useMemo(
    () => getRemakeQueueUserKeyHash(profile?.email || profile?.name || ""),
    [profile?.email, profile?.name],
  );
  const [workspaceNotice, setWorkspaceNotice] = useState("");
  const [pendingPromptStudioDraft, setPendingPromptStudioDraft] = useState<PromptStudioBridgeDraft | null>(null);
  const promptStudioImportTargetRef = useRef<HTMLDivElement | null>(null);
  const promptStudioImportHighlightTimerRef = useRef<number | null>(null);
  const [isPromptStudioImportHighlighted, setIsPromptStudioImportHighlighted] = useState(false);
  const promptStudioDraftCheckedRef = useRef(false);
  const reconciledMentionBindings = useMemo(
    () => serializeMentionBindings(stripReconciledMentionBindings(reconcileMentionBindings(mentionBindings, media))),
    [media, mentionBindings],
  );

  useEffect(() => {
    remakeShotGenerationsRef.current = remakeShotGenerations;
  }, [remakeShotGenerations]);

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
        const draftNotice = readVideoDraftNotice();
        if (draftNotice) setWorkspaceNotice(draftNotice);
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

  const focusPromptStudioImportTarget = useCallback(() => {
    if (promptStudioImportHighlightTimerRef.current) {
      window.clearTimeout(promptStudioImportHighlightTimerRef.current);
    }
    window.requestAnimationFrame(() => {
      promptStudioImportTargetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setIsPromptStudioImportHighlighted(true);
      promptStudioImportHighlightTimerRef.current = window.setTimeout(() => {
        setIsPromptStudioImportHighlighted(false);
      }, 1800);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (promptStudioImportHighlightTimerRef.current) {
        window.clearTimeout(promptStudioImportHighlightTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!draftReady || promptStudioDraftCheckedRef.current) return;
    promptStudioDraftCheckedRef.current = true;

    const draft = consumePromptStudioToVideoDraft();
    if (!draft?.prompt) return;

    const nextPrompt = draft.prompt.slice(0, VIDEO_PROMPT_FRONTEND_LIMIT);
    const timer = window.setTimeout(() => {
      setWorkspaceMode("create");
      if (prompt.trim() || media.length) {
        setPendingPromptStudioDraft({ ...draft, prompt: nextPrompt });
        focusPromptStudioImportTarget();
        return;
      }

      setPrompt(nextPrompt);
      const nextReferences = getPromptStudioVideoReferences(draft);
      if (nextReferences.length) {
        setMedia((current) => mergeMediaAssets(current, nextReferences));
      }
      setWorkspaceNotice(
        isZh
          ? "已导入 Prompt Studio 草稿。请确认后手动点击生成。"
          : "Prompt Studio draft imported. Review it, then click Generate manually.",
      );
      focusPromptStudioImportTarget();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [draftReady, focusPromptStudioImportTarget, isZh, media.length, prompt]);

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

  useEffect(() => {
    if (remakeDraftHydratedRef.current) return;
    remakeDraftHydratedRef.current = true;

    const result = readRemakeStoryboardDraft();
    if (result.status === "missing" || result.status === "unavailable") return;

    const timer = window.setTimeout(() => {
      if (!result.draft) {
        if (result.status === "expired") {
          setWorkspaceNotice(t("video.remake.draftExpired"));
        } else {
          setWorkspaceNotice(t("video.remake.draftRestoreFailed"));
        }
        return;
      }

      const draft = result.draft;
      setRemakeMode(draft.settings.mode);
      setRemakeTargetRegion(draft.settings.targetRegion);
      setRemakeCharacterRules(draft.settings.characterRules);
      setRemakeSceneStyle(draft.settings.sceneStyle);
      setRemakeTranslateDialogue(draft.settings.translateDialogue);
      setRemakeSourceVideo(getRemakeSourceVideoFromDraft(draft));
      setRemakeStoryboard(draft.storyboard);
      setRemakeAnalysisMeta({
        analysisSource: draft.storyboard.analysisSource,
        fallbackReason: draft.storyboard.fallbackReason,
        mock: draft.storyboard.mock,
        segments: draft.segments,
        sourceVideo: draft.sourceVideo,
        vlmProvider: draft.storyboard.vlmProvider,
      });
      setRemakeAnalysisError("");
      setRemakeAnalysisNotice(t("video.remake.restoredDraft"));
      setIsRemakeDraftRestored(true);
      setRemakeShotQueue(idleRemakeShotQueue);
      setWorkspaceMode("remake");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [t]);

  useEffect(() => {
    if (!tabQuery) return;
    const timer = window.setTimeout(() => {
      if (tabQuery === "remake") {
        setWorkspaceMode("remake");
        return;
      }

      setWorkspaceMode("create");
      if (tabQuery === "history") setMainPanel("history");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [tabQuery]);

  useEffect(() => {
    const storyboard = remakeStoryboard;
    if (!storyboard) {
      remakeQueueDraftHydratedRef.current = "";
      return;
    }
    const analysisId = storyboard.id;
    if (!analysisId) {
      remakeQueueDraftHydratedRef.current = "";
      return;
    }

    if ((token || isSignedIn) && isAuthLoading && !remakeQueueUserKeyHash) return;

    const hydrateKey = `${analysisId}:${remakeQueueUserKeyHash || "anonymous"}`;
    if (remakeQueueDraftHydratedRef.current === hydrateKey) return;

    const result = readRemakeShotQueueDraft({
      analysisId,
      userKeyHash: remakeQueueUserKeyHash,
    });

    if (result.status === "user_mismatch" && !remakeQueueUserKeyHash && (token || isSignedIn)) return;

    remakeQueueDraftHydratedRef.current = hydrateKey;

    if (!result.draft) return;
    if (result.draft.status === "idle" || result.draft.status === "completed" || result.draft.status === "cancelled") {
      clearRemakeShotQueueDraft();
      return;
    }

    const draft = result.draft;
    const storyboardShotKeys = new Set(storyboard.shots.map((shot) => getRemakeShotGenerationKey(storyboard.id, shot)));
    const orderedShotKeys = draft.orderedShotKeys.filter((key) => storyboardShotKeys.has(key));
    if (!orderedShotKeys.length) return;

    const wasInterruptedFromDraft = draft.status === "running" || Boolean(draft.activeShotKey);
    const activeShotTaskId = wasInterruptedFromDraft && draft.activeShotKey ? draft.shotStates[draft.activeShotKey]?.taskId || "" : "";
    const ignoredShotKeys = new Set(draft.ignoredShotKeys.filter((key) => storyboardShotKeys.has(key)));
    if (wasInterruptedFromDraft && !activeShotTaskId && draft.activeShotKey && storyboardShotKeys.has(draft.activeShotKey)) {
      ignoredShotKeys.add(draft.activeShotKey);
    }
    const pausedShotKey =
      !wasInterruptedFromDraft && draft.pausedShotKey && storyboardShotKeys.has(draft.pausedShotKey)
        ? draft.pausedShotKey
        : !wasInterruptedFromDraft
          ? draft.failedShotKeys.find((key) => storyboardShotKeys.has(key))
          : undefined;
    const queueTotal = Math.max(
      orderedShotKeys.length,
      ...orderedShotKeys.map((key) => Number(draft.shotStates[key]?.queueTotal || 0)),
    );

    const timer = window.setTimeout(() => {
      setRemakeShotGenerations((current) => {
        let changed = false;
        const next = { ...current };

        orderedShotKeys.forEach((shotKey) => {
          const restored = draft.shotStates[shotKey];
          if (!restored) return;
          const normalized =
            activeShotTaskId && shotKey === draft.activeShotKey
              ? { ...restored, status: "generating" as const }
              : normalizeRemakeQueueDraftShotState(restored);
          if (!shouldApplyRemakeHistoryGeneration(current[shotKey], normalized)) return;
          next[shotKey] = {
            ...(current[shotKey] || {}),
            ...normalized,
            queueRunId: normalized.queueRunId || draft.queueRunId,
            queueTotal: normalized.queueTotal || queueTotal,
          };
          changed = true;
        });

        return changed ? next : current;
      });
      setRemakeShotQueue({
        activeShotKey: wasInterruptedFromDraft ? draft.activeShotKey : undefined,
        ignoredShotKeys: Array.from(ignoredShotKeys),
        pausedShotKey,
        queueIntent: draft.queueIntent,
        queueRunId: draft.queueRunId,
        queueTotal,
        status: "paused",
        wasInterruptedFromDraft,
      });
      setWorkspaceNotice(
        wasInterruptedFromDraft ? t("video.remake.queueInterrupted") : t("video.remake.queueDraftRestored"),
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isAuthLoading, isSignedIn, remakeQueueUserKeyHash, remakeStoryboard, t, token]);

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

  const resetRemakeDerivedSourceState = useCallback((workspaceMessage = "") => {
    clearRemakeStoryboardDraft();
    clearRemakeShotQueueDraft();
    remakeQueueDraftSignatureRef.current = "";
    remakeQueueDraftHydratedRef.current = "";
    remakeActiveRecoveryRef.current = "";
    remakeShotQueueSubmittingRef.current = false;
    setIsRemakeAnalyzing(false);
    setIsRemakeSourceUploading(false);
    setRemakeStoryboard(null);
    setRemakeAnalysisMeta(null);
    setRemakeAnalysisError("");
    setRemakeAnalysisNotice("");
    setIsRemakeDraftRestored(false);
    setRemakeShotGenerations({});
    setRemakeShotQueue(idleRemakeShotQueue);
    setRemakeActiveShotRecovery(null);
    setWorkspaceNotice(workspaceMessage);
  }, []);

  const handleAnalyzeRemakeStoryboard = useCallback(async () => {
    const analysisRevision = remakeSourceRevisionRef.current;
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
          if (remakeSourceRevisionRef.current !== analysisRevision) return;
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
          if (remakeSourceRevisionRef.current !== analysisRevision) return;
          const uploadMessage = isMaintenanceApiError(uploadError)
            ? t("maintenance.errors.generationPaused")
            : `${t("video.remake.sourceUploadFailed")} ${
                uploadError instanceof Error ? uploadError.message : t("video.errors.uploadFailed")
              }`;
          setRemakeAnalysisError(
            uploadMessage,
          );
          return;
        } finally {
          if (remakeSourceRevisionRef.current === analysisRevision) setIsRemakeSourceUploading(false);
        }
      }

      if (remakeSourceRevisionRef.current !== analysisRevision) return;
      setRemakeAnalysisNotice(t("video.remake.vlmAnalyzing"));
      const result = await reverseAnalyzeVideoRemake({
        ...settings,
        sourceFileName: sourceVideoForAnalyze?.name || "",
        sourceLanguage: "zh",
        sourceVideoUrl,
        targetLanguage: "en",
      });
      if (remakeSourceRevisionRef.current !== analysisRevision) return;

      const analysisSource =
        result.meta?.analysisSource === "vlm"
          ? "vlm"
          : result.meta?.analysisSource === "fallback" || result.meta?.mock
            ? "fallback"
            : result.meta?.vlmProvider
              ? "vlm"
              : undefined;
      const analyzedStoryboard: RemakeStoryboard = {
        ...result.storyboard,
        analysisSource,
        fallbackReason: result.meta?.fallbackReason,
        mock: Boolean(result.meta?.mock),
        vlmProvider: result.meta?.vlmProvider,
      };

      setRemakeStoryboard(analyzedStoryboard);
      setRemakeAnalysisMeta({
        analysisSource,
        fallbackReason: result.meta?.fallbackReason,
        mock: Boolean(result.meta?.mock),
        segments: result.meta?.segments,
        sourceVideo: result.meta?.sourceVideo,
        vlmProvider: result.meta?.vlmProvider,
      });
      const draftResult = saveRemakeStoryboardDraft({
        segments: result.meta?.segments,
        settings,
        sourceVideo: sourceVideoForAnalyze,
        sourceVideoMetadata: result.meta?.sourceVideo,
        sourceVideoUrl,
        storyboard: analyzedStoryboard,
      });
      if (!draftResult.ok) {
        setWorkspaceNotice(t("video.remake.draftSaveFailed"));
      }
      setIsRemakeDraftRestored(false);
      if (analysisSource === "fallback" || result.meta?.vlmFailed || result.meta?.vlmUnavailable) {
        setRemakeAnalysisNotice(t("video.remake.vlmFallback"));
      } else if (result.meta?.vlmProvider) {
        setRemakeAnalysisNotice(
          `${t("video.remake.analysisComplete")} ${tf("video.remake.vlmProvider", { provider: getRemakeVlmProviderLabel(result.meta.vlmProvider) })}`,
        );
      } else {
        setRemakeAnalysisNotice("");
      }
    } catch (error) {
      if (remakeSourceRevisionRef.current !== analysisRevision) return;
      setRemakeStoryboard(buildMockRemakeStoryboard(settings, remakeSourceVideo));
      setRemakeAnalysisMeta(null);
      setRemakeAnalysisError(
        `${t("video.remake.analysisFailed")} ${error instanceof Error ? error.message : t("video.remake.apiUnavailable")}`,
      );
      setRemakeAnalysisNotice(t("video.remake.mockFallback"));
    } finally {
      if (remakeSourceRevisionRef.current === analysisRevision) {
        setIsRemakeAnalyzing(false);
        setIsRemakeSourceUploading(false);
      }
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

  const handleRemakeSourceVideoChange = useCallback(
    (source: RemakeSourceVideo | null) => {
      if (!source) {
        remakeSourceRevisionRef.current += 1;
        setRemakeSourceVideo(null);
        resetRemakeDerivedSourceState();
        return;
      }

      const isSameSource = isSameRemakeSourceVideo(remakeSourceVideo, source);
      if (!isSameSource) {
        remakeSourceRevisionRef.current += 1;
        resetRemakeDerivedSourceState();
      }

      setRemakeSourceVideo(
        isSameSource && remakeSourceVideo?.url && !source.url
          ? {
              ...source,
              url: remakeSourceVideo.url,
            }
          : source,
      );
    },
    [remakeSourceVideo, resetRemakeDerivedSourceState],
  );

  const handleClearRemakeSourceVideo = useCallback(() => {
    remakeSourceRevisionRef.current += 1;
    setRemakeSourceVideo(null);
    resetRemakeDerivedSourceState(t("video.remake.sourceVideoRemoved"));
  }, [resetRemakeDerivedSourceState, t]);

  const handleClearRemakeDraft = useCallback(() => {
    remakeSourceRevisionRef.current += 1;
    setRemakeSourceVideo(null);
    resetRemakeDerivedSourceState();
  }, [resetRemakeDerivedSourceState]);

  const handleUseRemakePrompt = useCallback(
    (nextPrompt: string) => {
      setPrompt(nextPrompt);
      setWorkspaceMode("create");
      setWorkspaceNotice(t("video.remake.promptLoaded"));
    },
    [t],
  );

  const handleImportPromptStudioDraft = useCallback(() => {
    if (!pendingPromptStudioDraft?.prompt) return;
    setWorkspaceMode("create");
    setPrompt(pendingPromptStudioDraft.prompt.slice(0, VIDEO_PROMPT_FRONTEND_LIMIT));
    const nextReferences = getPromptStudioVideoReferences(pendingPromptStudioDraft);
    if (nextReferences.length) {
      setMedia((current) => mergeMediaAssets(current, nextReferences));
    }
    setPendingPromptStudioDraft(null);
    setWorkspaceNotice(
      isZh
        ? "已导入 Prompt Studio 草稿。请确认后手动点击生成。"
        : "Prompt Studio draft imported. Review it, then click Generate manually.",
    );
    focusPromptStudioImportTarget();
  }, [focusPromptStudioImportTarget, isZh, pendingPromptStudioDraft]);

  const handleIgnorePromptStudioDraft = useCallback(() => {
    setPendingPromptStudioDraft(null);
    setWorkspaceNotice(isZh ? "已忽略 Prompt Studio 草稿。" : "Prompt Studio draft ignored.");
  }, [isZh]);

  const handleOpenPromptStudio = useCallback(() => {
    const currentPrompt = prompt.trim();
    if (!currentPrompt) {
      setWorkspaceNotice(isZh ? "请先输入提示词，再用 Prompt Studio 优化。" : "Enter a prompt before optimizing in Prompt Studio.");
      return;
    }

    saveWorkspaceToPromptStudioDraft({
      prompt: currentPrompt,
      source: "video-workspace",
      target: "video",
      engine: selectedModel.id || selectedModel.providerModel || "seedance",
      mode: "optimize",
    });
    router.push("/prompt-studio?from=video-workspace");
  }, [isZh, prompt, router, selectedModel.id, selectedModel.providerModel]);

  const isUploadingMedia = isAssetPickerUploading || media.some((item) => item.uploadStatus === "uploading");
  const isCurrentTaskProcessing = Boolean(task && isVideoActiveStatus(task.status) && !isVideoStaleActiveRecord(task));
  const effectiveMaxConcurrency = Math.max(1, Math.floor(Number(maxConcurrency || 1)));
  const visibleActiveTaskCount = Math.max(activeTaskCount, isCurrentTaskProcessing ? 1 : 0);
  const isProcessing = visibleActiveTaskCount >= effectiveMaxConcurrency;
  const concurrencyLabel = tf("generation.errors.activeTasks", {
    active: visibleActiveTaskCount,
    max: effectiveMaxConcurrency,
  });
  const concurrencyLimitNotice = `${t("generation.errors.concurrencyLimitReached")} ${concurrencyLabel}`;
  const selectedModelRuleId = getVideoModelRuleId(selectedModel);
  const selectedModelRule = useMemo(() => getVideoModelRule(selectedModelRuleId), [selectedModelRuleId]);
  const isAudioSupported = selectedModel.supportsAudio !== false;
  const effectiveGenerateAudio = isAudioSupported && params.generateAudio;
  const estimatedCredits = useMemo(
    () =>
      estimateVideoCreditsForParams(
        selectedModelRuleId,
        {
          duration: params.duration,
          generateAudio: effectiveGenerateAudio,
          quality: params.quality,
          ratio: params.ratio,
        },
        selectedModel.credits,
      ),
    [effectiveGenerateAudio, params.duration, params.quality, params.ratio, selectedModel.credits, selectedModelRuleId],
  );
  const hasEnoughCredits = credits === null || estimatedCredits <= credits;
  const isPromptTooLong = prompt.length > VIDEO_PROMPT_FRONTEND_LIMIT;
  const hasPromptForGenerate = Boolean(prompt.trim());
  const canGenerate = Boolean(selectedModel) && hasPromptForGenerate && !isSubmitting && !isUploadingMedia && !isProcessing && Boolean(token || isSignedIn) && hasEnoughCredits && !isPromptTooLong;
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
      "Prompt is too long. Please keep it under 4,000 characters.": tf("video.errors.promptTooLong", { limit: VIDEO_PROMPT_FRONTEND_LIMIT }),
      "You already have active generation tasks. Please wait until one finishes.": t("video.errors.activeGeneration"),
      "Video generation request failed.": t("video.errors.generationRequestFailed"),
      "No jobId returned by video API.": t("video.errors.noJobId"),
      "Unable to check this job status. It may be expired. Please check History or retry.": t("video.result.statusExpired"),
      "Failed to refresh video status.": t("video.errors.statusRefreshFailed"),
      "Failed to load models. Using local fallback models.": `${t("video.errors.modelLoadFailed")} ${t("video.model.usingFallback")}`,
    };

    if (exactMessages[message]) return exactMessages[message];
    if (message.includes("MAINTENANCE_MODE") || message.toLowerCase().includes("under maintenance")) {
      return t("maintenance.errors.generationPaused");
    }
    if (message.includes("does not support image references")) return t("video.errors.unsupportedImageReference");
    if (message.includes("does not support video references")) return t("video.errors.unsupportedVideoReference");
    if (message.includes("does not support audio references")) return t("video.errors.unsupportedAudioReference");
    if (message.includes("Reference limit reached")) return t("video.drawer.referenceLimitReached");
    if (message.includes("Type limit reached")) return t("video.drawer.typeLimitReached");
    if (message.includes("Generated results cannot be used as references")) return t("video.drawer.generatedUnsupported");
    if (message.includes("PROMPT_TOO_LONG") || message.toLowerCase().includes("prompt is too long")) {
      return tf("video.errors.promptTooLong", { limit: VIDEO_PROMPT_FRONTEND_LIMIT });
    }

    return message;
  }, [error, modelError, t, tf, workspaceNotice]);

  const generateButtonLabel = useMemo(() => {
    if (isUploadingMedia) return t("video.actions.uploadingMedia");
    if (isProcessing) return t("video.status.processing");
    if (!token && !isSignedIn) return t("video.errors.signInRequired");
    if (!hasEnoughCredits) return t("video.credits.notEnough");
    return tf("video.actions.generateWithCredits", { credits: estimatedCredits });
  }, [estimatedCredits, hasEnoughCredits, isProcessing, isSignedIn, isUploadingMedia, t, tf, token]);
  const generateButtonHelper = useMemo(() => {
    if (!hasPromptForGenerate) return t("video.errors.promptRequired");
    if (isUploadingMedia) return t("video.errors.mediaUploading");
    if (isProcessing) return concurrencyLimitNotice;
    if (!token && !isSignedIn) return t("video.errors.signInRequired");
    if (!hasEnoughCredits) return t("video.credits.notEnough");
    if (isPromptTooLong) return tf("video.errors.promptTooLong", { limit: VIDEO_PROMPT_FRONTEND_LIMIT });
    return t("video.credits.beforeSubmit");
  }, [concurrencyLimitNotice, hasEnoughCredits, hasPromptForGenerate, isProcessing, isPromptTooLong, isSignedIn, isUploadingMedia, t, tf, token]);

  const handleGenerateRemakeShot = useCallback(
    async (shot: RemakeShot, queueMeta?: RemakeShotQueueMeta) => {
      const shotKey = getRemakeShotGenerationKey(remakeStoryboard?.id, shot);
      const previousGeneration = remakeShotGenerationsRef.current[shotKey];
      const isRetry = Boolean(queueMeta?.retry) || (!queueMeta && (previousGeneration?.status === "failed" || previousGeneration?.status === "success"));
      const retryAttempt = queueMeta?.retryAttempt || (isRetry ? getNextRemakeRetryAttempt(previousGeneration) : undefined);
      const retryOfTaskId = queueMeta?.retryOfTaskId || (isRetry ? previousGeneration?.taskId || previousGeneration?.retryOfTaskId || "" : "");
      const retryOfShotKey = queueMeta?.retryOfShotKey || (isRetry ? shotKey : "");
      const retryQueueRunId = queueMeta?.retryQueueRunId || (isRetry ? createRemakeRetryQueueRunId() : "");
      const queueGenerationMeta = queueMeta?.queueRunId
        ? {
            queueIndex: queueMeta.queueIndex,
            queueMode: queueMeta.queueMode || "serial",
            queueRunId: queueMeta.queueRunId,
            queueTotal: queueMeta.queueTotal,
          }
        : {};
      const retryGenerationMeta = isRetry
        ? {
            retryAttempt,
            retryOfShotKey,
            retryOfTaskId,
            retryQueueRunId,
          }
        : {};
      const shotGenerationMeta = {
        ...queueGenerationMeta,
        ...retryGenerationMeta,
      };
      setWorkspaceNotice("");

      const failShot = (message: string) => {
        setRemakeShotGenerations((current) => ({
          ...current,
          [shotKey]: {
            ...(current[shotKey] || { status: "idle" }),
            ...shotGenerationMeta,
            error: message,
            status: "failed",
            updatedAt: Date.now(),
          },
        }));
      };

      const shotPrompt = buildRemakeShotPrompt(shot);
      if (!shotPrompt) {
        failShot(t("video.errors.promptRequired"));
        return;
      }

      const shotModel = findRemakeShotModel(shot, models, selectedModel);
      if (!shotModel) {
        const message = t("video.errors.retryModelUnavailable");
        setWorkspaceNotice(message);
        failShot(message);
        return;
      }

      if (isUploadingMedia) {
        setWorkspaceNotice(t("video.errors.mediaUploading"));
        failShot(t("video.errors.mediaUploading"));
        return;
      }

      if (isProcessing) {
        setWorkspaceNotice(concurrencyLimitNotice);
        failShot(concurrencyLimitNotice);
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
      const shotModelRule = getVideoModelRule(getVideoModelRuleId(shotModel));
      const remoteKeyframes = getRemoteRemakeKeyframes(shot);
      if (remoteKeyframes.length && !shotModelRule.supportsImageReference) {
        const message = t("video.errors.unsupportedImageReference");
        setWorkspaceNotice(message);
        failShot(message);
        return;
      }

      const shotReferenceMedia = buildRemakeShotReferenceMedia(shot, shotModel);
      const referenceIssue = validateReferenceSelectionForRule(shotModelRule, [], shotReferenceMedia);
      const roleIssue = shotReferenceMedia
        .map((item) => getReferenceRoleIssue(shotModelRule, item.type, item.role || "reference"))
        .find(Boolean);
      if (referenceIssue || roleIssue) {
        const message = referenceIssue || roleIssue || t("video.errors.remoteMediaOnly");
        setWorkspaceNotice(message);
        failShot(message);
        return;
      }

      const shotParams = buildParamsForModel(shotModel, {
        duration: shot.generationParams.duration,
        generateAudio: effectiveGenerateAudio,
        quality: shot.generationParams.quality,
        ratio: shot.generationParams.ratio,
      });

      setRemakeShotGenerations((current) => ({
        ...current,
        [shotKey]: {
          error: "",
          outputUrl: "",
          ...shotGenerationMeta,
          startedAt,
          status: "generating",
          updatedAt: startedAt,
        },
      }));

      let submitFailureMessage = "";
      const nextTask = await submit({
        prompt: shotPrompt,
        model: shotModel,
        duration: shotParams.duration,
        ratio: shotParams.ratio,
        quality: shotParams.quality,
        generateAudio: shotParams.generateAudio,
        media: shotReferenceMedia,
        mentionBindings: [],
        maxConcurrency,
        onSubmitError: (message) => {
          submitFailureMessage = message;
        },
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
          selectedModelId: shotModel.id,
          selectedModelLabel: shotModel.label,
          selectedProviderModel: shotModel.providerModel || "",
          keyframeCount: shotReferenceMedia.length,
          ...(queueMeta?.queueRunId
            ? {
                queueRunId: queueMeta.queueRunId,
                queueIndex: queueMeta.queueIndex,
                queueTotal: queueMeta.queueTotal,
                queueMode: queueMeta.queueMode || "serial",
              }
            : {}),
          ...(isRetry
            ? {
                retry: true,
                retryAttempt,
                retryOfTaskId,
                retryOfShotKey,
                retryQueueRunId,
              }
            : {}),
          remakeTargetRegion,
          remakeCharacterRules,
          remakeSceneStyle,
          remakeTranslateDialogue,
          sourceVideoName: remakeSourceVideo?.name || remakeStoryboard?.sourceTitle || "",
        },
      });

      if (!nextTask) {
        const message = submitFailureMessage || t("video.errors.generationRequestFailed");
        setWorkspaceNotice(message);
        failShot(message);
        return;
      }

      setRemakeShotGenerations((current) => ({
        ...current,
        [shotKey]: {
          ...(current[shotKey] || {}),
          error: "",
          outputUrl: "",
          ...shotGenerationMeta,
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
      concurrencyLimitNotice,
      isProcessing,
      isSignedIn,
      isUploadingMedia,
      maxConcurrency,
      effectiveGenerateAudio,
      models,
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

  const remakeHistoryShotMap = useMemo(
    () => buildRemakeHistoryShotMap(task ? [task, ...history] : history, remakeStoryboard),
    [history, remakeStoryboard, task],
  );

  useEffect(() => {
    if (!Object.keys(remakeHistoryShotMap).length) return;

    const timer = window.setTimeout(() => {
      setRemakeShotGenerations((current) => {
        let changed = false;
        const next = { ...current };

        Object.entries(remakeHistoryShotMap).forEach(([shotKey, restoredGeneration]) => {
          if (!shouldApplyRemakeHistoryGeneration(current[shotKey], restoredGeneration)) return;
          next[shotKey] = {
            ...(current[shotKey] || {}),
            ...restoredGeneration,
          };
          changed = true;
        });

        return changed ? next : current;
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [remakeHistoryShotMap]);

  useEffect(() => {
    if (!remakeStoryboard || remakeShotQueue.status !== "paused" || !remakeShotQueue.wasInterruptedFromDraft || !remakeShotQueue.activeShotKey) return;

    const shotKey = remakeShotQueue.activeShotKey;
    const generation = remakeShotGenerations[shotKey];
    const jobId = generation?.taskId || "";
    if (!jobId) return;
    if (generation?.status === "success" || generation?.status === "failed") return;

    const recoveryKey = `${shotKey}:${jobId}`;
    if (remakeActiveRecoveryRef.current === recoveryKey) return;
    remakeActiveRecoveryRef.current = recoveryKey;

    let cancelled = false;
    setRemakeActiveShotRecovery({
      jobId,
      shotKey,
      status: "checking",
    });
    setWorkspaceNotice(t("video.remake.recoveringActiveShot"));
    setRemakeShotGenerations((current) => {
      const currentGeneration = current[shotKey];
      if (!currentGeneration || currentGeneration.status === "success" || currentGeneration.status === "failed") return current;
      return {
        ...current,
        [shotKey]: {
          ...currentGeneration,
          error: "",
          status: "generating",
          updatedAt: Date.now(),
        },
      };
    });

    void getVideoStatus(jobId, true)
      .then((response) => {
        if (cancelled) return;
        const latestGeneration = remakeShotGenerationsRef.current[shotKey];
        if (latestGeneration?.status === "success" || latestGeneration?.status === "failed") return;

        const result = response.data || {};
        const status = String(result.status || "").toLowerCase();
        const outputUrl = getVideoStatusOutputUrl(result);

        if (outputUrl || status === "completed" || status === "success" || status === "succeeded" || status === "done") {
          setRemakeShotGenerations((current) => {
            const currentGeneration = current[shotKey];
            if (!currentGeneration || currentGeneration.status === "success") return current;
            return {
              ...current,
              [shotKey]: {
                ...currentGeneration,
                error: "",
                outputUrl,
                status: "success",
                taskId: jobId,
                updatedAt: Date.now(),
              },
            };
          });
          setRemakeActiveShotRecovery({
            jobId,
            shotKey,
            status: "completed",
          });
          setRemakeShotQueue((current) =>
            current.activeShotKey === shotKey
              ? {
                  ...current,
                  activeShotKey: undefined,
                  wasInterruptedFromDraft: true,
                }
              : current,
          );
          setWorkspaceNotice(t("video.remake.activeShotRecovered"));
          return;
        }

        if (isVideoFailedStatus(status)) {
          const message = getVideoStatusErrorMessage(result, t("video.remake.shotGenerationFailed"));
          setRemakeShotGenerations((current) => {
            const currentGeneration = current[shotKey];
            if (!currentGeneration || currentGeneration.status === "success") return current;
            return {
              ...current,
              [shotKey]: {
                ...currentGeneration,
                error: message,
                outputUrl: "",
                status: "failed",
                taskId: jobId,
                updatedAt: Date.now(),
              },
            };
          });
          setRemakeActiveShotRecovery({
            error: message,
            jobId,
            shotKey,
            status: "failed",
          });
          setRemakeShotQueue((current) =>
            current.activeShotKey === shotKey
              ? {
                  ...current,
                  activeShotKey: undefined,
                  pausedShotKey: shotKey,
                  wasInterruptedFromDraft: false,
                }
              : current,
          );
          setWorkspaceNotice(`${t("video.remake.activeShotFailed")} ${message}`);
          return;
        }

        setRemakeActiveShotRecovery({
          jobId,
          shotKey,
          status: "processing",
        });
        setRemakeShotGenerations((current) => {
          const currentGeneration = current[shotKey];
          if (!currentGeneration || currentGeneration.status === "success" || currentGeneration.status === "failed") return current;
          return {
            ...current,
            [shotKey]: {
              ...currentGeneration,
              error: "",
              status: "generating",
              taskId: jobId,
              updatedAt: Date.now(),
            },
          };
        });
        setWorkspaceNotice(t("video.remake.activeShotStillProcessing"));
      })
      .catch((error) => {
        if (cancelled) return;
        const latestGeneration = remakeShotGenerationsRef.current[shotKey];
        if (latestGeneration?.status === "success" || latestGeneration?.status === "failed") return;

        const message = error instanceof Error ? error.message : t("video.errors.statusRefreshFailed");
        setRemakeActiveShotRecovery({
          error: message,
          jobId,
          shotKey,
          status: "failed",
        });
        setRemakeShotGenerations((current) => {
          const currentGeneration = current[shotKey];
          if (!currentGeneration || currentGeneration.status === "success" || currentGeneration.status === "failed") return current;
          return {
            ...current,
            [shotKey]: {
              ...currentGeneration,
              error: message,
              status: "failed",
              taskId: jobId,
              updatedAt: Date.now(),
            },
          };
        });
        setRemakeShotQueue((current) =>
          current.activeShotKey === shotKey
            ? {
                ...current,
                activeShotKey: undefined,
                pausedShotKey: shotKey,
                wasInterruptedFromDraft: false,
              }
            : current,
        );
        setWorkspaceNotice(`${t("video.remake.activeShotFailed")} ${message}`);
      });

    return () => {
      cancelled = true;
    };
  }, [remakeShotGenerations, remakeShotQueue, remakeStoryboard, t]);

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

  const remakeOutputsView = useMemo(
    () => buildRemakeOutputItems(task ? [task, ...history] : history, remakeStoryboard),
    [history, remakeStoryboard, task],
  );

  const remakeShots = useMemo(() => remakeStoryboard?.shots || [], [remakeStoryboard]);
  const unfinishedRemakeShots = useMemo(
    () =>
      remakeShots.filter((shot) => {
        const generation = displayedRemakeShotGenerations[getRemakeShotGenerationKey(remakeStoryboard?.id, shot)];
        return generation?.status !== "success" && generation?.status !== "skipped";
      }),
    [displayedRemakeShotGenerations, remakeShots, remakeStoryboard?.id],
  );
  const failedRemakeShots = useMemo(
    () =>
      remakeShots.filter((shot) => {
        const generation = displayedRemakeShotGenerations[getRemakeShotGenerationKey(remakeStoryboard?.id, shot)];
        return generation?.status === "failed";
      }),
    [displayedRemakeShotGenerations, remakeShots, remakeStoryboard?.id],
  );
  const isRemakeQueueActive = remakeShotQueue.status === "running" || remakeShotQueue.status === "paused";
  const isRemakeActiveRecoveryPending =
    remakeActiveShotRecovery?.status === "checking" || remakeActiveShotRecovery?.status === "processing";
  const canGenerateAllRemakeShots = Boolean(
    remakeStoryboard &&
      unfinishedRemakeShots.length > 0 &&
      !isProcessing &&
      !isSubmitting &&
      !isRemakeQueueActive &&
      !isRemakeAnalyzing &&
      !isRemakeSourceUploading &&
      (token || isSignedIn),
  );
  const canRetryAllFailedRemakeShots = Boolean(
    remakeStoryboard &&
      failedRemakeShots.length > 0 &&
      !isProcessing &&
      !isSubmitting &&
      remakeShotQueue.status !== "running" &&
      !isRemakeActiveRecoveryPending &&
      !isRemakeAnalyzing &&
      !isRemakeSourceUploading &&
      (token || isSignedIn),
  );
  const remakeQueueCompletedCount = useMemo(() => {
    if (!remakeShotQueue.queueRunId) return 0;

    return remakeShots.filter((shot) => {
      const generation = displayedRemakeShotGenerations[getRemakeShotGenerationKey(remakeStoryboard?.id, shot)];
      return generation?.queueRunId === remakeShotQueue.queueRunId && generation.status === "success";
    }).length;
  }, [displayedRemakeShotGenerations, remakeShotQueue.queueRunId, remakeShots, remakeStoryboard?.id]);
  const remakeQueueError = useMemo(() => {
    if (remakeShotQueue.status !== "paused" || !remakeShotQueue.pausedShotKey) return "";
    return displayedRemakeShotGenerations[remakeShotQueue.pausedShotKey]?.error || "";
  }, [displayedRemakeShotGenerations, remakeShotQueue.pausedShotKey, remakeShotQueue.status]);
  const remakeQueueOrderedShotKeys = useMemo(
    () => remakeShots.map((shot) => getRemakeShotGenerationKey(remakeStoryboard?.id, shot)),
    [remakeShots, remakeStoryboard?.id],
  );

  useEffect(() => {
    if (!remakeStoryboard || !remakeShotQueue.queueRunId || !remakeQueueOrderedShotKeys.length) {
      if (remakeQueueDraftSignatureRef.current) {
        clearRemakeShotQueueDraft();
        remakeQueueDraftSignatureRef.current = "";
      }
      return;
    }

    if (remakeShotQueue.status === "idle" || remakeShotQueue.status === "completed" || remakeShotQueue.status === "cancelled") {
      clearRemakeShotQueueDraft();
      remakeQueueDraftSignatureRef.current = "";
      return;
    }

    const queueShotStates = remakeQueueOrderedShotKeys.reduce<Record<string, RemakeShotGenerationState | undefined>>((next, key) => {
      const state = displayedRemakeShotGenerations[key] || remakeShotGenerations[key];
      if (!state) return next;
      if (state.queueRunId && state.queueRunId !== remakeShotQueue.queueRunId) return next;
      next[key] = {
        ...state,
        queueRunId: state.queueRunId || remakeShotQueue.queueRunId,
        queueTotal: state.queueTotal || remakeShotQueue.queueTotal || remakeQueueOrderedShotKeys.length,
      };
      return next;
    }, {});
    const signature = JSON.stringify({
      activeShotKey: remakeShotQueue.activeShotKey || "",
      analysisId: remakeStoryboard.id,
      ignoredShotKeys: remakeShotQueue.ignoredShotKeys,
      orderedShotKeys: remakeQueueOrderedShotKeys,
      pausedShotKey: remakeShotQueue.pausedShotKey || "",
      queueIntent: remakeShotQueue.queueIntent,
      queueRunId: remakeShotQueue.queueRunId,
      queueTotal: remakeShotQueue.queueTotal,
      shotStates: queueShotStates,
      status: remakeShotQueue.status,
      userKeyHash: remakeQueueUserKeyHash,
    });

    if (signature === remakeQueueDraftSignatureRef.current) return;
    remakeQueueDraftSignatureRef.current = signature;

    saveRemakeShotQueueDraft({
      activeShotKey: remakeShotQueue.activeShotKey,
      analysisId: remakeStoryboard.id,
      ignoredShotKeys: remakeShotQueue.ignoredShotKeys,
      orderedShotKeys: remakeQueueOrderedShotKeys,
      pausedShotKey: remakeShotQueue.pausedShotKey,
      queueIntent: remakeShotQueue.queueIntent,
      queueRunId: remakeShotQueue.queueRunId,
      queueTotal: remakeShotQueue.queueTotal || remakeQueueOrderedShotKeys.length,
      shotStates: queueShotStates,
      status: remakeShotQueue.status,
      userKeyHash: remakeQueueUserKeyHash,
    });
  }, [
    displayedRemakeShotGenerations,
    remakeQueueOrderedShotKeys,
    remakeQueueUserKeyHash,
    remakeShotGenerations,
    remakeShotQueue,
    remakeStoryboard,
  ]);

  const handleGenerateAllRemakeShots = useCallback(() => {
    if (!remakeStoryboard || !unfinishedRemakeShots.length) return;

    if (!canGenerateAllRemakeShots) {
      setWorkspaceNotice(concurrencyLimitNotice);
      return;
    }

    const queueRunId = createRemakeShotQueueRunId();
    const queueTotal = unfinishedRemakeShots.length;
    const now = Date.now();

    setRemakeShotQueue({
      ignoredShotKeys: [],
      queueIntent: "generate_all",
      queueRunId,
      queueTotal,
      status: "running",
    });
    setRemakeShotGenerations((current) => {
      const next = { ...current };
      unfinishedRemakeShots.forEach((shot, index) => {
        const shotKey = getRemakeShotGenerationKey(remakeStoryboard.id, shot);
        next[shotKey] = {
          ...(next[shotKey] || {}),
          error: "",
          outputUrl: "",
          queueIndex: index + 1,
          queueMode: "serial",
          queueRunId,
          queueTotal,
          status: "queued",
          updatedAt: now,
        };
      });
      return next;
    });
    setWorkspaceNotice(t("video.remake.queueRunning"));
  }, [canGenerateAllRemakeShots, concurrencyLimitNotice, remakeStoryboard, t, unfinishedRemakeShots]);

  const handleRetryAllFailedRemakeShots = useCallback(() => {
    if (!remakeStoryboard) return;

    if (!failedRemakeShots.length) {
      setWorkspaceNotice(t("video.remake.noFailedShots"));
      return;
    }

    if (!canRetryAllFailedRemakeShots) {
      setWorkspaceNotice(concurrencyLimitNotice);
      return;
    }

    const queueRunId = createRemakeRetryQueueRunId();
    const queueTotal = failedRemakeShots.length;
    const now = Date.now();

    setRemakeShotQueue({
      ignoredShotKeys: [],
      queueIntent: "retry_failed",
      queueRunId,
      queueTotal,
      status: "running",
    });
    setRemakeShotGenerations((current) => {
      const next = { ...current };
      failedRemakeShots.forEach((shot, index) => {
        const shotKey = getRemakeShotGenerationKey(remakeStoryboard.id, shot);
        const previous = displayedRemakeShotGenerations[shotKey] || next[shotKey];
        next[shotKey] = {
          ...(previous || {}),
          error: "",
          outputUrl: "",
          queueIndex: index + 1,
          queueMode: "retry_serial",
          queueRunId,
          queueTotal,
          retryAttempt: getNextRemakeRetryAttempt(previous),
          retryOfShotKey: shotKey,
          retryOfTaskId: previous?.taskId || previous?.retryOfTaskId || "",
          retryQueueRunId: queueRunId,
          status: "queued",
          updatedAt: now,
        };
      });
      return next;
    });
    setWorkspaceNotice(t("video.remake.retryingFailedShots"));
  }, [canRetryAllFailedRemakeShots, concurrencyLimitNotice, displayedRemakeShotGenerations, failedRemakeShots, remakeStoryboard, t]);

  const handleCancelRemakeQueue = useCallback(() => {
    const cancelledRunId = remakeShotQueue.queueRunId;
    clearRemakeShotQueueDraft();
    remakeQueueDraftSignatureRef.current = "";

    setRemakeShotQueue((current) => ({
      ...current,
      activeShotKey: undefined,
      pausedShotKey: undefined,
      status: "cancelled",
      wasInterruptedFromDraft: false,
    }));
    setRemakeShotGenerations((current) => {
      if (!cancelledRunId) return current;
      let changed = false;
      const next = { ...current };

      Object.entries(next).forEach(([key, generation]) => {
        if (generation.queueRunId !== cancelledRunId || generation.status !== "queued") return;
        changed = true;
        next[key] = {
          ...generation,
          status: "idle",
          updatedAt: Date.now(),
        };
      });

      return changed ? next : current;
    });
    setWorkspaceNotice(t("video.remake.queueCancelled"));
  }, [remakeShotQueue.queueRunId, t]);

  const handleContinueRemakeQueue = useCallback(() => {
    if (
      remakeActiveShotRecovery &&
      (remakeActiveShotRecovery.status === "checking" || remakeActiveShotRecovery.status === "processing") &&
      remakeActiveShotRecovery.shotKey === remakeShotQueue.activeShotKey
    ) {
      setWorkspaceNotice(t("video.remake.activeShotStillProcessing"));
      return;
    }

    setRemakeShotQueue((current) => {
      if (current.status !== "paused") return current;
      const interruptedActiveShotKey = current.wasInterruptedFromDraft ? current.activeShotKey : undefined;
      const ignoredShotKeys = current.pausedShotKey || interruptedActiveShotKey
        ? Array.from(new Set([...current.ignoredShotKeys, current.pausedShotKey, interruptedActiveShotKey].filter(Boolean) as string[]))
        : current.ignoredShotKeys;

      return {
        ...current,
        activeShotKey: undefined,
        ignoredShotKeys,
        pausedShotKey: undefined,
        status: "running",
        wasInterruptedFromDraft: false,
      };
    });
    setWorkspaceNotice(
      remakeShotQueue.queueIntent === "retry_failed" || remakeShotQueue.queueIntent === "retry_single"
        ? t("video.remake.retryingFailedShots")
        : t("video.remake.queueRunning"),
    );
  }, [remakeActiveShotRecovery, remakeShotQueue.activeShotKey, remakeShotQueue.queueIntent, t]);

  const handleSkipFailedRemakeShot = useCallback(() => {
    const failedShotKey = remakeShotQueue.pausedShotKey;
    if (!failedShotKey) return;

    setRemakeShotGenerations((current) => ({
      ...current,
      [failedShotKey]: {
        ...(current[failedShotKey] || { status: "idle" }),
        error: "",
        status: "skipped",
        updatedAt: Date.now(),
      },
    }));
    setRemakeShotQueue((current) => ({
      ...current,
      activeShotKey: undefined,
      ignoredShotKeys: Array.from(new Set([...current.ignoredShotKeys, failedShotKey])),
      pausedShotKey: undefined,
      status: "running",
      wasInterruptedFromDraft: false,
    }));
    setWorkspaceNotice(
      remakeShotQueue.queueIntent === "retry_failed" || remakeShotQueue.queueIntent === "retry_single"
        ? t("video.remake.retryingFailedShots")
        : t("video.remake.queueRunning"),
    );
  }, [remakeShotQueue.pausedShotKey, remakeShotQueue.queueIntent, t]);

  useEffect(() => {
    if (remakeShotQueue.status !== "running" || !remakeStoryboard) return;
    if (remakeShotQueueSubmittingRef.current || isSubmitting || isProcessing) return;

    const ignoredShotKeys = new Set(remakeShotQueue.ignoredShotKeys);
    const queueRunId = remakeShotQueue.queueRunId;
    const isRetryQueue = remakeShotQueue.queueIntent === "retry_failed" || remakeShotQueue.queueIntent === "retry_single";
    const queueShots = remakeStoryboard.shots.map((shot) => {
      const key = getRemakeShotGenerationKey(remakeStoryboard.id, shot);
      return {
        generation: displayedRemakeShotGenerations[key],
        key,
        shot,
      };
    });

    if (queueShots.some((item) => item.generation?.queueRunId === queueRunId && item.generation.status === "generating")) {
      return;
    }

    const failedShot = queueShots.find(
      (item) => item.generation?.queueRunId === queueRunId && item.generation.status === "failed" && !ignoredShotKeys.has(item.key),
    );

    if (failedShot) {
      const timer = window.setTimeout(() => {
        setRemakeShotQueue((current) =>
          current.queueRunId === queueRunId
            ? {
                ...current,
                activeShotKey: undefined,
                pausedShotKey: failedShot.key,
                status: "paused",
                wasInterruptedFromDraft: false,
              }
            : current,
        );
        const message = failedShot.generation?.error
          ? `${t("video.remake.queueFailedNotice")} ${failedShot.generation.error}`
          : t("video.remake.queueFailedNotice");
        setWorkspaceNotice(message);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    const nextShot = queueShots.find((item) => {
      if (ignoredShotKeys.has(item.key)) return false;
      if (item.generation?.queueRunId !== queueRunId) return false;
      return item.generation.status === "queued" || item.generation.status === "idle";
    });

    if (!nextShot) {
      const timer = window.setTimeout(() => {
        setRemakeShotQueue((current) =>
          current.queueRunId === queueRunId
            ? {
                ...current,
                activeShotKey: undefined,
                pausedShotKey: undefined,
                status: "completed",
                wasInterruptedFromDraft: false,
              }
            : current,
        );
        setWorkspaceNotice(t("video.remake.queueCompleted"));
      }, 0);

      return () => window.clearTimeout(timer);
    }

    const queueIndex = nextShot.generation?.queueIndex || 1;
    const queueTotal = nextShot.generation?.queueTotal || remakeShotQueue.queueTotal || 1;
    const queueMode: RemakeShotQueueMode = isRetryQueue ? "retry_serial" : "serial";

    let started = false;
    remakeShotQueueSubmittingRef.current = true;

    const timer = window.setTimeout(() => {
      started = true;
      setRemakeShotQueue((current) =>
        current.queueRunId === queueRunId
          ? {
              ...current,
              activeShotKey: nextShot.key,
            }
          : current,
      );

      void handleGenerateRemakeShot(nextShot.shot, {
        queueIndex,
        queueMode,
        queueRunId,
        queueTotal,
        ...(isRetryQueue
          ? {
              retry: true,
              retryAttempt: nextShot.generation?.retryAttempt || 1,
              retryOfShotKey: nextShot.generation?.retryOfShotKey || nextShot.key,
              retryOfTaskId: nextShot.generation?.retryOfTaskId || nextShot.generation?.taskId || "",
              retryQueueRunId: nextShot.generation?.retryQueueRunId || queueRunId,
            }
          : {}),
      }).finally(() => {
        remakeShotQueueSubmittingRef.current = false;
      });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      if (!started) remakeShotQueueSubmittingRef.current = false;
    };
  }, [
    displayedRemakeShotGenerations,
    handleGenerateRemakeShot,
    isProcessing,
    isSubmitting,
    remakeShotQueue,
    remakeStoryboard,
    t,
  ]);

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
      setWorkspaceNotice(concurrencyLimitNotice);
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
      generateAudio: effectiveGenerateAudio,
      maxConcurrency,
      media,
      mentionBindings: reconciledMentionBindings,
    });
  }, [concurrencyLimitNotice, effectiveGenerateAudio, hasEnoughCredits, isProcessing, isSignedIn, isUploadingMedia, maxConcurrency, media, params, prompt, reconciledMentionBindings, selectedModel, submit, t, token]);

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
      if (!getReusableVideoOutputUrl(record)) return t("video.history.noReusableVideoUrl");
      return "";
    },
    [t],
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

      const draft = sendVideoResultToVideoDraft({ video: record }, t("video.notices.videoAddedToDraft"));
      if (!draft) {
        setWorkspaceNotice(t("video.history.noReusableVideoUrl"));
        return;
      }

      const draftModel = findDraftModel(draft, models) || selectedModel;
      const draftParams = buildParamsForModel(draftModel, draft.params);
      const nextSnapshot = {
        media: draft.referenceMedia,
        mentionBindings: draft.mentionBindings,
        params: draftParams,
        prompt: draft.prompt,
        selectedModel: draftModel,
      };

      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }
      latestDraftSnapshotRef.current = nextSnapshot;

      setWorkspaceMode("create");
      setSelectedModel(draftModel);
      setParams(draftParams);
      setMedia(draft.referenceMedia);
      setMentionBindings(draft.mentionBindings);
      setPrompt(draft.prompt);
      setWorkspaceNotice(t("video.notices.videoAddedToDraft"));
      router.push("/workspace/video?from=video-result");
    },
    [getGeneratedResultReferenceIssue, models, router, selectedModel, t],
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
    ? t("video.remake.analyzingSourceVideo")
    : isRemakeAnalyzing
      ? t("video.remake.analyzingSourceVideo")
      : t("video.remake.analyzeSourceVideo");

  return (
    <div className="se-scrollbar h-full min-h-0 space-y-4 overflow-y-auto overflow-x-hidden xl:grid xl:grid-cols-[minmax(340px,370px)_minmax(0,1fr)] xl:gap-4 xl:space-y-0 xl:overflow-hidden 2xl:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="se-panel flex min-h-0 flex-col overflow-hidden rounded-[30px]">
        <div className="shrink-0 border-b border-[rgba(244,244,244,0.08)] px-4 py-3.5">
          <div className="flex min-w-0 flex-wrap gap-x-2 gap-y-1 whitespace-nowrap text-[13px] font-semibold text-[#b9b9b9]/66">
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

        <div className="se-subtle-scrollbar grid min-h-0 min-w-0 flex-1 content-start gap-3.5 overflow-x-hidden overflow-y-auto p-3.5">
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
              onClearSourceVideo={handleClearRemakeSourceVideo}
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
              <div
                className={`grid gap-3.5 rounded-[24px] transition-[box-shadow,background-color] duration-500 ${
                  isPromptStudioImportHighlighted
                    ? "bg-[#ffb44d]/[.035] shadow-[0_0_0_1px_rgba(255,180,77,.34),0_0_36px_rgba(255,180,77,.18)]"
                    : ""
                }`}
                ref={promptStudioImportTargetRef}
              >
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
                {pendingPromptStudioDraft ? (
                  <div className="rounded-[20px] border border-[#ffb44d]/24 bg-[#ffb44d]/8 p-3 text-xs leading-5 text-[#ffd08a]/82">
                    <p className="font-black text-[#ffe0a3]">{isZh ? "检测到 Prompt Studio 草稿" : "Prompt Studio draft detected"}</p>
                    <p className="mt-1 text-[#ffd08a]/78">
                      {isZh
                        ? "是否导入这份草稿？导入后会填入提示词和参考图，但不会自动生成，也不会扣费。"
                        : "Import this draft into the workspace? It will fill the prompt and reference images, but will not generate or use credits."}
                    </p>
                    {getPromptStudioVideoReferences(pendingPromptStudioDraft).length > 0 ? (
                      <p className="mt-1 font-semibold text-[#ffe0a3]">
                        {isZh
                          ? `包含 ${getPromptStudioVideoReferences(pendingPromptStudioDraft).length} 张参考图`
                          : `Includes ${getPromptStudioVideoReferences(pendingPromptStudioDraft).length} reference image${getPromptStudioVideoReferences(pendingPromptStudioDraft).length === 1 ? "" : "s"}`}
                      </p>
                    ) : null}
                    {prompt.trim() || media.length ? (
                      <p className="mt-1 text-white/56">
                        {isZh ? "导入会覆盖当前未生成草稿。" : "Importing will replace the current unsaved draft."}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        className="rounded-full border border-[#ffb44d]/30 bg-[#ffb44d]/14 px-3 py-1.5 text-[11px] font-semibold text-[#ffe0a3] hover:bg-[#ffb44d]/20"
                        onClick={handleImportPromptStudioDraft}
                        type="button"
                      >
                        {isZh ? "导入草稿" : "Import draft"}
                      </button>
                      <button
                        className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-[11px] font-semibold text-white/62 hover:text-white"
                        onClick={handleIgnorePromptStudioDraft}
                        type="button"
                      >
                        {isZh ? "忽略" : "Ignore"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <button
                className="group flex min-h-10 items-center justify-between gap-3 rounded-[18px] border border-[#ffb44d]/18 bg-[#ffb44d]/8 px-3 py-2 text-left text-xs font-semibold text-[#ffd08a]/86 transition hover:border-[#ffcc86]/34 hover:bg-[#ffb44d]/12"
                onClick={handleOpenPromptStudio}
                type="button"
              >
                <span>{isZh ? "用 Prompt Studio 优化" : "Optimize in Prompt Studio"}</span>
                <span className="text-[#ffd08a]/50 transition group-hover:text-[#ffd08a]">↗</span>
              </button>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <button
                  className="se-control group flex min-h-[54px] items-center justify-between gap-3 rounded-[18px] px-3 py-2 text-left text-xs font-semibold text-[#f4f4f4]/78"
                  onClick={(event) => {
                    window.dispatchEvent(
                      new CustomEvent("shadowedge:open-video-mention-menu", {
                        detail: { anchorEl: event.currentTarget },
                      }),
                    );
                  }}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block leading-4">{t("video.prompt.elements")}</span>
                    <span className="mt-0.5 block truncate text-[11px] font-medium leading-4 text-[#b9b9b9]/52">
                      {t("video.prompt.tip")}
                    </span>
                  </span>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-[#ffb44d]/22 bg-[#ffb44d]/10 text-base font-black text-[#ffd08a] transition group-hover:border-[#ffcc86]/38 group-hover:bg-[#ffb44d]/16">
                    @
                  </span>
                </button>
                <AudioToggle
                  checked={effectiveGenerateAudio}
                  disabled={!isAudioSupported}
                  onChange={(checked) => setParams((current) => ({ ...current, generateAudio: checked }))}
                />
              </div>
              <ModelSelector models={models} onChange={handleModelChange} selectedModelId={selectedModel.id} />
              <VideoParamsPanel
                modelId={selectedModelRuleId}
                onChange={setParams}
                value={params}
              />
              {!token && !isSignedIn ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#ffb44d]/20 bg-[#ffb44d]/8 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#ffd08a]">{t("video.errors.signInRequired")}</p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-[#b9b9b9]/58">
                      {t("video.workspace.signInBody")}
                    </p>
                  </div>
                  <Link
                    className="se-button-secondary inline-flex min-h-8 shrink-0 items-center justify-center rounded-full px-3 text-[11px] font-semibold"
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
          <div className="shrink-0 border-t border-[rgba(244,244,244,0.08)] p-3.5">
            {visibleActiveTaskCount > 0 ? (
              <p className="mb-2 text-xs font-semibold text-[#b9b9b9]/64">{concurrencyLabel}</p>
            ) : null}
            <GenerateButton
              credits={estimatedCredits}
              disabled={!canGenerate}
              helperText={generateButtonHelper}
              isSubmitting={isSubmitting}
              label={generateButtonLabel}
              onClick={submitCurrent}
            />
          </div>
        )}
      </aside>

      <main className="flex min-h-[560px] min-w-0 flex-col overflow-hidden xl:min-h-0">
        {workspaceMode === "remake" ? (
          <RemakeStoryboardPanel
            analysisNotice={remakeAnalysisNotice}
            canGenerateAllShots={canGenerateAllRemakeShots}
            canRetryAllFailedShots={canRetryAllFailedRemakeShots}
            disableGenerationActions={Boolean(isRemakeActiveRecoveryPending)}
            draftNotice={isRemakeDraftRestored ? t("video.remake.restoredDraft") : ""}
            hasSourceVideo={Boolean(remakeSourceVideo)}
            isAnalyzing={isRemakeAnalyzing || isRemakeSourceUploading}
            metadata={remakeAnalysisMeta || undefined}
            onCancelQueue={handleCancelRemakeQueue}
            onClearDraft={handleClearRemakeDraft}
            onContinueQueue={handleContinueRemakeQueue}
            onGenerateAllShots={handleGenerateAllRemakeShots}
            onGenerateShot={handleGenerateRemakeShot}
            onRetryAllFailedShots={handleRetryAllFailedRemakeShots}
            onSkipFailedShot={handleSkipFailedRemakeShot}
            outputs={remakeOutputsView.items}
            outputsScope={remakeOutputsView.scope}
            queueCompletedCount={remakeQueueCompletedCount}
            queueError={remakeQueueError}
            queueIntent={remakeShotQueue.queueIntent}
            queueStatus={remakeShotQueue.status}
            queueTotal={remakeShotQueue.queueTotal}
            queueWasInterrupted={Boolean(remakeShotQueue.wasInterruptedFromDraft)}
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
            <div className="se-segmented mb-3 flex flex-none gap-2 rounded-[24px] p-1.5">
              {([
                { key: "history", label: t("video.main.history") },
                { key: "guide", label: t("video.main.howItWorks") },
              ] as const).map((item) => (
                <button
                  className={`se-segmented-item min-h-10 rounded-[18px] px-4 text-xs font-semibold ${mainPanel === item.key ? "se-segmented-item-active" : ""}`}
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
