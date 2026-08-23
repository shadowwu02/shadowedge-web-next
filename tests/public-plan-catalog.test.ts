import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GET } from "../src/app/api/public/plans/route";
import { getPublicPlanCatalog } from "../src/config/public-plan-catalog";
import { loadPublicPlanCatalog, PublicPlanCatalogError } from "../src/lib/public-plan-api";

const pricingPageSource = readFileSync(
  new URL("../src/components/pricing/PricingBillingPage.tsx", import.meta.url),
  "utf8",
);

describe("public Plan Catalog foundation", () => {
  it("publishes the formal Starter display contract", () => {
    expect(getPublicPlanCatalog()).toEqual({
      catalogVersion: "2026-08-23.v1",
      plans: [
        {
          planId: "starter",
          name: "Starter",
          priceUSD: 49,
          credits: 1200,
          billingInterval: "monthly",
          features: ["image-generation", "video-generation", "usage-based-credits"],
          visibility: "public",
        },
      ],
    });
  });

  it("serves a read-only public catalog route", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(getPublicPlanCatalog());
    expect(response.headers.get("cache-control")).toContain("max-age=300");
  });

  it("loads and validates the catalog through the Pricing page client", async () => {
    const expected = getPublicPlanCatalog();
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return Response.json(expected);
    };

    await expect(loadPublicPlanCatalog(fetcher)).resolves.toEqual(expected);
    expect(calls).toEqual([
      {
        input: "/api/public/plans",
        init: { cache: "no-store", headers: { Accept: "application/json" } },
      },
    ]);
  });

  it("fails closed when the catalog is unavailable or invalid", async () => {
    const unavailable = async () => new Response("unavailable", { status: 503 });
    const invalid = async () => Response.json({ catalogVersion: "bad", plans: [] });

    await expect(loadPublicPlanCatalog(unavailable)).rejects.toBeInstanceOf(PublicPlanCatalogError);
    await expect(loadPublicPlanCatalog(invalid)).rejects.toBeInstanceOf(PublicPlanCatalogError);
    expect(pricingPageSource).toContain('status: "unavailable"');
    expect(pricingPageSource).toContain("pricing.catalog.unavailableTitle");
    expect(pricingPageSource).toContain("retryCatalog");
  });

  it("never falls back to the old illustrative prices", () => {
    expect(pricingPageSource).toContain("loadPublicPlanCatalog");
    expect(pricingPageSource).toContain("plan.priceUSD");
    expect(pricingPageSource).toContain("plan.credits");
    expect(pricingPageSource).not.toMatch(/monthlyPrice|annualPrice|pricingPlans/);
    expect(pricingPageSource).not.toMatch(/\$9|\$29|2000|10000|2,000|10,000/);
  });

  it("uses one catalog for ShadowEdge and Gold-Tide without billing hooks", () => {
    const firstBrandView = getPublicPlanCatalog();
    const secondBrandView = getPublicPlanCatalog();
    expect(firstBrandView).toEqual(secondBrandView);
    expect(firstBrandView).not.toBe(secondBrandView);
    expect(pricingPageSource).not.toMatch(/stripe|checkoutSession|paymentIntent|deductCredits|creditBalance/i);
  });
});
