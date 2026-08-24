# Remake Phase R2 — Shot Edit Persistence & Generation Boundary Contract v1

Date: 2026-08-24

Status: `DESIGN_ONLY_NOT_PRODUCTION`

Depends on:

- Remake canonical analysis and storyboard projection
- Remake Phase R1 Shot Timeline Workspace
- Existing durable Video Generation Job, Credit and Provider execution contracts

This document defines a future persistence and authorization boundary between an immutable AI analysis result, a user-edited Shot Draft, and an explicitly confirmed generation request. It creates no schema, route, Job, Provider request, Outbox row, Credit transaction, Billing mutation, deployment or production change.

## 1. Contract decisions

1. The canonical AI analysis and its Original Shots are immutable evidence. Editing never updates, replaces or annotates the VLM result row or canonical storyboard payload.
2. `v1 original` is a read-only server projection derived from one canonical analysis version.
3. `v2 user edit` is a separate Shot Draft that may change only `description` and `prompt` in this contract.
4. Shot timing, keyframes, source Asset lineage, model analysis evidence and ownership remain read-only.
5. A saved draft is not consent to generate. Saving, autosaving, previewing, refreshing or selecting a Shot has zero generation and financial authority.
6. Confirmation creates an immutable confirmation receipt; it does not call a Provider or debit Credits.
7. A future generation endpoint may accept only an active confirmation receipt bound to the exact Draft revision and Original content hash.
8. The user must perform a separate explicit Generate action after confirmation. Browser state, a hidden button, an edited textarea or a Draft ID alone cannot authorize generation.
9. Generation continues through the existing Backend admission, pricing, Job/Credit transaction, metadata-only Outbox, Worker and Provider pipeline. R2 creates no direct Provider path.
10. Every write contract is authenticated, server-scoped, idempotent and optimistic-concurrency protected.

## 2. Scope and non-goals

### In scope

- Immutable Original Shot projection
- User Shot Draft persistence proposal
- `v1 original -> v2 user edit` version semantics
- Original content hashing and drift detection
- Explicit confirmation receipt
- Future generation request boundary
- Idempotency, concurrency, authorization, audit and Credit protection
- Frontend state transition proposal

### Out of scope

- Database migration or production schema
- Backend route implementation
- Frontend persistence implementation
- Video Generation execution
- Provider or Provider Status call
- Job, Operation, Attempt or Outbox creation
- Credit reservation, consumption or refund
- Pricing, Billing, Stripe or Membership changes
- Editing Shot time ranges, keyframes, model, resolution, duration, ratio, audio or references
- Modifying the Original VLM response or canonical analysis

## 3. Authority and identity boundary

The Backend resolves every identity from authenticated server evidence:

```text
Authenticated actor
  -> active Tenant authority
  -> owned/authorized canonical Remake analysis
  -> canonical Storyboard reference
  -> canonical Shot reference
  -> optional User Draft
  -> optional Confirmation Receipt
```

The Browser may send opaque public references returned by the Backend. It may not send or override `tenantId`, `userId`, canonical analysis ownership, source Asset ownership, Provider identity, Credit account, Original content, Original hash or version authority.

A missing, guessed, cross-user, cross-Tenant, deleted, failed, fallback, non-canonical or ambiguous analysis/Shot reference returns hidden-resource `404`. An authenticated actor without an allowed action receives `403`. Neither response discloses another user's storyboard existence.

## 4. Original AI Storyboard contract (`v1 original`)

### 4.1 Safe Original Shot projection

The server reads the canonical analysis and projects only:

```ts
type OriginalRemakeShotV1 = {
  contentVersion: 1;
  storyboardRef: string;       // opaque public reference
  shotRef: string;             // opaque, stable within the storyboard
  shotNumber: number;
  startTime: number;
  endTime: number;
  description: string;
  prompt: string;
  keyframes: Array<{
    assetRef: string;           // owned canonical Asset reference
    time: number;
    previewUrl?: string;        // authorized, short-lived delivery only
  }>;
  originalContentHash: string;
  analysisVersion: string;
};
```

This projection must never include raw VLM response, Provider payload, Provider tracking, signed storage credential, internal database ID, prompt-system instructions or internal analysis metadata.

### 4.2 Immutability

- No `PATCH` or `DELETE` route exists for an Original Shot.
- Original `description`, `prompt`, timing and keyframe lineage cannot be overwritten by a Draft.
- A new analysis creates a new canonical analysis/storyboard lineage; it does not revise the old Original in place.
- Revocation/deletion of source authority makes dependent Drafts unavailable or stale. It never rewrites Original evidence.
- Audit entries refer to opaque refs and safe hashes; they do not duplicate raw analysis content.

### 4.3 Original content hash

