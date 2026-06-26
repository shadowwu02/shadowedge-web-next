"use client";

import { useMemo, useState } from "react";
import { MediaTypeIcon } from "@/components/video/MediaTypeIcon";
import { VideoModelLogo } from "@/components/video/VideoModelLogo";
import { useI18n } from "@/i18n/useI18n";
import { collectHistoryInputMediaAssets } from "@/lib/media-assets";
import { getSafeVideoHistoryView, isVideoStaleActiveRecord } from "@/lib/video/historyUtils";
import { getVideoUserFacingErrorDisplay } from "@/lib/video/videoErrorDisplay";
import { isVideoActiveStatus, isVideoCompletedStatus, isVideoFailedStatus } from "@/lib/utils";
import type { UploadMediaItem, VideoTaskRecord } from "@/types/video";

type VideoOutputDetailPanelProps = {
  getAddReferenceIssue?: (asset: UploadMediaItem) => string;
  getUseResultAsReferenceIssue?: (record: VideoTaskRecord) => string;
  onAddReference?: (asset: UploadMediaItem) => void;
  onFill?: (record: VideoTaskRecord) => void;
  onRetryAsDraft?: (record: VideoTaskRecord) => void;
  onUseResultAsReference?: (record: VideoTaskRecord) => void;
  record: VideoTaskRecord | null;
};

function safeDownloadFilename(view: ReturnType<typeof getSafeVideoHistoryView>) {
  const id = view.jobLabel && view.jobLabel !== "--" ? view.jobLabel : view.key || Date.now();
  return `shadowedge-video-${String(id).replace(/[^\w.-]+/g, "-")}.mp4`;
}

function actionButtonClass(tone: "normal" | "primary" = "normal") {
  if (tone === "primary") {
    return "se-button-secondary inline-flex min-h-9 items-center justify-center gap-2 rounded-[15px] px-3 text-xs font-semibold";
  }

  return "se-button-ghost inline-flex min-h-9 items-center justify-center gap-2 rounded-[15px] px-3 text-xs font-semibold";
}

function FillIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 6 6v4" />
    </svg>
  );
}

function AddReferenceIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <rect height="13" rx="2" width="13" x="9" y="9" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function statusClass(status: string, hasOutput: boolean, isStale = false) {
  if (isStale) return "se-status-paused";
  if (isVideoFailedStatus(status)) return "se-status-failed";
  if (isVideoCompletedStatus(status) && hasOutput) return "se-status-completed";
  if (isVideoActiveStatus(status)) return "se-status-processing";
  return "se-status-neutral";
}

function mediaTokenLabel(asset: UploadMediaItem, counts: Record<UploadMediaItem["type"], number>) {
  counts[asset.type] += 1;
  if (asset.type === "audio") return `@音频${counts.audio}`;
  if (asset.type === "video") return `@视频${counts.video}`;
  return `@图${counts.image}`;
}

function mediaTypeLabel(type: UploadMediaItem["type"], index: number, t: ReturnType<typeof useI18n>["t"]) {
  if (type === "audio") return `${t("video.media.audio")} ${index}`;
  if (type === "video") return `${t("video.media.video")} ${index}`;
  return `${t("video.media.image")} ${index}`;
}

function getRecordModelLogoLookup(record: VideoTaskRecord, modelLabel: string) {
  return [record.modelId, record.model, record.frontendModel, record.providerModel, record.provider, modelLabel].filter(Boolean).join(" ");
}

function getRecordMeta(record: VideoTaskRecord) {
  return record.meta && typeof record.meta === "object" && !Array.isArray(record.meta) ? (record.meta as Record<string, unknown>) : {};
}

function isRemakeRecord(record: VideoTaskRecord) {
  const meta = getRecordMeta(record);
  return meta.source === "remake" || meta.remake === true || meta.remake_source === "storyboard_shot";
}

