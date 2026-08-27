import { describe, expect, it } from "vitest";
import { applyInternationalExecutionCapability, normalizeVideoModel } from "@/lib/video-api";
import { getVideoWorkspaceModelState } from "@/lib/video/fluxproxyInternational";

function closedInternationalModel() {
  return normalizeVideoModel({
    id: "seedance_2_5_international",
    label: "Seedance 2.5 International",
    provider: "fluxproxy",
    providerModel: "dreamina-seedance-2-5-260628-df",
    productLine: "international",
    available: false,
    customerExecutionEnabled: false,
    catalogSelectable: true,
    configurationEnabled: true,
    durations: [4, 5],
    resolutions: ["720p"],
  });
}

describe("server-authoritative scoped smoke capability bridge", () => {
  it("keeps the Workspace execution gate closed when capability is absent or denied", () => {
    const model = closedInternationalModel();
    expect(getVideoWorkspaceModelState(applyInternationalExecutionCapability(model, null)).executionEnabled).toBe(false);
    expect(getVideoWorkspaceModelState(applyInternationalExecutionCapability(model, {
      canExecuteInternational: false,
      reasonCode: "SCOPED_CUSTOMER_SMOKE_UNAVAILABLE",
    })).executionEnabled).toBe(false);
  });

  it("enables only the model instance approved by the authenticated server capability", () => {
    const model = applyInternationalExecutionCapability(closedInternationalModel(), {
      canExecuteInternational: true,
      reasonCode: "SCOPED_CUSTOMER_SMOKE_AVAILABLE",
    });
    expect(model.customerExecutionEnabled).toBe(true);
    expect(model.available).toBe(true);
    expect(getVideoWorkspaceModelState(model).executionEnabled).toBe(true);
  });

  it("cannot use an International capability to change an existing provider model", () => {
    const existing = normalizeVideoModel({
      id: "seedance_2_0",
      provider: "xinhankr",
      providerModel: "artsdance-2-0-pro-260801",
      available: true,
    });
    expect(applyInternationalExecutionCapability(existing, { canExecuteInternational: true })).toBe(existing);
    expect(existing.provider).toBe("xinhankr");
  });
});
