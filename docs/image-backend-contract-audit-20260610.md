# Image Backend Contract Audit

Date: 2026-06-10

Scope: backend contract audit for the migrated ShadowEdge Image Workspace. This is a planning document only. It does not change backend code, video routes, credits logic, provider logic, upload APIs, or frontend business logic.

## 1. Video Main Chain Reusable Points

The current Video route is the safest contract model in the backend. Its reusable backend pattern is:

- **Bearer auth**: `routes/video.js` extracts `Authorization: Bearer ...`, validates it through Supabase, and attaches `req.seUser`.
- **Profile and credits load**: the route loads `profiles.id,email,credits_balance,status,max_concurrency` and blocks disabled accounts.
- **Payload validation**: required prompt and model/parameter normalization happen before job creation.
- **Cost calculation**: Video calculates server-side cost before DB job creation.
- **Credits check**: insufficient credits return `402` before creating a DB job.
- **Provider readiness preflight**: Higgsfield Video readiness runs before DB job creation and before credits are consumed.
- **DB job creation and deduction**: `create_generation_job_and_consume_credits` creates the `generation_jobs` row and deducts credits in one RPC.
- **Provider submit**: provider-specific code starts only after DB job creation.
- **Submitted marker**: `mark_generation_job_submitted` links DB job id to provider job id and status.
- **Async submit failure safety**: the Higgsfield branch passes an `onSubmitFailure` callback; submit failure marks the DB job failed and attempts refund immediately.
- **Status polling**: `/api/video/status` accepts frontend job id, finds the DB job, polls provider/local status, normalizes terminal statuses, completes DB jobs, and refunds failures.
- **History response**: `/api/video/history` returns normalized DB rows from `generation_jobs`.
- **Error normalization**: provider errors are truncated/sanitized before returning to the frontend.
- **Refund idempotence guard**: in-process sets reduce duplicate refund attempts, while RPC-level idempotence remains the desired final guard.

Reusable for Image:

- Auth guard shape.
- Profile and credits check.
- DB job creation via `create_generation_job_and_consume_credits`.
- `complete_generation_job` and `refund_generation_job_credits` RPC usage.
- Main job id strategy: frontend receives a stable DB job id.
- Status route normalizes provider/local status into one frontend shape.
- History route reads `generation_jobs` by `type`.
- Submit failure callback pattern.
- Provider readiness preflight concept.
- Safe error and public message shaping.

Not reusable as-is:

- `calculateVideoCost`, because image cost depends on model, batch count, quality/resolution, and maybe reference limits, not duration/audio.
- Video payload fields such as duration, audio, `mediaList`, first/last frame, and video-specific provider mapping.
- Video provider fallback chain and Seedance logic.
- Video history labels and output URL naming, which assume video outputs.
- Remake meta and queue logic.

## 2. Current Image Routes Problems

### `routes/image.js`

Current endpoints:

- `POST /api/upload-image`
- `GET /api/models`
- `POST /api/generate-image`
- `POST /api/generate-image-async`

Current behavior:

- `POST /api/upload-image` stores image files under `/uploads/images` and returns a public URL.
- `GET /api/models` returns models from `services/zenmux-image-service.js`.
- `POST /api/generate-image` calls `generateImageByModel` synchronously and returns image URLs.
- `POST /api/generate-image-async` requires the caller to pass `dbJobId`, marks that job processing, calls the provider in the background, completes the job, and refunds on failure.

Problems:

- Upload route currently does not use the same `requireUser` pattern as Video.
- Sync `generate-image` does not create DB jobs, deduct credits, or use account auth as the migrated primary contract.
- Async `generate-image-async` requires a client-provided `dbJobId`, which means the client must create/charge the DB job first.
- That client-created DB job pattern matches old WordPress behavior but is wrong for the new Next architecture.
- There is no `GET /api/image/status`.
- There is no `GET /api/image/history`.
- Route names are mounted directly at `/api/*`, not under a clean `/api/image/*` namespace.
- Image model metadata is split between backend config and provider service, not exposed as one authoritative model contract.

### `routes/higgsfield.js`

Current image responsibilities:

- Lists Higgsfield image models from server JSON files.
- Validates an image allowlist.
- Builds CLI args for `higgsfield generate create`.
- Converts uploaded image URLs into server-local file paths when possible.
- Runs sync or async Higgsfield CLI jobs.
- Stores local Higgsfield job JSON under `data/higgsfield-jobs`.
- Returns status from that local JSON by local `hf_*` job id.

Current endpoints:

