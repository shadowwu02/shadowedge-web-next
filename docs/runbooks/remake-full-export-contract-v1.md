# Remake Phase R5 — Full Remake Export Contract v1

Date: 2026-08-24

Status: `DESIGN_ONLY_NOT_PRODUCTION`

Depends on:

- R1 canonical Storyboard Timeline
- R2 immutable Original Shot and versioned User Draft contract
- R3 immutable Single Shot Generation Request contract
- R4 generated replacement projection and canonical Asset lineage
- Existing Job, idempotency, Credit ledger and canonical media Asset contracts

This document defines the future authority boundary for exporting a complete Remake Timeline. It does not implement a route, schema, renderer, FFmpeg process, Provider request, Job, Credit transaction, Billing change, deployment or production behavior.

## 1. Contract decisions

1. A Full Remake Export uses one server-created immutable `RemakeExportSnapshotV1`; a renderer never reads live Timeline, Draft, React or localStorage state.
2. The ordered Shot list is complete and explicit. Each visual selection resolves to either a canonical `v1 original` source range or a READY canonical `v3 generated` replacement Asset.
3. `v2 edited` content is version/hash evidence only. It is not renderable media and cannot silently replace a visual Asset.
4. Every selected Asset and source range is ownership-checked and frozen into the snapshot before render admission.
5. Audio is explicit per Shot: `original_audio`, `generated_audio` or `mute`. Missing or incompatible audio fails closed; there is no automatic audio substitution.
6. Snapshot creation and validation have zero Render Job, FFmpeg, Provider, Credit and Billing authority.
7. A future explicit Render confirmation must pass current render capability, pricing and Credit checks before entering one atomic Render Job/Credit transaction.
8. The same snapshot and render intent resolve to one Render Job. Replay, restart or Browser double-click cannot create another Job, composite or debit.
9. The final Asset lineage binds the immutable snapshot, Render Job and every ordered input selection.
10. R5 does not redesign Billing, alter the Video Generation pipeline, or authorize Full Video Render.

## 2. Scope and non-goals

### In scope

- Immutable Timeline export snapshot
- Ordered Shot and selected visual Asset contract
- Original/replacement selection rules
- Duration map and exact source-range binding
- Per-Shot audio policy
- Future Render Job and composite boundary
- Asset/Job lineage, idempotency and Credit protection
- Fail-closed validation, audit, privacy and rollback design

### Out of scope

- Full Video Render or Timeline Composite execution
- FFmpeg command construction or execution
- Provider Generate or Provider Status calls
- New video generation requests
- Production routes, database migration or deployment
- Credit consume/refund or Billing/Stripe/Membership change
- Transition effects, color grading, captions, music, voice synthesis or audio mastering
- Live collaborative Timeline editing
- Changing v1 canonical analysis, v2 Drafts or v3 replacement Assets

## 3. Required flow

```text
Canonical Remake Timeline
  (v1 Original / v2 Edited evidence / v3 Generated replacement)
  -> authenticated Export selection
  -> server revalidation of Timeline + Asset lineage
  -> immutable RemakeExportSnapshotV1
  -> explicit Render confirmation
  -> render capability + pricing + Credit admission
  -> one atomic Render Job/Credit receipt
  -> future Composite worker
  -> canonical Final Asset
```

Snapshot creation stops before the explicit Render confirmation boundary. Nothing in snapshot creation may enqueue a Render Job, start FFmpeg, call a Provider or consume Credits.

## 4. Browser command and server authority

The Browser may request an export snapshot with:

```ts
type CreateRemakeExportSnapshotCommand = {
  timelineRef: string;
  expectedTimelineVersion: number;
  orderedSelections: Array<{
    shotRef: string;
    visualSource: "original_v1" | "generated_v3";
    replacementRef?: string;
    audioSource: "original_audio" | "generated_audio" | "mute";
  }>;
  clientRequestId: string;
};
```

