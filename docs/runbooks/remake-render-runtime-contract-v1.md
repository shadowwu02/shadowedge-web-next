# Remake Phase R6 — Full Render Runtime Contract v1

Date: 2026-08-24

Status: `DESIGN_ONLY_NOT_PRODUCTION`

Depends on:

- R5 `RemakeExportSnapshotV1` immutable Timeline snapshot
- R4 canonical replacement Asset lineage
- Existing durable Job, metadata-only intent, canonical Asset and exactly-once patterns

This document defines a future Full Remake Render runtime boundary. It creates no schema, route, Render Job, Worker execution, Composite, FFmpeg process, Provider request, Credit transaction, Billing change, deployment or production behavior.

## 1. Runtime decisions

1. One immutable Export Snapshot plus one normalized output intent identifies one semantic Render Request.
2. Admission creates at most one durable Render Job. The Browser cannot create a Worker attempt, select storage, submit URLs or provide ownership authority.
3. The Worker reads the persisted snapshot by `snapshotRef + snapshotHash`. It must never read live Timeline, live Draft or latest replacement state.
4. The Render Job contains a frozen render manifest: Timeline version, complete ordered Shot selections, audio policy and output settings copied from verified server evidence.
5. A Shot cannot be dropped, duplicated, reordered, substituted, retimed or muted implicitly.
6. Only one execution lease may own a Render Job at a time. The same Job cannot run in two Worker slots.
7. Retry is stage-aware. An ambiguous composite/materialization outcome is reconciled before another execution; it is never blindly rerun.
8. Completion requires verified media, canonical object persistence, one canonical Asset record and immutable Job/Snapshot lineage. A file URL alone is not completion.
9. Render Request/Job replay returns the existing receipt and cannot produce a second composite, Asset or financial mutation.
10. R6 defines contracts only. Full Render, FFmpeg, Provider Generate, Credits and Billing remain disabled and unchanged.

## 2. Scope and non-goals

### In scope

- Immutable Render Request and durable Render Job shape
- Four-state public lifecycle: `queued`, `processing`, `completed`, `failed`
- Worker claim/lease and snapshot-only read boundary
- Deterministic input manifest and future Composite boundary
- Canonical output validation and Asset materialization
- Job/Snapshot/Asset lineage
- Idempotency, replay, retry safety and ownership isolation
- Safe audit/observability, failure classification and rollback design

### Out of scope

- Executing FFmpeg or any other compositor
- Provider Generate or Provider Status call
- Applying database migrations or deploying runtime code
- Creating a production Render Job or canonical output Asset
- Production render pricing, Credit consumption/refund or Billing redesign
- Timeline editing, Shot generation or replacement generation
- Transition effects, captions, music, voice synthesis, color processing or live collaboration

## 3. Authority flow

```text
Authenticated explicit Render confirmation
  -> server resolves Tenant and immutable Export Snapshot
  -> snapshot hash + Asset authority revalidation
  -> render capability/output settings validation
  -> future pricing/Credit admission boundary
  -> idempotent Render Request receipt
  -> one durable Render Job + metadata-only intent
  -> single-owner Render Worker
  -> deterministic Composite
  -> output media validation
  -> canonical object persistence
  -> canonical Asset + immutable lineage
```

R6 implements none of these runtime actions. The flow defines the required boundary for a later implementation Candidate.

## 4. Render Request contract

### 4.1 Browser command

A future Browser request may contain only:

```ts
type RequestRemakeRenderCommand = {
  snapshotRef: string;
  expectedSnapshotHash: string;
  outputSettings: {
    container: "mp4";
    resolution: string;
    aspectRatio: string;
    frameRatePolicy: "preserve";
  };
  clientRequestId: string;
  explicitConfirmation: true;
};
```

The Browser cannot submit `tenantId`, `userId`, ordered Shots, audio Asset, storage path, output URL, codec command, price, Credit account, Worker mode or Provider identity. `expectedSnapshotHash` is a compare token, not authority; the Backend recomputes and verifies it from persisted snapshot evidence.

### 4.2 Authoritative immutable request

