"use client";

import { useEffect, useMemo, useState } from "react";
import type { StudioNodeData } from "@/features/studio/types/studioTypes";
import {
  estimateStudioVideoModelCredits,
  getStudioVideoModelAvailabilityPresentation,
  getStudioVideoModelCostPresentation,
  normalizeStudioVideoModelParams,
  resolveStudioVideoProviderCostRule,
  resolveStudioVideoGenerationModel,
} from "@/features/studio/capabilities/studioVideoModelResolver";
import { getImageModels } from "@/lib/image-api";
import { loadStudioProviderModelInventory } from "@/lib/studio-provider-models-api";
import {
  estimateImageCredits,
  getImageModelById,
} from "@/lib/image/imageModelRules";
import type { ImageModel } from "@/types/image";

let imageModelsPromise: Promise<ImageModel[]> | null = null;

type VideoCostPreviewState = {
  credits: number | null;
  scope: string;
  available: boolean;
  costLabel: string;
};

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
  const [videoCost, setVideoCost] = useState<VideoCostPreviewState>({
    credits: null,
    scope: "Inventory loading",
    available: false,
    costLabel: "Checking",
  });

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

  useEffect(() => {
    if (data.kind !== "videoGenerate") return;
    let cancelled = false;
    const providerId = data.providerId || "higgsfield";
    void loadStudioProviderModelInventory(providerId, "video_generate")
      .then((inventory) => {
        if (cancelled) return;
        const requestedModelId = data.modelId || data.model;
        const inventoryModel = inventory.models.find(
          (model) =>
            model.id === requestedModelId ||
            model.metadata.providerModel === requestedModelId,
        );
        if (inventoryModel) {
          const availability =
            getStudioVideoModelAvailabilityPresentation(inventoryModel);
          if (!availability.selectable) {
            setVideoCost({
              credits: null,
              scope: availability.scope || "Execution blocked",
              available: false,
              costLabel: availability.costLabel,
            });
            return;
          }
        }
        const model = resolveStudioVideoGenerationModel(inventory, {
          providerId,
          modelId: requestedModelId,
        });
        const params = normalizeStudioVideoModelParams(model, {
          duration: data.duration,
          ratio: data.ratio,
          quality: data.quality,
          resolution: data.resolution,
          mode: data.mode,
          audio: data.generateAudio,
        });
        const rule = resolveStudioVideoProviderCostRule(model, params);
        const credits = estimateStudioVideoModelCredits(model, params);
        const cost = getStudioVideoModelCostPresentation(model);
        setVideoCost({
          credits,
          scope: rule?.scopeKey || "Runtime verified",
          available: credits !== null,
          costLabel: cost.label,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setVideoCost({
            credits: null,
            scope: "Not verified — execution blocked",
            available: false,
            costLabel: "Cost unavailable",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [data]);

  const estimatedCredits =
    data.kind === "videoGenerate"
      ? videoCost.credits
      : data.kind === "imageGenerate"
        ? imageCost
        : data.kind === "videoEdit"
          ? 0
          : data.kind === "motionControl"
            ? 0
            : data.kind === "cameraControl"
              ? 0
            : null;

  if (data.kind === "videoGenerate") {
    return (
      <p className="studio-node-cost">
        Estimated Cost:{" "}
        <strong>
          {videoCost.available && videoCost.credits !== null
            ? `${videoCost.credits} credits`
            : "Cost unavailable"}
        </strong>
        <span>Cost: {videoCost.costLabel} · Scope: {videoCost.scope}</span>
      </p>
    );
  }
  if (estimatedCredits === null) return null;
  return (
    <p className="studio-node-cost">
      Estimated: <strong>{estimatedCredits} credits</strong>
      <span>Preview only · existing billing remains authoritative</span>
    </p>
  );
}
