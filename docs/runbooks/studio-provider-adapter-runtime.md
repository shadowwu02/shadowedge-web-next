# Studio Provider Adapter Runtime

Date: 2026-07-18

Baseline: `7649d4e59bb535b5fb0fd3697b3da3926c2ec4e2`

## 1. Executive summary

P2-A5 adds one provider-neutral runtime between Studio executors and provider implementations. Video Edit, Motion Control, and Camera Control now resolve a Provider from the Capability Registry and call a shared `ProviderAdapter` contract instead of importing separate mock implementations.

No real provider adapter is registered. The only executable adapter is `mock_provider`; it has no HTTP client, credentials, billing integration, or credit path. Higgsfield and Kling remain `metadata_only`. Existing Video Generate intentionally remains on its current production executor and is not migrated in this task.

## 2. Provider Registry

Each provider is described independently from Canvas nodes:

```ts
type StudioProviderDefinition = {
  providerId: string;
  name: string;
  capabilities: StudioCapabilityId[];
  adapterKey: string;
  status: "existing" | "mock" | "metadata_only" | "disabled";
};
```

Initial registry:

| Provider ID | Capabilities | Adapter | Status | Executable in P2-A5 |
| --- | --- | --- | --- | --- |
| `mock` | video edit, motion control, camera control | `mock_provider` | mock | Yes, local only |
| `shadowedge_video_api` | video generate | `existing_video_executor` | existing | Not through the new runtime |
| `higgsfield` | video edit, motion control, camera control | unavailable | metadata only | No |
| `kling` | video edit, motion control, camera control | unavailable | metadata only | No |

Provider names are registry data. Executors do not contain Higgsfield/Kling branches.

## 3. Capability to Provider resolution

`resolveProviderForCapability()` checks, in order:

1. The Capability exists.
2. The requested Provider is mapped to that Capability.
3. The requested mode is supported.
4. The Provider Registry entry is executable rather than metadata-only.
5. The Provider adapter key matches the Capability mapping.
6. The adapter is registered for the Capability.
7. A real adapter is allowed by the global feature flag.

The default provider for Video Edit, Motion Control, and Camera Control is the local Mock Provider. An unknown, unsupported, disabled, or metadata-only provider returns:

```text
CAPABILITY_PROVIDER_UNAVAILABLE
```

The resolver never silently falls back from an explicitly requested Provider to a different Provider.

## 4. Adapter Contract

```ts
interface ProviderAdapter {
  key: string;
  providerId: string;
  kind: "mock" | "real";
  capabilities: StudioCapabilityId[];
  submit(request): Promise<ProviderJobResult>;
  status(identity): Promise<ProviderJobResult>;
  cancel(identity): Promise<ProviderJobResult>;
  normalizeError(error): NormalizedProviderError;
}
```

The runtime exposes safe wrappers for `submit`, `status`, and `cancel`. Adapter exceptions are converted to the shared error model before reaching an Executor.

The old capability-specific Mock Adapter exports remain as compatibility facades for existing tests and callers. They now delegate to `createMockProviderAdapter()` and do not maintain separate submission implementations.

## 5. Job Identity

Every adapter result carries one normalized identity:

```ts
type ProviderJobIdentity = {
  jobId: string;
  clientJobId: string;
  providerJobId: string;
  databaseJobId: string;
  statusJobId: string;
};
```

This extends the existing P1-A19/P1-A22 video identity contract. `jobId` remains for backward compatibility; new provider-neutral code uses the explicit identity fields. The Mock Provider sets `statusJobId` to its mock database ID so contract tests exercise the same identity separation as a future asynchronous adapter.

## 6. Error model

All adapters normalize to:

- `PROVIDER_AUTH_ERROR`
- `PROVIDER_RATE_LIMIT`
- `PROVIDER_INVALID_INPUT`
- `PROVIDER_JOB_NOT_FOUND`
- `PROVIDER_TEMPORARY`
- `PROVIDER_JOB_FAILED`
- `PROVIDER_CANCELLED`

Runtime-only safety errors are:

- `CAPABILITY_PROVIDER_UNAVAILABLE`
- `PROVIDER_EXECUTION_DISABLED`

Rate limits and temporary failures are marked retryable as metadata. P2-A5 does not implement automatic retry.

## 7. Feature flag

```env
NEXT_PUBLIC_STUDIO_PROVIDER_EXECUTION_ENABLED=false
```

The default is `false` in every environment. It gates future adapters whose `kind` is `real`. Local Mock execution remains available because it cannot make network calls or charge credits. No real adapter is registered, so changing the flag alone still cannot contact a provider.

## 8. Cost integration

`CapabilityCostRule` now uses `providerId`, allowing future rules to differ by Provider:

```ts
{
  capability: "motion_control",
  providerId: "mock",
  creditsRule: "free_mock"
}
```

P2-A5 adds no price and does not modify existing Video Generate pricing, credits, billing, or refund logic.

## 9. Executor migration

The migrated flow is:

```text
Video Edit / Motion / Camera Executor
  -> resolveProviderForCapability
  -> submitProviderJob
  -> getProviderJobStatus
  -> normalized result and Job Identity
  -> existing Result Asset and Timeline binding
```

Video Generate stays on its existing API, polling, identity, and charging path. It is represented in provider metadata for future alignment only.

## 10. Mock behavior

The Mock Provider supports:

- Video Edit: returns the source video reference.
- Motion Control: returns the motion reference video.
- Camera Control: returns the source image as a deterministic result reference.

Camera Control's reference is not a generated or playable video. All Mock results contain `mock: true` and `providerCalled: false`.

## 11. Future provider integration

Adding a real provider requires all of the following:

1. Implement the shared `ProviderAdapter` contract.
2. Normalize raw provider errors to the shared error codes.
3. Return all Job Identity fields without overloading `jobId`.
4. Register the adapter key and Provider metadata.
5. Add Capability and mode mappings.
6. Add Provider-specific cost rules from an approved pricing source.
7. Add contract tests for submit, delayed visibility, status, cancel, and failure.
8. Keep `NEXT_PUBLIC_STUDIO_PROVIDER_EXECUTION_ENABLED=false` until an approved controlled smoke.

Provider-specific HTTP payloads, credentials, and response parsing belong inside the adapter. They must not be added to Canvas nodes, Generation Queue logic, or generic Executors.

## 12. Compatibility and safety

- Canvas schema version is unchanged.
- No API was added.
- No database or migration was added.
- No Workspace file was modified.
- Existing Video Generate was not modified.
- No Provider was called.
- No credits or billing state was changed.
- No deploy or PM2 restart is part of this task.

## 13. Acceptance checklist

- [x] Provider Registry describes Provider capability and adapter mapping.
- [x] Shared submit/status/cancel/normalizeError contract exists.
- [x] Job Identity uses explicit client/provider/database/status IDs.
- [x] Video Edit resolves to the Mock Provider.
- [x] Motion Control resolves to the Mock Provider.
- [x] Camera Control resolves to the Mock Provider.
- [x] Metadata-only and unknown providers fail closed.
- [x] Error normalization contract tests pass.
- [x] Provider execution feature flag defaults to false.
- [x] Existing capability-specific Mock exports remain compatible.
