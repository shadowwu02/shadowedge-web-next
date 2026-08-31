import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { autoBindSelectedVideoReferences } from "@/lib/video/videoReferenceAutoBind";
import { resolveVideoPromptBoundReferences } from "@/lib/video/videoPromptBoundReferences";
import type { VideoWorkspaceAuthority } from "@/lib/video/videoWorkspaceAuthority";
import type { UploadMediaItem } from "@/types/video";

function image(index: number): UploadMediaItem {
  const assetId = `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
  return {
    id: assetId,
    assetId,
    canonicalReferenceStatus: "CANONICAL",
    privateReference: true,
    type: "image",
    name: `Image ${index}`,
    mimeType: "image/png",
    uploadStatus: "ready",
    url: "",
  };
}

const first = image(1);
const second = image(2);
const authority: VideoWorkspaceAuthority = {
  scope: { userId: "user", tenantId: "tenant" },
  media: [first, second],
  checkedAt: 1,
};

describe("Video explicit reference selection auto-binding", () => {
  it("creates Prompt tokens and bindings once for explicitly selected private Images", () => {
    const one = autoBindSelectedVideoReferences({
      media: [first, second],
      mentionBindings: [],
      prompt: "Animate this composition.",
      selected: [first],
    });
    expect(one.prompt).toBe("Animate this composition. 【@图1】");
    expect(one.mentionBindings).toHaveLength(1);

    const two = autoBindSelectedVideoReferences({
      media: [first, second],
      mentionBindings: one.mentionBindings,
      prompt: one.prompt,
      selected: [second],
    });
    expect(two.prompt).toBe("Animate this composition. 【@图1】 【@图2】");
    expect(two.mentionBindings).toHaveLength(2);

    const duplicate = autoBindSelectedVideoReferences({
      media: [first, second],
      mentionBindings: two.mentionBindings,
      prompt: two.prompt,
      selected: [first],
    });
    expect(duplicate).toEqual(two);
  });

  it("keeps Prompt bindings as the only active generation reference source", () => {
    const trayOnly = resolveVideoPromptBoundReferences({
      media: [first, second],
      prompt: "No reference selected.",
      workspaceAuthority: authority,
    });
    expect(trayOnly.activeItems).toEqual([]);

    const bound = autoBindSelectedVideoReferences({
      media: [first, second], mentionBindings: [], prompt: "Scene", selected: [first, second],
    });
    expect(resolveVideoPromptBoundReferences({
      media: [first, second],
      mentionBindings: bound.mentionBindings,
      prompt: bound.prompt,
      workspaceAuthority: authority,
    }).counts.image).toBe(2);

    const afterTokenDelete = resolveVideoPromptBoundReferences({
      media: [first, second],
      mentionBindings: bound.mentionBindings,
      prompt: bound.prompt.replace("【@图1】", ""),
      workspaceAuthority: authority,
    });
    expect(afterTokenDelete.activeItems.map((item) => item.assetId)).toEqual([second.assetId]);
  });

  it("marks only the failed Prompt chip and preserves atomic replacement", () => {
    const promptBox = readFileSync(join(process.cwd(), "src/components/video/PromptBox.tsx"), "utf8");
    expect(promptBox).toContain('t("video.prompt.referenceUnavailable")');
    expect(promptBox).toContain("unavailableMediaIds.includes(binding.id)");
    expect(promptBox).toContain("binding.tokenId === bindingToUpdate.tokenId ? nextBinding : binding");
  });
});
