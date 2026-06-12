"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildImageGenerateRequest, generateImage, getImageHistory, getImageModels, getImageStatus, uploadImage } from "@/lib/image-api";
import {
  isImageActiveStatus,
  isImageTerminalStatus,
  mergeImageHistory,
  mergeImageStatusIntoJob,
  normalizeImageHistoryItem,
  selectRecoverableImageJob,
} from "@/lib/image/imageHistoryUtils";
import {
  canAddImageReference,
  estimateImageCredits,
  getDefaultImageModel,
  getDefaultImageParams,
  getImageModelById,
  normalizeImageGenerationParams,
} from "@/lib/image/imageModelRules";
import type { ImageGenerationParams, ImageHistoryItem, ImageModel, ImageReferenceItem } from "@/types/image";

type UseImageGenerationOptions = {
  autoLoad?: boolean;
  pollingIntervalMs?: number;
};

type GenerateImageOptions = {
  prompt?: string;
  model?: ImageModel;
  params?: Partial<ImageGenerationParams>;
  references?: ImageReferenceItem[];
  meta?: Record<string, unknown>;
};

const defaultPollingIntervalMs = 4000;

function createLocalReference(file: File): ImageReferenceItem {
  const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const previewUrl = typeof URL !== "undefined" ? URL.createObjectURL(file) : "";

  return {
    id,
    type: "image",
    name: file.name,
    file,
    previewUrl,
    size: file.size,
    mimeType: file.type,
    uploadStatus: "local",
  };
}

function buildCurrentJobFromGenerateResponse(response: Awaited<ReturnType<typeof generateImage>>, prompt: string): ImageHistoryItem {
  return normalizeImageHistoryItem({
    id: response.dbJobId || response.jobId,
    jobId: response.jobId,
    dbJobId: response.dbJobId || response.jobId,
    status: response.status || "queued",
    prompt,
    model: response.model,
    provider: response.provider,
    providerModel: response.providerModel,
    ratio: response.params.ratio,
    resolution: response.params.resolution,
    quality: response.params.quality,
    batchCount: response.params.batchCount,
    cost: response.cost,
    creditsCharged: response.cost,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    meta: {
      cost: response.cost,
      ratio: response.params.ratio,
      resolution: response.params.resolution,
      quality: response.params.quality,
      batchCount: response.params.batchCount,
    },
  });
}

