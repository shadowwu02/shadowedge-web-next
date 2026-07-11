# Remake P6-C1-A8.1 Internal Smoke Readiness Approval

Date: 2026-07-11

Frontend baseline: `e19571ca7707eaf49e2ffc71e3afdf67ce9c4f1f`

Readiness decision: `CONDITIONALLY APPROVED / NOT READY TO EXECUTE`

Execution status: `NOT EXECUTED`

## 1. Purpose

Define the final readiness gates for one future internal/admin smoke of the guarded Long Video Remake UX.

This document approves readiness preparation only. It does not enable the feature flag, open the smoke window, execute an API request, call a provider, change billing, deploy code, or approve public rollout.

## 2. Current State

Confirmed:

- Frontend integration is complete at `e19571ca7707eaf49e2ffc71e3afdf67ce9c4f1f`.
- The guarded Long Video Remake UX includes estimate, explicit confirmation, create, active-job persistence, polling, refresh recovery, safe progress states, and accepted storyboard rendering.
- `NEXT_PUBLIC_REMAKE_LONG_VIDEO_UX_ENABLED` is strict and default-off.
- The frontend requires both the discovery flag and `profile.canUseLongVideoRealAnalysis === true` before using the guarded real-analysis path.
- The backend guard remains authoritative.
- No public rollout has occurred.
- No P6-C1 internal UX smoke has been executed.

Current blockers:

- Test environment is not recorded.
- Feature flag owner and enable window are not recorded.
- Internal account and runtime capability evidence are not recorded.
- Backend guard and allowlist evidence are not recorded.
- Safe asset evidence is not recorded.
- Analysis cost policy is not recorded.

Until all blockers are resolved, the smoke remains `NOT READY`.

## 3. Approval Scope

The future smoke is limited to:

- One isolated internal/admin test environment.
- One named feature flag owner.
- One authenticated internal/admin account.
- One matching backend-allowlisted account.
- One approved safe long-video asset.
- One cost estimate.
- One explicit confirmation.
- One analysis create request.
- Polling for one `analysisJobId`.
- One browser refresh for GET-only recovery.
- One accepted storyboard result.

The source-code default remains false. The public environment must remain false before, during, and after the smoke.

## 4. Required Approvals

Every approval must include a named owner, timestamp, status, and non-sensitive evidence reference.

### 4.1 Environment Approval

- [ ] Test environment name and URL are recorded.
- [ ] Environment is isolated from normal customer rollout.
- [ ] Frontend hash is `e19571ca7707eaf49e2ffc71e3afdf67ce9c4f1f` or an explicitly reviewed successor.
- [ ] Backend hash and health are recorded.
- [ ] Public feature flag state is confirmed false.
- [ ] Browser network monitoring is available.
- [ ] Smoke start and end times are bounded.

Owner: ____________________

Status: `PASS` / `NOT READY`

Evidence: ____________________

### 4.2 Feature Flag Owner Approval

- [ ] Named owner can change only the approved test environment.
- [ ] Enable method is documented through the approved environment configuration path.
- [ ] Test flag is false before the window.
- [ ] Source-code default remains false.
- [ ] Public environment remains false.
- [ ] Owner can disable the test flag immediately.
- [ ] No unrelated environment value will be changed.

Owner: ____________________

Status: `PASS` / `NOT READY`

Rollback confirmation: ____________________

### 4.3 Internal Account Approval

- [ ] One sanitized internal/admin account reference is recorded.
- [ ] Account can authenticate in the test environment.
- [ ] Runtime profile returns `canUseLongVideoRealAnalysis=true`.
- [ ] Capability is server-provided and trustworthy.
- [ ] No account id, email, role, or allowlist is embedded in frontend code.
- [ ] Account cost disposition is compatible with the approved policy.

Owner: ____________________

Account reference: ____________________

Status: `PASS` / `NOT READY`

### 4.4 Backend Guard Approval

- [ ] Backend Guard authorizes the same account.
- [ ] Guard mode is ready for the bounded smoke window.
- [ ] Allowlist contains only the approved test identity for this scope.
- [ ] Concurrency is controlled for one analysis attempt.
- [ ] Stable `clientRequestId` idempotency behavior is confirmed.
- [ ] Backend health is confirmed immediately before the window.
- [ ] Guard rollback owner is named.

Owner: ____________________

Status: `PASS` / `NOT READY`

