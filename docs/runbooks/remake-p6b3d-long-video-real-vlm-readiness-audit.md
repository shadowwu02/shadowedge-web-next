# Remake P6-B3D Long-Video Real VLM Readiness Audit

Date: 2026-07-09

## Purpose

This runbook records the read-only readiness audit for running a 2+ minute Remake long-video real VLM analysis smoke. It follows the sealed P6-B3 single-clip B.AI smoke and does not approve or execute any long-video provider call.

## Final Baseline Reviewed

- Frontend: `2319f9ac34a21df91f1dc6e827401cd8d5437c86`
  - `docs: seal remake real bai analysis smoke phase`
- Backend: `0c77a5516962b45f147e7a990c61ba0bd70bd69e`
  - `fix: propagate remake target ratio`
- Admin: `545e4da17f06c018ec4563fba889ad386dd5aab1`
  - `fix: classify remote media failures in admin`

Related sealed phases:

- P6-B2: Remake shot to Video Workspace draft handoff, draft-only.
- P6-B3: one single-clip real B.AI/VLM Remake analysis smoke passed.
- P6-A4/P6-A5: long-video controlled shadow/audit visibility was sealed as admin/test-only and default-off.

## Readiness Result

Status: **NOT READY**

Long-video real VLM analysis should not be run yet against an arbitrary 2+ minute user-provided video.

The codebase has a real long-video VLM path, but the current readiness gaps are:

1. The user-facing frontend still submits long-video Remake analysis with `analysisEngine: "mock"`.
2. The real long-video path is gated by multiple default-off env/admin guard checks.
3. P5-B real VLM currently requires a hardcoded safe source asset id: `9f17ded4-512e-4bb6-9216-f6cecfea20bf`.
4. A new 2+ minute test asset id/path/duration has not been confirmed for that allowlist.
5. The worker appears to build synthetic/mock keyframe refs for long-video real VLM request payloads; before claiming real visual analysis of the actual video, the frame extraction/transport behavior needs a focused confirmation.
6. No explicit approval exists yet for `/api/remake/analyze-long-video` with `analysisEngine: "real_vlm"`.

## Current Code Map

### Frontend

Key files:

- `src/components/video/VideoWorkspace.tsx`
- `src/components/video/remake/VideoRemakeWorkspace.tsx`
- `src/components/video/remake/RemakeStoryboardPanel.tsx`
- `src/lib/video-api.ts`
- `src/i18n/dictionary.ts`

Important frontend behavior:

- Long-video cost estimate API wrapper:
  - `estimateLongVideoRemakeAnalysisCost(...)`
  - endpoint: `POST /api/remake/long-video-cost-estimate`
- Long-video analysis API wrapper:
  - `createLongVideoRemakeAnalysis(...)`
  - endpoint: `POST /api/remake/analyze-long-video`
- Long-video status API wrapper:
  - `getLongVideoRemakeAnalysisStatus(...)`
  - endpoint: `GET /api/remake/analysis-status/:analysisJobId`
- Current user-facing long-video Remake flow in `VideoWorkspace.tsx` uses `analysisEngine: "mock"` for both estimate/create.
- The frontend therefore is not currently a safe path for P6-B3D real VLM smoke without code changes or a controlled authenticated request.
- Generate shot, Generate all shots, Retry shot, and Retry all failed remain out of the user-facing flow. They must not be restored for P6-B3D.

### Backend

Key files:

- `routes/remake-analysis.js`
- `services/remake-analysis-service.js`
- `services/remake-analysis-worker.js`
- `services/remake-long-video-guard-service.js`
- `services/remake-vlm-adapter.js`
- `services/remake-vlm-providers/real-vlm-client.js`
- `server.js`

Important backend endpoints:

- `POST /api/remake/long-video-cost-estimate`
  - estimates long-video VLM cost/sampling.
  - does not call provider.
  - can return guard/adapter/dry-run request data.
