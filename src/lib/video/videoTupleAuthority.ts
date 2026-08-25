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

function tupleError(code: string, message: string) {
  return Object.assign(new Error(message), { code });
}

export function assertVideoTupleForGeneration(
  model: VideoModel,
  input: { duration: number; resolution: string; ratio: string; generateAudio: boolean },
) {
  const tuples = model.tupleCapabilities || [];
  if (!tuples.length) return null;

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
  if (tuple.pricing.status !== "READY" || tuple.pricing.currentCustomerCredits === null) {
    throw tupleError("VIDEO_PRICING_NOT_APPROVED", "Pricing is not approved for this video option combination.");
  }
  return tuple;
}

export function getVideoTupleCredits(
  model: VideoModel,
  input: { duration: number; resolution: string },
) {
  const tuple = getVideoTupleCapability(model, input);
  return tuple?.pricing.status === "READY" ? tuple.pricing.currentCustomerCredits : null;
}
