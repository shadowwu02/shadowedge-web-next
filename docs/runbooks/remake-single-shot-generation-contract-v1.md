# Remake Phase R3 — Single Shot Generation Contract v1

Date: 2026-08-24

Status: `DESIGN_ONLY_NOT_PRODUCTION`

Depends on:

- Remake Phase R1 Storyboard Timeline Workspace
- Remake Phase R2 Shot Edit Persistence & Generation Boundary Contract v1
- Existing Video Catalog, admission, pricing, Generation Job, Credit, metadata-only Outbox, Worker and Provider contracts

This document defines how one confirmed Remake Shot Draft may become one immutable generation request. It does not implement or execute Video Generate, call a Provider, create a Job/Operation/Outbox row, consume or refund Credits, modify Billing, change the Video Generate pipeline, deploy code or change production.

## 1. Contract decisions

1. The source is one canonical Shot and one confirmed User Edited Shot Draft revision.
2. The Browser sends an explicit generation command; the Backend creates the authoritative `ShotGenerationRequestV1`.
3. The Backend resolves and freezes the prompt snapshot from the confirmed Draft. Browser prompt text is never generation authority.
4. The immutable request captures the exact model-independent generation intent: Shot reference, Draft revision, prompt/description snapshot, duration, model, resolution, aspect ratio and audio.
5. Once the request is admitted, Job/Worker/Provider execution reads only the immutable generation snapshot attached to the request/Job. It must not re-read the mutable Draft.
6. Same Shot revision plus the same normalized generation intent resolves to the same request and the same existing Job/Credit outcome.
7. A changed prompt, Draft revision, model, duration, resolution, ratio or audio flag is a different intent and requires a new explicit confirmation/generation action as defined below.
8. Authentication, confirmation validation, Catalog admission, pricing resolution and Credit availability all occur before Job creation and Credit consumption.
9. After admission, the unchanged existing atomic Job/Credit ledger and metadata-only Outbox pipeline remains authoritative.
10. This contract adds no direct, synchronous, fallback or alternate Provider path.

## 2. Scope and non-goals

### In scope

- Browser single-Shot Generate command
- Server-authoritative immutable generation request
- Prompt and description snapshot
- Exact generation tuple snapshot
- Semantic idempotency and client idempotency
- Admission, pricing and Credit boundary
- Mapping to the existing Video Generation pipeline
- Replay, conflict, audit and privacy behavior

### Out of scope

- Runtime or database implementation
- Production migration or deployment
- Provider Submit or Status call
- Actual Video Generate
- Credit consume, refund, hold or balance mutation
- Billing, Stripe, Plan, Membership or pricing changes
- Batch/Generate All Shots
- Editing the canonical Shot or confirmed Draft
- Changing the existing Video Generation Job/Worker/Provider state machine

## 3. Required flow

```text
Canonical Shot (immutable)
  -> User Edited Shot Draft (versioned)
  -> Generate Confirmation (immutable receipt)
  -> explicit Single Shot Generate command
  -> server ShotGenerationRequest snapshot
  -> authentication + confirmation + Catalog admission + pricing + Credit check
  -> existing atomic Video Generation Job/Credit transaction
  -> existing metadata-only Outbox
  -> existing Worker
  -> existing Provider adapter
```

No earlier step may skip directly to Job, Credit, Outbox or Provider execution.

## 4. Browser command contract

The future Frontend sends one explicit command only after the user reviews the selected Shot, confirmed prompt, duration, model, resolution, ratio, audio state and displayed pricing.

Proposed endpoint:

`POST /api/video/generate`

Proposed Remake command extension:

```ts
type RemakeSingleShotGenerateCommand = {
  source: "remake_single_shot_v1";
  confirmationRef: string;
  clientRequestId: string;
  intent: {
    model: string;
    duration: number;
    resolution: string;
    aspectRatio: string;
    audio: boolean;
  };
};
```

The Browser does not send authoritative values for `shotRef`, `draftRef`, `draftRevision`, `promptSnapshot`, `descriptionSnapshot`, Original content hash, actor, Tenant, price, Credit account, Provider model or Provider payload. The Backend derives them from the confirmation receipt, confirmed Draft, canonical Original and public Catalog.

The command requires the existing authenticated request boundary and `Idempotency-Key`. `clientRequestId` is a safe client-generated request identifier and must match the idempotency contract; it is not authority.

## 5. Authoritative Shot Generation Request

### 5.1 Immutable request shape

After validating the command and before binding a Job, the Backend creates or resolves:

