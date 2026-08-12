export type ShadowEdgeUser = {
  id?: string;
  email?: string;
  name?: string;
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
};