- `GET /api/higgsfield/models/raw`
- `GET /api/higgsfield/models/list`
- `GET /api/higgsfield/models`
- `POST /api/higgsfield/generate-image`
- `POST /api/higgsfield/generate-image-async`
- `GET /api/higgsfield/status/:jobId`

Problems:

- This is a provider adapter surface, not a product-level Image Generate contract.
- It does not create DB jobs or deduct ShadowEdge credits.
- It returns local Higgsfield job ids, not stable DB job ids.
- Its status route reads local JSON status, not normalized DB job history.
- Provider job id, local job id, and DB job id are not unified.
- It lacks the Video route's DB-backed status/history shape.
- It should remain compatible for the old WordPress flow, but the new Next Image Workspace should not call it directly.

### `services/zenmux-image-service.js`

Current responsibilities:

- Defines image model configs for Auto, Nano Banana Pro, Nano Banana, Nano Banana 2, Seedream 5.0 Lite, Seedream 4.5, Seedream 4.0, and GPT Image 2.
- Normalizes count, resolution, quality, aspect ratio, and reference images.
- Builds provider inputs for each model family.
- Calls a Replicate-style prediction flow and waits for completion.
- Caches remote generated images to `/uploads/generated`.

Problems:

- It is synchronous from the route perspective and can run for a long time.
- It owns some capability rules that are not reflected in `config/image-models.js`.
- It does not expose a normalized model contract with cost rules, max batch, max references, ratios, quality, and provider route together.
- It does not own credits or DB job state.

### `services/image-provider.js`

Current responsibilities:

- Calls a Google GenAI / Vertex-compatible image provider based on `IMAGE_PROVIDER_BASE_URL` and `IMAGE_PROVIDER_API_KEY`.
- Returns base64 data URLs.

Problems:

- It is another provider surface with a different output form.
- It is not integrated into the current route contract.
- It should not be the MVP default unless a specific provider decision is made.

### `config/image-models.js`

Current responsibilities:

- Maps display model names to provider model names and flat `credits` values.

Problems:

- Cost fields exist, but capability metadata is incomplete.
- Missing ratios, quality/resolution options, batch limits, reference limits, provider route, and provider-specific param mapping.
- Flat credits alone are not enough for dynamic cost if quality/resolution/batch changes.

## 3. Recommended `/api/image/*` Contract

The new Next Image Workspace should call only `/api/image/*`. Existing `/api/higgsfield/*` should remain as provider compatibility, but should not be the product-facing contract.

### `GET /api/image/models`

Returns enabled image models and server-authoritative capabilities.

Recommended response:

```json
{
  "ok": true,
  "data": {
    "models": [
      {
        "id": "nano_banana_2",
        "name": "Nano Banana 2",
        "provider": "higgsfield",
        "providerModel": "nano_banana_2",
        "capabilities": {
          "textToImage": true,
          "imageToImage": true,
          "maxReferences": 14,
          "maxBatchCount": 4,
          "ratios": ["1:1", "16:9", "9:16"],
          "resolutions": ["1K", "2K", "4K"],
          "qualities": [],
          "supportsSeed": false
        },
        "creditRules": {
          "baseCredits": 3,
          "unit": "image",
          "batchMultiplier": true,
          "qualityMultipliers": {
            "1K": 0.5,
            "2K": 1,
            "4K": 1.35
          }
        },
        "defaults": {
          "ratio": "1:1",
          "resolution": "2K",
          "batchCount": 1
        }
      }
    ]
  }
}
```

Notes:

- This should become the single frontend source for model UI options.
- The backend still remains the source of truth for actual cost.
- The frontend may estimate using returned rules, but the generate response should return actual `cost`.

### `POST /api/image/upload`

Recommended behavior:

- Require Bearer auth.
- Accept image file.
- Enforce size and MIME type limits.
- Store under the existing upload root or a new image upload folder.
- Return normalized media item:

```json
{
  "ok": true,
  "data": {
    "url": "https://api.shadowedgeai.com/uploads/images/example.png",
    "filename": "example.png",
    "size": 12345,
    "mimetype": "image/png",
    "type": "image"
  }
}
```

Compatibility options:

- Keep existing `POST /api/upload-image` for old WordPress.
- Add `POST /api/image/upload` as a wrapper using the same storage helper.
- Do not remove or break `/api/upload-image` during migration.

### `POST /api/image/generate`

This must be fully backend-owned.

Responsibilities:

