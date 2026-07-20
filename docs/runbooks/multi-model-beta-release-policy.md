# ShadowEdge Studio Multi-model Beta Release Policy

## Purpose

This policy translates provider-facing runtime readiness into user-facing model availability without changing provider parameters, pricing, billing, or the underlying execution contract.

Availability is presentation and release metadata. It cannot override runtime readiness, the Provider cost gate, or a verified parameter scope.

## Availability states

| Status | User meaning | Execution rule |
| --- | --- | --- |
| `AVAILABLE` | Production-supported model | Still requires runtime readiness and an allowed cost status |
| `BETA` | Real production validation passed, but rollout or cost evidence is scoped | Only approved verified scopes may execute |
| `LIMITED` | Executable only for a constrained scope and not promoted to Beta | Only approved verified scopes may execute |
| `COMING_SOON` | Model exists but is not released | Never executable |
| `BLOCKED` | A required contract or safety check failed | Never executable |

An Availability rule cannot promote a runtime `COMING_SOON` or `BLOCKED` model. This prevents UI metadata from opening a model that the backend has not admitted.

## Current model matrix

| Model | Availability | Runtime readiness | Verified scope | Provider cost status | Cost display |
| --- | --- | --- | --- | --- | --- |
| Kling 3.0 | `AVAILABLE` | `READY` | Full runtime catalog contract | `UNKNOWN` | Cost unavailable; execution hidden |
| Seedance 2.0 | `BETA` | `LIMITED` | `4s_480p_16_9_audio_false` | `PARTIAL` | Partially confirmed |
| Kling 2.6 | `BETA` | `LIMITED` | `5s_720p_16_9_audio_false` | `QUOTE_ONLY` | Estimated |
| Wan 2.7 | `BETA` | `LIMITED` | `5s_720p_16_9_audio_false` | `QUOTE_ONLY` | Estimated |
| Wan 2.6 | `BETA` | `LIMITED` | `5s_720p_16_9_audio_false` | `QUOTE_ONLY` | Estimated |

The four quote/partial-cost Beta entries have explicit release approval for their verified scopes. The policy does not imply that a quote is actual reconciled Provider cost.

## Model metadata

Studio derives the following UI contract from the authenticated Runtime Inventory plus the release policy:

```ts
{
  modelId,
  displayName,
  availability,
  badge,
  description,
  verifiedScopes,
  costStatus,
  executionAllowed
}
```

The Runtime Inventory remains authoritative for `readiness`, `executable`, limits, and `verifiedScopes`. The release policy supplies user-facing naming, badges, rollout state, and cost evidence classification.

## Selector behavior

The model selector uses compact labels:

- `Kling 3.0 — ✓ Available — Cost unavailable`
- `Seedance 2.0 — β Beta — 4s / 480p / 16:9 / audio off — Partially confirmed`
- `Kling 2.6 — β Beta — 5s / 720p / 16:9 / audio off — Estimated`
- `Wan 2.7 — β Beta — 5s / 720p / 16:9 / audio off — Estimated`
- `Wan 2.6 — β Beta — 5s / 720p / 16:9 / audio off — Estimated`

Unknown or unverified parameters are not shown. Parameter controls for `LIMITED` runtime models are populated only from `verifiedParameters`.

## Cost display

| Cost status | UI label | Execution default |
| --- | --- | --- |
| `VERIFIED` | Confirmed | Allowed after all other gates pass |
| `PARTIAL` | Partially confirmed | Allowed only inside the verified scope |
| `QUOTE_ONLY` | Estimated | Requires explicit release approval and a verified scope |
| `UNKNOWN` | Cost unavailable | Hidden/blocked |

These labels describe Provider cost evidence. They do not change ShadowEdge user credits, Billing, or the backend ledger.

## Execution gate

Generation Plan creation and execution require all of the following:

1. Availability is `AVAILABLE`, `BETA`, or `LIMITED`.
2. Runtime Readiness reports the model executable.
3. Cost policy allows execution (`UNKNOWN` never does; `QUOTE_ONLY` requires explicit approval).
4. For limited models, the selected parameters exactly match a verified scope.
5. Existing Studio feature flags and Provider readiness checks pass.

The existing Generation Queue and Video Executor continue to use the Runtime Inventory. No Canvas schema, Provider API, Video API, Billing, Credits, or database contract changes are introduced.

## Admin extension plan

A future Admin surface may manage release enablement, Beta rollout percentage, scope approval, and descriptions. It must write release metadata only. Runtime readiness, cost evidence, and verified parameter contracts remain separately controlled and fail closed.

## Rollback

Revert the Studio availability policy commit. The backend model inventory and execution infrastructure remain unchanged, so no data or schema rollback is required.
