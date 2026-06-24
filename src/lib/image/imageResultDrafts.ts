import { saveImageWorkspaceDraft } from "@/lib/image/imageWorkspaceDraft";
import type { ImageGenerationParams, ImageHistoryItem, ImageReferenceItem } from "@/types/image";

export const IMAGE_RESULT_DRAFT_NOTICE_KEY = "shadowedge_image_result_draft_notice_v1";

type ImageResultDraftInput = {
  image: ImageHistoryItem;
  outputIndex?: number;
  outputUrl?: string;
};

type ImageResultReferenceDraft = {
  prompt: string;
  modelId: string;
  params: ImageGenerationParams;
  reference: ImageReferenceItem;
};

type ImageFailedDraftInput = {
  image: ImageHistoryItem;
};

type ImageFailedDraft = {
  prompt: string;
  modelId: string;
  params: ImageGenerationParams;
  references: ImageReferenceItem[];
  missingReferences: boolean;
};

function safeLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function pickString(...values: unknown[]) {
  return values.find((value) => typeof value === "string" && value.trim()) as string | undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) return [value];
  if (value && typeof value === "object") return [value];
  return [];
}

function isUnsafeReferenceUrl(url: string) {
  const value = String(url || "").trim();
  if (!/^https?:\/\//i.test(value)) return true;
  if (/^(data|blob|file|javascript):/i.test(value)) return true;
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/i.test(value)) return true;

  try {
    const parsed = new URL(value);
    return ["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"].includes(parsed.hostname.toLowerCase());
  } catch {
    return true;
  }
}

function isUnsafeDraftReferenceUrl(url: string) {
  const value = String(url || "").trim();
  if (value.startsWith("/uploads/") || value.startsWith("/api/uploads/")) return false;
  return isUnsafeReferenceUrl(value);
}

function getReferenceUrl(value: unknown) {
  if (typeof value === "string") return value.trim();
  const record = asRecord(value);
  return pickString(
    record.url,
    record.imageUrl,
    record.image_url,
    record.publicUrl,
    record.public_url,
    record.fileUrl,
    record.file_url,
    record.remoteUrl,
    record.remote_url,
  ) || "";
}

function getNestedOutputUrls(value: unknown): string[] {
  const record = asRecord(value);
  const output = asRecord(record.output);
  const result = asRecord(record.result);
  const data = asRecord(record.data);
  const meta = asRecord(record.meta);
  const candidates = [
    record.outputUrl,
    record.output_url,
    record.imageUrl,
    record.image_url,
    record.resultUrl,
    record.result_url,
    record.url,
    record.outputUrls,
    record.output_urls,
    record.images,
    record.results,
    output.outputUrl,
    output.output_url,
    output.imageUrl,
    output.image_url,
    output.url,
    output.urls,
    result.outputUrl,
    result.output_url,
    result.imageUrl,
    result.image_url,
    result.url,
    result.outputUrls,
    result.output_urls,
    data.outputUrl,
    data.output_url,
    data.imageUrl,
    data.image_url,
    data.outputUrls,
    data.output_urls,
    meta.outputUrl,
    meta.output_url,
    meta.imageUrl,
    meta.image_url,
    meta.outputUrls,
    meta.output_urls,
  ];

  return candidates
    .flatMap((candidate) => (Array.isArray(candidate) ? candidate : [candidate]))
    .flatMap((candidate) => {
      if (typeof candidate === "string") return [candidate];
      const nested = asRecord(candidate);
      return [
        nested.url,
        nested.imageUrl,
        nested.image_url,
        nested.outputUrl,
        nested.output_url,
        nested.resultUrl,
        nested.result_url,
      ];
    })
    .map((candidate) => String(candidate || "").trim())
    .filter(Boolean);
}

function inferReferenceFileName(url: string, value: unknown, fallback: string) {
  const raw = asRecord(value);
  const explicitName = pickString(raw.name, raw.originalName, raw.original_name, raw.filename, raw.fileName);
  if (explicitName) return explicitName;

  try {
    const parsed = new URL(url, "https://shadowedge.local");
    const tail = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || "");
    if (tail) return tail;
  } catch {
    // Fall through to fallback name.
  }

  return fallback;
}

