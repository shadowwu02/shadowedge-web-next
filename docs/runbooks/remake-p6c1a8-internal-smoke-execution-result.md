# Remake P6-C1-A8 Internal Smoke Execution Result

Date: 2026-07-11

Frontend commit: `e19571ca7707eaf49e2ffc71e3afdf67ce9c4f1f`

Overall status: `NOT READY`

Execution status: `NOT EXECUTED`

## 1. Purpose

Prepare the execution record and final operator checklist for one future internal/admin smoke of the guarded Long Video Remake UX.

This phase records what is statically verified and what still requires operator evidence. It does not enable the feature flag, open a smoke window, call an API or provider, or approve public rollout.

## 2. Scope

Allowed future scope after all blockers are resolved:

- One isolated internal/admin test environment.
- One authenticated internal/admin account with trusted capability.
- One backend-allowlisted account.
- One approved safe long-video asset.
- One estimate request.
- One explicit confirmation.
- One analysis create request.
- Status polling for the returned job.
- One browser refresh for GET-only recovery.
- One accepted storyboard render.

Current scope remains documentation and read-only local verification only.

Not authorized:

- Public rollout.
- Production-wide feature enablement.
- Generate or selected-shot generation.
- Automatic retry or duplicate POST.
- Billing, credits, refund, or checkout changes.
- Provider/VLM diagnostics in the user interface.

## 3. Current Verified State

| Check | Result | Evidence |
| --- | --- | --- |
| Frontend commit | `PASS` | Local HEAD is `e19571ca7707eaf49e2ffc71e3afdf67ce9c4f1f`. |
| Integration pushed | `PASS` | Local branch matches `origin/main` for the reviewed implementation. |
| Feature default | `PASS` | `remakeFeatures.longVideoUxEnabled` is true only when `NEXT_PUBLIC_REMAKE_LONG_VIDEO_UX_ENABLED` strictly equals `true`; missing/default resolves false. |
| Trusted capability gate exists | `PASS` for code presence | Real UX requires `profile.canUseLongVideoRealAnalysis === true`. Actual test account capability is not yet verified. |
| Public rollout | `PASS` for unchanged state | No public flag enablement was performed in this phase. |
| Smoke execution | `NOT EXECUTED` | No API or provider call was made. |

## 4. Pre-Execution Verification

### 4.1 Feature Flag Enable Method

Verified implementation:

```text
NEXT_PUBLIC_REMAKE_LONG_VIDEO_UX_ENABLED
```

Behavior:

- Missing, empty, false, or unrecognized values keep the guarded UX disabled.
- Only strict `true` enables frontend discovery.
- The flag does not authorize the account.
- The backend guard remains authoritative.
- The source-code default remains false.

Required before smoke:

- [ ] Record the isolated test environment and URL.
- [ ] Name the feature flag owner.
- [ ] Record the current test-environment flag state.
- [ ] Confirm the public environment remains false.
- [ ] Approve a bounded test-only enable window.
- [ ] Confirm the owner can return the test flag to false immediately.
- [ ] Confirm no source-code or public environment change is required.

Current result: `NOT READY`

Blocker: No test environment, flag owner, or approved enable window is recorded.

### 4.2 Test Account Capability

Verified implementation:

```text
remakeFeatures.longVideoUxEnabled
AND profile.canUseLongVideoRealAnalysis === true
```

Required before smoke:

- [ ] Record one sanitized internal/admin account reference.
- [ ] Confirm the account is authenticated in the test environment.
- [ ] Confirm the authenticated profile returns `canUseLongVideoRealAnalysis=true`.
- [ ] Confirm the capability is server-provided and not inferred from email or a client list.
- [ ] Confirm no account identifier or allowlist value is bundled into frontend code.

Current result: `NOT READY`

Blocker: No approved test account or runtime capability response is recorded.

### 4.3 Backend Guard

Required before smoke:

- [ ] Record the backend environment and hash.
- [ ] Confirm the Admin Guard authorizes the same test account.
- [ ] Confirm guarded real-analysis mode is ready for the approved test window.
- [ ] Confirm account allowlist and concurrency controls.
- [ ] Confirm backend create idempotency for one stable `clientRequestId`.
- [ ] Name the backend guard rollback owner.