- `POST /api/remake/analyze-long-video`
  - creates a queued Remake analysis job if gates pass.
  - can enter real VLM worker path only with `analysisEngine: "real_vlm"` and valid gates.
- `GET /api/remake/analysis-status/:analysisJobId`
  - user-owned status polling endpoint.
- `GET /api/remake/admin/long-video/vlm-guard`
  - admin guard read endpoint.
- `GET /api/remake/admin/long-video/audit-logs`
  - admin audit read endpoint.

Worker behavior:

- Long-video worker is started by `startRemakeAnalysisWorker()` from `server.js`.
- Worker interval is controlled by `REMAKE_ANALYSIS_WORKER_INTERVAL_MS`.
- Worker can be disabled by `REMAKE_ANALYSIS_WORKER_DISABLED=true`.
- Long-video duration range is currently:
  - minimum: strictly greater than 120 seconds.
  - maximum: 600 seconds.
- Segment sampling uses about 45-second segments, capped by guard max segments.
- Keyframe sampling is three points per segment, capped by guard max keyframes.
- If real VLM fails or returns malformed output, the worker can complete with fallback/mock storyboard metadata. That fallback must be treated as a smoke failure for P6-B3D.

### Admin

Key files:

- `src/app/(admin)/jobs/[id]/shadow-vlm-audit/page.tsx`
- `src/lib/admin-api.ts`
- `src/types/admin.ts`
- `src/app/(admin)/remake/long-video-guard/page.tsx`

Admin scope:

- Admin Shadow VLM audit panel is read-only.
- Admin panel must not expose provider trigger/rerun/generation controls.
- P6-B3D may use Admin read-only audit visibility after a separately approved smoke, but this audit does not run the smoke.

## Long-Video Real VLM Gates

The long-video real VLM path is intentionally gated. A P6-B3D smoke must confirm the following before any provider call:

### Request Gates

- `mode` must be `long_video`.
- `analysisEngine` must be `real_vlm`.
- A cost estimate should be run first with `analysisEngine: "real_vlm"`.
- `confirmCost: true` is required for real VLM create.
- The request must use an owned, ready uploaded video asset, preferably by `sourceAssetId`.
- The video URL must be an allowed uploaded video URL, normally `/uploads/videos/...`.
- Duration must be greater than 120 seconds and at most 600 seconds.

### Guard And Env Gates

Only key names are listed here. Secret values must never be printed.

Relevant env keys:

- `REMAKE_LONG_VIDEO_VLM_ENABLED`
- `REMAKE_LONG_VIDEO_VLM_PROVIDER`
- `REMAKE_LONG_VIDEO_REAL_VLM_ENABLED`
- `REMAKE_LONG_VIDEO_REAL_VLM_P5B_ENABLED`
- `REMAKE_LONG_VIDEO_REAL_VLM_PROVIDER`
- `REMAKE_LONG_VIDEO_REAL_VLM_ENDPOINT`
- `REMAKE_LONG_VIDEO_REAL_VLM_API_KEY`
- `REMAKE_LONG_VIDEO_REAL_VLM_TIMEOUT_MS`
- `REMAKE_LONG_VIDEO_REAL_VLM_MODEL`
- `REMAKE_LONG_VIDEO_REAL_VLM_ADMIN_USER_IDS`
- `REMAKE_LONG_VIDEO_REAL_VLM_BILLING_MODE`
- `REMAKE_ANALYSIS_WORKER_INTERVAL_MS`
- `REMAKE_ANALYSIS_WORKER_DISABLED`
- `FFPROBE_PATH`

Admin guard requirements:

- Long-video guard must be enabled.
- Guard mode must allow real VLM, not mock-only.
- Per-user concurrent job cap must allow one job.
- Estimated cost must be within guard limits.
- Estimated keyframe/segment counts must be within guard limits.
- Test user must be in the real VLM admin/test allowlist.

Current P5-B safe-asset gate:

