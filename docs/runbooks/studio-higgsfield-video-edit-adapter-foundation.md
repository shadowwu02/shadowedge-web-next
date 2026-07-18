# Studio Higgsfield Video Edit Adapter Foundation

Date: 2026-07-18

Baseline: `bea9ae1ccac60f0f1cfdb8218ccd647fc55f8cf1`

## 1. Executive summary

P2-A6 adds a real-provider-shaped Higgsfield Video Edit adapter to the provider-neutral Studio Runtime. It implements the shared `submit`, `status`, `cancel`, `normalizeError`, Job Identity, input mapping, and media-validation contracts.

The integration remains fail-closed. No stable public Higgsfield Video Edit API contract, approved ShadowEdge cost rule, authenticated backend bridge, or confirmed upload-limit table was available during implementation. Production configuration therefore has no enabled model, no accepted media limits, no credit amount, and both provider feature flags default to false. No real request can be submitted from the committed defaults.

## 2. Confirmed public product behavior

Higgsfield's public Edit Video product page confirms:

- a source video upload;
- optional image/element inputs;
- a natural-language edit prompt;
- Kling O1 Video Edit in the current public UI;
- a displayed 720p output setting.

Sources:

- [Higgsfield Edit Video](https://higgsfield.ai/ai/video/edit)
- [Higgsfield Cinema Studio: Edit a video](https://higgsfield.ai/academy/courses/cinema-studio-complete-tour/edit-a-video)

These public pages describe product behavior, not a stable submit/status/cancel API contract. Endpoint names, authentication, exact duration limits, upload formats, file-size limits, and pricing were not inferred from private frontend behavior.

## 3. Existing ShadowEdge backend audit

The current `shadowedge-api` checkout contains a Higgsfield CLI service for Video Generate and image-generation compatibility routes. It does not contain a verified Studio Higgsfield Video Edit route or an Edit-specific provider model/limit table.

P2-A6 does not reuse the existing Video Generate endpoint for editing because that would change the shared generation contract and could apply the wrong provider payload, model rules, credits, and refund behavior.

## 4. Adapter design

`higgsfieldVideoEditAdapter.ts` implements the P2-A5 contract:

```ts
interface ProviderAdapter {
  submit(request): Promise<ProviderJobResult>;
  status(identity): Promise<ProviderJobResult>;
  cancel(identity): Promise<ProviderJobResult>;
  normalizeError(error): NormalizedProviderError;
}
```

The adapter has:

- `providerId: "higgsfield"`;
- `key: "higgsfield_video_edit"`;
- `kind: "real"`;
- capability limited to `video_edit`.

Motion Control, Camera Control, and Character Consistency are not mapped to this adapter.

## 5. Capability and Provider mapping

The Capability Registry maps only:

```text
video_edit
  -> providerId: higgsfield
  -> adapterKey: higgsfield_video_edit
```

The Provider Registry marks Higgsfield executable only for `video_edit`. Existing Higgsfield metadata rows under Motion and Camera remain unavailable because the global provider definition does not claim those capabilities.

The local Mock Provider stays first in the default resolution order. Selecting no Provider continues to run the zero-cost Mock path. Higgsfield must be explicitly selected by future approved UI/configuration.

## 6. Provider configuration

`higgsfieldVideoEditConfig.ts` owns Provider-specific configuration outside Canvas nodes:

```ts
{
  capability: "video_edit",
  providerId: "higgsfield",
  adapterKey: "higgsfield_video_edit",
  enabled,
  models,
  limits,
  cost,
  routes
}
```

Committed production defaults:

- model `kling_o1_video_edit` is descriptive but disabled;
- accepted MIME types: empty;
- accepted extensions: empty;
- accepted durations: empty;
- accepted ratios: empty;
- maximum file size: unknown;
- credits: unknown;
- readiness: false.

The adapter requires all model, limit, cost, and flag checks to pass before it invokes a Transport.

## 7. Feature flags

Both flags must be explicitly enabled for future real execution:

```env
NEXT_PUBLIC_STUDIO_PROVIDER_EXECUTION_ENABLED=false
NEXT_PUBLIC_HIGGSFIELD_VIDEO_EDIT_ENABLED=false
```

The Provider Resolver enforces the global flag. The Higgsfield adapter independently enforces the dedicated flag plus model/limit/cost readiness. Enabling one or both flags without approved configuration still returns:

```text
PROVIDER_EXECUTION_DISABLED
```

## 8. Input mapping

Studio input is normalized to an internal ShadowEdge backend-bridge payload:

```ts
{
  capability: "video_edit",
  providerId: "higgsfield",
  projectId,
  nodeId,
  sourceVideo: {
    assetId,
    sourceNodeId,
    url,
    mimeType,
    sizeBytes,
    duration
  },
  prompt,
  mode,
  model,
  duration,
  ratio
}
```

This is a ShadowEdge contract, not a guessed raw Higgsfield payload. Provider-specific upload IDs or CLI/API arguments must be created server-side after the backend bridge is reviewed.

## 9. Media validation

Validation occurs before Transport submission:

- capability must be `video_edit`;
- source URL must exist and use HTTPS;
- prompt must be non-empty;
- model must be enabled by Provider config;
- MIME type and file extension must be allowed;
- file size metadata must exist and be within the configured maximum;
- source and requested duration must be supported;
- requested ratio must be supported.

Any failure returns `PROVIDER_INVALID_INPUT` and creates no job.

Studio Asset output now carries its existing `metadata` object into executor inputs so future server-confirmed MIME, duration, and size values can be validated without changing Asset storage.

## 10. Backend bridge contract

The authenticated frontend Transport is prepared for these proposed ShadowEdge routes:

```text
POST   /api/studio/providers/higgsfield/video-edit/jobs
GET    /api/studio/providers/higgsfield/video-edit/jobs/:statusJobId
DELETE /api/studio/providers/higgsfield/video-edit/jobs/:statusJobId
```

These routes were not added to `shadowedge-api` in P2-A6. The Transport uses the existing authenticated `apiRequest` client and never stores Higgsfield credentials in the browser.

Backend work must validate ownership, perform media upload/bridging, submit to Higgsfield, persist `provider_job_id`, normalize provider failures, and return a public response without secrets or raw session material.

## 11. Job Identity

Submit requires:

```ts
{
  clientJobId,
  databaseJobId,
  providerJobId,
  statusJobId
}
```

Missing database/provider/status identity fails the adapter contract. Status and cancel responses may omit repeated IDs; the adapter preserves the verified submit identity rather than replacing it with ambiguous `jobId` values.

## 12. Error handling

Higgsfield errors are normalized to the shared P2-A5 model:

- `PROVIDER_AUTH_ERROR`
- `PROVIDER_RATE_LIMIT`
- `PROVIDER_INVALID_INPUT`
- `PROVIDER_JOB_NOT_FOUND`
- `PROVIDER_TEMPORARY`
- `PROVIDER_JOB_FAILED`
- `PROVIDER_CANCELLED`

Provider raw code, safe message, and HTTP status are retained through `rawCode`, `message`, and `providerStatus`. Tokens, cookies, API keys, and raw authenticated payloads must not be persisted to Canvas or Run History.

## 13. Cost rule

Capability cost metadata now supports:

```ts
{
  providerId,
  capability,
  model,
  duration?,
  credits?
}
```

The Higgsfield rule is:

```ts
{
  providerId: "higgsfield",
  capability: "video_edit",
  model: "kling_o1_video_edit",
  creditsRule: "future"
}
```

No credit amount is supplied. Unknown cost keeps the adapter disabled. Existing Video Generate credits, billing, and refund logic are unchanged.

## 14. Contract tests

Zero-network tests cover:

1. validated input mapping to an injected Transport;
2. submit identity reconciliation;
3. status completion and result URL mapping;
4. disabled configuration with zero Transport calls;
5. invalid media with zero job submissions;
6. Registry fail-closed behavior;
7. unknown cost remaining unset.

The test model, limits, and one-credit value are isolated fixtures and are not production Provider configuration.

## 15. Controlled smoke prerequisites

Do not run a real smoke until all are approved:

- Higgsfield account and permitted programmatic access;
- server-side credential or authenticated CLI strategy;
- verified Video Edit model identifier;
- official/verified MIME, extension, duration, ratio, resolution, and size limits;
- approved credit rule and refund behavior;
- implemented backend bridge routes;
- ownership and idempotency tests;
- provider job persistence verification;
- provider terms and allowed media policy;
- rollback approval.

Recommended first smoke after those prerequisites:

- one user;
- one project;
- one Video Edit Node;
- one short approved source clip;
- one job;
- no retry;
- no Motion, Camera, Render, or FFmpeg.

## 16. Rollback

1. Keep or restore `NEXT_PUBLIC_HIGGSFIELD_VIDEO_EDIT_ENABLED=false`.
2. Keep or restore `NEXT_PUBLIC_STUDIO_PROVIDER_EXECUTION_ENABLED=false`.
3. Remove/disable the `higgsfield_video_edit` Registry entry if needed.
4. Retain Mock Video Edit as the default Provider.
5. Do not delete Canvas projects or completed assets.

## 17. Safety status

- No real Higgsfield request was made.
- No provider credential was read or stored.
- No generation or edit job was created.
- No credits or billing rules were changed.
- No Workspace file was modified.
- No Video Generate executor/API was modified.
- No backend route, database migration, deploy, or PM2 restart was performed.
