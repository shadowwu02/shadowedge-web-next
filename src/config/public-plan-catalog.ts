export type PublicPlanBillingInterval = "monthly";
export type PublicPlanVisibility = "public" | "hidden";

export type PublicPlan = {
  planId: string;
  name: string;
  priceUSD: number;
  credits: number;
  billingInterval: PublicPlanBillingInterval;
  features: string[];
  visibility: PublicPlanVisibility;
};

export type PublicPlanCatalogResponse = {
  catalogVersion: string;
  plans: PublicPlan[];
};

export const PUBLIC_PLAN_CATALOG_VERSION = "2026-08-23.v1";

const PUBLIC_PLAN_CATALOG = [
  {
    planId: "starter",
    name: "Starter",
    priceUSD: 49,
    credits: 1200,
    billingInterval: "monthly",
    features: ["image-generation", "video-generation", "usage-based-credits"],
    visibility: "public",
  },
] as const satisfies readonly PublicPlan[];

function copyPlan(plan: (typeof PUBLIC_PLAN_CATALOG)[number]): PublicPlan {
  return {
    ...plan,
    features: [...plan.features],
  };
}

export function getPublicPlanCatalog(): PublicPlanCatalogResponse {
  return {
    catalogVersion: PUBLIC_PLAN_CATALOG_VERSION,
    plans: PUBLIC_PLAN_CATALOG.filter((plan) => plan.visibility === "public").map(copyPlan),
  };
}
