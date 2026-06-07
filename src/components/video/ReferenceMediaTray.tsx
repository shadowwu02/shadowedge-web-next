"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getReadyMentionableMediaItems } from "@/lib/video-mentions";
import type { MentionableMediaItem } from "@/lib/video-mentions";
import type { UploadMediaItem, UploadMediaRole, UploadMediaType } from "@/types/video";

const roleOptions: Array<{ label: string; value: UploadMediaRole }> = [
  { label: "Reference", value: "reference" },
  { label: "Start Frame", value: "start_frame" },
  { label: "End Frame", value: "end_frame" },
];

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

function roleLabel(role?: UploadMediaRole) {
  if (role === "start_frame") return "Start Frame";
  if (role === "end_frame") return "End Frame";
  return "Reference";
}

function statusLabel(status?: UploadMediaItem["uploadStatus"]) {
  if (status === "failed") return "Failed";
  if (status === "uploading") return "Uploading";
  return "Ready";
}

function statusClassName(status?: UploadMediaItem["uploadStatus"]) {
  if (status === "failed") return "bg-red-400/18 text-red-100";
  if (status === "uploading") return "bg-[#ffb44d]/18 text-[#ffd08a]";
  return "bg-emerald-400/18 text-emerald-100";
}

function getPreviewUrl(item: UploadMediaItem) {
  return item.previewUrl || item.url || "";
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
        <div className="se-subtle-scrollbar grid max-h-[284px] grid-cols-2 gap-2 overflow-y-auto pr-1">
          {media.map((item) => {
            const mention = mentionById.get(item.id);
            const currentRole = item.role || "reference";
            const previewUrl = getPreviewUrl(item);
            const canInsert = Boolean(mention);

            return (
              <article
                className="group relative overflow-visible rounded-[20px] border border-white/10 bg-black/22 p-1.5 transition hover:border-[#ffb44d]/38"
                key={item.id}
              >
                <button
                  className="relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-2xl bg-white/[.055] text-left"
                  onClick={() => setPreviewItem(item)}
                  type="button"
                >
                  {item.type === "image" && previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" className="h-full w-full object-cover" src={previewUrl} />
                  ) : item.type === "video" && item.url ? (
                    <video className="h-full w-full object-cover" muted playsInline preload="metadata" src={item.url} />
                  ) : (
                    <span className="grid size-12 place-items-center rounded-2xl bg-white/[.06] text-[11px] font-black uppercase tracking-[.14em] text-white/52">
                      {mediaFallback(item.type)}
                    </span>
                  )}
                  <span className="absolute bottom-1.5 left-1.5 max-w-[58%] truncate rounded-full bg-black/72 px-2 py-1 text-[9px] font-black uppercase tracking-[.08em] text-[#ffd08a]">
                    {roleLabel(currentRole)}
                  </span>
                  <span
                    className={`absolute bottom-1.5 right-1.5 max-w-[46%] truncate rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[.08em] ${statusClassName(item.uploadStatus)}`}
                  >
                    {statusLabel(item.uploadStatus)}
                  </span>
                </button>

                <button
                  aria-label={`Remove ${item.name}`}
                  className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-black/78 text-[11px] text-white/76 opacity-0 transition hover:text-red-100 group-hover:opacity-100"
                  onClick={() => onRemove(item.id)}
                  type="button"
                >
                  x
                </button>

                <div className="absolute left-2 top-2">
                  <button
                    aria-expanded={openRoleId === item.id}
                    aria-label={`Open ${item.name} role menu`}
                    className="grid size-7 place-items-center rounded-full border border-white/10 bg-black/74 text-sm font-black leading-none text-white/70 opacity-0 transition hover:border-[#ffb44d]/38 hover:text-[#ffd08a] group-hover:opacity-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenRoleId((current) => (current === item.id ? "" : item.id));
                    }}
                    type="button"
                  >
                    ...
                  </button>

                  {openRoleId === item.id ? (
                    <div className="absolute left-0 top-8 z-[90] w-40 overflow-hidden rounded-2xl border border-white/10 bg-[#10141f]/98 p-1 shadow-2xl shadow-black/50">
                      {roleOptions.map((option) => (
                        <button
                          className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
                            currentRole === option.value
                              ? "bg-[#ffb44d]/16 text-[#ffd08a]"
                              : "text-white/68 hover:bg-white/[.06] hover:text-white"
                          }`}
                          key={option.value}
                          onClick={(event) => {
                            event.stopPropagation();
                            onRoleChange(item.id, option.value);
                            setOpenRoleId("");
                          }}
                          type="button"
                        >
                          <span>{option.label}</span>
                          {currentRole === option.value ? <span>OK</span> : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 px-1">
                  <span className="min-w-0 truncate text-[11px] font-black text-[#ffd08a]">
                    {mention?.display || mediaFallback(item.type)}
                  </span>
                  <button
                    className="shrink-0 rounded-full border border-white/10 bg-white/[.045] px-2 py-1 text-[10px] font-black text-white/62 transition hover:border-[#ffb44d]/38 hover:text-[#ffd08a] disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!canInsert}
                    onClick={() => {
                      if (mention) insertMention(mention);
                    }}
                    type="button"
                  >
                    Insert @
                  </button>
                </div>
              </article>
            );
          })}

          <button
            className="grid min-h-[132px] place-items-center rounded-[20px] border border-dashed border-[#ffb44d]/34 bg-[#ffb44d]/8 p-3 text-center transition hover:bg-[#ffb44d]/12"
            onClick={(event) => openMediaPicker(event.currentTarget)}
            type="button"
          >
            <span>
              <span className="mx-auto grid size-9 place-items-center rounded-full border border-white/10 bg-black/28 text-xl font-black text-white/60">
                +
              </span>
              <span className="mt-2 block text-sm font-black text-white">Add more</span>
              <span className="mt-1 block text-xs text-white/42">Image, video, or audio</span>
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
