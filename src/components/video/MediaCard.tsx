"use client";

import { useI18n } from "@/i18n/useI18n";
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
  const isImage = item.type === "image" && item.previewUrl;
  const isFailed = item.uploadStatus === "failed";
  const { t } = useI18n();

  function statusLabel(status: UploadMediaItem["uploadStatus"]) {
    if (status === "uploading") return t("common.status.uploading");
    if (status === "failed") return t("video.status.failed");
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
      className={`group overflow-hidden rounded-2xl border ${
        isFailed ? "border-red-300/30 bg-red-400/10" : "border-white/10 bg-black/24"
      }`}
    >
      <div className="relative grid aspect-video place-items-center overflow-hidden bg-white/[.045]">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="h-full w-full object-cover" src={item.previewUrl} />
        ) : (
          <span className="grid size-12 place-items-center rounded-2xl bg-white/[.06] text-[11px] font-black uppercase tracking-[.14em] text-white/52">
            {item.type}
          </span>
        )}
        <span className="absolute left-2 top-2 rounded-full border border-white/10 bg-black/55 px-2 py-1 text-[10px] font-black uppercase tracking-[.12em] text-white/72 backdrop-blur">
          {mediaTypeLabel(item.type)}
        </span>
      </div>

      <div className={compact ? "grid gap-1.5 p-2" : "grid gap-2 p-3"}>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-white/72">{item.name}</p>
          <p className={`mt-1 text-[11px] font-black uppercase tracking-[.12em] ${isFailed ? "text-red-100/75" : "text-white/38"}`}>
            {statusLabel(item.uploadStatus)}
          </p>
        </div>

        {item.errorMessage ? <p className="line-clamp-2 text-xs leading-5 text-red-100/78">{item.errorMessage}</p> : null}

        <div className="flex flex-wrap gap-2">
          {item.url ? (
            <a
              className="rounded-full border border-white/10 px-2 py-1 text-[11px] font-bold text-white/52 transition hover:border-[#ffb44d]/40 hover:text-[#ffd08a]"
              href={item.url}
              rel="noreferrer"
              target="_blank"
            >
              {t("video.references.preview")}
            </a>
          ) : null}
          <button
            className="rounded-full border border-white/10 px-2 py-1 text-[11px] font-bold text-white/52 transition hover:border-red-300/45 hover:text-red-100"
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
