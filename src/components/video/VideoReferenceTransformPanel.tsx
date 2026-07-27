"use client";

import { useEffect, useMemo, useState } from "react";
import { listMediaAssets, type MediaAssetRecord } from "@/lib/assets-api";
import {
  confirmVideoReferenceTransform,
  createVideoReferenceTransformPreview,
  getVideoReferenceTransformHistory,
  getVideoReferenceTransformStatus,
} from "@/lib/video-reference-transform-api";
import { useI18n } from "@/i18n/useI18n";
import { providerMediaErrorKey } from "@/lib/provider-media-error";
import type {
  VideoReferenceTransformOperation,
  VideoReferenceTransformParams,
  VideoReferenceTransformPreview,
} from "@/types/video-reference-transform";

const DEFAULT_PARAMS: VideoReferenceTransformParams = {
  model: "seedance_2_0",
  duration: 5,
  aspectRatio: "16:9",
  resolution: "720p",
  mode: "std",
  generateAudio: true,
};

function providerMediaInputId(asset: MediaAssetRecord | undefined) {
  const metadata = asset?.metadata || {};
  const binding = metadata.providerBinding && typeof metadata.providerBinding === "object"
    ? metadata.providerBinding as Record<string, unknown>
    : {};
  const candidate = String(
    binding.providerMediaInputId || metadata.providerMediaInputId || metadata.provider_media_input_id || "",
  ).trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate) ? candidate : "";
}

function providerMediaAvailable(asset: MediaAssetRecord | undefined) {
  const metadata = asset?.metadata || {};
  const binding = metadata.providerBinding && typeof metadata.providerBinding === "object"
    ? metadata.providerBinding as Record<string, unknown>
    : {};
  return Boolean(providerMediaInputId(asset)) &&
    String(binding.bindingStatus || binding.status || metadata.providerBindingStatus || "") === "AVAILABLE" &&
    String(binding.providerMediaType || metadata.providerMediaType || "video") === "video";
}

function isTerminal(status?: string) {
  return status === "COMPLETED" || status === "FAILED" || status === "UNCERTAIN";
}

