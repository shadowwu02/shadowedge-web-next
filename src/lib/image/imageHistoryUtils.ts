import type { ImageHistoryItem, ImageJobStatus, ImageJobStatusValue } from "@/types/image";

type RawRecord = Record<string, unknown>;

const activeStatuses = new Set(["created", "queued", "pending", "submitted", "submitting", "processing", "running", "generating"]);
const completedStatuses = new Set(["completed", "success", "succeeded", "done"]);
const failedStatuses = new Set(["failed", "error", "canceled", "cancelled"]);
const recoverableActiveJobMaxAgeMs = 2 * 60 * 60 * 1000;

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawRecord) : {};
}

function pickString(...values: unknown[]) {
  return values.find((value) => typeof value === "string" && value.trim()) as string | undefined;
}

function pickNumber(...values: unknown[]) {
  return values.map((value) => Number(value)).find((value) => Number.isFinite(value));
}

function pickArray(...values: unknown[]) {
  const array = values.find(Array.isArray);
  return (array || []) as unknown[];
}

function isRenderableImageUrl(url: string) {
  const value = String(url || "").trim();
  return /^https?:\/\//i.test(value) || /^blob:/i.test(value) || /^data:image\//i.test(value);
}

function firstRenderableUrl(...values: unknown[]) {
  return (
    values
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .map((value) => {
        if (typeof value === "string") return value;
        const record = asRecord(value);
        return pickString(record.url, record.imageUrl, record.image_url, record.outputUrl, record.output_url, record.resultUrl, record.result_url);
      })
      .map((value) => String(value || "").trim())
      .find(isRenderableImageUrl) || ""
  );
}

function getNestedOutputUrls(record: RawRecord) {
  const output = asRecord(record.output);
  const result = asRecord(record.result);
  const data = asRecord(record.data);
  const outputs = pickArray(record.outputs, output.outputs, result.outputs, data.outputs);
  const candidates = [
    record.outputUrls,
    record.output_urls,
    record.images,
    record.results,
    record.data,
    output.urls,
    result.outputUrls,
    result.output_urls,
    data.outputUrls,
    data.output_urls,
    outputs,
  ];
  const direct = firstRenderableUrl(
    record.outputUrl,
    record.output_url,
    record.imageUrl,
    record.image_url,
    record.resultUrl,
    record.result_url,
    record.url,
    output.outputUrl,
    output.output_url,
    output.imageUrl,
    output.image_url,
    output.url,
    result.outputUrl,
    result.output_url,
    result.imageUrl,
    result.image_url,
    result.url,
    data.outputUrl,
    data.output_url,
    data.imageUrl,
    data.image_url,
  );
  const nested = candidates.flatMap((value) => (Array.isArray(value) ? value : [value])).map((value) => firstRenderableUrl(value)).filter(Boolean);
  return Array.from(new Set([direct, ...nested].filter(Boolean)));
}

export function getImageOutputUrls(record: unknown) {
  const raw = asRecord(record);
  const meta = asRecord(raw.meta);
  return Array.from(new Set([...getNestedOutputUrls(raw), ...getNestedOutputUrls(meta)]));
}

export function normalizeImageStatusValue(status: unknown, outputUrl = ""): ImageJobStatusValue | string {
  const value = String(status || "").toLowerCase();
  if (outputUrl && (!value || activeStatuses.has(value))) return "completed";
  return value || "unknown";
}

export function isImageActiveStatus(status: unknown) {
  return activeStatuses.has(String(status || "").toLowerCase());
}

export function isImageCompletedStatus(status: unknown) {
  return completedStatuses.has(String(status || "").toLowerCase());
}

export function isImageFailedStatus(status: unknown) {
  return failedStatuses.has(String(status || "").toLowerCase());
}

export function isImageTerminalStatus(status: unknown) {
  return isImageCompletedStatus(status) || isImageFailedStatus(status);
}