```ts
type RemakeRenderRequestV1 = {
  contractVersion: "remake-render-request-v1";
  requestRef: string;
  requestHash: string;
  snapshotRef: string;
  snapshotHash: string;
  timelineVersion: number;
  orderedShotManifestHash: string;
  audioPolicyHash: string;
  outputSettings: {
    settingsVersion: "remake-render-output-v1";
    container: "mp4";
    resolution: string;
    aspectRatio: string;
    frameRatePolicy: "preserve";
  };
  createdAt: string;
};
```

The Backend builds this object from the stored R5 snapshot plus allowlisted output settings. `requestHash` is SHA-256 over deterministic canonical JSON. After creation, the request is immutable. Changing snapshot, output settings or contract version creates a different semantic request and requires new explicit confirmation.

## 5. Remake Render Job contract

### 5.1 Durable Job shape

```ts
type RemakeRenderJobV1 = {
  contractVersion: "remake-render-job-v1";
  renderJobRef: string;
  requestRef: string;
  requestHash: string;
  snapshotRef: string;
  snapshotHash: string;
  timelineVersion: number;
  orderedShots: Array<{
    ordinal: number;
    shotRef: string;
    visualSource: "original_v1" | "generated_v3";
    visualAssetRef: string;
    visualLineageHash: string;
    sourceRange: { startTime: number; endTime: number } | null;
    outputDuration: number;
    audioSource: "original_audio" | "generated_audio" | "mute";
    audioAssetRef: string | null;
    audioLineageHash: string | null;
  }>;
  audioPolicy: {
    policyVersion: "remake-export-audio-v1";
    policyHash: string;
  };
  outputSettings: RemakeRenderRequestV1["outputSettings"];
  status: "queued" | "processing" | "completed" | "failed";
  executionPhase: string;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
};
```

The internal row also stores server-resolved Tenant/owner authority, lease fields and safe audit timestamps. Those internal identities are never accepted from or shown to the Browser.

### 5.2 Job creation transaction

A future admitted transaction must atomically:

1. lock semantic request idempotency;
2. verify no prior conflicting request/Job exists;
3. persist the immutable Render Request if absent;
4. persist exactly one `queued` Render Job;
5. persist exactly one metadata-only render intent;
6. persist the separately approved pricing/Credit receipt if that future phase authorizes Credits;
7. return the same safe receipt on replay.

The transaction never embeds media bytes, media URLs, credentials or FFmpeg commands in the Job or intent.

## 6. Public state contract

| State | Meaning | Allowed transition |
| --- | --- | --- |
| `queued` | Durable Job exists; no active Worker owns execution | `processing`, or `failed` on immutable pre-execution validation failure |
| `processing` | One Worker lease owns execution or reconciliation is required | `completed`, `failed`; safe lease recovery may retain `processing` until evidence is resolved |
| `completed` | Verified canonical Asset and lineage exist | Terminal and immutable |
| `failed` | Definitive terminal failure with safe category | Terminal; any future retry needs an explicit linked retry receipt |

Rules:

- State transitions use compare-and-set under Job lock.
- `completed -> processing/failed/queued` and `failed -> processing/completed/queued` are forbidden.
- A Worker crash does not imply `failed` and does not automatically create a new Job.
- An ambiguous outcome remains `processing` with safe `reconciliationRequired=true`; the API may label it as recovery pending without inventing a fifth public lifecycle state.
- Browser polling is read-only and cannot advance state.

## 7. Worker claim and immutable input boundary

### 7.1 Claim/lease

The Worker claims one `queued` Job using an atomic lease containing Worker instance identity, lease generation, claim/expiry timestamps and attempt number. A unique active-lease rule ensures one Job is processed by at most one execution slot.

Lease renewal is conditional on matching Job/lease generation. A stale Worker cannot update state, upload output or create an Asset after ownership is lost.

### 7.2 Snapshot-only read

The Worker receives only:

```text
renderJobRef
requestHash
snapshotRef
snapshotHash
renderContractVersion
```

It then:

1. loads the stored immutable Render Job;
2. loads the exact persisted snapshot by reference;
3. recomputes and compares snapshot/request/ordered-Shot/audio hashes;
4. compares the Job manifest with the snapshot;
5. resolves each canonical Asset under stored Tenant ownership;
6. materializes inputs only after all evidence matches.

