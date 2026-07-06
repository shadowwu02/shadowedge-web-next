# Main-G1-C Asset Library Route Safety Review

Review date: 2026-07-06

Scope: safety review and push readiness only. No deployment, SQL execution, environment changes, provider calls, generation, upload, billing, code changes, or push actions were performed.

## Files Reviewed

Main-G1-B commit:

- `29c0c68 feat: add read-only asset library route`

Files:

- `src/app/assets/page.tsx`
- `src/components/assets/AssetLibraryPage.tsx`
- `src/lib/assets-api.ts`
- `docs/runbooks/main-g1b-asset-library-route-shell.md`

## Auth Conclusion

Passed.

`/assets` uses the existing frontend API path through `listMediaAssets()`, which calls `apiRequest()` and therefore uses the same user Bearer token handling as the rest of the main site.

Unauthenticated users do not receive asset data from the page itself. If `GET /api/assets` returns auth failure, the page renders a sign-in-required state and links to `/sign-in?next=/assets`.

The page does not use Admin-only routes and does not expose Admin Shadow VLM audit data.

## Read-Only Conclusion

Passed.

The `/assets` page imports only:

- `listMediaAssets`
- `mapMediaAssetsToUserAssets`

It does not import or call:

- `saveAssetFromJob`
- upload helpers
- generation helpers
- provider helpers
- billing/refund helpers
- Admin helpers

Allowed actions implemented:

- `GET /api/assets`
- Open asset URL
- Copy asset URL
- Copy job ID
- Download asset URL
- Manual refresh list, which re-runs only `GET /api/assets`

Not implemented:

- `POST`
- `PATCH`
- `PUT`
- `DELETE`
- delete/remove
- rename
- tag/favorite/folder
- upload
- Generate
- provider trigger
- retry/rerun provider
- billing/refund
- Admin audit
- Shadow VLM audit
- env toggle
- batch action

Note: `src/lib/assets-api.ts` still contains the pre-existing `saveAssetFromJob()` helper with `POST /api/assets/from-job/:jobId`; this was not introduced by the page and is not used by `/assets`.

## Reuse Deferred Conclusion

Passed.

The page displays disabled `Reuse in Image` and `Reuse in Video` controls. They have no click handler and do not call localStorage draft writers, provider paths, Generate paths, upload paths, or billing paths.

Reason for deferral: existing Image/Video draft bridges are oriented around history result records. A generic `UserAsset` to workspace draft bridge should be implemented later under Main-G1-D with explicit draft-only tests.

## URL Normalization Conclusion

Passed.

The `UserAsset` mapper calls `normalizeMediaAssetUrl()` before exposing `publicUrl`, `previewUrl`, or `thumbnailUrl` to the page.

Confirmed behavior:

- `https://api.shadowedgeai.com/api/uploads/...` rewrites to `https://api.shadowedgeai.com/uploads/...`
- `https://<any-host>/api/uploads/...` rewrites to `https://<same-host>/uploads/...`
- `/api/uploads/...` rewrites to `<NEXT_PUBLIC_API_BASE_URL origin>/uploads/...`
- `/uploads/...` rewrites to `<NEXT_PUBLIC_API_BASE_URL origin>/uploads/...`
- absolute non-upload URLs are preserved
- empty URL assets render with placeholders and disabled Open/Copy/Download actions

The page should not request the missing backend `/api/uploads/...` route for asset thumbnails.

## Safe Metadata Conclusion

Passed.

The page renders a safe source trace allowlist only:

- `jobId`
- `providerJobId`
- `model`
- `promptSummary`, truncated
- `outputType`
- `width`
- `height`
- `durationSeconds`
- `source`
- `uploadType`
- `originalName`

The page does not render:

- raw metadata JSON
- API keys
- Authorization headers
- Bearer tokens
- cookies
- session values
- secrets
- raw provider responses
- provider endpoints
- signed URL internals
- auth headers

## UI / Product Safety

Passed.

The page has:

- no batch selection
- no bulk action
- no auto refresh
- no polling
- no delete/manage entry point
- no Generate button
- no billing action
- no Admin or Shadow VLM audit link

Filters and search only affect the `GET /api/assets` query. Manual Refresh also only repeats the read-only list request.

## Existing Flow Regression Review

Passed.

`assets-api.ts` changes are additive:

- existing `listMediaAssets()` unchanged
- existing `saveAssetFromJob()` unchanged
- existing `mediaAssetToUploadMediaItem()` unchanged
- existing `mediaAssetToImageReferenceItem()` unchanged

The Image workspace, Video workspace, existing asset picker, media picker, and Save to Assets button remain compatible.

## Local Checks

Completed:

- `npm run lint` passed.
  - Existing warnings remain in `src/components/prompt-studio/PromptStudioPage.tsx` for pre-existing `<img>` usage.
  - No Main-G1-B lint errors.
- `npm run build` passed.
  - Next route table includes `/assets`.
- `git diff --check` passed.

## Focused Safety Grep

Checked files:

- `src/app/assets/page.tsx`
- `src/components/assets/AssetLibraryPage.tsx`
- `src/lib/assets-api.ts`

Findings:

- No new provider, Generate, upload, billing, refund, env, Admin, Shadow VLM, batch, polling, or token display path in `/assets`.
- The only `POST` hit is the pre-existing `saveAssetFromJob()` helper in `src/lib/assets-api.ts`; `/assets` does not use it.
- Other hits are display labels or safe source-trace fields, such as `providerJobId` and `uploadType`.

## Push Readiness

Current status before this review doc commit:

```text
main...origin/main [ahead 5]
working tree clean
```

Ahead commits:

| Commit | Message | Files |
| --- | --- | --- |
| `29c0c68` | `feat: add read-only asset library route` | `docs/runbooks/main-g1b-asset-library-route-shell.md`, `src/app/assets/page.tsx`, `src/components/assets/AssetLibraryPage.tsx`, `src/lib/assets-api.ts` |
| `2492b11` | `docs: define asset and history contracts` | `docs/runbooks/main-g1a-asset-history-api-contract.md` |
| `38f4ede` | `docs: plan asset library and history stabilization` | `docs/runbooks/main-g1-asset-library-history-stabilization-plan.md` |
| `bcf9ad8` | `docs: audit main site gaps and roadmap` | `docs/runbooks/main-site-gap-audit-v1-current-state-and-roadmap.md` |
| `752fcb1` | `docs: add gold-tide hk vps launch handoff` | `docs/runbooks/brand-clone-v1g6-gold-tide-hk-vps-launch-handoff.md` |

No build output, env files, secrets, backend changes, Admin changes, provider changes, payment changes, or generated artifacts are included in the ahead commit file list.

## Push Recommendation

Do not push automatically in this round.

If the next approval is specifically for Main-G1 only, do not use a blind `git push origin main` because it would also push the unrelated Gold Tide VPS handoff docs commit `752fcb1`.

Recommended options:

1. If the user approves all 5 ahead commits, push current `main` as-is.
2. If the user approves only Main-G1 work, create a clean push path from `origin/main` that cherry-picks only:
   - `bcf9ad8`
   - `38f4ede`
   - `2492b11`
   - `29c0c68`
   - this Main-G1-C review doc commit, if desired
3. If the Gold Tide docs should also be preserved but not pushed with Main-G1, handle it in a separate explicit docs push approval.

Risk if pushing all 5: low technical risk because the extra commit is docs-only, but it is outside the Main-G1 scope.

## Safety Confirmation

No deployment, SQL execution, environment modification, provider call, Generate, upload, billing, backend change, Admin change, or push action was performed during this review.
