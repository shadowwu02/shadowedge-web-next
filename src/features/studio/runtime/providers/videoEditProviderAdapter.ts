import { createMockProviderAdapter } from "./mockProviderAdapter.ts";
import type {
  ProviderJobIdentity,
  ProviderJobResult,
} from "@/features/studio/runtime/providers/providerAdapter";

export type VideoEditMode =
  | "video_to_video"
  | "replace_background"
  | "extend";

export type VideoEditProviderInput = {
  projectId: string | null;
  nodeId: string;
  sourceVideo: {
    assetId: string;
    sourceNodeId: string;
    url: string;
    thumbnail: string;
  };
  mode: VideoEditMode;
  prompt: string;
  parameters: Record<string, unknown>;
};

export type VideoEditProviderResult = {
  identity: ProviderJobIdentity;
  status: ProviderJobResult["status"];
  videoUrl?: string;
  thumbnail?: string;
  errorCode?: string;
  message?: string;
  mock: boolean;
  providerCalled: boolean;
};

export interface VideoEditProviderAdapter {
  readonly key: string;
  submit(input: VideoEditProviderInput): Promise<VideoEditProviderResult>;
  status(identity: ProviderJobIdentity): Promise<VideoEditProviderResult>;
  cancel(identity: ProviderJobIdentity): Promise<VideoEditProviderResult>;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function legacyResult(result: ProviderJobResult): VideoEditProviderResult {
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
export function createMockVideoEditProviderAdapter(): VideoEditProviderAdapter {
  const adapter = createMockProviderAdapter();
  return {
    key: adapter.key,
    async submit(input) {
      return legacyResult(
        await adapter.submit({
          capability: "video_edit",
          projectId: input.projectId,
          nodeId: input.nodeId,
          mode: input.mode,
          payload: {
            sourceVideo: input.sourceVideo,
            prompt: input.prompt,
            parameters: input.parameters,
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

export const mockVideoEditProviderAdapter =
  createMockVideoEditProviderAdapter();
