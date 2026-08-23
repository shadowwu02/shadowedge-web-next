"use client";

import { useMemo, useState } from "react";
import { SaveToAssetsButton } from "@/components/assets/SaveToAssetsButton";
import { useI18n } from "@/i18n/useI18n";
import { downloadBrowserFile } from "@/lib/browserDownload";
import { getImageUserFacingErrorDisplay } from "@/lib/image/imageErrorDisplay";
import {
  getImageHistoryStableKey,
  getLocalizedImageHistoryPublicErrorMessage,
  isImageActiveStatus,
  isImageCompletedStatus,
  isImageFailedStatus,
} from "@/lib/image/imageHistoryUtils";
import { getReusableImageOutputUrl } from "@/lib/image/imageResultDrafts";
import { formatTime } from "@/lib/utils";
import type { ImageHistoryItem, ImageReferenceItem } from "@/types/image";
import type { ImageUpscaleSource } from "@/types/image-upscale";

type ImageResultStackProps = {
  currentJobId?: string;
  error?: string;
  isGenerating?: boolean;
  isLoading?: boolean;
  isPolling?: boolean;
  jobs: ImageHistoryItem[];
  onRefresh: (jobId: string) => void;
  onReuseReference: (job: ImageHistoryItem, outputUrl: string, outputIndex: number) => Promise<ImageReferenceItem | null>;
  onSelect: (job: ImageHistoryItem) => void;
  onUpscale?: (source: ImageUpscaleSource) => void;
  recoveredJobId?: string;
};

function resultActionClass(tone: "normal" | "primary" = "normal") {
  if (tone === "primary") {
    return "se-button-secondary inline-flex min-h-8 items-center justify-center rounded-full px-3 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-45";
  }
  return "se-button-ghost inline-flex min-h-8 items-center justify-center rounded-full px-3 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-45";
}

function statusClass(status: string) {
  if (isImageFailedStatus(status)) return "se-status-failed";
  if (isImageCompletedStatus(status)) return "se-status-completed";
  if (isImageActiveStatus(status)) return "se-status-processing";
  return "se-status-neutral";
}

function safeImageFilename(job: ImageHistoryItem, index: number) {
  const identity = job.dbJobId || job.jobId || job.id || job.createdAt || "image-result";
  return `shadowedge-image-${String(identity).replace(/[^\w.-]+/g, "-")}-${index + 1}.png`;
}

function outputDimensions(job: ImageHistoryItem) {
  const match = String(job.resolution || "").match(/(\d+)\s*[x×]\s*(\d+)/i);
  return {
    width: Number(job.meta?.width) || Number(match?.[1]) || undefined,
    height: Number(job.meta?.height) || Number(match?.[2]) || undefined,
  };
}

