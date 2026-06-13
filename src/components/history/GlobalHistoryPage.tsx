"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { VideoModelLogo } from "@/components/video/VideoModelLogo";
import { getImageHistory } from "@/lib/image-api";
import { getImageUserFacingError } from "@/lib/image/imageErrorDisplay";
import { getImageHistoryTime, isImageActiveStatus, isImageCompletedStatus, isImageFailedStatus } from "@/lib/image/imageHistoryUtils";
import { getImageHistoryModelLogoLookup } from "@/lib/image/imageModelLogo";
import { collectHistoryInputMediaAssets } from "@/lib/media-assets";
import { getVideoHistory } from "@/lib/video-api";
import { getSafeVideoHistoryView, getVideoHistoryStableKey, getVideoHistoryTime, isVideoStaleActiveRecord } from "@/lib/video/historyUtils";
import { useI18n } from "@/i18n/useI18n";
import { formatTime, isVideoActiveStatus, isVideoCompletedStatus, isVideoFailedStatus } from "@/lib/utils";
import type { ImageHistoryItem } from "@/types/image";
import type { VideoTaskRecord } from "@/types/video";

type GlobalHistoryFilter = "all" | "image" | "video" | "remake" | "completed" | "failed" | "processing";
type GlobalHistoryKind = "image" | "remake" | "video";
type GlobalHistoryStatus = "completed" | "failed" | "processing" | "unknown";

