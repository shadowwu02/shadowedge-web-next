"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MediaTypeIcon } from "@/components/video/MediaTypeIcon";
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
        display: item.display,
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
  return item.previewUrl || item.url || "";
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
  if (status === "ready") return "border-[#79d88a]/28 bg-[#79d88a]/10 text-[#9be8a6]";
  if (status === "uploading") return "border-[#d1fe17]/25 bg-[#d1fe17]/8 text-[#d1fe17]";
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
  const { t, tf } = useI18n();
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
  const firstIssueEntry = Array.from(mediaIssues.entries()).find(([, issues]) => issues.length > 0);
  const firstIssueItem = firstIssueEntry ? media.find((item) => item.id === firstIssueEntry[0]) || null : null;
  const firstIssue = firstIssueEntry?.[1]?.[0] || "";
  const mediaByType = useMemo(() => {
    const grouped: Record<UploadMediaType, UploadMediaItem[]> = {
      image: [],
      video: [],
      audio: [],
    };
    media.forEach((item) => {
      grouped[item.type].push(item);
    });
    return grouped;
  }, [media]);
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
  const typeSlots = useMemo(
    () =>
      (["image", "video", "audio"] as UploadMediaType[]).map((type) => ({
        type,
        items: mediaByType[type],
        limit: modelRule.maxReferences[type],
        supported: allowedTypes.includes(type) && modelRule.maxReferences[type] > 0,
      })),
    [allowedTypes, mediaByType, modelRule.maxReferences],
  );
  const isImageOnlyModel = allowedTypes.length === 1 && allowedTypes[0] === "image";

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

  function mediaStatusLabel(status: MediaStatus) {
    if (status === "ready") return t("video.references.status.ready");
    if (status === "uploading") return t("video.references.status.uploading");
    if (status === "failed") return t("video.references.status.failed");
    if (status === "unsupported") return t("video.references.status.notUsed");
    return t("video.references.status.local");
  }

  function supportLabel(supported: boolean) {
    return supported ? t("video.references.available") : t("video.references.unavailable");
  }

  function slotToneClass(supported: boolean, hasItems = false) {
    if (hasItems) return "border-[#79d88a]/22 bg-[#79d88a]/8";
    if (supported) return "border-[#ffb44d]/22 bg-[#ffb44d]/7";
    return "border-[rgba(244,244,244,0.08)] bg-[#05070b]/26";
  }

  function frameSlotToneClass(supported: boolean, hasItems = false) {
    if (hasItems) return "border-[#79d88a]/18 bg-[#79d88a]/7";
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
      : t("video.upload.mediaHint");

  return (
    <section className="se-card rounded-[24px] p-3.5" ref={rootRef}>
      <div className="mb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="se-eyebrow">{t("video.references.inputMedia")}</p>
            <h2 className="mt-1 text-sm font-semibold text-[#f4f4f4]">{uploadTitle}</h2>
          </div>
          <span className="rounded-full border border-[rgba(244,244,244,0.08)] bg-[#111318]/70 px-2.5 py-1 text-[11px] font-medium text-[#b9b9b9]/56">
            {tf("video.references.referencesCount", { count: media.length, total: limitSummary.total })}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
        <div className="se-subtle-scrollbar grid max-h-[220px] gap-2 overflow-y-auto pr-1">
          {media.map((item) => {
            const mention = mentionById.get(item.id);
            const currentRole = item.role || "reference";
            const previewUrl = getPreviewUrl(item);
            const isPreviewBroken = failedPreviewIds.has(item.id);
            const shortRole = roleShortLabel(currentRole);
            const issues = mediaIssues.get(item.id) || [];
            const status = getMediaStatus(item, issues);
            const durationLabel = formatDurationLabel(item.duration);
            const issueTitle = issues.length ? getNotUsedDetail(item, issues) : "";

            return (
              <article
                className={`group flex min-w-0 items-center gap-2 rounded-[18px] border bg-[#05070b]/28 p-2 transition-colors ${
                  issues.length ? "border-[#ffb44d]/35" : "border-[rgba(244,244,244,0.08)] hover:border-[#ffb44d]/24"
                }`}
                key={item.id}
                title={issueTitle}
              >
                <button
                  aria-label={tf("video.references.previewAsset", { name: item.name })}
                  className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-[rgba(244,244,244,0.08)] bg-[#111318]"
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
                  {shortRole ? (
                    <span className="absolute bottom-1 left-1 rounded-full bg-[#05070b]/78 px-1.5 py-px text-[8px] font-bold uppercase tracking-[.08em] text-[#ffd08a]">
                      {shortRole}
                    </span>
                  ) : null}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <button
                      className="shrink-0 rounded-full border border-[#ffb44d]/22 bg-[#ffb44d]/8 px-2 py-0.5 text-[10px] font-bold text-[#ffd08a] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!mention}
                      onClick={() => {
                        if (mention) insertMention(mention);
                      }}
                      type="button"
                    >
                      {mention?.display || allowedTypeLabel(item.type)}
                    </button>
                    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${getStatusClass(status)}`}>
                      {mediaStatusLabel(status)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs font-semibold text-[#f4f4f4]/78">{item.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-[#b9b9b9]/45">
                    <span>{allowedTypeLabel(item.type)}</span>
                    {durationLabel ? <span>{durationLabel}</span> : null}
                    {issues.length ? <span>{t("video.references.notUsedShort")}</span> : null}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    aria-label={tf("video.references.openRoleMenu", { name: item.name })}
                    className="grid size-8 place-items-center rounded-full border border-[rgba(244,244,244,0.08)] bg-[#111318]/70 text-[#b9b9b9]/62 transition-colors hover:border-[#ffb44d]/30 hover:text-[#ffb44d]"
                    onClick={(event) => {
                      setRoleMenuPosition(getRoleMenuPosition(event.currentTarget));
                      setOpenRoleId((current) => (current === item.id ? "" : item.id));
                    }}
                    type="button"
                  >
                    <MoreIcon />
                  </button>
                  <button
                    aria-label={tf("video.references.removeAsset", { name: item.name })}
                    className="grid size-8 place-items-center rounded-full text-[12px] font-semibold text-[#b9b9b9]/44 transition-colors hover:bg-[#ff6b6b]/10 hover:text-[#ff8b8b]"
                    onClick={() => onRemove(item.id)}
                    type="button"
                  >
                    x
                  </button>
                </div>
              </article>
            );
          })}

          <button
            className="grid min-h-14 place-items-center rounded-[18px] border border-dashed border-[rgba(244,244,244,0.08)] bg-[#05070b]/16 p-2 text-center transition-colors hover:border-[#ffb44d]/22 hover:bg-[#ffb44d]/5"
            onClick={(event) => openMediaPicker(event.currentTarget)}
            type="button"
          >
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#b9b9b9]/62">
              <span className="grid size-6 place-items-center rounded-full border border-[rgba(244,244,244,0.07)] bg-[#111318]/52 text-sm">+</span>
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
          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
          onClick={() => setIsAdvancedOpen((current) => !current)}
          type="button"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[.13em] text-[#b9b9b9]/56">
            {t("video.references.advancedMediaDetails")}
          </span>
          <span className="text-xs font-semibold text-[#b9b9b9]/45">{isAdvancedOpen ? "-" : "+"}</span>
        </button>
        {isAdvancedOpen ? (
          <div className="border-t border-[rgba(244,244,244,0.06)] p-3">
            <div className="rounded-[16px] border border-[rgba(244,244,244,0.08)] bg-[#05070b]/24 p-2.5">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.11em] text-[#b9b9b9]/52">
                <span>{t("video.references.capabilitySummary")}</span>
                <span className="text-[#b9b9b9]/28">/</span>
                <span>{tf("video.references.referencesCount", { count: media.length, total: limitSummary.total })}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full border border-[rgba(244,244,244,0.08)] bg-[#111318]/75 px-2 py-1 text-[11px] font-semibold text-[#f4f4f4]/78">
                  {t("video.references.inputText")}
                </span>
                {(["image", "video", "audio"] as UploadMediaType[]).map((type) => {
                  const isSupported = allowedTypes.includes(type);
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold ${
                        isSupported
                          ? "border-[#ffb44d]/24 bg-[#ffb44d]/8 text-[#ffd08a]"
                          : "border-[rgba(244,244,244,0.08)] bg-[#111318]/55 text-[#b9b9b9]/42"
                      }`}
                      key={type}
                    >
                      <MediaTypeIcon className="size-3" type={type} />
                      {allowedTypeLabel(type)}
                    </span>
                  );
                })}
                <span className="rounded-full border border-[rgba(244,244,244,0.08)] bg-[#111318]/55 px-2 py-1 text-[11px] font-semibold text-[#b9b9b9]/55">
                  {t("video.references.startFrame")}: {supportLabel(modelRule.supportsStartFrame)}
                </span>
                <span className="rounded-full border border-[rgba(244,244,244,0.08)] bg-[#111318]/55 px-2 py-1 text-[11px] font-semibold text-[#b9b9b9]/55">
                  {t("video.references.endFrame")}: {supportLabel(modelRule.supportsEndFrame)}
                </span>
              </div>
            </div>

            {firstIssue ? (
              <p className="mt-2 rounded-2xl border border-[#ffb44d]/22 bg-[#ffb44d]/8 px-3 py-2 text-xs font-semibold leading-5 text-[#ffb44d]">
                {getNotUsedDetail(firstIssueItem, [firstIssue])}
              </p>
            ) : null}

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className={`rounded-[16px] border p-2.5 ${slotToneClass(allowedTypes.length > 0, mentionItems.length > 0)}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#f4f4f4]/86">{t("video.references.slot.mainMedia")}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-[#b9b9b9]/45">
                    {tf("video.references.readyCount", { count: mentionItems.length })}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-4 text-[#b9b9b9]/52">{t("video.references.mainMediaHint")}</p>
              </div>
              <div className={`rounded-[16px] border px-2.5 py-2 ${frameSlotToneClass(modelRule.supportsStartFrame, startFrameCount > 0)}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[#f4f4f4]/68">{t("video.references.slot.startFrame")}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-[.08em] text-[#b9b9b9]/36">{supportLabel(modelRule.supportsStartFrame)}</span>
                </div>
                <p className="mt-0.5 text-[10px] leading-4 text-[#b9b9b9]/42">{tf("video.references.slotCount", { count: startFrameCount })}</p>
              </div>
              <div className={`rounded-[16px] border px-2.5 py-2 ${frameSlotToneClass(modelRule.supportsEndFrame, endFrameCount > 0)}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[#f4f4f4]/68">{t("video.references.slot.endFrame")}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-[.08em] text-[#b9b9b9]/36">{supportLabel(modelRule.supportsEndFrame)}</span>
                </div>
                <p className="mt-0.5 text-[10px] leading-4 text-[#b9b9b9]/42">{tf("video.references.slotCount", { count: endFrameCount })}</p>
              </div>
              <div className="rounded-[16px] border border-[rgba(244,244,244,0.08)] bg-[#05070b]/22 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#f4f4f4]/86">{t("video.references.slot.references")}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-[#b9b9b9]/45">{media.length}/{limitSummary.total}</span>
                </div>
                <p className="mt-1 text-[11px] leading-4 text-[#b9b9b9]/52">{t("video.references.tokenHelper")}</p>
              </div>
            </div>

            {media.length ? (
              <div className="mt-3 rounded-[18px] border border-[rgba(244,244,244,0.08)] bg-[#05070b]/18 p-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#b9b9b9]/45">{t("video.references.tokenMapping")}</p>
                  <p className="text-[11px] text-[#b9b9b9]/46">{t("video.references.tokenHelper")}</p>
                </div>
                <div className="mt-2 grid gap-1.5">
                  {typeSlots.map((slot) => {
                    const label = slot.type === "image"
                      ? t("video.references.slot.referenceImage")
                      : slot.type === "video"
                        ? t("video.references.slot.referenceVideo")
                        : t("video.references.slot.referenceAudio");

                    return (
                      <div className="rounded-[14px] border border-[rgba(244,244,244,0.055)] bg-[#111318]/38 p-1.5" key={slot.type}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#f4f4f4]/78">
                            <MediaTypeIcon className="size-3.5 text-[#ffd08a]/72" type={slot.type} />
                            {label}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                              slot.supported
                                ? "border-[#79d88a]/25 bg-[#79d88a]/8 text-[#9be8a6]"
                                : "border-[rgba(244,244,244,0.08)] bg-[#05070b]/45 text-[#b9b9b9]/44"
                            }`}
                          >
                            {slot.items.length}/{slot.limit}
                          </span>
                        </div>

                        {slot.items.length ? (
                          <div className="space-y-1">
                            {slot.items.map((item) => {
                              const mention = mentionById.get(item.id);
                              const issues = mediaIssues.get(item.id) || [];
                              const status = getMediaStatus(item, issues);
                              const durationLabel = formatDurationLabel(item.duration);

                              return (
                                <div
                                  className="flex items-center gap-2 rounded-xl border border-[rgba(244,244,244,0.055)] bg-[#05070b]/30 px-2 py-1"
                                  key={item.id}
                                  title={issues.map(localizeIssue).join(" ")}
                                >
                                  <button
                                    className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
                                    disabled={!mention}
                                    onClick={() => {
                                      if (mention) insertMention(mention);
                                    }}
                                    type="button"
                                  >
                                    <span className="flex items-center gap-2">
                                      <span className="shrink-0 rounded-full border border-[#ffb44d]/22 bg-[#ffb44d]/8 px-1.5 py-0.5 text-[10px] font-bold text-[#ffd08a]">
                                        {mention?.display || allowedTypeLabel(item.type)}
                                      </span>
                                      <span className="truncate text-[11px] font-medium text-[#f4f4f4]/72">{item.name}</span>
                                    </span>
                                    <span className="mt-px flex flex-wrap items-center gap-1.5 text-[9px] text-[#b9b9b9]/42">
                                      {durationLabel ? <span>{durationLabel}</span> : null}
                                      {issues.length ? <span>{t("video.references.notUsedShort")}</span> : null}
                                    </span>
                                  </button>
                                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${getStatusClass(status)}`}>
                                    {mediaStatusLabel(status)}
                                  </span>
                                  <button
                                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-[#b9b9b9]/44 transition-colors hover:bg-[#ff6b6b]/10 hover:text-[#ff8b8b]"
                                    onClick={() => onRemove(item.id)}
                                    type="button"
                                  >
                                    {t("video.references.removeInline")}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="rounded-xl border border-dashed border-[rgba(244,244,244,0.06)] px-2 py-1.5 text-[11px] text-[#b9b9b9]/42">
                            {slot.supported ? t("video.references.noMediaForType") : t("video.references.unsupportedByCurrentModel")}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
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
                <h3 className="truncate text-sm font-semibold text-[#f4f4f4]">{previewItem.name}</h3>
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
                  <p className="text-sm font-semibold text-[#b9b9b9]/72">{previewItem.name}</p>
                  <audio className="w-full" controls src={previewItem.url} />
                </div>
              ) : (
                <div className="grid gap-3 text-center">
                  <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-[#33323a]/55 text-sm font-semibold text-[#b9b9b9]/60">
                    <MediaTypeIcon className="size-6" type={previewItem.type} />
                  </span>
                  <p className="text-sm font-semibold text-[#b9b9b9]/72">{previewItem.name}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
