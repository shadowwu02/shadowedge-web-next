# Main-G1-I-C Image Reuse Draft Bridge Safety Review

Review date: 2026-07-06

Scope: safety review, one small URL-query hardening fix, and documentation only. No deployment, SQL execution, environment changes, provider calls, generation, upload, billing, Video reuse, asset delete/rename/tag/favorite/batch actions, production smoke, or push actions were performed.

## Files Reviewed

Implementation commit reviewed:

```text
feat: add asset library image reuse handoff
```

Files reviewed:

- `src/lib/assets/assetLibraryImageHandoff.ts`
- `src/components/assets/AssetLibraryPage.tsx`
- `src/components/image/ImageWorkspace.tsx`
- `docs/runbooks/main-g1ib-image-reuse-draft-bridge-implementation.md`

Safety review docs added:

- `docs/runbooks/main-g1ic-image-reuse-draft-bridge-safety-review.md`

## Handoff Key

LocalStorage key:

```text
shadowedge_asset_library_image_handoff_v1
```

## Handoff Storage Safety Conclusion

Passed.

The handoff stores only the minimum Image draft bridge fields:

- `assetId`
- `kind=image`
- normalized `publicUrl`
- normalized `previewUrl`
- `displayName`
- `filename`
- `mimeType`
- `sizeBytes`
- `width`
- `height`
- `source=asset-library`
- `sourceJobId`
- `createdAt`
- `updatedAt`
- `version`

It does not store:

- raw metadata
- raw provider response
- provider endpoint values
- Admin-only data
- Shadow VLM audit data
- token values
- secret values
- Authorization headers
- Bearer values
- API keys
- cookies/sessions

Small safety hardening added during review:

- URL query parameters with sensitive names are stripped before storage/reference creation.
- Sensitive names include token, authorization, session, cookie, signature, credential, X-Amz signature fields, and X-Goog signature fields.
- Any value still containing `/api/uploads/` after normalization is rejected.
- Non-http(s), `blob:`, `data:`, `file:`, and `javascript:` values are rejected.

## `/assets` Behavior Conclusion

Passed.

`Use in Image` is enabled only when:

- asset kind is `image`
- asset status is `ready`
- asset has a normalized renderable URL

Disabled behavior:

- video/audio assets remain disabled with `Image workspace only accepts image assets.`
- failed/unavailable/deleted assets remain disabled with `This asset is unavailable.`
- missing URL assets remain disabled with `Missing renderable asset URL.`

Click behavior:

- calls `saveAssetLibraryImageHandoff(asset)`
- routes to `/workspace/image?from=asset-library`
- does not call `apiRequest`
- does not call `fetch`
- does not call `POST`, `PATCH`, `PUT`, or `DELETE`
- does not call provider services
- does not call Generate
- does not call upload
- does not call billing/refund/credit code
- does not mutate backend state

`Reuse in Video` remains disabled/deferred.

## ImageWorkspace Consumption Conclusion

Passed.

Consumption happens only after Image workspace draft/model/reference restore is ready:

- guarded by `image.draftReady`
- guarded by a single-use ref to avoid repeated attempts
- scheduled through `setTimeout(0)` to comply with React lint rules

The consumer:

1. reads and removes the handoff with `consumeAssetLibraryImageHandoff()`
2. converts through `assetLibraryImageHandoffToReference()`
3. revalidates URL
4. checks duplicate by id, assetId, or URL
5. checks selected model `maxReferences`
6. calls existing `image.addReferenceItems([reference])`

Safety properties:

- existing prompt is not overwritten
- selected model is not overwritten
- params are not overwritten
- existing references are not replaced
- reference behavior is append-only
- duplicate/full/invalid URL cases remove the handoff and show a safe notice
- no loop occurs because the handoff is consumed once and the ref prevents repeat consumption
- no automatic Generate is triggered

## URL Normalization Conclusion

Passed.

The handoff path uses `normalizeMediaAssetUrl()` before writing and again before creating `ImageReferenceItem`.

Rules confirmed:

- `/api/uploads/...` is normalized before storage or rejected if still present after normalization
- absolute `/api/uploads/...` API routes are rewritten by the existing normalizer before storage
- absolute URLs are not double-prefixed
- missing URLs block the handoff
- signed/credential query parameters are stripped before storage/reference creation

## User Notice / UX Conclusion

Passed.

Success notice:

```text
Asset added as a draft reference. Review it, then click Generate manually.
```

Blocked notices:

- unavailable URL
- already in draft
- selected model does not accept reference images
- selected model reference limit reached
- generic add failure

The notices are draft-only and do not imply a generation has started.

## Existing Flow Regression Conclusion

Passed by code review and build:

- `/assets` remains read-only.
- Existing `/assets` GET/list flow is unchanged.
- Image workspace draft restore remains intact.
- Image reference tray asset picker remains intact.
- `SaveToAssetsButton` is not touched.
- Video workspace is not touched.
- `assets-api.ts` is not changed in this review.

## Security Grep

Focused grep terms:

```text
POST PATCH PUT DELETE generate Generate upload billing credit provider refund token secret authorization bearer apiKey rawProviderResponse providerEndpoint delete rename tag favorite batch
```

Result:

- No new backend write call was found.
- No new provider, Generate, upload, billing, refund, delete, rename, tag, favorite, or batch action was found.
- `onGenerate` and `onUploadReference` hits are existing Image workspace props, not new calls from the Asset Library handoff.
- `token`, `secret`, `authorization`, `bearer`, and signature hits in `assetLibraryImageHandoff.ts` are reject/strip rules, not persisted values.
- `/assets` user-facing copy still says it does not trigger generation, upload, billing, provider calls, or asset mutation.

## Local Checks

Checks run after the safety hardening fix:

```powershell
npm run lint
npm run build
git diff --check
```

Results:

- `npm run lint`: passed with existing `PromptStudioPage` `<img>` warnings only.
- `npm run build`: passed. Route table included `/assets` and `/workspace/image`.
- `git diff --check`: passed; PowerShell displayed Windows LF-to-CRLF working-copy warnings only.

## Push Readiness

Expected ahead commits after this review docs commit:

1. `feat: add asset library image reuse handoff`
2. `docs: review image reuse draft bridge safety`

Expected file scope:

- `src/lib/assets/assetLibraryImageHandoff.ts`
- `src/components/assets/AssetLibraryPage.tsx`
- `src/components/image/ImageWorkspace.tsx`
- `docs/runbooks/main-g1ib-image-reuse-draft-bridge-implementation.md`
- `docs/runbooks/main-g1ic-image-reuse-draft-bridge-safety-review.md`

No unrelated docs/code commits are expected.

Push recommendation:

- Safe to push after explicit approval.
- Do not deploy until a separate deploy approval package is prepared.

## No Production Actions

This review did not:

- deploy
- execute SQL
- modify env
- call B.AI/OpenAI/VLM/provider
- Generate
- upload
- bill/credit
- run auto/smoke
- push

## Next Step

Recommended next step:

- Main-G1-I-D push after approval.

After push:

- prepare a separate deploy approval package before any production deployment.
