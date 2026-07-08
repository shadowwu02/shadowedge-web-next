"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MediaTypeIcon } from "@/components/video/MediaTypeIcon";
import { getMediaUploadErrorDisplayKeys, getSafeMediaItemDisplayName, normalizeMediaAssetUrl } from "@/lib/media-assets";
import { getReadyMentionableMediaItems } from "@/lib/video-mentions";
import type { MentionableMediaItem } from "@/lib/video-mentions";
import type { UploadMediaItem, UploadMediaRole, UploadMediaType } from "@/types/video";
import type { VideoModelRule } from "@/lib/video/videoModelRules";
import {
  canUseReferenceRole,
  getAllowedReferenceTypes,
  getReferenceLimitSummary,
  getReferenceMediaIssues,
  getReferenceRoleIssue,
} from "@/lib/video/videoReferenceRules";
import { useI18n } from "@/i18n/useI18n";

const roleOptions: Array<{ value: UploadMediaRole }> = [
  { value: "reference" },
  { value: "start_frame" },
  { value: "end_frame" },
];

type RoleMenuPosition = {
  left: number;
  top: number;
  width: number;
};

function openMediaPicker(anchorEl: HTMLElement | null) {
  window.dispatchEvent(
    new CustomEvent("shadowedge:open-video-media-picker", {
      detail: { anchorEl },
    }),
  );
}

function insertMention(item: MentionableMediaItem) {
  window.dispatchEvent(
    new CustomEvent("shadowedge:insert-video-mention", {
      detail: {
        display: item.token,
        displayToken: item.displayToken,
        localizedToken: item.localizedToken,
        mediaId: item.id,
        token: item.token,
        type: item.type,
        index: item.index,
        url: item.url,
      },
    }),
  );
}

function MoreIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <circle cx="6.5" cy="12" fill="currentColor" r="1.7" />
      <circle cx="12" cy="12" fill="currentColor" r="1.7" />
      <circle cx="17.5" cy="12" fill="currentColor" r="1.7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path d="m5 12 4.2 4.2L19 6.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  );
}

function getPreviewUrl(item: UploadMediaItem) {
  return normalizeMediaAssetUrl(item.previewUrl) || normalizeMediaAssetUrl(item.url);
}

function getRoleMenuPosition(trigger: HTMLElement): RoleMenuPosition {
  const rect = trigger.getBoundingClientRect();
  const width = 190;
  const height = 238;
  const gap = 8;
  let left = rect.left;
  let top = rect.bottom + gap;

  if (left + width > window.innerWidth - 12) {
    left = window.innerWidth - width - 12;
  }

  if (top + height > window.innerHeight - 12) {
    top = rect.top - height - gap;
  }

  return {
    left: Math.max(12, left),
    top: Math.max(12, top),
    width,
  };
}

type MediaStatus = "ready" | "uploading" | "failed" | "unsupported" | "local";

function getMediaStatus(item: UploadMediaItem, issues: string[]): MediaStatus {
  if (issues.length) return "unsupported";
  if (item.uploadStatus === "failed") return "failed";
  if (item.uploadStatus === "uploading") return "uploading";
  if (item.uploadStatus === "ready") return "ready";
  return "local";
}

function getStatusClass(status: MediaStatus) {
  if (status === "ready") return "border-[#ffb44d]/26 bg-[#ffb44d]/12 text-[#ffd08a]";
  if (status === "uploading") return "border-[#ffb44d]/24 bg-[#ffb44d]/10 text-[#ffcf92]";
  if (status === "failed") return "border-[#ff6b6b]/32 bg-[#ff6b6b]/10 text-[#ff8b8b]";
  if (status === "unsupported") return "border-[#ffb44d]/32 bg-[#ffb44d]/10 text-[#ffb44d]";
  return "border-[rgba(244,244,244,0.08)] bg-[#111318]/70 text-[#b9b9b9]/58";
}