1. Require Bearer auth.
2. Load profile and account status.
3. Validate prompt/model/references/ratio/quality/resolution/batch.
4. Normalize payload.
5. Calculate server-side cost.
6. Check credits.
7. Run provider readiness preflight when provider needs it.
8. Create DB job and deduct credits using `create_generation_job_and_consume_credits`.
9. Submit provider job.
10. Mark DB job submitted with provider/local job id.
11. If provider submit fails before a provider job is created, mark DB job failed and refund immediately.
12. Return normalized job response.

Recommended request:

```json
{
  "model": "nano_banana_2",
  "prompt": "cinematic product photo on a black and gold stage",
  "ratio": "1:1",
  "resolution": "2K",
  "quality": "",
  "batchCount": 1,
  "referenceImages": [
    "https://api.shadowedgeai.com/uploads/images/ref.png"
  ],
  "meta": {
    "source": "image_workspace"
  }
}
```

Recommended response:

```json
{
  "ok": true,
  "data": {
    "jobId": "db-generation-job-id",
    "dbJobId": "db-generation-job-id",
    "status": "queued",
    "provider": "higgsfield",
    "model": "nano_banana_2",
    "providerModel": "nano_banana_2",
    "cost": 3,
    "creditsBalance": 97,
    "estimatedOutputCount": 1,
    "params": {
      "ratio": "1:1",
      "resolution": "2K",
      "quality": "",
      "batchCount": 1
    }
  }
}
```

Errors:

- `400` for invalid payload.
- `401` for missing/invalid auth.
- `402` for insufficient credits.
- `403` for disabled account.
- `503` for provider readiness failure.
- `500` only for unexpected server failures.

### `GET /api/image/status?jobId=...`

The `jobId` should be the DB job id returned by `POST /api/image/generate`.

Recommended response:

```json
{
  "ok": true,
  "data": {
    "jobId": "db-generation-job-id",
    "dbJobId": "db-generation-job-id",
    "status": "processing",
    "progress": null,
    "outputUrls": [],
    "errorMessage": "",
    "errorCode": "",
    "refundStatus": "none",
    "creditsCharged": 3,
    "provider": "higgsfield",
    "providerJobId": "redacted-or-safe-id",
    "createdAt": "2026-06-10T00:00:00.000Z",
    "updatedAt": "2026-06-10T00:00:10.000Z"
  }
}
```

Status route behavior:

- Read the DB job by user id and DB job id.
- If DB status is terminal, return DB state.
- If DB job has a provider/local job id and is non-terminal, read provider/local status.
- If provider/local status is completed, write `complete_generation_job` and return completed.
- If provider/local status is failed, write failed and refund.
- Do not create a new provider job from status.
- Do not deduct credits from status.

### `GET /api/image/history`

Recommended behavior:

- Require Bearer auth.
- Query `generation_jobs` where `type = "image"` for the user.
- Return normalized items only.
- Include enough meta for frontend restore/detail.

Recommended item:

```json
{
  "id": "db-generation-job-id",
  "jobId": "db-generation-job-id",
  "status": "completed",
  "prompt": "cinematic product photo",
  "model": "nano_banana_2",
  "provider": "higgsfield",
  "outputUrls": ["https://api.shadowedgeai.com/uploads/generated/example.png"],
  "ratio": "1:1",
  "resolution": "2K",
  "quality": "",
  "batchCount": 1,
  "referenceCount": 1,
  "cost": 3,
  "errorMessage": "",
  "refunded": false,
  "meta": {
    "source": "image_workspace"
  },
  "createdAt": "2026-06-10T00:00:00.000Z",
  "updatedAt": "2026-06-10T00:00:30.000Z"
}
```

## 4. DB / Job ID Strategy

Recommendation:

- Frontend-visible `jobId` should be the DB job id.
- DB `generation_jobs.id` remains the canonical task id.
- Provider/local job ids should be stored internally:
  - `generation_jobs.provider_job_id`
  - `generation_jobs.meta.providerJobId`
  - `generation_jobs.meta.localJobId`
- Frontend may receive `providerJobId` only if it is safe and useful, but it should not need it.
- Status route should accept only DB job id for the new Next Image Workspace.
- History should read only normalized DB records.
- Existing local Higgsfield job JSON can remain for provider runtime tracking, but should become an implementation detail.

Feasibility:

- This matches the existing `generation_jobs` design and Video's direction.
- `generation_jobs.type = "image"` is already used by old flows.
- `output_urls` can store generated image URLs.
- `error_message` can store public/sanitized errors.
- `meta` can hold:
  - provider
  - providerModel
  - ratio
  - resolution
  - quality
  - batchCount
  - referenceImages
  - referenceCount
  - cost rules snapshot
  - refund markers if needed.

