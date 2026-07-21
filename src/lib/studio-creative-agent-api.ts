import { apiRequest } from "@/lib/api";
import type { StudioCapabilityIntentInput } from "@/lib/studio-capability-intent-api";
import type { StudioCreativeAgentSessionBundle } from "@/features/studio/capabilities/studioCreativeAgentSession";

function requireSession(bundle: StudioCreativeAgentSessionBundle | undefined) {
  if (!bundle?.session?.sessionId) throw new Error("Creative Agent returned no Session.");
  return bundle;
}

export async function createStudioCreativeAgentSession(input: StudioCapabilityIntentInput) {
  const envelope = await apiRequest<StudioCreativeAgentSessionBundle>(
    "/api/agent/sessions",
    { method: "POST", body: JSON.stringify(input) },
  );
  return requireSession(envelope.data);
}

export async function getStudioCreativeAgentSession(sessionId: string) {
  const envelope = await apiRequest<StudioCreativeAgentSessionBundle>(
    `/api/agent/sessions/${encodeURIComponent(sessionId)}`,
  );
  return requireSession(envelope.data);
}

export async function confirmStudioCreativeAgentSession(sessionId: string) {
  const envelope = await apiRequest<StudioCreativeAgentSessionBundle>(
    `/api/agent/sessions/${encodeURIComponent(sessionId)}/confirm`,
    { method: "POST", body: JSON.stringify({ confirmation: "USER_CONFIRMED" }) },
  );
  return requireSession(envelope.data);
}
