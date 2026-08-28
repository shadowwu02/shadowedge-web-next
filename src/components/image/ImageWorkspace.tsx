"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageHistoryPanel } from "@/components/image/ImageHistoryPanel";
import { ImageOutputDetailPanel } from "@/components/image/ImageOutputDetailPanel";
import { ImagePromptPanel } from "@/components/image/ImagePromptPanel";
import { ImageResultStack } from "@/components/image/ImageResultStack";
import { ImageUpscalePanel } from "@/components/image/ImageUpscalePanel";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { useI18n } from "@/i18n/useI18n";
import { assetLibraryImageHandoffToReference, consumeAssetLibraryImageHandoff } from "@/lib/assets/assetLibraryImageHandoff";
import { getImageUserFacingError } from "@/lib/image/imageErrorDisplay";
import { createImageHydrationDiagnostic, emitImageHydrationDiagnostic } from "@/lib/image/imageHydrationDiagnostic";
import { isCanonicalImageReferenceReady } from "@/lib/image-api";
import { isImageActiveStatus } from "@/lib/image/imageHistoryUtils";
import { consumeImageUpscaleAssetHandoff } from "@/lib/image/imageUpscaleHandoff";
import { formatImagePromptLimit } from "@/lib/image/imagePromptLimits";
import { mediaAssetToImageReferenceItem, saveAssetFromJob } from "@/lib/assets-api";
import {
  consumePromptStudioToImageDraft,
  getPromptStudioDraftLocale,
  saveWorkspaceToPromptStudioDraft,
  type PromptStudioBridgeDraft,
} from "@/lib/prompt-studio-draft-bridge";
import type { ImageHistoryItem, ImageReferenceItem } from "@/types/image";
import type { ImageUpscaleSource } from "@/types/image-upscale";

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
      // Prompt Studio restores URLs, not a server-confirmed Canonical Asset
      // receipt. Keep it visible, but never make it executable as an Image
      // reference until the customer chooses/re-uploads a Canonical asset.
      uploadStatus: "not_reference_eligible" as const,
      canonicalStatus: "failed",
      referenceEligibility: false,
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
  const { locale, t, tf } = useI18n();
  const router = useRouter();
  const isZh = getPromptStudioDraftLocale(locale) === "zh";
  const image = useImageGeneration();
  const [hydrationDiagnostic] = useState(() => createImageHydrationDiagnostic({
    buildSha: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    language: locale === "zh" ? "zh" : "en",
    modelStateCategory: image.models.length ? "catalog_ready" : "catalog_pending",
    catalogLoaded: image.models.length > 0,
    draftReady: image.draftReady,
    referenceCount: image.references.length,
    resolution: image.params.resolution,
    derivedAspectRatio: image.customerCapabilities.effectiveAspectRatio,
    authStateCategory: image.authStateCategory,
  }));
  const assetLibraryHandoffCheckedRef = useRef(false);
  const promptStudioDraftCheckedRef = useRef(false);
  const promptStudioImportTargetRef = useRef<HTMLDivElement | null>(null);
  const promptStudioImportHighlightTimerRef = useRef<number | null>(null);
  const [pendingPromptStudioDraft, setPendingPromptStudioDraft] = useState<PromptStudioBridgeDraft | null>(null);
  const [promptStudioNotice, setPromptStudioNotice] = useState("");
  const [isPromptStudioImportHighlighted, setIsPromptStudioImportHighlighted] = useState(false);
  const [upscaleSource, setUpscaleSource] = useState<ImageUpscaleSource | null>(null);
  const displayJob = image.currentJob || image.outputs[0] || null;
  const localizedError = useMemo(() => {
    const message = String(image.error || "").trim();
    if (!message) return "";
    const normalized = message.toLowerCase();
    // Preserve safe structured error copy and its support receipt rather than
    // treating already-localized customer text as an unclassified error again.
    if (normalized.includes("code:") || normalized.includes("correlation id:")) return message;
    if (message.includes("MAINTENANCE_MODE") || normalized.includes("under maintenance")) return t("maintenance.errors.generationPaused");
    if (message.includes("TENANT_MEMBERSHIP_REVIEW_REQUIRED") || normalized.includes("account ownership has not been completed")) return t("account.tenantMembershipReviewRequired");
    if (normalized === "network request failed." || normalized === "network request failed") return t("image.errors.networkRequestFailed");
    if (normalized.includes("not enough credits") || normalized.includes("insufficient credits")) return t("image.errors.notEnoughCredits");
    if (normalized.includes("provider unavailable") || normalized.includes("provider is unavailable")) return t("image.errors.providerUnavailable");
    if (normalized.includes("failed to load image models")) return t("image.errors.modelLoadFailed");
    if (normalized.includes("failed to load image history")) return t("image.errors.historyLoadFailed");
    if (normalized.includes("failed to refresh image status")) return t("image.errors.statusRefreshFailed");
    if (normalized.includes("prompt_too_long") || normalized.includes("prompt is too long") || normalized.includes("prompt too long")) {
      return tf("image.errors.promptTooLong", { limit: formatImagePromptLimit(image.selectedModel) });
    }
    if (normalized.includes("image generation request failed")) return t("image.errors.generationRequestFailed");
    if (normalized.includes("prompt is required")) return t("image.errors.promptRequired");
    if (normalized.includes("upload failed") || normalized.includes("image upload failed")) return t("image.errors.uploadFailed");
    return getImageUserFacingError(message, t);
  }, [image.error, image.selectedModel, t, tf]);

  useEffect(() => {
    const serverFingerprint = document.querySelector<HTMLElement>("[data-image-hydration-fingerprint]")
      ?.dataset.imageHydrationFingerprint || "";
    emitImageHydrationDiagnostic(serverFingerprint, hydrationDiagnostic);
  }, [hydrationDiagnostic]);

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

  const handleReuseResultAsReference = useCallback(async (job: ImageHistoryItem, outputUrl: string) => {
    const jobId = job.dbJobId || job.jobId || job.id;
    if (!jobId || !outputUrl) return null;

    const saved = await saveAssetFromJob(jobId, {
      displayName: t("assets.save.generatedImage"),
      kind: "image",
      outputUrl,
    });
    const reference = saved.asset ? mediaAssetToImageReferenceItem(saved.asset) : null;
    if (!reference || !isCanonicalImageReferenceReady(reference)) return null;

    const existingReference = image.references.find((item) => item.assetId === reference.assetId);
    if (existingReference) return existingReference;
    const maxReferences = image.customerCapabilities.maxReferences;
    if (!maxReferences || image.references.length >= maxReferences) return null;
    image.addReferenceItems([reference]);

    setPromptStudioNotice(t("image.actions.referenceAdded"));
    focusPromptStudioImportTarget();
    return reference;
  }, [focusPromptStudioImportTarget, image, t]);

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

    const nextPrompt = draft.prompt;
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

  useEffect(() => {
    if (!image.draftReady || assetLibraryHandoffCheckedRef.current) return;
    assetLibraryHandoffCheckedRef.current = true;

    const timer = window.setTimeout(() => {
      const handoff = consumeAssetLibraryImageHandoff();
      if (!handoff) return;

      const reference = assetLibraryImageHandoffToReference(handoff);
      if (!reference?.url) {
        setPromptStudioNotice("Asset Library image could not be added because its URL is unavailable.");
        focusPromptStudioImportTarget();
        return;
      }

      const isDuplicate = image.references.some(
        (item) =>
          item.id === reference.id ||
          (item.assetId && reference.assetId && item.assetId === reference.assetId) ||
          (item.url && reference.url && item.url === reference.url),
      );
      if (isDuplicate) {
        setPromptStudioNotice("This asset is already in the Image workspace draft.");
        focusPromptStudioImportTarget();
        return;
      }

      const maxReferences = image.customerCapabilities.maxReferences;
      if (!maxReferences) {
        setPromptStudioNotice("The selected Image model does not accept reference images.");
        focusPromptStudioImportTarget();
        return;
      }

      if (image.references.length >= maxReferences) {
        setPromptStudioNotice(`Reference limit reached for the selected Image model (${maxReferences}).`);
        focusPromptStudioImportTarget();
        return;
      }

      const added = image.addReferenceItems([reference]);
      setPromptStudioNotice(
        added
          ? "Asset added as a draft reference. Review it, then click Generate manually."
          : "Asset Library image could not be added to the draft reference tray.",
      );
      focusPromptStudioImportTarget();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [focusPromptStudioImportTarget, image, image.customerCapabilities.maxReferences, image.draftReady, image.references]);

  useEffect(() => {
    if (!image.draftReady) return;
    const timer = window.setTimeout(() => {
      const source = consumeImageUpscaleAssetHandoff();
      if (source) setUpscaleSource(source);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [image.draftReady]);

  const handleImportPromptStudioDraft = useCallback(() => {
    if (!pendingPromptStudioDraft?.prompt) return;
    image.setPrompt(pendingPromptStudioDraft.prompt);
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
    <div
      className="se-scrollbar grid h-full min-h-0 gap-4 overflow-y-auto overflow-x-hidden xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)_minmax(300px,380px)] xl:overflow-hidden"
      data-image-hydration-fingerprint={hydrationDiagnostic.fingerprint}
      data-image-hydration-route={hydrationDiagnostic.route}
    >
      <div
        className={`min-h-[760px] min-w-0 max-w-full overflow-hidden rounded-[32px] transition-[box-shadow,background-color] duration-500 xl:min-h-0 ${
          isPromptStudioImportHighlighted
            ? "bg-[#ffb44d]/[.035] shadow-[0_0_0_1px_rgba(255,180,77,.34),0_0_36px_rgba(255,180,77,.18)]"
            : ""
        }`}
        ref={promptStudioImportTargetRef}
      >
        <ImagePromptPanel
          customerCapabilities={image.customerCapabilities}
          draftNotice={image.capabilityNotice || promptStudioNotice || image.draftNotice}
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
          onAddReferences={image.addReferenceItems}
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
        <ImageResultStack
          currentJobId={displayJob?.dbJobId || displayJob?.jobId || displayJob?.id}
          error={localizedError}
          isGenerating={image.isGenerating}
          isLoading={image.loadingHistory}
          isPolling={image.isPolling}
          jobs={image.history}
          onRefresh={handleRefreshStatus}
          onReuseReference={handleReuseResultAsReference}
          onSelect={handleHistorySelect}
          onUpscale={setUpscaleSource}
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
      {upscaleSource ? <ImageUpscalePanel onClose={() => setUpscaleSource(null)} source={upscaleSource} /> : null}
    </div>
  );
}
