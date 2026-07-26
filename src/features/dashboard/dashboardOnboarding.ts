export const DASHBOARD_ONBOARDING_VERSION = "v1";

export function getDashboardOnboardingKey(userIdentity: string) {
  const normalizedIdentity = userIdentity.trim().toLowerCase() || "verified-user";
  return `shadowedge_dashboard_onboarding_${DASHBOARD_ONBOARDING_VERSION}:${encodeURIComponent(normalizedIdentity)}`;
}
export function shouldShowDashboardOnboarding(input: Readonly<{
  completed: boolean;
  projectCount: number;
}>) {
  return input.projectCount === 0 && !input.completed;
}
