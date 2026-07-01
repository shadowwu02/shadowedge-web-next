"use client";

import { useMemo, useId, useRef, useState } from "react";
import { listMediaAssets, type MediaAssetRecord } from "@/lib/assets-api";
import { type DictionaryKey, useI18n } from "@/i18n/useI18n";
import type { RemakeSourceVideo } from "@/components/video/remake/remakeTypes";

type RemakeSourceUploadProps = {
  onClear: () => void;
  onChange: (source: RemakeSourceVideo | null) => void;
  sourceVideo: RemakeSourceVideo | null;
};

const SINGLE_CLIP_RECOMMENDED_SECONDS = 60;
const FULL_FILM_BETA_SECONDS = 120;
const LONG_VIDEO_BETA_SECONDS = 600;

type AssetPickerState = "idle" | "loading" | "ready" | "auth" | "error";

function formatBytes(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "--";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDuration(seconds?: number) {
  if (!Number.isFinite(seconds || 0) || !seconds) return "";
  return `${seconds.toFixed(seconds % 1 === 0 ? 0 : 1)}s`;
}

function getDurationStatusKey(duration?: number): DictionaryKey | "" {
  if (!Number.isFinite(duration || 0) || !duration) return "";
  if (duration <= SINGLE_CLIP_RECOMMENDED_SECONDS) return "video.remake.durationStatus.singleClipGood";
  if (duration <= FULL_FILM_BETA_SECONDS) return "video.remake.durationStatus.fullFilmLonger";
  if (duration <= LONG_VIDEO_BETA_SECONDS) return "video.remake.durationStatus.longVideoReady";
  return "video.remake.durationStatus.longVideoTooLong";
}

function getAssetUrl(asset: MediaAssetRecord) {
  return String(asset.publicUrl || asset.url || "").trim();
}

function getAssetName(asset: MediaAssetRecord) {
  return asset.displayName || asset.filename || "Video asset";
}

function formatAssetDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isAuthError(error: unknown) {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error || "").toLowerCase();
  return (
    message.includes("401") ||
    message.includes("unauthorized") ||
    message.includes("auth_required") ||
    message.includes("sign in")
  );
}

function readVideoDuration(file: File) {
  return new Promise<number>((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");

    function cleanup() {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    }

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = Number(video.duration || 0);
      cleanup();
      resolve(Number.isFinite(duration) && duration > 0 ? duration : 0);
    };
    video.onerror = () => {
      cleanup();
      resolve(0);
    };
    video.src = url;
  });
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function CheckIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function ClockIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function FolderIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  );
}

function LoadingIcon({ className = "size-4 animate-spin" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" fill="currentColor" />
    </svg>
  );
}

function VideoIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m16 13 5-3-5-3v6Z" />
      <rect height="14" rx="2" width="14" x="3" y="5" />
    </svg>
  );
}

function XIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function RemakeSourceUpload({ onChange, onClear, sourceVideo }: RemakeSourceUploadProps) {
  const { t } = useI18n();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionVersionRef = useRef(0);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [assetPickerState, setAssetPickerState] = useState<AssetPickerState>("idle");
  const [videoAssets, setVideoAssets] = useState<MediaAssetRecord[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const durationStatusKey = getDurationStatusKey(sourceVideo?.duration);
  const availableVideoAssets = useMemo(
    () =>
      videoAssets.filter(
        (asset) => asset.type === "video" && asset.status === "ready" && Boolean(getAssetUrl(asset)),
      ),
    [videoAssets],
  );
  const selectedAsset = availableVideoAssets.find((asset) => asset.id === selectedAssetId);

  function handleClear() {
    selectionVersionRef.current += 1;
    if (inputRef.current) inputRef.current.value = "";
    onClear();
  }

  async function loadVideoAssets() {
    setIsAssetPickerOpen(true);
    setAssetPickerState("loading");
    setSelectedAssetId("");
    try {
      const result = await listMediaAssets({ limit: 100, status: "ready", type: "video" });
      setVideoAssets(result.assets);
      setAssetPickerState("ready");
    } catch (error) {
      setVideoAssets([]);
      setAssetPickerState(isAuthError(error) ? "auth" : "error");
    }
  }

  function closeAssetPicker() {
    setIsAssetPickerOpen(false);
    setSelectedAssetId("");
    if (assetPickerState !== "loading") {
      setAssetPickerState("idle");
    }
  }

  function applySelectedAsset() {
    if (!selectedAsset) return;
    const assetUrl = getAssetUrl(selectedAsset);
    if (!assetUrl) return;

    selectionVersionRef.current += 1;
    if (inputRef.current) inputRef.current.value = "";
    const createdAtMs = selectedAsset.createdAt ? new Date(selectedAsset.createdAt).getTime() : NaN;

    onChange({
      assetId: selectedAsset.id,
      duration:
        typeof selectedAsset.durationSeconds === "number"
          ? selectedAsset.durationSeconds
          : undefined,
      lastModified: Number.isFinite(createdAtMs) ? createdAtMs : Date.now(),
      name: getAssetName(selectedAsset),
      size: selectedAsset.sizeBytes || 0,
      type: selectedAsset.mimeType || "video/mp4",
      url: assetUrl,
    });
    setIsAssetPickerOpen(false);
    setSelectedAssetId("");
    setAssetPickerState("idle");
  }

  return (
    <section className="se-card rounded-[24px] p-4 shadow-inner shadow-black/10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="se-eyebrow">{t("video.remake.sourceVideo")}</p>
          <h2 className="mt-1 text-sm font-semibold text-[#f4f4f4]">{t("video.remake.uploadSource")}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-[rgba(244,244,244,0.10)] bg-[#1a1c22]/70 px-2.5 py-1 text-[10px] font-semibold text-[#b9b9b9]/72">
            {t("video.remake.sourceVideo")}
          </span>
          {sourceVideo ? (
            <span className="se-status se-status-ready rounded-full px-2.5 py-1 text-[10px] font-semibold">
              {t("video.remake.readyToAnalyze")}
            </span>
          ) : null}
          {sourceVideo ? (
            <button
              aria-label={t("video.remake.removeSourceVideo")}
              className="se-button-secondary inline-flex min-h-8 items-center gap-1.5 rounded-[12px] px-2.5 text-xs font-semibold"
              onClick={handleClear}
              title={t("video.remake.clearSourceVideo")}
              type="button"
            >
              <TrashIcon />
              <span>{t("video.remake.removeSourceVideo")}</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-3 rounded-[20px] border border-[rgba(244,244,244,0.10)] bg-[#05070b]/45 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#f4f4f4]">{t("video.remake.assetPicker.title")}</p>
            <p className="mt-1 text-xs leading-5 text-[#b9b9b9]/58">{t("video.remake.assetPicker.description")}</p>
          </div>
          <button
            className="se-button-secondary inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-[14px] px-3 text-sm font-semibold"
            disabled={assetPickerState === "loading"}
            onClick={loadVideoAssets}
            type="button"
          >
            {assetPickerState === "loading" ? <LoadingIcon /> : <FolderIcon />}
            <span>{t("video.remake.assetPicker.choose")}</span>
          </button>
        </div>

        {isAssetPickerOpen ? (
          <div className="mt-3 rounded-[18px] border border-[rgba(244,244,244,0.10)] bg-[#0b0d12] p-3 shadow-2xl shadow-black/30">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#f4f4f4]">{t("video.remake.assetPicker.title")}</p>
                <p className="mt-1 text-xs leading-5 text-[#b9b9b9]/58">{t("video.remake.assetPicker.description")}</p>
              </div>
              <button
                aria-label={t("video.remake.assetPicker.close")}
                className="grid size-8 place-items-center rounded-[12px] border border-[rgba(244,244,244,0.10)] text-[#b9b9b9]/70 transition-colors hover:border-[#ffb44d]/34 hover:text-[#f4f4f4]"
                onClick={closeAssetPicker}
                type="button"
              >
                <XIcon />
              </button>
            </div>

            {assetPickerState === "loading" ? (
              <div className="mt-3 flex items-center gap-2 rounded-[14px] border border-[rgba(244,244,244,0.10)] bg-[#1a1c22]/50 p-3 text-sm text-[#b9b9b9]/74">
                <LoadingIcon />
                {t("video.remake.assetPicker.loading")}
              </div>
            ) : assetPickerState === "auth" ? (
              <div className="mt-3 rounded-[14px] border border-[#ffb44d]/24 bg-[#ffb44d]/10 p-3 text-sm text-[#ffd08a]/88">
                {t("video.remake.assetPicker.auth")}
              </div>
            ) : assetPickerState === "error" ? (
              <div className="mt-3 rounded-[14px] border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100">
                {t("video.remake.assetPicker.error")}
              </div>
            ) : availableVideoAssets.length === 0 ? (
              <div className="mt-3 rounded-[14px] border border-[rgba(244,244,244,0.10)] bg-[#1a1c22]/45 p-3 text-sm text-[#b9b9b9]/64">
                {t("video.remake.assetPicker.empty")}
              </div>
            ) : (
              <>
                <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto pr-1">
                  {availableVideoAssets.map((asset) => {
                    const assetUrl = getAssetUrl(asset);
                    const isCurrent =
                      sourceVideo?.assetId === asset.id ||
                      (!!sourceVideo?.url && sourceVideo.url === assetUrl);
                    const isSelected = selectedAssetId === asset.id;
                    const assetSize = formatBytes(asset.sizeBytes || 0);
                    const assetDate = formatAssetDate(asset.createdAt);

                    return (
                      <button
                        className={[
                          "flex min-w-0 items-center gap-3 rounded-[16px] border p-3 text-left transition-colors",
                          isCurrent
                            ? "cursor-not-allowed border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                            : isSelected
                              ? "border-[#ffb44d]/50 bg-[#ffb44d]/10 text-[#f4f4f4]"
                              : "border-[rgba(244,244,244,0.10)] bg-[#05070b]/35 text-[#f4f4f4] hover:border-[#ffb44d]/30 hover:bg-[#ffb44d]/8",
                        ].join(" ")}
                        disabled={isCurrent}
                        key={asset.id}
                        onClick={() => setSelectedAssetId(asset.id)}
                        type="button"
                      >
                        <span className="grid size-12 shrink-0 place-items-center rounded-[14px] border border-[rgba(244,244,244,0.10)] bg-[#1a1c22]/70 text-[#ffb44d]">
                          {isCurrent ? <CheckIcon className="size-5" /> : <VideoIcon className="size-5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{getAssetName(asset)}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#b9b9b9]/58">
                            <span className="inline-flex items-center gap-1">
                              <CheckIcon className="size-3.5" />
                              {t("video.remake.assetPicker.ready")}
                            </span>
                            {typeof asset.durationSeconds === "number" ? (
                              <span className="inline-flex items-center gap-1">
                                <ClockIcon className="size-3.5" />
                                {formatDuration(asset.durationSeconds)}
                              </span>
                            ) : null}
                            {assetSize !== "--" ? <span>{assetSize}</span> : null}
                            {assetDate ? <span>{assetDate}</span> : null}
                          </span>
                        </span>
                        {isCurrent ? (
                          <span className="shrink-0 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-100">
                            {t("video.remake.assetPicker.alreadySelected")}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    className="se-button-secondary inline-flex min-h-9 items-center justify-center rounded-[14px] px-3 text-sm font-semibold"
                    onClick={closeAssetPicker}
                    type="button"
                  >
                    {t("video.remake.assetPicker.cancel")}
                  </button>
                  <button
                    className="inline-flex min-h-9 items-center justify-center rounded-[14px] bg-[#ffb44d] px-3 text-sm font-semibold text-[#080a0f] transition-colors hover:bg-[#ffd08a] disabled:cursor-not-allowed disabled:bg-[#f4f4f4]/12 disabled:text-[#f4f4f4]/45"
                    disabled={!selectedAsset}
                    onClick={applySelectedAsset}
                    type="button"
                  >
                    {t("video.remake.assetPicker.addSelected")}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      <label
        className="group grid min-h-32 cursor-pointer place-items-center rounded-[22px] border border-dashed border-[rgba(244,244,244,0.14)] bg-[#05070b]/40 p-4 text-center transition-colors hover:border-[#ffb44d]/34 hover:bg-[#ffb44d]/8"
        htmlFor={inputId}
      >
        <input
          accept="video/*"
          className="sr-only"
          id={inputId}
          ref={inputRef}
          onChange={(event) => {
            const file = event.target.files?.[0] || null;
            if (!file) return;

            selectionVersionRef.current += 1;
            const selectionVersion = selectionVersionRef.current;
            const nextSource = {
              file,
              lastModified: file.lastModified,
              name: file.name,
              size: file.size,
              type: file.type || "video/*",
            };

            onChange(nextSource);
            void readVideoDuration(file).then((duration) => {
              if (selectionVersionRef.current === selectionVersion && duration > 0) onChange({ ...nextSource, duration });
            });
            event.currentTarget.value = "";
          }}
          type="file"
        />
        <span className="grid size-12 place-items-center rounded-2xl border border-[rgba(244,244,244,0.10)] bg-[#1a1c22] text-[#ffb44d] transition-colors group-hover:border-[#ffb44d]/34">
          <svg aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="m16 13 5-3-5-3v6Z" />
            <rect height="14" rx="2" width="14" x="3" y="5" />
          </svg>
        </span>
        <span className="mt-3 block text-sm font-semibold text-[#f4f4f4]">
          {sourceVideo ? sourceVideo.name : t("video.remake.chooseSource")}
        </span>
        <span className="mt-1 block text-xs leading-5 text-[#b9b9b9]/58">
          {sourceVideo
            ? [formatBytes(sourceVideo.size), sourceVideo.type || "video", formatDuration(sourceVideo.duration), sourceVideo.url ? t("common.status.ready") : ""]
                .filter(Boolean)
                .join(" · ")
            : t("video.remake.sourceHint")}
        </span>
        {sourceVideo ? <span className="mt-2 block text-xs font-semibold text-[#ffb44d]">{t("video.remake.sourceReady")}</span> : null}
        {sourceVideo?.assetId ? (
          <span className="mt-1 block text-[11px] font-semibold text-[#ffb44d]/80">{t("video.remake.assetPicker.selectedFromAssets")}</span>
        ) : null}
        {sourceVideo ? <span className="mt-1 block text-[11px] font-semibold text-[#ffb44d]/80">{t("video.remake.replaceSourceVideo")}</span> : null}
      </label>

      <div className="mt-3 grid gap-2 text-xs leading-5 text-[#b9b9b9]/62">
        <p className="rounded-[14px] border border-[#ffb44d]/18 bg-[#ffb44d]/8 p-2 text-[#ffd08a]/82">
          {t("video.remake.longVideoBestPractice")}
        </p>
        {durationStatusKey ? (
          <p className="rounded-[14px] border border-[#ffb44d]/24 bg-[#ffb44d]/10 p-2 text-[#ffd08a]/86">
            {t(durationStatusKey)}
          </p>
        ) : null}
        <p>{t("video.remake.singleClipDuration")}</p>
        <p>{t("video.remake.fullFilmDuration")}</p>
        <p>{t("video.remake.batchDuration")}</p>
      </div>
    </section>
  );
}