function inferFileName(url: string, image: ImageHistoryItem, outputIndex: number) {
  const raw = asRecord(image.raw);
  const meta = asRecord(image.meta);
  const explicitName = pickString(raw.fileName, raw.filename, raw.name, meta.fileName, meta.filename, meta.name);
  if (explicitName) return explicitName;

  try {
    const parsed = new URL(url);
    const tail = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || "");
    if (tail && tail.includes(".")) return tail;
  } catch {
    // Fall through to a stable generated filename.
  }

  const id = pickString(image.dbJobId, image.jobId, image.id) || "image-result";
  return `${String(id).replace(/[^\w.-]+/g, "-")}-${outputIndex + 1}.png`;
}

function createImageFailedReference(value: unknown, url: string, index: number): ImageReferenceItem {
  const fileName = inferReferenceFileName(url, value, `Recovered reference ${index + 1}.jpg`);

  return {
    id: `image-retry-reference:${index + 1}:${url}`,
    type: "image",
    source: "generated_result",
    name: fileName,
    url,
    previewUrl: url,
    filename: fileName,
    originalName: fileName,
    mimeType: "image/*",
    uploadStatus: "ready",
    uploadedAt: new Date().toISOString(),
  } as ImageReferenceItem;
}

function createImageResultReference(image: ImageHistoryItem, url: string, outputIndex: number): ImageReferenceItem {
  const jobId = pickString(image.dbJobId, image.jobId, image.id) || String(image.createdAt || "image-result");
  const fileName = inferFileName(url, image, outputIndex);

  return {
    id: `image-result:${String(jobId).replace(/[^\w.-]+/g, "-")}:${outputIndex + 1}`,
    type: "image",
    source: "generated_result",
    name: fileName || `Generated image ${outputIndex + 1}`,
    url,
    previewUrl: url,
    filename: fileName,
    originalName: fileName,
    mimeType: "image/*",
    uploadStatus: "ready",
    uploadedAt: new Date().toISOString(),
  } as ImageReferenceItem;
}

function normalizeParams(image: ImageHistoryItem): ImageGenerationParams {
  return {
    ratio: image.ratio || "auto",
    resolution: image.resolution || "",
    quality: image.quality || "",
    batchCount: Math.max(1, Number(image.batchCount || 1) || 1),
  };
}

function getImagePrompt(image: ImageHistoryItem) {
  const raw = asRecord(image.raw);
  const meta = asRecord(image.meta);
  return pickString(meta.original_prompt, meta.originalPrompt, raw.original_prompt, raw.originalPrompt, image.prompt, raw.prompt, meta.prompt) || "";
}

function getImageModelId(image: ImageHistoryItem) {
  const raw = asRecord(image.raw);
  const meta = asRecord(image.meta);
  return pickString(image.model, image.providerModel, raw.modelId, raw.model_id, raw.frontendModel, raw.frontend_model, meta.modelId, meta.model_id, meta.frontendModel, meta.frontend_model, meta.model) || "";
}

function collectImageFailedReferenceCandidates(image: ImageHistoryItem) {
  const raw = asRecord(image.raw);
  const meta = asRecord(image.meta);
  const uploadAssets = asRecord(raw.upload_assets || raw.uploadAssets || meta.upload_assets || meta.uploadAssets);
  const assets = asRecord(raw.assets || meta.assets);
  const mediaList = asArray(raw.mediaList || raw.media_list || meta.mediaList || meta.media_list || uploadAssets.media);

  return [
    ...asArray(raw.reference_images || raw.referenceImages || meta.reference_images || meta.referenceImages),
    ...asArray(uploadAssets.reference_images || uploadAssets.referenceImages || uploadAssets.images),
    ...asArray(assets.reference_images || assets.referenceImages || assets.images),
    ...mediaList.filter((item) => {
      const record = asRecord(item);
      const type = String(record.type || record.kind || record.mimeType || record.mime_type || "").toLowerCase();
      const url = getReferenceUrl(item).toLowerCase();
      return type.includes("image") || /\.(png|jpe?g|webp|gif|heic|heif)(\?|$)/i.test(url);
    }),
  ];
}

