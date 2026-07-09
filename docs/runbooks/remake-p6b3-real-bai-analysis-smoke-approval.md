# Remake P6-B3 Real B.AI Analysis Smoke Approval Audit

Date: 2026-07-09

## Purpose

P6-B3 prepares the approval checklist for one controlled real B.AI/VLM Remake analysis smoke.

This runbook is an audit and approval package only. It does not approve execution by itself, does not call B.AI/VLM, does not deploy, and does not change code or environment.

The goal is to prove the next smoke can distinguish real visual analysis from fallback/mock/template output while preserving the P6-B2 draft-only boundary.

## Baseline

Frontend:

- Repo: `C:\Users\WEll\Documents\shadowedge-web-next`
- Branch checked: `feature/video-reference-prompt-builder-v1-a`
- HEAD/origin main at audit time: `50993243134610f9ebd54f91a8fc737872f649e0`
- Latest relevant phase: `docs: seal remake video draft handoff phase`

Backend:

- Repo: `C:\Users\WILL\Documents\shadowedge-api`
- HEAD/origin main at audit time: `0c77a5516962b45f147e7a990c61ba0bd70bd69e`
- Latest relevant code state includes Remake target ratio propagation and existing VLM/fallback services.

Admin:

- Repo: `C:\Users\WEll\Documents\shadowedge-admin-next`
- HEAD/origin main at audit time: `545e4da17f06c018ec4563fba889ad386dd5aab1`
- Admin Shadow VLM audit panel is already sealed as read-only/Admin-only visibility.

Relevant sealed phases:

- P6-A4 controlled admin/test Shadow VLM auto phase: one controlled real B.AI call was proven, then production returned to default-off/AUTO-off.
- P6-A5 Admin-only Shadow VLM audit visibility: read-only Admin visibility was sealed.
- P6-B1 design: recommended real VLM analysis plus Video Workspace draft bridge path.
- P6-B2 implementation: Remake shot to Video Workspace draft handoff is sealed and deployed as draft-only.

## Why P6-B3 Comes After P6-B2

P6-B2 intentionally solved the safe user-facing handoff first:

- Remake shot content can be moved into `/workspace/video`.
- The handoff uses `shadowedge_remake_video_handoff_v1`.
- The route target is `/workspace/video?from=remake-shot`.
- The Video Workspace receives a draft only.
- No Generate, upload, provider call, billing, credits, refund, backend write, or Shadow VLM raw audit is triggered.

P6-B3 should now verify the analysis source can become real B.AI/VLM before any user-facing generation is restored. This keeps the product path safe:

1. First prove real analysis.
2. Keep user action draft-only.
3. Only later consider controlled selected-shot generation.

## Recommended First Smoke Target

Recommended first real smoke target:

```text
POST /api/internal/video/reverse-analyze
```

Frontend proxy path:

```text
POST /api/internal/video/reverse-analyze
```

Backend route:

```text
routes/internal-api.js
```

Backend VLM service:

```text
services/video-remake-vlm-service.js
```

Why this is the best first target:

- It is a single-clip reverse analysis path.
- It returns immediately instead of entering the long-video worker queue.
- It already reports `meta.analysisSource`, `meta.mock`, `meta.vlmProvider`, and fallback metadata.
- It does not generate video.
- It does not use generation provider submit.
- It does not charge credits in the route response.
- It has a smaller blast radius than long-video real VLM.

Not recommended as first smoke:

```text
POST /api/remake/analyze-long-video
```

Reason:

- It is a background long-video path with cost estimate, `analysisEngine`, dry billing metadata, guard state, audit logs, and worker execution.
- Real VLM execution there requires multiple additional gates and can involve `chargePending`/cost confirmation metadata even when billing mode is dry-run.
- It should remain later-phase only until the single-clip real VLM smoke is proven.

## Current Code Path Map

### Single Clip Reverse Analysis

Frontend API wrapper:

- `src/lib/video-api.ts`
- `reverseAnalyzeVideoRemake()`
- Calls frontend route `/api/internal/video/reverse-analyze`.

Frontend server proxy:

- `src/app/api/internal/video/reverse-analyze/route.ts`
- Requires user bearer auth.
- Validates `/api/auth/me`.
- Requires `INTERNAL_VIDEO_SITE_KEY`.
- Forwards to backend `/api/internal/video/reverse-analyze`.

Backend route:

