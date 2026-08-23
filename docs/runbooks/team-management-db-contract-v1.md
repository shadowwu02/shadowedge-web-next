# Team Management P0 — Database Contract Design v1

Date: 2026-08-23

Status: `DESIGN_ONLY_NOT_PRODUCTION`

Parent design: `team-management-design-v1.md`

This candidate defines a database contract only. It contains no executable migration, applies no schema, seeds no role, creates no Organization, changes no customer Tenant Membership, and changes no Billing or Credit ledger behavior.

## 1. Contract decisions

1. An Organization is a product collaboration scope inside exactly one existing Tenant.
2. `customer_tenant_memberships` remains the authoritative customer-to-Tenant relationship. It is neither migrated nor reused as Organization membership.
3. Organization v1 roles are fixed system roles: `OWNER`, `ADMIN`, `MEMBER`.
4. Roles and permissions are normalized catalogs. `organization_role_permissions` is the required many-to-many mapping table.
5. The server resolves the authenticated user and active Tenant. A client cannot assign its own Tenant, role, owner, permission, or Organization Credit authority.
6. Organization membership grants access only to that Organization. Tenant membership never shares every Tenant resource.
7. Assets and Projects are shared only by explicit future permission rows; canonical ownership and lineage remain unchanged.
8. Organization Credits are schema-reserved for a later financial phase. The current `tenant_credit_accounts` and `credit_transactions` contracts remain untouched.
9. Product Organization permissions and platform Admin permissions are separate authorization systems.

## 2. Conventions

### Identifiers

- Business rows use server-generated UUID primary keys.
- Small immutable catalogs may use `smallint` primary keys plus stable unique text keys.
- External APIs expose UUIDs and stable permission keys, never sequential catalog IDs as authority.

### Tenant scope

- Every Organization-owned business table carries both `organization_id` and `tenant_id`.
- Composite foreign keys `(organization_id, tenant_id)` prevent cross-Tenant Organization references.
- `tenant_id`, `organization_id`, member `user_id`, and resource identity are immutable after insert.

### Audit columns

Mutable lifecycle tables use:

- `created_at timestamptz not null`
- `created_by uuid not null`
- `updated_at timestamptz not null`
- `updated_by uuid not null`
- `row_version bigint not null default 1`

Lifecycle removal uses explicit status and actor/timestamp columns. `updated_at` alone is not sufficient audit evidence. Security-sensitive mutations also append an immutable `organization_audit_events` row.

### Soft deletion

- No Organization, member, invite, role binding, resource permission, financial account, or audit row is hard-deleted by product APIs.
- Organization: `status='ARCHIVED'`, `archived_at`, `archived_by`.
- Member: `status='REVOKED'`, `revoked_at`, `revoked_by`.
- Invite: terminal `ACCEPTED`, `EXPIRED`, or `REVOKED` plus terminal actor/time.
- Resource permission: `status='REVOKED'`, `revoked_at`, `revoked_by`.
- Roles, permissions and immutable audit events cannot be deleted through runtime APIs.

## 3. Core schema contract

The following is a relational contract, not executable SQL.

### 3.1 `organizations`

Purpose: durable Organization identity inside one Tenant.

| Column | Type / nullability | Contract |
| --- | --- | --- |
| `id` | `uuid primary key` | Server generated |
| `tenant_id` | `uuid not null` | FK `tenants(id)`, immutable |
| `slug` | `text not null` | Normalized lowercase slug, unique inside Tenant |
| `name` | `text not null` | 1–160 characters |
| `status` | `text not null` | `ACTIVE`, `SUSPENDED`, `ARCHIVED` |
| `created_at` | `timestamptz not null` | Server clock |
| `created_by` | `uuid not null` | FK `auth.users(id)`; actor |
| `updated_at` | `timestamptz not null` | Server clock |
| `updated_by` | `uuid not null` | FK `auth.users(id)`; actor |
| `row_version` | `bigint not null` | Optimistic concurrency |
| `archived_at` | `timestamptz null` | Soft deletion timestamp |
| `archived_by` | `uuid null` | FK `auth.users(id)` |

Primary key: `id`.

Foreign keys:

- `tenant_id -> tenants(id) ON DELETE RESTRICT`
- `created_by`, `updated_by`, `archived_by -> auth.users(id) ON DELETE RESTRICT`

Unique constraints:

- `UNIQUE (id, tenant_id)` for composite child references.
- Partial unique normalized slug: `(tenant_id, lower(slug)) WHERE status <> 'ARCHIVED'`.

Indexes:

- `(tenant_id, status, created_at desc)`
- `(created_by, created_at desc)` for actor investigations, not authorization

Owner identity is derived from the single active `OWNER` row in `organization_members`; it is not duplicated as a mutable balance/owner field on `organizations`. An invariant trigger/RPC validates exactly one active Owner after an ownership transaction.

### 3.2 `organization_roles`

Purpose: immutable system role catalog.

| Column | Type / nullability | Contract |
| --- | --- | --- |
| `id` | `smallint primary key` | Stable seeded identifier |
| `role_key` | `text not null unique` | `OWNER`, `ADMIN`, `MEMBER` only in v1 |
| `display_name` | `text not null` | UI label, not authorization input |
| `rank` | `smallint not null unique` | Owner highest; used only for policy comparison |
| `is_system` | `boolean not null` | Always true in v1 |
| `assignable_by_admin` | `boolean not null` | False for Owner; ownership uses dedicated RPC |
| `created_at` | `timestamptz not null` | Seed audit |
| `updated_at` | `timestamptz not null` | Catalog maintenance audit |

Primary key: `id`.

Unique constraints: `role_key`, `rank`.

Indexes: the unique indexes are sufficient for v1 cardinality.

Soft delete: prohibited. A future deprecation uses a new immutable `status` contract and separate migration; it never removes a role referenced by history.

### 3.3 `organization_permissions`

Purpose: immutable product permission catalog.

| Column | Type / nullability | Contract |
| --- | --- | --- |
| `id` | `smallint primary key` | Stable seeded identifier |
| `permission_key` | `text not null unique` | Server authorization key |
| `description` | `text not null` | Safe operator description |
| `risk_class` | `text not null` | `READ`, `CONTENT_WRITE`, `MEMBERSHIP_WRITE`, `FINANCIAL_POLICY` |
| `created_at`, `updated_at` | `timestamptz not null` | Catalog audit |

Required v1 permission keys:

- `ORGANIZATION_VIEW`
- `MEMBER_VIEW`
- `MEMBER_INVITE`
- `MEMBER_REMOVE`
- `PROJECT_VIEW`
- `PROJECT_CREATE`
- `PROJECT_MANAGE`
- `ASSET_VIEW`
- `ASSET_SHARE`
- `ASSET_MANAGE`
- `CREDIT_BALANCE_VIEW`
- `CREDIT_USAGE_VIEW`
- `CREDIT_POLICY_MANAGE`
- `GENERATE_WITH_ORGANIZATION_CREDITS`
- `ORGANIZATION_MANAGE`
- `OWNERSHIP_TRANSFER`

Primary key: `id`. Unique constraint/index: `permission_key`.

Soft delete: prohibited. Runtime APIs cannot modify this catalog.

`CREDIT_POLICY_MANAGE` means future budget/model/member policy management. It never authorizes Credit minting, direct balance edits, Billing changes, Stripe actions, or platform Admin adjustments.

### 3.4 `organization_role_permissions` (supporting table)

Purpose: immutable mapping from system roles to permissions.

| Column | Type / nullability | Contract |
| --- | --- | --- |
| `role_id` | `smallint not null` | FK `organization_roles(id)` |
| `permission_id` | `smallint not null` | FK `organization_permissions(id)` |
| `created_at` | `timestamptz not null` | Seed audit |
| `created_by` | `uuid null` | Null for migration seed or restricted platform actor |

Primary key: `(role_id, permission_id)`.

Foreign keys use `ON DELETE RESTRICT`. Index `(permission_id, role_id)` supports reverse policy audits. Runtime mutation is prohibited; permission changes require reviewed schema/catalog migration.

### 3.5 `organization_members`

Purpose: user membership in one Organization, independent of customer Tenant Membership.