`originalContentHash` is generated by the Backend, never accepted from the Browser as authority.

Hash input uses deterministic canonical JSON over:

```text
hashContractVersion
analysisVersion
storyboardRef
shotRef
shotNumber
startTime
endTime
description
prompt
ordered canonical keyframe assetRef + time pairs
```

The proposed algorithm is `SHA-256`, encoded as lowercase hex, with `hashContractVersion=remake-original-shot-v1`. Numeric time values use the canonical server serialization. Array order is explicit. Unknown fields are excluded rather than serialized opportunistically.

If the freshly recomputed hash differs from the Draft-bound hash, save/confirm/generate fails with `ORIGINAL_CONTENT_CHANGED`. The system never silently rebases, repairs or updates the Draft.

## 5. User Shot Draft contract (`v2 user edit`)

### 5.1 Persisted shape

```ts
type RemakeShotDraftV2 = {
  draftRef: string;             // server-generated opaque reference
  contentVersion: 2;
  revision: number;             // starts at 1; optimistic concurrency token
  storyboardRef: string;
  shotRef: string;
  originalContentHash: string;  // copied from verified server Original
  editedDescription: string;
  editedPrompt: string;
  status: "DRAFT" | "CONFIRMED" | "SUPERSEDED" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
  allowedActions: Array<"EDIT" | "CONFIRM" | "ARCHIVE" | "REQUEST_GENERATION">;
};
```

The persisted server row additionally contains server-resolved actor/Tenant ownership and audit timestamps. Those internal fields are not part of the ordinary Browser projection.

### 5.2 Editable fields

Only these fields are editable in R2:

- `editedDescription`
- `editedPrompt`

Both must be strings, normalized for line endings, bounded by approved character limits and validated against the existing content-safety boundary. Empty values require an explicit product decision; v1 recommends rejecting blank `editedPrompt` and allowing blank `editedDescription` only if the Original description was also blank.

The Browser cannot edit or submit authoritative values for timing, keyframes, Original hash, ownership, Tenant, analysis version, model, duration, resolution, ratio, audio, references, pricing or Credit account.

### 5.3 Version semantics

- `contentVersion=1` means the immutable Original Shot contract.
- `contentVersion=2` means the user-edit Draft contract.
- Repeated Draft edits increment `revision`; they do not create `contentVersion=3`.
- A confirmed revision is immutable. Further editing creates a new Draft revision/lineage and supersedes the prior confirmation for future requests.
- Historical confirmed receipts remain audit evidence but cannot authorize a different Draft revision.

### 5.4 Data-model proposal

This is a design proposal, not executable SQL.

`remake_shot_drafts`:

| Field | Contract |
| --- | --- |
| `id uuid primary key` | Internal identity; never displayed |
| `public_ref text unique not null` | Opaque Browser reference |
| `tenant_id`, `user_id` | Server-resolved ownership; immutable |
| `analysis_id`, `storyboard_ref`, `shot_ref` | Verified Original lineage; immutable |
| `original_content_hash text not null` | Verified immutable binding |
| `content_version smallint not null` | Fixed `2` |
| `revision bigint not null` | Optimistic version |
| `edited_description text not null` | User Draft content |
| `edited_prompt text not null` | User Draft content |
| `status text not null` | Draft lifecycle |
| `created_at`, `created_by`, `updated_at`, `updated_by` | Audit fields |

Required constraints include unique active Draft lineage per `(tenant_id, user_id, analysis_id, shot_ref)`, immutable lineage/hash/content-version fields and same-Tenant foreign-key enforcement. RLS is default deny; runtime writes use a narrowly scoped server transaction after authentication and authorization.

## 6. Persistence API proposal

No route in this section is implemented by this Candidate.

### 6.1 Read Original and Draft

`GET /api/remake/storyboards/:storyboardRef/shots/:shotRef/editor`

Returns the safe `OriginalRemakeShotV1`, optional current `RemakeShotDraftV2`, server-projected `allowedActions`, and an ETag/revision. It never returns raw VLM or Provider data.

### 6.2 Create Draft

`POST /api/remake/storyboards/:storyboardRef/shots/:shotRef/drafts`

Request:

```json
{
  "editedDescription": "User-edited description",
  "editedPrompt": "User-edited prompt"
}
```

Headers require `Idempotency-Key`. The Backend resolves the Original, computes the hash, creates `contentVersion=2`, `revision=1`, and returns the safe Draft projection. The Browser cannot provide `originalContentHash` as authority.

### 6.3 Update Draft

`PATCH /api/remake/shot-drafts/:draftRef`

Request contains only editable fields and `expectedRevision`. Same idempotency key + same normalized payload returns the original receipt. Same key + different payload returns `IDEMPOTENCY_CONFLICT`. Stale revision returns `DRAFT_VERSION_CONFLICT`; no merge is attempted.

