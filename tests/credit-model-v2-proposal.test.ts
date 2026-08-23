import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getPublicPlanCatalog } from "../src/config/public-plan-catalog";
import { videoModelRules } from "../src/lib/video/videoModelRules";

type Proposal = {
  status: string;
  sourcePlanCatalog: {
    catalogVersion: string;
    planId: string;
    priceUSD: number;
    credits: number;
    billingInterval: string;
    grossUSDPerCredit: number;
  };
  currentPublicConsumptionMatrix: {
    image: Array<Record<string, unknown>>;
    video: Array<Record<string, unknown>>;
  };
  costEvidenceClasses: string[];
  modelCostBuckets: Array<{ bucket: string; models: string[] }>;
  durationMultiplierProposal: Array<Record<string, unknown>>;
  resolutionMultiplierProposal: Array<Record<string, unknown>>;
  internalCapabilityExclusions: Array<Record<string, unknown>>;
  planScenarios: Array<{
    planId: string;
    priceUSD: number;
    credits: number;
    grossUSDPerCredit: number;
    status: string;
  }>;
  marginGovernance: {
    targetContributionMarginPercent: number;
    realMarginAvailable: boolean;
    allowedVariableCostPerCreditAt70PercentMargin: Record<string, number>;
  };
  productionChanges: Record<string, boolean>;
};

const proposal = JSON.parse(
  readFileSync(
    new URL("../docs/proposals/credit-model-v2-proposal-2026-08-23.json", import.meta.url),
    "utf8",
  ),
) as Proposal;

describe("Credit Model v2 design proposal", () => {
  it("matches the Phase 1 public Starter display contract", () => {
    const catalog = getPublicPlanCatalog();
    const starter = catalog.plans.find((plan) => plan.planId === "starter");

    expect(proposal.sourcePlanCatalog).toMatchObject({
      catalogVersion: catalog.catalogVersion,
      planId: starter?.planId,
      priceUSD: starter?.priceUSD,
      credits: starter?.credits,
      billingInterval: starter?.billingInterval,
    });
    expect(proposal.sourcePlanCatalog.grossUSDPerCredit).toBeCloseTo(49 / 1200, 12);
  });

  it("preserves the current exact public Seedance matrix", () => {
    const proposedVideo = proposal.currentPublicConsumptionMatrix.video;
    const exact = (model: string, durationSeconds: number, resolution: string) =>
      proposedVideo.find(
        (entry) =>
          entry.model === model &&
          entry.durationSeconds === durationSeconds &&
          entry.resolution === resolution,
      )?.credits;

    expect(exact("seedance_2_0_mini", 5, "720p")).toBe(23);
    expect(exact("seedance_2_0_fast", 5, "720p")).toBe(12);
    expect(exact("seedance_2_0", 5, "720p")).toBe(23);
    expect(exact("seedance_2_0", 10, "720p")).toBe(45);
    expect(exact("seedance_2_0", 15, "720p")).toBe(68);
    expect(exact("seedance_2_0", 5, "1080p")).toBe(45);
    expect(exact("seedance_2_0", 10, "1080p")).toBe(90);
    expect(exact("seedance_2_0", 15, "1080p")).toBe(135);
    expect(exact("seedance_2_5", 5, "720p")).toBe(23);

    const seedance20 = videoModelRules.find((rule) => rule.modelId === "seedance_2_0");
    expect(seedance20?.creditRules.table?.["5"]?.["720p"]).toBe(23);
    expect(seedance20?.creditRules.table?.["10"]?.["720p"]).toBe(45);
    expect(seedance20?.creditRules.table?.["15"]?.["720p"]).toBe(68);
    expect(seedance20?.creditRules.table?.["15"]?.["1080p"]).toBe(135);
  });

  it("keeps internal 14s and 30s outside the public consumption matrix", () => {
    const publicVideo = proposal.currentPublicConsumptionMatrix.video;
    expect(
      publicVideo.some(
        (entry) => entry.model === "seedance_2_0" && entry.durationSeconds === 14,
      ),
    ).toBe(false);
    expect(
      publicVideo.some(
        (entry) => entry.model === "seedance_2_5" && entry.durationSeconds === 30,
      ),
    ).toBe(false);
    expect(proposal.internalCapabilityExclusions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ model: "seedance_2_0", durationSeconds: 14 }),
        expect.objectContaining({ model: "seedance_2_5", durationSeconds: 30 }),
      ]),
    );
  });

  it("separates real, estimated, and unknown Provider cost evidence", () => {
    expect(proposal.costEvidenceClasses).toEqual([
      "REAL_PROVIDER_COST",
      "CONTRACT_ESTIMATE",
      "UNKNOWN",
    ]);
    expect(
      proposal.modelCostBuckets.find((bucket) => bucket.bucket === "VERIFIED_VARIABLE_COST")
        ?.models,
    ).toEqual([]);
    expect(
      proposal.modelCostBuckets.find((bucket) => bucket.bucket === "CONTRACT_ESTIMATE_ONLY")
        ?.models,
    ).toEqual(["gpt_image_2"]);
    expect(proposal.marginGovernance.realMarginAvailable).toBe(false);
  });

  it("uses structural multipliers only and leaves 30s unpriced", () => {
    expect(
      proposal.durationMultiplierProposal.map((entry) => [
        entry.durationSeconds,
        entry.structuralMultiplier,
      ]),
    ).toEqual([
      [5, 1],
      [10, 2],
      [15, 3],
      [30, 6],
    ]);
    expect(
      proposal.durationMultiplierProposal.find((entry) => entry.durationSeconds === 30),
    ).toMatchObject({
      publicApproval: "PENDING_COST_EVIDENCE",
      executableCustomerCredits: null,
    });
    expect(
      proposal.resolutionMultiplierProposal.map((entry) => [
        entry.resolution,
        entry.structuralMultiplier,
      ]),
    ).toEqual([
      ["720p", 1],
      ["1080p", 2],
    ]);
  });

  it("validates plan economics and 70 percent cost ceilings", () => {
    for (const plan of proposal.planScenarios) {
      expect(plan.grossUSDPerCredit).toBeCloseTo(plan.priceUSD / plan.credits, 12);
      const expectedCeiling = plan.grossUSDPerCredit * 0.3;
      expect(
        proposal.marginGovernance.allowedVariableCostPerCreditAt70PercentMargin[plan.planId],
      ).toBeCloseTo(expectedCeiling, 12);
    }
    expect(proposal.planScenarios.find((plan) => plan.planId === "pro")?.status).toBe(
      "DESIGN_ONLY_COST_GATED",
    );
    expect(proposal.planScenarios.find((plan) => plan.planId === "team")?.status).toBe(
      "DESIGN_ONLY_COST_AND_TEAM_ENTITLEMENT_GATED",
    );
  });

  it("has no production mutation or runtime activation", () => {
    expect(proposal.status).toBe("DESIGN_ONLY_NOT_PRODUCTION");
    expect(Object.values(proposal.productionChanges).every((changed) => changed === false)).toBe(
      true,
    );

    const runtimeSources = [
      readFileSync(new URL("../src/config/public-plan-catalog.ts", import.meta.url), "utf8"),
      readFileSync(
        new URL("../src/components/pricing/PricingBillingPage.tsx", import.meta.url),
        "utf8",
      ),
    ].join("\n");
    expect(runtimeSources).not.toContain("credit-model-v2-proposal");
  });
});