- `routes/internal-api.js`
- `POST /api/internal/video/reverse-analyze`
- Calls `analyzeRemakeSourceVideo(input)`.
- Builds `fallbackStoryboard` with `buildRemakeStoryboard(input, analysis)`.
- Calls `buildRemakeStoryboardWithVlm(input, analysis, fallbackStoryboard)`.
- Returns:
  - `storyboard`
  - `meta.analysisSource`
  - `meta.mock`
  - `meta.vlmProvider`
  - `meta.vlmModel`
  - `meta.fallbackReason` if fallback occurs
  - `meta.nextStep`

VLM service:

- `services/video-remake-vlm-service.js`
- `getRemakeVlmProvider()` reads `REMAKE_VLM_PROVIDER`.
- Supported providers include `mock`, `bai`, `openai`, `gemini`.
- B.AI path uses:
  - `BAI_API_KEY`
  - `BAI_BASE_URL`
  - `BAI_VLM_MODEL`
- If provider is `mock`, missing frames, provider errors, unsupported image payloads, or timeout occur, the service returns fallback with `analysisSource: "fallback"` and `mock: true`.

### Long Video Real VLM

Frontend API wrapper:

- `src/lib/video-api.ts`
- `estimateLongVideoRemakeAnalysisCost()`
- `createLongVideoRemakeAnalysis()`
- Calls `/api/remake/long-video-cost-estimate` and `/api/remake/analyze-long-video`.

Backend route:

- `routes/remake-analysis.js`
- `POST /api/remake/long-video-cost-estimate`
- `POST /api/remake/analyze-long-video`
- Normalizes `analysisEngine` to `mock`, `sandbox_vlm`, or `real_vlm`.
- Creates a Remake analysis job only after the guard and estimate path.

Worker and real VLM client:

- `services/remake-analysis-worker.js`
- `services/remake-vlm-providers/real-vlm-client.js`
- Uses real VLM gates, frame sandbox summaries, audit logs, and dry billing metadata.

Admin visibility:

- Backend Admin endpoints:
  - `GET /api/admin/jobs/:id/shadow-vlm-audit`
  - `GET /api/admin/tasks/:id/shadow-vlm-audit`
- Admin page:
  - `/jobs/[id]/shadow-vlm-audit`
- Admin panel is read-only and must remain Admin-only.

## B.AI/VLM Env Key List

Do not print or inspect secret values. Names only:

Single-clip reverse analysis:

- `REMAKE_VLM_PROVIDER`
- `BAI_API_KEY`
- `BAI_BASE_URL`
- `BAI_VLM_MODEL`
- Optional alternate providers:
  - `REMAKE_OPENAI_MODEL`
  - `OPENAI_VISION_MODEL`
  - `GEMINI_API_KEY`
  - `GOOGLE_API_KEY`
  - `GOOGLE_GENAI_API_KEY`
  - `REMAKE_GEMINI_MODEL`
  - `GEMINI_VISION_MODEL`
- Frontend proxy/internal auth:
  - `NEXT_PUBLIC_API_BASE_URL`
  - `INTERNAL_VIDEO_SITE_KEY`
  - `INTERNAL_REQUEST_ORIGIN`

Long-video real VLM and Shadow VLM gates:

- `REMAKE_LONG_VIDEO_REAL_VLM_ENABLED`
- `REMAKE_LONG_VIDEO_REAL_VLM_P5B_ENABLED`
- `REMAKE_LONG_VIDEO_REAL_VLM_PROVIDER`
- `REMAKE_LONG_VIDEO_REAL_VLM_ENDPOINT`
- `REMAKE_LONG_VIDEO_REAL_VLM_API_KEY`
- `REMAKE_LONG_VIDEO_REAL_VLM_TIMEOUT_MS`
- `REMAKE_LONG_VIDEO_REAL_VLM_MODEL`
- `REMAKE_LONG_VIDEO_REAL_VLM_ADMIN_USER_IDS`
- `REMAKE_LONG_VIDEO_REAL_VLM_BILLING_MODE`
- `REMAKE_LONG_VIDEO_VLM_ENABLED`
- `REMAKE_LONG_VIDEO_SHADOW_VLM_ENABLED`
- `REMAKE_LONG_VIDEO_SHADOW_TRANSPORT`
- `REMAKE_LONG_VIDEO_SHADOW_PROVIDER`
- `REMAKE_LONG_VIDEO_SHADOW_PROVIDER_API_KEY`
- `REMAKE_LONG_VIDEO_SHADOW_PROVIDER_ENDPOINT`
- `REMAKE_LONG_VIDEO_SHADOW_PROVIDER_MODEL`
- `REMAKE_LONG_VIDEO_SHADOW_USER_IDS`
- `REMAKE_LONG_VIDEO_SHADOW_ADMIN_USER_IDS`
- `REMAKE_LONG_VIDEO_SHADOW_SAFE_ASSET_IDS`
- `REMAKE_LONG_VIDEO_SHADOW_BILLING_DISABLED`
- `REMAKE_LONG_VIDEO_SHADOW_KILL_SWITCH`
- `REMAKE_LONG_VIDEO_SHADOW_MAX_CALLS_PER_DAY`
- `REMAKE_LONG_VIDEO_SHADOW_MAX_CALLS_PER_JOB`
- `REMAKE_LONG_VIDEO_SHADOW_AUTO_ENABLED`
- `REMAKE_LONG_VIDEO_SHADOW_AUTO_ON_COMPLETED`

