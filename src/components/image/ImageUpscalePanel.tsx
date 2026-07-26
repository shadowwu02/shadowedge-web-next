"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { confirmImageUpscale, createImageUpscalePreview, getImageUpscaleHistory, getImageUpscaleStatus } from "@/lib/image-upscale-api";
import type { ImageUpscaleJob, ImageUpscalePreview, ImageUpscaleSource } from "@/types/image-upscale";

function dimensions(width?: number | null, height?: number | null) {
  return width && height ? `${width} × ${height}` : "—";
}

function terminal(status?: string) {
  return status === "COMPLETED" || status === "FAILED";
}

const statusKeys = {
  PENDING: "image.upscale.status.pending",
  PROCESSING: "image.upscale.status.processing",
  COMPLETED: "image.upscale.status.completed",
  FAILED: "image.upscale.status.failed",
} as const;

export function ImageUpscalePanel({ source, onClose }: { source: ImageUpscaleSource; onClose: () => void }) {
  const { t, tf } = useI18n();
  const [scale, setScale] = useState<2 | 4>(2);
  const [preview, setPreview] = useState<ImageUpscalePreview | null>(null);
  const [job, setJob] = useState<ImageUpscaleJob | null>(null);
  const [history, setHistory] = useState<ImageUpscaleJob[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let active = true;
    void createImageUpscalePreview(source, scale)
      .then((next) => { if (active) setPreview(next); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : String(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [scale, source]);

  const changeScale = (nextScale: 2 | 4) => {
    setLoading(true);
    setError("");
    setPreview(null);
    setJob(null);
    setScale(nextScale);
  };

  useEffect(() => {
    if (!job || terminal(job.status)) return;
    const timer = window.setInterval(() => {
      void getImageUpscaleStatus(job.operationId)
        .then((next) => setJob(next))
        .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
    }, 2500);
    return () => window.clearInterval(timer);
  }, [job]);

  useEffect(() => {
    let active = true;
    void getImageUpscaleHistory(10)
      .then((items) => { if (active) setHistory(items); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [job?.status]);

  const confirm = async () => {
    if (!preview || preview.status !== "READY") return;
    setConfirming(true);
    setError("");
    try {
      setJob(await confirmImageUpscale(preview.previewId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div aria-modal="true" className="fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="dialog">
      <section className="se-panel se-scrollbar max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[30px] border border-white/12 p-5 shadow-2xl sm:p-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="se-eyebrow">{t("image.upscale.eyebrow")}</p>
            <h2 className="mt-2 text-2xl font-black text-white">{t("image.upscale.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">{t("image.upscale.previewBoundary")}</p>
          </div>
          <button className="se-button-ghost rounded-full px-4 py-2 text-xs font-bold" onClick={onClose} type="button">
            {t("image.upscale.close")}
          </button>
        </header>

        <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(280px,.9fr)]">
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/35">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={source.displayName || t("image.upscale.original")} className="aspect-square h-full w-full object-contain" src={source.url} />
          </div>
          <div className="space-y-4">
            <div className="rounded-[20px] border border-white/10 bg-white/[.035] p-4">
              <p className="text-xs font-black uppercase tracking-[.12em] text-white/42">{t("image.upscale.scale")}</p>
              <div className="mt-3 flex gap-2">
                {([2, 4] as const).map((item) => (
                  <button
                    className={`rounded-full border px-5 py-2 text-sm font-black ${scale === item ? "border-[#ffb44d]/55 bg-[#ffb44d]/16 text-[#ffd08a]" : "border-white/10 bg-white/[.035] text-white/60"}`}
                    disabled={Boolean(job)}
                    key={item}
                    onClick={() => changeScale(item)}
                    type="button"
                  >
                    {item}×
                  </button>
                ))}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 rounded-[20px] border border-white/10 bg-white/[.025] p-4 text-sm">
              <div><dt className="text-white/42">{t("image.upscale.originalSize")}</dt><dd className="mt-1 font-bold text-white/82">{dimensions(source.width, source.height)}</dd></div>
              <div><dt className="text-white/42">{t("image.upscale.outputSize")}</dt><dd className="mt-1 font-bold text-white/82">{dimensions(preview?.output.width, preview?.output.height)}</dd></div>
              <div><dt className="text-white/42">{t("image.upscale.estimatedCredits")}</dt><dd className="mt-1 font-bold text-white/82">{preview?.estimatedCredits ?? "—"}</dd></div>
              <div><dt className="text-white/42">{t("image.upscale.estimatedTime")}</dt><dd className="mt-1 font-bold text-white/82">{preview ? tf("image.upscale.secondsRange", preview.estimatedDurationSeconds) : "—"}</dd></div>
            </dl>

            {loading ? <p className="rounded-[18px] border border-white/10 p-3 text-sm text-white/55">{t("image.upscale.loadingPreview")}</p> : null}
            {preview?.status === "BLOCKED" ? (
              <div className="rounded-[18px] border border-[#ffb44d]/25 bg-[#ffb44d]/10 p-3 text-sm leading-6 text-[#ffe2ad]">
                <p className="font-bold">{t("image.upscale.providerBlocked")}</p>
                <p className="mt-1 text-xs text-[#ffe2ad]/70">{preview.riskFlags.join(" · ")}</p>
              </div>
            ) : null}
            {error ? <p className="rounded-[18px] border border-red-300/25 bg-red-400/10 p-3 text-sm text-red-100">{error}</p> : null}

            {job ? (
              <div className="rounded-[20px] border border-[#8fcbd4]/20 bg-[#8fcbd4]/8 p-4">
                <p className="text-xs font-black uppercase tracking-[.12em] text-[#b8e7ee]">{t("image.upscale.jobStatus")}</p>
                <p className="mt-2 text-lg font-black text-white">{t(statusKeys[job.status])}</p>
                {job.resultUrl ? (
                  <a className="se-button-secondary mt-4 inline-flex rounded-full px-4 py-2 text-xs font-bold" href={job.resultUrl} rel="noreferrer" target="_blank">
                    {t("image.upscale.openResult")}
                  </a>
                ) : null}
                {job.status === "FAILED" ? <p className="mt-2 text-xs text-red-200">{job.errorMessage || t("image.upscale.failedRefund")}</p> : null}
              </div>
            ) : null}

            <button
              className="se-button-primary w-full rounded-full px-5 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40"
              disabled={loading || confirming || preview?.status !== "READY" || Boolean(job)}
              onClick={() => void confirm()}
              type="button"
            >
              {confirming ? t("image.upscale.confirming") : t("image.upscale.confirm")}
            </button>
            <p className="text-center text-xs leading-5 text-white/38">{t("image.upscale.chargeBoundary")}</p>
          </div>
        </div>
        <div className="mt-6 border-t border-white/10 pt-5">
          <h3 className="text-sm font-black text-white">{t("image.upscale.history")}</h3>
          <p className="mt-1 text-xs text-white/42">{t("image.upscale.historyHint")}</p>
          {history.length ? (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {history.map((item) => (
                <article className="rounded-[18px] border border-white/10 bg-white/[.025] p-3" key={item.operationId}>
                  <div className="flex items-center gap-2 text-xs font-bold text-white/70">
                    <span className="truncate">{item.source.displayName || t("image.upscale.original")}</span>
                    <span aria-hidden="true" className="text-[#ffb44d]">→</span>
                    <span>{tf("image.upscale.historyOperation", { scale: item.scale })}</span>
                    <span aria-hidden="true" className="text-[#ffb44d]">→</span>
                    <span>{item.status === "COMPLETED" ? t("image.upscale.newAsset") : t(statusKeys[item.status])}</span>
                  </div>
                  <p className="mt-2 truncate text-[10px] text-white/35">{item.lineage.sourceAssetId || item.lineage.sourceJobId} → {item.lineage.resultAssetId || "—"}</p>
                </article>
              ))}
            </div>
          ) : <p className="mt-3 text-xs text-white/38">{t("image.upscale.historyEmpty")}</p>}
        </div>
      </section>
    </div>
  );
}
