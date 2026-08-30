import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  isImageActiveStatus,
  isImageFailedStatus,
  isImageTerminalStatus,
  normalizeImageHistoryItem,
} from "../src/lib/image/imageHistoryUtils";

const ROOT = path.join(process.cwd());

describe("Image UNCERTAIN fail-closed presentation", () => {
  it("does not invent terminal failure copy when the backend supplied no error", () => {
    const item = normalizeImageHistoryItem({
      id: "job-uncertain-1",
      status: "uncertain",
      error_message: null,
      meta: { providerAcceptanceUncertain: true },
    });

    expect(item.errorMessage).toBe("");
    expect(item.status).toBe("uncertain");
    expect(isImageActiveStatus(item.status)).toBe(true);
    expect(isImageFailedStatus(item.status)).toBe(false);
    expect(isImageTerminalStatus(item.status)).toBe(false);
  });

  it("preserves real backend failure evidence only for a terminal failed job", () => {
    const item = normalizeImageHistoryItem({
      id: "job-failed-1",
      status: "failed",
      error_message: "Provider rejected the image request.",
    });

    expect(item.errorMessage).toBe("Provider rejected the image request.");
    expect(isImageFailedStatus(item.status)).toBe(true);
    expect(isImageTerminalStatus(item.status)).toBe(true);
  });

  it("renders UNCERTAIN as nonterminal and gates the failure banner on failed status", () => {
    const detail = fs.readFileSync(path.join(ROOT, "src/components/image/ImageOutputDetailPanel.tsx"), "utf8");
    const stage = fs.readFileSync(path.join(ROOT, "src/components/image/ImageOutputStage.tsx"), "utf8");
    const history = fs.readFileSync(path.join(ROOT, "src/components/image/ImageHistoryPanel.tsx"), "utf8");
    const stack = fs.readFileSync(path.join(ROOT, "src/components/image/ImageResultStack.tsx"), "utf8");

    expect(detail).toMatch(/status\.toLowerCase\(\) === "uncertain"/);
    expect(detail).not.toMatch(/!isCompleted\s*&&\s*job\.errorMessage/);
    expect(detail).toMatch(/\{isFailed \? \(/);
    expect(stage).toMatch(/\) : isFailed \? \(/);
    expect(history).toMatch(/\{isFailed \? \(/);
    expect(stack).toMatch(/\) : isFailed \? \(/);
  });

  it("scopes refresh errors to the selected Job identity and clears them on selection change", () => {
    const hook = fs.readFileSync(path.join(ROOT, "src/hooks/useImageGeneration.ts"), "utf8");
    expect(hook).toMatch(/const \[errorJobId, setErrorJobId\] = useState\(""\)/);
    expect(hook).toMatch(/identities\.includes\(errorJobId\) \? error : ""/);
    expect(hook).toMatch(/setError\([^\n]+, jobId\)/);
    expect(hook).toMatch(/errorJobIdRef\.current !== nextJobId\) setError\(""\)/);
  });
});
