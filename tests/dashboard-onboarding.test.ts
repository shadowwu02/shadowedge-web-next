import { describe, expect, it } from "vitest";
import {
  getDashboardOnboardingKey,
  shouldShowDashboardOnboarding,
} from "../src/features/dashboard/dashboardOnboarding";
import { SHADOWEDGE_DEMO_PROJECT } from "../src/features/dashboard/demoProject";

describe("Dashboard onboarding", () => {
  it("shows only for a new user who has not completed onboarding", () => {
    expect(shouldShowDashboardOnboarding({ completed: false, projectCount: 0 })).toBe(true);
    expect(shouldShowDashboardOnboarding({ completed: true, projectCount: 0 })).toBe(false);
    expect(shouldShowDashboardOnboarding({ completed: false, projectCount: 1 })).toBe(false);
  });

  it("isolates completion state by verified user identity", () => {
    expect(getDashboardOnboardingKey("Owner@Example.com")).toContain("owner%40example.com");
    expect(getDashboardOnboardingKey("owner-a@example.com")).not.toBe(
      getDashboardOnboardingKey("owner-b@example.com"),
    );
  });
});
describe("Dashboard demo fixture", () => {
  it("is read-only and excluded from analytics", () => {
    expect(SHADOWEDGE_DEMO_PROJECT.metadata).toEqual({
      DEMO_PROJECT: true,
      analyticsExcluded: true,
      readOnly: true,
    });
  });

  it("contains the promised read-only production examples", () => {
    expect(SHADOWEDGE_DEMO_PROJECT.canvas.nodes.length).toBeGreaterThan(0);
    expect(SHADOWEDGE_DEMO_PROJECT.storyboard.length).toBeGreaterThan(0);
    expect(SHADOWEDGE_DEMO_PROJECT.timeline.length).toBeGreaterThan(0);
    expect(SHADOWEDGE_DEMO_PROJECT.review.status).toBe("APPROVED");
    expect(SHADOWEDGE_DEMO_PROJECT.delivery.status).toBe("READY");
  });
});
