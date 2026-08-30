import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { normalizeVideoModel } from "@/lib/video-api";
import {
  LOCAL_MEDIA_ASSETS_KEY,
  readLocalMediaAssets,
  saveLocalMediaAssets,
} from "@/lib/media-assets";
import {
  readVideoDraft,
  saveVideoDraft,
  VIDEO_WORKSPACE_DRAFT_KEY,
} from "@/lib/video/videoDraft";
import { buildVideoGenerationRequest } from "@/lib/video/videoGenerationRequest";
import { resolveVideoPromptBoundReferences } from "@/lib/video/videoPromptBoundReferences";
import {
  buildVideoReferenceAuthorityRequest,
  reconcileVideoWorkspaceMedia,
  type VideoWorkspaceAuthority,
  type VideoWorkspaceAuthorityScope,
} from "@/lib/video/videoWorkspaceAuthority";
import { validateVideoWorkspaceAuthorityForSubmit } from "@/hooks/useVideoGeneration";
import type { UploadMediaItem } from "@/types/video";

const originalWindow = globalThis.window;
const scopeA: VideoWorkspaceAuthorityScope = { userId: "user-a", tenantId: "tenant-a" };
const scopeB: VideoWorkspaceAuthorityScope = { userId: "user-b", tenantId: "tenant-b" };
const scopeTenantB: VideoWorkspaceAuthorityScope = { userId: "user-a", tenantId: "tenant-b" };

function installStorage() {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      },
    },
    writable: true,
  });
  return values;
}

function media(type: "video" | "audio", assetId: string, id = assetId): UploadMediaItem {
  return {
    id,
    assetId,
    canonicalReferenceStatus: "CANONICAL",
    privateReference: type === "audio",
    type,
    name: type === "audio" ? "fixture.wav" : "fixture.mp4",
    mimeType: type === "audio" ? "audio/wav" : "video/mp4",
    duration: 5,
    uploadStatus: "ready",
    url: `https://api.shadowedge.example/api/assets/${assetId}`,
  };
}

const currentVideo = media("video", "20000000-0000-4000-8000-000000000001");
const currentAudio = media("audio", "30000000-0000-4000-8000-000000000001");
const otherAudio = media("audio", "30000000-0000-4000-8000-000000000999", "stale-audio-snapshot");
const authority: VideoWorkspaceAuthority = { scope: scopeB, media: [currentVideo, currentAudio], checkedAt: 1 };

function seedance25() {
  return normalizeVideoModel({
    id: "seedance_2_5",
    name: "Seedance 2.5",
    provider: "xinhankr",
    providerModel: "seedance_2_5",
    credits: 23,
    durations: [5],
    duration: { values: [5], default: 5 },
    ratios: ["16:9"],
    resolutions: ["720p"],
    referenceVideos: true,
    maxReferenceVideos: 1,
    referenceAudios: true,
    maxReferenceAudios: 1,
    maxTotalReferences: 2,
    mixedReference: { videoAudio: true, imageVideo: false, imageAudio: false, imageVideoAudio: false },
    audioReference: {
      enabled: true,
      max: 1,
      formats: ["wav"],
      mimeTypes: ["audio/wav"],
      maxFileBytes: 15 * 1024 * 1024,
      minDurationSeconds: 5,
      maxDurationSeconds: 5,
      surchargeCredits: 0,
      audioOnly: true,
      requiresImage: false,
      maxMixedImages: 0,
      maxMixedVideos: 1,
      generatedAudioCompatible: false,
    },
  });
}

afterEach(() => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow, writable: true });
});

