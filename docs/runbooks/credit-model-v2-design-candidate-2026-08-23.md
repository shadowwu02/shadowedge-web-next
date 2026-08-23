# Pricing Phase 2 — Credit Model v2 Design Candidate

Date: 2026-08-23

Status: `DESIGN_ONLY_NOT_PRODUCTION`

Phase 1 dependency: Public Plan Catalog `2026-08-23.v1`, Candidate `5ceee35d8307670f0d555ffb98281202df6c6b56`

## Decision

This candidate proposes a versioned customer Credit model and margin-governance framework. It does not change any executable price, plan, balance, ledger, payment, Membership, or public capability.

The current public price matrix stays frozen. Seedance 2.0 14s and Seedance 2.5 30s remain internal certification evidence and are excluded from public plan and pricing responses.

Real Provider monetary cost is not available for the active OOBB or Seedance routes. GPT Image 2 has contract estimates only. Therefore:

- no real gross-margin percentage can be certified;
- Credits must not be treated as Provider cost;
- Pro and Team are design scenarios, not sellable plans;
- a 30-second customer Credit amount remains `PENDING_COST_EVIDENCE`.

## 1. Evidence classification

| Classification | Meaning | Current models |
| --- | --- | --- |
| `REAL_PROVIDER_COST` | Reconciled invoice, trusted Provider receipt, or verified API monetary amount | None |
| `CONTRACT_ESTIMATE` | Signed/configured rate estimate that is not reconciled actual cost | GPT Image 2 |
| `UNKNOWN` | No trusted amount and currency | Nano Banana, Nano Banana Lite, current Seedance models |

Known GPT Image 2 contract estimates are USD 0.0084/0.0126/0.0168 for 1K/2K/4K. They are useful for shadow analysis only. OOBB and current Seedance cost events do not contain trusted monetary amounts.

Rule: customer Credits are an internal consumption unit. They are not a substitute for Provider currency cost and must never be used to infer it.

## 2. Current public consumption matrix

### Image

| Model | Public option | Current Credits | Cost evidence |
| --- | --- | ---: | --- |
| GPT Image 2 | low quality | 1 | `CONTRACT_ESTIMATE` |
| GPT Image 2 | medium quality | 2 | `CONTRACT_ESTIMATE` |
| GPT Image 2 | high quality | 4 | `CONTRACT_ESTIMATE` |
| Nano Banana | 1K | 2 | `UNKNOWN` |
| Nano Banana Lite | 1K | 2 | `UNKNOWN` |

GPT Image 2 customer Credits are quality-based even though the contract estimate varies by resolution. Credit Model v2 should eventually use a quality-by-resolution exact matrix, but no production change is approved in this phase.

### Video

| Model | Duration | Resolution | Current Credits | Audio | Cost evidence |
| --- | ---: | --- | ---: | --- | --- |
| Seedance 2.0 Mini | 5s | 720p | 23 | unsupported | `UNKNOWN` |
| Seedance 2.0 Fast | 5s | 720p | 12 | unsupported | `UNKNOWN` |
| Seedance 2.0 | 5s | 720p | 23 | included | `UNKNOWN` |
| Seedance 2.0 | 10s | 720p | 45 | included | `UNKNOWN` |
| Seedance 2.0 | 15s | 720p | 68 | included | `UNKNOWN` |
| Seedance 2.0 | 5s | 1080p | 45 | included | `UNKNOWN` |
| Seedance 2.0 | 10s | 1080p | 90 | included | `UNKNOWN` |
| Seedance 2.0 | 15s | 1080p | 135 | included | `UNKNOWN` |
| Seedance 2.5 | 5s | 720p | 23 | unsupported | `UNKNOWN` |

The Backend public Catalog still contains Mini 5s even though the Phase 2 brief did not list it. This proposal records the discrepancy and does not silently retire Mini. Any removal requires a separate public Catalog change.

The production Backend exact matrix remains authoritative. There is no executable global multiplier today.

## 3. Model pricing buckets

Two independent axes are required.

### Evidence bucket

- `VERIFIED_VARIABLE_COST`: no current model qualifies.
- `CONTRACT_ESTIMATE_ONLY`: GPT Image 2.
- `UNKNOWN_COST_HOLD`: Nano Banana, Nano Banana Lite, and all current Seedance models.

### Customer Credit bucket