export function ImageResultStack({
  currentJobId,
  error,
  isGenerating = false,
  isLoading = false,
  isPolling = false,
  jobs,
  onRefresh,
  onReuseReference,
  onSelect,
  onUpscale,
  recoveredJobId,
}: ImageResultStackProps) {
  const { locale, t, tf } = useI18n();
  const [actionMessage, setActionMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const visibleJobs = useMemo(() => jobs.filter((job) => Boolean(job.dbJobId || job.jobId || job.id)), [jobs]);

  const getStatusLabel = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === "queued" || normalized === "created" || normalized === "pending" || normalized === "submitted") {
      return t("image.status.queued");
    }
    if (normalized === "uncertain") return t("image.status.uncertain");
    if (isImageFailedStatus(normalized)) return t("image.status.failed");
    if (isImageCompletedStatus(normalized)) return t("image.status.completed");
    if (isImageActiveStatus(normalized)) return t("image.status.processing");
    return normalized || t("image.status.unknown");
  };

  const handleDownload = async (job: ImageHistoryItem, url: string, index: number) => {
    const actionKey = `download:${getImageHistoryStableKey(job)}:${index}`;
    setBusyAction(actionKey);
    setActionMessage("");
    try {
      await downloadBrowserFile({ filename: safeImageFilename(job, index), url });
    } catch {
      setActionMessage(t("image.actions.downloadFailed"));
    } finally {
      setBusyAction("");
    }
  };

  const handleReuseReference = async (job: ImageHistoryItem, url: string, index: number) => {
    const actionKey = `reference:${getImageHistoryStableKey(job)}:${index}`;
    setBusyAction(actionKey);
    setActionMessage("");
    try {
      const reference = await onReuseReference(job, url, index);
      setActionMessage(reference ? t("image.actions.referenceAdded") : t("image.actions.referenceAddFailed"));
    } catch {
      setActionMessage(t("image.actions.referenceAddFailed"));
    } finally {
      setBusyAction("");
    }
  };

  return (
    <section className="flex h-full min-h-[560px] min-w-0 flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(255,180,77,.12),transparent_35%),rgba(255,255,255,.04)] p-4 shadow-2xl shadow-black/24">
      <div className="mb-3 flex flex-none flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[.2em] text-[#ffcf83]">{t("image.workspace.resultStage")}</p>
          <h2 className="mt-1 text-base font-black text-white">{t("image.resultStack.title")}</h2>
          <p className="mt-1 text-xs text-white/42">
            {isLoading ? t("image.history.loadingJobs") : tf("image.resultStack.count", { count: visibleJobs.length })}
          </p>
        </div>
      </div>

      {error ? <div className="mb-3 flex-none break-words rounded-2xl border border-[#8c4632]/42 bg-[#2a1012]/72 px-3 py-2 text-xs leading-5 text-[#f2b3a1]">{error}</div> : null}
      {actionMessage ? <div className="mb-3 flex-none rounded-2xl border border-[#ffb44d]/20 bg-[#ffb44d]/10 px-3 py-2 text-xs text-[#ffd08a]">{actionMessage}</div> : null}
      {recoveredJobId ? <div className="mb-3 flex-none rounded-2xl border border-[#ffb44d]/20 bg-[#ffb44d]/8 px-3 py-2 text-xs text-[#ffd08a]/76">{t("image.workspace.recoveredJob")}</div> : null}

      <div className="se-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
        <div className="grid gap-3">
          {visibleJobs.length ? visibleJobs.map((job, jobIndex) => {
            const status = String(job.status || "");
            const resultKey = getImageHistoryStableKey(job, `image-result:${jobIndex}`);
            const isSelected = [job.dbJobId, job.jobId, job.id].filter(Boolean).some((value) => String(value) === String(currentJobId || ""));
            const isActive = isImageActiveStatus(status);
            const isCompleted = isImageCompletedStatus(status) && job.outputUrls.length > 0;
            const isFailed = isImageFailedStatus(status);
            const failureDisplay = isFailed ? getImageUserFacingErrorDisplay(job.errorMessage, t, {
              classificationMessage: job.errorClassificationMessage,
              errorCode: job.errorCode,
              publicMessage: getLocalizedImageHistoryPublicErrorMessage(job, locale),
              refunded: job.refunded,
              refundStatus: job.refundStatus,
            }) : null;

            return (
              <article
                className={`min-w-0 overflow-hidden rounded-[28px] border bg-[linear-gradient(180deg,rgba(17,19,24,0.72),rgba(5,7,11,0.86))] shadow-[0_18px_60px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.035)] ${isSelected ? "border-[#ffb44d]/42" : "border-white/10"}`}
                key={resultKey}
              >
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-white/10 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`se-status rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass(status)}`}>{getStatusLabel(status)}</span>
                      <span className="text-xs text-white/38">{formatTime(job.createdAt)}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-black leading-5 text-white">{job.prompt || t("image.history.untitled")}</p>
                    <p className="mt-1 truncate text-[11px] text-white/42">{job.model || t("image.model.label")} · {job.ratio || "auto"} {job.resolution ? `· ${job.resolution}` : ""}</p>
                  </div>
                  <button className={resultActionClass("normal")} onClick={() => onSelect(job)} type="button">{t("image.actions.viewDetails")}</button>
                </div>

                {isCompleted ? (
                  <div className={`grid gap-3 p-3 ${job.outputUrls.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                    {job.outputUrls.map((url, index) => {
                      const reusableUrl = getReusableImageOutputUrl(job, url);
                      const downloadKey = `download:${resultKey}:${index}`;
                      const referenceKey = `reference:${resultKey}:${index}`;
                      return (
                        <div className="min-w-0 overflow-hidden rounded-[22px] border border-white/10 bg-black/32" key={`${resultKey}:${index}`}>
                          <button className="block aspect-square w-full bg-black/50" onClick={() => onSelect(job)} type="button">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img alt={tf("image.output.label", { index: index + 1 })} className="h-full w-full object-contain" src={url} />
                          </button>
                          <div className="flex flex-wrap gap-2 border-t border-white/8 p-3">
                            <button className={resultActionClass("primary")} disabled={Boolean(busyAction)} onClick={() => void handleDownload(job, url, index)} type="button">
                              {busyAction === downloadKey ? t("image.actions.downloading") : t("image.actions.download")}
                            </button>
                            <button className={resultActionClass("normal")} disabled={!reusableUrl || Boolean(busyAction)} onClick={() => void handleReuseReference(job, url, index)} type="button">
                              {busyAction === referenceKey ? t("image.actions.addingReference") : t("image.actions.useAsReference")}
                            </button>
                            <SaveToAssetsButton className={resultActionClass("normal")} displayName={t("assets.save.generatedImage")} jobId={job.dbJobId || job.jobId || job.id} kind="image" outputUrl={url} />
                            <button className={resultActionClass("normal")} onClick={() => onUpscale?.({ sourceJobId: job.dbJobId || job.jobId || job.id, url, displayName: tf("image.output.imageLabel", { index: index + 1 }), ...outputDimensions(job) })} type="button">
                              {t("image.actions.upscale")}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : isActive ? (
                  <div className="grid min-h-[260px] place-items-center p-6 text-center">
                    <div>
                      <span className="mx-auto mb-5 block size-12 animate-pulse rounded-3xl border border-[#ffb44d]/30 bg-[#ffb44d]/20" />
                      <p className="text-lg font-black text-white">{getStatusLabel(status)}</p>
                      <p className="mt-2 text-sm leading-6 text-white/46">{t("image.workspace.checkingStatusHint")}</p>
                      <button className={`${resultActionClass("normal")} mt-4`} disabled={isPolling} onClick={() => onRefresh(job.dbJobId || job.jobId)} type="button">{t("image.actions.check")}</button>
                    </div>
                  </div>
                ) : isFailed ? (
                  <div className="grid min-h-[260px] place-items-center p-6 text-center">
                    <div className="max-w-md">
                      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-3xl border border-[#8c4632]/42 bg-[#2a1012] text-xl font-black text-[#f2b3a1]">!</div>
                      <p className="text-lg font-black text-[#f2b3a1]">{failureDisplay?.title || t("image.failure.title")}</p>
                      <p className="mt-2 text-sm leading-6 text-[#f2b3a1]/68">{failureDisplay?.message}</p>
                      <p className="mt-2 text-xs leading-5 text-[#ffd08a]/70">{failureDisplay?.suggestion}</p>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          }) : isGenerating ? (
            <div className="grid min-h-[420px] place-items-center rounded-[28px] border border-[#ffb44d]/20 bg-[#ffb44d]/8 p-6 text-center">
              <div>
                <span className="mx-auto mb-5 block size-12 animate-pulse rounded-3xl border border-[#ffb44d]/30 bg-[#ffb44d]/20" />
                <p className="text-lg font-black text-white">{t("image.workspace.generatingImage")}</p>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[420px] place-items-center rounded-[28px] border border-dashed border-white/12 bg-white/[.018] p-6 text-center">
              <div>
                <p className="text-base font-black text-white">{t("image.workspace.noImageYet")}</p>
                <p className="mt-2 text-sm leading-6 text-white/42">{t("image.workspace.noImageYetHint")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
