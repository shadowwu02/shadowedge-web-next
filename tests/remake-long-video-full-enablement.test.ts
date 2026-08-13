import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  isLongVideoAnalysisActive,
  mapLongVideoAnalysisState,
} from "@/lib/video/longVideoAnalysisState";

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("Long Video Real VLM frontend full enablement", () => {
  it("uses authenticated profile admission instead of the legacy beta flag", () => {
    const source = readSource("src/components/video/VideoWorkspace.tsx");

    expect(source).toContain('profile?.longVideoRealAnalysisAccessMode === "authenticated"');
    expect(source).not.toContain("profile?.canUseLongVideoRealAnalysis === true");
  });

  it("uses the canonical route for long-video creation while retaining legacy compatibility", () => {
    const source = readSource("src/lib/video-api.ts");

    const createFunction = source.slice(
      source.indexOf("export async function createLongVideoRemakeAnalysis"),
      source.indexOf("export async function getLongVideoRemakeAnalysisStatus"),
    );
    expect(createFunction).toContain('"/api/remake/analyze-long-video"');
    expect(createFunction).not.toContain('"/api/internal/video/reverse-analyze"');
    expect(source).toContain('fetch("/api/internal/video/reverse-analyze"');
  });

  it("recovers a canonical long-video result before falling back to a legacy full-episode job", () => {
    const apiSource = readSource("src/lib/video-api.ts");
    const workspaceSource = readSource("src/components/video/VideoWorkspace.tsx");
    const recoveryFunction = apiSource.slice(
      apiSource.indexOf("export async function getRemakeAnalysisStatusForRecovery"),
      apiSource.indexOf("export async function getVideoModels"),
    );

    expect(recoveryFunction.indexOf("getLongVideoRemakeAnalysisStatus")).toBeLessThan(
      recoveryFunction.indexOf("getFullEpisodeRemakeAnalysisStatus"),
    );
    expect(recoveryFunction).toContain("error.status !== 404");
    expect(workspaceSource).toContain('recovered.mode === "long_video"');
    expect(workspaceSource).toContain("applyCompletedLongVideoAnalysisJob(recoveredJob)");
  });

  it("keeps UNCERTAIN and REVIEW_REQUIRED active to prevent duplicate submit", () => {
    expect(mapLongVideoAnalysisState({ status: "UNCERTAIN" })).toBe("uncertain");
    expect(mapLongVideoAnalysisState({ status: "REVIEW_REQUIRED" })).toBe("review_required");
    expect(isLongVideoAnalysisActive("uncertain")).toBe(true);
    expect(isLongVideoAnalysisActive("review_required")).toBe(true);
  });

  it("does not present the long-video mode as beta", () => {
    const source = readSource("src/components/video/remake/RemakeSettingsPanel.tsx");

    expect(source).not.toContain('t("video.remake.longVideo.beta")');
  });

  it("renders canonical summary and remake prompt without internal provider branding", () => {
    const panelSource = readSource("src/components/video/remake/RemakeStoryboardPanel.tsx");
    const dictionarySource = readSource("src/i18n/dictionary.ts");

    expect(panelSource).toContain('t("video.remake.summary")');
    expect(panelSource).toContain('t("video.remake.remakePrompt")');
    expect(dictionarySource).not.toContain("Long video analysis uses Real VLM");
    expect(dictionarySource).not.toContain("长视频分析会使用 Real VLM");
  });
});