| Column | Type / nullability | Contract |
| --- | --- | --- |
| `id` | `uuid primary key` | Server generated |
| `organization_id` | `uuid not null` | Organization scope |
| `tenant_id` | `uuid not null` | Organization Tenant, immutable |
| `user_id` | `uuid not null` | FK `auth.users(id)`, immutable |
| `role_id` | `smallint not null` | FK `organization_roles(id)` |
| `status` | `text not null` | `ACTIVE`, `SUSPENDED`, `REVOKED` |
| `accepted_invite_id` | `uuid null` | FK to accepted invite; null for explicit owner/admin provisioning |
| `created_at`, `created_by` | required | Actor audit |
| `updated_at`, `updated_by`, `row_version` | required | Optimistic concurrency |
| `revoked_at`, `revoked_by` | nullable | Soft removal evidence |

Primary key: `id`.

Foreign keys:

- `(organization_id, tenant_id) -> organizations(id, tenant_id) ON DELETE RESTRICT`
- `user_id -> auth.users(id) ON DELETE RESTRICT`
- `role_id -> organization_roles(id) ON DELETE RESTRICT`
- `accepted_invite_id -> organization_invites(id) ON DELETE RESTRICT` is added after both tables exist, as a deferred/additive constraint.

Unique constraints:

- `UNIQUE (organization_id, user_id)` preserves one immutable membership identity; revoked users are reactivated through the same row and a new audit event, not inserted as a duplicate.
- `UNIQUE (id, organization_id, tenant_id)` supports future composite references.
- Partial unique Owner index on `organization_id` for rows whose role is the seeded Owner role and `status='ACTIVE'`; because ordinary partial indexes cannot reference a lookup table, the implementation must use a stable Owner role ID or a denormalized immutable `role_key` guarded by a constraint trigger.

Indexes:

- `(user_id, status, organization_id)` for current-user Organization listing
- `(organization_id, status, role_id, created_at)` for member administration
- `(tenant_id, user_id, status)` for same-Tenant reviews

Insert/reactivate admission must verify an active `customer_tenant_memberships` row for `(tenant_id, user_id)`. This is a server/RPC and RLS invariant, not an instruction to alter that existing table.

Exactly one active Owner is enforced by a transaction-scoped ownership transfer RPC and a deferred invariant check. Admin/member update RPCs cannot assign Owner.

### 3.6 `organization_invites`

Purpose: explicit, expiring invitation to an existing or future authenticated user without automatic Tenant binding.

| Column | Type / nullability | Contract |
| --- | --- | --- |
| `id` | `uuid primary key` | Server generated |
| `organization_id`, `tenant_id` | `uuid not null` | Composite Organization scope |
| `target_email_hash` | `text not null` | Normalized email HMAC for equality/dedup; not plaintext SHA |
| `target_email_ciphertext` | `bytea null` | Optional restricted delivery data; never returned to member lists |
| `role_id` | `smallint not null` | ADMIN or MEMBER only |
| `token_hash` | `text not null unique` | No plaintext token stored |
| `status` | `text not null` | `PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED` |
| `expires_at` | `timestamptz not null` | Required expiry |
| `accepted_by` | `uuid null` | FK `auth.users(id)` |
| `accepted_at`, `revoked_at` | nullable | Terminal evidence |
| `revoked_by` | `uuid null` | FK `auth.users(id)` |
| `created_at`, `created_by` | required | Inviter audit |
| `updated_at`, `updated_by`, `row_version` | required | Lifecycle concurrency |

Primary key: `id`.

Foreign keys:

- `(organization_id, tenant_id) -> organizations(id, tenant_id) ON DELETE RESTRICT`
- `role_id -> organization_roles(id) ON DELETE RESTRICT`
- actor fields -> `auth.users(id) ON DELETE RESTRICT`

Unique constraints/indexes:

- `token_hash` unique.
- Partial unique `(organization_id, target_email_hash) WHERE status='PENDING'` prevents duplicate active invites.
- `(organization_id, status, expires_at)` for management/expiry worker.
- `(target_email_hash, status, expires_at)` for acceptance lookup after authentication.

Invite acceptance must authenticate the user, match the email HMAC, resolve exactly one active customer Tenant Membership, require it to match `tenant_id`, validate expiry/status, and create/reactivate the member atomically. It never creates or changes customer Tenant Membership.

