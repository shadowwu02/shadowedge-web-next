import type {
  PublicPlan,
  PublicPlanBillingInterval,
  PublicPlanCatalogResponse,
  PublicPlanVisibility,
} from "@/config/public-plan-catalog";

type PublicPlanCatalogFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export class PublicPlanCatalogError extends Error {
  readonly code = "PUBLIC_PLAN_CATALOG_UNAVAILABLE";

  constructor() {
    super("Public plan catalog is unavailable");
    this.name = "PublicPlanCatalogError";
  }
}

function isBillingInterval(value: unknown): value is PublicPlanBillingInterval {
  return value === "monthly";
}

function isVisibility(value: unknown): value is PublicPlanVisibility {
  return value === "public" || value === "hidden";
}

function isPublicPlan(value: unknown): value is PublicPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Record<string, unknown>;
  return (
    typeof plan.planId === "string" &&
    plan.planId.length > 0 &&
    typeof plan.name === "string" &&
    plan.name.length > 0 &&
    typeof plan.priceUSD === "number" &&
    Number.isFinite(plan.priceUSD) &&
    plan.priceUSD >= 0 &&
    typeof plan.credits === "number" &&
    Number.isInteger(plan.credits) &&
    plan.credits >= 0 &&
    isBillingInterval(plan.billingInterval) &&
    Array.isArray(plan.features) &&
    plan.features.every((feature) => typeof feature === "string" && feature.length > 0) &&
    isVisibility(plan.visibility)
  );
}

function parsePublicPlanCatalog(value: unknown): PublicPlanCatalogResponse {
  if (!value || typeof value !== "object") throw new PublicPlanCatalogError();
  const catalog = value as Record<string, unknown>;
  if (
    typeof catalog.catalogVersion !== "string" ||
    !Array.isArray(catalog.plans) ||
    catalog.plans.length === 0 ||
    !catalog.plans.every(isPublicPlan)
  ) {
    throw new PublicPlanCatalogError();
  }

  const visiblePlans = catalog.plans.filter((plan) => plan.visibility === "public");
  if (visiblePlans.length === 0) throw new PublicPlanCatalogError();

  return {
    catalogVersion: catalog.catalogVersion,
    plans: visiblePlans.map((plan) => ({ ...plan, features: [...plan.features] })),
  };
}

export async function loadPublicPlanCatalog(
  fetcher: PublicPlanCatalogFetcher = fetch,
): Promise<PublicPlanCatalogResponse> {
  let response: Response;
  try {
    response = await fetcher("/api/public/plans", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new PublicPlanCatalogError();
  }

  if (!response.ok) throw new PublicPlanCatalogError();

  try {
    return parsePublicPlanCatalog(await response.json());
  } catch (error) {
    if (error instanceof PublicPlanCatalogError) throw error;
    throw new PublicPlanCatalogError();
  }
}
