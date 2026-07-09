# Main-G1-I-E Image Reuse Draft Bridge Deploy Approval

## Purpose

Prepare the Main-G1-I-E deploy approval package for the Image reuse draft bridge.

This document approves only the deployment planning boundary for the existing Image reuse draft bridge code. It does not perform deployment, production smoke, provider calls, generation, upload, billing, SQL, env changes, or any backend/Admin work.

## Current Baseline

Main frontend repository:
- `C:\Users\WEll\Documents\shadowedge-web-next`

Current branch checked for this approval package:
- `feature/video-reference-prompt-builder-v1-a`

Current frontend baseline:
- HEAD: `af88e2899e8c1cbc984cf24675537da2e2717556`
- `origin/main`: `af88e2899e8c1cbc984cf24675537da2e2717556`
- Latest handoff docs commit: `af88e28 docs: add project handoff current state`

Relevant Image reuse commits already on main:
- Implementation: `4ee9ba9 feat: add asset library image reuse handoff`
- Safety review: `4ca44f5 docs: review image reuse draft bridge safety`

Referenced runbooks:
- `docs/runbooks/shadowedge-project-handoff-v1-current-state-next-steps.md`
- `docs/runbooks/main-g1h-asset-library-v1-phase-seal.md`
- `docs/runbooks/main-g1i-asset-library-reuse-draft-bridge-plan.md`
- `docs/runbooks/main-g1ic-image-reuse-draft-bridge-safety-review.md`
- `docs/runbooks/customer-feedback-v1d-remake-ratio-hide-shot-generation-deploy-result.md`

## Scope

Approved scope:
- Frontend-only deploy approval.
- Asset Library `/assets` to Image Workspace `/workspace/image` draft handoff.
- Enable `Use in Image` only for ready image assets with a safe renderable URL.
- Write a pending localStorage handoff under:
  - `shadowedge_asset_library_image_handoff_v1`
- Route target:
  - `/workspace/image?from=asset-library`
- `ImageWorkspace` consumes the handoff once after draft/model/reference readiness.
- The consumed asset is appended as a draft reference through existing Image workspace reference logic.
- Existing Image workspace prompt, model, params, and references should be preserved.

Key files in scope from the implementation:
- `src/lib/assets/assetLibraryImageHandoff.ts`
- `src/components/assets/AssetLibraryPage.tsx`
- `src/components/image/ImageWorkspace.tsx`

## Explicit Non-scope

This approval does not include:
- auto Generate
- upload
- provider, VLM, B.AI, OpenAI, Higgsfield, or provider submit calls
- billing or refund
- backend write
- SQL
- env changes
- database or schema changes
- payment/provider/R2/Supabase/admin token changes
- Admin changes
- delete, rename, tags, folders, favorites, or batch actions
- Video reuse
- Shadow VLM exposure
- user-facing Shadow VLM adoption

Stop immediately if any deployment plan includes backend/API/Admin/VPS/PM2/env/SQL/provider/payment changes.

## Safety Checks Already Passed

From Main-G1-I-C safety review and current code inspection:

- `Use in Image` is enabled only when:
  - asset kind is `image`
  - asset status is `ready`
  - a safe normalized public URL exists
- Non-image, unavailable, failed, deleted, or missing-URL assets remain disabled.
- The click path only:
  - saves a local handoff with `saveAssetLibraryImageHandoff(asset)`
  - routes to `/workspace/image?from=asset-library`
- The click path does not call `apiRequest`, `fetch`, upload, provider, billing, refund, or backend write APIs.
- Handoff storage uses only safe minimum fields:
  - asset id
  - kind `image`
  - normalized public/preview URL
  - display name / filename
  - mime type
  - size
  - width/height
  - source `asset-library`
  - source job id if present
  - timestamp/version
- Sensitive text and URL parameters are stripped or rejected.
- Unsafe URLs are rejected.
- `/api/uploads/...` is not persisted as a handoff URL.
- `ImageWorkspace` consumes the handoff once.
- The consumer:
  - removes the handoff from localStorage
  - converts the handoff to an `ImageReferenceItem`
  - revalidates URL safety
  - checks duplicate by id, asset id, or URL
  - checks selected model max references
  - calls existing `image.addReferenceItems([reference])`