These are selection requests, not authority. The Backend resolves authentication, Tenant, ownership, canonical Timeline version, Shot order, source ranges, Draft revisions, replacement Job/Asset lineage, duration metadata, audio metadata and Credit account. The Browser cannot submit Asset URLs, source file paths, internal IDs, Provider tracking, prompt content, render price or final Asset lineage.

The server rejects duplicate, missing, foreign, deleted, stale or non-canonical Shot/Asset references. It never repairs order, silently drops a Shot, substitutes an Asset, clamps a range or changes audio policy.

## 5. Immutable Remake Export Snapshot

### 5.1 Authoritative shape

```ts
type RemakeExportSnapshotV1 = {
  contractVersion: "remake-full-export-v1";
  snapshotRef: string;
  snapshotHash: string;
  timelineRef: string;
  timelineVersion: number;
  analysisVersion: string;
  orderedShots: Array<{
    ordinal: number;
    shotRef: string;
    originalContentHash: string;
    selectedVisual: {
      sourceVersion: "original_v1" | "generated_v3";
      assetRef: string;
      sourceRange: { startTime: number; endTime: number } | null;
      replacementRef: string | null;
      generationRequestRef: string | null;
      generationJobRef: string | null;
      assetLineageHash: string;
    };
    selectedDraft: {
      sourceVersion: "edited_v2";
      draftRef: string;
      draftRevision: number;
      draftContentHash: string;
    } | null;
    duration: {
      sourceDuration: number;
      outputDuration: number;
      timingContract: "exact";
    };
    audio: {
      source: "original_audio" | "generated_audio" | "mute";
      assetRef: string | null;
      sourceRange: { startTime: number; endTime: number } | null;
      audioLineageHash: string | null;
    };
  }>;
  durationMap: {
    totalDuration: number;
    shotDurations: Array<{ shotRef: string; ordinal: number; outputDuration: number }>;
  };
  audioPolicyVersion: "remake-export-audio-v1";
  createdAt: string;
  expiresAt: string;
};
```

`snapshotRef` is an opaque public reference. Internal row IDs, storage keys and credentials are never returned. `snapshotHash` is a server-generated SHA-256 hash over deterministic canonical JSON. It covers contract/timeline/analysis versions, the complete ordered Shot list, visual lineage, Draft evidence, exact duration map and audio policy.

### 5.2 Snapshot immutability

- A snapshot is append-only and cannot be patched.
- Any Timeline edit, selection change, reordered Shot, new Draft revision, new replacement or audio-policy change requires a new snapshot.
- Render admission rehashes the stored snapshot and rejects `EXPORT_SNAPSHOT_HASH_MISMATCH` before Job/Credit writes.
- A renderer receives the stored snapshot by immutable reference/hash. It does not query the current Timeline, current Draft or latest replacement.
- Expiry blocks new Render admission but does not rewrite or delete audit evidence.
- Revoked/deleted Asset authority blocks admission or recovery; it never causes automatic substitution.

## 6. Ordered Shot and visual selection contract

### 6.1 Complete order

`orderedShots` must contain every exportable canonical Timeline Shot exactly once, with contiguous `ordinal` values starting at 1. Missing, duplicated, foreign or reordered-without-version-change Shots fail before snapshot creation.

### 6.2 Original Shot selection

`original_v1` resolves to the owned canonical source video Asset plus the exact canonical `startTime/endTime` range. The range must be finite, increasing, within source duration and bound to the Original content hash. The source video is not copied or modified during snapshot creation.

### 6.3 Generated replacement selection

`generated_v3` is eligible only when R4 evidence verifies:

- replacement status is `completed`;
- canonical Asset status is READY;
- MIME type is `video/mp4`;
- original Shot reference matches;
- Generation Request and Generation Job lineage are present;
- Asset ownership/Tenant lineage match the Timeline;
- replacement evidence is immutable and non-conflicting.

`pending`, `processing`, `failed`, missing-Asset or ambiguous replacements are ineligible. The server does not fall back to `original_v1`; it returns `EXPORT_REPLACEMENT_NOT_READY` and requires a new explicit selection/snapshot request.