```ts
type ShotGenerationRequestV1 = {
  requestRef: string;
  requestVersion: 1;
  source: "remake_single_shot_v1";

  shotRef: string;
  draftRef: string;
  draftRevision: number;
  confirmationRef: string;
  originalContentHash: string;

  promptSnapshot: string;
  descriptionSnapshot: string;
  promptSnapshotHash: string;

  duration: number;
  model: string;
  resolution: string;
  aspectRatio: string;
  audio: boolean;

  generationIntentHash: string;
  status: "CREATED" | "ADMITTED" | "REJECTED" | "JOB_BOUND";
  generationJobRef?: string;
  createdAt: string;
};
```

The persisted record additionally binds the authenticated actor, Tenant, pricing receipt and existing Job identity using server-only fields. Those internal identities are not returned in normal UI projections.

### 5.2 Required requested fields

| Field | Authority | Rule |
| --- | --- | --- |
| `shotRef` | Confirmation receipt + canonical Shot | Stable opaque reference; Browser cannot override |
| `draftRevision` | Confirmed Draft receipt | Must exactly match the confirmed immutable revision |
| `promptSnapshot` | Confirmed Draft | Required, non-empty and frozen before Job creation |
| `duration` | Browser intent, validated by public Catalog | Exact value; no round, clamp, fallback or normalization |
| `model` | Browser intent, resolved by Catalog | Public canonical model ID; no Provider alias from Browser |
| `resolution` | Browser intent, validated by Catalog | Exact supported resolution |
| `audio` | Browser intent, validated with model/duration/resolution | Exact boolean preserved to runtime params |
| `aspectRatio` | Browser intent, validated by Catalog | Exact supported ratio; part of intent identity |

The request cannot contain a URL-only reference, raw keyframe URL, Provider tracking ID, Provider payload, raw VLM response or storage credential.

### 5.3 Data-model proposal

This is a relational design, not executable SQL.

`remake_shot_generation_requests`:

| Column | Contract |
| --- | --- |
| `id uuid primary key` | Internal identity |
| `public_ref text unique not null` | Safe opaque request reference |
| `tenant_id`, `user_id` | Server-resolved immutable scope |
| `shot_ref`, `draft_id`, `draft_revision` | Immutable confirmed Draft binding |
| `confirmation_id` | Immutable confirmation receipt binding |
| `original_content_hash` | Freshly verified Original binding |
| `prompt_snapshot`, `description_snapshot` | Access-controlled immutable content |
| `prompt_snapshot_hash` | Deterministic snapshot evidence |
| `model`, `duration`, `resolution`, `aspect_ratio`, `audio` | Exact normalized generation tuple |
| `generation_intent_hash` | Semantic idempotency identity |
| `status`, `generation_job_id` | Request admission/Job binding state |
| `pricing_receipt_id` | Existing pricing decision reference; not a new pricing system |
| `created_at`, `created_by` | Immutable audit fields |

Required constraints:

- immutable request content after insert;
- unique `public_ref`;
- unique semantic request per `(tenant_id, user_id, shot_ref, draft_revision, generation_intent_hash)`;
- same-Tenant Draft, confirmation, canonical Shot and Job bindings;
- at most one `generation_job_id` binding per admitted request;
- default-deny RLS and no Browser direct table write.

## 6. Prompt snapshot contract

### 6.1 Snapshot creation

Inside one server transaction, the admission service:

1. locks/reads the confirmation receipt and confirmed Draft revision;
2. re-resolves the canonical Shot and verifies `originalContentHash`;
3. verifies the Draft is still `CONFIRMED` and the revision exactly matches;
4. applies only the approved deterministic text normalization contract;
5. copies `editedPrompt` into `promptSnapshot` and `editedDescription` into `descriptionSnapshot`;
6. computes `promptSnapshotHash` and `generationIntentHash`;
7. creates or resolves the immutable generation request.

The proposed prompt hash is SHA-256 over `snapshotContractVersion=remake-shot-prompt-v1`, normalized prompt bytes, description bytes, Shot reference and Draft revision. The full generation intent hash additionally includes model, exact duration, resolution, aspect ratio and audio.

### 6.2 No mutable Draft reads during generation

- After `ShotGenerationRequestV1` is created, capability/runtime serialization, Job metadata, Outbox payload and Worker input use the immutable snapshot.
- Worker execution must not query `remake_shot_drafts` for prompt or generation parameters.
- Provider serialization must not query the current Draft.
- Editing, archiving or superseding the Draft after request creation cannot alter an already admitted request or Job.
- Replay and Worker restart use the same persisted snapshot and hashes.
- If the immutable snapshot is missing or fails its hash check, execution fails closed before Provider Submit. It never falls back to the current Draft or Original prompt.

### 6.3 Snapshot privacy

The prompt/description snapshot is sensitive user content. It belongs only in the access-controlled generation request/Job content store already approved for generation input. General audit, logs, metrics, errors and Outbox metadata must contain safe hashes/categories rather than prompt text.

## 7. Generation intent and idempotency

### 7.1 Semantic intent identity