- Duplicate, full, and invalid cases show a safe notice and do not loop.
- Existing prompt/model/params/references are not overwritten.
- Reference behavior is append-only.
- No Generate side effect is triggered.

## Deploy Approval

Approved target:
- main frontend deployment only

Approved deployment style:
- Use the existing main frontend deployment path.
- Deploy the current remote main frontend code that includes:
  - `4ee9ba9 feat: add asset library image reuse handoff`
  - `4ca44f5 docs: review image reuse draft bridge safety`
  - latest baseline `af88e2899e8c1cbc984cf24675537da2e2717556`

Do not deploy if:
- the target project/domain is unclear
- the deployment would include backend/API/Admin/VPS/PM2 changes
- the deployment requires env changes
- the deployment requires SQL/database changes
- the deployment requires provider/payment/R2/Supabase/admin token changes
- the deployment includes unrelated code not on `origin/main`
- `backups/` or `outputs/` would be submitted

## Post-deploy Smoke Plan

Keep smoke UI-only and draft-only.

Required smoke checks:

1. `/assets` loads for a logged-in user.
2. A ready image asset with safe URL shows enabled `Use in Image`.
3. Non-image assets keep `Use in Image` disabled.
4. Unavailable, failed, deleted, or missing-URL assets keep `Use in Image` disabled with a safe reason.
5. Click `Use in Image`.
6. Browser routes to `/workspace/image?from=asset-library`.
7. Image workspace loads.
8. The selected asset appears as a draft reference.
9. Existing Image workspace prompt is preserved.
10. Existing Image workspace model is preserved.
11. Existing Image workspace params are preserved.
12. Existing Image workspace references are preserved.
13. The asset is appended rather than replacing current references.
14. Duplicate asset case shows an "already in draft" style safe notice.
15. Full reference-slot case shows a reference limit notice.
16. Invalid or missing URL case shows an invalid/unavailable notice.
17. Handoff is consumed once and does not create a loop on refresh.
18. No Generate starts automatically.
19. No upload occurs.
20. No provider/VLM/B.AI/OpenAI/Higgsfield call occurs.
21. No billing/refund occurs.
22. No backend write appears in Network.
23. Regression: `/workspace/image` still loads directly.
24. Regression: `/assets` still loads directly.
25. Regression: existing Image asset picker still loads and works if checked.

Network smoke restrictions:
- Allowed: static frontend assets and existing read-only asset list requests.
- Forbidden: Generate, upload, provider, billing, refund, backend write, delete/rename/tag/favorite/batch.

## Stop Conditions

Stop and roll back or pause if any of these occur:

- Any Generate starts automatically.
- Any upload occurs.
- Any provider/VLM/B.AI/OpenAI/Higgsfield call occurs.
- Any billing/refund occurs.
- Any backend write occurs from the handoff action.
- Any Shadow VLM, Admin-only, or admin/test data appears user-facing.
- Existing Image workspace draft prompt/model/params/references are overwritten unexpectedly.
- Non-image asset can be reused in Image.
- Unsafe URL asset can be reused.
- Missing URL asset can be reused.
- Handoff persists and re-adds repeatedly after refresh.
- `/assets` fails to load.
- `/workspace/image` fails to load.
- Existing Image asset picker breaks.

## Rollback

Rollback target:
- Frontend handoff UI/consumer only.

Rollback guidance:
- Roll back the main frontend deployment to the previous known-good deployment/commit if the Image reuse bridge causes user-facing breakage.
- Revert or disable `Use in Image` handoff UI if needed.
- Keep Asset Library read-only route intact unless `/assets` itself is directly broken by the deployment.
- Do not touch backend.
- Do not touch database.
- Do not change env.
- Do not change provider/payment/R2/Supabase/admin tokens.
- Do not refund or bill from this rollback path.

## Approval Conclusion

Main-G1-I-E can proceed to a separate deploy execution round if the operator explicitly approves deployment.

The deployment must remain frontend-only and the post-deploy smoke must remain UI-only/draft-only.

Recommended next phase after approval:
- Main-G1-I-F: deploy + smoke.

Recommended phase after successful deploy/smoke:
- Main-G1-I-G: Image reuse draft bridge phase seal.
