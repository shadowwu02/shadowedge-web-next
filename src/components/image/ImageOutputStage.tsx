"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isImageActiveStatus, isImageCompletedStatus, isImageFailedStatus } from "@/lib/image/imageHistoryUtils";
import { getImageUserFacingError } from "@/lib/image/imageErrorDisplay";
import { getReusableImageOutputUrl, sendImageResultToImageDraft } from "@/lib/image/imageResultDrafts";
import { sendImageResultToVideoDraft } from "@/lib/video/videoResultDrafts";
import { useI18n } from "@/i18n/useI18n";
import { formatTime } from "@/lib/utils";
import type { ImageHistoryItem } from "@/types/image";

function CopyIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <rect height="13" rx="2" stroke="currentColor" strokeWidth="2" width="13" x="9" y="9" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <path d="M14 4h6v6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="m10 14 10-10" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <path d="M12 3v11" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="m7 10 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M5 20h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function statusClass(status: string) {
  if (isImageFailedStatus(status)) return "se-status-failed";
  if (isImageCompletedStatus(status)) return "se-status-completed";
  if (isImageActiveStatus(status)) return "se-status-processing";
  return "se-status-neutral";
}

function outputActionClass(tone: "normal" | "primary" = "normal") {
  if (tone === "primary") {
    return "se-button-secondary inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-45";
  }
  return "se-button-ghost inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-45";
}