The normalized intent identity includes:

```text
intentContractVersion
tenant scope
actor scope
shotRef
draftRef
draftRevision
confirmation binding
originalContentHash
promptSnapshotHash
model
duration
resolution
aspectRatio
audio
```

`generationIntentHash` is a deterministic SHA-256 hash of that canonical structure.

Contract rule:

```text
same Shot revision + same normalized generation intent = same request
```

This rule is enforced even if a Browser repeats the command after timeout or refresh.

### 7.2 Client idempotency

- Same `Idempotency-Key`/`clientRequestId` plus the same intent returns the original request/Job receipt.
- Same key plus a different intent returns `IDEMPOTENCY_CONFLICT` before Job/Credit writes.
- A different key with the same semantic intent resolves the existing request due to the semantic unique constraint; it does not create another Job or debit.
- Same Shot and Draft revision with a different tuple is a different generation intent and requires a new explicit user confirmation of the changed generation summary before submission.
- A new Draft revision always produces a different intent identity, even when prompt text happens to match.

### 7.3 Exactly-once Job binding

The generation request and existing Job/Credit receipt are bound atomically using the current database transaction/lock/idempotency pattern. A request can bind to at most one Job. Replay returns that Job; it does not append another Outbox intent, Provider Attempt or Credit transaction.

## 8. Admission, pricing and Credit boundary

### 8.1 Required pre-Job order

Before any Generation Job or Credit write:

1. authenticate actor;
2. resolve active Tenant authority;
3. validate canonical Shot ownership and Original hash;
4. validate confirmed Draft revision and confirmation receipt;
5. create/resolve and hash the immutable snapshot;
6. validate model + duration + resolution + aspect ratio + audio through the public Video Catalog;
7. serialize runtime parameters without normalization/fallback and compare exact values;
8. resolve current production pricing for the exact tuple;
9. verify the existing Credit account has sufficient available Credits;
10. check client and semantic idempotency for conflict/existing receipt.

Any failure through step 10 rejects before Job, Operation, Outbox and Credit writes.

### 8.2 Existing ledger after admission

After all checks pass, the service enters the unchanged existing transaction that:

- creates one Generation Job/Operation;
- consumes the resolved Credits exactly once in the existing ledger;
- records the existing immutable pricing/Credit receipt;
- writes one metadata-only Outbox intent;
- returns the existing asynchronous acceptance response.

Worker/Provider execution occurs later through the existing pipeline. This contract neither changes ledger tables nor defines a new debit/refund mechanism.

### 8.3 Credit protection matrix

| Stage | Job delta | Outbox delta | Provider delta | Credit delta | Billing delta |
| --- | ---: | ---: | ---: | ---: | ---: |
| Read/edit/confirm Draft | 0 | 0 | 0 | 0 | 0 |
| Build/validate snapshot | 0 | 0 | 0 | 0 | 0 |
| Catalog/admission reject | 0 | 0 | 0 | 0 | 0 |
| Pricing missing | 0 | 0 | 0 | 0 | 0 |
| Insufficient Credits | 0 | 0 | 0 | 0 | 0 |
| Idempotency conflict | 0 | 0 | 0 | 0 | 0 |
| Admitted request | Existing atomic contract | One existing metadata-only intent | Worker later | Existing exactly-once consume | 0 |

Refund, failure, retry, replay and UNCERTAIN behavior remain exactly as defined by the existing Video Generation financial contract. The Browser must not infer or manually mutate a refund.

## 9. Existing Video Generation pipeline boundary

R3 adds a source adapter at admission only:

```text
ShotGenerationRequestV1 immutable snapshot
  -> existing canonical VideoGenerationRequest
  -> existing build/runtime parameter path
  -> existing Job/Credit transaction
  -> existing metadata-only Outbox
  -> existing Worker
  -> existing Provider adapter
```

The adapter maps:

- `promptSnapshot -> prompt`
- exact `model -> canonical public model ID`
- exact `duration -> duration`
- exact `resolution -> quality/resolution`
- exact `aspectRatio -> ratio`
- exact `audio -> generate_audio`
- safe Shot/Draft/request refs -> existing Job metadata lineage

It may not call the Provider, bypass admission, bypass pricing, bypass Credits, introduce synchronous Provider execution, add fallback/retry behavior or change public model capability.

## 10. State and error contract

### 10.1 Request states

| State | Meaning |
| --- | --- |
| `CREATED` | Immutable snapshot established; no Job/Credit yet |
| `ADMITTED` | Catalog/pricing/Credit checks passed and transaction is entering existing boundary |
| `JOB_BOUND` | Existing Job/Credit receipt committed exactly once |
| `REJECTED` | Pre-Job validation failed; no financial/provider side effect |