Evidence: ____________________

### 4.5 Safe Asset Approval

- [ ] Asset id is recorded.
- [ ] Owner matches the approved internal account.
- [ ] Asset status is ready.
- [ ] Duration is greater than 120 seconds and no more than 600 seconds.
- [ ] Content is internal and non-sensitive.
- [ ] Asset contains no customer data.
- [ ] Backend safe-asset requirements are satisfied.

Owner: ____________________

Asset id: ____________________

Duration: ____________________

Status: `PASS` / `NOT READY`

### 4.6 Cost Policy Approval

- [ ] Internal analysis cost policy is recorded.
- [ ] Expected `estimatedCredits` and balance behavior are understood.
- [ ] `requiresConfirmation`, `billableNow`, and `chargeCreditsNow` behavior are approved.
- [ ] Cost is displayed before explicit confirmation.
- [ ] Insufficient credits block create.
- [ ] No client-side authoritative cost calculation is used.
- [ ] Failure, credits, and refund policy remain unchanged.

Owner: ____________________

Approved policy: ____________________

Status: `PASS` / `NOT READY`

## 5. Approved Smoke Plan

The smoke may begin only after all six approvals are `PASS` and the named owners explicitly open the window.

```text
Upload or select approved asset
  -> Estimate once
  -> Review cost and Confirm once
  -> Create one analysis job
  -> Persist identifiers
  -> Poll status with GET only
  -> Refresh once
  -> Recover the same job with GET only
  -> Render accepted storyboard
```

### Upload

- Use only the approved asset.
- Confirm source identity, owner, status, and duration.
- Do not create an analysis job during source selection.
- Do not add customer content or extra references.

### Estimate

- Send at most one cost-estimate POST.
- Require one non-empty `estimateId`.
- Show only user-safe cost information.
- Do not expose provider, VLM, model, adapter, Guard, or audit details.

### Confirm

- Require explicit user confirmation.
- Confirm only after reviewing the cost disposition.
- Cancel must create no job.
- Do not infer confirmation or auto-continue.

### Create

- Send at most one analyze POST.
- Reuse the approved `estimateId`.
- Use one stable non-empty `clientRequestId`.
- Accept one non-empty returned `analysisJobId`.
- Prevent double-click, re-entry, and ambiguous-request duplicate POST.

### Persist

- Persist the returned `analysisJobId` and stable `clientRequestId` immediately.
- Store only the approved version and timestamps.
- Store no token, email, cookie, signed URL, provider detail, frame ref, path, or raw payload.

### Poll

- Poll only the status GET endpoint for the existing `analysisJobId`.
- Permit one in-flight GET at a time.
- Keep state and progress monotonic.
- Do not repeat estimate or create.
- Do not turn a status error into a new analysis attempt.

### Refresh

- Refresh once while the job is active.
- Wait for authentication readiness.
- Restore Long Video Remake mode from the active-job record.
- Use the same `analysisJobId` and `clientRequestId`.
- Issue no upload, estimate POST, analyze POST, or new job.

### Storyboard

- Render only a valid accepted real storyboard.
- Require usable shots and ordered timestamps.
- Reject mock, sandbox, fallback, empty, or malformed completion.
- Display only user-safe content and errors.
- Do not start Generate or a shot queue.

## 6. Execution Checklist

### Frontend Flag

- [ ] Test-only flag owner is present.
- [ ] Test environment is recorded.
- [ ] Flag starts false.
- [ ] Public flag is false.
- [ ] Bounded enable window is approved.
- [ ] Disable procedure is ready.

### Backend Capability And Guard

- [ ] Frontend profile capability is true for the approved account.
- [ ] Backend Guard authorizes the same account.
- [ ] Backend allowlist, concurrency, and idempotency are confirmed.
- [ ] Backend health and hash are recorded.
- [ ] Backend rollback owner is present.

### Account

- [ ] One internal/admin account is authenticated.
- [ ] Sanitized account reference is recorded.
- [ ] No public account has access.
- [ ] Account cost policy is approved.

### Asset

- [ ] One approved asset is selected.
- [ ] Ownership, ready state, duration, and content safety are verified.
- [ ] No customer asset is used.
- [ ] No replacement asset is introduced during the smoke.

### Monitoring

