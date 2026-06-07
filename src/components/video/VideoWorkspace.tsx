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
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import { getVideoModels } from "@/lib/video-api";
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

  const { error, history, historyError, isHistoryLoading, isSubmitting, loadHistory, refreshTask, submit, task } = useVideoGeneration();

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
          disabled={!selectedModel}
          isSubmitting={isSubmitting}
          onClick={() =>
            submit({
              prompt: prompt.trim(),
              model: selectedModel,
              duration: params.duration,
              ratio: params.ratio,
              quality: params.quality,
              generateAudio: params.generateAudio,
              media,
            })
          }
        />
        <ErrorState message={error || modelError} />
      </div>

      <div className="grid content-start gap-5">
        <ResultViewer task={task} />
        <HistoryPanel error={historyError} history={history} isLoading={isHistoryLoading} />
      </div>
    </div>
  );
}