describe("Video Prompt-bound workspace authority", () => {
  it("uses a neutral readiness heading so blocked references are never presented as ready", () => {
    const dictionary = readFileSync(join(process.cwd(), "src/i18n/dictionary.ts"), "utf8");

    expect(dictionary).toContain('"video.actions.readyCheck": "Generation check"');
    expect(dictionary).toContain('"video.actions.readyCheck": "生成检查"');
    expect(dictionary).not.toContain('"video.actions.readyCheck": "Generation ready"');
  });

  it("performs the fresh authority check before the Generate API call", () => {
    const source = readFileSync(join(process.cwd(), "src/hooks/useVideoGeneration.ts"), "utf8");
    expect(source.indexOf("await loadVerifiedVideoReferenceAuthority")).toBeGreaterThan(-1);
    expect(source.indexOf("await loadVerifiedVideoReferenceAuthority")).toBeLessThan(source.indexOf("await createVideoTask(request)"));
    const submitPath = source.slice(source.indexOf("const submit = useCallback"), source.indexOf("const refreshTask = useCallback"));
    expect(submitPath).not.toContain("loadVerifiedVideoWorkspaceAuthority");
    expect(submitPath).not.toContain("listMediaAssets");
  });

  it("builds the server authority request from only the Prompt-bound reference set", () => {
    const unrelatedImage = {
      ...currentVideo,
      id: "40000000-0000-4000-8000-000000000001",
      assetId: "40000000-0000-4000-8000-000000000001",
      type: "image" as const,
      mimeType: "image/png",
    };
    const promptBound = resolveVideoPromptBoundReferences({
      media: [currentVideo, currentAudio],
      prompt: "Use @Video 1 and @Audio 1",
      workspaceAuthority: authority,
    });
    expect(buildVideoReferenceAuthorityRequest(promptBound.activeItems)).toEqual([
      { assetId: currentVideo.assetId, type: "video" },
      { assetId: currentAudio.assetId, type: "audio" },
    ]);
    expect(buildVideoReferenceAuthorityRequest(promptBound.activeItems)).not.toContainEqual({
      assetId: unrelatedImage.assetId,
      type: "image",
    });
  });

  it("keeps the customer-facing bound reference error productized", () => {
    const authoritySource = readFileSync(join(process.cwd(), "src/lib/video/videoWorkspaceAuthority.ts"), "utf8");
    expect(authoritySource).toContain("A referenced media item is unavailable. Please select it again.");
    expect(authoritySource).not.toContain("PRIVATE_IMAGE_ASSET_NOT_ELIGIBLE");
    expect(authoritySource).not.toContain("VIDEO_REFERENCE_AUTHORITY_OWNER_MISMATCH");
  });

  it("keeps active references empty while authenticated workspace authority is loading", () => {
    const state = resolveVideoPromptBoundReferences({
      media: [currentVideo, currentAudio],
      prompt: "Use @Video 1 and @Audio 1",
      workspaceAuthorityRequired: true,
    });
    expect(state.activeItems).toEqual([]);
    expect(state.unauthorizedItems).toHaveLength(2);
  });

  it("makes the exact wrong-workspace Smoke B fixture NOT_READY", () => {
    const state = resolveVideoPromptBoundReferences({
      media: [currentVideo, otherAudio],
      prompt: "Use @Video 1 and @Audio 1",
      workspaceAuthority: authority,
    });
    expect(state.activeItems.map((item) => item.type)).toEqual(["video"]);
    expect(state.unauthorizedItems.map((item) => item.type)).toEqual(["audio"]);
    expect(state.unresolvedMentions.map((item) => item.type)).toContain("audio");
  });

  it("keeps the correct current-workspace video plus WAV Smoke B fixture READY at 23 credits", () => {
    const state = resolveVideoPromptBoundReferences({
      media: [currentVideo, currentAudio],
      prompt: "Use @Video 1 and @Audio 1",
      workspaceAuthority: authority,
    });
    expect(state.unauthorizedItems).toEqual([]);
    expect(state.counts).toEqual({ image: 0, video: 1, audio: 1 });
    const request = buildVideoGenerationRequest({
      duration: 5,
      generateAudio: false,
      media: [currentVideo, currentAudio],
      model: seedance25(),
      prompt: "Use @Video 1 and @Audio 1",
      quality: "720p",
      ratio: "16:9",
      workspaceAuthority: authority,
    });
    expect(request.reference_video_asset_ids).toEqual([currentVideo.assetId]);
    expect(request.reference_audio_asset_ids).toEqual([currentAudio.assetId]);
    expect(request.clientCost).toBe(23);
  });

  it("fails the request builder closed for an unauthorized Prompt token", () => {
    expect(() => buildVideoGenerationRequest({
      duration: 5,
      generateAudio: false,
      media: [currentVideo, otherAudio],
      model: seedance25(),
      prompt: "Use @Video 1 and @Audio 1",
      quality: "720p",
      ratio: "16:9",
      workspaceAuthority: authority,
    })).toThrowError(expect.objectContaining({ code: "VIDEO_WORKSPACE_REFERENCE_ACCESS_CHANGED" }));
  });

  it("rechecks the full Prompt-bound set against fresh authority before submit", () => {
    expect(validateVideoWorkspaceAuthorityForSubmit({
      media: [currentVideo, otherAudio],
      prompt: "Use @Video 1 and @Audio 1",
    }, authority)).toContain("current workspace");
    expect(validateVideoWorkspaceAuthorityForSubmit({
      media: [currentVideo, currentAudio],
      prompt: "Use @Video 1 and @Audio 1",
    }, authority)).toBe("");
  });

  it("replaces a stale first-wins projection with the current authority projection", () => {
    const stale = { ...currentAudio, id: "old", url: "https://old.example/signed", source: "history" as const };
    const current = { ...currentAudio, id: "current", url: "https://current.example/private", source: "asset-library" as const };
    const result = reconcileVideoWorkspaceMedia([stale], { ...authority, media: [currentVideo, current] });
    expect(result.authorized).toEqual([expect.objectContaining({ id: "current", url: "https://current.example/private" })]);
    expect(result.unauthorized).toEqual([]);
  });
});