Current result: `NOT READY`

Blocker: Backend guard, allowlist, concurrency, and idempotency evidence were not queried or changed in this docs-only phase.

### 4.4 Safe Test Asset

Required before smoke:

- [ ] Record the approved asset id.
- [ ] Confirm owner matches the internal test account.
- [ ] Confirm status is ready.
- [ ] Confirm duration is greater than 120 seconds and no more than 600 seconds.
- [ ] Confirm content is internal, non-sensitive, and contains no customer data.
- [ ] Confirm the asset is permitted by the backend safe-asset gate.

Current result: `NOT READY`

Blocker: No asset id or current readiness evidence was supplied for P6-C1-A8.

## 5. Smoke Execution Checklist

Do not begin until Sections 4.1 through 4.4 are all `PASS` and the P6-C1-A7 approval window is explicitly opened.

### Step 1: Upload Or Select Asset

- [ ] Sign in with the approved internal account.
- [ ] Open the approved test environment.
- [ ] Select Long Video Remake.
- [ ] Upload or select only the approved safe asset.
- [ ] Confirm filename, owner, status, and duration.
- [ ] Confirm no analysis job is created by source selection.

Observed: `NOT EXECUTED`

### Step 2: Estimate Flow

- [ ] Select Estimate once.
- [ ] Confirm exactly one `POST /api/remake/long-video-cost-estimate`.
- [ ] Record a non-empty `estimateId`.
- [ ] Confirm user-safe estimated credits, balance, confirmation requirement, and immediate charge disposition are displayed.
- [ ] Confirm insufficient credits block continuation.
- [ ] Confirm no analyze POST occurs during estimate.
- [ ] Confirm no provider, VLM, model, adapter, guard, or audit text is displayed.

Observed: `NOT EXECUTED`

### Step 3: Confirm And Create Flow

- [ ] Review the estimate before create.
- [ ] Select Confirm analysis exactly once.
- [ ] Confirm exactly one `POST /api/remake/analyze-long-video`.
- [ ] Confirm create reuses the approved `estimateId`.
- [ ] Record one stable non-empty `clientRequestId`.
- [ ] Record one non-empty returned `analysisJobId`.
- [ ] Confirm double-click and ambiguous-request protection prevents duplicate POST.
- [ ] Do not manually replay the request.

Observed: `NOT EXECUTED`

### Step 4: Active Job Persistence

- [ ] Confirm the active-job record is written after the valid `analysisJobId` is returned.
- [ ] Confirm it contains only version, `analysisJobId`, `clientRequestId`, and timestamps.
- [ ] Confirm it contains no token, cookie, email, signed URL, provider data, frame ref, path, or raw payload.
- [ ] Confirm the persisted `clientRequestId` matches create.
- [ ] Confirm the persisted `analysisJobId` matches create.

Observed: `NOT EXECUTED`

### Step 5: Polling

- [ ] Confirm polling uses only `GET /api/remake/analysis-status/:analysisJobId`.
- [ ] Confirm only one status GET is in flight at a time.
- [ ] Confirm no estimate or analyze POST repeats.
- [ ] Confirm user-facing state does not regress.
- [ ] Confirm reliable progress is monotonic.
- [ ] Confirm absent progress remains indeterminate.
- [ ] Observe applicable states: queued, preparing, extracting frames, analyzing, building storyboard, completed or safe failed.

Observed: `NOT EXECUTED`

### Step 6: Refresh Recovery

- [ ] Refresh once while the job is active.
- [ ] Confirm authentication is ready before recovery.
- [ ] Confirm Long Video Remake mode is restored.
- [ ] Confirm the first recovery action is a status GET for the same `analysisJobId`.
- [ ] Confirm no upload, estimate POST, analyze POST, or new `clientRequestId` occurs.
- [ ] Confirm polling resumes for the same job.

Observed: `NOT EXECUTED`

### Step 7: Storyboard Rendering