## Gate And Allowlist Requirements

### For The Recommended Single-Clip Smoke

Required before a later approved real smoke:

- Test user only, not a customer account.
- User must already be authenticated through normal frontend auth.
- `INTERNAL_VIDEO_SITE_KEY` must already be configured. Do not modify env during smoke.
- `REMAKE_VLM_PROVIDER` must already be set to `bai` for the target environment. Do not modify env during smoke.
- B.AI key/base/model must already be configured. Do not inspect or print values.
- Exactly one source clip should be used for first execution.
- No Generate button may be clicked.
- No upload should occur during the smoke unless separately approved; prefer an existing safe uploaded video asset.
- If the endpoint returns fallback because provider config is not active, stop and report. Do not change env.

### For Long-Video Real VLM Later

Additional required gates:

- `analysisEngine` must be explicitly `real_vlm`.
- Admin/test user allowlist must match.
- Safe asset allowlist must match.
- Guard mode must allow real VLM.
- P4/P5 gate status must pass.
- Cost estimate must be acknowledged where required.
- Billing mode must remain dry-run unless separately approved.
- Daily and per-job call caps must remain low.
- Admin audit must remain read-only.

## Test Asset Requirements

Preferred:

- Existing safe uploaded video asset already in production history/assets.
- Owned by the internal test account.
- Publicly reachable by the backend through existing upload URL handling.
- MP4 or other production-supported video format.
- Short clip, ideally 5 to 30 seconds for first single-clip smoke.
- Clear non-sensitive visuals.
- No private person, customer material, copyrighted footage, minors, policy-sensitive imagery, gore, or NSFW material.
- The source should have enough visual change to make real VLM output distinguishable from template fallback.

Avoid:

- New upload during P6-B3 unless separately approved.
- Customer-owned assets.
- Long videos, full episodes, or multi-minute clips for the first smoke.
- Any signed URL, cookie, token, or secret in reports.

If no safe existing asset is available, stop and request an approved test asset. Do not upload or generate one in the approval audit round.

## Approved Scope For Later P6-B3 Smoke

Only after explicit approval:

- One single-clip real B.AI/VLM analysis call through `/api/internal/video/reverse-analyze`.
- Internal test account only.
- Existing safe source video only if available.
- Read-only observation of response metadata and sanitized logs.
- No user-facing raw Shadow VLM disclosure.
- No generation provider submit.
- No video generation.
- No upload.
- No checkout, billing, credits charge, or refund.
- No SQL, env change, PM2 restart, backend deploy, Admin deploy, or code change.

## Explicit Non-Scope

Not approved by P6-B3:

- Generate shot.
- Generate all shots.
- Retry shot.
- Retry all failed.
- User-facing direct Remake generation.
- Full Episode real provider smoke.
- Long-video real VLM worker smoke.
- Automatic queues.
- Auto adoption of Shadow VLM output into user-facing Remake.
- Backend deploy.
- Admin deploy.
- PM2 restart.
- SQL.
- Env changes.
- Provider config changes.
- Payment, credits, billing, checkout, refund changes.
- Uploading new source files.
- Shadow VLM raw audit display to ordinary users.

## Later Smoke Steps

These are for the next explicitly approved execution task, not this docs round.