- `IMAGE_QUALITY_EXACT`: GPT Image 2, currently 1/2/4 by quality.
- `IMAGE_RESOLUTION_EXACT`: Nano Banana and Lite, currently 1K=2 only.
- `VIDEO_FIXED_EXACT`: Mini 5s=23, Fast 5s=12, Seedance 2.5 5s=23.
- `VIDEO_DURATION_RESOLUTION_EXACT`: Seedance 2.0 exact matrix.
- `PENDING_COST_EVIDENCE`: every new public tuple, including Seedance 2.5 30s.

The evidence bucket never derives from customer Credits.

## 4. Duration structure proposal

Use structural multipliers for planning only; persist executable prices as exact versioned tuples.

| Duration | Structural multiplier | Public status |
| ---: | ---: | --- |
| 5s | 1.0x | current exact tuples only |
| 10s | 2.0x | current Seedance 2.0 exact tuples only |
| 15s | 3.0x | current Seedance 2.0 exact tuples only |
| 30s | 6.0x | `PENDING_COST_EVIDENCE`; no executable customer price |

Current Seedance 2.0 720p behaves like an unrounded 4.5 Credits/second planning curve: 5s=23, 10s=45, 15s=68. This observation must not be generalized to another model or used to activate 30s automatically.

For any future 30s approval:

1. verify real or contract Provider cost for that exact model/tuple;
2. calculate fully loaded variable cost;
3. apply the approved plan-level margin threshold;
4. round once at the final exact quote;
5. publish a versioned exact matrix entry.

Seedance 2.0 14s and Seedance 2.5 30s remain internal-only. Internal discovery charges are not customer prices.

## 5. Resolution structure proposal

| Resolution | Structural multiplier | Public status |
| --- | ---: | --- |
| 720p | 1.0x | current exact tuples only |
| 1080p | 2.0x | current Seedance 2.0 exact tuples only |

The 2x relationship matches the current Seedance 2.0 matrix. It is not a universal Provider cost claim. GPT Image 2 and Nano Banana must each use their own exact resolution matrix because their transports and cost evidence differ.

No 2K/4K Image or new Video resolution price is activated by this proposal.

## 6. Audio strategy

Current Seedance 2.0 behavior is `audioAddonCredits=0`; audio is bundled. Other listed public Seedance models do not expose audio.

Proposal:

```text
audioAddonCredits = 0
  when the exact public tuple explicitly bundles audio

audioAddonCredits = ceil(incrementalAudioVariableCost /
                         allowedVariableCostPerCredit)
  only when incremental audio cost is verified

audioAddonCredits = PENDING_COST_EVIDENCE
  when incremental audio cost is unknown
```

Do not invent a flat audio surcharge. The Frontend must display `Included`, an exact Backend-provided addon, or `Unavailable`; it must not estimate locally.

## 7. Plan consumption

### Current Starter display contract

- USD 49
- 1,200 Credits/month
- gross value per granted Credit: `49 / 1200 = USD 0.040833`

This is gross allocation, not Provider cost or net revenue.

| Operation | Credits | Gross Starter value allocated | Full operations from 1,200 Credits |
| --- | ---: | ---: | ---: |
| GPT Image 2 low | 1 | USD 0.0408 | 1,200 |
| Nano/Lite or GPT Image 2 medium | 2 | USD 0.0817 | 600 |
| GPT Image 2 high | 4 | USD 0.1633 | 300 |
| Seedance Fast 5s 720p | 12 | USD 0.4900 | 100 |
| Seedance Mini/2.0/2.5 5s 720p | 23 | USD 0.9392 | 52 |
| Seedance 2.0 10s 720p or 5s 1080p | 45 | USD 1.8375 | 26 |
| Seedance 2.0 15s 720p | 68 | USD 2.7767 | 17 |
| Seedance 2.0 10s 1080p | 90 | USD 3.6750 | 13 |
| Seedance 2.0 15s 1080p | 135 | USD 5.5125 | 8 |

## 8. Starter / Pro / Team design scenarios

These are proposal inputs only and are not added to the Public Plan Catalog.

| Plan | Proposed display price | Proposed Credits | Gross USD/Credit | Discount vs Starter | Gate |
| --- | ---: | ---: | ---: | ---: | --- |
| Starter | USD 49 | 1,200 | 0.040833 | 0% | current display contract |
| Pro | USD 99 | 2,700 | 0.036667 | 10.20% | real-cost and margin approval |
| Team | USD 249 | 7,500 | 0.033200 | 18.69% | real-cost, margin, and Team entitlement readiness |

| Operation | Credits | Starter operations | Pro operations | Team operations |
| --- | ---: | ---: | ---: | ---: |
| 2-Credit Image | 2 | 600 | 1,350 | 3,750 |
| Fast 5s 720p | 12 | 100 | 225 | 625 |
| Standard 5s 720p | 23 | 52 | 117 | 326 |
| Seedance 2.0 10s 720p | 45 | 26 | 60 | 166 |
| Seedance 2.0 15s 720p | 68 | 17 | 39 | 110 |
| Seedance 2.0 15s 1080p | 135 | 8 | 20 | 55 |

