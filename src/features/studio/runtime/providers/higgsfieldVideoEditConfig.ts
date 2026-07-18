import { HIGGSFIELD_VIDEO_EDIT_ENABLED } from "../../../../config/studioFeatures.ts";

export type HiggsfieldVideoEditModelConfig = {
  id: string;
  label: string;
  enabled: boolean;
};

export type HiggsfieldVideoEditLimits = {
  acceptedMimeTypes: readonly string[];
  acceptedExtensions: readonly string[];
  durations: readonly number[];
  ratios: readonly string[];
  maxFileBytes: number | null;
};

export type HiggsfieldVideoEditProviderConfig = {
  capability: "video_edit";
  providerId: "higgsfield";
  adapterKey: "higgsfield_video_edit";
  enabled: boolean;
  models: readonly HiggsfieldVideoEditModelConfig[];
  limits: HiggsfieldVideoEditLimits;
  cost: {
    status: "unknown" | "configured";
    credits: number | null;
  };
  routes: {
    submit: string;
    status: string;
  };
};

/**
 * Production-safe default. The public Higgsfield product confirms Video Edit
 * exists, but no stable public API contract, exact upload limits, or approved
 * ShadowEdge credit rule is available. Keep every executable field empty.
 */
export const HIGGSFIELD_VIDEO_EDIT_CONFIG: HiggsfieldVideoEditProviderConfig = {
  capability: "video_edit",
  providerId: "higgsfield",
  adapterKey: "higgsfield_video_edit",
  enabled: HIGGSFIELD_VIDEO_EDIT_ENABLED,
  models: [
    {
      id: "kling_o1_video_edit",
      label: "Kling O1 Video Edit",
      enabled: false,
    },
  ],
  limits: {
    acceptedMimeTypes: [],
    acceptedExtensions: [],
    durations: [],
    ratios: [],
    maxFileBytes: null,
  },
  cost: {
    status: "unknown",
    credits: null,
  },
  routes: {
    submit: "/api/studio/providers/higgsfield/video-edit/jobs",
    status: "/api/studio/providers/higgsfield/video-edit/jobs/:statusJobId",
  },
};

export function isHiggsfieldVideoEditConfigReady(
  config: HiggsfieldVideoEditProviderConfig,
) {
  return Boolean(
    config.enabled &&
      config.cost.status === "configured" &&
      typeof config.cost.credits === "number" &&
      config.cost.credits >= 0 &&
      config.models.some((model) => model.enabled) &&
      config.limits.acceptedMimeTypes.length &&
      config.limits.acceptedExtensions.length &&
      config.limits.durations.length &&
      config.limits.ratios.length &&
      config.limits.maxFileBytes &&
      config.limits.maxFileBytes > 0,
  );
}
