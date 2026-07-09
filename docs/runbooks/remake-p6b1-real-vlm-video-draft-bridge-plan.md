# Remake P6-B1 Real VLM to Video Draft Bridge Plan

Date: 2026-07-09

Scope: docs-only design package. This round does not change app code, deploy, push, run PM2, execute SQL, modify env/database/schema/provider/payment/R2/Supabase/admin tokens, call provider/VLM/B.AI/OpenAI/Higgsfield, Generate, upload, checkout, bill, credit, or submit `backups/` or `outputs/`.

## 1. Background

Current Remake state:

- Remake already has a single-clip real B.AI/VLM code path in the backend.
- The normal `/workspace/video` generation flow is a real provider generation path.
- User-facing long-video Remake currently still sends `analysisEngine: "mock"` from the frontend.
- Full Episode Remake currently remains `mock_episode_beta`.
- `Generate shot`, `Generate all shots`, `Retry shot`, and `Retry all failed` actions were hidden in Customer Feedback v1-D.
- Shadow VLM remains Admin-only audit visibility and must not become user-facing.

Relevant deployed baseline:

- Main frontend `origin/main`: `3c724bd5cafd6d08a453e7afedf264c484d9dc09`
- Backend `origin/main` / production: `0c77a5516962b45f147e7a990c61ba0bd70bd69e`
- Admin `origin/main`: `545e4da17f06c018ec4563fba889ad386dd5aab1`

Relevant runbooks:

- `docs/runbooks/shadowedge-project-handoff-v1-current-state-next-steps.md`
- `docs/runbooks/customer-feedback-v1d-remake-ratio-hide-shot-generation-deploy-result.md`
- `docs/runbooks/main-g1ie-image-reuse-draft-bridge-deploy-approval.md`
- `docs/runbooks/main-g1i-asset-library-reuse-draft-bridge-plan.md`
- `docs/runbooks/main-g1ic-image-reuse-draft-bridge-safety-review.md`

## 2. Goal

Build the fastest safe MVP for Remake:

- Real Remake VLM analysis result or shot can be carried into `/workspace/video` as a draft.
- The user manually reviews the draft and manually clicks the normal Generate button.
- No automatic Generate.
- No automatic credit charge.
- No direct exposure of raw Shadow VLM audit content.
- No new provider trigger.
- No bypass of the existing `/api/video/generate` credits, refund, status, and history system.

The goal is to make real Remake analysis useful for customers without reintroducing direct Remake shot-generation buttons or unsafe automatic generation.

## 3. Recommended Option A

Recommended path:

1. Remake uses real B.AI/VLM analysis where separately approved and safely gated.
2. Each usable shot shows a draft-only action:
   - `Use in Video Workspace`
   - localized copy can use the product's existing Chinese wording for "bring into video workspace".
3. Clicking the action writes a localStorage handoff.
4. The user is routed to:
   - `/workspace/video?from=remake-shot`
5. `VideoWorkspace` consumes the handoff once.
6. The workspace fills or appends:
   - prompt
   - reference media
   - ratio
   - duration
   - quality
   - model, when safe
7. The user confirms the draft and manually clicks Generate.

This is the fastest safe customer-usable route because it connects real Remake analysis to the existing real video generation workspace without starting generation from Remake itself.

## 4. Explicit Non-goals

P6-B1/P6-B2 must not:

- restore `Generate all shots`
- restore `Retry all failed`
- restore the Remake shot queue
- automatically call provider services
- automatically upload media
- automatically charge credits
- add refund or billing UI
- expose Shadow VLM audit output to users
- use Full Episode real provider as the first rollout
- change backend, env, schema, payment, provider, R2, Supabase, or admin tokens

The normal `/workspace/video` Generate button remains the only user-triggered generation entry point for this MVP.

## 5. Data Contract

Recommended localStorage key:

```text
shadowedge_remake_video_handoff_v1
```

Recommended payload:

```json
{
  "version": 1,
  "source": "remake-shot",
  "createdAt": "2026-07-09T00:00:00.000Z",
  "analysisId": "remake_analysis_id",
  "shotGroupId": "segment_1",
  "shotNumber": 1,
  "sourceTimeRange": {
    "start": 0,
    "end": 5
  },
  "prompt": "Draft shot prompt",
  "ratio": "9:16",
  "duration": 5,
  "quality": "standard",
  "modelId": "seedance_2_0",
  "providerModel": "seedance_2_0",
  "referenceMedia": [
    {
      "type": "image",
      "url": "https://example.com/uploads/remake-frames/frame-1.jpg",
      "label": "Keyframe 1",
      "source": "remake-keyframe"
    }
  ],
  "notes": {
    "characters": "Visible subjects and roles only",
    "scene": "Source scene summary",
    "camera": "Camera and movement notes",
    "style": "Scene style notes"
  }
}
```