export function VideoReferenceTransformPanel() {
  const { t, tf } = useI18n();
  const [assets, setAssets] = useState<MediaAssetRecord[]>([]);
  const [sourceAssetId, setSourceAssetId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [preview, setPreview] = useState<VideoReferenceTransformPreview | null>(null);
  const [operation, setOperation] = useState<VideoReferenceTransformOperation | null>(null);
  const [history, setHistory] = useState<VideoReferenceTransformOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const source = useMemo(() => assets.find((asset) => asset.id === sourceAssetId), [assets, sourceAssetId]);

  useEffect(() => {
    let active = true;
    Promise.all([listMediaAssets({ type: "video", status: "ready", limit: 50 }), getVideoReferenceTransformHistory(12)])
      .then(([assetResult, historyItems]) => {
        if (!active) return;
        setAssets(assetResult.assets);
        setHistory(historyItems);
        setSourceAssetId((current) => current || assetResult.assets[0]?.id || "");
      })
      .catch((reason) => { if (active) { const key = providerMediaErrorKey(reason); setError(key ? t(key) : reason instanceof Error ? reason.message : String(reason)); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [t]);

  useEffect(() => {
    if (!operation || isTerminal(operation.status)) return;
    const timer = window.setInterval(() => {
      void getVideoReferenceTransformStatus(operation.operationId)
        .then((next) => setOperation(next))
        .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
    }, 3000);
    return () => window.clearInterval(timer);
  }, [operation]);

  useEffect(() => {
    if (!operation || !isTerminal(operation.status)) return;
    void getVideoReferenceTransformHistory(12).then(setHistory).catch(() => undefined);
  }, [operation]);

  const buildPreview = async () => {
    if (!source || !prompt.trim()) return;
    setWorking(true);
    setError("");
    setPreview(null);
    setOperation(null);
    try {
      setPreview(await createVideoReferenceTransformPreview({
        sourceAssetId: source.id,
        sourceProviderMediaInputId: providerMediaInputId(source),
        prompt,
        params,
      }));
    } catch (reason) {
      const key = providerMediaErrorKey(reason);
      setError(key ? t(key) : reason instanceof Error ? reason.message : String(reason));
    } finally { setWorking(false); }
  };

  const confirm = async () => {
    if (!preview || preview.status !== "READY" || preview.costStatus !== "VERIFIED") return;
    setWorking(true);
    setError("");
    try { setOperation(await confirmVideoReferenceTransform(preview.previewId)); }
    catch (reason) { const key = providerMediaErrorKey(reason); setError(key ? t(key) : reason instanceof Error ? reason.message : String(reason)); }
    finally { setWorking(false); }
  };

  return (
    <section className="space-y-4" data-testid="video-reference-transform-panel">
      <div className="rounded-[24px] border border-[#8fcbd4]/20 bg-[#8fcbd4]/[.06] p-4">
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#b8e7ee]">{t("video.transform.eyebrow")}</p>
        <h2 className="mt-2 text-xl font-black text-white">{t("video.transform.title")}</h2>
        <p className="mt-2 text-xs leading-5 text-white/55">{t("video.transform.description")}</p>
      </div>

      <label className="block rounded-[20px] border border-white/10 bg-white/[.03] p-3">
        <span className="text-xs font-bold text-white/62">{t("video.transform.source")}</span>
        <select className="mt-2 w-full rounded-xl border border-white/10 bg-[#111217] px-3 py-2.5 text-sm text-white" value={sourceAssetId}
          onChange={(event) => { setSourceAssetId(event.target.value); setPreview(null); setOperation(null); }}>
          <option value="">{loading ? t("video.transform.loadingAssets") : t("video.transform.selectSource")}</option>
          {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.displayName || asset.filename || asset.id}</option>)}
        </select>
        {source?.publicUrl || source?.url ? (
          <video className="mt-3 aspect-video w-full rounded-xl bg-black object-contain" controls preload="metadata" src={source.publicUrl || source.url || ""} />
        ) : null}
        {source && !providerMediaAvailable(source) ? <p className="mt-2 text-xs text-[#ffd08a]">{t("provider.mediaInputRequired")}</p> : null}
      </label>

      <label className="block">
        <span className="text-xs font-bold text-white/62">{t("video.transform.prompt")}</span>
        <textarea className="mt-2 min-h-28 w-full resize-y rounded-[18px] border border-white/10 bg-black/25 p-3 text-sm leading-6 text-white outline-none focus:border-[#ffb44d]/45"
          maxLength={4000} onChange={(event) => { setPrompt(event.target.value); setPreview(null); }} placeholder={t("video.transform.promptPlaceholder")} value={prompt} />
      </label>

      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 p-2"><span className="text-white/40">{t("video.transform.model")}</span><strong className="mt-1 block text-white/75">Seedance 2.0</strong></div>
        <div className="rounded-xl border border-white/10 p-2"><span className="text-white/40">{t("video.transform.duration")}</span><strong className="mt-1 block text-white/75">5s</strong></div>
        <div className="rounded-xl border border-white/10 p-2"><span className="text-white/40">{t("video.transform.output")}</span><strong className="mt-1 block text-white/75">720p · 16:9</strong></div>
      </div>
      <label className="flex items-center gap-2 text-xs text-white/62">
        <input checked={params.generateAudio} onChange={(event) => { setParams((current) => ({ ...current, generateAudio: event.target.checked })); setPreview(null); }} type="checkbox" />
        {t("video.transform.generateAudio")}
      </label>

      <button className="se-button-secondary w-full rounded-full px-4 py-3 text-sm font-black disabled:opacity-40" disabled={working || !source || !prompt.trim() || !providerMediaAvailable(source)} onClick={() => void buildPreview()} type="button">
        {working && !preview ? t("video.transform.preparing") : t("video.transform.preview")}
      </button>

      {preview ? (
        <div className="rounded-[20px] border border-white/10 bg-white/[.025] p-4" data-testid="video-reference-transform-preview">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><span className="text-white/40">{t("video.transform.estimatedCredits")}</span><strong className="mt-1 block text-white">{preview.estimatedCredits ?? "—"}</strong></div>
            <div><span className="text-white/40">{t("video.transform.costStatus")}</span><strong className="mt-1 block text-white">{preview.costStatus}</strong></div>
          </div>
          {preview.status !== "READY" ? <p className="mt-3 rounded-xl border border-[#ffb44d]/20 bg-[#ffb44d]/8 p-2 text-xs text-[#ffd08a]">{preview.riskFlags.join(" · ")}</p> : null}
          <button className="se-button-primary mt-4 w-full rounded-full px-4 py-3 text-sm font-black disabled:opacity-40" disabled={working || preview.status !== "READY" || preview.costStatus !== "VERIFIED" || Boolean(operation)} onClick={() => void confirm()} type="button">
            {working ? t("video.transform.confirming") : t("video.transform.confirm")}
          </button>
          <p className="mt-2 text-center text-[10px] leading-4 text-white/38">{t("video.transform.chargeBoundary")}</p>
        </div>
      ) : null}

      {operation ? (
        <div className="rounded-[20px] border border-[#8fcbd4]/20 bg-[#8fcbd4]/[.06] p-4">
          <p className="text-xs font-black text-[#b8e7ee]">{tf("video.transform.operationStatus", { status: operation.status })}</p>
          {operation.resultUrl ? <a className="se-button-secondary mt-3 inline-flex rounded-full px-4 py-2 text-xs font-bold" href={operation.resultUrl} rel="noreferrer" target="_blank">{t("video.transform.openResult")}</a> : null}
          {operation.errorMessage ? <p className="mt-2 text-xs text-red-200">{operation.errorMessage}</p> : null}
        </div>
      ) : null}
      {error ? <p className="rounded-xl border border-red-300/20 bg-red-400/10 p-3 text-xs text-red-100">{error}</p> : null}

      <div className="border-t border-white/10 pt-4">
        <h3 className="text-sm font-black text-white">{t("video.transform.history")}</h3>
        {history.length ? <div className="mt-3 space-y-2">{history.map((item) => (
          <article className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs" key={item.operationId}>
            <p className="font-bold text-white/75">{item.source.displayName} → {t("video.transform.historyOperation")} → {item.resultAssetId ? t("video.transform.newAsset") : item.status}</p>
            <p className="mt-1 truncate text-white/35">{item.lineage.sourceAssetId} → {item.lineage.resultAssetId || "—"}</p>
          </article>
        ))}</div> : <p className="mt-2 text-xs text-white/38">{t("video.transform.historyEmpty")}</p>}
      </div>
    </section>
  );
}
