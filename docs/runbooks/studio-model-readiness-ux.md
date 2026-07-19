# Studio Model Readiness UX

Date: 2026-07-19

## Outcome

P2-A38 exposes the backend Runtime Model Inventory directly in the Studio Video Generate inspector. The UI no longer treats an absent model as the only unavailable state: it shows executable, parameter-limited, planned, and blocked models with their reasons.

The change is display and validation only. It does not enable a Catalog model, alter Billing or user credits, call a Provider, or change the Video Generate executor.

## Readiness states

| Status | Meaning | Selectable | Generation Plan |
| --- | --- | --- | --- |
| `READY` | The runtime and complete model contract are admitted | Yes | Allowed |
| `LIMITED` | One or more exact parameter scopes are admitted | Yes | Allowed only for a verified scope |
| `COMING_SOON` | The model exists in the Catalog but is not enabled | No | Blocked |
| `BLOCKED` | Required model, limits, cost, or runtime contract is incomplete | No | Blocked |

The backend keeps `model.enabled` as the execution-compatible flag. It is true only for `READY` and `LIMITED` models. Existing executor and resolver consumers therefore remain fail closed.

## API contract

`GET /api/studio/provider-models` keeps its route and envelope. Each model adds:

```ts
readiness: {
  status: "READY" | "LIMITED" | "COMING_SOON" | "BLOCKED";
  executable: boolean;
  verifiedScopes: string[];
  verifiedParameters: Array<{
    duration: number;
    resolution: string;
    ratio: string;
    audio: boolean;
    mode: string;
    scopeKey: string;
  }>;
  blockers: string[];
}
```

Blocked and disabled Catalog entries are returned for display but have `enabled:false` and `readiness.executable:false`.

Current expected presentation:

| Model | Status | Execution behavior |
| --- | --- | --- |
| Kling 3.0 | `READY` | Existing Runtime Catalog behavior |
| Seedance 2.0 | `LIMITED` | Exact verified parameter variants only |
| Kling 2.6 | `COMING_SOON` | Visible, disabled, cost verification reason shown |

## Selector behavior

The Studio inspector shows status and reason in each model option and a dedicated readiness card for the current model:

```text
Kling 3.0      - Ready
Seedance 2.0   - Limited - 4s / 480p only
Kling 2.6      - Coming Soon - Cost verification pending
```

`COMING_SOON` and `BLOCKED` options cannot be selected. A legacy Canvas model value remains visible but cannot create a Generation Plan until it resolves to an executable inventory model.

## Parameter linkage

For `LIMITED` models, duration, resolution, ratio, mode, and audio controls are derived only from `verifiedParameters`. Changing one constrained field selects a complete admitted variant, avoiding invalid cross-product combinations.

Reference inputs are disabled when the selected model's backend media limits do not accept that media type. Existing Canvas v7 data remains readable; no Canvas schema upgrade is required.

Before plan creation, the same resolver checks the complete parameter combination. An unavailable combination returns `PROVIDER_COST_NOT_CONFIGURED`, displays a scope warning, and cannot enter Queue.

## Generation Plan and cost display

Video plan items continue to save `providerId` and `modelId` and now also save:

```ts
verifiedScope: string;
```

Parameter-scoped models use their exact cost-rule scope key. Existing admitted models without a scoped Provider rule use `runtime_catalog`.

The node Cost Preview displays:

```text
Estimated Cost: 12 credits
Scope: <verified scope>
```

If the model or parameters are not executable, it displays `Cost unavailable` and `Scope: Not verified - execution blocked`. It does not estimate from a frontend fallback.

## Compatibility and safety

- API route: unchanged.
- Database: unchanged.
- Canvas schema: remains v7.
- Video Generate executor: unchanged.
- Billing and credit rules: unchanged.
- Provider calls and smoke tasks: none.
- Workspace Video: unchanged; this UX is Studio-only.
