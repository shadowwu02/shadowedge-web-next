"use client";

import { useI18n } from "@/i18n/useI18n";
import { getMediaUploadErrorDisplayKeys, getSafeMediaItemDisplayName, normalizeMediaAssetUrl } from "@/lib/media-assets";
import type { UploadMediaItem } from "@/types/video";

export function MediaCard({
  item,
  onRemove,
  compact = false,
}: {
  item: UploadMediaItem;
  onRemove?: (id: string) => void;
  compact?: boolean;
}) {
  const previewUrl = normalizeMediaAssetUrl(item.previewUrl) || normalizeMediaAssetUrl(item.url);
  const isImage = item.type === "image" && Boolean(previewUrl);
  const isFailed = item.uploadStatus === "failed";
  const { locale, t } = useI18n();
  const displayName = getSafeMediaItemDisplayName(item, 0, locale === "zh" ? "zh" : "en");
  const failedErrorDisplay = isFailed ? getMediaUploadErrorDisplayKeys(item.errorMessage, { fallbackKind: "unavailable" }) : null;

  function statusLabel(status: UploadMediaItem["uploadStatus"]) {
    if (status === "uploading") return t("common.status.uploading");
    if (status === "failed") return t("media.upload.unavailableTitle");
    if (status === "ready") return t("common.status.ready");
    return t("video.drawer.status.local");
  }

  function mediaTypeLabel(type: UploadMediaItem["type"]) {
    if (type === "audio") return t("video.media.audio");
    if (type === "video") return t("video.media.video");
    return t("video.media.image");
  }

  return (
    <article
      className={`group overflow-hidden rounded-[20px] shadow-lg shadow-black/10 ${
        isFailed ? "se-status se-status-failed" : "se-card-interactive"
      }`}
    >
      <div className="relative grid aspect-video place-items-center overflow-hidden bg-[#1a1c22]">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="h-full w-full object-cover" src={previewUrl} />
        ) : (
          <span className="grid size-12 place-items-center rounded-2xl bg-[#33323a]/55 text-[11px] font-semibold uppercase tracking-[.14em] text-[#b9b9b9]/70">
            {item.type}
          </span>
        )}
        <span className="absolute left-2 top-2 rounded-full border border-[rgba(244,244,244,0.08)] bg-[#05070b]/62 px-2 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-[#f4f4f4]/72 backdrop-blur">
          {mediaTypeLabel(item.type)}
        </span>
      </div>

      <div className={compact ? "grid gap-1.5 p-2" : "grid gap-2 p-3"}>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-[#f4f4f4]/72">{displayName}</p>
          <p className={`mt-1 text-[11px] font-semibold uppercase tracking-[.12em] ${isFailed ? "text-[#f2b3a1]/80" : "text-[#b9b9b9]/45"}`}>
            {statusLabel(item.uploadStatus)}
          </p>
        </div>

        {failedErrorDisplay ? (
          <p className="line-clamp-2 text-xs leading-5 text-[#f2b3a1]/78">
            {t(failedErrorDisplay.messageKey)} {t("media.upload.removeAndUploadAgain")}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {item.url ? (
            <a
              className="se-button-ghost rounded-full px-2 py-1 text-[11px] font-medium"
              href={item.url}
              rel="noreferrer"
              target="_blank"
            >
              {t("video.references.preview")}
            </a>
          ) : null}
          <button
            className="se-button-danger rounded-full px-2 py-1 text-[11px] font-medium"
            onClick={() => onRemove?.(item.id)}
            type="button"
          >
            {t("common.actions.remove")}
          </button>
        </div>
      </div>
    </article>
  );
}
