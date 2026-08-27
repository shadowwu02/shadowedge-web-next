"use client";

import { getFluxProxyInputSlots, getFluxProxyMediaCounters, getFluxProxyMediaLimits, getFluxProxyReviewSummary, listFluxProxyMentionTokens } from "@/lib/video/fluxproxyInternational";
import { useI18n } from "@/i18n/useI18n";
import type { UploadMediaItem, VideoModel } from "@/types/video";

export function FluxProxyInternationalReferencePanel({ media, model }: { media: UploadMediaItem[]; model: VideoModel }) {
  const { locale } = useI18n();
  const zh = locale === "zh";
  const counts = getFluxProxyMediaCounters(media); const limits = getFluxProxyMediaLimits(model); const review = getFluxProxyReviewSummary(media, model.referenceBindingProfileId);
  const slots = getFluxProxyInputSlots(model);
  const format = (value: number, max: number | null) => max === null ? `${value}/unverified` : `${value}/${max}`;
  return (
    <section aria-label="International reference media" className="rounded-2xl border border-[#ffb44d]/20 bg-[#ffb44d]/[0.06] p-3 text-xs text-[#e8e8e8]">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-semibold text-[#ffd08a]">{zh ? "国际版参考素材" : "International references"}</p><p className="mt-1 text-[11px] text-[#b9b9b9]/70">{zh ? "仅限本人 Canonical Asset · 需要模型绑定审核" : "Owned canonical assets only · model-bound review required"}</p></div>
        <span className="rounded-full border border-[#ffb44d]/25 px-2 py-1 text-[10px]">{zh ? "国际版 Beta" : "International Beta"}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Media counters">
        <span>{zh ? "图片" : "Images"} {format(counts.images, limits.image)}</span><span>{zh ? "视频" : "Videos"} {format(counts.videos, limits.video)}</span><span>{zh ? "音频" : "Audio"} {format(counts.audios, limits.audio)}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Provider input slots">
        {slots.map((slot) => <span className="rounded-md bg-black/20 px-2 py-1 text-[10px] text-[#b9b9b9]/80" key={slot.type}>{slot.label}: {slot.roles.join(" · ")}</span>)}
      </div>
      {limits.videoTotalDuration !== null ? <p className="mt-2 text-[11px] text-[#b9b9b9]/70">{zh ? "视频" : "Video"} {counts.videoDuration.toFixed(1)}/{limits.videoTotalDuration}s · {zh ? "音频" : "Audio"} {counts.audioDuration.toFixed(1)}/{limits.audioTotalDuration}s</p> : <p className="mt-2 text-[11px] text-amber-200/80">{zh ? "Seedance 2.0 国际版采用保守 Beta 素材上限。" : "Seedance 2.0 International uses conservative Beta media limits."}</p>}
      {media.length ? <p className="mt-2 break-words text-[11px] text-[#b9b9b9]/75">Mention order: {listFluxProxyMentionTokens(media, locale === "zh" ? "zh" : "en").join(" ")}</p> : null}
      {review.preparing ? <p className="mt-2 text-amber-200">{zh ? `正在准备 ${review.preparing} 个参考素材…` : `Preparing ${review.preparing} asset${review.preparing === 1 ? "" : "s"} for this model…`}</p> : null}
      {review.failed || review.modelMismatch || review.assetTypeMismatch ? <p className="mt-2 text-red-300">{zh ? "素材审核失败或不属于当前模型，生成已阻止。" : "Asset review failed or does not match the current model. Generation is blocked."}</p> : null}
      {review.ready && media.length ? <p className="mt-2 text-emerald-300">{zh ? "所有参考素材已对当前模型生效。" : "All reference assets are ACTIVE for this exact model."}</p> : null}
    </section>
  );
}
