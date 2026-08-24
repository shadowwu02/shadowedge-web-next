import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contract = readFileSync(
  new URL("../docs/runbooks/remake-single-shot-generation-contract-v1.md", import.meta.url),
  "utf8",
);

function section(title: string, nextTitle?: string) {
  const start = contract.indexOf(title);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = nextTitle ? contract.indexOf(nextTitle, start + title.length) : contract.length;
  expect(end).toBeGreaterThan(start);
  return contract.slice(start, end);
}

describe("Remake R3 Single Shot Generation contract", () => {
  it("defines the required canonical Shot to existing pipeline flow", () => {
    const flow = section("## 3. Required flow", "## 4. Browser command contract");
    expect(flow).toContain("Canonical Shot (immutable)");
    expect(flow).toContain("User Edited Shot Draft (versioned)");
    expect(flow).toContain("Generate Confirmation (immutable receipt)");
    expect(flow).toContain("existing atomic Video Generation Job/Credit transaction");
    expect(flow).toContain("existing metadata-only Outbox");
    expect(flow).toContain("existing Provider adapter");
  });

  it("defines every required Shot Generation Request field", () => {
    const request = section("## 5. Authoritative Shot Generation Request", "## 6. Prompt snapshot contract");
    for (const field of [
      "shotRef",
      "draftRevision",
      "promptSnapshot",
      "duration",
      "model",
      "resolution",
      "audio",
    ]) {
      expect(request).toContain(field);
    }
    expect(request).toContain("descriptionSnapshot");
    expect(request).toContain("aspectRatio");
    expect(request).toContain("generationIntentHash");
  });

  it("freezes prompt content before Job creation and prohibits mutable Draft reads", () => {
    const snapshot = section("## 6. Prompt snapshot contract", "## 7. Generation intent and idempotency");
    expect(snapshot).toContain("copies `editedPrompt` into `promptSnapshot`");
    expect(snapshot).toContain("After `ShotGenerationRequestV1` is created");
    expect(snapshot).toContain("Worker execution must not query `remake_shot_drafts`");
    expect(snapshot).toContain("Provider serialization must not query the current Draft");
    expect(snapshot).toContain("fails closed before Provider Submit");
    expect(snapshot).toContain("never falls back to the current Draft or Original prompt");
  });

  it("makes the same Shot revision and generation intent the same request", () => {
    const idempotency = section("## 7. Generation intent and idempotency", "## 8. Admission, pricing and Credit boundary");
    expect(idempotency).toContain("same Shot revision + same normalized generation intent = same request");
    expect(idempotency).toContain("Same `Idempotency-Key`/`clientRequestId` plus the same intent returns the original request/Job receipt");
    expect(idempotency).toContain("A different key with the same semantic intent resolves the existing request");
    expect(idempotency).toContain("at most one Job");
    expect(idempotency).toContain("does not append another Outbox intent, Provider Attempt or Credit transaction");
  });

  it("validates admission, pricing and Credit availability before writes", () => {
    const credit = section("## 8. Admission, pricing and Credit boundary", "## 9. Existing Video Generation pipeline boundary");
    expect(credit).toContain("Before any Generation Job or Credit write");
    expect(credit).toContain("validate model + duration + resolution + aspect ratio + audio through the public Video Catalog");
    expect(credit).toContain("resolve current production pricing for the exact tuple");
    expect(credit).toContain("sufficient available Credits");
    expect(credit).toContain("existing Credit account");
    expect(credit).toContain("Existing atomic contract");
    expect(credit).toContain("existing ledger");
  });

  it("preserves exact tuple values and the existing main generation chain", () => {
    const pipeline = section("## 9. Existing Video Generation pipeline boundary", "## 10. State and error contract");
    expect(pipeline).toContain("exact `duration -> duration`");
    expect(pipeline).toContain("exact `audio -> generate_audio`");
    expect(pipeline).toContain("existing build/runtime parameter path");
    expect(pipeline).toContain("may not call the Provider");
    expect(pipeline).toContain("bypass admission");
    expect(pipeline).toContain("bypass pricing");
    expect(pipeline).toContain("bypass Credits");
  });

  it("defines fail-closed snapshot, capability, pricing and Credit errors", () => {
    for (const code of [
      "SHOT_CONFIRMATION_REQUIRED",
      "SHOT_DRAFT_REVISION_MISMATCH",
      "SHOT_PROMPT_SNAPSHOT_INVALID",
      "SHOT_GENERATION_INTENT_CONFLICT",
      "VIDEO_CAPABILITY_REJECTED",
      "VIDEO_PRICING_UNAVAILABLE",
      "INSUFFICIENT_CREDITS",
      "SHOT_GENERATION_SNAPSHOT_MISSING",
      "SHOT_GENERATION_SNAPSHOT_HASH_MISMATCH",
    ]) {
      expect(contract).toContain(`\`${code}\``);
    }
    expect(contract).toMatch(/fail closed before Provider Submit/i);
  });

  it("is design-only with no generation, Provider, financial or production change", () => {
    const safety = section("## 14. Candidate safety statement");
    expect(contract).toContain("Status: `DESIGN_ONLY_NOT_PRODUCTION`");
    expect(safety).toContain("Frontend runtime | No");
    expect(safety).toContain("Backend/runtime adapter | No");
    expect(safety).toContain("Database migration/schema | No");
    expect(safety).toContain("Video Generate/Job/Outbox | No");
    expect(safety).toContain("Provider/Provider Status | No");
    expect(safety).toContain("Credits/refunds/ledger | No");
    expect(safety).toContain("Billing/Stripe/Membership | No");
    expect(safety).toContain("SHOT_GENERATION_CONTRACT_READY=YES");
    expect(safety).toContain("PROMPT_SNAPSHOT_READY=YES");
    expect(safety).toContain("IDEMPOTENCY_READY=YES");
    expect(safety).toContain("CREDIT_BOUNDARY_READY=YES");
    expect(safety).toContain("PRODUCTION_CHANGE=NO");
  });
});
