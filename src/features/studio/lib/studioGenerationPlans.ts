import { activeBrand, type BrandId } from "@/config/brand";
import type { StudioGenerationPlan } from "@/features/studio/runtime/generationQueue";

export const SHADOWEDGE_STUDIO_GENERATION_PLANS_STORAGE_KEY =
  "shadowedge_studio_generation_plans_v1";

export function getStudioGenerationPlansStorageKey(brandId: BrandId) {
  return brandId === "shadowedge"
    ? SHADOWEDGE_STUDIO_GENERATION_PLANS_STORAGE_KEY
    : `${brandId}_studio_generation_plans_v1`;
}

export const STUDIO_GENERATION_PLANS_STORAGE_KEY =
  getStudioGenerationPlansStorageKey(activeBrand.id);

const GENERATION_PLAN_LIMIT = 50;

function isGenerationPlan(value: unknown): value is StudioGenerationPlan {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const plan = value as Partial<StudioGenerationPlan>;
  return Boolean(
    plan.id &&
      plan.projectId &&
      plan.pipelineNodeId &&
      plan.createdAt &&
      typeof plan.estimatedCredits === "number" &&
      Array.isArray(plan.items),
  );
}

function normalizeInterruptedPlan(plan: StudioGenerationPlan) {
  if (plan.status !== "confirmed" && plan.status !== "running") return plan;
  return {
    ...plan,
    status: "draft" as const,
    updatedAt: new Date().toISOString(),
    confirmedAt: null,
    items: plan.items.map((item) =>
      item.status === "completed"
        ? item
        : {
            ...item,
            status: "waiting" as const,
            startedAt: null,
            finishedAt: null,
            errorCode: undefined,
            message: undefined,
          },
    ),
  };
}

export function listStudioGenerationPlans() {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(
      STUDIO_GENERATION_PLANS_STORAGE_KEY,
    );
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed
          .filter(isGenerationPlan)
          .map(normalizeInterruptedPlan)
          .slice(0, GENERATION_PLAN_LIMIT)
      : [];
  } catch {
    return [];
  }
}

export function saveStudioGenerationPlan(plan: StudioGenerationPlan) {
  if (typeof window === "undefined") return [];
  const plans = [
    plan,
    ...listStudioGenerationPlans().filter((item) => item.id !== plan.id),
  ].slice(0, GENERATION_PLAN_LIMIT);
  try {
    window.localStorage.setItem(
      STUDIO_GENERATION_PLANS_STORAGE_KEY,
      JSON.stringify(plans),
    );
  } catch {
    // Queue previews remain usable in-memory if browser storage is unavailable.
  }
  return plans;
}