### 3.7 `organization_audit_events` (supporting table)

Purpose: immutable security and administration evidence.

| Column | Type / nullability | Contract |
| --- | --- | --- |
| `id` | `uuid primary key` | Server generated |
| `organization_id`, `tenant_id` | `uuid not null` | Composite scope |
| `actor_user_id` | `uuid not null` | Authenticated actor or explicit platform actor |
| `event_type` | `text not null` | Allowlisted event |
| `target_type`, `target_id` | `text not null` | Safe target identity |
| `correlation_id` | `text not null` | Safe support linkage |
| `before_safe`, `after_safe` | `jsonb not null` | Role/status/policy fields only |
| `created_at` | `timestamptz not null` | Immutable timestamp |

Primary key: `id`. Unique optional idempotency constraint `(organization_id, event_type, correlation_id, target_type, target_id)`. Indexes `(organization_id, created_at desc)`, `(tenant_id, created_at desc)`, `(correlation_id)`.

No update/delete policies. Never store invite tokens, email lists, full email ciphertext, prompts, provider payloads, SQL, credentials, signed URLs, raw JWTs, Credit card data, or asset contents.

## 4. Permission matrix

| Permission | Owner | Admin | Member | Enforcement note |
| --- | :---: | :---: | :---: | --- |
| `ORGANIZATION_VIEW` | Yes | Yes | Yes | Active member and same active Tenant |
| `MEMBER_VIEW` | Yes | Yes | Yes | Minimal member projection only |
| `MEMBER_INVITE` | Yes | Yes | No | Admin can invite ADMIN/MEMBER, never OWNER |
| `MEMBER_REMOVE` | Yes | Yes | No | Admin cannot remove Owner; self-leave cannot remove last Owner |
| `PROJECT_VIEW` | Yes | Yes | Yes | Explicit Project permission/link required |
| `PROJECT_CREATE` | Yes | Yes | Yes | Creator `user_id` retained |
| `PROJECT_MANAGE` | Yes | Yes | No | Member may receive explicit resource-level edit permission later |
| `ASSET_VIEW` | Yes | Yes | Yes | Explicit Asset permission only |
| `ASSET_SHARE` | Yes | Yes | Yes | Member can share only an eligible owned Canonical Asset |
| `ASSET_MANAGE` | Yes | Yes | No | Does not transfer canonical ownership |
| `CREDIT_BALANCE_VIEW` | Yes | Yes | No | Future Organization account only |
| `CREDIT_USAGE_VIEW` | Yes | Yes | No | Member sees own charge receipt through own activity, not full ledger |
| `CREDIT_POLICY_MANAGE` | Yes | Yes | No | Budget/policy only; not minting, Billing or direct balance writes |
| `GENERATE_WITH_ORGANIZATION_CREDITS` | Yes | Yes | Yes | Future gated path; no personal fallback |
| `ORGANIZATION_MANAGE` | Yes | Yes | No | Admin cannot archive/transfer ownership unless separately allowed |
| `OWNERSHIP_TRANSFER` | Yes | No | No | Dedicated step-up RPC |

Required behavior for the requested actions:

- Invite member: Owner/Admin.
- Remove member: Owner/Admin, with Owner protection.
- Manage Projects: Owner/Admin; Member only within explicit resource permission.
- Manage Assets: Owner/Admin; Member may share own eligible Asset but cannot administer all shared Assets.
- Manage Credits: Owner/Admin policy scope only; financial balance mutation remains a future separately permissioned platform operation.

## 5. Future reserved contracts

These tables are reserved in the design only. They are not part of the P0 migration candidate and must not be created until their own security/financial phase is approved.

### 5.1 `organization_credit_accounts`

- Primary key: `id uuid`.
- Foreign key: unique `(organization_id, tenant_id) -> organizations(id, tenant_id)`.
- Unique: one account per Organization.
- Fields: `balance`, `status`, `row_version`, required audit timestamps/actors.
- Index: `(tenant_id, status)`, `(organization_id)` unique.
- No hard delete. No direct authenticated writes.
- Must pair with a separate immutable Organization Credit ledger and atomic Job/consume/refund RPC.
- Must never reuse `tenant_credit_accounts`, modify `credit_transactions`, or silently debit Personal Credits.