type GlobalHistoryItem = {
  cost: number;
  createdAt: string | number;
  createdAtLabel: string;
  detailRows: Array<{ label: string; value: string | number }>;
  errorMessage: string;
  jobId: string;
  key: string;
  kind: GlobalHistoryKind;
  modelLabel: string;
  modelLogoLookup: string;
  outputUrl: string;
  outputUrls: string[];
  previewUrl: string;
  prompt: string;
  rawImage?: ImageHistoryItem;
  rawVideo?: VideoTaskRecord;
  referenceCount: number;
  remakeAnalysisId?: string;
  remakeShotNumber?: string;
  status: GlobalHistoryStatus;
  statusLabel: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function pickString(...values: unknown[]) {
  return values.find((value) => typeof value === "string" && value.trim()) as string | undefined;
}

function pickNumber(...values: unknown[]) {
  return values.map((value) => Number(value)).find((value) => Number.isFinite(value) && value > 0) || 0;
}

function statusClass(status: GlobalHistoryStatus) {
  if (status === "failed") return "se-status-failed";
  if (status === "completed") return "se-status-completed";
  if (status === "processing") return "se-status-processing";
  return "se-status-neutral";
}

function getKindLabel(kind: GlobalHistoryKind, t: ReturnType<typeof useI18n>["t"]) {
  if (kind === "image") return t("history.global.type.image");
  if (kind === "remake") return t("history.global.type.remake");
  return t("history.global.type.video");
}

function getStatusLabel(status: GlobalHistoryStatus, t: ReturnType<typeof useI18n>["t"]) {
  if (status === "completed") return t("history.global.status.completed");
  if (status === "failed") return t("history.global.status.failed");
  if (status === "processing") return t("history.global.status.processing");
  return t("history.global.status.unknown");
}

function getRemakeMeta(record: VideoTaskRecord) {
  const meta = asRecord(record.meta);
  const raw = asRecord(record);
  const request = asRecord(raw.request);
  const rawPayload = asRecord(raw.raw);
  const candidates = [meta, asRecord(raw.metadata), asRecord(request.meta), asRecord(rawPayload.meta), asRecord(raw.params), asRecord(raw.data)];
  return candidates.find((item) => Object.keys(item).length) || meta;
}

function isRemakeRecord(record: VideoTaskRecord) {
  const meta = getRemakeMeta(record);
  return meta.source === "remake" || meta.remake === true || meta.remake_source === "storyboard_shot";
}

function getVideoModelLogoLookup(record: VideoTaskRecord, modelLabel: string) {
  return [record.modelId, record.model, record.frontendModel, record.providerModel, record.provider, modelLabel].filter(Boolean).join(" ");
}

function makeImageHistoryItem(item: ImageHistoryItem, t: ReturnType<typeof useI18n>["t"]): GlobalHistoryItem {
  const rawStatus = String(item.status || "");
  const status: GlobalHistoryStatus = isImageFailedStatus(rawStatus)
    ? "failed"
    : isImageCompletedStatus(rawStatus)
      ? "completed"
      : isImageActiveStatus(rawStatus)
        ? "processing"
        : "unknown";
  const jobId = item.dbJobId || item.jobId || item.id || "";
  const cost = item.cost || item.creditsCharged || 0;

  return {
    cost,
    createdAt: item.createdAt,
    createdAtLabel: formatTime(item.createdAt),
    detailRows: [
      { label: t("history.global.detail.ratio"), value: item.ratio || "auto" },
      { label: t("history.global.detail.resolution"), value: item.resolution || item.quality || "--" },
      { label: t("history.global.detail.batch"), value: item.batchCount || 1 },
      { label: t("history.global.detail.references"), value: item.referenceCount || 0 },
      { label: t("history.global.detail.outputs"), value: item.outputUrls.length || (item.outputUrl ? 1 : 0) },
    ],
    errorMessage: status === "failed" ? getImageUserFacingError(item.errorMessage, t) : "",
    jobId,
    key: `image:${jobId || item.id || getImageHistoryTime(item)}`,
    kind: "image",
    modelLabel: item.model || t("history.global.type.image"),
    modelLogoLookup: getImageHistoryModelLogoLookup(item),
    outputUrl: item.outputUrl || item.outputUrls[0] || "",
    outputUrls: item.outputUrls || [],
    previewUrl: item.outputUrl || item.outputUrls[0] || "",
    prompt: item.prompt || t("history.global.untitledImage"),
    rawImage: item,
    referenceCount: item.referenceCount || 0,
    status,
    statusLabel: getStatusLabel(status, t),
  };
}

function makeVideoHistoryItem(record: VideoTaskRecord, t: ReturnType<typeof useI18n>["t"]): GlobalHistoryItem {
  const view = getSafeVideoHistoryView(record);
  const outputUrl = view.outputUrl;
  const isStale = isVideoStaleActiveRecord(record);
  const status: GlobalHistoryStatus = isVideoFailedStatus(view.status)
    ? "failed"
    : isVideoCompletedStatus(view.status) && Boolean(outputUrl)
      ? "completed"
      : isVideoActiveStatus(view.status) && !isStale
        ? "processing"
        : "unknown";
  const meta = getRemakeMeta(record);
  const kind: GlobalHistoryKind = isRemakeRecord(record) ? "remake" : "video";
  const analysisId = pickString(meta.analysisId, meta.analysis_id);
  const shotNumber = pickString(meta.shotNumber, meta.shot_number) || (pickNumber(meta.shotNumber, meta.shot_number) ? String(pickNumber(meta.shotNumber, meta.shot_number)) : "");
  const referenceCount = collectHistoryInputMediaAssets([record]).length;
  const outputUrls = record.outputUrls?.length ? record.outputUrls : outputUrl ? [outputUrl] : [];
  const cost = Number(record.cost_credits || asRecord(record.meta).cost_credits || 0) || 0;

  return {
    cost,
    createdAt: view.createdAt,
    createdAtLabel: view.createdAtLabel,
    detailRows: [
      { label: t("history.global.detail.duration"), value: view.duration },
      { label: t("history.global.detail.ratio"), value: view.ratio },
      { label: t("history.global.detail.quality"), value: view.quality },
      { label: t("history.global.detail.references"), value: referenceCount },
      ...(kind === "remake" && shotNumber ? [{ label: t("history.global.detail.shot"), value: shotNumber }] : []),
    ],
    errorMessage: status === "failed" ? view.errorMessage : "",
    jobId: view.jobLabel === "--" ? getVideoHistoryStableKey(record, "") : view.jobLabel,
    key: `${kind}:${getVideoHistoryStableKey(record, view.key)}`,
    kind,
    modelLabel: view.modelLabel,
    modelLogoLookup: getVideoModelLogoLookup(record, view.modelLabel),
    outputUrl,
    outputUrls,
    previewUrl: view.thumbnailUrl || outputUrl,
    prompt: view.title || (kind === "remake" ? t("history.global.untitledRemake") : t("history.global.untitledVideo")),
    rawVideo: record,
    referenceCount,
    remakeAnalysisId: analysisId,
    remakeShotNumber: shotNumber,
    status,
    statusLabel: getStatusLabel(status, t),
  };
}

function filterItem(item: GlobalHistoryItem, filter: GlobalHistoryFilter) {
  if (filter === "image") return item.kind === "image";
  if (filter === "video") return item.kind === "video";
  if (filter === "remake") return item.kind === "remake";
  if (filter === "completed") return item.status === "completed";
  if (filter === "failed") return item.status === "failed";
  if (filter === "processing") return item.status === "processing";
  return true;
}

function matchesSearch(item: GlobalHistoryItem, query: string) {
  const value = query.trim().toLowerCase();
  if (!value) return true;
  return [item.prompt, item.modelLabel, item.jobId, item.remakeAnalysisId, item.remakeShotNumber, item.kind]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(value);
}

function downloadFilename(item: GlobalHistoryItem, index = 0) {
  const extension = item.kind === "image" ? "png" : "mp4";
  const id = item.jobId || item.key || Date.now();
  return `shadowedge-${item.kind}-${String(id).replace(/[^\w.-]+/g, "-")}-${index + 1}.${extension}`;
}

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

export function GlobalHistoryPage() {
  const { t, tf } = useI18n();
  const [imageHistory, setImageHistory] = useState<ImageHistoryItem[]>([]);
  const [videoHistory, setVideoHistory] = useState<VideoTaskRecord[]>([]);
  const [filter, setFilter] = useState<GlobalHistoryFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setError("");

    const [imageResult, videoResult] = await Promise.allSettled([getImageHistory(50), getVideoHistory(80)]);

    if (imageResult.status === "fulfilled") setImageHistory(imageResult.value);
    if (videoResult.status === "fulfilled") setVideoHistory(videoResult.value);

    const errors = [
      imageResult.status === "rejected" ? t("history.global.imageLoadFailed") : "",
      videoResult.status === "rejected" ? t("history.global.videoLoadFailed") : "",
    ].filter(Boolean);
    setError(errors.join(" "));
    setIsLoading(false);
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadHistory();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadHistory]);

  const allItems = useMemo(() => {
    const imageItems = imageHistory.map((item) => makeImageHistoryItem(item, t));
    const videoItems = videoHistory.map((item) => makeVideoHistoryItem(item, t));
    return [...imageItems, ...videoItems].sort((left, right) => {
      const leftTime = left.rawImage ? getImageHistoryTime(left.rawImage) : left.rawVideo ? getVideoHistoryTime(left.rawVideo) : 0;
      const rightTime = right.rawImage ? getImageHistoryTime(right.rawImage) : right.rawVideo ? getVideoHistoryTime(right.rawVideo) : 0;
      return rightTime - leftTime;
    });
  }, [imageHistory, t, videoHistory]);

  const counts = useMemo(
    () =>
      (["all", "image", "video", "remake", "completed", "failed", "processing"] as const).reduce<Record<GlobalHistoryFilter, number>>(
        (result, item) => {
          result[item] = allItems.filter((historyItem) => filterItem(historyItem, item)).length;
          return result;
        },
        { all: allItems.length, completed: 0, failed: 0, image: 0, processing: 0, remake: 0, video: 0 },
      ),
    [allItems],
  );

  const visibleItems = useMemo(
    () => allItems.filter((item) => filterItem(item, filter)).filter((item) => matchesSearch(item, query)),
    [allItems, filter, query],
  );
  const selectedItem = visibleItems.find((item) => item.key === selectedKey) || allItems.find((item) => item.key === selectedKey) || visibleItems[0] || null;

  const filterLabel = (item: GlobalHistoryFilter) => {
    if (item === "image") return t("history.global.filter.images");
    if (item === "video") return t("history.global.filter.videos");
    if (item === "remake") return t("history.global.filter.remake");
    if (item === "completed") return t("history.global.filter.completed");
    if (item === "failed") return t("history.global.filter.failed");
    if (item === "processing") return t("history.global.filter.processing");
    return t("history.global.filter.all");
  };

  return (
    <div className="se-scrollbar h-full overflow-y-auto overflow-x-hidden">
      <div className="mx-auto flex min-h-full w-full max-w-[1520px] flex-col gap-4 pb-5">
        <section className="se-card-quiet rounded-[30px] p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="se-eyebrow">{t("history.global.eyebrow")}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#f4f4f4] md:text-4xl">{t("history.global.title")}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#b9b9b9]/62">{t("history.global.subtitle")}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
              <div className="rounded-[18px] border border-white/8 bg-[#05070b]/48 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#b9b9b9]/42">{t("history.global.summary.total")}</p>
                <p className="mt-1 text-2xl font-black text-[#f4f4f4]">{counts.all}</p>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-[#05070b]/48 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#b9b9b9]/42">{t("history.global.summary.completed")}</p>
                <p className="mt-1 text-2xl font-black text-[#b8e7ee]">{counts.completed}</p>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-[#05070b]/48 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#b9b9b9]/42">{t("history.global.summary.failed")}</p>
                <p className="mt-1 text-2xl font-black text-[#f2b3a1]">{counts.failed}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="se-card-quiet rounded-[26px] p-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="se-segmented flex flex-wrap gap-1.5 rounded-2xl p-1.5">
              {(["all", "image", "video", "remake", "completed", "failed", "processing"] as const).map((item) => (
                <button
                  className={`se-segmented-item min-h-8 rounded-full px-3 text-[11px] font-black ${filter === item ? "se-segmented-item-active" : ""}`}
                  key={item}
                  onClick={() => setFilter(item)}
                  type="button"
                >
                  {filterLabel(item)}
                  <span className="se-segmented-count text-[9px]">{counts[item]}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="min-w-0">
                <span className="sr-only">{t("history.global.search")}</span>
                <input
                  className="h-10 w-full rounded-full border border-white/10 bg-[#05070b]/60 px-4 text-sm font-semibold text-[#f4f4f4] outline-none transition placeholder:text-[#b9b9b9]/35 focus:border-[#ffb44d]/55 sm:w-[320px]"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("history.global.searchPlaceholder")}
                  value={query}
                />
              </label>
              <button className="se-button-secondary min-h-10 rounded-full px-4 text-xs font-bold" disabled={isLoading} onClick={() => void loadHistory()} type="button">
                {isLoading ? t("history.global.loading") : t("history.global.refresh")}
              </button>
            </div>
          </div>
          {error ? <div className="mt-3 rounded-[18px] border border-[#8c4632]/42 bg-[#2a1012]/72 px-3 py-2 text-xs leading-5 text-[#f2b3a1]">{error}</div> : null}
        </section>

        <div className="grid min-h-[620px] gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
          <section className="se-card-quiet min-h-0 rounded-[28px] p-3">
            <div className="se-scrollbar grid max-h-[calc(100vh-330px)] min-h-[520px] gap-3 overflow-y-auto pr-1 lg:grid-cols-2 2xl:grid-cols-3">
              {isLoading && !visibleItems.length ? (
                <div className="col-span-full grid min-h-[340px] place-items-center rounded-[24px] border border-dashed border-white/10 text-center">
                  <div>
                    <p className="text-base font-black text-[#f4f4f4]">{t("history.global.loading")}</p>
                    <p className="mt-2 text-sm text-[#b9b9b9]/52">{t("history.global.loadingHint")}</p>
                  </div>
                </div>
              ) : visibleItems.length ? (
                visibleItems.map((item) => (
                  <article
                    className={`group flex min-h-[360px] flex-col overflow-hidden rounded-[24px] border bg-[#111318]/70 transition-colors ${
                      selectedItem?.key === item.key ? "border-[#ffb44d]/44" : "border-white/8 hover:border-[#ffb44d]/24"
                    }`}
                    key={item.key}
                  >
                    <button className="grid min-h-[190px] place-items-center bg-[#05070b] p-2" onClick={() => setSelectedKey(item.key)} type="button">
                      {item.outputUrl ? (
                        item.kind === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt="" className="max-h-[220px] w-full rounded-[18px] object-contain" src={item.outputUrl} />
                        ) : (
                          <video className="max-h-[220px] w-full rounded-[18px] object-contain" muted playsInline preload="metadata" src={item.outputUrl} />
                        )
                      ) : item.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="max-h-[220px] w-full rounded-[18px] object-contain" src={item.previewUrl} />
                      ) : (
                        <div className="grid size-16 place-items-center rounded-[22px] border border-white/10 bg-white/[.035] text-xs font-black text-[#b9b9b9]/42">
                          {getKindLabel(item.kind, t)}
                        </div>
                      )}
                    </button>
                    <div className="flex flex-1 flex-col gap-3 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#ffb44d]/20 bg-[#ffb44d]/10 px-2.5 py-1 text-[10px] font-black text-[#ffd08a]">
                          {getKindLabel(item.kind, t)}
                        </span>
                        <span className={`se-status rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass(item.status)}`}>{item.statusLabel}</span>
                      </div>
                      <button className="text-left" onClick={() => setSelectedKey(item.key)} type="button">
                        <p className="line-clamp-3 text-sm font-black leading-5 text-[#f4f4f4]/86">{item.prompt}</p>
                      </button>
                      <div className="mt-auto space-y-2">
                        <div className="flex min-w-0 items-center gap-2 text-xs text-[#b9b9b9]/50">
                          <VideoModelLogo label={item.modelLabel} lookup={item.modelLogoLookup} size="sm" />
                          <span className="truncate font-semibold text-[#f4f4f4]/72">{item.modelLabel}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[10px] text-[#b9b9b9]/48">
                          <span className="se-pill rounded-full px-2.5 py-1">{item.createdAtLabel}</span>
                          {item.cost ? <span className="se-pill rounded-full px-2.5 py-1">{tf("history.global.cost", { credits: item.cost })}</span> : null}
                          {item.remakeShotNumber ? <span className="se-pill rounded-full px-2.5 py-1">{tf("history.global.shot", { shot: item.remakeShotNumber })}</span> : null}
                        </div>
                        {item.errorMessage ? <p className="line-clamp-2 rounded-[14px] border border-[#8c4632]/36 bg-[#2a1012]/62 px-2.5 py-2 text-[11px] leading-4 text-[#f2b3a1]/74">{item.errorMessage}</p> : null}
                        <div className="flex flex-wrap gap-2">
                          {item.outputUrl ? (
                            <>
                              <a className="se-button-secondary inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold" href={item.outputUrl} rel="noreferrer" target="_blank">
                                <ExternalIcon />
                                {t("history.global.open")}
                              </a>
                              <a className="se-button-ghost inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold" download={downloadFilename(item)} href={item.outputUrl} rel="noreferrer" target="_blank">
                                <DownloadIcon />
                                {t("history.global.download")}
                              </a>
                            </>
                          ) : null}
                          <button className="se-button-ghost inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold" onClick={() => void navigator.clipboard?.writeText(item.jobId)} type="button">
                            <CopyIcon />
                            {t("history.global.copyJobId")}
                          </button>
                          <button className="se-button-ghost min-h-8 rounded-full px-3 text-[11px] font-semibold" onClick={() => setSelectedKey(item.key)} type="button">
                            {t("history.global.detail")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="col-span-full grid min-h-[340px] place-items-center rounded-[24px] border border-dashed border-white/10 text-center">
                  <div>
                    <p className="text-base font-black text-[#f4f4f4]">{t("history.global.emptyTitle")}</p>
                    <p className="mt-2 max-w-md text-sm leading-6 text-[#b9b9b9]/52">{t("history.global.emptyHint")}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="se-card-quiet min-h-[520px] rounded-[28px] p-4">
            {selectedItem ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex flex-none items-start justify-between gap-3 border-b border-white/8 pb-4">
                  <div className="min-w-0">
                    <p className="se-eyebrow">{t("history.global.detail")}</p>
                    <h2 className="mt-2 flex min-w-0 items-center gap-2 text-base font-black text-[#f4f4f4]">
                      <VideoModelLogo label={selectedItem.modelLabel} lookup={selectedItem.modelLogoLookup} size="md" />
                      <span className="truncate">{selectedItem.modelLabel}</span>
                    </h2>
                  </div>
                  <span className={`se-status shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass(selectedItem.status)}`}>{selectedItem.statusLabel}</span>
                </div>
                <div className="se-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto py-4">
                  <div className="rounded-[18px] border border-white/8 bg-[#05070b]/52 p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#b9b9b9]/40">{t("history.global.prompt")}</p>
                    <p className="text-sm leading-6 text-[#f4f4f4]/78">{selectedItem.prompt}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-[16px] border border-white/8 bg-white/[.03] px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#b9b9b9]/40">{t("history.global.type")}</p>
                      <p className="mt-1 truncate text-xs font-semibold text-[#f4f4f4]/78">{getKindLabel(selectedItem.kind, t)}</p>
                    </div>
                    <div className="rounded-[16px] border border-white/8 bg-white/[.03] px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#b9b9b9]/40">{t("history.global.created")}</p>
                      <p className="mt-1 truncate text-xs font-semibold text-[#f4f4f4]/78">{selectedItem.createdAtLabel}</p>
                    </div>
                    <div className="rounded-[16px] border border-white/8 bg-white/[.03] px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#b9b9b9]/40">{t("history.global.jobId")}</p>
                      <p className="mt-1 truncate text-xs font-semibold text-[#f4f4f4]/78">{selectedItem.jobId || "--"}</p>
                    </div>
                    <div className="rounded-[16px] border border-white/8 bg-white/[.03] px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#b9b9b9]/40">{t("history.global.detail.cost")}</p>
                      <p className="mt-1 truncate text-xs font-semibold text-[#f4f4f4]/78">{selectedItem.cost ? tf("history.global.cost", { credits: selectedItem.cost }) : "--"}</p>
                    </div>
                    {selectedItem.detailRows.map((row) => (
                      <div className="rounded-[16px] border border-white/8 bg-white/[.03] px-3 py-2" key={`${row.label}-${row.value}`}>
                        <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#b9b9b9]/40">{row.label}</p>
                        <p className="mt-1 truncate text-xs font-semibold text-[#f4f4f4]/78">{row.value || "--"}</p>
                      </div>
                    ))}
                  </div>
                  {selectedItem.remakeAnalysisId ? (
                    <div className="rounded-[18px] border border-[#ffb44d]/18 bg-[#ffb44d]/8 px-3 py-2 text-xs leading-5 text-[#ffd08a]/74">
                      {tf("history.global.remakeMeta", { analysisId: selectedItem.remakeAnalysisId, shot: selectedItem.remakeShotNumber || "--" })}
                    </div>
                  ) : null}
                  {selectedItem.errorMessage ? (
                    <div className="rounded-[18px] border border-[#8c4632]/42 bg-[#2a1012]/72 px-3 py-2 text-xs leading-5 text-[#f2b3a1]">{selectedItem.errorMessage}</div>
                  ) : null}
                  {selectedItem.outputUrls.length ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#b9b9b9]/40">{t("history.global.outputs")}</p>
                      {selectedItem.outputUrls.map((url, index) => (
                        <div className="rounded-[16px] border border-white/8 bg-white/[.03] px-3 py-2" key={`${url}-${index}`}>
                          <p className="truncate text-[11px] font-semibold text-[#ffd08a]">{tf("history.global.outputLabel", { index: index + 1 })}</p>
                          <p className="mt-1 truncate text-[10px] text-[#b9b9b9]/42">{url}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <button className="se-button-ghost inline-flex min-h-7 items-center gap-1.5 rounded-full px-2 text-[10px] font-semibold" onClick={() => void navigator.clipboard?.writeText(url)} type="button">
                              <CopyIcon />
                              {t("history.global.copy")}
                            </button>
                            <a className="se-button-secondary inline-flex min-h-7 items-center gap-1.5 rounded-full px-2 text-[10px] font-semibold" href={url} rel="noreferrer" target="_blank">
                              <ExternalIcon />
                              {t("history.global.open")}
                            </a>
                            <a className="se-button-secondary inline-flex min-h-7 items-center gap-1.5 rounded-full px-2 text-[10px] font-semibold" download={downloadFilename(selectedItem, index)} href={url} rel="noreferrer" target="_blank">
                              <DownloadIcon />
                              {t("history.global.download")}
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="grid h-full min-h-[420px] place-items-center text-center">
                <div>
                  <p className="text-sm font-semibold text-[#f4f4f4]">{t("history.global.selectTitle")}</p>
                  <p className="mt-2 text-xs leading-5 text-[#b9b9b9]/52">{t("history.global.selectHint")}</p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
