# Team Management Foundation Design v1

Date: 2026-08-23

Status: `DESIGN_ONLY_NOT_PRODUCTION`

Scope: architecture audit and proposal only. This candidate does not change Billing, Stripe, customer Tenant Membership, Credit ledger, runtime permissions, data, or production configuration.

## 1. Executive decision

ShadowEdge should add Organization as a product collaboration scope **inside one existing Tenant**, not use Tenant as an Organization and not reuse `customer_tenant_memberships` as team membership.

The target hierarchy is:

`Tenant -> Organization -> Workspace -> Team -> Project / Shared Asset / Generation`

The authenticated `user_id` remains the actor and canonical creator. `tenant_id` remains the immutable brand/isolation boundary. `organization_id` adds collaboration and billing attribution only after an explicit future migration.

Organization v1 has three canonical roles: `OWNER`, `ADMIN`, and `MEMBER`. The existing six Workspace roles remain a compatible lower-level project/workspace authorization system; this phase does not rewrite or migrate them.

Personal Credits remain on the existing user-and-Tenant Credit account and transaction contract. Organization Credits require a separate future account and append-only ledger. There is no automatic fallback between the two balances.

Shared Assets and Projects use explicit Organization grants/links. Existing personal Assets and Projects remain private and unchanged. Tenant membership alone never grants visibility to all Assets in that Tenant.

## 2. Current-system audit

This audit is source-backed against the current Frontend, Backend, and Admin repositories. It does not claim that the existing JSONL Enterprise foundation is a production-ready database implementation.

| Area | Current implementation | Reusable | Missing / unsafe to reuse directly |
| --- | --- | --- | --- |
| User | Supabase `auth.users` plus `profiles`; authenticated `user_id` is used as actor/owner | User identity, profile status, authentication middleware | No Organization invitation lifecycle or Organization role |
| Tenant membership | `customer_tenant_memberships` resolves exactly one active customer Tenant; `tenant_id` is immutable across Jobs, Assets, Credits, Studio and Remake records | Brand isolation, active customer eligibility, same-Tenant validation | It describes customer-to-brand ownership, not a Team role. Never turn it into Organization membership or auto-bind users |
| Personal Credits | `tenant_credit_accounts` is keyed by `(tenant_id, user_id)` and `credit_transactions` carries `tenant_credit_account_id`; generation/refund paths are user-account based | Existing personal balance, exactly-once consume/refund, tenant attribution, Admin financial reads | No Organization account, no Organization receipt, and no safe mixed personal/team debit RPC |
| Assets | `media_assets` has canonical UUID owner `user_id`, Tenant attribution, readiness/storage metadata, and owner-based access; generated assets can carry Job lineage | Canonical identity, owner/tenant/job lineage, READY/storage validation | No explicit Organization share grant. Tenant-wide reads would over-share customer data |
| Studio Projects | `studio_projects` is owner-scoped by `user_id`; service/repository queries are personal; existing Tenant hardening adds Tenant attribution in production paths | Project UUID, owner, Tenant, canvas contract, existing collaboration permission concepts | No durable Organization/Workspace link or Organization access policy |
| Enterprise Workspace foundation | `/api/organizations` and `/api/workspaces` contracts, Organization/Workspace/Team projections, six Workspace roles, permission helpers, read/display UI | API shapes, UI shell, Workspace permission engine, compatibility tests, read-only Tenant projection | Append-only local JSONL is not the authoritative production DB; a Tenant projection must not become a writable Organization; current roles are Workspace roles, not the requested Organization role set |
| Permissions | Frontend/Backend Workspace roles: Owner, Admin, Manager, Creator, Reviewer, Viewer. Admin app separately uses platform/Tenant Admin permissions | Permission-check pattern, default-deny guards, distinct platform Admin boundary | Missing product Organization permissions for Generate, Assets, Credits, Invites and Billing |
| Admin | Tenant Admin session/permission guards and separate production operations such as customer and Tenant Membership operations | Authentication, 401/403 semantics, safe audit/correlation patterns | Organization operations and Organization Credit operations need new explicit platform permissions; product Organization role must never grant platform Admin access |

### Reuse boundary

Reuse the concepts and read APIs from the Enterprise Workspace foundation, but replace JSONL authority with transactional database tables before runtime Team permissions or Credits are enabled. Keep the JSONL routes in compatibility/read-only mode during migration; do not dual-authorize from two mutable sources.