### 5.2 `organization_asset_permissions`

- Primary key: `id uuid`.
- Composite scope: `organization_id`, `tenant_id`, `asset_id`.
- Grantee: Organization-wide v1 or explicit `organization_member_id`; exactly one grantee shape enforced.
- Permission: `VIEW`, `USE`, or `MANAGE`; `MANAGE` never changes `media_assets.user_id`.
- Unique active permission per `(organization_id, asset_id, grantee_type, grantee_id, permission_key)`.
- FKs to Organization, Canonical Asset and optional Organization member; every row must share Tenant.
- Indexes `(organization_id, status, asset_id)`, `(asset_id, status)`, `(organization_member_id, status)`.
- Soft revoke only. Asset must remain Canonical READY, same Tenant and retain source Job lineage.

### 5.3 `organization_project_permissions`

- Primary key: `id uuid`.
- Composite scope: `organization_id`, `tenant_id`, `project_id` and optional Workspace scope.
- Grantee: Organization-wide or explicit Organization member.
- Permission: `VIEW`, `EDIT`, or `MANAGE`.
- Unique active permission per Project/grantee/permission.
- FKs to Organization, Studio Project and optional member; same-Tenant check required.
- Indexes `(organization_id, status, project_id)`, `(project_id, status)`, `(organization_member_id, status)`.
- Soft revoke only. Existing `studio_projects.user_id`, Tenant and current Workspace roles remain unchanged.

## 6. RLS proposal

### 6.1 Global rules

- Enable RLS on every Organization table, including future tables.
- `anon`: no access.
- `authenticated`: least-privilege reads only; direct writes revoked.
- `service_role`: repository access only through reviewed server services/RPCs; service role does not weaken application authorization.
- All mutating operations use narrowly scoped `SECURITY DEFINER` RPCs with fixed `search_path`, explicit input validation, row/advisory locks as required, idempotency keys, optimistic versions and immutable audit writes.
- RLS never trusts a client-supplied `user_id` or `tenant_id`; it uses `auth.uid()` and the existing authoritative Tenant resolver.

### 6.2 Safe helper contracts

Proposed helpers:

- `current_customer_tenant_id_v1()` — returns exactly one active Tenant for `auth.uid()` or fails closed.
- `is_active_organization_member_v1(organization_id)` — validates active member, active Organization and same resolved Tenant.
- `has_organization_permission_v1(organization_id, permission_key)` — joins active member -> system role -> role permission and revalidates Tenant.
- `organization_resource_tenant_matches_v1(organization_id, tenant_id)` — defense-in-depth composite scope check.

Helpers must return false/fail closed on missing, inactive, ambiguous or cross-Tenant evidence. They do not create or repair membership.

### 6.3 Table policies

| Table | SELECT | INSERT/UPDATE | DELETE |
| --- | --- | --- | --- |
| `organizations` | Active same-Tenant member with `ORGANIZATION_VIEW` | Dedicated create/manage/archive RPC only | Denied |
| `organization_roles` | Authenticated active customer may read safe catalog | Migration/service maintenance only | Denied |
| `organization_permissions` | Authenticated active customer may read safe catalog | Migration/service maintenance only | Denied |
| `organization_role_permissions` | Authenticated active customer may read safe catalog mapping | Migration only | Denied |
| `organization_members` | Same Organization member with `MEMBER_VIEW`; minimal API projection | Invite acceptance/member/ownership RPCs only | Denied |
| `organization_invites` | Owner/Admin with `MEMBER_INVITE`; invite target accesses only through token acceptance RPC | Invite/revoke/accept RPCs only | Denied |
| `organization_audit_events` | Owner/Admin or explicit platform Admin read permission; safe fields only | Append-only service RPC | Denied |
| future Credit account | `CREDIT_BALANCE_VIEW` | Financial RPC only | Denied |
| future Asset permissions | Explicit shared permission or `ASSET_MANAGE` | Share/manage RPC only | Denied |
| future Project permissions | Explicit project permission or `PROJECT_MANAGE` | Project permission RPC only | Denied |

### 6.4 Isolation tests required before implementation