- [ ] Confirm a valid real storyboard renders.
- [ ] Confirm at least one usable shot exists.
- [ ] Confirm timestamps and ordered shot content render.
- [ ] Confirm camera language, action, prompt, keyframes, and reference hints render when available.
- [ ] Confirm mock, sandbox, fallback, empty, and malformed completion remain rejected.
- [ ] Confirm only user-safe errors appear.
- [ ] Confirm no provider/VLM/internal diagnostic text appears.
- [ ] Confirm the terminal active-job record is cleared.
- [ ] Confirm storyboard completion does not start Generate.

Observed: `NOT EXECUTED`

## 6. Identifier Result Record

Complete only during the approved smoke:

| Identifier | Expected | Observed | Result |
| --- | --- | --- | --- |
| `estimateId` | Non-empty and reused by create | Not executed | Pending |
| `clientRequestId` | Non-empty and stable for one attempt | Not executed | Pending |
| `analysisJobId` | Non-empty, persisted, and used by status GET | Not executed | Pending |

Never record authorization headers, tokens, signed URLs, provider payloads, frame refs, or local paths.

## 7. Request Count Record

| Request | Maximum approved | Observed |
| --- | --- | --- |
| Source upload | One approved upload if required | Not executed |
| Cost-estimate POST | 1 | Not executed |
| Analyze POST | 1 | Not executed |
| Analyze POST after refresh | 0 | Not executed |
| Status GET | Non-overlapping polling for one job | Not executed |
| Generate request | 0 | Not executed |

Any duplicate estimate/analyze POST or any Generate request is an immediate `FAIL`.

## 8. Cost And Safety Record

Required observations:

- [ ] Analysis cost policy matches the approved internal policy.
- [ ] Cost is visible before confirmation.
- [ ] No hidden charge or client-side billing override occurs.
- [ ] No billing, credits, refund, or checkout code/configuration is changed.
- [ ] No unexpected billing, credit, or refund activity appears.
- [ ] No provider identity or provider diagnostic reaches the UI.
- [ ] No automatic retry or second analysis create occurs.
- [ ] No Generate action occurs.

Current result: `NOT EXECUTED`

## 9. Stop Conditions

Stop before create or immediately mark `FAIL` if:

- The feature is visible outside the approved test environment.
- The account capability is absent or untrusted.
- Backend guard or allowlist is not confirmed.
- The asset is unapproved, mismatched, unavailable, too short, too long, sensitive, or customer-owned.
- `estimateId` is missing.
- Cost disposition is unknown or hidden.
- A duplicate POST occurs.
- Refresh sends an estimate or analyze POST.
- Provider/VLM/internal text appears in the UI.
- Mock, fallback, sandbox, empty, or malformed output is accepted as complete.
- Generate or unexpected billing/credit/refund activity begins.

Do not retry or call the provider again after a stop condition.

## 10. Rollback Checklist

After the future smoke window or immediately on failure:

1. Return the test-environment feature flag to false.
2. Confirm the public flag remained false throughout.
3. Confirm new guarded real-analysis creation is unavailable.
4. Preserve an authorized active-job record only while GET-only terminal observation is required.
5. Clear invalid, expired, failed, or operator-abandoned local active-job state through the approved frontend storage procedure.
6. Preserve completed storyboard drafts and sanitized evidence.
7. Confirm the previous default-off UI behavior is restored for new sessions.
8. Do not create a replacement analysis job.
9. Do not Generate, retry the provider, or perform billing, credits, or refund actions.

Current rollback status: No rollback required because no flag or smoke action occurred.

## 11. Final Result

```text
P6-C1-A8 internal smoke: NOT READY
Smoke executed: NO
Feature flag changed: NO
Public rollout: NO
API calls: NO
Provider/VLM calls: NO
Generate: NO
Billing/credits/refund changes: NO
Deployment: NO
```

Required next approval inputs:

- Test environment and flag owner.
- Approved internal account with runtime capability evidence.
- Backend guard and allowlist evidence.
- Approved safe asset evidence.
- Confirmed internal analysis cost policy.
- Explicit smoke-window opening by the named operators.

## 12. Safety Confirmation

P6-C1-A8 is documentation-only. No code, environment, feature flag, API, provider, VLM, upload, Generate, billing, credits, refund, database, or deployment action was performed.