The Worker is prohibited from querying current Timeline selections, current Draft text, latest generated replacement, React/localStorage state or Browser payload. It cannot repair a stale snapshot by reading live state.

## 8. Deterministic Composite boundary

Before any future compositor starts, the Worker produces an immutable internal `RenderExecutionManifestV1` from the verified Job:

```ts
type RenderExecutionManifestV1 = {
  manifestVersion: "remake-composite-manifest-v1";
  renderJobRef: string;
  snapshotHash: string;
  orderedInputs: Array<{
    ordinal: number;
    localInputRef: string;
    visualLineageHash: string;
    sourceRange: { startTime: number; endTime: number } | null;
    outputDuration: number;
    audioSource: "original_audio" | "generated_audio" | "mute";
    audioLocalInputRef: string | null;
    audioLineageHash: string | null;
  }>;
  outputSettingsHash: string;
  expectedDuration: number;
};
```

`localInputRef` is a process-private temporary reference and is never persisted to the public Job, API or audit. Future FFmpeg/Composite implementation must be a sandboxed adapter that accepts only this manifest. It cannot receive live Timeline state or construct a fallback input list.

Composite invariants:

- Inputs are processed exactly once in contiguous ordinal order.
- No `slice`, truncate, dedup-by-URL, automatic reorder or missing-Shot fallback is allowed.
- Duration and audio selections are exact; no implicit retime, loop, pad, mute or source switch.
- Output is written to a unique temporary file, never directly to the canonical object key.
- Resource/time/input-count/byte limits must be defined before runtime implementation.

R6 contains no FFmpeg command, process spawn or render adapter.

## 9. Stage evidence and restart recovery

Future stage evidence is append-only and idempotent by `Render Job + Stage`:

```text
JOB_CLAIMED
SNAPSHOT_VERIFIED
INPUTS_MATERIALIZED
COMPOSITE_STARTED
COMPOSITE_COMPLETED
OUTPUT_VERIFIED
CANONICAL_UPLOAD_COMPLETED
ASSET_CREATED
JOB_COMPLETED
```

Each stage records timestamp, safe status, attempt number and allowlisted failure category. It never records URL, local path, command, stdout/stderr, media content, prompt, identity, secret or credential.

Recovery rules:

- Before `COMPOSITE_STARTED`, a lost lease may safely requeue the same Job after temporary input cleanup.
- After `COMPOSITE_STARTED`, a lost lease requires evidence reconciliation before another composite attempt.
- After `COMPOSITE_COMPLETED`, recovery validates the existing temporary output receipt; it does not automatically re-render.
- After canonical upload, recovery checks deterministic object evidence before upload replay.
- After Asset creation, the unique Job/Snapshot lineage returns the existing Asset; no duplicate Asset row is created.
- Insufficient historical evidence keeps reconciliation required. It never guesses success or triggers blind retry.

## 10. Output validation and Canonical Asset materialization

### 10.1 Validation gate

Before canonical persistence, the future materializer must verify:

- output exists and is a complete supported container;
- MIME type is `video/mp4`;
- video stream exists;
- actual duration matches snapshot duration map within an approved render tolerance;
- dimensions/aspect ratio/frame-rate policy match output settings;
- audio presence/absence matches the frozen per-Shot policy and final output contract;
- output is not an input Asset alias;
- Job lease and ownership are still valid.

Failure before this gate creates no canonical object and no Asset.

### 10.2 Deterministic canonical write

The canonical object key is deterministic from server-resolved Tenant + Render Job + snapshot hash under an approved namespace. The object write uses create-if-absent/check-existing semantics. A conflicting object hash is `RENDER_CANONICAL_OBJECT_CONFLICT`, never overwrite.

### 10.3 Canonical Asset transaction

After object validation, one transaction creates or resolves:

```ts
type RemakeRenderedAssetLineageV1 = {
  lineageVersion: "remake-rendered-asset-lineage-v1";
  finalAssetRef: string;
  renderJobRef: string;
  renderRequestRef: string;
  requestHash: string;
  snapshotRef: string;
  snapshotHash: string;
  timelineVersion: number;
  orderedInputLineageHashes: string[];
  audioPolicyHash: string;
  outputSettingsHash: string;
  outputContentHash: string;
};
```