## 3. Identity and isolation invariants

1. Every Organization belongs to exactly one active `tenant_id`; Organization Tenant identity is immutable.
2. An Organization member must be the same `user_id` as an active `customer_tenant_membership` in that Organization's Tenant.
3. Organization membership never creates, moves, binds, removes, or repairs `customer_tenant_memberships`.
4. A user may join multiple Organizations only within the user's resolved Tenant. Cross-Tenant invites fail closed.
5. `user_id` remains actor/creator on every Job, Asset, Project edit, Credit operation and audit event.
6. The server resolves user and Tenant. The client may select an Organization but cannot assert Tenant, role, balance, owner or billing authority.
7. Membership revocation blocks future Organization reads/writes/charges immediately but preserves historical attribution and audit records.
8. Product Organization roles never imply platform Admin permissions.

## 4. Organization role and permission model

Canonical Organization roles:

- `OWNER`: exactly one active owner; can administer the Organization and Billing boundary.
- `ADMIN`: manages members, shared work, usage and Organization Credits within approved operations, but cannot transfer ownership or perform platform adjustments.
- `MEMBER`: creates and uses shared work according to Organization policy; cannot administer membership, Credits or Billing.

Canonical permission keys:

- `ORGANIZATION_VIEW`
- `ORGANIZATION_MANAGE`
- `MEMBER_VIEW`
- `MEMBER_INVITE`
- `MEMBER_MANAGE`
- `GENERATE_WITH_ORGANIZATION_CREDITS`
- `CREDIT_BALANCE_VIEW`
- `CREDIT_USAGE_VIEW`
- `CREDIT_MANAGE`
- `ASSET_VIEW_SHARED`
- `ASSET_SHARE`
- `PROJECT_VIEW`
- `PROJECT_CREATE`
- `PROJECT_MANAGE`
- `BILLING_VIEW`
- `BILLING_MANAGE`
- `OWNERSHIP_TRANSFER`

### Permission matrix

| Capability | Owner | Admin | Member | Notes |
| --- | :---: | :---: | :---: | --- |
| View Organization | Yes | Yes | Yes | Active same-Tenant membership required |
| Generate with Organization Credits | Yes | Yes | Yes | Also requires policy enabled, balance, model access and normal admission |
| View shared Assets | Yes | Yes | Yes | Explicit shared grant only; never all Tenant Assets |
| Share own eligible Asset | Yes | Yes | Yes | Canonical READY and same Tenant; Organization policy may narrow this |
| View Team Projects | Yes | Yes | Yes | Explicit Organization Project link and project permission required |
| Create Team Project | Yes | Yes | Yes | Creator remains `user_id` |
| Manage all Team Projects | Yes | Yes | No | Member can manage only own/project-granted scope |
| View members | Yes | Yes | Yes | Return minimal profile projection, not private account fields |
| Invite members | Yes | Yes | No | Invite cannot auto-create Tenant membership |
| Change member role/remove member | Yes | Yes | No | Admin cannot remove/demote Owner or promote to Owner |
| View Organization Credit balance/usage | Yes | Yes | No | Member sees per-operation charge in own activity only |
| Manage Organization Credits | Yes | Yes | No | Means policy/budget operations; no hidden minting or direct balance edit |
| View Billing | Yes | No | No | Financial owner boundary |
| Manage Billing | Yes | No | No | Future separate Billing phase only |
| Transfer ownership/delete Organization | Yes | No | No | Step-up auth and exactly one successor required |

### Compatibility with existing Workspace roles

Organization and Workspace authorization are separate layers:

| Organization role | Default Workspace projection for a newly created Workspace | Existing Workspace memberships |
| --- | --- | --- |
| `OWNER` | `OWNER` | Preserve explicit role |
| `ADMIN` | `ADMIN` | Preserve explicit role |
| `MEMBER` | no implicit write role; explicit membership defaults to `CREATOR` | Preserve Manager/Creator/Reviewer/Viewer exactly |

Organization permission opens the outer scope; Workspace/Project permission still controls the inner resource. No existing six-role record is rewritten in v1.

## 5. Database proposal

All tables are future proposals. No SQL is included or executed in this candidate.

### 5.1 `organizations`