### 6.4 Confirm Draft

`POST /api/remake/shot-drafts/:draftRef/confirm`

Request contains `expectedRevision` and an explicit confirmation intent. The server re-reads the Original, recomputes its hash, checks Draft ownership/status and atomically writes one immutable confirmation receipt.

Confirmation response:

```ts
type RemakeShotConfirmationReceipt = {
  confirmationRef: string;
  draftRef: string;
  draftRevision: number;
  originalContentHash: string;
  confirmedAt: string;
  expiresAt: string;
  availableActions: Array<"REQUEST_GENERATION">;
};
```

The receipt is server-signed or database-authoritative, short-lived for generation authorization, single-scope and bound to one actor, Tenant, storyboard, Shot, Draft revision and Original hash. It contains no Provider or Credit authority.

## 7. Generation boundary

### 7.1 Required state sequence

```text
ORIGINAL_V1_READ_ONLY
  -> USER_DRAFT_V2
  -> USER_DRAFT_V2_CONFIRMED
  -> explicit user Generate action
  -> GENERATION_REQUEST_ADMITTED
  -> existing Job/Credit/Outbox/Worker/Provider pipeline
```

Forbidden transitions:

- Original load -> generation
- Shot selection -> generation
- Draft create/update/autosave -> generation
- Confirmation UI render -> generation
- Browser-only local state -> generation
- Expired, superseded, archived or hash-mismatched confirmation -> generation

### 7.2 Future generation request

`POST /api/video/generate` remains the generation authority. A future Remake request extension may carry only:

```json
{
  "source": "remake_shot_draft_v2",
  "confirmationRef": "opaque-confirmation-reference",
  "clientRequestId": "client-idempotency-key"
}
```

The Backend resolves all generation content from the confirmed Draft and fresh Original. It does not trust Browser-submitted edited prompt, description, Original hash, timing, keyframes, model, price or Credit account in the generation call.

Before Job creation it must verify:

1. authenticated actor and active Tenant authority;
2. active canonical analysis/Storyboard/Shot ownership;
3. Original hash still matches;
4. Draft revision/status matches the receipt;
5. confirmation is valid, unexpired and unused for a conflicting request;
6. explicit model capability and tuple admission;
7. current production pricing resolves;
8. client idempotency has no conflicting prior request.

Only after every check passes may the existing atomic Job/Credit transaction create one Generation Job and consume Credits exactly once. Provider execution remains asynchronous through the existing metadata-only Outbox. No route in this contract calls a Provider directly.

## 8. Credit and side-effect protection

| Action | Job | Outbox | Provider | Credit consume/refund | Billing |
| --- | ---: | ---: | ---: | ---: | ---: |
| Read Original/editor | 0 | 0 | 0 | 0 | 0 |
| Create/update/autosave Draft | 0 | 0 | 0 | 0 | 0 |
| Confirm Draft | 0 | 0 | 0 | 0 | 0 |
| Quote/preview future generation | 0 | 0 | 0 | 0 | 0 |
| Admitted explicit generation request | Existing atomic contract only | Existing metadata-only contract | Worker only | Exactly once after admission | Unchanged |

Protection rules:

- Draft APIs cannot import or call generation, Provider, Credit or Billing services.
- Confirmation cannot reserve, hold, debit or refund Credits.
- A frontend double click reuses the same `clientRequestId`; it cannot create a second Job or debit.
- If pricing is missing, confirmation is invalid, Original hash changed or admission fails, rejection occurs before Job/Credit writes.
- Ambiguous generation outcome uses the existing durable replay/UNCERTAIN contract; it never causes Browser resubmit or a second debit.
- Draft deletion/archive never refunds Credits because Draft operations never consume Credits.

## 9. Frontend state contract

R1 local textarea state becomes a future R2 client state machine:

| State | UI | Allowed network action |
| --- | --- | --- |
| `ORIGINAL` | Canonical timing/keyframes/content | Create Draft |
| `DIRTY_LOCAL` | Unsaved description/prompt | Explicit Save or approved debounced save; never Generate |
| `SAVING` | Disable conflicting edits | One idempotent Draft write |
| `SAVED` | Server Draft revision visible | Edit, archive or confirm |
| `CONFIRMING` | Explicit confirmation dialog | One confirm request |
| `CONFIRMED` | Immutable confirmed revision summary | Separate explicit Generate action |
| `STALE` | Original hash/revision changed | Block confirm/generate; reload safely |
| `CONFLICT` | Revision/idempotency conflict | Block automatic merge and generation |
| `GENERATION_REQUESTING` | Existing generation admission UX | One idempotent request only |

