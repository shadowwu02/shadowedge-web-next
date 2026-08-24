import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contract = readFileSync(
  new URL("../docs/runbooks/remake-full-export-contract-v1.md", import.meta.url),
  "utf8",
);

function section(title: string, nextTitle?: string) {
  const start = contract.indexOf(title);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = nextTitle ? contract.indexOf(nextTitle, start + title.length) : contract.length;
  expect(end).toBeGreaterThan(start);
  return contract.slice(start, end);
}

describe("Remake R5 Full Export contract", () => {
  it("defines an immutable complete Timeline snapshot", () => {
    const snapshot = section("## 5. Immutable Remake Export Snapshot", "## 6. Ordered Shot and visual selection contract");
    for (const field of [
      "timelineVersion",
      "orderedShots",
      "selectedVisual",
      "durationMap",
      "audioPolicyVersion",
      "snapshotHash",
    ]) {
      expect(snapshot).toContain(field);
    }
    expect(snapshot).toContain("A snapshot is append-only and cannot be patched");
    expect(snapshot).toContain("does not query the current Timeline, current Draft or latest replacement");
    expect(snapshot).toContain("server-generated SHA-256 hash");
  });

  it("supports only verified original v1 or generated v3 visual inputs", () => {
    const shots = section("## 6. Ordered Shot and visual selection contract", "## 7. Duration map contract");
    expect(shots).toContain("`original_v1`");
    expect(shots).toContain("`generated_v3`");
    expect(shots).toContain("canonical Asset status is READY");
    expect(shots).toContain("Generation Request and Generation Job lineage are present");
    expect(shots).toContain("The server does not fall back to `original_v1`");
    expect(shots).toContain("`v2 edited` remains a text Draft revision");
  });

  it("freezes an exact duration map without normalization", () => {
    const duration = section("## 7. Duration map contract", "## 8. Audio policy contract");
    expect(duration).toContain('timingContract="exact"');
    expect(duration).toContain("no stretch, speed change, frame interpolation, loop, pad, trim expansion or duration normalization");
    expect(duration).toContain("`EXPORT_DURATION_MISMATCH`");
    expect(duration).toContain("deterministic sum of ordered `outputDuration` values");
  });

  it("defines original, generated and mute audio with no fallback", () => {
    const audio = section("## 8. Audio policy contract", "## 9. Render boundary");
    expect(audio).toContain("`original_audio`");
    expect(audio).toContain("`generated_audio`");
    expect(audio).toContain("`mute`");
    expect(audio).toContain("There is no automatic `generated_audio -> original_audio -> mute` fallback chain");
    expect(audio).toContain("Missing stream rejects snapshot");
  });

  it("places explicit confirmation, pricing and Credits before one Render Job", () => {
    const render = section("## 9. Render boundary", "## 10. Composite and Final Asset lineage");
    expect(render).toContain("creates no Render Job and consumes no Credits");
    expect(render).toContain("resolves current approved render pricing");
    expect(render).toContain("checks available Credits");
    expect(render).toContain("one Render Job");
    expect(render).toContain("one metadata-only render intent");
    expect(render).toContain("never reads live Timeline/Draft state");
  });

  it("binds Final Asset to snapshot, Render Job and ordered inputs", () => {
    const lineage = section("## 10. Composite and Final Asset lineage", "## 11. Idempotency and replay");
    for (const field of [
      "finalAssetRef",
      "renderJobRef",
      "snapshotRef",
      "snapshotHash",
      "orderedInputLineageHashes",
      "durationMapHash",
      "audioPolicyHash",
    ]) {
      expect(lineage).toContain(field);
    }
    expect(lineage).toContain("A URL alone is never sufficient");
  });

  it("defines snapshot and render idempotency with replay safety", () => {
    const idempotency = section("## 11. Idempotency and replay", "## 12. Credit and financial boundary");
    expect(idempotency).toContain("Different key + same semantic snapshot resolves the existing snapshot");
    expect(idempotency).toContain("Same render intent returns the existing Render Job/Credit receipt");
    expect(idempotency).toContain("Browser double-click, refresh, polling and worker restart never create a second Render Job or debit");
    expect(idempotency).toContain("`EXPORT_SNAPSHOT_IDEMPOTENCY_CONFLICT`");
  });

  it("gives snapshot design and validation zero side-effect authority", () => {
    const credit = section("## 12. Credit and financial boundary", "## 13. Safe errors, audit and privacy");
    expect(credit).toContain("Create/validate snapshot | 0 | 0 | 0 | 0 | 0");
    expect(credit).toContain("Snapshot APIs cannot import Render, FFmpeg, Provider, Credit mutation or Billing services");
    expect(credit).toContain("rejects pre-Job and pre-Credit");
    expect(credit).toContain("R5 does not invent or execute a refund");
  });

  it("is design-only with no render, FFmpeg, Provider, financial or production change", () => {
    const safety = section("## 16. Candidate safety statement");
    expect(contract).toContain("Status: `DESIGN_ONLY_NOT_PRODUCTION`");
    expect(safety).toContain("Frontend runtime | No");
    expect(safety).toContain("Backend/runtime | No");
    expect(safety).toContain("Full Video Render/Composite | No");
    expect(safety).toContain("FFmpeg | No");
    expect(safety).toContain("Provider/Provider Status | No");
    expect(safety).toContain("Credits/refunds/ledger | No");
    expect(safety).toContain("Billing/Stripe/Membership | No");
    expect(safety).toContain("FULL_REMAKE_EXPORT_CONTRACT_READY=YES");
    expect(safety).toContain("TIMELINE_SNAPSHOT_READY=YES");
    expect(safety).toContain("RENDER_BOUNDARY_READY=YES");
    expect(safety).toContain("AUDIO_POLICY_READY=YES");
    expect(safety).toContain("CREDIT_BOUNDARY_READY=YES");
    expect(safety).toContain("PRODUCTION_CHANGE=NO");
  });
});
