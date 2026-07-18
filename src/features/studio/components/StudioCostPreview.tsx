"use client";

import { useEffect, useMemo, useState } from "react";
import type { StudioNodeData } from "@/features/studio/types/studioTypes";
import { getImageModels } from "@/lib/image-api";
import {
  estimateImageCredits,
  getImageModelById,
} from "@/lib/image/imageModelRules";
import { estimateVideoCreditsForParams } from "@/lib/video/videoModelRules";
import type { ImageModel } from "@/types/image";

let imageModelsPromise: Promise<ImageModel[]> | null = null;

function loadImageModelsForPreview() {
  imageModelsPromise ||= getImageModels().catch(() => []);
  return imageModelsPromise;
}

export function StudioCostPreview({ data }: { data: StudioNodeData }) {
  const fallbackImageCost = useMemo(() => {
    if (data.kind !== "imageGenerate") return null;
    return estimateImageCredits(getImageModelById([], data.model), {
      ratio: data.ratio,
      resolution: data.size,
      quality: data.quality,
      batchCount: data.count,
    });
  }, [data]);
  const [imageCost, setImageCost] = useState<number | null>(fallbackImageCost);

  useEffect(() => {
    if (data.kind !== "imageGenerate") return;
    let cancelled = false;
    void loadImageModelsForPreview().then((models) => {
      if (cancelled) return;
      setImageCost(
        estimateImageCredits(getImageModelById(models, data.model), {
          ratio: data.ratio,
          resolution: data.size,
          quality: data.quality,
          batchCount: data.count,
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [data]);

  const estimatedCredits =
    data.kind === "videoGenerate"
      ? estimateVideoCreditsForParams(data.model, {
          duration: data.duration,
          ratio: data.ratio,
          quality: data.quality,
          resolution: data.resolution,
        })
      : data.kind === "imageGenerate"
        ? imageCost
        : data.kind === "videoEdit"
          ? 0
          : data.kind === "motionControl"
            ? 0
            : data.kind === "cameraControl"
              ? 0
            : null;

  if (estimatedCredits === null) return null;
  return (
    <p className="studio-node-cost">
      Estimated: <strong>{estimatedCredits} credits</strong>
      <span>Preview only · existing billing remains authoritative</span>
    </p>
  );
}