Why this is safer:

- Refresh recovery is simple: frontend polls DB job id.
- History restore is DB-backed.
- Credits and refunds are not split between browser and provider adapter.
- Provider swaps do not change frontend task ids.

## 5. Image Cost / Refund Strategy

Cost source of truth:

- Backend should own actual cost.
- `GET /api/image/models` should expose display/estimate rules derived from the same backend config.
- Frontend estimate must be treated as estimate only.
- Generate response must return actual charged `cost`.

Recommended model config direction:

- Expand `config/image-models.js` or create `config/image-provider-map.js`.
- Include:
  - `id`
  - `label`
  - `provider`
  - `providerModel`
  - `enabled`
  - `ratios`
  - `resolutions`
  - `qualities`
  - `defaultRatio`
  - `defaultResolution`
  - `defaultQuality`
  - `maxReferences`
  - `maxBatchCount`
  - `baseCredits`
  - `qualityMultipliers`
  - `resolutionMultipliers`
  - `providerInputMode`

Recommended cost formula for MVP:

```text
cost = ceil(unitCredits(model, quality/resolution) * batchCount)
```

MVP recommendations:

- References should not affect cost initially unless provider billing requires it.
- Batch count must multiply cost.
- High quality / high resolution should affect cost when model rules define it.
- Store `cost`, `unitCost`, `batchCount`, and selected quality/resolution in DB meta.

Refund strategy:

- If validation, auth, readiness, or credits check fails before DB job creation: no job, no deduction.
- If provider submit fails after DB job creation but before provider job id is created: mark DB job failed and refund immediately.
- If provider job is accepted but terminal status later fails: status polling marks failed and refunds.
- Refund calls should be idempotent through RPC and guarded in-process.
- If refund fails temporarily, keep a retry marker or audit note so later status polling can retry.

Durable refund retry:

- Recommended as a follow-up P1 for Image once MVP route exists.
- Video already has in-process retry sets; Image should copy that pattern first, then later add durable retry if needed.

## 6. Provider Selection Recommendation

Current provider surfaces:

1. Higgsfield image CLI route:
   - Good for the existing production image direction and old WordPress compatibility.
   - Exposes live Higgsfield model schema and local async job JSON.
   - Requires server CLI readiness and auth.
   - Needs the same readiness/preflight and submit-failure safety as Video before becoming the product path.

2. Zenmux / Replicate image service:
   - Has structured model builders and generated image caching.
   - Is currently more synchronous from route perspective.
   - Has a different model/config surface and likely separate provider credentials.

MVP recommendation:

- Use **one provider path only** for the first migrated Image MVP.
- Prefer **Higgsfield image CLI** if the product direction is to align Image with the current live Higgsfield model catalog and old WordPress behavior.
- Keep Zenmux/Replicate as a later optional provider or fallback after the unified contract is proven.

Why:

- Avoids mixing two provider id systems, two output shapes, and two model rule systems in the first migration.
- Lets the team solve auth, credits, DB job id, status, refund, and history once.
- Matches recent Video work where provider safety was hardened around Higgsfield.

Fallback:

- Defer fallback provider routing until after MVP is stable.
- Do not add multi-provider fallback in Image-M2B unless a single-provider route is already passing QA.

## 7. Security And Compatibility

Compatibility requirements:

- Keep existing `/api/higgsfield/*` routes for old frontend compatibility.
- Keep existing `/api/upload-image` while old WordPress still depends on it.
- Add new `/api/image/*` routes for the Next Image Workspace.
- Do not reuse `/api/video/generate` for image generation.
- Do not break old WordPress image flows during M2/M3.

Security requirements:

- New `/api/image/*` routes require Bearer auth.
- Do not expose API keys, sessions, tokens, cookies, or provider raw credentials.
- Do not let frontend create DB jobs directly.
- Do not trust frontend cost.
- Enforce image upload MIME type and size limits.
- Validate reference image count and URL origin/type server-side.
- Provider-accessible references should be public ShadowEdge upload URLs, local file paths resolved server-side, or provider media IDs.
- Sanitize provider errors before returning them to frontend.

Local and production requirements:

- Route should support local and production `PUBLIC_BASE_URL`.
- Upload URL normalization should not hard-code only one server path if local dev is supported.
- Higgsfield CLI path, cwd, readiness, and auth should be configurable.
- Do not remove current production Higgsfield route until Next Image is verified.

## 8. Backend Files To Add / Modify Later