### 6.4 v1/v2/v3 preservation

- `v1 original` remains canonical and immutable.
- `v2 edited` remains a text Draft revision. Its hash may be included for traceability but it is never read by the renderer.
- `v3 generated` remains a separate generated media result with Job/Asset lineage.
- Export creates a new snapshot/final Asset lineage; it never overwrites any v1, v2 or v3 record.

## 7. Duration map contract

For each Shot, the Backend derives `sourceDuration` from verified media/range evidence and sets `outputDuration` explicitly. R5 v1 uses `timingContract="exact"`: no stretch, speed change, frame interpolation, loop, pad, trim expansion or duration normalization is allowed.

Rules:

1. Original output duration equals `endTime - startTime` using canonical server numeric serialization.
2. Generated replacement output duration equals verified canonical media duration and must pass the approved tolerance for its bound Shot request.
3. A generated duration incompatible with the Timeline timing returns `EXPORT_DURATION_MISMATCH`; it is not silently trimmed or stretched.
4. `totalDuration` equals the deterministic sum of ordered `outputDuration` values.
5. Render completion must verify final media duration against `totalDuration` using a separately approved tolerance. A mismatch blocks Final Asset readiness.

Future transition durations or retiming require a new contract version and are not implied by v1.

## 8. Audio policy contract

Audio is selected per Shot and frozen in the snapshot.

| Policy | Source | Eligibility | No-fallback behavior |
| --- | --- | --- | --- |
| `original_audio` | Canonical original source Asset and exact Shot range | Owned source has a verified audio stream | Missing/incompatible stream rejects snapshot |
| `generated_audio` | Selected READY `generated_v3` Asset | Visual source is `generated_v3` and verified audio metadata exists | Missing stream rejects snapshot; never substitutes original |
| `mute` | No audio Asset | Always explicit | Renderer produces no audio contribution for that Shot |

Additional rules:

- `generated_audio` cannot reference a different replacement than the selected visual.
- `original_audio` may accompany either original or generated visuals, but retains the Original Shot time range and lineage.
- The server validates stream presence, duration compatibility and Asset ownership before snapshot creation.
- Audio URL, waveform data and codec payload are not embedded in the snapshot projection.
- Gain, fades, mixing, sample-rate conversion and final codec settings require a separate render implementation contract. R5 authorizes none of them.
- There is no automatic `generated_audio -> original_audio -> mute` fallback chain.

## 9. Render boundary

No route in this section is implemented by R5.

### 9.1 Snapshot creation proposal

`POST /api/remake/timelines/:timelineRef/export-snapshots`

Requires authentication and `Idempotency-Key`. It validates the Browser selection against server authority, persists one immutable snapshot/receipt and returns a safe projection. It creates no Render Job and consumes no Credits.

### 9.2 Explicit Render confirmation proposal

`POST /api/remake/export-snapshots/:snapshotRef/render`

Request contains only an explicit confirmation and `clientRequestId`. Before writes, the server:

1. resolves actor/Tenant and snapshot ownership;
2. verifies snapshot status, expiry and hash;
3. revalidates all referenced Asset authority without replacing inputs;
4. resolves the exact render capability/version;
5. resolves current approved render pricing;
6. checks available Credits;
7. resolves client and semantic idempotency.

Only after every check passes may a future atomic transaction create one Render Job, one immutable pricing/Credit receipt and one metadata-only render intent. The Render worker receives only `snapshotRef + snapshotHash + renderContractVersion`, loads that immutable snapshot once and never reads live Timeline/Draft state.

### 9.3 Render state proposal

```text
SNAPSHOT_READY
  -> RENDER_ADMITTED
  -> QUEUED
  -> PROCESSING
  -> COMPLETED | FAILED | UNCERTAIN
```

`COMPLETED` requires verified composite output, duration/audio validation, canonical storage write and Final Asset creation. A process restart resumes from durable Job/intent evidence. `UNCERTAIN` never authorizes Browser resubmit or a second Render Job.

## 10. Composite and Final Asset lineage

