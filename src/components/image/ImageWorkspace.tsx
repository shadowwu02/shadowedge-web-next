"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageHistoryPanel } from "@/components/image/ImageHistoryPanel";
import { ImageOutputDetailPanel } from "@/components/image/ImageOutputDetailPanel";
import { ImageOutputStage } from "@/components/image/ImageOutputStage";
import { ImagePromptPanel } from "@/components/image/ImagePromptPanel";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { useI18n } from "@/i18n/useI18n";
import { getImageUserFacingError } from "@/lib/image/imageErrorDisplay";
import { isImageActiveStatus } from "@/lib/image/imageHistoryUtils";
import {
  consumePromptStudioToImageDraft,
  getPromptStudioDraftLocale,
  saveWorkspaceToPromptStudioDraft,
  type PromptStudioBridgeDraft,
} from "@/lib/prompt-studio-draft-bridge";
import type { ImageHistoryItem, ImageReferenceItem } from "@/types/image";

function getPromptStudioImageReferences(draft: PromptStudioBridgeDraft | null): ImageReferenceItem[] {
  return (draft?.referenceImages || [])
    .filter((reference) => isSafePromptStudioReferenceUrl(reference.url))
    .map((reference) => ({
      id: reference.id || reference.url,
      type: "image" as const,
      name: reference.name || "Prompt Studio reference",
      url: reference.url,
      previewUrl: reference.url,
      size: reference.sizeBytes,
      mimeType: reference.mimeType,
      width: reference.width,
      height: reference.height,
      uploadedAt: reference.uploadedAt,
      uploadStatus: "ready" as const,
    }));
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

function mergeImageReferences(current: ImageReferenceItem[], next: ImageReferenceItem[]) {
  if (!next.length) return current;
  const existing = new Set(current.map((item) => item.url || item.id));
  return [...current, ...next.filter((item) => !existing.has(item.url || item.id))];
}

export function ImageWorkspace() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const isZh = getPromptStudioDraftLocale(locale) === "zh";
  const image = useImageGeneration();
  const promptStudioDraftCheckedRef = useRef(false);
  const promptStudioImportTargetRef = useRef<HTMLDivElement | null>(null);
  const promptStudioImportHighlightTimerRef = useRef<number | null>(null);
  const [pendingPromptStudioDraft, setPendingPromptStudioDraft] = useState<PromptStudioBridgeDraft | null>(null);
  const [promptStudioNotice, setPromptStudioNotice] = useState("");
  const [isPromptStudioImportHighlighted, setIsPromptStudioImportHighlighted] = useState(false);
  const displayJob = image.currentJob || image.outputs[0] || null;
  const localizedError = useMemo(() => {
    const message = String(image.error || "").trim();
    if (!message) return "";
    const normalized = message.toLowerCase();
    if (message.includes("MAINTENANCE_MODE") || normalized.includes("under maintenance")) return t("maintenance.errors.generationPaused");
    if (normalized === "network request failed." || normalized === "network request failed") return t("image.errors.networkRequestFailed");
    if (normalized.includes("not enough credits") || normalized.includes("insufficient credits")) return t("image.errors.notEnoughCredits");
    if (normalized.includes("provider unavailable") || normalized.includes("provider is unavailable")) return t("image.errors.providerUnavailable");
    if (normalized.includes("failed to load image models")) return t("image.errors.modelLoadFailed");
    if (normalized.includes("failed to load image history")) return t("image.errors.historyLoadFailed");
    if (normalized.includes("failed to refresh image status")) return t("image.errors.statusRefreshFailed");
    if (normalized.includes("image generation request failed")) return t("image.errors.generationRequestFailed");
    if (normalized.includes("prompt is required")) return t("image.errors.promptRequired");
    if (normalized.includes("upload failed") || normalized.includes("image upload failed")) return t("image.errors.uploadFailed");
    return getImageUserFacingError(message, t);
  }, [image.error, t]);

  const handleHistorySelect = useCallback((item: ImageHistoryItem) => {
    image.selectJob(item);
    if (isImageActiveStatus(item.status)) {
      void image.refreshStatus(item.dbJobId || item.jobId);
    }
  }, [image]);

  const handleRefreshStatus = useCallback((jobId: string) => {
    void image.refreshStatus(jobId);
  }, [image]);

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
    if (!image.draftReady || promptStudioDraftCheckedRef.current) return;
    promptStudioDraftCheckedRef.current = true;

    const draft = consumePromptStudioToImageDraft();
    if (!draft?.prompt) return;

    const nextPrompt = draft.prompt.slice(0, 2000);
    const timer = window.setTimeout(() => {
      if (image.prompt.trim() || image.references.length) {
        setPendingPromptStudioDraft({ ...draft, prompt: nextPrompt });
        focusPromptStudioImportTarget();
        return;
      }

      image.setPrompt(nextPrompt);
      const nextReferences = getPromptStudioImageReferences(draft);
      if (nextReferences.length) {
        image.setReferences((current) => mergeImageReferences(current, nextReferences));
      }
      setPromptStudioNotice(
        isZh
          ? "已导入 Prompt Studio 草稿。请确认后手动点击生成。"
          : "Prompt Studio draft imported. Review it, then click Generate manually.",
      );
      focusPromptStudioImportTarget();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [focusPromptStudioImportTarget, image, image.draftReady, image.prompt, image.references.length, isZh]);

  const handleImportPromptStudioDraft = useCallback(() => {
    if (!pendingPromptStudioDraft?.prompt) return;
    image.setPrompt(pendingPromptStudioDraft.prompt.slice(0, 2000));
    const nextReferences = getPromptStudioImageReferences(pendingPromptStudioDraft);
    if (nextReferences.length) {
      image.setReferences((current) => mergeImageReferences(current, nextReferences));
    }
    setPendingPromptStudioDraft(null);
    setPromptStudioNotice(
      isZh
        ? "已导入 Prompt Studio 草稿。请确认后手动点击生成。"
        : "Prompt Studio draft imported. Review it, then click Generate manually.",
    );
    focusPromptStudioImportTarget();
  }, [focusPromptStudioImportTarget, image, isZh, pendingPromptStudioDraft]);

  const handleIgnorePromptStudioDraft = useCallback(() => {
    setPendingPromptStudioDraft(null);
    setPromptStudioNotice(isZh ? "已忽略 Prompt Studio 草稿。" : "Prompt Studio draft ignored.");
  }, [isZh]);

  const handleOpenPromptStudio = useCallback(() => {
    const currentPrompt = image.prompt.trim();
    if (!currentPrompt) {
      setPromptStudioNotice(isZh ? "请先输入提示词，再用 Prompt Studio 优化。" : "Enter a prompt before optimizing in Prompt Studio.");
      return;
    }

    saveWorkspaceToPromptStudioDraft({
      prompt: currentPrompt,
      source: "image-workspace",
      target: "image",
      engine: image.selectedModel?.id || "gpt-image",
      mode: "optimize",
    });
    router.push("/prompt-studio?from=image-workspace");
  }, [image.prompt, image.selectedModel?.id, isZh, router]);

  return (
    <div className="se-scrollbar grid h-full min-h-0 gap-4 overflow-y-auto overflow-x-hidden xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)_minmax(300px,380px)] xl:overflow-hidden">
      <div
        className={`min-h-[760px] overflow-hidden rounded-[32px] transition-[box-shadow,background-color] duration-500 xl:min-h-0 ${
          isPromptStudioImportHighlighted
            ? "bg-[#ffb44d]/[.035] shadow-[0_0_0_1px_rgba(255,180,77,.34),0_0_36px_rgba(255,180,77,.18)]"
            : ""
        }`}
        ref={promptStudioImportTargetRef}
      >
        <ImagePromptPanel
          draftNotice={promptStudioNotice || image.draftNotice}
          error={localizedError}
          estimatedCredits={image.estimatedCredits}
          isActiveJob={Boolean(image.currentJob && isImageActiveStatus(image.currentJob.status))}
          isGenerating={image.isGenerating}
          isPolling={image.isPolling}
          loadingModels={image.loadingModels}
          models={image.models}
          onGenerate={() => void image.submit()}
          onClearDraft={image.clearDraft}
          onIgnorePromptStudioDraft={handleIgnorePromptStudioDraft}
          onImportPromptStudioDraft={handleImportPromptStudioDraft}
          onOptimizeInPromptStudio={handleOpenPromptStudio}
          onPromptChange={image.setPrompt}
          onRemoveReference={image.removeReference}
          onSelectModel={image.setSelectedModelId}
          onUpdateParams={image.setParams}
          onUploadReference={(file) => void image.uploadReferenceFile(file)}
          params={image.params}
          prompt={image.prompt}
          promptStudioDraftReferenceCount={getPromptStudioImageReferences(pendingPromptStudioDraft).length}
          promptStudioDraftPending={Boolean(pendingPromptStudioDraft)}
          references={image.references}
          selectedModel={image.selectedModel}
        />
      </div>

      <div className="min-h-[560px] overflow-hidden xl:min-h-0">
        <ImageOutputStage
          error={localizedError}
          isGenerating={image.isGenerating}
          isPolling={image.isPolling}
          job={displayJob}
          onRefresh={handleRefreshStatus}
          recoveredJobId={image.recoveredJobId}
        />
      </div>

      <div className="se-scrollbar flex min-h-[620px] flex-col gap-4 overflow-y-auto xl:min-h-0">
        <ImageHistoryPanel
          currentJobId={displayJob?.dbJobId || displayJob?.jobId}
          history={image.history}
          error={localizedError}
          isLoading={image.loadingHistory}
          onRefreshHistory={() => void image.reloadHistory()}
          onRefreshStatus={handleRefreshStatus}
          onSelect={handleHistorySelect}
        />
        <ImageOutputDetailPanel job={displayJob} />
      </div>
    </div>
  );
}