| Column | Contract |
| --- | --- |
| `id uuid primary key` | Server generated |
| `tenant_id uuid not null` | FK to `tenants`; immutable |
| `slug text not null` | Unique inside Tenant |
| `name text not null` | Validated display name |
| `status text not null` | `active`, `suspended`, `archived` |
| `owner_user_id uuid not null` | Active same-Tenant customer and active OWNER member |
| `created_by uuid not null` | Actor |
| `created_at`, `updated_at` | Timestamps |
| `version bigint not null` | Optimistic concurrency |

Constraints: unique `(tenant_id, slug)`, unique `(id, tenant_id)`, immutable `tenant_id`, exactly one active owner enforced transactionally with `organization_members`.

There is deliberately no `credits_balance`, Stripe customer, subscription or payment column on this table.

### 5.2 `organization_members`

| Column | Contract |
| --- | --- |
| `id uuid primary key` | Server generated |
| `organization_id`, `tenant_id`, `user_id` | Composite same-scope identity |
| `role text not null` | `OWNER`, `ADMIN`, `MEMBER` |
| `status text not null` | `active`, `suspended`, `revoked` |
| `invited_by`, `accepted_at`, `revoked_at` | Lifecycle attribution |
| `created_at`, `updated_at`, `version` | Concurrency/audit support |

Constraints: unique `(organization_id, user_id)`, FK `(tenant_id, user_id)` to current customer Tenant membership scope, immutable Organization/User/Tenant identity, one active OWNER. Service admission also verifies the referenced customer membership is currently active.

### 5.3 `organization_invites`

| Column | Contract |
| --- | --- |
| `id`, `organization_id`, `tenant_id` | Scope |
| `email_normalized_hash` | Lookup/dedup without broad email disclosure |
| `encrypted_email` | Optional delivery-only storage with restricted access |
| `role` | `ADMIN` or `MEMBER`; never OWNER |
| `status` | `pending`, `accepted`, `expired`, `revoked` |
| `token_hash`, `expires_at` | Store no plaintext token |
| `invited_by`, `accepted_by`, timestamps | Actor/audit |

Accepting an invite requires an already authenticated user with an active customer membership in the same Tenant. It must not auto-bind Tenant Membership.

### 5.4 `organization_asset_grants`

| Column | Contract |
| --- | --- |
| `organization_id`, `tenant_id`, `asset_id` | Explicit shared Asset scope |
| `granted_by` | Actor who shared it |
| `access` | `view` or future constrained reuse mode |
| `status` | `active`, `revoked` |
| timestamps | Audit support |

Constraints: unique `(organization_id, asset_id)`, Asset must be Canonical READY and same Tenant, grant actor must own the Asset or have an approved admin permission. The original `media_assets.user_id`, Tenant, source Job lineage and storage contract never change. Revoking a grant does not delete the Asset.

### 5.5 `organization_project_links`

| Column | Contract |
| --- | --- |
| `organization_id`, `workspace_id`, `tenant_id`, `project_id` | Explicit collaboration scope |
| `linked_by` | Actor |
| `status` | `active`, `archived`, `revoked` |
| timestamps | Audit support |

Constraints: one active scope per Project for v1; Project and Organization must share Tenant. `studio_projects.user_id` remains creator/owner. Existing Projects are not auto-linked or backfilled.

### 5.6 `organization_credit_accounts` — future ledger phase

| Column | Contract |
| --- | --- |
| `id`, `organization_id`, `tenant_id` | One account per active Organization |
| `balance numeric not null` | Non-negative materialized balance |
| `status`, `version`, timestamps | Locking/lifecycle |

### 5.7 `organization_credit_ledger_entries` — future ledger phase

| Column | Contract |
| --- | --- |
| `id`, `organization_credit_account_id`, `organization_id`, `tenant_id` | Financial scope |
| `actor_user_id` | Who caused the entry |
| `generation_job_id` | Optional immutable Job attribution |
| `entry_type` | `GRANTED`, `CONSUMED`, `REFUNDED`, `EXPIRED`, `ADJUSTED` |
| `amount`, `balance_before`, `balance_after` | Signed entry plus verified snapshots |
| `idempotency_key`, `source_receipt_id` | Exactly-once identity |
| `reason_code`, `metadata` | Safe structured reason; no secrets/provider payload |
| `created_at` | Immutable timestamp |

This is a separate ledger proposal. It does not extend `credit_transactions` with nullable owner types and does not reuse a user's `tenant_credit_account_id`. A future atomic RPC creates the Job, selects exactly one billing source and consumes from that account in one transaction.

