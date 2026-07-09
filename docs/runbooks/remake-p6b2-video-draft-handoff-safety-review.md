# Remake P6-B2 Video Draft Handoff Safety Review

Date: 2026-07-09

Scope: docs-only safety review for the P6-B2 Remake shot to Video Workspace draft handoff. This review does not change app code, deploy, push, run PM2, execute SQL, modify env/database/schema/provider/payment/R2/Supabase/admin tokens, call provider/VLM/B.AI/OpenAI/Higgsfield, Generate, upload, checkout, bill, credit, or submit `backups/` or `outputs/`.

## 1. Purpose

Safety review for P6-B2 Remake shot to Video Workspace draft handoff.

The reviewed implementation lets a Remake storyboard shot become a draft in `/workspace/video` so the user can review it and manually use the normal Video Workspace Generate action later. P6-B2 does not restore direct Remake shot generation.

## 2. Baseline

Frontend baseline:
- `origin/main`: `b88353636e721a68dece000bec52a05812965764`
- Latest implementation: `b88353636e721a68dece000bec52a05812965764`
- Commit: `feat: add remake shot video draft handoff`

Related commits:
- P6-B1 docs commit: `11d71d1514509783fd27a192fdbe2e6a284b6921`
- P6-B2 implementation commit: `b88353636e721a68dece000bec52a05812965764`

P6-B2 pushed files:
- `src/components/video/VideoWorkspace.tsx`
- `src/components/video/remake/RemakeStoryboardPanel.tsx`
- `src/i18n/dictionary.ts`
- `src/lib/video/remakeShotVideoHandoff.ts`

## 3. Scope Reviewed

Reviewed scope:
- localStorage handoff key:
  - `shadowedge_remake_video_handoff_v1`
- route:
  - `/workspace/video?from=remake-shot`
- draft-only Remake button:
  - `Use in Video Workspace`
  - `带入视频工作区`
- helper:
  - `src/lib/video/remakeShotVideoHandoff.ts`
- `VideoWorkspace` one-time consume behavior
- i18n copy

The review checked that the new Remake action is a draft bridge only. It does not submit a generation job and does not call upload, provider, VLM, billing, refund, credit, checkout, or backend write paths.

## 4. Safety Confirmations

Confirmed:
- Frontend-only.
- No backend change.
- No Admin change.
- No new endpoint.
- No SQL, env, database, schema, provider, payment, R2, Supabase, or admin token change.
- No provider, VLM, B.AI, OpenAI, or Higgsfield call.
- No Generate.
- No upload.
- No checkout.
- No billing, credits, or refund action.
- No Shadow VLM user-facing exposure.
- No raw Shadow VLM audit data exposed.
- No raw provider response exposed.
- `Generate shot` was not restored.
- `Generate all shots` was not restored.
- `Retry shot` was not restored.
- `Retry all failed` was not restored.

Existing historical code paths and dictionary keys for older Remake generation controls may still exist in the codebase, but the P6-B2 diff does not expose those controls in the Remake panel.

## 5. Handoff Safety

Handoff key:
- The key is exactly `shadowedge_remake_video_handoff_v1`.

Payload rules:
- Payload is versioned.
- `version` must be `1`.
- `source` must be `remake-shot`.
- `prompt` is required and sanitized.
- Optional notes are sanitized plain text only.
- References are normalized and converted into the existing Video Workspace reference item shape.

URL safety:
- Unsafe protocols are rejected:
  - `blob:`
  - `data:`
  - `file:`
  - `javascript:`
- Localhost-style targets are rejected:
  - `localhost`
  - `127.0.0.1`
  - `0.0.0.0`
  - `[::1]`
- URLs are normalized through the existing media URL normalizer.
- Sensitive query params are stripped or rejected, including token, secret, signature, authorization, and common signed URL params.

Reference safety:
- Only image/video handoff references are accepted.
- Invalid references are dropped.
- Converted references use `source: "reference_selected"` and `uploadStatus: "ready"`.
- Raw provider response, raw Shadow VLM audit, debug payloads, secrets, authorization material, and provider endpoints are not stored.

Consume behavior:
- `consumeRemakeShotVideoHandoff()` removes the handoff before parsing.
- Invalid JSON or invalid payloads are removed.
- The handoff is consumed once.
- Direct navigation to `/workspace/video?from=remake-shot` without a valid handoff shows a safe invalid-handoff notice and does not loop.

## 6. Draft Behavior

