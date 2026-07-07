"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { listMediaAssets, mapMediaAssetsToUserAssets, type AssetKind, type AssetSource, type UserAsset } from "@/lib/assets-api";
import { saveAssetLibraryImageHandoff } from "@/lib/assets/assetLibraryImageHandoff";
import { ApiError } from "@/types/api";

type KindFilter = "all" | AssetKind;
type SourceFilter = "all" | AssetSource;

type LoadState = "auth" | "error" | "idle" | "loading";

const kindFilters: Array<{ label: string; value: KindFilter }> = [
  { label: "All", value: "all" },
  { label: "Images", value: "image" },
  { label: "Videos", value: "video" },
  { label: "Audio", value: "audio" },
];

const sourceFilters: Array<{ label: string; value: SourceFilter }> = [
  { label: "All sources", value: "all" },
  { label: "Uploaded", value: "uploaded" },
  { label: "Generated", value: "generated" },
  { label: "Prompt Studio", value: "prompt_studio" },
  { label: "Imported", value: "imported" },
];

function formatDate(value?: string) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatBytes(value?: number) {
  if (!value) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDuration(value?: number) {
  if (!value) return "";
  if (value < 60) return `${Math.round(value)}s`;
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function sourceLabel(source: AssetSource) {
  if (source === "prompt_studio") return "Prompt Studio";
  if (source === "generated") return "Generated";
  if (source === "imported") return "Imported";
  if (source === "uploaded") return "Uploaded";
  return "Unknown source";
}

function kindLabel(kind: AssetKind) {
  if (kind === "audio") return "Audio";
  if (kind === "video") return "Video";
  return "Image";
}

function statusLabel(status: UserAsset["status"]) {
  if (status === "ready") return "Ready";
  if (status === "failed") return "Failed";
  if (status === "unavailable") return "Unavailable";
  if (status === "deleted") return "Deleted";
  return "Unknown";
}

function statusClass(status: UserAsset["status"]) {
  if (status === "ready") return "border-emerald-300/25 bg-emerald-400/10 text-emerald-100";
  if (status === "failed" || status === "unavailable") return "border-red-300/25 bg-red-400/10 text-red-100";
  return "border-white/12 bg-white/[.06] text-white/65";
}

function truncate(value: string, length = 120) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= length) return clean;
  return `${clean.slice(0, length - 1).trim()}...`;
}

function sourceTraceRows(asset: UserAsset) {
  const trace = asset.sourceTrace;
  return [
    trace.jobId ? ["Job ID", trace.jobId] : null,
    trace.providerJobId ? ["Provider Job", trace.providerJobId] : null,
    trace.model ? ["Model", trace.model] : null,
    trace.outputType ? ["Output", trace.outputType] : null,
    trace.uploadType ? ["Upload type", trace.uploadType] : null,
    trace.promptSummary ? ["Prompt", truncate(trace.promptSummary, 180)] : null,
  ].filter((row): row is [string, string] => Boolean(row));
}

