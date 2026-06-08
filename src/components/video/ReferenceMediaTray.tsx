"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

function mediaFallback(type: UploadMediaType) {
  if (type === "audio") return "AUD";
  if (type === "video") return "VID";
  return "IMG";
}

function FullscreenIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path d="M8 4H4v4M16 4h4v4M8 20H4v-4M20 16v4h-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
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
  const firstIssue = Array.from(mediaIssues.values()).flat()[0] || "";

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

  return (
    <section className="rounded-[22px] border border-[#33323a]/60 bg-[#1a1c22]/55 p-3" ref={rootRef}>
      <div className="mb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ffb44d]">{t("video.references.inputMedia")}</p>
            <h2 className="mt-1 text-sm font-black text-white">{t("video.references.mainMedia")}</h2>
          </div>
          <span className="rounded-full border border-[#33323a]/60 bg-[#111318]/70 px-2.5 py-1 text-[11px] font-bold text-[#b9b9b9]/50">
            {tf("video.references.readyCount", { count: mentionItems.length })}
          </span>
        </div>
        <p className="mt-2 text-xs leading-5 text-[#b9b9b9]/55">
          {allowedTypes.length
            ? tf("video.references.allowedSummary", {
                model: modelRule.label,
                total: limitSummary.total,
                types: allowedTypes.map((type) => allowedTypeLabel(type)).join(", "),
              })
            : tf("video.references.modelDoesNotAcceptNamed", { model: modelRule.label })}
        </p>
        {firstIssue ? (
          <p className="mt-2 rounded-2xl border border-[#ffb44d]/30 bg-[#ffb44d]/10 px-3 py-2 text-xs font-bold leading-5 text-[#ffb44d]">
            {localizeIssue(firstIssue)}
          </p>
        ) : null}
      </div>

      {media.length ? (
        <div className="se-subtle-scrollbar grid max-h-[210px] grid-cols-2 gap-2 overflow-y-auto pr-1">
          {media.map((item) => {
            const mention = mentionById.get(item.id);
            const currentRole = item.role || "reference";
            const previewUrl = getPreviewUrl(item);
            const shortRole = roleShortLabel(currentRole);
            const issues = mediaIssues.get(item.id) || [];
            const hasIssues = issues.length > 0;

            return (
              <article
                className={`group relative h-[82px] overflow-hidden rounded-[16px] border bg-black/24 transition ${
                  hasIssues ? "border-[#ffb44d]/55" : "border-[#33323a]/60 hover:border-[#ffb44d]/38"
                }`}
                key={item.id}
                title={issues.map(localizeIssue).join(" ")}
              >
                <button
                  aria-label={tf("video.references.previewAsset", { name: item.name })}
                  className="absolute inset-0 grid place-items-center overflow-hidden text-left"
                  onClick={() => setPreviewItem(item)}
                  type="button"
                >
                  {item.type === "image" && previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="h-full w-full object-cover" src={previewUrl} />
                  ) : item.type === "video" && item.url ? (
                    <video className="h-full w-full object-cover" muted playsInline preload="metadata" src={item.url} />
                  ) : (
                    <span className="grid size-12 place-items-center rounded-2xl bg-[#33323a]/55 text-[11px] font-black uppercase tracking-[.14em] text-[#b9b9b9]/70">
                      {mediaFallback(item.type)}
                    </span>
                  )}
                  <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/18" />
                </button>

                {shortRole ? (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-[#05070b]/72 px-2 py-0.5 text-[9px] font-black uppercase tracking-[.08em] text-[#ffb44d]">
                    {shortRole}
                  </span>
                ) : null}

                {hasIssues ? (
                  <span className="absolute right-1.5 top-8 grid size-5 place-items-center rounded-full border border-[#ffb44d]/35 bg-[#05070b]/72 text-[11px] font-black text-[#ffb44d]">
                    !
                  </span>
                ) : null}

                <span className="absolute left-1.5 top-1.5 rounded-full bg-[#05070b]/62 px-2 py-0.5 text-[9px] font-black uppercase tracking-[.08em] text-[#b9b9b9]/65 opacity-0 transition group-hover:opacity-100">
                  {mention?.display || mediaFallback(item.type)}
                </span>

                <button
                  aria-label={tf("video.references.removeAsset", { name: item.name })}
                  className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-[#05070b]/78 text-[11px] text-[#f4f4f4]/76 opacity-0 transition hover:text-red-100 group-hover:opacity-100"
                  onClick={() => onRemove(item.id)}
                  type="button"
                >
                  x
                </button>

                <button
                  aria-label={tf("video.references.fullScreenAsset", { name: item.name })}
                  className="absolute bottom-1.5 right-1.5 grid size-7 place-items-center rounded-full border border-[#33323a]/60 bg-[#05070b]/78 text-[#f4f4f4]/80 opacity-0 transition hover:border-[#ffb44d]/38 hover:text-[#ffb44d] group-hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    setPreviewItem(item);
                  }}
                  type="button"
                >
                  <FullscreenIcon />
                </button>

                <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
                  <button
                    aria-label={tf("video.references.openRoleMenu", { name: item.name })}
                    className="pointer-events-auto grid size-[30px] place-items-center rounded-full border border-[#33323a]/60 bg-[#05070b]/78 text-[#f4f4f4]/82 shadow-xl shadow-black/30 transition hover:border-[#ffb44d]/38 hover:text-[#ffb44d]"
                    onClick={(event) => {
                      event.stopPropagation();
                      setRoleMenuPosition(getRoleMenuPosition(event.currentTarget));
                      setOpenRoleId((current) => (current === item.id ? "" : item.id));
                    }}
                    type="button"
                  >
                    <MoreIcon />
                  </button>
                </div>
              </article>
            );
          })}

          <button
            className="grid h-[82px] place-items-center rounded-[16px] border border-dashed border-[#ffb44d]/34 bg-[#ffb44d]/8 p-3 text-center transition hover:bg-[#ffb44d]/12"
            onClick={(event) => openMediaPicker(event.currentTarget)}
            type="button"
          >
            <span>
              <span className="mx-auto grid size-8 place-items-center rounded-full border border-[#33323a]/60 bg-[#111318]/70 text-lg font-black text-[#b9b9b9]/65">
                +
              </span>
              <span className="mt-1.5 block text-xs font-black text-white">{t("video.references.addMore")}</span>
            </span>
          </button>
        </div>
      ) : (
        <button
          className="grid min-h-[124px] w-full place-items-center rounded-[22px] border border-dashed border-white/14 bg-black/18 px-4 text-center transition hover:border-[#ffb44d]/40 hover:bg-[#ffb44d]/8"
          onClick={(event) => openMediaPicker(event.currentTarget)}
          type="button"
        >
          <span>
            <span className="mx-auto mb-3 flex justify-center gap-2">
              {["IMG", "VID", "AUD"].map((item) => (
                <span className="grid size-9 place-items-center rounded-full border border-[#33323a]/60 bg-[#1a1c22] text-[10px] font-black text-[#b9b9b9]/60" key={item}>
                  {item}
                </span>
              ))}
            </span>
            <span className="block text-sm font-black text-white">{t("video.upload.title")}</span>
            <span className="mt-1 block text-xs text-[#b9b9b9]/55">{t("video.upload.subtitle")}</span>
          </span>
        </button>
      )}

      {openRoleItem ? (
        <div
          className="fixed z-[90] overflow-hidden rounded-[18px] border border-[#33323a]/70 bg-[#111318]/98 p-1.5 shadow-2xl shadow-black/50"
          ref={roleMenuRef}
          style={{ left: roleMenuPosition.left, top: roleMenuPosition.top, width: roleMenuPosition.width }}
        >
          <p className="px-3 py-2 text-[10px] font-black uppercase tracking-[.16em] text-[#b9b9b9]/45">{t("video.references.useAs")}</p>
          {roleOptions.map((option) => {
            const currentRole = openRoleItem.role || "reference";
            const roleIssue = getReferenceRoleIssue(modelRule, openRoleItem.type, option.value);
            const isDisabled = !canUseReferenceRole(modelRule, openRoleItem.type, option.value);
            return (
              <button
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
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
          <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-[#b9b9b9]/40">{t("video.references.interactions")}</p>
          <button
            className="w-full rounded-xl px-3 py-2 text-left text-xs font-bold text-[#b9b9b9]/70 transition hover:bg-[#1a1c22] hover:text-[#f4f4f4]"
            onClick={() => {
              setPreviewItem(openRoleItem);
              setOpenRoleId("");
            }}
            type="button"
          >
            {t("video.references.fullScreen")}
          </button>
          <button
            className="w-full rounded-xl px-3 py-2 text-left text-xs font-bold text-[#b9b9b9]/70 transition hover:bg-[#1a1c22] hover:text-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-40"
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
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ffb44d]">{t("video.references.preview")}</p>
                <h3 className="truncate text-sm font-black text-white">{previewItem.name}</h3>
              </div>
              <button
                aria-label={t("video.references.closePreview")}
                className="grid size-9 place-items-center rounded-full border border-[#33323a]/60 bg-[#1a1c22] text-base font-black text-[#b9b9b9]/75 transition hover:border-[#ffb44d]/35 hover:text-[#ffb44d]"
                onClick={() => setPreviewItem(null)}
                type="button"
              >
                x
              </button>
            </header>
            <div className="grid min-h-[360px] place-items-center bg-black/28 p-4">
              {previewItem.type === "image" && getPreviewUrl(previewItem) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" className="max-h-[70vh] max-w-full rounded-2xl object-contain" src={getPreviewUrl(previewItem)} />
              ) : previewItem.type === "video" && previewItem.url ? (
                <video className="max-h-[70vh] max-w-full rounded-2xl object-contain" controls src={previewItem.url} />
              ) : previewItem.type === "audio" && previewItem.url ? (
                <div className="grid w-full max-w-lg gap-5 rounded-3xl border border-[#33323a]/60 bg-[#1a1c22]/65 p-8 text-center">
                  <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-[#33323a]/55 text-sm font-black text-[#b9b9b9]/60">AUD</span>
                  <p className="text-sm font-bold text-[#b9b9b9]/72">{previewItem.name}</p>
                  <audio className="w-full" controls src={previewItem.url} />
                </div>
              ) : (
                <div className="grid gap-3 text-center">
                  <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-[#33323a]/55 text-sm font-black text-[#b9b9b9]/60">
                    {mediaFallback(previewItem.type)}
                  </span>
                  <p className="text-sm font-bold text-[#b9b9b9]/72">{previewItem.name}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
