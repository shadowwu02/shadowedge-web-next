import { formatTime, isVideoActiveStatus, isVideoCompletedStatus, isVideoFailedStatus } from "@/lib/utils";
import type { VideoTaskRecord } from "@/types/video";

type HistoryRecordInput = Partial<VideoTaskRecord> & Record<string, unknown>;

export const VIDEO_LONG_RUNNING_THRESHOLD_MS = 8 * 60 * 1000;
export const VIDEO_ACTIVE_RESTORE_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export type SafeVideoHistoryView = {
  key: string;
  status: string;
  statusLabel: string;
  title: string;
  modelLabel: string;
  jobLabel: string;
  createdAt: string | number;
  createdAtLabel: string;
  duration: string;
  ratio: string;
  quality: string;
  outputUrl: string;
  thumbnailUrl: string;
  errorMessage: string;
  errorCode: string;
  refunded: boolean;
  refundStatus: string;
  refundNotice: string;
};

const inputMediaKeys = [
  "first_frame_image",
  "firstFrameImage",
  "last_frame_image",
  "lastFrameImage",
  "reference_images",
  "referenceImages",
  "reference_videos",
  "referenceVideos",
  "reference_audios",
  "referenceAudios",
  "mediaList",
  "assets",
  "upload_assets",
  "uploadAssets",
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function pickString(...values: unknown[]) {
  return values.find((value) => typeof value === "string" && value.trim()) as string | undefined;
}

function pickNumber(...values: unknown[]) {
  const numberValue = values.map((value) => Number(value)).find((value) => Number.isFinite(value) && value > 0);
  return numberValue;
}

function pickArray(...values: unknown[]) {
  const value = values.find(Array.isArray);
  return (value || []) as unknown[];
}

function isRenderableMediaUrl(url: string) {
  const value = String(url || "").trim();
  return /^https?:\/\//i.test(value) || /^blob:/i.test(value) || /^data:(video|image)\//i.test(value);
}

function firstRenderableUrl(...values: unknown[]) {
  return (
    values
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .map((value) => {
        if (typeof value === "string") return value;
        const record = asRecord(value);
        return pickString(record.url, record.videoUrl, record.video_url, record.outputUrl, record.output_url, record.thumbnailUrl);
      })
      .map((value) => String(value || "").trim())
      .find(isRenderableMediaUrl) || ""
  );
}

function getNestedOutputUrl(record: Record<string, unknown>) {
  const output = asRecord(record.output);
  const result = asRecord(record.result);
  const data = asRecord(record.data);
  const outputs = pickArray(record.outputs, output.urls, result.outputs, data.outputs);

  return firstRenderableUrl(
    record.videoUrl,
    record.video_url,
    record.outputUrl,
    record.output_url,
    record.resultUrl,
    record.result_url,
    record.url,
    record.outputUrls,
    record.output_urls,
    output.videoUrl,
    output.video_url,
    output.outputUrl,
    output.output_url,
    output.url,
    result.videoUrl,
    result.video_url,
    result.outputUrl,
    result.output_url,
    result.url,
    data.videoUrl,
    data.video_url,
    data.outputUrl,
    data.output_url,
    outputs,
  );
}

export function getSafeHistoryOutputUrl(record: unknown) {
  const raw = asRecord(record);
  const meta = asRecord(raw.meta);

  return getNestedOutputUrl(raw) || getNestedOutputUrl(meta);
}

export function getSafeHistoryThumbnailUrl(record: unknown) {
  const raw = asRecord(record);
  const meta = asRecord(raw.meta);

  return firstRenderableUrl(
    raw.thumbnailUrl,
    raw.thumbnail_url,
    raw.thumbnail,
    raw.previewUrl,
    raw.preview_url,
    meta.thumbnailUrl,
    meta.thumbnail_url,
    meta.thumbnail,
    meta.previewUrl,
    meta.preview_url,
  );
}

export function getVideoHistoryStableKey(record: unknown, fallback = "") {
  const raw = asRecord(record);
  const meta = asRecord(raw.meta);
  const explicitKey = pickString(
    raw.jobId,
    raw.job_id,
    raw.taskId,
    raw.task_id,
    raw.providerTaskId,
    raw.provider_task_id,
    raw.providerJobId,
    raw.provider_job_id,
    raw.dbJobId,
    raw.db_job_id,
    raw.id,
    meta.jobId,
    meta.job_id,
    meta.providerJobId,
    meta.provider_job_id,
  );
  if (explicitKey) return explicitKey;

  const createdAt = pickString(raw.createdAt, raw.created_at, meta.createdAt, meta.created_at) || String(pickNumber(raw.createdAt, meta.createdAt) || "");
  const outputUrl = getSafeHistoryOutputUrl(raw);
  if (createdAt && outputUrl) return `time:${createdAt}:${outputUrl}`;

  const prompt = pickString(raw.prompt, meta.original_prompt, meta.prompt);
  if (createdAt && prompt) return `time:${createdAt}:${prompt.slice(0, 48)}`;

  return fallback;
}

function hasInputMediaValue(value: unknown): boolean {
  if (!value) return false;
  if (typeof value === "string") return Boolean(value.trim());
  if (Array.isArray(value)) return value.some(hasInputMediaValue);
  const record = asRecord(value);
  return Object.keys(record).length > 0;
}

export function hasVideoHistoryInputMedia(record: unknown) {
  const raw = asRecord(record);
  const meta = asRecord(raw.meta);
  return inputMediaKeys.some((key) => hasInputMediaValue(raw[key]) || hasInputMediaValue(meta[key]));
}

function mergeMeta(serverRecord: HistoryRecordInput, localRecord: HistoryRecordInput) {
  const serverMeta = asRecord(serverRecord.meta);
  const localMeta = asRecord(localRecord.meta);
  const mergedMeta: Record<string, unknown> = {
    ...localMeta,
    ...serverMeta,
  };

  if (!serverMeta.mentionBindings && localMeta.mentionBindings) mergedMeta.mentionBindings = localMeta.mentionBindings;
  if (!serverMeta.mention_bindings && localMeta.mention_bindings) mergedMeta.mention_bindings = localMeta.mention_bindings;

  inputMediaKeys.forEach((key) => {
    if (!hasInputMediaValue(mergedMeta[key]) && hasInputMediaValue(localMeta[key])) {
      mergedMeta[key] = localMeta[key];
    }
  });

  return mergedMeta;
}

function copyIfMissing(target: Record<string, unknown>, source: Record<string, unknown>, keys: string[]) {
  keys.forEach((key) => {
    if (!hasInputMediaValue(target[key]) && hasInputMediaValue(source[key])) {
      target[key] = source[key];
    }
  });
}

export function mergeVideoHistoryRecord(serverRecord: VideoTaskRecord, localRecord?: VideoTaskRecord): VideoTaskRecord {
  if (!localRecord) return serverRecord;

  const serverRaw = serverRecord as HistoryRecordInput;
  const localRaw = localRecord as HistoryRecordInput;
  const merged: Record<string, unknown> = {
    ...localRaw,
    ...serverRaw,
    meta: mergeMeta(serverRaw, localRaw),
  };

  if (!hasVideoHistoryInputMedia(serverRaw) && hasVideoHistoryInputMedia(localRaw)) {
    copyIfMissing(merged, localRaw, inputMediaKeys);
  }

  copyIfMissing(merged, localRaw, ["prompt", "duration", "ratio", "quality", "mentionBindings", "mention_bindings"]);

  return merged as VideoTaskRecord;
}

export function getVideoHistoryTime(record: unknown) {
  const raw = asRecord(record);
  const meta = asRecord(raw.meta);
  const value = raw.updatedAt || raw.updated_at || raw.createdAt || raw.created_at || meta.updatedAt || meta.updated_at || meta.createdAt || meta.created_at || 0;
  const time = typeof value === "number" ? value : new Date(String(value || "")).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function getVideoTaskCreatedTime(record: unknown) {
  const raw = asRecord(record);
  const meta = asRecord(raw.meta);
  const value = raw.createdAt || raw.created_at || meta.createdAt || meta.created_at || raw.updatedAt || raw.updated_at || meta.updatedAt || meta.updated_at || 0;
  const time = typeof value === "number" ? value : new Date(String(value || "")).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function isVideoCompletedWithOutput(record: unknown) {
  const raw = asRecord(record);
  return isVideoCompletedStatus(String(raw.status || "")) && Boolean(getSafeHistoryOutputUrl(raw));
}

export function normalizeVideoPollingStatus(status: string | undefined | null, outputUrl = "") {
  const value = String(status || "").toLowerCase();
  if (outputUrl && (isVideoActiveStatus(value) || !value)) return "completed";
  if (isVideoCompletedStatus(value) && !outputUrl) return "finalizing";
  return value || "processing";
}

export function isVideoTerminalPollingRecord(record: unknown) {
  const raw = asRecord(record);
  const status = String(raw.status || "").toLowerCase();
  if (isVideoFailedStatus(status)) return true;
  if (getSafeHistoryOutputUrl(raw) && !isVideoActiveStatus(status)) return true;
  return isVideoCompletedStatus(status) && Boolean(getSafeHistoryOutputUrl(raw));
}

export function isVideoRecoverablePollingRecord(record: VideoTaskRecord) {
  if (!isVideoWithinActiveRestoreWindow(record)) return false;
  const outputUrl = getSafeHistoryOutputUrl(record);
  if (isVideoActiveStatus(record.status)) return Boolean(record.jobId || record.providerJobId || record.dbJobId);
  return isVideoCompletedStatus(record.status) && !outputUrl && Boolean(record.jobId || record.providerJobId || record.dbJobId);
}

export function isVideoWithinActiveRestoreWindow(record: unknown, maxAgeMs = VIDEO_ACTIVE_RESTORE_MAX_AGE_MS) {
  const createdAt = getVideoTaskCreatedTime(record);
  return Boolean(createdAt && Date.now() - createdAt <= maxAgeMs);
}

export function isVideoStaleActiveRecord(record: unknown, maxAgeMs = VIDEO_ACTIVE_RESTORE_MAX_AGE_MS) {
  const raw = asRecord(record);
  if (!isVideoActiveStatus(String(raw.status || ""))) return false;

  return !isVideoWithinActiveRestoreWindow(raw, maxAgeMs);
}

export function getVideoLongRunningMessage(record: unknown, thresholdMs = VIDEO_LONG_RUNNING_THRESHOLD_MS) {
  const raw = asRecord(record);
  const outputUrl = getSafeHistoryOutputUrl(raw);
  if (outputUrl || !isVideoActiveStatus(String(raw.status || ""))) return "";
  if (isVideoStaleActiveRecord(raw)) return "";

  const createdAt = getVideoTaskCreatedTime(raw);
  if (!createdAt || Date.now() - createdAt < thresholdMs) return "";

  return "This is taking longer than usual. You can keep this page open or check History later.";
}

export function selectRecoverableVideoPollingTask(records: VideoTaskRecord[]) {
  const record = records
    .filter(isVideoRecoverablePollingRecord)
    .sort((a, b) => getVideoHistoryTime(b) - getVideoHistoryTime(a))[0];

  if (!record) return null;

  const outputUrl = getSafeHistoryOutputUrl(record);
  return {
    ...record,
    status: normalizeVideoPollingStatus(record.status, outputUrl),
    videoUrl: outputUrl || record.videoUrl,
    outputUrl: outputUrl || record.outputUrl,
    outputUrls: outputUrl ? [outputUrl] : record.outputUrls,
  } satisfies VideoTaskRecord;
}

export function preferLatestVideoTask(current: VideoTaskRecord | null, candidate: VideoTaskRecord | null) {
  if (!candidate) return current;
  if (!current) return candidate;

  const currentKey = getVideoHistoryStableKey(current, "");
  const candidateKey = getVideoHistoryStableKey(candidate, "");
  const currentOutput = getSafeHistoryOutputUrl(current);
  const candidateOutput = getSafeHistoryOutputUrl(candidate);

  if (currentKey && currentKey === candidateKey) {
    const next = {
      ...current,
      ...candidate,
      videoUrl: candidateOutput || currentOutput || candidate.videoUrl || current.videoUrl,
      outputUrl: candidateOutput || currentOutput || candidate.outputUrl || current.outputUrl,
      outputUrls: candidateOutput ? [candidateOutput] : currentOutput ? [currentOutput] : candidate.outputUrls || current.outputUrls,
    };

    if (currentOutput && !candidateOutput && isVideoCompletedStatus(current.status)) {
      next.status = current.status;
      next.completedAt = current.completedAt || candidate.completedAt;
    }

    return next;
  }

  const currentActive = isVideoActiveStatus(current.status);
  const candidateActive = isVideoActiveStatus(candidate.status);
  const currentTime = getVideoHistoryTime(current);
  const candidateTime = getVideoHistoryTime(candidate);

  if (currentActive && (!candidateActive || candidateTime <= currentTime)) return current;
  if (currentOutput && isVideoCompletedStatus(current.status) && candidateTime <= currentTime) return current;

  return candidateTime >= currentTime ? candidate : current;
}

export type VideoHistoryStatusCounts = {
  active: number;
  failed: number;
};

export function getVideoHistoryStatusCounts(records: VideoTaskRecord[], currentTask?: VideoTaskRecord | null): VideoHistoryStatusCounts {
  const taskMap = new Map<string, VideoTaskRecord>();

  [...records, ...(currentTask ? [currentTask] : [])].forEach((record, index) => {
    const fallbackKey = `status:${index}`;
    const key = getVideoHistoryStableKey(record, fallbackKey) || fallbackKey;
    const currentRecord = taskMap.get(key) || null;
    taskMap.set(key, preferLatestVideoTask(currentRecord, record) || record);
  });

  const counts: VideoHistoryStatusCounts = { active: 0, failed: 0 };

  taskMap.forEach((record, key) => {
    const view = getSafeVideoHistoryView(record, key);
    if (isVideoActiveStatus(view.status) && !isVideoStaleActiveRecord(record)) {
      counts.active += 1;
      return;
    }

    if (isVideoFailedStatus(view.status)) {
      counts.failed += 1;
    }
  });

  return counts;
}

export function mergeVideoHistory(localHistory: VideoTaskRecord[], serverHistory: VideoTaskRecord[]) {
  const merged = new Map<string, VideoTaskRecord>();

  serverHistory.forEach((record, index) => {
    const key = getVideoHistoryStableKey(record, `server:${index}`);
    merged.set(key, record);
  });

  localHistory.forEach((record, index) => {
    const key = getVideoHistoryStableKey(record, `local:${index}`);
    const serverRecord = merged.get(key);
    merged.set(key, serverRecord ? mergeVideoHistoryRecord(serverRecord, record) : record);
  });

  return Array.from(merged.values()).sort((a, b) => getVideoHistoryTime(b) - getVideoHistoryTime(a));
}

function truncateText(value: string, maxLength = 220) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

export function getSafeVideoHistoryErrorMessage(record: unknown) {
  const raw = asRecord(record);
  const meta = asRecord(raw.meta);
  const rawMessage =
    pickString(
      raw.public_message,
      raw.publicMessage,
      raw.providerPublicMessage,
      raw.provider_public_message,
      raw.providerPublicMessageEn,
      raw.provider_public_message_en,
      meta.public_message,
      meta.publicMessage,
      meta.providerPublicMessage,
      meta.provider_public_message,
      meta.providerPublicMessageEn,
      meta.provider_public_message_en,
      raw.error_message,
      raw.errorMessage,
      meta.error_message,
      meta.errorMessage,
      raw.message,
      meta.message,
      raw.error,
      meta.error,
      raw.errorCode,
      raw.error_code,
      meta.errorCode,
      meta.error_code,
    ) || "Video generation failed. Please try again later or change the media.";

  return truncateText(rawMessage.split(/\r?\n/)[0] || rawMessage);
}

function getRefundNotice(record: unknown) {
  const raw = asRecord(record);
  const meta = asRecord(raw.meta);
  const refunded = raw.refunded ?? meta.refunded;
  const amount = pickNumber(raw.refund_amount, raw.refundAmount, meta.refund_amount, meta.refundAmount);
  if (!refunded && !amount) return "";
  return amount ? `Refunded ${amount} credits.` : "Credits were refunded for this failed task.";
}

function getRefundStatus(record: unknown) {
  const raw = asRecord(record);
  const meta = asRecord(raw.meta);
  return pickString(raw.refundStatus, raw.refund_status, meta.refundStatus, meta.refund_status) || "";
}

function isRefunded(record: unknown) {
  const raw = asRecord(record);
  const meta = asRecord(raw.meta);
  const refundStatus = getRefundStatus(record).toLowerCase();
  return Boolean(raw.refunded || meta.refunded || refundStatus.includes("refund"));
}

export function getSafeVideoHistoryView(record: VideoTaskRecord, fallbackKey = ""): SafeVideoHistoryView {
  const raw = record as HistoryRecordInput;
  const meta = asRecord(raw.meta);
  const outputUrl = getSafeHistoryOutputUrl(raw);
  const status = String(pickString(raw.status, meta.status) || (outputUrl ? "completed" : "unknown")).toLowerCase();
  const createdAt = pickString(raw.createdAt, raw.created_at, meta.createdAt, meta.created_at) || pickNumber(raw.createdAt, meta.createdAt) || "";
  const jobLabel = pickString(raw.jobId, raw.providerJobId, raw.dbJobId, meta.jobId, meta.providerJobId) || "--";

  return {
    key: getVideoHistoryStableKey(raw, fallbackKey || `${createdAt || "unknown"}-${jobLabel}`),
    status,
    statusLabel: status || "unknown",
    title: truncateText(pickString(raw.prompt, meta.original_prompt, meta.prompt) || "Untitled video", 180),
    modelLabel: truncateText(pickString(raw.model, raw.frontendModel, meta.frontend_model, meta.model) || "--", 80),
    jobLabel,
    createdAt: createdAt || Date.now(),
    createdAtLabel: formatTime(createdAt || undefined),
    duration: pickString(raw.duration, meta.duration) || "--",
    ratio: pickString(raw.ratio, raw.aspect_ratio, meta.ratio, meta.aspect_ratio) || "--",
    quality: pickString(raw.quality, raw.resolution, meta.quality, meta.resolution) || "--",
    outputUrl,
    thumbnailUrl: getSafeHistoryThumbnailUrl(raw),
    errorMessage: getSafeVideoHistoryErrorMessage(raw),
    errorCode: pickString(raw.errorCode, raw.error_code, meta.errorCode, meta.error_code) || "",
    refunded: isRefunded(raw),
    refundStatus: getRefundStatus(raw),
    refundNotice: getRefundNotice(raw),
  };
}