1. Confirm frontend, backend, and Admin git states are clean.
2. Confirm no pending deploy is required.
3. Confirm test account login.
4. Select one approved safe existing short video asset.
5. Open `/workspace/video?tab=remake`.
6. Select single-clip Remake mode.
7. Use the safe asset as source.
8. Submit exactly one reverse analysis request.
9. Watch Network:
   - Expected request: `/api/internal/video/reverse-analyze`.
   - Forbidden requests: Generate, upload, checkout, billing, credits, refund, provider generation submit.
10. Inspect response:
   - `ok: true`
   - `meta.analysisSource: "vlm"`
   - `meta.mock: false`
   - `meta.vlmProvider: "bai"` or equivalent approved provider
   - `meta.fallbackReason` absent
   - storyboard shots are source-specific
11. Inspect sanitized backend logs only:
   - B.AI storyboard call started/succeeded or equivalent evidence
   - no signed URL query
   - no token/secret
12. Confirm UI:
   - No raw Shadow VLM audit appears user-facing.
   - Existing fallback badges do not appear for a real VLM response.
   - `Use in Video Workspace` remains draft-only.
   - Generate shot/all-shot/retry controls remain absent.
13. Do not click Generate.
14. Stop after one call and report.

## Success Criteria

P6-B3 single-clip smoke succeeds only if all are true:

- Exactly one approved B.AI/VLM analysis call was made.
- Response indicates real analysis:
  - `analysisSource=vlm` or equivalent.
  - `mock=false`.
  - `vlmProvider=bai` or approved equivalent.
- Storyboard content is materially related to the source video.
- No fallback/template/mock markers are present.
- No generic western/finance/fixed fallback template appears.
- Target ratio is preserved where supplied.
- No Generate, upload, provider video submit, checkout, billing, credits, refund, SQL, env change, deploy, or PM2 restart occurs.
- Shadow VLM raw audit remains Admin-only or non-user-facing.
- Draft handoff still routes through P6-B2 only if clicked, and remains draft-only.

For later long-video/Shadow VLM smoke, additional success criteria must include:

- Admin audit timeline visible in `/jobs/[id]/shadow-vlm-audit`.
- `providerCallMade=true` or `vlmCalled=true` only for the approved job.
- Audit events are sanitized.
- User-facing output remains controlled and does not expose raw Shadow VLM.

## Stop Conditions

Stop immediately if any occur:

- Endpoint returns `analysisSource=fallback`.
- Endpoint returns `mock=true`.
- `fallbackReason` is present.
- B.AI env/gate is missing or disabled.
- Auth/internal site key fails.
- Source video is unavailable, unsafe, or customer-owned.
- Any Generate starts.
- Any upload starts.
- Any video provider generation submit occurs.
- Any checkout/billing/credits/refund call occurs.
- Any SQL, env change, PM2 restart, deploy, or code change is requested as part of smoke.
- Any raw Shadow VLM/provider payload appears user-facing.
- Generate shot, Generate all shots, Retry shot, or Retry all failed reappears.
- Long-video/full-episode real provider path is invoked instead of the single-clip target.
- Logs expose token, cookie, secret, or signed URL query.

## Rollback And No-Op Notes

This docs-only approval audit has no runtime rollback.

If a later approved single-clip smoke falls back:

- Do not change env.
- Do not deploy.
- Do not retry repeatedly.
- Record response metadata and sanitized logs.
- Keep P6-B2 draft handoff as the user-facing safe path.

If a later approved real VLM smoke accidentally triggers forbidden behavior:

- Stop the smoke.
- Do not continue with additional calls.
- Preserve only sanitized evidence.
- Open a separate P0 investigation task.

## Recommended Next Task

Recommended next Codex task:

```text
P6-B3 execution approval: run exactly one single-clip real B.AI/VLM reverse-analyze smoke on an internal test account and approved existing safe source video. Do not Generate, upload, deploy, change env, run SQL, charge credits, or expose raw Shadow VLM user-facing.
```

Do not start long-video real VLM or selected-shot generation until the single-clip smoke passes and a separate approval package is created.

## Confirmation For This Round

This P6-B3 approval audit round:

- Did not change app code.
- Did not deploy.
- Did not push.
- Did not restart PM2.
- Did not run SQL.
- Did not modify env, database, schema, provider, payment, R2, Supabase, or admin tokens.
- Did not call provider, VLM, B.AI, OpenAI, or Higgsfield.
- Did not Generate.
- Did not upload.
- Did not checkout, bill, charge, refund, or touch credits.
- Did not restore Generate shot, Generate all shots, Retry shot, or Retry all failed controls.
- Did not make Shadow VLM user-facing.
