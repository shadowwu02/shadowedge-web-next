import type { CameraControlConfig } from "@/features/studio/types/studioTypes";
import { createMockProviderAdapter } from "./mockProviderAdapter.ts";
import type {
  ProviderJobIdentity,
  ProviderJobResult,
} from "@/features/studio/runtime/providers/providerAdapter";

export type CameraControlProviderInput = CameraControlConfig & {
  projectId: string | null;
  nodeId: string;
  sourceImage: {
    assetId: string;
    sourceNodeId: string;
    url: string;
    thumbnail: string;
  };
  characterIds: string[];
};

export type CameraControlProviderResult = {
  identity: ProviderJobIdentity;
  status: ProviderJobResult["status"];
  videoUrl?: string;
  thumbnail?: string;
  errorCode?: string;
  message?: string;
  mock: boolean;
  providerCalled: boolean;
};

export interface CameraControlProviderAdapter {
  readonly key: string;
  submit(input: CameraControlProviderInput): Promise<CameraControlProviderResult>;
  status(identity: ProviderJobIdentity): Promise<CameraControlProviderResult>;
  cancel(identity: ProviderJobIdentity): Promise<CameraControlProviderResult>;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function legacyResult(result: ProviderJobResult): CameraControlProviderResult {
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
export function createMockCameraControlProviderAdapter(): CameraControlProviderAdapter {
  const adapter = createMockProviderAdapter();
  return {
    key: adapter.key,
    async submit(input) {
      return legacyResult(
        await adapter.submit({
          capability: "camera_control",
          projectId: input.projectId,
          nodeId: input.nodeId,
          mode: "preset",
          payload: {
            sourceImage: input.sourceImage,
            characterIds: input.characterIds,
            preset: input.preset,
            prompt: input.prompt,
            duration: input.duration,
            strength: input.strength,
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

export const mockCameraControlProviderAdapter =
  createMockCameraControlProviderAdapter();