export function useImageGeneration(options: UseImageGenerationOptions = {}) {
  const pollingIntervalMs = options.pollingIntervalMs || defaultPollingIntervalMs;
  const autoLoad = options.autoLoad !== false;
  const [models, setModels] = useState<ImageModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedModelId, setSelectedModelIdState] = useState("");
  const [params, setParams] = useState<ImageGenerationParams>(() => getDefaultImageParams(getDefaultImageModel([])));
  const [references, setReferences] = useState<ImageReferenceItem[]>([]);
  const [prompt, setPrompt] = useState("");
  const [currentJob, setCurrentJob] = useState<ImageHistoryItem | null>(null);
  const [localJobs, setLocalJobs] = useState<ImageHistoryItem[]>([]);
  const [history, setHistory] = useState<ImageHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState("");
  const [recoveredJobId, setRecoveredJobId] = useState("");
  const currentJobRef = useRef<ImageHistoryItem | null>(null);
  const localJobsRef = useRef<ImageHistoryItem[]>([]);
  const historyRef = useRef<ImageHistoryItem[]>([]);

  const selectedModel = useMemo(() => getImageModelById(models, selectedModelId), [models, selectedModelId]);
  const mergedHistory = useMemo(() => mergeImageHistory(history, localJobs), [history, localJobs]);
  const outputs = useMemo(() => mergedHistory.filter((item) => item.outputUrls.length || isImageTerminalStatus(item.status)), [mergedHistory]);
  const estimatedCredits = useMemo(() => estimateImageCredits(selectedModel, params), [params, selectedModel]);

  useEffect(() => {
    currentJobRef.current = currentJob;
  }, [currentJob]);

  useEffect(() => {
    localJobsRef.current = localJobs;
  }, [localJobs]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    setError("");

    try {
      const nextModels = await getImageModels();
      const defaultModel = getDefaultImageModel(nextModels);
      setModels(nextModels);
      setSelectedModelIdState((current) => current || defaultModel.id);
      setParams((current) => normalizeImageGenerationParams(defaultModel, current));
      return nextModels;
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load image models.";
      setError(message);
      return [];
    } finally {
      setLoadingModels(false);
    }
  }, []);

  const reloadHistory = useCallback(async () => {
    setLoadingHistory(true);
    setError("");

    try {
      const items = await getImageHistory(80);
      setHistory(items);
      const recoverable = selectRecoverableImageJob(mergeImageHistory(items, localJobsRef.current));
      if (!currentJobRef.current && recoverable) {
        setRecoveredJobId(recoverable.dbJobId || recoverable.jobId || recoverable.id);
      }
      setCurrentJob((current) => current || recoverable);
      return items;
    } catch (historyError) {
      const message = historyError instanceof Error ? historyError.message : "Failed to load image history.";
      setError(message);
      return [];
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) return;
    const timer = window.setTimeout(() => {
      void loadModels();
      void reloadHistory();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [autoLoad, loadModels, reloadHistory]);

  const setSelectedModelId = useCallback((modelId: string) => {
    setSelectedModelIdState(modelId);
    setParams((current) => normalizeImageGenerationParams(getImageModelById(models, modelId), current));
  }, [models]);

  const updateParams = useCallback((nextParams: Partial<ImageGenerationParams>) => {
    setParams((current) => normalizeImageGenerationParams(selectedModel, { ...current, ...nextParams }));
  }, [selectedModel]);

  const addReferenceFile = useCallback((file: File) => {
    if (!canAddImageReference(selectedModel, references.length)) {
      const message = `This model supports up to ${selectedModel.capabilities.maxReferences} reference images.`;
      setError(message);
      return null;
    }

    const localReference = createLocalReference(file);
    setReferences((current) => [...current, localReference]);
    return localReference;
  }, [references.length, selectedModel]);

  const uploadReferenceFile = useCallback(async (file: File) => {
    if (!canAddImageReference(selectedModel, references.length)) {
      const message = `This model supports up to ${selectedModel.capabilities.maxReferences} reference images.`;
      setError(message);
      return null;
    }

    const localReference = {
      ...createLocalReference(file),
      uploadStatus: "uploading" as const,
    };

    setReferences((current) => [...current, localReference]);

    try {
      const uploaded = await uploadImage(file);
      const nextReference = {
        ...uploaded,
        previewUrl: localReference.previewUrl || uploaded.previewUrl,
      };
      setReferences((current) => current.map((item) => (item.id === localReference.id ? nextReference : item)));
      return nextReference;
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Image upload failed.";
      setReferences((current) => current.map((item) => (item.id === localReference.id ? { ...item, uploadStatus: "failed", errorMessage: message } : item)));
      setError(message);
      return null;
    }
  }, [references.length, selectedModel]);

  const removeReference = useCallback((referenceId: string) => {
    setReferences((current) => current.filter((item) => item.id !== referenceId));
  }, []);

  const uploadReference = useCallback(async (referenceId: string) => {
    const target = references.find((item) => item.id === referenceId);
    if (!target?.file) return target || null;

    setReferences((current) => current.map((item) => (item.id === referenceId ? { ...item, uploadStatus: "uploading", errorMessage: "" } : item)));

    try {
      const uploaded = await uploadImage(target.file);
      setReferences((current) => current.map((item) => (item.id === referenceId ? { ...uploaded, previewUrl: item.previewUrl || uploaded.previewUrl } : item)));
      return uploaded;
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Image upload failed.";
      setReferences((current) => current.map((item) => (item.id === referenceId ? { ...item, uploadStatus: "failed", errorMessage: message } : item)));
      setError(message);
      return null;
    }
  }, [references]);

  const ensureReadyReferences = useCallback(async (items: ImageReferenceItem[]) => {
    const ready: ImageReferenceItem[] = [];

    for (const item of items) {
      if (item.url && item.uploadStatus !== "failed") {
        ready.push(item);
        continue;
      }

      if (item.file) {
        const uploaded = await uploadReference(item.id);
        if (uploaded?.url) ready.push(uploaded);
      }
    }

    return ready;
  }, [uploadReference]);

  const refreshStatus = useCallback(async (jobId: string) => {
    if (!jobId) return null;
    setIsPolling(true);

    try {
      const status = await getImageStatus(jobId);
      const baseJob =
        [currentJobRef.current, ...localJobsRef.current, ...historyRef.current]
          .filter((item): item is ImageHistoryItem => Boolean(item))
          .find((item) => [item.jobId, item.dbJobId, item.id].filter(Boolean).some((value) => String(value) === String(jobId))) || status;
      setCurrentJob((current) => {
        if (!current || ![current.jobId, current.dbJobId, current.id].filter(Boolean).some((value) => String(value) === String(jobId))) {
          return mergeImageStatusIntoJob(baseJob, status);
        }
        return mergeImageStatusIntoJob(current, status);
      });
      setLocalJobs((current) => {
        const next = mergeImageStatusIntoJob(baseJob, status);
        return [next, ...current.filter((item) => item.jobId !== next.jobId && item.dbJobId !== next.dbJobId)].slice(0, 20);
      });
      if (isImageTerminalStatus(status.status)) {
        const statusJobId = status.dbJobId || status.jobId || status.id;
        if (statusJobId && String(statusJobId) === String(recoveredJobId)) {
          setRecoveredJobId("");
        }
        void reloadHistory();
      }
      return status;
    } catch (statusError) {
      const message = statusError instanceof Error ? statusError.message : "Failed to refresh image status.";
      setError(message);
      return null;
    } finally {
      setIsPolling(false);
    }
  }, [recoveredJobId, reloadHistory]);

  useEffect(() => {
    if (!currentJob || !isImageActiveStatus(currentJob.status)) return;
    let cancelled = false;
    const jobId = currentJob.dbJobId || currentJob.jobId;

    const tick = async () => {
      if (cancelled) return;
      const status = await refreshStatus(jobId);
      if (!cancelled && status && isImageActiveStatus(status.status)) {
        window.setTimeout(tick, pollingIntervalMs);
      }
    };

    const timer = window.setTimeout(tick, pollingIntervalMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [currentJob, pollingIntervalMs, refreshStatus]);

  const submit = useCallback(async (overrides: GenerateImageOptions = {}) => {
    if (isGenerating) return null;

    const effectivePrompt = String(overrides.prompt ?? prompt).trim();
    if (!effectivePrompt) {
      setError("Prompt is required.");
      return null;
    }

    setIsGenerating(true);
    setError("");
    setRecoveredJobId("");

    try {
      const effectiveModel = overrides.model || selectedModel;
      const effectiveParams = normalizeImageGenerationParams(effectiveModel, overrides.params || params);
      const effectiveReferences = overrides.references || references;
      const readyReferences = await ensureReadyReferences(effectiveReferences);
      const request = buildImageGenerateRequest({
        prompt: effectivePrompt,
        model: effectiveModel,
        params: effectiveParams,
        referenceImages: readyReferences.map((item) => item.url).filter((url): url is string => Boolean(url)),
        meta: overrides.meta,
      });
      const response = await generateImage(request);
      const nextJob = buildCurrentJobFromGenerateResponse(response, effectivePrompt);

      setCurrentJob(nextJob);
      setLocalJobs((current) => [nextJob, ...current.filter((item) => item.jobId !== nextJob.jobId)].slice(0, 20));
      return nextJob;
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Image generation request failed.";
      setError(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [ensureReadyReferences, isGenerating, params, prompt, references, selectedModel]);

  const recoverPolling = useCallback(() => {
    const recoverable = selectRecoverableImageJob(mergedHistory);
    setCurrentJob(recoverable);
    setRecoveredJobId(recoverable ? recoverable.dbJobId || recoverable.jobId || recoverable.id : "");
    return recoverable;
  }, [mergedHistory]);

  const selectJob = useCallback((job: ImageHistoryItem | null) => {
    setCurrentJob(job);
    setRecoveredJobId("");
    return job;
  }, []);

  return {
    models,
    loadingModels,
    selectedModel,
    selectedModelId,
    setSelectedModelId,
    params,
    setParams: updateParams,
    references,
    setReferences,
    addReferenceFile,
    uploadReferenceFile,
    removeReference,
    uploadReference,
    prompt,
    setPrompt,
    currentJob,
    outputs,
    history: mergedHistory,
    loadingHistory,
    isGenerating,
    isPolling,
    error,
    recoveredJobId,
    estimatedCredits,
    loadModels,
    reloadHistory,
    recoverPolling,
    refreshStatus,
    selectJob,
    submit,
  };
}