### 5.8 `organization_audit_events`

Immutable safe events for Organization creation, membership/invite/role changes, Asset grants, Project links, Credit policy changes and future billing administration. Store actor, Organization/Tenant scope, target type/id, safe before/after fields, correlation ID and timestamp. Do not store invitation tokens, full email lists, provider payloads, prompts, secrets or signed URLs.

## 6. Shared Credit design

### Personal Credits

- Continue using the existing `tenant_credit_accounts` and `credit_transactions` contracts.
- A personal Job continues to carry the authenticated actor and existing Tenant account attribution.
- Existing personal consume/refund/idempotency behavior is unchanged.

### Organization Credits

- Introduce only in a separately approved ledger phase after schema/RPC/replay/refund testing.
- A Team generation request contains an Organization selection, but the server resolves active Organization membership, same Tenant, permission and account.
- Persist `billing_scope = ORGANIZATION`, `billing_organization_id`, and the Organization Credit receipt on the Job/Operation in that later phase.
- Consume and Job creation must be atomic. Provider submission remains after successful admission and reservation/consume contract.
- Refund always returns exactly once to the account named by the original immutable receipt.
- Insufficient Organization balance fails closed. Never silently charge Personal Credits.
- Lost/expired Organization membership fails closed. Never silently retry under another billing source.
- Per-member budgets, daily caps and model policies are authorization policy, not balance mutation.

No current Credit table, RPC, balance, price or transaction is changed by this design candidate.

## 7. API proposal

Every endpoint requires authenticated user, resolved active customer Tenant membership, same-Tenant Organization scope and server-side permission checks. Responses are private/no-store. Client-provided `tenantId`, role, owner, balance and billing authority are ignored or rejected.

### Organization and membership

- `GET /api/organizations`
- `POST /api/organizations`
- `GET /api/organizations/:organizationId`
- `PATCH /api/organizations/:organizationId`
- `GET /api/organizations/:organizationId/members`
- `POST /api/organizations/:organizationId/invites`
- `POST /api/organizations/:organizationId/invites/:inviteId/accept`
- `DELETE /api/organizations/:organizationId/invites/:inviteId`
- `PATCH /api/organizations/:organizationId/members/:memberId`
- `DELETE /api/organizations/:organizationId/members/:memberId`
- `POST /api/organizations/:organizationId/ownership-transfer`

Mutation rules: idempotency key required, optimistic version required for role/status changes, last Owner cannot be removed, Admin cannot mutate Owner, and every mutation writes one safe audit event.

### Shared Assets and Projects

- `GET /api/organizations/:organizationId/assets`
- `POST /api/organizations/:organizationId/assets/:assetId/grants`
- `DELETE /api/organizations/:organizationId/assets/:assetId/grants`
- `GET /api/organizations/:organizationId/projects`
- `POST /api/organizations/:organizationId/projects/:projectId/links`
- `DELETE /api/organizations/:organizationId/projects/:projectId/links`

List endpoints join through active explicit grants/links; they do not query all rows by `tenant_id`.

### Credits — future, disabled in Foundation

- `GET /api/organizations/:organizationId/credits`
- `GET /api/organizations/:organizationId/credits/ledger`
- `PATCH /api/organizations/:organizationId/credit-policy`
- `POST /api/admin/organizations/:organizationId/credit-adjustments`

The Admin mutation needs a new platform permission such as `ORGANIZATION_CREDIT_OPERATIONS`, reason, idempotency key, atomic RPC and audit. `CUSTOMER_OPERATIONS` does not implicitly authorize Organization Credits.

### Generation — future, disabled in Foundation

Extend the normal generation contract later with a billing selection such as `{ scope: "organization", organizationId }`. The server resolves all remaining attribution and stores a single immutable billing receipt. Do not add a parallel Provider route.

## 8. Admin proposal

Add read-only Organization list/detail/member/usage/Asset/Project views first. Keep platform permissions independent from product roles:

- `ORGANIZATION_READ`
- `ORGANIZATION_OPERATIONS`
- `ORGANIZATION_CREDIT_READ`
- `ORGANIZATION_CREDIT_OPERATIONS`

401 means not authenticated; 403 means authenticated without the explicit platform permission. Product Organization Owner/Admin does not gain access to `admin.shadowedgeai.com`.