Pro and Team reduce revenue per Credit. They must remain blocked until actual cost evidence proves that the discount does not violate the contribution-margin floor. Team also depends on separately completed Team management and entitlement contracts.

## 9. Gross-margin simulation

### Formula

```text
grossAllocatedRevenue = creditsCharged * grossUSDPerCredit

fullyLoadedVariableCost =
  Provider cost
  + storage
  + egress
  + materialization compute
  + payment fees/tax allocation
  + refund reserve
  + promotional Credit allocation

simulatedContributionMargin =
  (grossAllocatedRevenue - fullyLoadedVariableCost)
  / grossAllocatedRevenue
```

The output is a simulation until both net plan revenue and Provider cost are reconciled.

### Cost ceiling at a 70% target margin

| Plan | Gross USD/Credit | Maximum fully loaded variable cost/Credit |
| --- | ---: | ---: |
| Starter | 0.040833 | 0.012250 |
| Pro | 0.036667 | 0.011000 |
| Team | 0.033200 | 0.009960 |

### Starter sensitivity examples — hypothetical costs, not Provider evidence

| Credits | Allocated value | Low hypothetical cost | Margin | Mid hypothetical cost | Margin | Stress hypothetical cost | Margin |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 0.0817 | 0.02 | 75.5% | 0.05 | 38.8% | 0.10 | -22.4% |
| 12 | 0.4900 | 0.10 | 79.6% | 0.25 | 49.0% | 0.50 | -2.0% |
| 23 | 0.9392 | 0.25 | 73.4% | 0.50 | 46.8% | 1.00 | -6.5% |
| 45 | 1.8375 | 0.50 | 72.8% | 1.00 | 45.6% | 2.00 | -8.8% |
| 68 | 2.7767 | 0.75 | 73.0% | 1.50 | 46.0% | 3.00 | -8.0% |
| 135 | 5.5125 | 1.50 | 72.8% | 3.00 | 45.6% | 6.00 | -8.8% |

These rows show sensitivity only. None of the hypothetical dollar costs is attributed to OOBB, DeRouter, or Seedance.

## 10. Proposed quote contract

```text
CreditQuoteV2
  pricingVersion
  scope: PUBLIC_CUSTOMER | INTERNAL_DISCOVERY
  approvalStatus:
    PUBLIC_APPROVED
    INTERNAL_DISCOVERY_ONLY
    PENDING_COST_EVIDENCE
  model
  durationSeconds
  resolution
  audio
  referenceMode
  baseCredits
  durationCredits
  resolutionCredits
  audioAddonCredits
  referenceAddonCredits
  totalCredits
  providerCostEvidence:
    REAL_PROVIDER_COST
    CONTRACT_ESTIMATE
    UNKNOWN
  effectiveFrom
```

Invariants:

- Backend exact quote remains the final charge authority.
- Missing public tuple fails before Job/Credit/Provider.
- Internal discovery quotes never appear in public Catalog responses.
- Frontend displays the Backend quote and never calculates executable prices locally.
- Proposal files are not imported by runtime code.

## 11. Approval gates

Recommended target contribution margin: 70% after fully loaded variable costs.

- warning below 65%;
- block public approval below 60%;
- block when cost evidence is `UNKNOWN`;
- block on mixed/unknown currency;
- block Pro/Team until discount-specific margin passes;
- block Team until Team management and entitlements are ready.

Evidence still required:

1. OOBB invoice/export or trusted receipts for Nano and Lite, segmented by resolution and reference mode.
2. Current Seedance rate card or billing export segmented by model, duration, resolution, and audio.
3. Provider-native ID reconciliation into `provider_cost_events`.
4. Net plan revenue allocation after payment fees, taxes, refunds, promotions, and unused Credits.

## 12. Safety result

This candidate adds documentation, a machine-readable proposal, and validation tests only.

It does not modify:

- Public Plan Catalog values;
- Billing or Stripe;
- Membership or Team entitlements;
- Credit Ledger, balances, or transactions;
- Image or Video public pricing;
- public model capability;
- Provider routing or generation.

Final:

`CREDIT_MODEL_V2_DESIGN_READY=YES`

`REAL_PROVIDER_COST_AVAILABLE=NO`

`PRODUCTION_PRICE_CHANGED=NO`

`BILLING_CHANGED=NO`
