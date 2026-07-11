export type ApiAuthReplayPolicyInput = {
  authReplay?: boolean;
};

export function shouldReplayRequestAfterAuthRefresh({ authReplay = true }: ApiAuthReplayPolicyInput = {}) {
  return authReplay !== false;
}
