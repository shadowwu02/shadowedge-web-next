import {
  createEnterpriseBetaUpgradeRequest,
  type EnterprisePlan,
} from "@/lib/enterprise-workspace-api";

export type BetaUpgradeTargetPlan = Exclude<EnterprisePlan["planId"], "FREE">;

export type BetaUpgradeRequestInput = {
  organizationId: string;
  currentPlan: EnterprisePlan["planId"];
  targetPlan: BetaUpgradeTargetPlan;
  reason: string;
};

export async function createBetaUpgradeRequest(input: BetaUpgradeRequestInput) {
  const result = await createEnterpriseBetaUpgradeRequest(input.organizationId, {
    targetPlanId: input.targetPlan,
    reason: input.reason.trim(),
  });
  return result.request;
}
