import { apiRequest } from "@/lib/api";
import type { ApiEnvelope } from "@/types/api";
import type { VideoGenerationRequest, VideoModel, VideoStatusResponse } from "@/types/video";

type RawModel = Record<string, unknown>;

function buildDurationArray(config: unknown) {
  const item = (config || {}) as { values?: unknown[]; min?: number; max?: number };
  if (Array.isArray(item.values)) return item.values.map(Number).filter(Number.isFinite);
  const min = Number(item.min || 1);
  const max = Number(item.max || 15);
  return Array.from({ length: Math.max(0, max - min + 1) }, (_, index) => min + index);
}

export function normalizeVideoModel(model: RawModel): VideoModel {
  const durations = Array.isArray(model.durations)
    ? model.durations.map(Number).filter(Number.isFinite)
    : buildDurationArray(model.duration);
  const label = String(model.name || model.label || model.id || "Video Model")
    .replace(/\s*HF\s*$/i, "")
    .trim();

  return {
    id: String(model.id || label),
    label,
    provider: String(model.provider || "auto"),
    providerModel: String(model.providerModel || ""),
    desc: String(model.desc || model.type || model.mode || "Video generation"),
    credits: Number(model.credits || 0),
    creditBase: Number(model.creditBase || model.credits || 0),
    durations: durations.length ? durations : [5],
    durationDefault: Number((model.duration as { default?: number } | undefined)?.default || durations[0] || 5),
    ratios: Array.isArray(model.ratios) && model.ratios.length ? model.ratios.map(String) : ["16:9"],
    qualities: Array.isArray(model.resolutions)
      ? model.resolutions.map(String)
      : Array.isArray(model.qualities)
        ? model.qualities.map(String)
        : ["720p"],
    supportsAudio: Boolean(model.supportsAudio),
    uploadSlots: Array.isArray(model.uploadSlots) ? model.uploadSlots.map(String) : ["media"],
    raw: model,
  };
}

export async function getVideoModels() {
  const envelope = await apiRequest<{ models: RawModel[] }>("/api/video/models", {
    method: "GET",
  });
  return (envelope.data?.models || []).map(normalizeVideoModel);
}

export async function createVideoTask(request: VideoGenerationRequest) {
  return apiRequest<{
    jobId: string;
    providerJobId?: string;
    dbJobId?: string;
    status?: string;
    providerModel?: string;
    provider?: string;
    creditsBalance?: number;
  }>("/api/video/generate", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function getVideoStatus(jobId: string, force = false) {
  const params = new URLSearchParams({ jobId, t: String(Date.now()) });
  if (force) params.set("force", "1");
  return apiRequest<VideoStatusResponse>(`/api/video/status?${params.toString()}`, {
    method: "GET",
  });
}

export async function getVideoHistory(limit = 50): Promise<ApiEnvelope<{ items: unknown[] }>> {
  return apiRequest<{ items: unknown[] }>(`/api/video/history?limit=${limit}&t=${Date.now()}`, {
    method: "GET",
  });
}

export async function uploadMedia(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<{ url: string; type?: string; filename?: string; originalname?: string }>("/api/upload-media", {
    method: "POST",
    body: formData,
  });
}
