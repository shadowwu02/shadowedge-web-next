import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { normalizeImageModel } from "@/lib/image/imageModelRules";
import {
  countImagePromptCharacters,
  getImagePromptLimit,
} from "@/lib/image/imagePromptLimits";
import { normalizeVideoModel } from "@/lib/video-api";
import {
  countVideoPromptCharacters,
  getVideoPromptLimit,
} from "@/lib/video/videoPromptLimits";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("catalog-driven generation prompt limits", () => {
  it.each(["gpt_image_2", "nano_banana", "nano_banana_lite"])("uses the image catalog limit for %s", (id) => {
    const model = normalizeImageModel({
      id,
      capabilities: { maxPromptLength: 4000 },
    });
    expect(getImagePromptLimit(model)).toBe(4000);
  });

  it.each(["seedance_2_0_mini", "seedance_2_0_fast", "seedance_2_0", "seedance_2_5"])("uses the video catalog limit for %s", (id) => {
    const model = normalizeVideoModel({ id, maxPromptLength: 4000 });
    expect(getVideoPromptLimit(model)).toBe(4000);
  });

  it("counts 3999/4000/4001 boundaries and multibyte text by Unicode character", () => {
    expect(countImagePromptCharacters("a".repeat(3999))).toBe(3999);
    expect(countImagePromptCharacters("中".repeat(4000))).toBe(4000);
    expect(countImagePromptCharacters("😀".repeat(4001))).toBe(4001);
    expect(countVideoPromptCharacters("中".repeat(4001))).toBe(4001);
  });

  it("does not silently truncate Remake handoff prompts", () => {
    const handoff = source("src/lib/video/remakeShotVideoHandoff.ts");
    expect(handoff).not.toContain("slice(0, 12000)");
    expect(handoff).toContain("countVideoPromptCharacters(prompt) > VIDEO_PROMPT_FRONTEND_LIMIT");
  });

  it("does not silently truncate Canvas-to-Workspace prompt handoffs", () => {
    const canvas = source("src/components/canvas/CanvasWorkspace.tsx");
    expect(canvas).not.toContain("prompt.slice(0, 1200)");
    expect(canvas).toContain("countImagePromptCharacters(prompt) > IMAGE_PROMPT_FRONTEND_LIMIT");
  });
});

describe("generation workspace containment", () => {
  it("keeps the image add action stable and bounds 0/1/2/4/8/14/16 references inside an internal scroller", () => {
    const tray = source("src/components/image/ImageReferenceTray.tsx");
    expect(tray).toContain('data-testid="image-reference-well"');
    expect(tray).toContain("max-h-[360px]");
    expect(tray).toContain("overflow-y-auto");
    expect(tray).toContain("onDrop=");
    expect(tray).toContain("remainingSlots");
    expect(tray).toMatch(/references\.length[\s\S]*image\.references\.add/);
  });

  it("contains long unbroken video errors without expanding the model selector track", () => {
    const errorState = source("src/components/common/ErrorState.tsx");
    const selector = source("src/components/video/ModelSelector.tsx");
    const workspace = source("src/components/video/VideoWorkspace.tsx");
    expect(errorState).toContain("min-w-0 max-w-full overflow-hidden");
    expect(errorState).toContain("[overflow-wrap:anywhere]");
    expect(selector).toContain("relative min-w-0 max-w-full");
    expect(selector).toContain("w-full min-w-0 max-w-full");
    expect(workspace).toContain("minmax(340px,370px)_minmax(0,1fr)");
  });
});
