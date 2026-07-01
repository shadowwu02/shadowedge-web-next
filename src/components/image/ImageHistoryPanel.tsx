"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SaveToAssetsButton } from "@/components/assets/SaveToAssetsButton";
import { VideoModelLogo } from "@/components/video/VideoModelLogo";
import { getImageUserFacingErrorDisplay } from "@/lib/image/imageErrorDisplay";
import { getLocalizedImageHistoryPublicErrorMessage, isImageActiveStatus, isImageCompletedStatus, isImageFailedStatus } from "@/lib/image/imageHistoryUtils";
import { getImageHistoryModelLogoLookup } from "@/lib/image/imageModelLogo";
import { getReusableImageOutputUrl, sendImageFailedJobToImageDraft, sendImageResultToImageDraft } from "@/lib/image/imageResultDrafts";
import { sendImageResultToVideoDraft } from "@/lib/video/videoResultDrafts";
import { useI18n } from "@/i18n/useI18n";
import { formatTime } from "@/lib/utils";
import type { ImageHistoryItem } from "@/types/image";

type ImageHistoryFilter = "all" | "completed" | "failed";

function statusClass(status: string) {
  if (isImageFailedStatus(status)) return "se-status-failed";
  if (isImageCompletedStatus(status)) return "se-status-completed";
  if (isImageActiveStatus(status)) return "se-status-processing";
  return "se-status-neutral";
}

function getImageHistoryKey(item: ImageHistoryItem) {
  return String(item.dbJobId || item.jobId || item.id || item.createdAt || item.outputUrl || item.prompt || "image-job");
}

function getFirstOutputUrl(item: ImageHistoryItem) {
  return item.outputUrl || item.outputUrls?.[0] || "";
}

function imageActionClass(tone: "danger" | "normal" | "primary" = "normal") {
  if (tone === "danger") return "se-button-danger rounded-full px-3 py-1.5 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-45";
  if (tone === "primary") return "se-button-secondary rounded-full px-3 py-1.5 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-45";
  return "se-button-ghost rounded-full px-3 py-1.5 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-45";
}

