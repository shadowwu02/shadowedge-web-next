import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contract = readFileSync(
  new URL("../docs/runbooks/remake-render-runtime-contract-v1.md", import.meta.url),
  "utf8",
);

function section(title: string, nextTitle?: string) {
  const start = contract.indexOf(title);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = nextTitle ? contract.indexOf(nextTitle, start + title.length) : contract.length;
  expect(end).toBeGreaterThan(start);
  return contract.slice(start, end);
}

describe("Remake R6 Full Render Runtime contract", () => {
  it("defines a durable Render Job with every required frozen field", () => {
    const job = section("## 5. Remake Render Job contract", "## 6. Public state contract");
    for (const field of [
      "snapshotRef",
      "snapshotHash",
      "timelineVersion",
      "orderedShots",
      "audioPolicy",
      "outputSettings",
      "renderJobRef",
      "requestHash",
    ]) {
      expect(job).toContain(field);
    }
    expect(job).toContain("exactly one `queued` Render Job");
    expect(job).toContain("exactly one metadata-only render intent");
  });

  it("defines only the approved public lifecycle and terminal immutability", () => {
    const state = section("## 6. Public state contract", "## 7. Worker claim and immutable input boundary");
    for (const status of ["`queued`", "`processing`", "`completed`", "`failed`"]) {
      expect(state).toContain(status);
    }
    expect(state).toContain("`completed -> processing/failed/queued`");
    expect(state).toContain("`failed -> processing/completed/queued`");
    expect(state).toContain("Browser polling is read-only");
  });

  it("forces the Worker to read the immutable snapshot and never live state", () => {
    const worker = section("## 7. Worker claim and immutable input boundary", "## 8. Deterministic Composite boundary");
    expect(worker).toContain("one Job is processed by at most one execution slot");
    expect(worker).toContain("snapshotRef");
    expect(worker).toContain("snapshotHash");
    expect(worker).toContain("prohibited from querying current Timeline selections");
    expect(worker).toContain("current Draft text");
    expect(worker).toContain("latest generated replacement");
    expect(worker).toContain("cannot repair a stale snapshot by reading live state");
  });

  it("defines a deterministic complete Composite manifest without implementing FFmpeg", () => {
    const composite = section("## 8. Deterministic Composite boundary", "## 9. Stage evidence and restart recovery");
    expect(composite).toContain("RenderExecutionManifestV1");
    expect(composite).toContain("orderedInputs");
    expect(composite).toContain("expectedDuration");
    expect(composite).toContain("No `slice`, truncate, dedup-by-URL, automatic reorder or missing-Shot fallback");
    expect(composite).toContain("R6 contains no FFmpeg command, process spawn or render adapter");
  });

  it("uses stage evidence for restart and uncertain-outcome safety", () => {
    const recovery = section("## 9. Stage evidence and restart recovery", "## 10. Output validation and Canonical Asset materialization");
    for (const stage of [
      "JOB_CLAIMED",
      "SNAPSHOT_VERIFIED",
      "INPUTS_MATERIALIZED",
      "COMPOSITE_STARTED",
      "COMPOSITE_COMPLETED",
      "OUTPUT_VERIFIED",
      "CANONICAL_UPLOAD_COMPLETED",
      "ASSET_CREATED",
      "JOB_COMPLETED",
    ]) {
      expect(recovery).toContain(stage);
    }
    expect(recovery).toContain("requires evidence reconciliation before another composite attempt");
    expect(recovery).toContain("does not automatically re-render");
    expect(recovery).toContain("no duplicate Asset row is created");
  });

  it("materializes one verified canonical Asset bound to Job and Snapshot", () => {
    const asset = section("## 10. Output validation and Canonical Asset materialization", "## 11. Idempotency and retry safety");
    for (const field of [
      "finalAssetRef",
      "renderJobRef",
      "renderRequestRef",
      "snapshotRef",
      "snapshotHash",
      "orderedInputLineageHashes",
      "outputContentHash",
    ]) {
      expect(asset).toContain(field);
    }
    expect(asset).toContain("one Asset lineage per Render Job");
    expect(asset).toContain("A URL alone is never sufficient");
    expect(asset).toContain("never overwrite");
  });

  it("defines semantic idempotency and stage-aware retry safety", () => {
    const safety = section("## 11. Idempotency and retry safety", "## 12. Ownership and authorization");
    expect(safety).toContain("Different key + same identity resolves the same Job");
    expect(safety).toContain("Same key + different identity returns `RENDER_IDEMPOTENCY_CONFLICT`");
    expect(safety).toContain("an attempt never creates another semantic Job");
    expect(safety).toContain("blocks automatic retry until reconciliation");
    expect(safety).toContain("Completed Job replay returns the existing canonical Asset");
  });

  it("enforces server-resolved ownership and Tenant isolation", () => {
    const ownership = section("## 12. Ownership and authorization", "## 13. Failure contract");
    expect(ownership).toContain("resolves actor and Tenant from authenticated server authority");
    expect(ownership).toContain("Cross-Tenant and cross-owner references fail hidden (`404`) or denied (`403`)");
    expect(ownership).toContain("Input reads are limited to Asset refs in the immutable Job");
  });

  it("is design-only and has zero Render, Provider or financial side effects", () => {
    const boundary = section("## 14. Credit and side-effect boundary", "## 15. Architecture validation matrix");
    const candidate = section("## 17. Candidate safety statement");
    expect(boundary).toContain("R6 changes no production price, Credit ledger, refund logic or Billing");
    expect(boundary).toContain("Render/FFmpeg/Provider/Credit/Billing calls all zero");
    expect(contract).toContain("Status: `DESIGN_ONLY_NOT_PRODUCTION`");
    expect(candidate).toContain("Render Job/Worker | No");
    expect(candidate).toContain("Full Video Render/Composite | No");
    expect(candidate).toContain("FFmpeg | No");
    expect(candidate).toContain("Provider/Provider Status | No");
    expect(candidate).toContain("Credits/refunds/ledger | No");
    expect(candidate).toContain("Billing/Stripe/Membership | No");
    expect(candidate).toContain("RENDER_JOB_CONTRACT_READY=YES");
    expect(candidate).toContain("WORKER_BOUNDARY_READY=YES");
    expect(candidate).toContain("ASSET_MATERIALIZATION_READY=YES");
    expect(candidate).toContain("IDEMPOTENCY_READY=YES");
    expect(candidate).toContain("PRODUCTION_CHANGE=NO");
  });
});