Admin outputs should show safe identifiers and correlation IDs, not invitation tokens, signed Asset URLs, raw ledger metadata, provider payloads, SQL or credentials.

## 9. Phased implementation plan

### Phase A — Foundation audit (this candidate)

- Documentation and architecture validation only.
- No runtime code, SQL, data, route, permission or production change.

### Phase B — Additive Organization directory

- Add Organization/member/invite/audit tables with RLS/service contracts.
- Import no users and create no Organizations automatically.
- Implement read APIs first; shadow-compare against current JSONL/legacy projections without authorizing from shadow results.

Gate: cross-Tenant, last-Owner, invite-token, role escalation, 401/403, audit privacy and idempotency tests pass.

### Phase C — Explicit shared Assets and Projects

- Add grant/link tables and read-only lists.
- Add explicit share/link mutations behind feature flags.
- Preserve Canonical ownership and personal Project access.

Gate: current-Tenant isolation, revoked member behavior, Canonical Picker/Studio/Remake compatibility and no legacy backfill pass.

### Phase D — Organization Credit ledger foundation

- Separate schema/RPC candidate and formal financial review.
- Shadow-only account/ledger validation; no generation charges.
- Reconcile consume/refund/replay/idempotency and Admin adjustment permissions.

Gate: exactly-once, crash/replay, refund-to-source, no personal fallback and finance reconciliation pass.

### Phase E — Controlled Team generation

- One allowlisted Organization, one model path, explicit billing selection.
- Provider flow remains unchanged after admission.
- Expand only after Job, Asset, Credit, Admin visibility and rollback certification.

### Phase F — Billing integration

- Separate Billing/Stripe project only after Organization Credits are stable.
- No Billing design in this Foundation authorizes subscription or payment changes.

## 10. Migration plan

1. Apply additive tables only; do not add non-null Organization fields to existing business rows.
2. Keep all existing rows personal. No Organization inference from email domain, Tenant, past Jobs, Assets or Projects.
3. Create an Organization only through an explicit authorized action.
4. Add members only through an explicit same-Tenant invite/accept or authorized Admin operation. Never create customer Tenant membership.
5. Use explicit Asset grants and Project links; no historical backfill.
6. Keep current personal generation and Credit RPCs authoritative until the Organization financial gate passes.
7. During cutover, use one authoritative Organization store. JSONL compatibility may be read for comparison, never as a second writer/authorization source.
8. Feature flags default off by Tenant, Organization and capability. Shadow reads must have no authorization or financial effect.

## 11. Rollback plan

- Disable Organization write and shared-resource flags; personal paths continue unchanged.
- Disable Organization Credit selection; do not convert pending Organization jobs to Personal billing.
- Preserve Organization tables/audit/ledger read-only for investigation; never delete financial or membership history as rollback.
- Revoke active invite acceptance and Organization generation routes while retaining safe list/detail reads for support.
- Remove no existing Asset or Project. Revoking grants/links only removes Organization visibility.
- If an Organization financial transaction has ever been enabled, rollback uses a separately approved compensating ledger entry—not SQL balance edits, row deletion or reassignment to Personal Credits.
- The JSONL Enterprise foundation remains non-authoritative and can be disabled independently after DB cutover.

## 12. Architecture validation gates

Before any production implementation can be approved:

- Organization/Tenant identity is immutable and every member is same-Tenant.
- Tenant Membership and Organization Membership remain distinct with zero automatic binding/migration.
- Owner/Admin/Member permission matrix is enforced server-side and last Owner is protected.
- Existing Workspace roles remain compatible and unmodified.
- Shared Assets require explicit grants and preserve Canonical owner/Tenant/Job lineage.
- Team Projects require explicit links and preserve creator/owner.
- Personal Credits and current `credit_transactions` remain unchanged.
- Organization Credits use a separate exactly-once account/ledger and never fall back to Personal Credits.
- Admin permissions are explicit and separate from product roles.
- Invite/audit privacy, idempotency, cross-Tenant isolation, replay and rollback tests pass.

## 13. Candidate safety statement

- Billing changed: `NO`
- Stripe changed: `NO`
- Customer Tenant Membership migrated or mutated: `NO`
- Credit ledger changed: `NO`
- Credits changed: `NO`
- Assets or Projects mutated: `NO`
- Runtime permissions changed: `NO`
- Production changed: `NO`
