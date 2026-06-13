"use client";

import { VideoModelLogo } from "@/components/video/VideoModelLogo";
import { getImageUserFacingError } from "@/lib/image/imageErrorDisplay";
import { isImageActiveStatus, isImageCompletedStatus, isImageFailedStatus } from "@/lib/image/imageHistoryUtils";
import { getImageHistoryModelLogoLookup } from "@/lib/image/imageModelLogo";
import { useI18n } from "@/i18n/useI18n";
import { formatTime } from "@/lib/utils";
import type { ImageHistoryItem } from "@/types/image";

function CopyIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <rect height="13" rx="2" stroke="currentColor" strokeWidth="2" width="13" x="9" y="9" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path d="M14 4h6v6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="m10 14 10-10" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
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

function DetailRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="rounded-[16px] border border-white/8 bg-white/[.03] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#b9b9b9]/40">{label}</p>
      <p className="mt-1 truncate text-xs font-semibold text-[#f4f4f4]/78">{value || "--"}</p>
    </div>
  );
}

export function ImageOutputDetailPanel({ job }: { job: ImageHistoryItem | null }) {
  const { t, tf } = useI18n();

  if (!job) {
    return (
      <section className="se-card-quiet rounded-[26px] p-4">
        <p className="se-eyebrow">{t("image.detail.title")}</p>
        <div className="grid min-h-[180px] place-items-center text-center">
          <div>
            <p className="text-sm font-semibold text-[#f4f4f4]">{t("image.detail.selectJob")}</p>
            <p className="mt-2 text-xs leading-5 text-[#b9b9b9]/52">{t("image.detail.emptyHint")}</p>
          </div>
        </div>
      </section>
    );
  }

  const status = String(job.status || "");
  const isFailed = isImageFailedStatus(status);
  const chargedCredits = job.cost || job.creditsCharged || 0;
  const modelLogoLookup = getImageHistoryModelLogoLookup(job);
  const displayedErrorMessage = getImageUserFacingError(job.errorMessage, t);
  const statusLabel = (() => {
    if (isImageFailedStatus(status)) return t("image.status.failed");
    if (isImageCompletedStatus(status)) return t("image.status.completed");
    if (isImageActiveStatus(status)) return t("image.status.processing");
    return status || t("image.status.unknown");
  })();

  return (
    <section className="se-card-quiet rounded-[26px] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="se-eyebrow">{t("image.detail.title")}</p>
          <h3 className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-sm font-black text-[#f4f4f4]">
            <VideoModelLogo label={job.model || t("image.detail.imageJob")} lookup={modelLogoLookup} size="sm" />
            <span className="truncate">{job.model || t("image.detail.imageJob")}</span>
          </h3>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <span className={`se-status rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(status)}`}>{statusLabel}</span>
          <button
            className="se-button-ghost rounded-full px-3 py-1.5 text-[11px] font-semibold"
            onClick={() => void navigator.clipboard?.writeText(job.dbJobId || job.jobId)}
            type="button"
          >
            {t("image.actions.copyJobId")}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-[18px] border border-white/8 bg-[#05070b]/52 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#b9b9b9]/40">{t("image.prompt.label")}</p>
          <p className="line-clamp-5 text-xs leading-5 text-[#f4f4f4]/78">{job.prompt || "--"}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <DetailRow label={t("image.detail.status")} value={statusLabel} />
          <DetailRow label={t("image.detail.created")} value={formatTime(job.createdAt)} />
          <DetailRow label={t("image.detail.ratio")} value={job.ratio || "auto"} />
          <DetailRow label={t("image.detail.resolution")} value={job.resolution || job.quality || "--"} />
          <DetailRow label={t("image.detail.batch")} value={job.batchCount} />
          <DetailRow label={t("image.detail.cost")} value={chargedCredits ? tf("image.failure.cost", { credits: chargedCredits }) : "--"} />
          <DetailRow label={t("image.detail.references")} value={job.referenceCount} />
        </div>

        {isFailed ? (
          <div className="rounded-[18px] border border-[#8c4632]/42 bg-[#2a1012]/72 px-3 py-2 text-xs leading-5 text-[#f2b3a1]">
            <p className="font-semibold">{displayedErrorMessage || t("image.failure.generic")}</p>
            <p className="mt-1 text-[#f2b3a1]/68">{t("image.failure.refundHint")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {chargedCredits ? (
                <span className="rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 text-[10px] font-semibold text-[#f4f4f4]/68">{tf("image.failure.cost", { credits: chargedCredits })}</span>
              ) : null}
              {job.refunded || job.refundStatus === "refunded" ? (
                <span className="rounded-full border border-[#ffb44d]/20 bg-[#ffb44d]/10 px-2.5 py-1 text-[10px] font-semibold text-[#ffd08a]">{t("image.status.refunded")}</span>
              ) : null}
            </div>
          </div>
        ) : displayedErrorMessage ? (
          <div className="rounded-[18px] border border-[#8c4632]/42 bg-[#2a1012]/72 px-3 py-2 text-xs leading-5 text-[#f2b3a1]">{displayedErrorMessage}</div>
        ) : null}

        {job.outputUrls.length ? (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#b9b9b9]/40">{t("image.detail.outputUrls")}</p>
            {job.outputUrls.map((url, index) => (
              <div className="rounded-[16px] border border-white/8 bg-white/[.03] px-3 py-2" key={`${url}-${index}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[11px] font-semibold text-[#ffd08a]">{tf("image.output.imageLabel", { index: index + 1 })}</p>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <button
                      className="se-button-ghost inline-flex min-h-7 items-center gap-1.5 rounded-full px-2 text-[10px] font-semibold"
                      onClick={() => void navigator.clipboard?.writeText(url)}
                      type="button"
                    >
                      <CopyIcon />
                      {t("image.actions.copyUrl")}
                    </button>
                    <a className="se-button-secondary inline-flex min-h-7 items-center gap-1.5 rounded-full px-2 text-[10px] font-semibold" href={url} rel="noreferrer" target="_blank">
                      <ExternalIcon />
                      {t("image.actions.open")}
                    </a>
                    <a
                      className="se-button-secondary inline-flex min-h-7 items-center gap-1.5 rounded-full px-2 text-[10px] font-semibold"
                      download={`shadowedge-image-${index + 1}.png`}
                      href={url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <DownloadIcon />
                      {t("image.actions.download")}
                    </a>
                  </div>
                </div>
                <p className="mt-1 truncate text-[10px] text-[#b9b9b9]/42">{url}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