The confirmation dialog must show the selected Shot, edited description/prompt, read-only time range and estimated/current pricing projection. Closing the dialog has no effect. Keyboard Enter inside a textarea cannot confirm or generate. Refresh reloads the authoritative Draft/receipt; localStorage is not authority.

## 10. Error contract

Safe error codes:

| Code | Meaning | Side effect |
| --- | --- | --- |
| `ORIGINAL_SHOT_NOT_FOUND` | Hidden or unavailable canonical Shot | None |
| `ORIGINAL_CONTENT_CHANGED` | Fresh Original hash differs | None; Draft becomes stale |
| `DRAFT_VERSION_CONFLICT` | `expectedRevision` is stale | None |
| `DRAFT_ALREADY_CONFIRMED` | Confirmation replay of same revision | Return existing safe receipt |
| `DRAFT_CONFIRMATION_CONFLICT` | Different confirmation intent/revision | None |
| `CONFIRMATION_EXPIRED` | Receipt is no longer eligible | Pre-Job reject |
| `CONFIRMATION_SCOPE_MISMATCH` | Actor/Tenant/Shot/Draft mismatch | Pre-Job hidden/denied response |
| `IDEMPOTENCY_CONFLICT` | Same key, different normalized request | None |
| `GENERATION_ADMISSION_REJECTED` | Capability/pricing/tuple rejection | Pre-Job and pre-Credit |

Errors never include raw VLM output, Provider response, storage URL, internal ID, secret, Credit ledger payload or another user's identity.

## 11. Audit and privacy

Proposed safe audit events:

- `remake_shot_draft_created`
- `remake_shot_draft_updated`
- `remake_shot_draft_confirmed`
- `remake_shot_draft_archived`
- `remake_generation_requested`

Audit stores event type, safe opaque Draft/Shot references, content/revision numbers, Original hash prefix or full server-safe hash, result category and timestamp. It must not store raw prompt/description, raw VLM output, Provider payload, keyframe URL, secret, credential or user email. Content history belongs in the access-controlled Draft store, not the general audit stream.

## 12. Architecture validation matrix

| Scenario | Expected result |
| --- | --- |
| Load Original | `contentVersion=1`; no writes |
| Save edited description/prompt | Separate `contentVersion=2` Draft; Original unchanged |
| Save same idempotency key/payload | Same Draft receipt |
| Save same key/different payload | `IDEMPOTENCY_CONFLICT` |
| Update stale revision | `DRAFT_VERSION_CONFLICT`; no overwrite |
| Confirm valid current Draft | One immutable confirmation receipt; no Job/Credit/Provider |
| Confirm same revision again | Existing receipt returned |
| Original hash drift | `ORIGINAL_CONTENT_CHANGED`; confirmation/generation blocked |
| Generate without confirmation | Pre-Job reject |
| Generate with expired/tampered/wrong-scope receipt | Pre-Job reject |
| Generate with valid receipt fixture | Eligible for existing admission only; no Provider call in contract tests |
| Double-click future Generate | One idempotent Job/Credit transaction |
| Cross-user or cross-Tenant reference | Hidden/denied, no information leak |
| Raw VLM/Provider/internal metadata | Never projected or audited |

Required future implementation tests must spy on Job, Outbox, Provider, Credit and Billing adapters for every Draft/read/confirm case and assert zero calls.

## 13. Phased implementation and rollback

1. Add additive Draft/confirmation schema and RLS in a separately approved Candidate; do not apply to production.
2. Implement read/create/update/confirm Backend APIs with service-level zero-side-effect tests.
3. Replace R1 local-only editor state with server Draft projections behind a default-off flag.
4. Run read/save/confirm certification with generation disabled and verify Job/Outbox/Provider/Credit deltas remain zero.
5. Separately approve the confirmed-Draft extension to existing `/api/video/generate`.

Rollback disables Draft persistence and generation-receipt admission. It preserves Original analysis, Drafts, confirmations and audit history read-only. It never deletes or rewrites canonical analysis and never converts a Draft into Original content.

## 14. Candidate safety statement

| Surface | Changed by this Candidate |
| --- | --- |
| Design document | Yes |
| Architecture validation test | Yes |
| Frontend runtime | No |
| Backend API/runtime | No |
| Database schema/migration | No |
| Video Generate/Job/Outbox | No |
| Provider/Provider Status | No |
| Credits/refunds/ledger | No |
| Billing/Stripe/Membership | No |
| Production | No |

Final classification:

```text
SHOT_EDIT_CONTRACT_READY=YES
ORIGINAL_ANALYSIS_IMMUTABLE=YES
GENERATION_BOUNDARY_READY=YES
CREDIT_PROTECTION_READY=YES
PRODUCTION_CHANGE=NO
```