The future compositor must process `orderedShots` exactly in snapshot order. It cannot drop, duplicate, reorder or replace a Shot. There is no fallback composite.

The Final Asset record must bind:

```ts
type RemakeExportAssetLineageV1 = {
  lineageVersion: "remake-export-lineage-v1";
  finalAssetRef: string;
  renderJobRef: string;
  snapshotRef: string;
  snapshotHash: string;
  renderContractVersion: string;
  orderedInputLineageHashes: string[];
  durationMapHash: string;
  audioPolicyHash: string;
};
```

Final Asset READY requires the lineage record, verified media metadata, expected duration/audio result and ownership/Tenant match. A URL alone is never sufficient. Original, Draft and replacement records remain unchanged after Final Asset creation.

## 11. Idempotency and replay

### 11.1 Snapshot identity

The semantic snapshot key is:

```text
Tenant + actor + timelineRef + timelineVersion + normalized ordered selections
  + durationMap + audio policy + contractVersion
```

- Same idempotency key + same semantic snapshot returns the original snapshot receipt.
- Different key + same semantic snapshot resolves the existing snapshot.
- Same key + different selection returns `EXPORT_SNAPSHOT_IDEMPOTENCY_CONFLICT`.
- New Timeline/Draft/replacement/audio selection produces a new snapshot identity.

### 11.2 Render identity

The semantic Render key is:

```text
snapshotHash + renderContractVersion + exact output contract
```

- Same render intent returns the existing Render Job/Credit receipt.
- Browser double-click, refresh, polling and worker restart never create a second Render Job or debit.
- A failed or UNCERTAIN Job follows the future approved durable recovery/refund contract; the Browser cannot retry by creating an unbound Job.
- A new render attempt, if product-approved later, requires an explicit retry receipt linked to the prior Job and must preserve exactly-once financial behavior.

## 12. Credit and financial boundary

R5 defines no production price and changes no ledger.

| Action | Render Job | Composite/FFmpeg | Provider | Credit delta | Billing delta |
| --- | ---: | ---: | ---: | ---: | ---: |
| Read Timeline/replacements | 0 | 0 | 0 | 0 | 0 |
| Create/validate snapshot | 0 | 0 | 0 | 0 | 0 |
| Quote future render | 0 | 0 | 0 | 0 | 0 |
| Capability/pricing/Credit reject | 0 | 0 | 0 | 0 | 0 |
| R5 architecture tests | 0 | 0 | 0 | 0 | 0 |
| Future admitted Render confirmation | One existing-style atomic receipt | Worker later | 0 unless separately approved | Exactly once under future approved pricing | Unchanged |

Required protections:

- Snapshot APIs cannot import Render, FFmpeg, Provider, Credit mutation or Billing services.
- Pricing must be explicitly approved for the exact render contract before Render Job/Credit writes.
- Missing pricing, invalid snapshot, stale Asset, insufficient Credits or idempotency conflict rejects pre-Job and pre-Credit.
- Snapshot expiry/revocation never triggers a refund because snapshot operations consume zero Credits.
- Render failure/refund semantics must be approved with the Render implementation; R5 does not invent or execute a refund.
- Credits cannot be inferred from Provider cost, asset duration or existing Video Generation charges.

## 13. Safe errors, audit and privacy

Safe error codes include:

- `EXPORT_TIMELINE_VERSION_CONFLICT`
- `EXPORT_SHOT_ORDER_INVALID`
- `EXPORT_ORIGINAL_ASSET_INVALID`
- `EXPORT_REPLACEMENT_NOT_READY`
- `EXPORT_ASSET_LINEAGE_MISMATCH`
- `EXPORT_DURATION_MISMATCH`
- `EXPORT_AUDIO_SOURCE_INVALID`
- `EXPORT_SNAPSHOT_HASH_MISMATCH`
- `EXPORT_SNAPSHOT_EXPIRED`
- `EXPORT_SNAPSHOT_IDEMPOTENCY_CONFLICT`
- `EXPORT_RENDER_PRICING_UNAVAILABLE`
- `EXPORT_RENDER_INSUFFICIENT_CREDITS`
- `EXPORT_RENDER_INTENT_CONFLICT`