Do not implement in this audit. Recommended future backend scope:

- Add `routes/image-v2.js` or refactor `routes/image.js` into a namespaced `/api/image/*` router.
- Update `server.js` to mount `/api/image`.
- Expand `config/image-models.js` or add `config/image-provider-map.js`.
- Add `services/image-generation-service.js` for provider-agnostic image job creation/submission.
- Add `services/higgsfield-image-service.js` or extract image provider logic out of `routes/higgsfield.js`.
- Add shared helper for:
  - auth/profile loading
  - job create/complete/refund
  - safe error normalization
  - output URL normalization
- Reuse or adapt upload storage helper from current image/video upload code.
- Optionally keep `routes/higgsfield.js` as provider adapter and old compatibility layer.

Avoid:

- Editing `/api/video/generate`.
- Moving old frontend Supabase RPC into Next.
- Making frontend call `/api/higgsfield/generate-image-async` directly.

## 9. Frontend Files Needed Later

After backend contract is in place:

- `src/types/image.ts`
- `src/lib/image-api.ts`
- `src/lib/image/imageModelRules.ts`
- `src/lib/image/imageHistoryUtils.ts`
- `src/hooks/useImageGeneration.ts`
- `src/components/image/ImageWorkspace.tsx`
- `src/components/image/ImagePromptPanel.tsx`
- `src/components/image/ImageReferenceTray.tsx`
- `src/components/image/ImageModelSelector.tsx`
- `src/components/image/ImageOutputStage.tsx`
- `src/components/image/ImageHistoryPanel.tsx`
- `src/components/image/ImageOutputDetailPanel.tsx`
- `src/app/workspace/image/page.tsx`
- `src/i18n/dictionary.ts`

Frontend should call only:

- `GET /api/image/models`
- `POST /api/image/upload`
- `POST /api/image/generate`
- `GET /api/image/status?jobId=...`
- `GET /api/image/history`

## 10. Phased Implementation Plan

### Image-M2A: Backend Contract

This audit.

Deliverables:

- Route names.
- Request/response shapes.
- DB job id strategy.
- Cost/refund policy.
- Provider recommendation.
- Backend/frontend file plan.

### Image-M2B: Backend Unified Route

Implement:

- `GET /api/image/models`
- `POST /api/image/upload`
- `POST /api/image/generate`
- `GET /api/image/status`
- `GET /api/image/history`

Use one provider path first. Do not remove old routes.

### Image-M3: Frontend API / Hook

Implement:

- typed `image-api.ts`
- `useImageGeneration`
- image model rules from backend model response
- image history normalization
- polling and refresh recovery

No major UI yet beyond test harness or minimal placeholder.

### Image-M4: UI Shell

Replace placeholder with:

- left prompt/model/reference/params panel
- center image output stage
- right history/detail panel

No advanced tools.

### Image-M5: Generate / Status / History QA

Validate:

- auth
- model loading
- upload
- text-only generation
- reference generation
- batch cost
- status polling
- history restore
- failed provider refund
- refresh during processing

## 11. P0 / P1 Risks

P0:

- New Next Image must not call Supabase RPC directly to create/charge jobs.
- New Next Image must not call `/api/higgsfield/*` as its primary generate/status contract.
- Backend actual cost must not diverge from frontend displayed estimate long-term.
- Provider submit failure after DB job creation must fail/refund immediately.
- Status polling must not accidentally resubmit provider jobs.
- Frontend job id must be DB job id, not provider/local job id.

P1:

- Image and Video may duplicate auth/job/refund helpers unless extracted carefully.
- Existing image model configs are split and incomplete.
- Current image upload route lacks auth parity with Video.
- Higgsfield image readiness is not yet equivalent to Video readiness safety.
- Local Higgsfield job JSON remains useful but should not be frontend-facing.
- Durable refund retry should be planned after MVP.
- Old WordPress compatibility may constrain route cleanup.

## 12. Recommended Next Step

Proceed to **Image-M2B: Backend Unified Route** before building the Next Image UI.

Recommended Image-M2B minimum:

1. Add a new `/api/image/*` router without deleting old routes.
2. Implement auth, model list, upload, generate, status, and history in one backend-owned contract.
3. Use DB job id as frontend `jobId`.
4. Pick one provider path for MVP, preferably Higgsfield image CLI if CLI readiness is stable.
5. Add provider readiness before DB job creation and async submit failure refund after DB job creation.
6. Return normalized errors and history rows.
7. Run mock/safe tests first; no real image generation until auth/credits/status are validated.