- Same Tenant, different Organization: access denied without explicit membership.
- Different Tenant, same user-supplied Organization UUID: denied before resource query.
- Tenant member but not Organization member: Organization/Assets/Projects/Credits denied.
- Revoked/suspended Organization member: future access denied; historical audit retained.
- Revoked customer Tenant Membership: every Organization access denied even if Organization member row remains active.
- Owner/Admin/Member permissions match the matrix; Member cannot escalate role or remove members.
- Admin cannot change/remove Owner; last Owner cannot leave/archive through member RPC.
- Invite token tampering, expiry, replay, wrong email and wrong Tenant all fail closed.
- Explicit Asset/Project permission in Organization A cannot be used in Organization B.
- Product Organization Owner cannot access platform Admin routes.

## 7. Migration plan

This plan describes a future candidate; this P0 document does not execute it.

### Stage 0 — Contract review

- Freeze table/permission keys and threat model.
- Verify actual production constraints on `tenants`, `auth.users`, and customer membership without altering them.
- Approve privacy, RLS, last-Owner and invite-token contracts.

### Stage 1 — Additive catalogs and directory schema

- Create `organization_roles`, `organization_permissions`, `organization_role_permissions`, `organizations`, `organization_members`, `organization_invites`, and `organization_audit_events` in one reviewed migration series.
- Seed exactly `OWNER`, `ADMIN`, `MEMBER` and the approved permission mappings.
- Enable RLS and revoke direct mutations before any route is enabled.
- Do not create Organization rows, members or invites automatically.

### Stage 2 — Read-only repository and shadow validation

- Implement DB-backed read repository behind an off-by-default flag.
- Compare safe DB projections with existing Enterprise JSONL compatibility views.
- Do not authorize from shadow results and do not dual-write mutable authority.

### Stage 3 — Controlled Organization/member writes

- Enable explicit Organization creation, invite, acceptance, role change, revoke and ownership transfer for an allowlisted Tenant.
- Require same-Tenant active customer membership; never auto-bind it.
- Keep Workspace roles, Credits, Assets and Projects unchanged.

### Stage 4 — Resource permissions

- Separately approve and add Asset/Project permission tables.
- No backfill from Tenant, past Jobs, email domain or current Asset/Project ownership.

### Stage 5 — Organization Credits

- Separate financial design, migration and production gate.
- Do not enter this stage until exactly-once consume/refund/replay and reconciliation are certified.
- Existing Credit ledger remains authoritative for Personal Credits throughout.

## 8. Rollback plan

- Before runtime enablement: rollback migration only if tables contain no Organization records; otherwise preserve data and disable routes.
- After any Organization record exists: turn off Organization write flags, retain tables/audit read-only, and keep personal product paths active.
- Never delete Organizations, members, invites or audit rows as operational rollback.
- Never convert Organization membership into customer Tenant Membership or vice versa.
- Disable resource permission routes without deleting Assets or Projects; revocation affects visibility, not canonical ownership.
- If a future Credit stage has begun, disable new Organization billing selection and use separately approved compensating ledger entries. Never update balances directly or move a charge to Personal Credits.
- Existing Workspace roles, personal Credits, customer Tenant Membership, Billing and Stripe remain independently operational because this contract adds no coupling or migration.

## 9. Compatibility guarantees

- `customer_tenant_memberships`: unchanged and not backfilled.
- Existing Workspace roles (`OWNER`, `ADMIN`, `MANAGER`, `CREATOR`, `REVIEWER`, `VIEWER`): unchanged and not remapped.
- `tenant_credit_accounts`, `credit_transactions`, consume/refund RPCs: unchanged.
- Existing Assets and Studio Projects: unchanged, private unless explicitly shared in a later phase.
- Billing and Stripe: unchanged.
- Public model catalog, generation prices and provider paths: unchanged.

## 10. Candidate safety statement

- Migration file created: `NO`
- Migration applied: `NO`
- Production schema changed: `NO`
- Organization row created: `NO`
- Customer Tenant Membership changed: `NO`
- Workspace role changed: `NO`
- Billing changed: `NO`
- Stripe changed: `NO`
- Credit ledger changed: `NO`
- Credit balance changed: `NO`
- Production changed: `NO`