Safe audit events:

- `remake_export_snapshot_created`
- `remake_export_snapshot_reused`
- `remake_export_snapshot_rejected`
- `remake_export_render_requested`
- `remake_export_render_job_bound`
- `remake_export_asset_ready`

Audit may store contract versions, opaque refs, hashes, counts, durations, audio policy categories, result categories and timestamps. It must not store raw VLM response, prompt/description content, media URL, storage key, Provider payload/tracking, FFmpeg command/output, secret, credential, email or raw Credit ledger payload.

## 14. Architecture validation matrix

| Scenario | Expected result |
| --- | --- |
| All-original Timeline | Immutable snapshot contains every v1 Shot in canonical order |
| Mixed original/replacement Timeline | Exact v1/v3 selection and lineage frozen |
| Replacement pending/processing/failed | `EXPORT_REPLACEMENT_NOT_READY`; no original fallback |
| READY replacement with wrong Shot/Tenant | `EXPORT_ASSET_LINEAGE_MISMATCH` |
| Timeline edited after snapshot | Existing snapshot unchanged; new export requires new snapshot |
| Draft edited after snapshot | Existing snapshot/hash unchanged; renderer never reads Draft |
| Render worker restart | Same snapshot/hash and Job; no live Timeline read |
| Missing/duplicate/reordered Shot | Snapshot reject; no silent slice/reorder |
| Duration mismatch | Snapshot/render admission reject; no trim/stretch |
| `original_audio` valid | Original Asset/range lineage frozen |
| `generated_audio` valid | Matching replacement audio lineage frozen |
| Requested audio missing | Reject; no audio fallback |
| `mute` | Explicit null audio lineage for that Shot |
| Same snapshot intent replay | Same snapshot receipt |
| Same Render intent replay | Same Render Job/Credit receipt |
| Same key, changed selection | Idempotency conflict; no writes |
| Pricing unavailable or Credits insufficient | Pre-Job/pre-Credit reject |
| Raw URL/payload/secret in projection or audit | Rejected by privacy contract |

Future implementation tests must use fake repositories, renderer, FFmpeg, Provider, Credit and Billing adapters. R5 architecture tests assert zero calls to every side-effect adapter.

## 15. Phased implementation and rollback

1. Separately approve additive snapshot/render receipt schema and default-deny RLS; do not apply it in R5.
2. Implement snapshot builder/hash/idempotency with fake repositories and no renderer imports.
3. Add a read-only Export Preview UI behind a default-off flag; no Render action.
4. Certify snapshot order, Asset lineage, duration and audio policies with fixtures.
5. Separately design and approve the compositor/FFmpeg sandbox, resource limits, durable Render worker and output validation.
6. Separately approve render pricing, Credit/refund behavior, production migration/deployment and any real render smoke.

Rollback disables snapshot and Render admission flags. Existing snapshots/receipts remain read-only audit evidence. Rollback never deletes or rewrites canonical analysis, Drafts, replacement Assets, Jobs, Credits or Final Assets, and the Remake Timeline returns to the R4 experience.

## 16. Candidate safety statement

| Surface | Changed by this Candidate |
| --- | --- |
| Design document | Yes |
| Architecture validation test | Yes |
| Frontend runtime | No |
| Backend/runtime | No |
| Database migration/schema | No |
| Full Video Render/Composite | No |
| FFmpeg | No |
| Provider/Provider Status | No |
| Video Generate/Job/Outbox | No |
| Credits/refunds/ledger | No |
| Billing/Stripe/Membership | No |
| Production | No |

Final classification:

```text
FULL_REMAKE_EXPORT_CONTRACT_READY=YES
TIMELINE_SNAPSHOT_READY=YES
RENDER_BOUNDARY_READY=YES
AUDIO_POLICY_READY=YES
CREDIT_BOUNDARY_READY=YES
PRODUCTION_CHANGE=NO
```
