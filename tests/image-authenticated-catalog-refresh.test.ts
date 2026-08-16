import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/hooks/useImageGeneration.ts"),
  "utf8",
);

describe("authenticated image catalog loading", () => {
  it("waits for shared auth hydration before loading the capability catalog", () => {
    expect(source).toContain('import { useAuthSession } from "@/hooks/useAuthSession";');
    expect(source).toContain("const { isLoading: authLoading, isSignedIn } = useAuthSession();");
    expect(source).toMatch(/if \(!autoLoad \|\| authLoading\) return;/);
  });

  it("reloads after a signed-in state transition instead of retaining an anonymous projection", () => {
    expect(source).toMatch(/\[autoLoad, authLoading, isSignedIn, loadModels, reloadHistory\]/);
    expect(source).toMatch(/void loadModels\(\);\s*void reloadHistory\(\);/);
  });
});