The transaction enforces one Asset lineage per Render Job, verifies Tenant/owner binding, persists verified media metadata and marks the Job `completed`. The safe API may return an authorized delivery URL separately. A URL alone is never sufficient and is not lineage authority.

## 11. Idempotency and retry safety

### 11.1 Request and Job identity

Semantic identity is:

```text
Tenant + owner + snapshotHash + outputSettingsHash + renderContractVersion
```

- Same key + same identity returns the existing request/Job receipt.
- Different key + same identity resolves the same Job.
- Same key + different identity returns `RENDER_IDEMPOTENCY_CONFLICT` before Job/intent/financial writes.
- Concurrent identical requests serialize under one lock and produce one Job.

### 11.2 Attempt safety

- Attempt count belongs to the same Render Job; an attempt never creates another semantic Job.
- Definitive pre-composite transient failure may be eligible for an explicitly controlled retry under the same Job after lease expiry and evidence check.
- Composite/materialization ambiguity blocks automatic retry until reconciliation proves no conflicting output/Asset.
- A definitive `failed` Job is terminal. A future user retry requires a new, explicit retry intent linked to the prior Job and separately approved financial semantics.
- Completed Job replay returns the existing canonical Asset.

### 11.3 Duplicate protection

Required uniqueness boundaries:

- semantic Render Request hash;
- Render Job request reference;
- active Job lease generation;
- stage evidence by Job + Stage;
- canonical object key/content hash;
- canonical Asset lineage by Render Job + snapshot hash.

Together these protect against double click, request timeout, process restart, queue replay, stale Worker completion and materialization replay.

## 12. Ownership and authorization

The Backend resolves actor and Tenant from authenticated server authority. Every snapshot, input Asset, Render Request, Job, intent and Final Asset must share the same Tenant boundary. Cross-Tenant and cross-owner references fail hidden (`404`) or denied (`403`) without disclosing existence.

The Browser may see only safe public refs, public state, progress category, timestamps, output settings and an authorized final delivery URL. It never receives internal IDs, lease owner, storage key, local path, Composite command, raw audit evidence, Credit ledger payload or another user's identity.

Workers use narrowly scoped service authority. Input reads are limited to Asset refs in the immutable Job; output writes are limited to the deterministic Job namespace. Worker authority cannot enumerate arbitrary Tenant Assets or mutate Timeline/Draft/replacement records.

## 13. Failure contract

Safe failure categories:

| Code | Boundary | Behavior |
| --- | --- | --- |
| `RENDER_SNAPSHOT_NOT_FOUND` | Admission/Worker | Hidden failure; no Job or fail same Job before composite |
| `RENDER_SNAPSHOT_HASH_MISMATCH` | Admission/Worker | Fail closed; no live-state repair |
| `RENDER_TIMELINE_VERSION_MISMATCH` | Admission | Pre-Job reject |
| `RENDER_ORDERED_SHOTS_INVALID` | Admission/Worker | No truncation/reorder |
| `RENDER_INPUT_ASSET_UNAVAILABLE` | Worker | No fallback Asset |
| `RENDER_INPUT_LINEAGE_MISMATCH` | Worker | Fail before Composite |
| `RENDER_AUDIO_POLICY_INVALID` | Admission/Worker | No automatic mute/source switch |
| `RENDER_OUTPUT_SETTINGS_INVALID` | Admission | Pre-Job reject |
| `RENDER_IDEMPOTENCY_CONFLICT` | Admission | Existing evidence unchanged |
| `RENDER_WORKER_LEASE_LOST` | Worker | Stale Worker stops; reconciliation |
| `RENDER_COMPOSITE_FAILED` | Composite | Definitive failure category only |
| `RENDER_COMPOSITE_OUTCOME_UNCERTAIN` | Recovery | Keep processing/reconciliation; no blind retry |
| `RENDER_OUTPUT_VALIDATION_FAILED` | Materialization | No canonical Asset |
| `RENDER_CANONICAL_OBJECT_CONFLICT` | Materialization | Never overwrite |
| `RENDER_ASSET_LINEAGE_CONFLICT` | Asset transaction | Existing evidence preserved |

