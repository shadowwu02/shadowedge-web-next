"use client";

import { ImageModelSelector } from "@/components/image/ImageModelSelector";
import { ImageReferenceTray } from "@/components/image/ImageReferenceTray";
import type { ImageGenerationParams, ImageModel, ImageReferenceItem } from "@/types/image";

function optionLabel(value: string) {
  return value || "Default";
}

export function ImagePromptPanel({
  error,
  estimatedCredits,
  isActiveJob,
  isGenerating,
  isPolling,
  loadingModels,
  models,
  params,
  prompt,
  references,
  selectedModel,
  onGenerate,
  onPromptChange,
  onRemoveReference,
  onSelectModel,
  onUpdateParams,
  onUploadReference,
}: {
  error: string;
  estimatedCredits: number;
  isActiveJob?: boolean;
  isGenerating: boolean;
  isPolling?: boolean;
  loadingModels: boolean;
  models: ImageModel[];
  params: ImageGenerationParams;
  prompt: string;
  references: ImageReferenceItem[];
  selectedModel: ImageModel | null;
  onGenerate: () => void;
  onPromptChange: (value: string) => void;
  onRemoveReference: (referenceId: string) => void;
  onSelectModel: (modelId: string) => void;
  onUpdateParams: (params: Partial<ImageGenerationParams>) => void;
  onUploadReference: (file: File) => void;
}) {
  const ratios = selectedModel?.capabilities.ratios || [];
  const resolutions = selectedModel?.capabilities.resolutions || [];
  const qualities = selectedModel?.capabilities.qualities || [];
  const maxBatchCount = selectedModel?.capabilities.maxBatchCount || 1;
  const hasUploadingReferences = references.some((reference) => reference.uploadStatus === "uploading");
  const hasPrompt = Boolean(prompt.trim());
  const disabled = isGenerating || loadingModels || hasUploadingReferences || isPolling || isActiveJob || !hasPrompt;
  const generateLabel = hasUploadingReferences
    ? "Uploading references..."
    : isGenerating
      ? "Generating..."
      : isPolling || isActiveJob
        ? "Waiting for result..."
        : `Generate image · Estimated ${estimatedCredits} credits`;

  return (
    <aside className="se-panel se-scrollbar flex h-full min-h-0 flex-col overflow-y-auto rounded-[30px] p-4">
      <div className="mb-4">
        <p className="se-eyebrow">Image Studio</p>
        <h1 className="mt-2 text-2xl font-black text-[#f4f4f4]">Create images</h1>
        <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/58">Prompt, references, and model controls stay here. Outputs appear in the center stage.</p>
      </div>

      <div className="space-y-4">
        <section className="se-card rounded-[24px] p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="se-eyebrow">Prompt</span>
            <span className="text-[10px] text-[#b9b9b9]/45">{prompt.length}/2000</span>
          </div>
          <textarea
            className="min-h-[168px] w-full resize-none rounded-[20px] border border-white/10 bg-[#05070b]/64 px-3.5 py-3 text-sm leading-6 text-[#f4f4f4] outline-none transition-colors placeholder:text-[#b9b9b9]/35 focus:border-[#ffb44d]/34"
            maxLength={2000}
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder="Describe the image, composition, camera, style, and details..."
            value={prompt}
          />
          {!hasPrompt ? (
            <p className="mt-2 rounded-full border border-[#ffb44d]/16 bg-[#ffb44d]/8 px-3 py-1.5 text-[11px] font-semibold text-[#ffd08a]/78">
              Enter a prompt to enable generation.
            </p>
          ) : null}
        </section>

        <ImageModelSelector disabled={loadingModels || isGenerating} models={models} onChange={onSelectModel} selectedModel={selectedModel} />

        <section className="se-card rounded-[24px] p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="se-eyebrow">Parameters</p>
              <p className="mt-1 text-xs text-[#b9b9b9]/52">Normalized from model capabilities.</p>
            </div>
            <span className="rounded-full border border-[#ffb44d]/20 bg-[#ffb44d]/10 px-2.5 py-1 text-[10px] font-semibold text-[#ffd08a]">
              Estimated {estimatedCredits} credits
            </span>
          </div>

          <div className="grid gap-2">
            <label className="grid gap-1.5 text-xs font-semibold text-[#b9b9b9]/70">
              <span className="flex items-center justify-between gap-2">
                Ratio
                <span className="text-[10px] font-medium text-[#b9b9b9]/38">{ratios.length ? `${ratios.length} options` : "Default"}</span>
              </span>
              <select
                className="se-control h-10 rounded-[15px] px-3 text-sm text-[#f4f4f4] outline-none"
                onChange={(event) => onUpdateParams({ ratio: event.target.value })}
                value={params.ratio}
              >
                {(ratios.length ? ratios : [params.ratio]).map((ratio) => (
                  <option key={ratio} value={ratio}>
                    {optionLabel(ratio)}
                  </option>
                ))}
              </select>
            </label>

            {resolutions.length ? (
              <label className="grid gap-1.5 text-xs font-semibold text-[#b9b9b9]/70">
                <span className="flex items-center justify-between gap-2">
                  Resolution
                  <span className="text-[10px] font-medium text-[#b9b9b9]/38">{resolutions.join(" / ")}</span>
                </span>
                <select
                  className="se-control h-10 rounded-[15px] px-3 text-sm text-[#f4f4f4] outline-none"
                  onChange={(event) => onUpdateParams({ resolution: event.target.value })}
                  value={params.resolution}
                >
                  {resolutions.map((resolution) => (
                    <option key={resolution} value={resolution}>
                      {optionLabel(resolution)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {qualities.length ? (
              <label className="grid gap-1.5 text-xs font-semibold text-[#b9b9b9]/70">
                <span className="flex items-center justify-between gap-2">
                  Quality
                  <span className="text-[10px] font-medium text-[#b9b9b9]/38">{qualities.join(" / ")}</span>
                </span>
                <select
                  className="se-control h-10 rounded-[15px] px-3 text-sm text-[#f4f4f4] outline-none"
                  onChange={(event) => onUpdateParams({ quality: event.target.value })}
                  value={params.quality}
                >
                  {qualities.map((quality) => (
                    <option key={quality} value={quality}>
                      {optionLabel(quality)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {maxBatchCount > 1 ? (
              <label className="grid gap-1.5 text-xs font-semibold text-[#b9b9b9]/70">
                <span className="flex items-center justify-between gap-2">
                  Batch count
                  <span className="text-[10px] font-medium text-[#b9b9b9]/38">1-{maxBatchCount}</span>
                </span>
                <input
                  className="se-control h-10 rounded-[15px] px-3 text-sm text-[#f4f4f4] outline-none"
                  max={maxBatchCount}
                  min={1}
                  onChange={(event) => onUpdateParams({ batchCount: Number(event.target.value) })}
                  type="number"
                  value={params.batchCount}
                />
              </label>
            ) : null}
          </div>
          <p className="mt-3 text-[11px] leading-5 text-[#b9b9b9]/45">Estimated cost is for UI guidance only. Actual credits are calculated by the backend.</p>
        </section>

        <ImageReferenceTray model={selectedModel} onRemove={onRemoveReference} onUploadFile={onUploadReference} references={references} />

        {error ? <div className="rounded-[18px] border border-[#8c4632]/42 bg-[#2a1012]/72 px-3 py-2 text-xs leading-5 text-[#f2b3a1]">{error}</div> : null}
      </div>

      <div className="mt-4 flex-none pt-1">
        <button className="se-button-primary min-h-[54px] w-full rounded-[20px] px-5 text-sm font-semibold" disabled={disabled} onClick={onGenerate} type="button">
          {generateLabel}
        </button>
      </div>
    </aside>
  );
}