Preservation behavior:
- Existing prompt/model/params/reference state is preserved.
- Existing prompt text is not overwritten; Remake prompt text is appended with a separator if needed.
- If the existing prompt already includes the handoff prompt, it is not duplicated.
- If the workspace is empty, safe handoff model/params can be adopted through the existing model/params normalization.
- Existing `generateAudio` state is preserved when applying handoff params.

Reference behavior:
- Handoff references are deduped by normalized URL and id.
- Existing reference media is not replaced.
- New references are appended through existing merge rules.
- Existing role and max-reference validation is reused.
- If reference slots are full, a safe notice is shown and no overwrite occurs.
- Invalid or unsupported references are skipped safely.

Loop safety:
- The consume effect is gated by `from=remake-shot`, draft readiness, and an internal checked ref.
- The helper removes the localStorage item on consume.
- Refresh does not re-inject the same handoff after it has been consumed.

## 7. UI Copy Review

Button copy:
- `Use in Video Workspace`
- `带入视频工作区`

Notice copy:
- `Remake shot added to video draft. Review and click Generate manually.`
- `Invalid Remake handoff was ignored.`
- `Reference slots are full. The Remake reference was not added.`
- `Existing draft preserved.`

Copy conclusions:
- Button copy is draft-only.
- Copy does not imply generation has started.
- Notice explicitly tells the user to review and manually click Generate.
- Existing `Use prompt` remains.
- Hidden Remake shot generation controls remain hidden.

## 8. Checks Passed

Checks from P6-B2 implementation and pre-commit review:
- `npx tsc --noEmit --pretty false` passed.
- `npm run build` passed.
- `git diff --check` passed.
- Changed-file eslint passed:
  - `src/components/video/VideoWorkspace.tsx`
  - `src/components/video/remake/RemakeStoryboardPanel.tsx`
  - `src/lib/video/remakeShotVideoHandoff.ts`
  - `src/i18n/dictionary.ts`
- Source eslint excluding `outputs/**` passed with only existing Prompt Studio `<img>` warnings.
- Full `npm run lint` was blocked only by existing `outputs/account-menu-global-layer-fix/.chrome-profile...` browser profile files, unrelated to P6-B2.

No P6-B2 check required or performed a provider call, Generate, upload, billing, SQL, env change, deploy, PM2 restart, or backend/Admin change.

## 9. Residual Risks

Residual risks and non-goals:
- P6-B2 only bridges a Remake shot into a Video Workspace draft.
- P6-B2 does not make long-video real VLM user-facing.
- Frontend long-video Remake may still use mock/fallback analysis behavior unless separately changed.
- Real B.AI analysis smoke remains P6-B3 Admin/test only.
- Shadow VLM raw audit visibility remains Admin-only.
- Direct selected-shot generation remains not approved for users.
- `Generate all shots` and full automatic queues remain not approved.
- Credits/refund/status/reconciler safety for direct Remake generation remains out of scope for P6-B2.

## 10. Recommended Next

Recommended next sequence:
1. P6-B2 deploy approval package.
2. Frontend deployment approval.
3. Frontend deploy and smoke.
4. P6-B2 phase seal if smoke passes.
5. P6-B3 real B.AI analysis smoke, Admin/test only, only after separate approval.

Deploy smoke should remain read-only around Remake handoff behavior until the user manually chooses the normal Video Workspace Generate button. Do not perform provider, upload, billing, credit, or checkout actions during draft handoff smoke.

## 11. Stop Conditions for Deploy Smoke

Stop deployment or rollback if any of these occur:
- Any automatic Generate starts.
- Any upload occurs.
- Any provider/VLM/B.AI/OpenAI/Higgsfield call appears.
- Any billing, credits, refund, or checkout action appears.
- Any SQL/env/database/schema/provider/payment/R2/Supabase/admin token change is required.
- Shadow VLM raw audit appears user-facing.
- `Generate shot`, `Generate all shots`, `Retry shot`, or `Retry all failed` controls reappear.
- Unsafe URL is injected.
- Existing draft is overwritten unexpectedly.
- Handoff loops on refresh.
- `/workspace/video` or Remake panel fails to load.
- Reference media becomes mismatched to the shot prompt.

## 12. Conclusion

P6-B2 is safe to proceed to a deploy approval package as a frontend-only draft handoff.

The implementation keeps Remake generation controls hidden, keeps Shadow VLM user-facing exposure blocked, and routes users through the normal Video Workspace manual Generate flow after draft review.

This safety review does not authorize deployment, provider calls, uploads, Generate, billing, credits, SQL, env changes, backend/Admin changes, PM2 restart, or pushing this docs file.