function formatDurationLabel(duration?: number) {
  if (!duration || !Number.isFinite(duration)) return "";
  if (duration < 60) return `${Math.round(duration)}s`;
  const minutes = Math.floor(duration / 60);
  const seconds = Math.round(duration % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function ReferenceMediaTray({
  media,
  modelRule,
  onRemove,
  onRoleChange,
}: {
  media: UploadMediaItem[];
  modelRule: VideoModelRule;
  onRemove: (id: string) => void;
  onRoleChange: (id: string, role: UploadMediaRole) => void;
}) {
  const { locale, t, tf } = useI18n();
  const displayLocale = locale === "zh" ? "zh" : "en";
  const mentionItems = getReadyMentionableMediaItems(media);
  const mentionById = useMemo(() => new Map(mentionItems.map((item) => [item.id, item])), [mentionItems]);
  const mediaIssues = useMemo(() => getReferenceMediaIssues(modelRule, media), [media, modelRule]);
  const limitSummary = useMemo(() => getReferenceLimitSummary(modelRule), [modelRule]);
  const allowedTypes = useMemo(() => getAllowedReferenceTypes(modelRule), [modelRule]);
  const [openRoleId, setOpenRoleId] = useState("");
  const [roleMenuPosition, setRoleMenuPosition] = useState<RoleMenuPosition>({ left: 12, top: 12, width: 190 });
  const [previewItem, setPreviewItem] = useState<UploadMediaItem | null>(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [failedPreviewIds, setFailedPreviewIds] = useState<Set<string>>(() => new Set());
  const rootRef = useRef<HTMLElement | null>(null);
  const roleMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openRoleId) return;

    function closeRoleMenu(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      if (target && roleMenuRef.current?.contains(target)) return;
      setOpenRoleId("");
    }

    function closeFloatingMenu() {
      setOpenRoleId("");
    }

    window.addEventListener("pointerdown", closeRoleMenu);
    window.addEventListener("resize", closeFloatingMenu);
    window.addEventListener("scroll", closeFloatingMenu, true);

    return () => {
      window.removeEventListener("pointerdown", closeRoleMenu);
      window.removeEventListener("resize", closeFloatingMenu);
      window.removeEventListener("scroll", closeFloatingMenu, true);
    };
  }, [openRoleId]);

  useEffect(() => {
    if (!previewItem) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setPreviewItem(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [previewItem]);

  const openRoleItem = media.find((item) => item.id === openRoleId) || null;
  const openRoleMention = openRoleItem ? mentionById.get(openRoleItem.id) : null;
  const startFrameCount = media.filter((item) => item.role === "start_frame").length;
  const endFrameCount = media.filter((item) => item.role === "end_frame").length;
  const hasExplicitFrameSlots = modelRule.uploadSlots.some(
    (slot) =>
      slot.includes("start") ||
      slot.includes("end") ||
      slot === "first_frame" ||
      slot === "last_frame" ||
      slot === "last_frame_image",
  );
  const showFrameSlotsByDefault = hasExplicitFrameSlots && (modelRule.supportsStartFrame || modelRule.supportsEndFrame);
  const isImageOnlyModel = allowedTypes.length === 1 && allowedTypes[0] === "image";
  const isSingleMediaModel = allowedTypes.length > 1 && limitSummary.total === 1;

  function roleLabel(role: UploadMediaRole) {
    if (role === "start_frame") return t("video.references.role.startFrame");
    if (role === "end_frame") return t("video.references.role.endFrame");
    return t("video.references.role.reference");
  }

  function roleShortLabel(role?: UploadMediaRole) {
    if (role === "start_frame") return t("video.references.role.startShort");
    if (role === "end_frame") return t("video.references.role.endShort");
    return "";
  }

  function allowedTypeLabel(type: UploadMediaType) {
    if (type === "image") return t("video.media.image");
    if (type === "video") return t("video.media.video");
    return t("video.media.audio");
  }

  function localizeIssue(issue: string) {
    if (!issue) return "";
    if (issue.includes("does not support image references")) return t("video.errors.unsupportedImageReference");
    if (issue.includes("does not support video references")) return t("video.errors.unsupportedVideoReference");
    if (issue.includes("does not support audio references")) return t("video.errors.unsupportedAudioReference");
    if (issue.includes("Reference limit reached")) return t("video.drawer.referenceLimitReached");
    if (issue.includes("supports up to")) return t("video.drawer.typeLimitReached");
    if (issue === "Start and End frame roles require an image.") return t("video.references.imageOnlyForFrame");
    if (issue === "This model does not support Start Frame.") return t("video.references.startFrameUnsupported");
    if (issue === "This model does not support End Frame.") return t("video.references.endFrameUnsupported");
    return issue;
  }

  function getNotUsedDetail(item: UploadMediaItem | null, issues: string[] = []) {
    const imageOnlyReason = isImageOnlyModel && item && item.type !== "image"
      ? ` ${t("video.references.imageOnlyReason")}`
      : "";
    const issueText = issues.length ? ` ${issues.map(localizeIssue).join(" ")}` : "";
    return `${t("video.references.notUsedDetail")}${imageOnlyReason}${issueText}`;
  }

  function markPreviewFailed(id: string) {
    setFailedPreviewIds((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }

  function displayNameFor(item: UploadMediaItem, index = media.findIndex((candidate) => candidate.id === item.id)) {
    return getSafeMediaItemDisplayName(item, Math.max(0, index), displayLocale);
  }

  function mediaStatusLabel(status: MediaStatus) {
    if (status === "ready") return t("video.references.status.ready");
    if (status === "uploading") return t("video.references.status.uploading");
    if (status === "failed") return t("media.upload.unavailableTitle");
    if (status === "unsupported") return t("video.references.status.notUsed");
    return t("video.references.status.local");
  }

  function supportLabel(supported: boolean) {
    return supported ? t("video.references.available") : t("video.references.unavailable");
  }

  function frameSlotToneClass(supported: boolean, hasItems = false) {
    if (hasItems) return "border-[#ffb44d]/20 bg-[#ffb44d]/8";
    if (supported) return "border-[rgba(255,180,77,0.13)] bg-[#05070b]/18";
    return "border-[rgba(244,244,244,0.06)] bg-[#05070b]/14";
  }

  const uploadTitle = showFrameSlotsByDefault
    ? t("video.references.startEndFrames")
    : allowedTypes.length === 1 && allowedTypes[0] === "image"
      ? t("video.upload.imageTitle")
      : t("video.upload.title");
  const uploadSubtitle = showFrameSlotsByDefault
    ? t("video.references.startEndHint")
    : allowedTypes.length === 1 && allowedTypes[0] === "image"
      ? t("video.upload.imageSubtitle")
      : isSingleMediaModel
        ? t("video.upload.singleMediaHint")
      : t("video.upload.mediaHint");
  const inputSummary = allowedTypes.length ? allowedTypes.map((type) => allowedTypeLabel(type)).join(", ") : t("video.references.modelDoesNotAccept");
  const compactMappingItems = media.slice(0, 1);
  const hiddenMappingCount = Math.max(0, media.length - compactMappingItems.length);
  const unsupportedMedia = media.filter((item) => (mediaIssues.get(item.id) || []).length > 0);
  const unsupportedItems = unsupportedMedia.slice(0, 1);
  const hiddenUnsupportedCount = Math.max(0, unsupportedMedia.length - unsupportedItems.length);

  return (
    <section className="se-card min-w-0 max-w-full overflow-hidden rounded-[24px] p-3.5" ref={rootRef}>
      <div className="mb-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="se-eyebrow">{t("video.references.inputMedia")}</p>
            <h2 className="mt-1 text-sm font-semibold text-[#f4f4f4]">{uploadTitle}</h2>
          </div>
          <span className="shrink-0 rounded-full border border-[rgba(244,244,244,0.08)] bg-[#111318]/70 px-2.5 py-1 text-[11px] font-medium text-[#b9b9b9]/56">
            {tf("video.references.referencesCount", { count: media.length, total: limitSummary.total })}
          </span>
        </div>
        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
          {allowedTypes.length ? (
            allowedTypes.map((type) => (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-[#ffb44d]/20 bg-[#ffb44d]/8 px-2 py-1 text-[11px] font-semibold text-[#ffd08a]"
                key={type}
              >
                <MediaTypeIcon className="size-3" type={type} />
                {allowedTypeLabel(type)}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-[rgba(244,244,244,0.08)] bg-[#111318]/55 px-2 py-1 text-[11px] font-semibold text-[#b9b9b9]/48">
              {t("video.references.modelDoesNotAccept")}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs leading-5 text-[#b9b9b9]/55">{uploadSubtitle}</p>
        <p className="mt-1 text-[11px] leading-4 text-[#b9b9b9]/45">{t("video.references.tokenHelper")}</p>
        {showFrameSlotsByDefault ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className={`rounded-[16px] border px-2.5 py-2 ${frameSlotToneClass(modelRule.supportsStartFrame, startFrameCount > 0)}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#f4f4f4]/72">{t("video.references.slot.startFrame")}</span>
                <span className="text-[9px] font-semibold uppercase tracking-[.08em] text-[#b9b9b9]/40">{t("video.references.optional")}</span>
              </div>
              <p className="mt-0.5 text-[10px] leading-4 text-[#b9b9b9]/42">{tf("video.references.slotCount", { count: startFrameCount })}</p>
            </div>
            <div className={`rounded-[16px] border px-2.5 py-2 ${frameSlotToneClass(modelRule.supportsEndFrame, endFrameCount > 0)}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#f4f4f4]/72">{t("video.references.slot.endFrame")}</span>
                <span className="text-[9px] font-semibold uppercase tracking-[.08em] text-[#b9b9b9]/40">{t("video.references.optional")}</span>
              </div>
              <p className="mt-0.5 text-[10px] leading-4 text-[#b9b9b9]/42">{tf("video.references.slotCount", { count: endFrameCount })}</p>
            </div>
          </div>
        ) : null}
      </div>

      {media.length ? (
        <div className="se-subtle-scrollbar flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1">
          {media.map((item, itemIndex) => {
            const mention = mentionById.get(item.id);
            const currentRole = item.role || "reference";
            const previewUrl = getPreviewUrl(item);
            const isPreviewBroken = failedPreviewIds.has(item.id);
            const shortRole = roleShortLabel(currentRole);
            const issues = mediaIssues.get(item.id) || [];
            const status = getMediaStatus(item, issues);
            const durationLabel = formatDurationLabel(item.duration);
            const failedDisplay = status === "failed" ? getMediaUploadErrorDisplayKeys(item.errorMessage, { fallbackKind: "unavailable" }) : null;
            const failedDetail = failedDisplay ? `${t(failedDisplay.messageKey)} ${t("media.upload.removeAndUploadAgain")}` : "";
            const issueTitle = issues.length ? getNotUsedDetail(item, issues) : failedDetail;
            const displayName = displayNameFor(item, itemIndex);
            const displayToken = mention?.displayToken || (item.type === "video" ? `@Video ${itemIndex + 1}` : item.type === "audio" ? `@Audio ${itemIndex + 1}` : `@Image ${itemIndex + 1}`);

            return (
              <article
                className={`group relative h-[124px] w-[112px] shrink-0 overflow-hidden rounded-[18px] border bg-[#05070b]/34 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,.04)] transition-colors ${
                  issues.length ? "border-[#ffb44d]/38" : "border-[rgba(244,244,244,0.09)] hover:border-[#ffb44d]/36"
                }`}
                key={item.id}
                title={issueTitle}
              >
                <button
                  aria-label={tf("video.references.previewAsset", { name: displayName })}
                  className="relative grid h-full w-full place-items-center overflow-hidden rounded-[14px] border border-[rgba(244,244,244,0.08)] bg-[#111318]"
                  onClick={() => setPreviewItem(item)}
                  type="button"
                >
                  {item.type === "image" && previewUrl && !isPreviewBroken ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="h-full w-full object-cover" onError={() => markPreviewFailed(item.id)} src={previewUrl} />
                  ) : item.type === "video" && item.url ? (
                    <video className="h-full w-full object-cover" muted playsInline preload="metadata" src={item.url} />
                  ) : (
                    <MediaTypeIcon className="size-5 text-[#ffd08a]/72" type={item.type} />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-[#05070b]/86 via-[#05070b]/14 to-[#05070b]/18 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />
                  {shortRole ? (
                    <span className="absolute bottom-1 left-1 rounded-full bg-[#05070b]/82 px-1.5 py-px text-[8px] font-bold uppercase tracking-[.08em] text-[#ffd08a] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      {shortRole}
                    </span>
                  ) : null}
                  <span className={`absolute left-1 top-1 rounded-full border px-1.5 py-px text-[8px] font-black uppercase tracking-[.06em] shadow-sm shadow-black/20 ${getStatusClass(status)}`}>
                    {mediaStatusLabel(status)}
                  </span>
                </button>

                <button
                  aria-label={tf("video.references.removeAsset", { name: displayName })}
                  className="absolute right-2 top-2 z-10 grid size-6 place-items-center rounded-full border border-white/10 bg-[#05070b]/86 text-[11px] font-semibold text-white/72 opacity-0 shadow-lg shadow-black/30 backdrop-blur transition hover:border-[#ff6b6b]/36 hover:bg-[#ff6b6b]/18 hover:text-[#ffb0b0] group-hover:opacity-100 group-focus-within:opacity-100"
                  onClick={() => onRemove(item.id)}
                  type="button"
                >
                  x
                </button>

                <button
                  aria-label={tf("video.references.openRoleMenu", { name: displayName })}
                  className="absolute bottom-2 right-2 z-10 grid size-6 place-items-center rounded-full border border-white/10 bg-[#05070b]/82 text-[#b9b9b9]/66 opacity-0 shadow-lg shadow-black/25 backdrop-blur transition hover:border-[#ffb44d]/36 hover:text-[#ffcf92] group-hover:opacity-100 group-focus-within:opacity-100"
                  onClick={(event) => {
                    setRoleMenuPosition(getRoleMenuPosition(event.currentTarget));
                    setOpenRoleId((current) => (current === item.id ? "" : item.id));
                  }}
                  type="button"
                >
                  <MoreIcon />
                </button>

                {mention ? (
                  <button
                    className="absolute bottom-2 left-2 right-9 z-10 flex min-w-0 flex-col items-start gap-0.5 rounded-[12px] border border-[#ffb44d]/26 bg-[#05070b]/82 px-2 py-1 text-left opacity-0 shadow-lg shadow-black/25 backdrop-blur transition hover:border-[#ffb44d]/46 hover:bg-[#ffb44d]/12 focus:border-[#ffb44d]/55 focus:opacity-100 focus:outline-none group-hover:opacity-100 group-focus-within:opacity-100"
                    onClick={() => insertMention(mention)}
                    title={`${displayToken} · ${mention.display} · ${mention.token}`}
                    type="button"
                  >
                    <span className="max-w-full truncate text-[10px] font-black text-[#ffd08a]">{displayToken}</span>
                    <span className="max-w-full truncate text-[9px] font-semibold text-white/58">
                      {displayName}
                      {durationLabel ? ` · ${durationLabel}` : ""}
                      {issues.length ? ` · ${t("video.references.notUsedShort")}` : ""}
                    </span>
                  </button>
                ) : null}
                {failedDetail ? (
                  <span className="absolute inset-x-2 top-8 z-10 line-clamp-2 rounded-[10px] border border-[#ff6b6b]/20 bg-[#05070b]/82 px-2 py-1 text-[10px] leading-4 text-[#f2b3a1]/86 opacity-0 backdrop-blur transition group-hover:opacity-100 group-focus-within:opacity-100">
                    {failedDetail}
                  </span>
                ) : null}
              </article>
            );
          })}

          <button
            className="grid h-[124px] w-[112px] shrink-0 place-items-center rounded-[18px] border border-dashed border-[#ffb44d]/18 bg-[#05070b]/20 p-2 text-center transition-colors hover:border-[#ffb44d]/34 hover:bg-[#ffb44d]/7"
            onClick={(event) => openMediaPicker(event.currentTarget)}
            type="button"
          >
            <span className="grid justify-items-center gap-2 text-[11px] font-semibold text-[#b9b9b9]/62">
              <span className="grid size-9 place-items-center rounded-full border border-[rgba(244,244,244,0.07)] bg-[#111318]/52 text-lg">+</span>
              {t("video.references.addMore")}
            </span>
          </button>
        </div>
      ) : (
        <button
          className="grid min-h-[108px] w-full place-items-center rounded-[24px] border border-dashed border-[rgba(244,244,244,0.12)] bg-[#05070b]/24 px-4 text-center transition-colors hover:border-[#ffb44d]/34 hover:bg-[#ffb44d]/7"
          onClick={(event) => openMediaPicker(event.currentTarget)}
          type="button"
        >
          <span>
            <span className="mx-auto mb-3 flex justify-center gap-2">
              {(allowedTypes.length ? allowedTypes : (["image", "video", "audio"] as UploadMediaType[])).map((type) => (
                <span className="grid size-9 place-items-center rounded-full border border-[rgba(244,244,244,0.08)] bg-[#1a1c22] text-[#ffd08a]/70" key={type}>
                  <MediaTypeIcon className="size-4" type={type} />
                </span>
              ))}
            </span>
            <span className="block text-sm font-semibold text-[#f4f4f4]">{uploadTitle}</span>
            <span className="mt-1 block text-xs text-[#b9b9b9]/55">{uploadSubtitle}</span>
          </span>
        </button>
      )}

      <div className="mt-3 rounded-[18px] border border-[rgba(244,244,244,0.07)] bg-[#05070b]/14">
        <button
          className="flex w-full min-w-0 items-center justify-between gap-3 px-3 py-2 text-left"
          onClick={() => setIsAdvancedOpen((current) => !current)}
          type="button"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[.13em] text-[#b9b9b9]/56">
            {t("video.references.advancedMediaDetails")}
          </span>
          <span className="text-xs font-semibold text-[#b9b9b9]/45">{isAdvancedOpen ? "-" : "+"}</span>
        </button>
        {isAdvancedOpen ? (
          <div className="grid min-w-0 max-w-full gap-1 overflow-hidden border-t border-[rgba(244,244,244,0.06)] px-2.5 py-2 text-[11px] leading-5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="w-[74px] shrink-0 text-[10px] font-semibold uppercase tracking-[.08em] text-[#b9b9b9]/45">
                {t("video.references.compact.inputs")}
              </span>
              <span className="min-w-0 flex-1 truncate text-[#f4f4f4]/72">{inputSummary}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="w-[74px] shrink-0 text-[10px] font-semibold uppercase tracking-[.08em] text-[#b9b9b9]/45">
                {t("video.references.compact.references")}
              </span>
              <span className="min-w-0 flex-1 truncate text-[#f4f4f4]/72">
                {media.length} / {limitSummary.total}
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="w-[74px] shrink-0 text-[10px] font-semibold uppercase tracking-[.08em] text-[#b9b9b9]/45">
                {t("video.references.compact.frames")}
              </span>
              <span className="min-w-0 flex-1 truncate text-[#f4f4f4]/72">
                {t("video.references.compact.start")} {supportLabel(modelRule.supportsStartFrame)} · {t("video.references.compact.end")}{" "}
                {supportLabel(modelRule.supportsEndFrame)}
              </span>
            </div>

            {compactMappingItems.map((item) => {
              const mention = mentionById.get(item.id);
              const issues = mediaIssues.get(item.id) || [];
              const status = getMediaStatus(item, issues);
              const displayName = displayNameFor(item);
              const displayToken = mention?.displayToken || (item.type === "video" ? "@Video" : item.type === "audio" ? "@Audio" : "@Image");
              return (
                <div className="flex min-w-0 items-center gap-2" key={item.id}>
                  <span className="w-[74px] shrink-0 text-[10px] font-semibold uppercase tracking-[.08em] text-[#b9b9b9]/45">
                    {t("video.references.compact.mapping")}
                  </span>
                  <button
                    className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-1 py-px text-left transition-colors disabled:cursor-default hover:bg-[#111318]/44"
                    disabled={!mention}
                    onClick={() => {
                      if (mention) insertMention(mention);
                    }}
                    title={displayName}
                    type="button"
                  >
                    <span className="shrink-0 rounded-full border border-[#ffb44d]/20 bg-[#ffb44d]/7 px-1.5 py-px text-[10px] font-bold text-[#ffd08a]">
                      {displayToken}
                    </span>
                    <span className="shrink-0 text-[#b9b9b9]/35">→</span>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#f4f4f4]/72">{displayName}</span>
                    <span className={`shrink-0 rounded-full border px-1.5 py-px text-[9px] font-semibold ${getStatusClass(status)}`}>
                      {mediaStatusLabel(status)}
                    </span>
                  </button>
                </div>
              );
            })}
            {hiddenMappingCount > 0 ? (
              <div className="flex min-w-0 items-center gap-2">
                <span className="w-[74px] shrink-0" />
                <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-[#b9b9b9]/45">
                  {tf("video.references.compact.more", { count: hiddenMappingCount })}
                </span>
              </div>
            ) : null}

            {unsupportedItems.map((item) => {
              const issues = mediaIssues.get(item.id) || [];
              const mention = mentionById.get(item.id);
              const displayToken = mention?.displayToken || (item.type === "video" ? "@Video" : item.type === "audio" ? "@Audio" : "@Image");
              return (
                <div className="flex min-w-0 items-center gap-2 rounded-lg bg-[#ffb44d]/6 px-1 py-px" key={item.id}>
                  <span className="w-[70px] shrink-0 text-[10px] font-semibold uppercase tracking-[.08em] text-[#ffb44d]/72">
                    {t("video.references.notUsedShort")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#ffcf92]" title={getNotUsedDetail(item, issues)}>
                    <span className="font-bold">{displayToken}</span>
                    <span className="text-[#ffcf92]/65"> · {getNotUsedDetail(item, issues)}</span>
                  </span>
                </div>
              );
            })}
            {hiddenUnsupportedCount > 0 ? (
              <div className="flex min-w-0 items-center gap-2">
                <span className="w-[74px] shrink-0" />
                <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-[#ffcf92]/58">
                  {tf("video.references.compact.more", { count: hiddenUnsupportedCount })}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {openRoleItem ? (
        <div
          className="fixed z-[90] overflow-hidden rounded-[18px] border border-[#33323a]/70 bg-[#111318]/98 p-1.5 shadow-2xl shadow-black/50"
          ref={roleMenuRef}
          style={{ left: roleMenuPosition.left, top: roleMenuPosition.top, width: roleMenuPosition.width }}
        >
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[.16em] text-[#b9b9b9]/45">{t("video.references.useAs")}</p>
          {roleOptions.map((option) => {
            const currentRole = openRoleItem.role || "reference";
            const roleIssue = getReferenceRoleIssue(modelRule, openRoleItem.type, option.value);
            const isDisabled = !canUseReferenceRole(modelRule, openRoleItem.type, option.value);
            return (
              <button
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  isDisabled
                    ? "cursor-not-allowed text-[#b9b9b9]/28"
                    : currentRole === option.value
                    ? "bg-[#ffb44d]/16 text-[#ffb44d]"
                    : "text-[#b9b9b9]/70 hover:bg-[#1a1c22] hover:text-[#f4f4f4]"
                }`}
                disabled={isDisabled}
                key={option.value}
                onClick={() => {
                  onRoleChange(openRoleItem.id, option.value);
                  setOpenRoleId("");
                }}
                title={localizeIssue(roleIssue)}
                type="button"
              >
                <span>{roleLabel(option.value)}</span>
                {currentRole === option.value ? <CheckIcon /> : null}
              </button>
            );
          })}
          <div className="my-1 border-t border-[#33323a]/60" />
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-[#b9b9b9]/40">{t("video.references.interactions")}</p>
          <button
            className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#b9b9b9]/70 transition-colors hover:bg-[#1a1c22] hover:text-[#f4f4f4]"
            onClick={() => {
              setPreviewItem(openRoleItem);
              setOpenRoleId("");
            }}
            type="button"
          >
            {t("video.references.fullScreen")}
          </button>
          <button
            className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-[#b9b9b9]/70 transition-colors hover:bg-[#1a1c22] hover:text-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!openRoleMention}
            onClick={() => {
              if (openRoleMention) insertMention(openRoleMention);
              setOpenRoleId("");
            }}
            type="button"
          >
            {t("video.references.insertAt")}
          </button>
        </div>
      ) : null}

      {previewItem ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/72 px-4 py-6" onClick={() => setPreviewItem(null)}>
          <section
            className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-[#33323a]/70 bg-[#111318] shadow-2xl shadow-black/60"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-[#33323a]/60 px-4 py-3">
              <div className="min-w-0">
                <p className="se-eyebrow">{t("video.references.preview")}</p>
                <h3 className="truncate text-sm font-semibold text-[#f4f4f4]">{displayNameFor(previewItem)}</h3>
              </div>
              <button
                aria-label={t("video.references.closePreview")}
                className="grid size-9 place-items-center rounded-full border border-[rgba(244,244,244,0.08)] bg-[#1a1c22] text-base font-semibold text-[#b9b9b9]/75 transition-colors hover:border-[#ffb44d]/35 hover:text-[#ffb44d]"
                onClick={() => setPreviewItem(null)}
                type="button"
              >
                x
              </button>
            </header>
            <div className="grid min-h-[360px] place-items-center bg-black/28 p-4">
              {previewItem.type === "image" && getPreviewUrl(previewItem) && !failedPreviewIds.has(previewItem.id) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="max-h-[70vh] max-w-full rounded-2xl object-contain"
                  onError={() => markPreviewFailed(previewItem.id)}
                  src={getPreviewUrl(previewItem)}
                />
              ) : previewItem.type === "video" && previewItem.url ? (
                <video className="max-h-[70vh] max-w-full rounded-2xl object-contain" controls src={previewItem.url} />
              ) : previewItem.type === "audio" && previewItem.url ? (
                <div className="grid w-full max-w-lg gap-5 rounded-3xl border border-[#33323a]/60 bg-[#1a1c22]/65 p-8 text-center">
                  <span className="mx-auto grid size-16 place-items-center rounded-3xl border border-[rgba(244,244,244,0.08)] bg-[#33323a]/55 text-[#ffd08a]/72">
                    <MediaTypeIcon className="size-6" type="audio" />
                  </span>
                  <p className="text-sm font-semibold text-[#b9b9b9]/72">{displayNameFor(previewItem)}</p>
                  <audio className="w-full" controls src={previewItem.url} />
                </div>
              ) : (
                <div className="grid gap-3 text-center">
                  <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-[#33323a]/55 text-sm font-semibold text-[#b9b9b9]/60">
                    <MediaTypeIcon className="size-6" type={previewItem.type} />
                  </span>
                  <p className="text-sm font-semibold text-[#b9b9b9]/72">{displayNameFor(previewItem)}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
