"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { listMediaAssets } from "@/lib/assets-api";
import { getImageHistory } from "@/lib/image-api";
import { getVideoHistory, uploadMedia } from "@/lib/video-api";
import {
  mapImageHistoryToStudioAssets,
  mapLibraryAssetsToStudioAssets,
  mapUploadedMediaToStudioAsset,
  mapVideoHistoryToStudioAssets,
  mergeStudioAssets,
} from "@/features/studio/lib/studioAssets";
import { useStudioStore } from "@/features/studio/store/studioStore";
import type { AssetType, StudioAssetItem } from "@/features/studio/types/studioTypes";

type AssetFilter = "all" | AssetType;
type PanelStatus = "auth" | "error" | "idle" | "loading";

const filters: Array<{ label: string; value: AssetFilter }> = [
  { label: "All", value: "all" },
  { label: "Images", value: "image" },
  { label: "Videos", value: "video" },
  { label: "Audio", value: "audio" },
];

function formatDate(value?: string) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString([], {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}

function sourceLabel(asset: StudioAssetItem) {
  if (asset.source === "generated") return "Generated";
  if (asset.source === "history") return "History";
  if (asset.source === "remake") return "Remake";
  return "Upload";
}

function typeLabel(type: AssetType) {
  if (type === "video") return "Video";
  if (type === "audio") return "Audio";
  return "Image";
}

function AssetThumbnail({ asset }: { asset: StudioAssetItem }) {
  if (asset.type === "image" && (asset.thumbnail || asset.url)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt="" loading="lazy" src={asset.thumbnail || asset.url} />
    );
  }

  if (asset.type === "video" && asset.url) {
    return <video muted playsInline preload="metadata" src={asset.url} />;
  }

  return <span aria-hidden="true">{asset.type === "audio" ? "♪" : "◆"}</span>;
}