Provider lifecycle status is not duplicated here. After `JOB_BOUND`, the existing Job/Operation/Attempt states are authoritative.

### 10.2 Safe error codes

| Code | Category | Required behavior |
| --- | --- | --- |
| `SHOT_CONFIRMATION_REQUIRED` | Confirmation | Pre-Job reject |
| `SHOT_DRAFT_REVISION_MISMATCH` | Draft | Pre-Job reject; no auto-rebase |
| `SHOT_ORIGINAL_CONTENT_CHANGED` | Original | Pre-Job reject |
| `SHOT_PROMPT_SNAPSHOT_INVALID` | Snapshot | Pre-Job reject; no Draft fallback |
| `SHOT_GENERATION_INTENT_CONFLICT` | Idempotency | Return conflict; no second request |
| `VIDEO_CAPABILITY_REJECTED` | Catalog | Pre-Job reject; no clamp/fallback |
| `VIDEO_PRICING_UNAVAILABLE` | Pricing | Pre-Job reject |
| `INSUFFICIENT_CREDITS` | Credit check | Pre-Job reject; no debit |
| `SHOT_GENERATION_SNAPSHOT_MISSING` | Worker safety | Fail closed before Provider Submit |
| `SHOT_GENERATION_SNAPSHOT_HASH_MISMATCH` | Worker safety | Fail closed before Provider Submit |

Error responses and logs exclude prompt text, description, raw VLM result, Provider payload, signed URL, credentials, internal IDs and Credit ledger payload.

## 11. Audit and observability

Safe events:

- `remake_single_shot_request_created`
- `remake_single_shot_request_reused`
- `remake_single_shot_request_rejected`
- `remake_single_shot_job_bound`

Allowed audit/metric fields are request version, safe public refs, Draft revision, intent/snapshot hash, model capability category, duration, resolution, ratio, audio flag, admission result, pricing category, idempotency result and timestamps. Prompt/description content, VLM response, Provider payload and credentials are prohibited.

Metrics distinguish created, reused, conflict, pre-Job rejected and Job-bound requests without recording user identity or content.

## 12. Architecture validation matrix

| Scenario | Expected result |
| --- | --- |
| Valid confirmed Draft fixture | Immutable request includes Shot ref, Draft revision, prompt snapshot and exact tuple |
| Draft edited after request creation | Existing request/Job snapshot unchanged |
| Worker restart/replay | Same snapshot/hash used; no Draft read |
| Missing/tampered snapshot | Fail before Provider Submit |
| Same revision + same intent + same key | Same request and Job receipt |
| Same revision + same intent + different key | Same semantic request; no duplicate Job/Credit |
| Same key + different intent | Conflict before Job/Credit |
| New Draft revision | New intent; requires explicit confirmation |
| Unsupported model/duration/resolution/audio combination | Pre-Job Catalog reject |
| Duration serialized differently | Pre-Job exact-value reject; no normalization |
| Pricing missing | Pre-Job reject |
| Insufficient Credits | Pre-Job reject; no debit |
| Valid admitted fixture | Calls existing Job/Credit adapter once; Provider spy remains zero in contract test |
| Duplicate admitted fixture | Existing receipt; Job/Credit/Outbox deltas zero |
| Raw prompt/Provider/VLM data in audit | Rejected by privacy validation |

Future implementation tests must assert zero Provider calls for all admission and contract tests. Provider behavior is validated only in a separately authorized production smoke.

## 13. Phased implementation and rollback

1. Separately approve an additive immutable request schema and RLS Candidate; do not apply it in R3 design.
2. Implement snapshot/idempotency service with fake Job/Credit/Provider adapters and zero real side effects.
3. Implement the Remake source adapter into existing Video admission behind a default-off feature flag.
4. Validate exact tuple serialization and immutable snapshot replay with Provider disabled.
5. Separately authorize production migration, deployment, preflight and any single real generation smoke.

Rollback disables Remake single-Shot request admission and removes the source adapter from routing. It preserves Original, Draft, confirmation, request and existing Job/Credit history read-only. It does not delete, rewrite or refund data automatically and does not alter ordinary Video Generate behavior.

## 14. Candidate safety statement

| Surface | Changed by this Candidate |
| --- | --- |
| Design document | Yes |
| Architecture validation test | Yes |
| Frontend runtime | No |
| Backend/runtime adapter | No |
| Database migration/schema | No |
| Video Generate/Job/Outbox | No |
| Provider/Provider Status | No |
| Credits/refunds/ledger | No |
| Billing/Stripe/Membership | No |
| Production | No |

Final classification:

```text
SHOT_GENERATION_CONTRACT_READY=YES
PROMPT_SNAPSHOT_READY=YES
IDEMPOTENCY_READY=YES
CREDIT_BOUNDARY_READY=YES
PRODUCTION_CHANGE=NO
```
