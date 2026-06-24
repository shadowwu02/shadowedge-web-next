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