Payload rules:

- `version` must be `1`.
- `source` must be `remake-shot`.
- `createdAt` must be an ISO timestamp.
- `prompt` must be plain user-visible shot prompt text.
- `ratio` should use the selected Remake target ratio.
- `duration` should use shot `generationParams.duration` when present.
- `quality` should use shot `generationParams.quality` when present.
- `modelId` and `providerModel` should be carried only when they match a current Video workspace model safely.
- `referenceMedia` must contain only safe, renderable, normalized media references.
- Do not store raw provider responses, raw Shadow VLM audit data, internal debug payloads, secrets, tokens, signed URL query secrets, or local filesystem paths.

## 6. Safety Behavior

Handoff storage:

- Store only sanitized shot data that is safe to display to the user.
- Do not store Shadow VLM raw audit data.
- Do not store provider raw response data.
- Do not store secrets, provider endpoints, internal debug data, or authorization material.
- Normalize URLs before storage.
- Reject unsafe URL protocols such as `blob:`, `data:`, `file:`, and `javascript:`.
- Allow only image/video reference media for this bridge unless a later phase explicitly approves audio.

Handoff consumption:

- Consume and remove the handoff once.
- Do not repeatedly inject the same handoff on refresh.
- If the existing workspace has a draft, preserve the user's existing prompt/model/params/reference media where possible.
- If appending prompt text is unsafe or confusing, prefer replacing only after explicit user action in a later phase. For P6-B2, the recommended default is to set prompt only when empty or ask through a clear notice before overwriting.
- Deduplicate reference media by normalized URL, asset id, and generated handoff id.
- If reference slots are full, show a safe notice and do not overwrite.
- If payload is invalid, remove it and show a safe notice.
- Never trigger Generate.

Network and backend safety:

- P6-B2 Option A should not require backend changes.
- P6-B2 should not add new endpoints.
- P6-B2 should not call provider services.
- P6-B2 should not call upload APIs.
- P6-B2 should not call billing/refund/credit APIs.
- Real B.AI analysis smoke belongs to P6-B3 and must be separately approved as Admin/test only.

## 7. UI Behavior

Remake panel:

- Each usable shot can show `Use in Video Workspace`.
- The button must not say or imply Generate.
- The button must not use language that implies a video has already been generated.
- Preserve the existing `Use prompt` action.
- Do not restore `Generate shot`, `Generate all shots`, `Retry shot`, or `Retry all failed`.

Click behavior:

- Write the handoff to `shadowedge_remake_video_handoff_v1`.
- Route to `/workspace/video?from=remake-shot`.
- Show a draft-only notice, for example:
  - `Remake shot added to the Video Workspace draft. Review it, then click Generate manually.`

Video workspace behavior:

- Detect `from=remake-shot`.
- Consume the handoff after model registry, draft restore, and reference media readiness.
- Fill or append safe draft fields.
- Show a notice that the draft came from Remake and still requires manual Generate.
- Keep the normal Generate button unchanged.

## 8. Possible Files for P6-B2

Likely frontend files:

- `src/components/video/VideoWorkspace.tsx`
- `src/components/video/remake/RemakeStoryboardPanel.tsx`
- `src/lib/video/remakeShotVideoHandoff.ts`
- `src/lib/video/remakeStoryboardDraft.ts` if existing draft helpers can be reused
- `src/i18n/dictionary.ts`
- `src/components/video/remake/remakeTypes.ts` if type additions are needed

Recommended new helper:

- `src/lib/video/remakeShotVideoHandoff.ts`

Recommended helper responsibilities:

- validate handoff payload
- normalize URLs
- reject unsafe URLs
- save handoff
- consume handoff once
- convert handoff media to Video workspace `UploadMediaItem` shape
- keep helper independent from provider/billing/backend code

## 9. Backend Impact

P6-B2 Option A should not require backend changes.

Backend non-impact:

- no new endpoint
- no provider call
- no upload call
- no database write
- no SQL
- no env change
- no provider/payment/R2/Supabase/admin token change