- `services/remake-vlm-providers/real-vlm-client.js` requires the source asset id to match `9f17ded4-512e-4bb6-9216-f6cecfea20bf`.
- A new 2+ minute test video cannot pass this gate unless it is that exact asset or a separately approved safety-gate update is made.

## Test Asset Requirements

A valid P6-B3D test asset must be:

- owned by an internal/test account.
- already uploaded before the smoke.
- stored as a ready video asset in the normal media asset flow.
- safe and non-sensitive.
- no customer-owned material.
- no copyrighted film/short-drama material.
- no private person, celebrity, influencer, or minor focus.
- no NSFW, gore, policy-sensitive, or violent content.
- MP4 preferred.
- duration greater than 120 seconds and no more than 600 seconds.
- backend reachable via an allowed uploaded video path, preferably `/uploads/videos/...`.
- associated with a known `sourceAssetId` and sanitized path.

For this audit, no 2+ minute asset id was confirmed. Therefore the long-video smoke is not ready.

## What To Observe For Dropped Segments

The main risk for a 2+ minute long-video analysis is silent coverage loss. A real smoke must capture these fields without exposing secrets or raw provider data:

### Estimate Response

- `estimatedSegmentCount`
- `estimatedKeyframeCount`
- `dryRunRequest.sampling.segmentCount`
- `dryRunRequest.sampling.sampledFrameCount`
- guard max segment/keyframe limits
- adapter status and `supportsRealCalls`
- whether the estimate is still dry-run and provider-free

### Job Metadata And Result

- `analysisJobId`
- `status`
- `stage`
- `durationSeconds`
- `segmentCount`
- `keyframeCount`
- result segment count
- result scene count
- result shot count
- first and last segment timeline coverage
- gaps between segment time ranges
- empty or duplicate segment ids
- `providerCallMade`
- `vlmCalled`
- `mock`
- `fallbackReason`
- `realVlmFallback`
- `analysisSource`
- `vlmProvider`

### Audit Events

Expected event names to review if a smoke is later approved:

- `cost_estimate`
- `analysis_create_requested`
- `analysis_job_created`
- `vlm_gate_checked`
- `real_vlm_gate_checked`
- `vlm_gate_passed`
- `vlm_real_call_requested`
- `vlm_real_call_success`
- `vlm_real_call_failed`
- `vlm_real_call_timeout`
- `vlm_malformed_output`
- `analysis_job_completed`

Any fallback, malformed, timeout, or mock completion should fail P6-B3D.

## Minimal Safe Smoke Plan, Not Executed

This plan is for a later explicit approval. It must not be run from this audit.

1. Confirm production env/guard readiness without printing secret values.
2. Confirm a safe uploaded 2+ minute internal test asset:
   - `sourceAssetId`
   - sanitized `/uploads/videos/...` path
   - duration
   - owner/test-account confirmation
   - readiness status
3. Confirm the asset passes the current safe-asset gate, or separately approve a scoped gate update.
4. Confirm worker is enabled and no active conflicting job exists.
5. Call only:
   - `POST /api/remake/long-video-cost-estimate`
   - payload includes `mode: "long_video"`, `analysisEngine: "real_vlm"`, `sourceAssetId`, `targetRatio`, `aspectRatio`.
   - this should not call provider.
6. Stop unless the estimate confirms:
   - real VLM is allowed.
   - sampled segment/keyframe counts are expected.
   - estimated cost is within cap.
   - adapter supports real calls.
7. If separately approved, call once:
   - `POST /api/remake/analyze-long-video`
   - payload includes `mode: "long_video"`, `analysisEngine: "real_vlm"`, `confirmCost: true`, `sourceAssetId`, `targetRatio`, `aspectRatio`.
8. Poll only:
   - `GET /api/remake/analysis-status/:analysisJobId`.
9. Use Admin audit read-only views only after the job exists.

No frontend Generate, upload, checkout, billing, credits, refunds, video generation provider submit, or long-video auto queue expansion is permitted.

