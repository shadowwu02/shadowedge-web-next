export type ShadowEdgeUser = {
  id?: string;
  email?: string;
  name?: string;
};

export type ShadowEdgeTenantAccess = {
  status?: "READY" | "REVIEW_REQUIRED" | "DENIED" | "UNAVAILABLE";
  code?: string;
  tenant?: {
    id?: string;
    slug?: string;
  } | null;
};

export type ShadowEdgeProfile = {
  canUseLongVideoRealAnalysis?: boolean;
  longVideoRealAnalysisAccessMode?: "allowlist" | "authenticated";
  email?: string;
  name?: string;
  plan?: string;
  status?: string;
  credits?: number;
  credits_balance?: number;
  max_concurrency?: number;
  maxConcurrency?: number;
  concurrency?: number;
  tenantMembershipStatus?: "READY" | "REVIEW_REQUIRED" | "DENIED" | "UNAVAILABLE";
  tenantMembershipCode?: string;
};
