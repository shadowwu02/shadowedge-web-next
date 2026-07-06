# Main-G1-E Asset Library Route Deploy Approval

Approval package date: 2026-07-06

Scope: deployment approval package only. No deployment, SQL execution, environment changes, provider calls, generation, upload, billing, code changes, or push actions were performed.

## Deployment Scope

Deploy only main frontend remote main hash:

```text
7c07967293a65b7769d5e3990286b66760168154
```

Pushed commits included in this target:

- `7c07967 docs: review asset library route safety`
- `29c0c68 feat: add read-only asset library route`
- `2492b11 docs: define asset and history contracts`
- `38f4ede docs: plan asset library and history stabilization`
- `bcf9ad8 docs: audit main site gaps and roadmap`
- `752fcb1 docs: add gold-tide hk vps launch handoff`

Code scope:

- `src/app/assets/page.tsx`
- `src/components/assets/AssetLibraryPage.tsx`
- `src/lib/assets-api.ts`

Docs scope:

- `docs/runbooks/main-site-gap-audit-v1-current-state-and-roadmap.md`
- `docs/runbooks/main-g1-asset-library-history-stabilization-plan.md`
- `docs/runbooks/main-g1a-asset-history-api-contract.md`
- `docs/runbooks/main-g1b-asset-library-route-shell.md`
- `docs/runbooks/main-g1c-asset-library-route-safety-review.md`
- `docs/runbooks/brand-clone-v1g6-gold-tide-hk-vps-launch-handoff.md`

## Safety Boundary

The deployed feature is a user-facing `/assets` read-only route.

Confirmed intended behavior:

- uses the existing main-site auth/API client
- calls only `GET /api/assets`
- no `POST`
- no `PATCH`
- no `PUT`
- no `DELETE`
- no Generate
- no provider trigger
- no upload
- no billing/refund
- no delete/rename/tag/favorite/batch action
- Reuse Image and Reuse Video buttons remain disabled/deferred
- no Admin audit exposure
- no Shadow VLM audit exposure

## Pre-Deploy Checks

Before deploy, confirm:

- production project/domain is correct
- current production deployment/version is recorded
- remote main hash matches `7c07967293a65b7769d5e3990286b66760168154`
- working tree is clean
- no environment changes are required
- backend `GET /api/assets` is already available
- `npm run lint` passed
- `npm run build` passed
- build route table includes `/assets`

Last local checks from Main-G1-C:

- `npm run lint` passed with only pre-existing `PromptStudioPage.tsx` `<img>` warnings.
- `npm run build` passed and listed `/assets`.
- `git diff --check` passed.

## Deploy Plan

Use the existing main frontend deployment path.

If Vercel:

- confirm project name/domain
- deploy exact main hash `7c07967293a65b7769d5e3990286b66760168154`
- do not change env
- do not add tokens
- do not touch backend

If manual:

- follow the existing main frontend deploy process
- deploy exact hash only
- do not include build output or local artifacts as source changes

## Post-Deploy Smoke

Use browser/UI only.

Routes to check:

- `/assets`
- `/workspace/image`
- `/workspace/video`
- `/history`
- `/pricing`
- `/sign-in`

For `/assets`, expected behavior:

- logged-out user gets auth-required state or login-safe behavior
- logged-in user can load asset list
- filters work:
  - All
  - Images
  - Videos
  - Audio
  - Uploaded
  - Generated
  - Prompt Studio
  - Imported
- search calls the list API safely
- Open works
- Copy URL works
- Copy Job ID works when present
- Download works
- Manual Refresh only re-runs `GET /api/assets`
- Reuse Image and Reuse Video buttons remain disabled/deferred
- no delete/rename/tag/favorite/batch action
- no Generate/upload/provider/billing action
- no raw metadata dump
- no token/secret display

Regression smoke:

- Image workspace loads
- Video workspace loads
- History loads
- existing asset pickers still load if checked
- no build/runtime route crash

## Secret / Safety Scan

The UI/source must not expose:

- `apiKey`
- `authorization`
- `bearer`
- `token`
- `secret`
- `rawProviderResponse`
- `providerEndpoint`
- payment key
- provider key
- admin token
- environment values

Safe false positives in unrelated code can be noted if present. `/assets` UI should not show token/secret-looking fields.

## Rollback Plan

If `/assets` breaks the main app:

- rollback frontend to the previous deployment
- no backend rollback is expected
- confirm homepage and workspaces still load

## Stop Conditions

Do not deploy if:

- wrong Vercel/project/domain
- hash mismatch
- env change required
- backend `/api/assets` unavailable
- auth boundary unclear
- lint/build fails
- reuse buttons became active without approval
- delete/rename/tag/favorite/batch actions appear
- Generate/upload/provider/billing action appears
- secret/token display risk appears

## This Round Prohibited Actions

For Main-G1-E:

- do not deploy
- do not execute SQL
- do not modify env
- do not call provider
- do not Generate
- do not upload
- do not bill/credit
- do not push unless explicitly instructed

## Deployment Recommendation

Proceed to a separate Main-G1-F deploy step only after explicit approval. Deploy the exact remote main hash above and keep post-deploy smoke limited to browser/UI read-only checks.