export function ImageHistoryPanel({
  currentJobId,
  error,
  history,
  isLoading,
  onRefreshHistory,
  onRefreshStatus,
  onSelect,
}: {
  currentJobId?: string;
  error?: string;
  history: ImageHistoryItem[];
  isLoading?: boolean;
  onRefreshHistory: () => void;
  onRefreshStatus: (jobId: string) => void;
  onSelect: (item: ImageHistoryItem) => void;
}) {
  const router = useRouter();
  const { locale, t, tf } = useI18n();
  const [filter, setFilter] = useState<ImageHistoryFilter>("all");
  const [expandedKey, setExpandedKey] = useState<string>("");
  const [actionError, setActionError] = useState("");
  const counts = useMemo(() => ({
    all: history.length,
    completed: history.filter((item) => isImageCompletedStatus(item.status)).length,
    failed: history.filter((item) => isImageFailedStatus(item.status)).length,
  }), [history]);
  const visibleHistory = useMemo(() => {
    if (filter === "completed") return history.filter((item) => isImageCompletedStatus(item.status));
    if (filter === "failed") return history.filter((item) => isImageFailedStatus(item.status));
    return history;
  }, [filter, history]);
  const getStatusLabel = (status: string) => {
    if (isImageFailedStatus(status)) return t("image.status.failed");
    if (isImageCompletedStatus(status)) return t("image.status.completed");
    if (isImageActiveStatus(status)) return t("image.status.processing");
    return status || t("image.status.unknown");
  };
  const getFilterLabel = (item: ImageHistoryFilter) => {
    if (item === "completed") return t("image.history.filter.completed");
    if (item === "failed") return t("image.history.filter.failed");
    return t("image.history.filter.all");
  };
  const handleSendToVideoDraft = (item: ImageHistoryItem) => {
    setActionError("");
    const result = sendImageResultToVideoDraft(
      { image: item },
      t("image.actions.imageAddedToVideoDraft"),
    );

    if (!result) {
      setActionError(t("image.actions.noReusableImageUrl"));
      return;
    }

    router.push("/workspace/video?from=image-result");
  };

  const handleUseAsReference = (item: ImageHistoryItem) => {
    setActionError("");
    const result = sendImageResultToImageDraft(
      { image: item },
      t("image.actions.imageAddedAsReferenceDraft"),
    );

    if (!result) {
      setActionError(t("image.actions.noReusableImageUrl"));
      return;
    }

    window.location.assign("/workspace/image?from=image-result");
  };

  const handleRetryAsDraft = (item: ImageHistoryItem) => {
    setActionError("");
    const failureDisplay = getImageUserFacingErrorDisplay(item.errorMessage, t, {
      classificationMessage: item.errorClassificationMessage,
      errorCode: item.errorCode,
      publicMessage: getLocalizedImageHistoryPublicErrorMessage(item, locale),
      refunded: item.refunded,
      refundStatus: item.refundStatus,
    });
    const restoreNotice = failureDisplay.reasonCode === "material"
      ? t("image.actions.failedMaterialRestoredAsDraft")
      : t("image.actions.failedRestoredAsDraft");
    const result = sendImageFailedJobToImageDraft(
      { image: item },
      restoreNotice,
    );

    if (!result) {
      setActionError(t("image.actions.comingSoonDraftOnly"));
      return;
    }

    window.location.assign("/workspace/image?from=failed-job");
  };

  return (
    <section className="se-card-quiet flex min-h-[260px] flex-col overflow-hidden rounded-[26px]">
      <div className="flex flex-none items-center justify-between gap-3 border-b border-white/10 p-4">
        <div>
          <p className="se-eyebrow">{t("image.workspace.history")}</p>
          <p className="mt-1 text-xs text-[#b9b9b9]/48">{isLoading ? t("image.history.loadingJobs") : tf("image.history.count", { visible: visibleHistory.length, total: history.length })}</p>
        </div>
        <button
          className="se-button-secondary rounded-full px-3 py-1.5 text-[11px] font-semibold"
          disabled={isLoading}
          onClick={onRefreshHistory}
          type="button"
        >
          {t("image.actions.refresh")}
        </button>
      </div>

      <div className="flex flex-none flex-wrap gap-1.5 border-b border-white/8 px-3 py-2">
        <div className="se-segmented flex flex-wrap gap-1.5 rounded-2xl p-1">
          {(["all", "completed", "failed"] as const).map((item) => (
            <button
              className={`se-segmented-item rounded-full px-3 py-1.5 text-[11px] font-semibold ${filter === item ? "se-segmented-item-active" : ""}`}
              key={item}
              onClick={() => setFilter(item)}
              type="button"
            >
              {getFilterLabel(item)}
              <span className="se-segmented-count text-[10px]">{counts[item]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="se-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {error ? (
          <div className="rounded-[18px] border border-[#8c4632]/42 bg-[#2a1012]/72 px-3 py-2 text-xs leading-5 text-[#f2b3a1]">{error}</div>
        ) : null}
        {actionError ? (
          <div className="rounded-[18px] border border-[#8c4632]/42 bg-[#2a1012]/72 px-3 py-2 text-xs leading-5 text-[#f2b3a1]">{actionError}</div>
        ) : null}
        {isLoading && !visibleHistory.length ? (
          <div className="grid min-h-[180px] place-items-center rounded-[20px] border border-dashed border-white/10 text-center">
            <div>
              <p className="text-sm font-semibold text-[#f4f4f4]/80">{t("image.history.loadingTitle")}</p>
              <p className="mt-1 text-xs text-[#b9b9b9]/48">{t("image.history.loadingHint")}</p>
            </div>
          </div>
        ) : visibleHistory.length ? (
          visibleHistory.map((item) => {
            const status = String(item.status || "");
            const isSelected = [item.jobId, item.dbJobId, item.id].filter(Boolean).some((value) => String(value) === String(currentJobId || ""));
            const isActive = isImageActiveStatus(status);
            const isCompleted = isImageCompletedStatus(status);
            const isFailed = isImageFailedStatus(status);
            const historyKey = getImageHistoryKey(item);
            const isExpanded = expandedKey === historyKey;
            const outputUrl = getFirstOutputUrl(item);
            const safeFilename = String(historyKey).replace(/[^\w.-]+/g, "-");
            const isRefunded = Boolean(item.refunded || item.refundStatus === "refunded");
            const modelLogoLookup = getImageHistoryModelLogoLookup(item);
            const reusableImageUrl = getReusableImageOutputUrl(item, outputUrl);
            const failedErrorDisplay = isFailed ? getImageUserFacingErrorDisplay(item.errorMessage, t, {
              classificationMessage: item.errorClassificationMessage,
              errorCode: item.errorCode,
              publicMessage: getLocalizedImageHistoryPublicErrorMessage(item, locale),
              refunded: item.refunded,
              refundStatus: item.refundStatus,
            }) : null;
            const copyMetadata = () => {
              const metadata = {
                createdAt: item.createdAt,
                jobId: item.dbJobId || item.jobId || item.id,
                model: item.model,
                outputUrl,
                prompt: item.prompt,
                quality: item.quality,
                ratio: item.ratio,
                resolution: item.resolution,
                status,
              };
              void navigator.clipboard?.writeText(JSON.stringify(metadata, null, 2));
            };

            return (
              <article
                className={`rounded-[20px] border bg-[linear-gradient(180deg,rgba(30,27,23,0.86),rgba(12,13,14,0.74))] p-2.5 shadow-[0_18px_60px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.035)] transition-colors ${
                  isSelected ? "border-[#ffb44d]/40" : "border-white/8 hover:border-[#ffb44d]/22 hover:bg-[#ffb24a]/[0.05]"
                }`}
                key={historyKey}
              >
                <button className="grid w-full grid-cols-[56px_minmax(0,1fr)] gap-3 text-left" onClick={() => onSelect(item)} type="button">
                  <span className="grid aspect-square place-items-center overflow-hidden rounded-[16px] bg-black/52">
                    {outputUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="" className="h-full w-full object-cover" src={outputUrl} />
                    ) : (
                      <span className="text-[10px] font-semibold text-[#b9b9b9]/42">{isActive ? "..." : t("image.references.generic")}</span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className={`se-status rounded-full px-2 py-0.5 text-[9px] font-semibold ${statusClass(status)}`}>{getStatusLabel(status)}</span>
                      {isFailed && isRefunded ? (
                        <span className="rounded-full border border-[#ffb44d]/20 bg-[#ffb44d]/10 px-2 py-0.5 text-[9px] font-semibold text-[#ffd08a]">{t("image.history.refunded")}</span>
                      ) : null}
                      <span className="truncate text-[10px] text-[#b9b9b9]/42">{formatTime(item.createdAt)}</span>
                    </span>
                    <span className="mt-1.5 block truncate text-xs font-semibold text-[#f4f4f4]/82">{item.prompt || t("image.history.untitled")}</span>
                    <span className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-[10px] text-[#b9b9b9]/45">
                      <VideoModelLogo label={item.model || t("image.references.generic")} lookup={modelLogoLookup} size="sm" />
                      <span className="truncate">
                        {item.model || t("image.references.generic")} - {item.ratio || "auto"} {item.resolution ? `- ${item.resolution}` : ""} {item.quality ? `- ${item.quality}` : ""}
                      </span>
                    </span>
                    {isCompleted ? (
                      <span className="mt-1 block text-[10px] font-semibold text-[#b8e7ee]/68">
                        {tf((item.outputUrls.length || 1) > 1 ? "image.status.outputCountPlural" : "image.status.outputCount", { count: item.outputUrls.length || 1 })}
                      </span>
                    ) : null}
                    {failedErrorDisplay ? (
                      <>
                        <span className="mt-1 block truncate text-[10px] font-semibold text-[#f2b3a1]/72">{failedErrorDisplay.title}</span>
                        {failedErrorDisplay.reasonCode === "material" ? (
                          <span className="mt-1 block line-clamp-2 text-[10px] leading-4 text-[#ffd08a]/68">{t("image.errorDisplay.material.recoveryMessage")}</span>
                        ) : null}
                      </>
                    ) : null}
                  </span>
                </button>
                {isActive ? (
                  <button
                    className="se-button-ghost mt-2 min-h-8 rounded-full px-3 text-[11px] font-semibold"
                    onClick={() => onRefreshStatus(item.dbJobId || item.jobId)}
                    type="button"
                  >
                    {t("image.actions.continuePolling")}
                  </button>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-white/8 pt-2">
                  {isCompleted && outputUrl ? (
                    <a className={imageActionClass("primary")} download={`shadowedge-image-${safeFilename}.png`} href={outputUrl} rel="noreferrer" target="_blank">
                      {t("image.actions.download")}
                    </a>
                  ) : null}
                  {isCompleted && outputUrl ? (
                    <SaveToAssetsButton
                      className={imageActionClass("normal")}
                      displayName={t("assets.save.generatedImage")}
                      jobId={item.dbJobId || item.jobId || item.id}
                      kind="image"
                      outputUrl={outputUrl}
                    />
                  ) : null}
                  <button
                    className={imageActionClass("normal")}
                    disabled={!item.prompt}
                    onClick={() => void navigator.clipboard?.writeText(item.prompt || "")}
                    type="button"
                  >
                    {t("image.actions.copyPrompt")}
                  </button>
                  {isCompleted ? (
                    <>
                      <button
                        className={imageActionClass("normal")}
                        disabled={!reusableImageUrl}
                        onClick={() => handleUseAsReference(item)}
                        title={reusableImageUrl ? t("image.actions.imageAddedAsReferenceDraft") : t("image.actions.noReusableImageUrl")}
                        type="button"
                      >
                        {t("image.actions.useAsReference")}
                      </button>
                      <button
                        className={imageActionClass("normal")}
                        disabled={!reusableImageUrl}
                        onClick={() => handleSendToVideoDraft(item)}
                        title={reusableImageUrl ? t("image.actions.imageAddedToVideoDraft") : t("image.actions.noReusableImageUrl")}
                        type="button"
                      >
                        {t("image.actions.sendToVideoDraft")}
                      </button>
                    </>
                  ) : null}
                  {isFailed ? (
                    <button
                      className={imageActionClass("primary")}
                      onClick={() => handleRetryAsDraft(item)}
                      title={failedErrorDisplay?.reasonCode === "material" ? t("image.actions.failedMaterialRestoredAsDraft") : t("image.actions.failedRestoredAsDraft")}
                      type="button"
                    >
                      {t("image.actions.retryAsDraft")}
                    </button>
                  ) : null}
                  <button className={imageActionClass("normal")} onClick={() => setExpandedKey(isExpanded ? "" : historyKey)} type="button">
                    {t("image.actions.viewDetails")}
                  </button>
                  {!isActive ? (
                    <button className={imageActionClass("danger")} disabled title={t("image.actions.comingSoonDraftOnly")} type="button">
                      {t("image.actions.hide")}
                    </button>
                  ) : null}
                </div>
                {isExpanded ? (
                  <div className="mt-2 rounded-[16px] border border-white/8 bg-black/24 p-3 text-[11px] leading-5 text-[#b9b9b9]/62">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#f4f4f4]/76">{t("image.history.details")}</span>
                      <button className={imageActionClass("normal")} onClick={copyMetadata} type="button">
                        {t("image.actions.copyMetadata")}
                      </button>
                    </div>
                    {isFailed && failedErrorDisplay ? (
                      <p className="mb-2 rounded-2xl border border-[#8c4632]/30 bg-[#2a1012]/56 px-3 py-2 text-[#f2b3a1]/76">
                        <span className="block font-semibold text-[#f2b3a1]/88">{failedErrorDisplay.title}</span>
                        <span className="mt-1 block">{failedErrorDisplay.message}</span>
                        <span className="mt-1 block text-[#ffd08a]/70">{failedErrorDisplay.suggestion}</span>
                        {failedErrorDisplay.reasonCode === "material" ? (
                          <span className="mt-2 block rounded-2xl border border-[#ffb44d]/20 bg-[#ffb44d]/8 p-2">
                            <span className="block font-semibold text-[#ffd08a]/90">{t("image.errorDisplay.material.recoveryTitle")}</span>
                            <span className="mt-1 block text-[#ffd08a]/70">{t("image.errorDisplay.material.recoveryMessage")}</span>
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                    <p className="truncate">{item.prompt || t("image.history.untitled")}</p>
                    <p className="mt-1 truncate">{item.model || t("image.references.generic")} · {item.ratio || "auto"} {item.resolution ? `· ${item.resolution}` : ""} {item.quality ? `· ${item.quality}` : ""}</p>
                    <p className="mt-1 truncate">{item.dbJobId || item.jobId || item.id || "--"}</p>
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="grid min-h-[180px] place-items-center rounded-[20px] border border-dashed border-white/10 text-center">
            <div>
              <p className="text-sm font-semibold text-[#f4f4f4]/80">{filter === "all" ? t("image.history.emptyAll") : tf("image.history.emptyFiltered", { filter: getFilterLabel(filter) })}</p>
              <p className="mt-1 text-xs text-[#b9b9b9]/48">{t("image.history.emptyHint")}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