- [ ] Browser network monitor records request method, path, count, sanitized ids, status, and timing only.
- [ ] Estimate POST count starts at zero.
- [ ] Analyze POST count starts at zero.
- [ ] Generate request count starts at zero.
- [ ] Active-job storage can be inspected without recording secrets.
- [ ] UI can be checked for provider/internal terminology.
- [ ] Rollback owner watches the complete window.

### Identifier Record

| Identifier | Expected | Observed |
| --- | --- | --- |
| `estimateId` | One non-empty id reused by create | |
| `clientRequestId` | One stable non-empty id | |
| `analysisJobId` | One non-empty id used by persistence and polling | |

### Request Count Record

| Request | Approved maximum | Observed |
| --- | --- | --- |
| Cost-estimate POST | 1 | |
| Analyze POST | 1 | |
| Analyze POST after refresh | 0 | |
| Status GET | Non-overlapping polling for one job | |
| Generate request | 0 | |

## 7. Safety Boundary

Forbidden:

- Public rollout.
- Enabling the flag outside the approved test environment.
- Changing the source-code default from false.
- Generate or `/api/video/generate`.
- Automatic selected-shot generation or queue creation.
- Automatic provider retry or analysis retry.
- Duplicate estimate or analyze POST.
- Estimate/create POST during refresh recovery.
- Provider, B.AI, VLM, model, adapter, Guard, HTTP status, or raw fallback details in the user UI.
- Hidden billing or client-side billing override.
- Billing, credit, refund, checkout, backend, database, or provider configuration changes.
- Customer content, tokens, signed URLs, paths, frame refs, or raw payload evidence.

Stop immediately if any forbidden action occurs. Do not retry.

## 8. Result Acceptance

Mark the future smoke `PASS` only if:

- All readiness approvals are signed `PASS`.
- Feature access remains internal/admin only.
- One estimate and one create POST occur at most.
- All three identifiers are present and correlated.
- Polling and refresh recovery use GET only.
- No duplicate POST or automatic retry occurs.
- A valid accepted storyboard renders.
- Mock, sandbox, fallback, malformed, and empty results remain rejected.
- No provider/internal terminology appears in the UI.
- No Generate occurs.
- Cost was visible before confirmation and no hidden billing occurred.

Otherwise mark `FAIL` or `NOT READY` and close the window.

## 9. Rollback

After the future smoke, or immediately on failure:

1. Disable `NEXT_PUBLIC_REMAKE_LONG_VIDEO_UX_ENABLED` in the test environment.
2. Confirm the public environment remained false.
3. Confirm new guarded real-analysis creation is unavailable.
4. Preserve an authorized active-job record only while GET-only terminal observation is required.
5. Clear invalid, expired, failed, or operator-abandoned active-job state using the approved local storage procedure.
6. Preserve completed storyboard drafts and sanitized smoke evidence.
7. Confirm the previous default-off UI behavior is restored for new sessions.
8. Do not create a replacement job.
9. Do not Generate, retry the provider, or perform billing, credits, or refund actions.

Rollback verification:

- [ ] Test flag is false.
- [ ] Public flag is false.
- [ ] Active-job state is resolved according to its terminal status.
- [ ] Previous UI behavior is restored.
- [ ] No rollback POST, Generate, provider retry, or billing activity occurred.

Current rollback status: No rollback is required because no flag or smoke action was performed.

## 10. Final Readiness Gate

| Approval | Owner | Status | Evidence |
| --- | --- | --- | --- |
| Environment | | `PASS` / `NOT READY` | |
| Feature flag owner | | `PASS` / `NOT READY` | |
| Internal account | | `PASS` / `NOT READY` | |
| Backend capability and Guard | | `PASS` / `NOT READY` | |
| Safe asset | | `PASS` / `NOT READY` | |
| Cost policy | | `PASS` / `NOT READY` | |
| Monitoring and rollback | | `PASS` / `NOT READY` | |

Current decision:

```text
Readiness preparation: COMPLETE
Internal smoke execution: NOT READY
Feature flag enablement: NOT PERFORMED
Public rollout: NOT APPROVED
Provider/API calls: NOT PERFORMED
```

The smoke may start only after every row is `PASS` and the named owners explicitly authorize the bounded internal window.

## 11. Safety Confirmation

P6-C1-A8.1 is documentation-only. No code, environment, feature flag, API, provider, VLM, Generate, upload, billing, credits, refund, database, or deployment action was performed.
