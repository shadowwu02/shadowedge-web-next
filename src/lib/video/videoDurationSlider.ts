import type { VideoDurationPolicy } from "@/types/video";

export type VideoDurationSliderContract = {
  min: number;
  max: number;
  step: number;
  values: number[];
};

function uniqueSortedIntegers(values: number[]) {
  return Array.from(new Set(values))
    .sort((left, right) => left - right);
}

export function resolveVideoDurationSliderContract(
  policy: VideoDurationPolicy,
  durations: number[],
): VideoDurationSliderContract | null {
  if (policy.selection !== "discrete_range") return null;

  const { min, max, step } = policy;
  if (![min, max, step].every(Number.isInteger) || step <= 0 || min >= max) return null;
  if (!durations.length || durations.some((value) => !Number.isInteger(value))) return null;

  const values = uniqueSortedIntegers(durations);
  if (values.length < 2 || values[0] !== min || values.at(-1) !== max) return null;

  const expectedCount = Math.floor((max - min) / step) + 1;
  if (values.length !== expectedCount) return null;
  if (values.some((value, index) => value !== min + index * step)) return null;

  return { min, max, step, values };
}

export function readVideoDurationSliderValue(
  value: number,
  contract: VideoDurationSliderContract,
) {
  if (!Number.isInteger(value) || !contract.values.includes(value)) return null;
  return value;
}

export function readVideoDurationSliderPointerValue(
  clientX: number,
  trackLeft: number,
  trackWidth: number,
  contract: VideoDurationSliderContract,
) {
  if (![clientX, trackLeft, trackWidth].every(Number.isFinite) || trackWidth <= 0) return null;

  const targetIndex = ((clientX - trackLeft) / trackWidth) * (contract.values.length - 1);
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  contract.values.forEach((_, index) => {
    const distance = Math.abs(index - targetIndex);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return contract.values[nearestIndex];
}

export function readVideoDurationSliderKeyValue(
  key: string,
  currentValue: number,
  contract: VideoDurationSliderContract,
) {
  const currentIndex = contract.values.indexOf(currentValue);
  if (currentIndex < 0) return null;

  if (key === "Home") return contract.values[0];
  if (key === "End") return contract.values.at(-1) ?? null;
  if (key === "ArrowLeft" || key === "ArrowDown") {
    return contract.values[currentIndex - 1] ?? null;
  }
  if (key === "ArrowRight" || key === "ArrowUp") {
    return contract.values[currentIndex + 1] ?? null;
  }
  return null;
}