function collectImageFailedReferences(image: ImageHistoryItem) {
  const seen = new Set<string>();
  const candidates = collectImageFailedReferenceCandidates(image);

  return candidates
    .map((candidate, index) => {
      const url = getReferenceUrl(candidate);
      if (!url || isUnsafeDraftReferenceUrl(url) || seen.has(url)) return null;
      seen.add(url);
      return createImageFailedReference(candidate, url, index);
    })
    .filter((item): item is ImageReferenceItem => Boolean(item));
}

export function getReusableImageOutputUrl(image: ImageHistoryItem, outputUrl?: string) {
  const candidates = [outputUrl, image.outputUrl, ...(image.outputUrls || []), ...getNestedOutputUrls(image.raw), ...getNestedOutputUrls(image.meta)];
  const url = candidates.map((candidate) => String(candidate || "").trim()).find((candidate) => candidate && !isUnsafeReferenceUrl(candidate));
  return url || "";
}

export function buildImageDraftFromImageResult(input: ImageResultDraftInput): ImageResultReferenceDraft | null {
  const outputUrl = getReusableImageOutputUrl(input.image, input.outputUrl);
  if (!outputUrl) return null;

  return {
    prompt: input.image.prompt || "",
    modelId: input.image.model || input.image.providerModel || "",
    params: normalizeParams(input.image),
    reference: createImageResultReference(input.image, outputUrl, input.outputIndex || 0),
  };
}

export function buildImageDraftFromFailedJob(input: ImageFailedDraftInput): ImageFailedDraft {
  const references = collectImageFailedReferences(input.image);
  const referenceCount = Math.max(0, Number(input.image.referenceCount || 0) || 0);

  return {
    prompt: getImagePrompt(input.image),
    modelId: getImageModelId(input.image),
    params: normalizeParams(input.image),
    references,
    missingReferences: referenceCount > references.length,
  };
}

export function readImageResultDraftNotice() {
  const storage = safeLocalStorage();
  if (!storage) return "";

  try {
    const notice = storage.getItem(IMAGE_RESULT_DRAFT_NOTICE_KEY) || "";
    storage.removeItem(IMAGE_RESULT_DRAFT_NOTICE_KEY);
    return notice;
  } catch {
    return "";
  }
}

export function sendImageResultToImageDraft(input: ImageResultDraftInput, notice: string) {
  const draftInput = buildImageDraftFromImageResult(input);
  if (!draftInput) return null;

  const draft = saveImageWorkspaceDraft({
    prompt: draftInput.prompt,
    modelId: draftInput.modelId,
    params: draftInput.params,
    references: [draftInput.reference],
  });
  if (!draft.ok) return null;

  const storage = safeLocalStorage();
  if (storage && notice) {
    try {
      storage.setItem(IMAGE_RESULT_DRAFT_NOTICE_KEY, notice);
    } catch {
      // Ignore storage quota failures; the draft itself has already been saved.
    }
  }

  return draft;
}

export function sendImageFailedJobToImageDraft(input: ImageFailedDraftInput, notice: string) {
  const draftInput = buildImageDraftFromFailedJob(input);
  const draft = saveImageWorkspaceDraft({
    prompt: draftInput.prompt,
    modelId: draftInput.modelId,
    params: draftInput.params,
    references: draftInput.references,
  });
  if (!draft.ok) return null;

  const storage = safeLocalStorage();
  if (storage && notice) {
    try {
      storage.setItem(IMAGE_RESULT_DRAFT_NOTICE_KEY, notice);
    } catch {
      // Ignore storage quota failures; the draft itself has already been saved.
    }
  }

  return {
    ...draft,
    missingReferences: draftInput.missingReferences,
  };
}