export function ImageOutputStage({
  error,
  isGenerating,
  isPolling,
  job,
  onRefresh,
  recoveredJobId,
}: {
  error?: string;
  isGenerating?: boolean;
  isPolling?: boolean;
  job: ImageHistoryItem | null;
  onRefresh?: (jobId: string) => void;
  recoveredJobId?: string;
}) {
  const router = useRouter();
  const { t, tf } = useI18n();
  const [actionError, setActionError] = useState("");
  const status = String(job?.status || "");
  const isActive = Boolean(job && isImageActiveStatus(status));
  const isFailed = Boolean(job && isImageFailedStatus(status));
  const isCompleted = Boolean(job && isImageCompletedStatus(status) && job.outputUrls.length);
  const isRecoveredActiveJob = Boolean(job && recoveredJobId && [job.dbJobId, job.jobId, job.id].filter(Boolean).some((value) => String(value) === String(recoveredJobId)));
  const displayedErrorMessage = getImageUserFacingError(job?.errorMessage || error, t, {
    errorCode: job?.errorCode,
    refunded: job?.refunded,
    refundStatus: job?.refundStatus,
  });
  const localizedStatus = (() => {
    if (!status) return t("image.status.unknown");
    if (isImageFailedStatus(status)) return t("image.status.failed");
    if (isImageCompletedStatus(status)) return t("image.status.completed");
    if (isImageActiveStatus(status)) return t("image.status.processing");
    return status;
  })();
  const handleSendToVideoDraft = (outputUrl: string, outputIndex: number) => {
    if (!job) return;
    setActionError("");
    const result = sendImageResultToVideoDraft(
      { image: job, outputIndex, outputUrl },
      t("image.actions.imageAddedToVideoDraft"),
    );

    if (!result) {
      setActionError(t("image.actions.noReusableImageUrl"));
      return;
    }

    router.push("/workspace/video?from=image-result");
  };
  const handleUseAsReference = (outputUrl: string, outputIndex: number) => {
    if (!job) return;
    setActionError("");
    const result = sendImageResultToImageDraft(
      { image: job, outputIndex, outputUrl },
      t("image.actions.imageAddedAsReferenceDraft"),
    );

    if (!result) {
      setActionError(t("image.actions.noReusableImageUrl"));
      return;
    }

    window.location.assign("/workspace/image?from=image-result");
  };

  return (
    <section className="se-panel flex h-full min-h-[520px] flex-col overflow-hidden rounded-[34px] p-4 shadow-2xl shadow-black/24">
      <div className="mb-3 flex flex-none flex-wrap items-start justify-between gap-3">
        <div>
          <p className="se-eyebrow">{t("image.workspace.latestOutput")}</p>
          <h2 className="mt-1 text-lg font-black text-[#f4f4f4]">{t("image.workspace.resultStage")}</h2>
          <p className="mt-1 text-xs text-[#b9b9b9]/48">
            {job ? `${job.model || t("image.model.label")} - ${formatTime(job.createdAt)}` : t("image.workspace.generatedImagesHint")}
          </p>
          {actionError ? <p className="mt-1 text-xs font-semibold text-[#f2b3a1]/78">{actionError}</p> : null}
        </div>
        {job ? (
          <div className="flex items-center gap-2">
            <span className={`se-status rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(status)}`}>{localizedStatus}</span>
            {isActive && onRefresh ? (
              <button
                className="se-button-secondary rounded-full px-3 py-1.5 text-[11px] font-semibold"
                onClick={() => onRefresh(job.dbJobId || job.jobId)}
                type="button"
              >
                {t("image.actions.check")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="relative grid min-h-0 flex-1 place-items-center overflow-hidden rounded-[28px] border border-white/10 bg-[#05070b]/80 p-3">
        {isRecoveredActiveJob ? (
          <div className="absolute left-6 right-6 top-[86px] z-10 rounded-full border border-[#ffb44d]/20 bg-[#2a1b08]/88 px-3 py-2 text-center text-[11px] font-semibold text-[#ffd08a] shadow-lg shadow-black/20">
            {t("image.workspace.recoveredJob")}
          </div>
        ) : null}
        {!job ? (
          <div className="max-w-md text-center">
            <div className="mx-auto mb-5 grid size-16 place-items-center rounded-[28px] border border-[#ffb44d]/20 bg-[#ffb44d]/10 text-[#ffd08a]">
              <svg aria-hidden="true" className="size-7" fill="none" viewBox="0 0 24 24">
                <rect height="16" rx="3" stroke="currentColor" strokeWidth="2" width="18" x="3" y="4" />
                <path d="m7 16 3-3 2 2 3-4 2 5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <p className="text-xl font-black text-[#f4f4f4]">{t("image.workspace.noImageYet")}</p>
            <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/55">{t("image.workspace.noImageYetHint")}</p>
          </div>
        ) : isCompleted ? (
          <div className="se-scrollbar h-full w-full overflow-y-auto">
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {job.outputUrls.map((url, index) => (
                <article className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(30,27,23,0.88),rgba(12,13,14,0.78))] shadow-[0_18px_60px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.04)]" key={`${url}-${index}`}>
                  <button className="block aspect-square w-full bg-black/40" onClick={() => window.open(url, "_blank", "noopener,noreferrer")} type="button">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={tf("image.output.label", { index: index + 1 })} className="h-full w-full object-contain" src={url} />
                  </button>
                  <div className="grid gap-2 border-t border-white/8 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-[#f4f4f4]/72">{tf("image.output.imageLabel", { index: index + 1 })}</span>
                      <span className="truncate text-[10px] text-[#b9b9b9]/42">{job.model || t("image.model.label")}</span>
                    </div>
                    <span className="flex flex-wrap items-center gap-1">
                      <button
                        className={outputActionClass("normal")}
                        onClick={() => void navigator.clipboard?.writeText(url)}
                        type="button"
                      >
                        <CopyIcon />
                        {t("image.actions.copy")}
                      </button>
                      <button
                        className={outputActionClass("normal")}
                        disabled={!job.prompt}
                        onClick={() => void navigator.clipboard?.writeText(job.prompt || "")}
                        type="button"
                      >
                        <CopyIcon />
                        {t("image.actions.copyPrompt")}
                      </button>
                      <a className={outputActionClass("primary")} download={`shadowedge-image-${index + 1}.png`} href={url} rel="noreferrer" target="_blank">
                        <DownloadIcon />
                        {t("image.actions.download")}
                      </a>
                      <a className={outputActionClass("normal")} href={url} rel="noreferrer" target="_blank">
                        <ExternalIcon />
                        {t("image.actions.open")}
                      </a>
                      <button
                        className={outputActionClass("normal")}
                        disabled={!getReusableImageOutputUrl(job, url)}
                        onClick={() => handleUseAsReference(url, index)}
                        title={getReusableImageOutputUrl(job, url) ? t("image.actions.imageAddedAsReferenceDraft") : t("image.actions.noReusableImageUrl")}
                        type="button"
                      >
                        {t("image.actions.useAsReference")}
                      </button>
                      <button
                        className={outputActionClass("normal")}
                        disabled={!getReusableImageOutputUrl(job, url)}
                        onClick={() => handleSendToVideoDraft(url, index)}
                        title={getReusableImageOutputUrl(job, url) ? t("image.actions.imageAddedToVideoDraft") : t("image.actions.noReusableImageUrl")}
                        type="button"
                      >
                        {t("image.actions.sendToVideoDraft")}
                      </button>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : isActive || isGenerating || isPolling ? (
          <div className="max-w-md text-center">
            <span className="mx-auto mb-5 block size-14 animate-pulse rounded-[24px] border border-[#ffb44d]/30 bg-[#ffb44d]/20" />
            <p className="text-xl font-black text-[#f4f4f4]">{t("image.workspace.generatingImage")}</p>
            <p className="mt-2 text-sm leading-6 text-[#b9b9b9]/55">{t("image.workspace.checkingStatusHint")}</p>
            <p className="mt-3 text-xs text-[#b9b9b9]/35">{job?.dbJobId || job?.jobId}</p>
          </div>
        ) : isFailed ? (
          <div className="max-w-md text-center">
            <div className="mx-auto mb-5 grid size-14 place-items-center rounded-[24px] border border-[#8c4632]/42 bg-[#2a1012] text-xl font-black text-[#f2b3a1]">!</div>
            <p className="text-xl font-black text-[#f2b3a1]">{t("image.failure.title")}</p>
            <p className="mt-2 text-sm leading-6 text-[#f2b3a1]/68">{displayedErrorMessage || t("image.failure.generic")}</p>
            <p className="mt-3 text-xs leading-5 text-[#b9b9b9]/52">
              {t("image.failure.refundHint")}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {job.cost || job.creditsCharged ? (
                <span className="inline-flex rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-xs font-semibold text-[#b9b9b9]/70">
                  {tf("image.failure.cost", { credits: job.cost || job.creditsCharged })}
                </span>
              ) : null}
              {job.refunded || job.refundStatus === "refunded" ? (
                <span className="inline-flex rounded-full border border-[#ffb44d]/20 bg-[#ffb44d]/10 px-3 py-1 text-xs font-semibold text-[#ffd08a]">{t("image.status.refunded")}</span>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                className={outputActionClass("normal")}
                disabled={!job.prompt}
                onClick={() => void navigator.clipboard?.writeText(job.prompt || "")}
                type="button"
              >
                <CopyIcon />
                {t("image.actions.copyPrompt")}
              </button>
              <button className={outputActionClass("normal")} disabled title={t("image.actions.comingSoonDraftOnly")} type="button">
                {t("image.actions.retryAsDraft")}
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-md text-center text-sm text-[#b9b9b9]/55">{t("image.workspace.waitingForOutput")}</div>
        )}
      </div>
    </section>
  );
}
