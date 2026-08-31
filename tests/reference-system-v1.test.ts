import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  getCanonicalReferenceIdentity,
  isSameCanonicalReference,
} from "@/lib/reference/referenceIdentity";
import { assertReferencePipelineParity } from "@/lib/reference/referencePipelineParity";
import { autoBindSelectedVideoReferences } from "@/lib/video/videoReferenceAutoBind";
import { resolveVideoPromptBoundReferences } from "@/lib/video/videoPromptBoundReferences";
import { getImageReferencesFromDraft, type ImageWorkspaceDraft } from "@/lib/image/imageWorkspaceDraft";
import type { UploadMediaItem, UploadMediaType } from "@/types/video";

function media(type: UploadMediaType, index: number): UploadMediaItem {
  const assetId = `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
  return {
    id: `local-${index}`,
    assetId,
    canonicalReferenceStatus: "CANONICAL",
    privateReference: true,
    type,
    name: `${type}-${index}`,
    mimeType: `${type}/${type === "image" ? "png" : type === "audio" ? "wav" : "mp4"}`,
    uploadStatus: "ready",
    url: "",
  };
}

describe("REFERENCE_SYSTEM_V1 frontend invariants", () => {
  it("uses canonical Asset identity and never collapses distinct private empty-URL Assets", () => {
    const first = media("image", 1);
    const second = media("image", 2);
    expect(getCanonicalReferenceIdentity(first)).toBe(`asset:${first.assetId}`);
    expect(isSameCanonicalReference(first, second)).toBe(false);
  });

  it("fails closed when selection, binding, authority, serializer, or provider counts diverge", () => {
    expect(assertReferencePipelineParity({
      active: { image: 2, video: 1, audio: 0 },
      bindings: { image: 2, video: 1, audio: 0 },
      authority: { image: ["a", "b"], video: ["v"], audio: [] },
      serializer: { image: 2, video: 1, audio: 0 },
      provider: { image: 2, video: 1, audio: 0 },
    })).toBe(true);
    expect(() => assertReferencePipelineParity({ selected: 2, provider: 1 }))
      .toThrowError(expect.objectContaining({ code: "REFERENCE_PIPELINE_COUNT_DIVERGENCE" }));
  });

  it("auto-binds explicit Image, Video, and Audio selections and deletion removes activation", () => {
    const items = [media("image", 1), media("video", 2), media("audio", 3)];
    const bound = autoBindSelectedVideoReferences({
      media: items,
      mentionBindings: [],
      prompt: "Scene",
      selected: items,
    });
    expect(bound.mentionBindings.map((binding) => binding.mediaId)).toEqual(
      items.map((item) => `asset:${item.assetId}`),
    );
    const active = resolveVideoPromptBoundReferences({ media: items, mentionBindings: bound.mentionBindings, prompt: bound.prompt });
    expect(active.counts).toEqual({ image: 1, video: 1, audio: 1 });

    const withoutAudioToken = resolveVideoPromptBoundReferences({
      media: items,
      mentionBindings: bound.mentionBindings,
      prompt: bound.prompt.replace("【@音频1】", ""),
    });
    expect(withoutAudioToken.counts.audio).toBe(0);
  });

  it("restores every saved Image reference and leaves over-limit resolution to explicit user action", () => {
    const draft = {
      version: 3,
      updatedAt: new Date().toISOString(),
      prompt: "",
      modelId: "nano_banana",
      aspectRatio: "1:1",
      ratio: "1:1",
      quantity: 1,
      references: Array.from({ length: 3 }, (_, index) => ({
        id: `ref-${index}`,
        assetId: `asset-${index}`,
        canonicalStatus: "ready",
        referenceEligibility: true,
        name: `Reference ${index}`,
        url: `https://example.com/reference-${index}.png`,
      })),
    } satisfies ImageWorkspaceDraft;
    expect(getImageReferencesFromDraft(draft)).toHaveLength(3);

    const hookSource = readFileSync(join(process.cwd(), "src/hooks/useImageGeneration.ts"), "utf8");
    expect(hookSource).not.toContain("current.slice(0, maxReferences)");
    expect(hookSource).toContain('adjustments.includes("reference_limit_exceeded")');
  });
});