export function StudioAssetPanel() {
  const { isLoading: authLoading, isSignedIn } = useAuthSession();
  const addAssetNode = useStudioStore((state) => state.addAssetNode);
  const [assets, setAssets] = useState<StudioAssetItem[]>([]);
  const [filter, setFilter] = useState<AssetFilter>("all");
  const [status, setStatus] = useState<PanelStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");

  const loadAssets = useCallback(async () => {
    if (!isSignedIn) {
      setAssets([]);
      setStatus("auth");
      return;
    }

    setStatus("loading");
    setErrorMessage("");
    const [libraryResult, imageHistoryResult, videoHistoryResult] = await Promise.allSettled([
      listMediaAssets({ limit: 100 }),
      getImageHistory(50),
      getVideoHistory(80),
    ]);

    const libraryAssets =
      libraryResult.status === "fulfilled"
        ? mapLibraryAssetsToStudioAssets(libraryResult.value.assets)
        : [];
    const imageHistoryAssets =
      imageHistoryResult.status === "fulfilled"
        ? mapImageHistoryToStudioAssets(imageHistoryResult.value)
        : [];
    const videoHistoryAssets =
      videoHistoryResult.status === "fulfilled"
        ? mapVideoHistoryToStudioAssets(videoHistoryResult.value)
        : [];
    const nextAssets = mergeStudioAssets(
      libraryAssets,
      imageHistoryAssets,
      videoHistoryAssets,
    );
    const failures = [libraryResult, imageHistoryResult, videoHistoryResult].filter(
      (result) => result.status === "rejected",
    ).length;

    setAssets(nextAssets);
    setStatus(failures === 3 ? "error" : "idle");
    if (failures) {
      setErrorMessage(
        failures === 3
          ? "Unable to load your assets."
          : "Some asset sources are temporarily unavailable; available items are still shown.",
      );
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (authLoading) return;
    const timer = window.setTimeout(() => void loadAssets(), 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, loadAssets]);

  const visibleAssets = useMemo(
    () => assets.filter((asset) => filter === "all" || asset.type === filter),
    [assets, filter],
  );

  const counts = useMemo(
    () =>
      assets.reduce(
        (result, asset) => {
          result[asset.type] += 1;
          return result;
        },
        { audio: 0, image: 0, video: 0 },
      ),
    [assets],
  );

  const handleAddAsset = (asset: StudioAssetItem) => {
    addAssetNode(asset);
    setNotice(typeLabel(asset.type) + " asset added to canvas.");
    window.setTimeout(() => setNotice(""), 1800);
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^(image|video|audio)\//i.test(file.type)) {
      setErrorMessage("Choose an image, video, or audio file.");
      return;
    }

    setUploading(true);
    setErrorMessage("");
    try {
      const uploaded = await uploadMedia(file);
      const asset = mapUploadedMediaToStudioAsset(uploaded);
      setAssets((current) => mergeStudioAssets([asset], current));
      setNotice("Upload ready. Click it to add an Asset Node.");
      if (!uploaded.assetId) {
        setErrorMessage(
          "Upload completed, but its library index is unavailable. It can be used in this session.",
        );
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to upload media.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <aside className="studio-side-panel studio-node-library" aria-label="Studio asset library">
      <div className="studio-panel-heading studio-assets-heading">
        <div>
          <p>Assets</p>
          <h2>Creative inputs</h2>
          <span>Library, history, uploads, and reusable Remake media.</span>
        </div>
        <button disabled={status === "loading" || !isSignedIn} onClick={() => void loadAssets()} type="button">
          Refresh
        </button>
      </div>

      <div className="studio-asset-actions">
        <label className={"studio-upload-button" + (!isSignedIn ? " studio-upload-button-disabled" : "")}>
          <input
            accept="image/*,video/*,audio/*"
            disabled={!isSignedIn || uploading}
            onChange={(event) => void handleUpload(event)}
            type="file"
          />
          {uploading ? "Uploading..." : "Upload media"}
        </label>
        <span>No generation or provider call</span>
      </div>

      <div className="studio-asset-filters" aria-label="Asset type filters">
        {filters.map((item) => {
          const count = item.value === "all" ? assets.length : counts[item.value];
          return (
            <button
              aria-pressed={filter === item.value}
              className={filter === item.value ? "studio-asset-filter-active" : ""}
              key={item.value}
              onClick={() => setFilter(item.value)}
              type="button"
            >
              {item.label}
              <span>{count}</span>
            </button>
          );
        })}
      </div>

      {status === "auth" ? (
        <div className="studio-asset-message">
          <strong>Sign in required</strong>
          <span>Your user-owned assets are available after sign-in.</span>
          <Link href="/sign-in?next=/studio">Sign in</Link>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="studio-asset-error" role="status">
          {errorMessage}
        </div>
      ) : null}

      {notice ? <div className="studio-asset-notice" role="status">{notice}</div> : null}

      <div className="studio-asset-list">
        {status === "loading" ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div className="studio-asset-skeleton" key={index} />
          ))
        ) : visibleAssets.length ? (
          visibleAssets.map((asset) => (
            <button
              className="studio-asset-card"
              key={asset.id}
              onClick={() => handleAddAsset(asset)}
              title={"Add " + asset.name + " to canvas"}
              type="button"
            >
              <span className="studio-asset-thumbnail">
                <AssetThumbnail asset={asset} />
              </span>
              <span className="studio-asset-card-copy">
                <strong>{asset.name}</strong>
                <small>{typeLabel(asset.type)} · {sourceLabel(asset)}</small>
                <time>{formatDate(asset.createdAt)}</time>
              </span>
              <span aria-hidden="true" className="studio-asset-add">+</span>
            </button>
          ))
        ) : status !== "auth" ? (
          <div className="studio-asset-empty">
            <strong>No {filter === "all" ? "assets" : filter} found</strong>
            <span>Upload media or save a completed result to your Asset Library.</span>
          </div>
        ) : null}
      </div>

      <div className="studio-panel-note">
        <strong>A3 boundary</strong>
        <span>Click an item to add an Asset Node. Node execution remains unavailable.</span>
      </div>
    </aside>
  );
}