Generation still uses:

- existing `/api/video/generate`
- existing user manual Generate action
- existing credits/refund/status/history system

Real B.AI analysis smoke:

- belongs to P6-B3
- must be Admin/test only
- must be separately approved
- must not be triggered by P6-B2

## 10. Smoke Plan for P6-B2

Local/frontend smoke only:

1. Remake panel loads.
2. A shot displays `Use in Video Workspace`.
3. Clicking the action routes to `/workspace/video?from=remake-shot`.
4. `VideoWorkspace` consumes the handoff once.
5. Shot prompt appears in the Video workspace draft according to the approved overwrite/append rule.
6. Ratio is carried into draft params where supported.
7. Duration is carried into draft params where supported.
8. Quality is carried into draft params where supported.
9. Model is carried only when it maps to an available current model.
10. Reference keyframes are carried when safe and supported.
11. Existing draft is not unexpectedly overwritten.
12. Duplicate references are not duplicated.
13. Invalid payload is discarded safely.
14. Refresh does not reinject the same handoff.
15. No automatic Generate starts.
16. Network shows no upload.
17. Network shows no provider/VLM/B.AI/OpenAI/Higgsfield call.
18. Network shows no billing/refund/credit call.
19. Network shows no new backend write from the handoff.
20. Normal `/workspace/video` Generate remains present but is not clicked during smoke.

Regression checks:

- Remake panel still hides shot-generation actions.
- Normal Create Video tab still works visually.
- Expand prompt editor still opens.
- Reference tray still loads.
- Existing video draft restore still works.
- Gold-Tide/NewBrand brand shell still opens the Video workspace.

## 11. Stop Conditions

Stop P6-B2 or rollback if any of these occur:

- Clicking the Remake action starts Generate automatically.
- Any provider/VLM/B.AI/OpenAI/Higgsfield call occurs.
- Any upload occurs.
- Any credits, billing, checkout, or refund action occurs.
- Shadow VLM raw audit content appears in a user-facing page.
- Unsafe URL is injected into the Video workspace.
- Existing user draft is overwritten unexpectedly.
- `Generate shot`, `Generate all shots`, `Retry shot`, or `Retry all failed` reappears.
- The Remake panel or `/workspace/video` fails to load.
- Handoff loops and reinjects after refresh.
- Reference media becomes mismatched to shot prompt.

## 12. Phase Plan

### P6-B1 - Docs-only Plan

Create this plan and stop.

No code, deployment, provider call, Generate, upload, billing, SQL, env, push, or PM2 action.

### P6-B2 - Remake Shot to Video Workspace Draft Bridge

Frontend-only implementation:

- add handoff helper
- add draft-only shot action
- consume handoff in Video workspace
- preserve existing draft state
- no automatic generation

### P6-B3 - Real B.AI Analysis Smoke

Admin/test only and separately approved:

- test real B.AI/VLM analysis
- keep Shadow VLM audit Admin-only
- do not expose raw audit data to users
- do not add generation buttons

### P6-B4 - Selected-shot Generation Controlled Test

Admin/test only:

- controlled selected-shot Generate using normal `/api/video/generate`
- verify credits/refund/status/history/reconciler
- no general user rollout

### P6-B5 - User Selected-shot Limited Rollout

Only after approval:

- feature flag
- allowlist
- credits/refund/status review
- provider failure and material issue handling
- support and rollback plan

### P6-B6 - Generate All Shots / Full Auto Queue

Not recommended now.

Only consider after:

- credits safety is proven
- refund idempotency is proven
- status reconciler is proven
- provider failure taxonomy is proven
- queue cancellation and retry semantics are approved
- cost control and user confirmation are clear

## 13. Conclusion

Recommended path:

- Start with Option A.
- Use real Remake analysis as draft input for the existing real Video workspace.
- Keep the user in control of the manual Generate action.
- Do not restore direct Remake shot generation yet.
- Do not implement Generate all shots now.

Option A is the fastest customer-usable path because it turns Remake output into a practical Video workspace draft while preserving the existing provider, credits, refund, status, and history safety boundaries.

## 14. This Round Confirmation

This P6-B1 round is documentation-only.

No code, deployment, push, PM2 restart, SQL, env/database/schema/provider/payment/R2/Supabase/admin token change, provider/VLM/B.AI/OpenAI/Higgsfield call, Generate, upload, checkout, billing, credits action, `backups/`, or `outputs/` submission is authorized by this document.
