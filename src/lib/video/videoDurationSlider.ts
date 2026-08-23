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
