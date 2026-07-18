import { createMockProviderAdapter } from "./mockProviderAdapter.ts";
import type {
  ProviderJobIdentity,
  ProviderJobResult,
} from "@/features/studio/runtime/providers/providerAdapter";

export type MotionControlProviderInput = {
  projectId: string | null;
  nodeId: string;
  sourceImage: {
    assetId: string;
    sourceNodeId: string;
    url: string;
    thumbnail: string;
  };
  motionReferenceVideo: {
    assetId: string;
    sourceNodeId: string;
    url: string;
    thumbnail: string;
  };
  mode: "character_motion" | "camera_motion" | "motion_transfer";
  prompt: string;
};

export type MotionControlProviderResult = {
  identity: ProviderJobIdentity;
  status: ProviderJobResult["status"];
  videoUrl?: string;
  thumbnail?: string;
  errorCode?: string;
  message?: string;
  mock: boolean;
  providerCalled: boolean;
};

export interface MotionControlProviderAdapter {
  readonly key: string;
  submit(input: MotionControlProviderInput): Promise<MotionControlProviderResult>;
  status(identity: ProviderJobIdentity): Promise<MotionControlProviderResult>;
  cancel(identity: ProviderJobIdentity): Promise<MotionControlProviderResult>;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function legacyResult(result: ProviderJobResult): MotionControlProviderResult {
  return {
    identity: result.identity,
    status: result.status,
    videoUrl: stringValue(result.output?.videoUrl),
    thumbnail: stringValue(result.output?.thumbnail),
    errorCode: result.errorCode,
    message: result.message,
    mock: result.mock,
    providerCalled: result.providerCalled,
  };
}

/** @deprecated Use Provider Registry + ProviderAdapter Runtime for new code. */
export function createMockMotionControlProviderAdapter(): MotionControlProviderAdapter {
  const adapter = createMockProviderAdapter();
  return {
    key: adapter.key,
    async submit(input) {
      return legacyResult(
        await adapter.submit({
          capability: "motion_control",
          projectId: input.projectId,
          nodeId: input.nodeId,
          mode: input.mode,
          payload: {
            sourceImage: input.sourceImage,
            motionReferenceVideo: input.motionReferenceVideo,
            prompt: input.prompt,
          },
        }),
      );
    },
    async status(identity) {
      return legacyResult(await adapter.status(identity));
    },
    async cancel(identity) {
      return legacyResult(await adapter.cancel(identity));
    },
  };
}

export const mockMotionControlProviderAdapter =
  createMockMotionControlProviderAdapter();