export function VideoOutputDetailPanel({
  getAddReferenceIssue,
  getUseResultAsReferenceIssue,
  onAddReference,
  onFill,
  onRetryAsDraft,
  onUseResultAsReference,
  record,
}: VideoOutputDetailPanelProps) {
  const { t, tf } = useI18n();
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const view = record ? getSafeVideoHistoryView(record) : null;
  const referenceAssets = useMemo(() => (record ? collectHistoryInputMediaAssets([record]).slice(0, 12) : []), [record]);
  const mappedReferences = useMemo(() => {
    const counts: Record<UploadMediaItem["type"], number> = { audio: 0, image: 0, video: 0 };
    return referenceAssets.map((asset) => {
      const label = mediaTokenLabel(asset, counts);
      return {
        asset,
        label,
        readable: `${label} = ${mediaTypeLabel(asset.type, counts[asset.type], t)}`,
      };
    });
  }, [referenceAssets, t]);

  if (!record || !view) {
    return (
      <aside className="se-card-quiet flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] p-4 shadow-2xl shadow-black/18">
        <p className="se-eyebrow">{t("video.history.selectedDetail")}</p>
        <div className="grid min-h-0 flex-1 place-items-center text-center">
          <div className="max-w-[240px]">
            <span className="mx-auto mb-3 grid size-10 place-items-center rounded-[18px] border border-[#ffb44d]/24 bg-[#ffb44d]/10 text-[#ffd08a]">
              <svg aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <path d="m9 7 8 5-8 5Z" />
                <path d="M4 5h2" />
                <path d="M4 12h2" />
                <path d="M4 19h2" />
              </svg>
            </span>
            <p className="text-sm font-semibold text-[#f4f4f4]">{t("video.generation.empty.title")}</p>
            <p className="mt-2 text-xs leading-5 text-[#b9b9b9]/55">{t("video.generation.empty.body")}</p>
          </div>
        </div>
      </aside>
    );
  }

  const hasOutput = Boolean(view.outputUrl);
  const isFailed = isVideoFailedStatus(view.status);
  const isSuccess = isVideoCompletedStatus(view.status) && hasOutput;
  const isStaleActive = isVideoStaleActiveRecord(record);
  const isProcessing = isVideoActiveStatus(view.status) && !isStaleActive;
  const useResultIssue = getUseResultAsReferenceIssue?.(record) || "";
  const modelLogoLookup = getRecordModelLogoLookup(record, view.modelLabel);
  const failureDisplay = isFailed
    ? getVideoUserFacingErrorDisplay(view.errorMessage, t, {
        context: isRemakeRecord(record) ? "remake" : "video",
        errorCode: view.errorCode,
        refunded: view.refunded,
        refundStatus: view.refundStatus,
      })
    : null;
  const statusLabel = isStaleActive
    ? t("video.generation.stale")
    : isFailed
      ? t("video.status.failed")
      : isSuccess
        ? t("video.status.completed")
        : isProcessing
          ? t("video.status.processing")
          : view.statusLabel;

  return (
    <aside className="se-card-quiet flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] shadow-2xl shadow-black/18">
      <div className="flex flex-none items-start justify-between gap-3 border-b border-[rgba(244,244,244,0.08)] p-4">
        <div className="min-w-0">
          <p className="se-eyebrow">{t("video.history.selectedDetail")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`se-status rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(view.status, hasOutput, isStaleActive)}`}>
              {statusLabel}
            </span>
            {view.refundNotice ? (
              <span className="se-status se-status-refunded rounded-full px-2.5 py-1 text-[10px] font-semibold">
                {t("video.generation.refunded")}
              </span>
            ) : null}
            <span className="inline-flex min-w-0 items-center gap-1.5 truncate rounded-full border border-[rgba(244,244,244,0.08)] bg-[#1a1c22]/74 px-2.5 py-1 text-[10px] font-semibold text-[#f4f4f4]/78">
              <VideoModelLogo label={view.modelLabel} lookup={modelLogoLookup} size="sm" />
              {view.modelLabel}
            </span>
          </div>
        </div>
        <span className="shrink-0 text-[11px] text-[#b9b9b9]/45">{view.createdAtLabel}</span>
      </div>

      <div className="se-scrollbar min-h-0 flex-1 space-y-3.5 overflow-y-auto p-4">
        <button
          className="group/prompt w-full rounded-[22px] border border-[rgba(244,244,244,0.08)] bg-[#1a1c22]/52 p-3.5 text-left shadow-inner shadow-black/10 transition-colors hover:border-[#ffb44d]/30 hover:bg-[#ffb44d]/8 disabled:cursor-default disabled:hover:border-[rgba(244,244,244,0.08)] disabled:hover:bg-[#1a1c22]/52"
          disabled={!onFill}
          onClick={() => onFill?.(record)}
          title={onFill ? t("video.generation.fillPrompt") : undefined}
          type="button"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="se-eyebrow">{t("video.generation.prompt")}</span>
            <span className="text-[10px] font-semibold text-[#b9b9b9]/45 transition group-hover/prompt:text-[#ffd08a]/78">
              {onFill ? t("video.generation.reusePrompt") : view.createdAtLabel}
            </span>
          </div>
          <p className={`${isPromptExpanded ? "" : "line-clamp-6"} text-[13px] font-normal leading-6 text-[#f4f4f4]/84`}>{view.title}</p>
        </button>
        <button
          className="se-button-ghost -mt-2 inline-flex min-h-8 items-center justify-center rounded-full px-3 text-[11px] font-semibold"
          onClick={() => setIsPromptExpanded((current) => !current)}
          type="button"
        >
          {isPromptExpanded ? t("video.generation.collapsePrompt") : t("video.generation.expandPrompt")}
        </button>

        <div className="se-card rounded-[22px] p-3.5 shadow-inner shadow-black/8">
          <div className="mb-2 flex items-center justify-between">
            <span className="se-eyebrow">{t("video.generation.references")}</span>
            <span className="text-[10px] text-[#b9b9b9]/45">{referenceAssets.length}</span>
          </div>
          {mappedReferences.length ? (
            <div className="space-y-2">
              {mappedReferences.map(({ asset, label, readable }) => {
                const issue = getAddReferenceIssue?.(asset) || "";
                const isBlocked = Boolean(issue);
                return (
                  <button
                    className="group/ref grid w-full grid-cols-[42px_minmax(0,1fr)] items-center gap-2 rounded-[16px] border border-[rgba(244,244,244,0.08)] bg-[#111318]/66 p-1.5 text-left transition-colors hover:border-[#ffb44d]/30 hover:bg-[#ffb44d]/8 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={isBlocked || !onAddReference}
                    key={`${asset.id}-${asset.url}-${label}`}
                    onClick={() => onAddReference?.(asset)}
                    title={issue || t("video.generation.addReference")}
                    type="button"
                  >
                    <span className="grid aspect-square place-items-center overflow-hidden rounded-[12px] bg-[#05070b] text-[10px] font-semibold text-[#b9b9b9]/65">
                      {asset.type === "image" && (asset.previewUrl || asset.url) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="h-full w-full object-cover" src={asset.previewUrl || asset.url} />
                      ) : asset.type === "video" && asset.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="h-full w-full object-cover" src={asset.previewUrl} />
                      ) : (
                        <MediaTypeIcon className="size-4 text-[#ffd08a]/70" type={asset.type} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-semibold text-[#f4f4f4]/80">{readable}</span>
                      <span className="block truncate text-[10px] text-[#b9b9b9]/45">
                        {isBlocked ? issue : t("video.generation.addReference")}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-[16px] border border-dashed border-[rgba(244,244,244,0.10)] bg-[#111318]/50 p-3 text-xs leading-5 text-[#b9b9b9]/48">
              {t("video.generation.noReferences")}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-[#b9b9b9]/70">
          <span className="se-pill truncate rounded-[14px] px-2.5 py-2">{view.quality}</span>
          <span className="se-pill truncate rounded-[14px] px-2.5 py-2">{view.duration}</span>
          <span className="se-pill truncate rounded-[14px] px-2.5 py-2">{view.ratio}</span>
          <span className="se-pill truncate rounded-[14px] px-2.5 py-2">{tf("video.history.job", { job: view.jobLabel })}</span>
        </div>

        {isFailed || isStaleActive ? (
          <div className="rounded-[20px] border border-[#8c4632]/42 bg-[#2a1012] p-3 text-xs leading-5 text-[#f2b3a1]/72">
            <p className="font-bold text-[#f2b3a1]/90">{isStaleActive ? t("video.generation.stale") : failureDisplay?.title}</p>
            <p className="mt-1">{isStaleActive ? t("video.result.staleBody") : failureDisplay?.message}</p>
            {!isStaleActive && failureDisplay?.suggestion ? <p className="mt-1 text-[#ffd08a]/70">{failureDisplay.suggestion}</p> : null}
            {view.refundNotice ? <p className="mt-1 text-[#ffd08a]/70">{view.refundNotice}</p> : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-none flex-wrap gap-2 border-t border-[rgba(244,244,244,0.08)] p-4">
        {hasOutput ? (
          <a
            className={actionButtonClass("primary")}
            href={view.outputUrl}
            rel="noreferrer"
            target="_blank"
          >
            {t("video.generation.openResult")}
          </a>
        ) : null}
        {onFill ? (
          <button aria-label={t("video.generation.reusePrompt")} className={actionButtonClass("normal")} onClick={() => onFill(record)} title={t("video.generation.reusePrompt")} type="button">
            <FillIcon />
            {t("video.generation.reusePrompt")}
          </button>
        ) : null}
        {hasOutput && onUseResultAsReference ? (
          <button
            aria-label={t("video.history.reuseAsVideoDraft")}
            className={actionButtonClass("normal")}
            disabled={Boolean(useResultIssue)}
            onClick={() => onUseResultAsReference(record)}
            title={useResultIssue || t("video.history.reuseAsVideoDraftTitle")}
            type="button"
          >
            <AddReferenceIcon />
            {t("video.generation.reuseAsVideoDraft")}
          </button>
        ) : null}
        {hasOutput ? (
          <a
            aria-label={t("video.generation.downloadResult")}
            className={actionButtonClass("normal")}
            download={safeDownloadFilename(view)}
            href={view.outputUrl}
            rel="noreferrer"
            target="_blank"
            title={t("video.generation.downloadResult")}
          >
            <DownloadIcon />
            {t("video.generation.downloadResult")}
          </a>
        ) : null}
        {isFailed || isStaleActive ? (
          <button
            aria-label={t("video.history.retryAsDraft")}
            className={actionButtonClass("primary")}
            disabled={!onRetryAsDraft}
            onClick={() => onRetryAsDraft?.(record)}
            title={t("video.history.draftOnlyHint")}
            type="button"
          >
            <RetryIcon />
            {t("video.history.retryAsDraft")}
          </button>
        ) : null}
        {view.jobLabel && view.jobLabel !== "--" ? (
          <button
            className={actionButtonClass("normal")}
            onClick={() => {
              void navigator.clipboard?.writeText(view.jobLabel);
            }}
            title={t("video.generation.copyJobId")}
            type="button"
          >
            <CopyIcon />
            {t("video.generation.copyJobId")}
          </button>
        ) : null}
        {hasOutput && useResultIssue ? <span className="w-full text-[11px] leading-4 text-[#b9b9b9]/45">{useResultIssue}</span> : null}
      </div>
    </aside>
  );
}
