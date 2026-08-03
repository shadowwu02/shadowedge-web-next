import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Video result playback fallback", () => {
  it("shows a localized recovery state when the browser cannot load a completed video", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "src/components/video/VideoGenerationStream.tsx"), "utf8");
    const dictionary = fs.readFileSync(path.join(process.cwd(), "src/i18n/dictionary.ts"), "utf8");
    expect(source).toMatch(/onError=\{\(\) => setFailedPlaybackUrl\(view\.outputUrl\)\}/);
    expect(source).toMatch(/video\.result\.playbackFailedTitle/);
    expect(source).toMatch(/video\.result\.retryPlayback/);
    expect(dictionary).toMatch(/"video\.result\.playbackFailedTitle": "Video could not be loaded"/);
    expect(dictionary).toMatch(/"video\.result\.playbackFailedTitle": "视频暂时无法加载"/);
  });
});