Errors and logs contain no raw media, signed URL, prompt, VLM response, Provider payload, FFmpeg command/output, secret, credential, email or raw financial data.

## 14. Credit and side-effect boundary

R6 changes no production price, Credit ledger, refund logic or Billing.

| R6 design activity | Render Job | Worker | FFmpeg/Composite | Provider | Credit | Billing |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Read/write this contract | 0 | 0 | 0 | 0 | 0 | 0 |
| Architecture validation | 0 | 0 | 0 | 0 | 0 | 0 |
| Snapshot fixture validation | 0 | 0 | 0 | 0 | 0 | 0 |

Future implementation must preserve the R5 rule: invalid snapshot, output settings, pricing, Credit availability or idempotency rejects before Render Job and Credit writes. Any future admitted Render transaction and refund behavior require separate approval. No test in R6 may import or call a real renderer, FFmpeg, Provider, Credit or Billing adapter.

For this Candidate, Render/FFmpeg/Provider/Credit/Billing calls all zero.

## 15. Architecture validation matrix

| Scenario | Expected result |
| --- | --- |
| Valid immutable snapshot fixture | One normalized Render Request/Job manifest |
| Same snapshot + same output intent | Same request and Job receipt |
| Same key + changed output settings | `RENDER_IDEMPOTENCY_CONFLICT`; no Job |
| Concurrent identical admission | One Job and one metadata-only intent |
| Worker starts | Loads exact snapshot ref/hash only |
| Live Timeline changes after enqueue | Running Job and manifest unchanged |
| Live Draft/replacement changes | Worker never reads them |
| Two Worker slots claim same Job | Exactly one lease succeeds |
| Stale Worker reports completion | Rejected by lease generation |
| Ordered Shot missing/duplicate | Fail before Composite |
| Input Asset/lineage mismatch | Fail before Composite; no fallback |
| Crash before Composite | Same Job may safely requeue after evidence check |
| Crash after Composite starts | Reconciliation required; no blind rerender |
| Existing verified output after restart | Continue materialization without rerender |
| Canonical object replay | Verify existing content hash; no overwrite |
| Asset creation replay | Return one existing Asset lineage |
| Completed Job replay | Existing Asset returned |
| Output duration/audio mismatch | No canonical Asset; definitive failure evidence |
| Cross-Tenant snapshot/Asset | Hidden/denied; no information leak |
| Architecture test adapters | Render/FFmpeg/Provider/Credit/Billing calls all zero |

## 16. Implementation gates and rollback

Before implementation, require separate approval for:

1. additive Render Request/Job/intent/stage/lineage schema and default-deny RLS;
2. snapshot resolver and idempotent admission with fake adapters;
3. sandboxed Composite/FFmpeg adapter, resource limits and temporary-file cleanup;
4. durable Worker lease/recovery and stage evidence;
5. canonical output validation/storage/Asset transaction;
6. render pricing, Credits/refunds and production observability;
7. deployment, preflight and any real Render smoke.

Rollback disables Render admission and Worker ownership. It preserves snapshots, requests, Jobs, stage evidence and Assets read-only. It does not delete or rewrite Timeline, Draft, replacement, Job, Credit or Asset history and does not attempt an automatic refund.

## 17. Candidate safety statement

| Surface | Changed by this Candidate |
| --- | --- |
| Design document | Yes |
| Architecture validation test | Yes |
| Frontend runtime | No |
| Backend/runtime | No |
| Database migration/schema | No |
| Render Job/Worker | No |
| Full Video Render/Composite | No |
| FFmpeg | No |
| Provider/Provider Status | No |
| Credits/refunds/ledger | No |
| Billing/Stripe/Membership | No |
| Production | No |

Final classification:

```text
RENDER_JOB_CONTRACT_READY=YES
WORKER_BOUNDARY_READY=YES
ASSET_MATERIALIZATION_READY=YES
IDEMPOTENCY_READY=YES
PRODUCTION_CHANGE=NO
```