describe("Video draft and local cache workspace scoping", () => {
  it("blocks cross-account and cross-tenant draft reference restoration", () => {
    installStorage();
    saveVideoDraft({
      prompt: "Use @Audio 1",
      modelId: "seedance_2_5",
      params: { duration: 5, ratio: "16:9", quality: "720p", generateAudio: false },
      referenceMedia: [currentAudio],
      workspaceScope: scopeA,
    });
    expect(readVideoDraft(scopeA)?.referenceMedia).toHaveLength(1);
    expect(readVideoDraft(scopeB)).toMatchObject({ referenceBindingsDiscarded: true, referenceMedia: [] });
    expect(readVideoDraft(scopeTenantB)).toMatchObject({ referenceBindingsDiscarded: true, referenceMedia: [] });
  });

  it("requires legacy unscoped drafts to pass server-list authority revalidation", () => {
    const values = installStorage();
    values.set(VIDEO_WORKSPACE_DRAFT_KEY, JSON.stringify({
      version: 1,
      prompt: "Use @Audio 1",
      modelId: "seedance_2_5",
      params: {},
      referenceMedia: [otherAudio],
    }));
    const draft = readVideoDraft(scopeB);
    expect(draft?.requiresAuthorityRevalidation).toBe(true);
    expect(reconcileVideoWorkspaceMedia(draft?.referenceMedia || [], authority).authorized).toEqual([]);
  });

  it("does not expose another workspace's local upload cache", () => {
    const values = installStorage();
    saveLocalMediaAssets([currentAudio], scopeA);
    expect(readLocalMediaAssets(scopeA)).toHaveLength(1);
    expect(readLocalMediaAssets(scopeB)).toEqual([]);
    expect(JSON.parse(values.get(LOCAL_MEDIA_ASSETS_KEY) || "{}")).toMatchObject({ version: 2, scopeKey: "user-a:tenant-a" });
  });
});