export function getImageHistoryTime(record: unknown) {
  const raw = asRecord(record);
  const meta = asRecord(raw.meta);
  const value = raw.updatedAt || raw.updated_at || raw.createdAt || raw.created_at || meta.updatedAt || meta.updated_at || meta.createdAt || meta.created_at || 0;
  const time = typeof value === "number" ? value : new Date(String(value || "")).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function getImageHistoryStableKey(record: unknown, fallback = "") {
  const raw = asRecord(record);
  const meta = asRecord(raw.meta);
  return (
    pickString(raw.jobId, raw.job_id, raw.dbJobId, raw.db_job_id, raw.id, meta.jobId, meta.job_id, meta.dbJobId, meta.db_job_id) ||
    fallback
  );
}

export function normalizeImageHistoryItem(item: unknown): ImageHistoryItem {
  const raw = asRecord(item);
  const meta = asRecord(raw.meta);
  const outputUrls = getImageOutputUrls(raw);
  const jobId = pickString(raw.jobId, raw.job_id, raw.dbJobId, raw.db_job_id, raw.id) || "";
  const referenceImages = pickArray(raw.referenceImages, raw.reference_images, meta.referenceImages, meta.reference_images).map(String).filter(Boolean);
  const status = normalizeImageStatusValue(raw.status || meta.status, outputUrls[0]);
  const createdAt =
    pickString(raw.createdAt, raw.created_at, meta.createdAt, meta.created_at) ||
    pickNumber(raw.createdAt, raw.created_at, meta.createdAt, meta.created_at) ||
    "";

  return {
    id: pickString(raw.id, jobId) || jobId,
    jobId,
    dbJobId: pickString(raw.dbJobId, raw.db_job_id, raw.id, jobId) || jobId,
    status,
    prompt: pickString(raw.prompt, meta.prompt) || "",
    model: pickString(raw.model, meta.model) || "",
    provider: pickString(raw.provider, meta.provider) || "",
    providerModel: pickString(raw.providerModel, raw.provider_model, meta.providerModel, meta.provider_model) || "",
    outputUrls,
    outputUrl: outputUrls[0] || "",
    ratio: pickString(raw.ratio, raw.aspect_ratio, meta.ratio, meta.aspect_ratio) || "",
    resolution: pickString(raw.resolution, meta.resolution) || "",
    quality: pickString(raw.quality, meta.quality) || "",
    batchCount: Math.max(1, pickNumber(raw.batchCount, raw.batch_count, meta.batchCount, meta.batch_count, 1) || 1),
    referenceCount: Math.max(0, pickNumber(raw.referenceCount, raw.reference_count, meta.referenceCount, referenceImages.length, 0) || 0),
    cost: Math.max(0, pickNumber(raw.cost, raw.creditsCharged, meta.cost, meta.totalCost, 0) || 0),
    creditsCharged: Math.max(0, pickNumber(raw.creditsCharged, raw.cost, meta.cost, meta.totalCost, 0) || 0),
    errorMessage: pickString(raw.errorMessage, raw.error_message, raw.error, meta.providerPublicMessage, meta.provider_public_message, meta.errorMessage, meta.error_message, meta.error) || "",
    errorCode: pickString(raw.errorCode, raw.error_code, meta.errorCode, meta.error_code) || "",
    refunded: Boolean(raw.refunded || meta.refunded),
    refundStatus: pickString(raw.refundStatus, raw.refund_status, meta.refundStatus, meta.refund_status) || "none",
    meta,
    createdAt,
    updatedAt:
      pickString(raw.updatedAt, raw.updated_at, meta.updatedAt, meta.updated_at) ||
      pickNumber(raw.updatedAt, raw.updated_at, meta.updatedAt, meta.updated_at) ||
      createdAt,
    progress: typeof raw.progress === "number" ? raw.progress : null,
    raw: item,
    source: "server",
  };
}

export function mergeImageHistory(history: ImageHistoryItem[], localItems: ImageHistoryItem[] = []) {
  const merged = new Map<string, ImageHistoryItem>();
  [...localItems, ...history].forEach((item, index) => {
    const key = getImageHistoryStableKey(item, `image:${index}`);
    const existing = merged.get(key);
    if (!existing || getImageHistoryTime(item) >= getImageHistoryTime(existing)) {
      merged.set(key, item);
    }
  });

  return Array.from(merged.values()).sort((left, right) => getImageHistoryTime(right) - getImageHistoryTime(left));
}

export function selectRecoverableImageJob(history: ImageHistoryItem[]) {
  const now = Date.now();
  return history
    .filter((item) => {
      if (!isImageActiveStatus(item.status) || !Boolean(item.jobId || item.dbJobId)) return false;
      const updatedAt = getImageHistoryTime(item);
      return updatedAt > 0 && now - updatedAt <= recoverableActiveJobMaxAgeMs;
    })
    .sort((left, right) => getImageHistoryTime(right) - getImageHistoryTime(left))[0] || null;
}

export function mergeImageStatusIntoJob(base: ImageHistoryItem, status: ImageJobStatus): ImageHistoryItem {
  const normalized = normalizeImageHistoryItem({
    ...base,
    ...status,
    meta: {
      ...(base.meta || {}),
      ...(status.meta || {}),
    },
  });

  return {
    ...base,
    ...normalized,
    source: base.source || normalized.source,
  };
}