function getUseInImageDisabledReason(asset: UserAsset) {
  if (asset.kind !== "image") return "Image workspace only accepts image assets.";
  if (asset.status !== "ready") return "This asset is unavailable.";
  if (!asset.publicUrl) return "Missing renderable asset URL.";
  return "";
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-full border px-3 py-2 text-xs font-black transition ${
        active
          ? "border-[#ffcf83]/45 bg-[#ffcf83]/18 text-[#ffe6b8]"
          : "border-white/10 bg-white/[.045] text-white/58 hover:border-white/18 hover:text-white"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function AssetPreview({ asset }: { asset: UserAsset }) {
  if (asset.kind === "image" && asset.thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        src={asset.thumbnailUrl}
      />
    );
  }

  if (asset.kind === "video" && asset.publicUrl) {
    return (
      <video
        className="h-full w-full bg-black object-cover"
        muted
        preload="metadata"
        src={asset.publicUrl}
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-white/[.045] text-sm font-black text-white/45">
      {kindLabel(asset.kind)}
    </div>
  );
}

function AssetCard({
  asset,
  copiedLabel,
  onCopy,
  onUseInImage,
}: {
  asset: UserAsset;
  copiedLabel: string;
  onCopy: (value: string, label: "Job ID" | "URL") => void;
  onUseInImage: (asset: UserAsset) => void;
}) {
  const rows = sourceTraceRows(asset);
  const dimensions = asset.width && asset.height ? `${asset.width} x ${asset.height}` : "";
  const details = [dimensions, formatDuration(asset.durationSeconds), formatBytes(asset.sizeBytes)].filter(Boolean);
  const hasPublicUrl = Boolean(asset.publicUrl);
  const canCopyJobId = Boolean(asset.sourceTrace.jobId);
  const useInImageDisabledReason = getUseInImageDisabledReason(asset);
  const canUseInImage = !useInImageDisabledReason;

  return (
    <article className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[.035]">
      <div className="aspect-video overflow-hidden border-b border-white/10">
        <AssetPreview asset={asset} />
      </div>

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/12 bg-white/[.06] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-white/70">
            {kindLabel(asset.kind)}
          </span>
          <span className="rounded-full border border-white/12 bg-white/[.06] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-white/70">
            {sourceLabel(asset.source)}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${statusClass(asset.status)}`}>
            {statusLabel(asset.status)}
          </span>
        </div>

        <div>
          <h2 className="line-clamp-2 text-base font-black text-white">{asset.displayName}</h2>
          <p className="mt-1 text-xs text-white/42">{asset.filename || asset.id}</p>
          <p className="mt-2 text-xs text-white/45">{formatDate(asset.createdAt)}</p>
          {details.length ? <p className="mt-1 text-xs text-white/52">{details.join(" · ")}</p> : null}
        </div>

        {rows.length ? (
          <dl className="space-y-2 rounded-[18px] border border-white/10 bg-black/16 p-3 text-xs">
            {rows.map(([label, value]) => (
              <div className="grid gap-1 sm:grid-cols-[88px_1fr]" key={label}>
                <dt className="font-bold text-white/42">{label}</dt>
                <dd className="break-words text-white/72">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="rounded-[18px] border border-dashed border-white/12 p-3 text-xs text-white/42">
            No source trace is available for this asset yet.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {hasPublicUrl ? (
            <a
              className="rounded-full border border-white/12 bg-white/[.06] px-3 py-2 text-xs font-black text-white/78 transition hover:border-white/22 hover:text-white"
              href={asset.publicUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open
            </a>
          ) : (
            <button className="rounded-full border border-white/8 bg-white/[.03] px-3 py-2 text-xs font-black text-white/30" disabled type="button">
              Open
            </button>
          )}
          <button
            className="rounded-full border border-white/12 bg-white/[.06] px-3 py-2 text-xs font-black text-white/78 transition hover:border-white/22 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            disabled={!hasPublicUrl}
            onClick={() => onCopy(asset.publicUrl, "URL")}
            type="button"
          >
            {copiedLabel === `${asset.id}:url` ? "Copied" : "Copy URL"}
          </button>
          <button
            className="rounded-full border border-white/12 bg-white/[.06] px-3 py-2 text-xs font-black text-white/78 transition hover:border-white/22 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            disabled={!canCopyJobId}
            onClick={() => onCopy(asset.sourceTrace.jobId || "", "Job ID")}
            type="button"
          >
            {copiedLabel === `${asset.id}:job` ? "Copied" : "Copy Job ID"}
          </button>
          {hasPublicUrl ? (
            <a
              className="rounded-full border border-white/12 bg-white/[.06] px-3 py-2 text-xs font-black text-white/78 transition hover:border-white/22 hover:text-white"
              download
              href={asset.publicUrl}
            >
              Download
            </a>
          ) : (
            <button className="rounded-full border border-white/8 bg-white/[.03] px-3 py-2 text-xs font-black text-white/30" disabled type="button">
              Download
            </button>
          )}
          <button
            className={`rounded-full border px-3 py-2 text-xs font-black transition ${
              canUseInImage
                ? "border-[#ffcf83]/25 bg-[#ffcf83]/10 text-[#ffe6b8] hover:border-[#ffcf83]/45 hover:bg-[#ffcf83]/16"
                : "border-dashed border-white/14 text-white/35"
            }`}
            disabled={!canUseInImage}
            onClick={() => onUseInImage(asset)}
            title={useInImageDisabledReason || "Add this image to the Image workspace as a draft reference. No generation starts automatically."}
            type="button"
          >
            Use in Image
          </button>
          <button
            className="rounded-full border border-dashed border-white/14 px-3 py-2 text-xs font-black text-white/35"
            disabled
            title="Draft-only reuse will be connected after the asset-to-workspace draft contract is approved."
            type="button"
          >
            Reuse in Video
          </button>
        </div>
      </div>
    </article>
  );
}

export function AssetLibraryPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<UserAsset[]>([]);
  const [copiedLabel, setCopiedLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [status, setStatus] = useState<LoadState>("loading");

  const loadAssets = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");

    try {
      const result = await listMediaAssets({
        limit: 100,
        search: searchQuery.trim() || undefined,
        source: sourceFilter === "all" ? undefined : sourceFilter,
        type: kindFilter === "all" ? undefined : kindFilter,
      });
      setAssets(mapMediaAssetsToUserAssets(result.assets));
      setNextCursor(result.nextCursor);
      setStatus("idle");
    } catch (error) {
      setAssets([]);
      setNextCursor(null);
      setStatus(error instanceof ApiError && (error.kind === "auth" || error.status === 401) ? "auth" : "error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to load assets.");
    }
  }, [kindFilter, searchQuery, sourceFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAssets();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAssets]);

  const summary = useMemo(() => {
    const counts = assets.reduce(
      (acc, asset) => {
        acc[asset.kind] += 1;
        return acc;
      },
      { audio: 0, image: 0, video: 0 },
    );

    return `${assets.length} assets · ${counts.image} images · ${counts.video} videos · ${counts.audio} audio`;
  }, [assets]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchQuery(searchInput);
  }

  async function handleCopy(asset: UserAsset, value: string, label: "Job ID" | "URL") {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(`${asset.id}:${label === "URL" ? "url" : "job"}`);
      window.setTimeout(() => setCopiedLabel(""), 1600);
    } catch {
      setErrorMessage(`Could not copy ${label}.`);
    }
  }

  function handleUseInImage(asset: UserAsset) {
    const result = saveAssetLibraryImageHandoff(asset);
    if (!result.ok) {
      const message =
        result.reason === "missing_url"
          ? "Missing renderable asset URL."
          : result.reason === "unsupported_kind"
            ? "Image workspace only accepts image assets."
            : result.reason === "invalid_asset"
              ? "This asset is unavailable."
              : "Could not prepare this asset for Image workspace draft reuse.";
      setErrorMessage(message);
      return;
    }

    router.push("/workspace/image?from=asset-library");
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[28px] border border-white/10 bg-white/[.035] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffcf83]">Asset Library</p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Your saved media assets</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/58">
              Read-only library for uploaded and generated media. This view does not trigger generation, upload, billing, provider calls, or asset mutation.
            </p>
          </div>

          <form className="flex w-full max-w-md gap-2" onSubmit={handleSearchSubmit}>
            <input
              className="min-h-11 flex-1 rounded-full border border-white/10 bg-black/22 px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#ffcf83]/45"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search filename or display name"
              value={searchInput}
            />
            <button className="rounded-full bg-[#ffcf83] px-4 text-sm font-black text-[#241404] transition hover:bg-[#ffe0a3]" type="submit">
              Search
            </button>
          </form>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {kindFilters.map((filter) => (
              <FilterButton active={kindFilter === filter.value} key={filter.value} onClick={() => setKindFilter(filter.value)}>
                {filter.label}
              </FilterButton>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {sourceFilters.map((filter) => (
              <FilterButton active={sourceFilter === filter.value} key={filter.value} onClick={() => setSourceFilter(filter.value)}>
                {filter.label}
              </FilterButton>
            ))}
          </div>
        </div>
      </section>

      {status === "auth" ? (
        <div className="rounded-[24px] border border-[#ffcf83]/20 bg-[#ffcf83]/10 p-6">
          <h2 className="text-xl font-black text-white">Sign in required</h2>
          <p className="mt-2 text-sm text-white/62">Please sign in to view your asset library.</p>
          <Link className="mt-4 inline-flex rounded-full bg-[#ffcf83] px-4 py-2 text-sm font-black text-[#241404]" href="/sign-in?next=/assets">
            Sign in
          </Link>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="rounded-[24px] border border-red-300/25 bg-red-400/10 p-5 text-sm text-red-100">
          {errorMessage || "Unable to load assets."}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-white/10 bg-white/[.025] p-4 sm:p-5">
        <div className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-white">{status === "loading" ? "Loading assets..." : summary}</p>
            {nextCursor ? <p className="mt-1 text-xs text-white/42">Showing the first 100 assets. Pagination is deferred for v1.</p> : null}
          </div>
          <button
            className="w-fit rounded-full border border-white/12 bg-white/[.05] px-3 py-2 text-xs font-black text-white/70 transition hover:border-white/22 hover:text-white"
            onClick={() => void loadAssets()}
            type="button"
          >
            Refresh list
          </button>
        </div>

        {status === "loading" ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="h-80 animate-pulse rounded-[24px] border border-white/10 bg-white/[.035]" key={index} />
            ))}
          </div>
        ) : assets.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => (
              <AssetCard
                asset={asset}
                copiedLabel={copiedLabel}
                key={asset.id}
                onCopy={(value, label) => void handleCopy(asset, value, label)}
                onUseInImage={handleUseInImage}
              />
            ))}
          </div>
        ) : status === "idle" ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-white/14 p-8 text-center">
            <h2 className="text-xl font-black text-white">No assets found</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/52">
              Uploaded media and saved generated outputs will appear here when they are available through the existing asset API.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