## Success Criteria For A Later Smoke

A P6-B3D long-video smoke can pass only if all of these are true:

- exactly one long-video real VLM job is created.
- provider call is attempted only once after gates pass.
- `analysisSource` is real VLM or equivalent.
- `mock` is false.
- no `fallbackReason`.
- no `realVlmFallback`.
- `providerCallMade` is true.
- `vlmCalled` is true.
- provider is the approved real VLM provider.
- segment and keyframe counts match estimate within expected caps.
- storyboard covers the full tested duration without dropped middle/end segments.
- output is source-specific.
- no western/finance/fixed template fallback content.
- Generate shot, Generate all shots, Retry shot, and Retry all failed remain absent.
- no `/api/video/generate`.
- no checkout/billing/credits/refund calls.
- no raw Shadow VLM audit is user-facing.

## Stop Conditions

Stop immediately and report if any of these occur:

- real VLM env or admin guard is missing/disabled.
- asset is not owned by an internal/test account.
- asset duration is 120 seconds or less.
- asset exceeds 600 seconds.
- asset is not a ready uploaded video asset.
- asset id does not pass current safe-asset gate.
- cost estimate returns blocked.
- estimate indicates mock-only or dry-run-only for the create path.
- worker is disabled or cannot process jobs.
- provider payload uses synthetic/mock-only frames when the smoke goal is real visual understanding of actual video content.
- fallback/mock/template result appears.
- any Generate or video provider submit is triggered.
- any upload/billing/credits/refund/checkout call appears.
- raw Shadow VLM/provider response appears in the user UI.

## Risk Notes

1. Frontend UI is not the right execution surface for P6-B3D today because it hardcodes long-video `analysisEngine: "mock"`.
2. Current P5-B long-video real VLM is safer than generic production use because it requires a hardcoded safe asset id and admin/test user allowlist.
3. That same safe-asset gate blocks using a newly uploaded 2+ minute asset unless the asset id matches the allowlist or a separate approval updates the gate.
4. The worker's current long-video keyframe path needs focused confirmation. If only synthetic frame refs are sent to the provider, a smoke may verify provider plumbing but not full real visual understanding of actual video frames.
5. Long-video timeout/cost behavior is not equivalent to single-clip P6-B3. The cost estimate, worker logs, and audit events must be reviewed before any single provider call.
6. Fallback can still complete a job. The smoke must treat any fallback completion as failure, not success.

## Recommendation

Do not run P6-B3D yet.

Recommended next task:

**P6-B3D1: Long-video real VLM gate and asset readiness check**

Scope:

- read-only.
- confirm env key presence/enumeration only.
- confirm admin guard mode.
- confirm worker enabled state.
- confirm safe uploaded 2+ minute internal test asset id/path/duration.
- confirm whether that asset can pass the hardcoded safe-asset gate.
- confirm whether the worker sends real local frame references suitable for visual understanding.
- no provider call.
- no `/api/remake/analyze-long-video`.

After P6-B3D1 passes, create a separate P6-B3E approval package for exactly one long-video real VLM smoke.

## Explicit Non-Scope

This audit does not approve:

- long-video real VLM execution.
- `/api/remake/analyze-long-video` calls.
- provider/VLM/B.AI/OpenAI/Higgsfield calls.
- Generate.
- upload.
- checkout/billing/credits/refunds.
- selected-shot generation.
- Generate all shots.
- automatic Remake queue.
- backend/Admin/env/schema/provider/payment changes.
- making Shadow VLM raw audit user-facing.

## Safety Confirmation

This runbook was produced from read-only code and documentation audit. No code was changed, no deploy was run, no PM2 restart was run, no SQL was run, no env/database/schema/provider/payment/R2/Supabase/admin token was modified, no B.AI/VLM/OpenAI/Higgsfield call was made, no Remake analysis endpoint was called, no Generate/upload/checkout/billing/credits/refund action was performed, and no backups or outputs were submitted.
