"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getReadyMentionableMediaItems } from "@/lib/video-mentions";
import type { MentionableMediaItem } from "@/lib/video-mentions";
import type { UploadMediaItem, UploadMediaRole, UploadMediaType } from "@/types/video";

const roleOptions: Array<{ label: string; shortLabel: string; value: UploadMediaRole }> = [
  { label: "Reference", shortLabel: "", value: "reference" },
  { label: "Start Frame", shortLabel: "Start", value: "start_frame" },
  { label: "End Frame", shortLabel: "End", value: "end_frame" },
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
        type: item.type,
        index: item.index,
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

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="size-3.5" fill="none" viewBox="0 0 24 24">
      <path d="m5 12 4.2 4.2L19 6.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  );
}

function roleShortLabel(role?: UploadMediaRole) {
  return roleOptions.find((option) => option.value === role)?.shortLabel || "";
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
  onRemove,
  onRoleChange,
}: {
  media: UploadMediaItem[];
  onRemove: (id: string) => void;
  onRoleChange: (id: string, role: UploadMediaRole) => void;
}) {
  const mentionItems = getReadyMentionableMediaItems(media);
  const mentionById = useMemo(() => new Map(mentionItems.map((item) => [item.id, item])), [mentionItems]);
  const [openRoleId, setOpenRoleId] = useState("");
  const [roleMenuPosition, setRoleMenuPosition] = useState<RoleMenuPosition>({ left: 12, top: 12, width: 190 });
  const [previewItem, setPreviewItem] = useState<UploadMediaItem | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!openRoleId) return;

    function closeRoleMenu(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
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

  return (
    <section className="rounded-[22px] border border-white/10 bg-white/[.04] p-3" ref={rootRef}>
      <div className="mb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ffcf83]">Input Media</p>
            <h2 className="mt-1 text-sm font-black text-white">Main media</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-bold text-white/42">
            {mentionItems.length} ready
          </span>
        </div>
        <p className="mt-2 text-xs leading-5 text-white/42">Add the images, videos, or audio this model should follow.</p>
      </div>

      {media.length ? (
        <div className="se-subtle-scrollbar grid max-h-[210px] grid-cols-2 gap-2 overflow-y-auto pr-1">
          {media.map((item) => {
            const mention = mentionById.get(item.id);
            const currentRole = item.role || "reference";
            const previewUrl = getPreviewUrl(item);
            const shortRole = roleShortLabel(currentRole);

            return (
              <article
                className="group relative h-[82px] overflow-hidden rounded-[16px] border border-white/10 bg-black/24 transition hover:border-[#ffb44d]/38"
                key={item.id}
              >
                <button
                  aria-label={`Preview ${item.name}`}
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
                    <span className="grid size-12 place-items-center rounded-2xl bg-white/[.08] text-[11px] font-black uppercase tracking-[.14em] text-white/52">
                      {mediaFallback(item.type)}
                    </span>
                  )}
                  <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/18" />
                </button>

                {shortRole ? (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/72 px-2 py-0.5 text-[9px] font-black uppercase tracking-[.08em] text-[#ffd08a]">
                    {shortRole}
                  </span>
                ) : null}

                <span className="absolute left-1.5 top-1.5 rounded-full bg-black/62 px-2 py-0.5 text-[9px] font-black uppercase tracking-[.08em] text-white/58 opacity-0 transition group-hover:opacity-100">
                  {mention?.display || mediaFallback(item.type)}
                </span>

                <button
                  aria-label={`Remove ${item.name}`}
                  className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-black/78 text-[11px] text-white/76 opacity-0 transition hover:text-red-100 group-hover:opacity-100"
                  onClick={() => onRemove(item.id)}
                  type="button"
                >
                  x
                </button>

                <button
                  aria-label={`Full screen ${item.name}`}
                  className="absolute bottom-1.5 right-1.5 grid size-7 place-items-center rounded-full border border-white/10 bg-black/78 text-white/80 opacity-0 transition hover:border-[#ffb44d]/38 hover:text-[#ffd08a] group-hover:opacity-100"
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
                    aria-label={`Open ${item.name} role menu`}
                    className="pointer-events-auto grid size-9 place-items-center rounded-full border border-white/10 bg-black/78 text-base font-black leading-none text-white/82 shadow-xl shadow-black/30 transition hover:border-[#ffb44d]/38 hover:text-[#ffd08a]"
                    onClick={(event) => {
                      event.stopPropagation();
                      setRoleMenuPosition(getRoleMenuPosition(event.currentTarget));
                      setOpenRoleId((current) => (current === item.id ? "" : item.id));
                    }}
                    type="button"
                  >
                    ...
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
              <span className="mx-auto grid size-8 place-items-center rounded-full border border-white/10 bg-black/28 text-lg font-black text-white/60">
                +
              </span>
              <span className="mt-1.5 block text-xs font-black text-white">Add more</span>
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
                <span className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/[.06] text-[10px] font-black text-white/48" key={item}>
                  {item}
                </span>
              ))}
            </span>
            <span className="block text-sm font-black text-white">Upload media</span>
            <span className="mt-1 block text-xs text-white/45">Image, video, or audio</span>
          </span>
        </button>
      )}

      {openRoleItem ? (
        <div
          className="fixed z-[90] overflow-hidden rounded-[18px] border border-white/10 bg-[#10141f]/98 p-1.5 shadow-2xl shadow-black/50"
          style={{ left: roleMenuPosition.left, top: roleMenuPosition.top, width: roleMenuPosition.width }}
        >
          <p className="px-3 py-2 text-[10px] font-black uppercase tracking-[.16em] text-white/38">Use as ...</p>
          {roleOptions.map((option) => {
            const currentRole = openRoleItem.role || "reference";
            return (
              <button
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
                  currentRole === option.value
                    ? "bg-[#ffb44d]/16 text-[#ffd08a]"
                    : "text-white/68 hover:bg-white/[.06] hover:text-white"
                }`}
                key={option.value}
                onClick={() => {
                  onRoleChange(openRoleItem.id, option.value);
                  setOpenRoleId("");
                }}
                type="button"
              >
                <span>{option.label}</span>
                {currentRole === option.value ? <CheckIcon /> : null}
              </button>
            );
          })}
          <div className="my-1 border-t border-white/10" />
          <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-white/32">Interactions</p>
          <button
            className="w-full rounded-xl px-3 py-2 text-left text-xs font-bold text-white/68 transition hover:bg-white/[.06] hover:text-white"
            onClick={() => {
              setPreviewItem(openRoleItem);
              setOpenRoleId("");
            }}
            type="button"
          >
            Full Screen
          </button>
          <button
            className="w-full rounded-xl px-3 py-2 text-left text-xs font-bold text-white/68 transition hover:bg-white/[.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!openRoleMention}
            onClick={() => {
              if (openRoleMention) insertMention(openRoleMention);
              setOpenRoleId("");
            }}
            type="button"
          >
            Insert @ reference
          </button>
        </div>
      ) : null}

      {previewItem ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/72 px-4 py-6" onClick={() => setPreviewItem(null)}>
          <section
            className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/10 bg-[#10141c] shadow-2xl shadow-black/60"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#ffcf83]">Preview</p>
                <h3 className="truncate text-sm font-black text-white">{previewItem.name}</h3>
              </div>
              <button
                aria-label="Close preview"
                className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/[.055] text-base font-black text-white/68 transition hover:border-[#ffb44d]/35 hover:text-[#ffd08a]"
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
                <div className="grid w-full max-w-lg gap-5 rounded-3xl border border-white/10 bg-white/[.04] p-8 text-center">
                  <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-white/[.08] text-sm font-black text-white/50">AUD</span>
                  <p className="text-sm font-bold text-white/62">{previewItem.name}</p>
                  <audio className="w-full" controls src={previewItem.url} />
                </div>
              ) : (
                <div className="grid gap-3 text-center">
                  <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-white/[.06] text-sm font-black text-white/50">
                    {mediaFallback(previewItem.type)}
                  </span>
                  <p className="text-sm font-bold text-white/62">{previewItem.name}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
