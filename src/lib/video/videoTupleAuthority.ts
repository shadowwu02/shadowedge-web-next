import type { VideoModel, VideoTupleCapability } from "@/types/video";

export function getVideoTupleCapability(
  model: VideoModel,
  input: { duration: number; resolution: string },
): VideoTupleCapability | null {
  const tuples = model.tupleCapabilities || [];
  if (!tuples.length) return null;
  return tuples.find((tuple) => (
    tuple.duration === input.duration && tuple.resolution === input.resolution
  )) || null;
}

export type VideoTuplePricingDecision = {
  pricingVersion: string;
  creditAmount: number;
};

export function getVideoTuplePricingDecision(
  model: VideoModel,
  input: { duration: number; resolution: string; generateAudio: boolean },
): VideoTuplePricingDecision | null {
  const tuple = getVideoTupleCapability(model, input);
  if (!tuple || (input.generateAudio && !tuple.audio.supported)) return null;
  if (tuple.pricing.status !== "READY" || !tuple.pricing.pricingVersion ||
      tuple.pricing.currentCustomerCredits === null) return null;
  return {
    pricingVersion: tuple.pricing.pricingVersion,
    creditAmount: tuple.pricing.currentCustomerCredits,
  };
}

function tupleError(code: string, message: string) {
  return Object.assign(new Error(message), { code });
}

export function assertVideoTupleForGeneration(
  model: VideoModel,
  input: { duration: number; resolution: string; ratio: string; generateAudio: boolean },
) {
  const tuples = model.tupleCapabilities || [];
  if (!tuples.length) {
    if (model.creditRules?.pricingVersion) {
      throw tupleError(
        "VIDEO_CATALOG_TUPLE_AUTHORITY_MISSING",
        "Canonical tuple pricing is unavailable for this video model.",
      );
    }
    return null;
  }

  const tuple = getVideoTupleCapability(model, input);
  if (!tuple) {
    throw tupleError("VIDEO_CAPABILITY_TUPLE_UNSUPPORTED", "This video option combination is not available.");
  }
  if (input.ratio && !tuple.allowedAspectRatios.includes(input.ratio)) {
    throw tupleError("VIDEO_ASPECT_RATIO_UNSUPPORTED", "This aspect ratio is not available for the selected video model.");
  }
  if (input.generateAudio && !tuple.audio.supported) {
    throw tupleError("VIDEO_AUDIO_UNSUPPORTED", "Generated audio is not available for this duration and resolution.");
  }
  if (!getVideoTuplePricingDecision(model, input)) {
    throw tupleError("VIDEO_PRICING_NOT_APPROVED", "Pricing is not approved for this video option combination.");
  }
  return tuple;
}

export function getVideoTupleCredits(
  model: VideoModel,
  input: { duration: number; resolution: string; generateAudio: boolean },
) {
  return getVideoTuplePricingDecision(model, input)?.creditAmount ?? null;
}
