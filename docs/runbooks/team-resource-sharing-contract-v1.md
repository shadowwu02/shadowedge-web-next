# Team Management P4.4 — Team Resource Sharing Contract v1

Date: 2026-08-23

Status: `DESIGN_ONLY_NOT_PRODUCTION`

Depends on:

- `team-management-design-v1.md`
- `team-management-db-contract-v1.md`
- `team-management-api-contract-v1.md`
- Team-native Organization Backend and Frontend candidates

This document defines the Team-native Project and Asset sharing contract. It does not apply a migration, mount an API, enable a feature flag, modify a Project or Asset, rewrite a Legacy Workspace, change Billing, or change any Credit account or ledger.

## 1. Contract decisions

1. The isolation hierarchy is `Tenant -> Organization -> explicit resource link -> explicit permission grant`.
2. An active customer Tenant Membership and active Organization Membership are necessary outer gates, but neither grants access to a Project or Asset.
3. A Team Project exists only after an explicit Team-native Project resource row is created in one Organization.
4. A Team Asset exists only after an eligible Canonical Asset is explicitly linked to one Organization.
5. Every Organization-mediated resource read or mutation requires an active explicit `VIEW`, `EDIT`, or `MANAGE` grant to the caller's Organization role or member record.
6. An Organization does not automatically inherit all Assets or Projects in its Tenant.
7. A Project grant does not automatically grant access to Assets referenced by that Project. Every Asset requires its own explicit Asset resource link and permission grant.
8. Canonical Project/Asset owner, Tenant, storage, source Job and lineage remain unchanged. Sharing does not transfer ownership.
9. Legacy Workspace Projects and Legacy Assets continue through their existing authority and access paths. P4.4 does not backfill, relabel, wrap or migrate them.
10. Billing and Organization Credits are outside this contract. Resource permission never authorizes a financial operation.

## 2. Scope and non-goals

### In scope

- Team-native Project resource identity inside an Organization
- Team-native Asset resource identity inside an Organization
- Explicit role and member grants
- `VIEW`, `EDIT`, `MANAGE` semantics
- Backend permission projection and safe API shapes
- RLS and server authorization boundaries
- Audit, idempotency, revocation and rollback contracts

### Out of scope

- Production migration or schema application
- Legacy Workspace/Project/Asset migration
- Tenant-wide sharing
- Public links or anonymous sharing
- Cross-Tenant or cross-Organization sharing
- Ownership transfer of `studio_projects` or `media_assets`
- Asset binary mutation or source-generation lineage rewrite
- Billing, Stripe, checkout, subscriptions or Organization Credit ledger behavior
- Generation billing-source selection

## 3. Authority model

### 3.1 Outer Organization authority

The existing Team-native Organization authority decides whether the caller may request a resource operation:

| Organization role | Resource administration authority | Boundary |
| --- | --- | --- |
| `OWNER` | May request eligible Team resource creation/link and grant administration | Each resource still requires creator/owner authority or an explicit resource `MANAGE` grant; role alone reveals no content |
| `ADMIN` | May request eligible Team resource creation/link and grant administration within Organization policy | Each resource still requires creator/owner authority or explicit `MANAGE`; cannot transfer canonical ownership |
| `MEMBER` | May create own Team Project and share an eligible owned Asset when projected by Backend | May manage only resources carrying an explicit member `MANAGE` grant or creator-specific projected action |

These are server-side policy inputs. The Browser receives `allowedActions`, `assignableResourcePermissions`, and per-resource `availableActions`; it never derives authority from the role label.

### 3.2 Inner resource authority

Resource access is default-deny. The server resolves all of the following on every request:

1. authenticated actor;
2. exactly one active customer Tenant Membership;
3. active Team-native Organization in that Tenant;
4. active Organization Membership;
5. active Team resource link in that Organization;
6. active explicit role or member grant for the required permission;
7. current canonical resource status and same-Tenant identity.

Missing, ambiguous, suspended, revoked or mismatched evidence fails closed. No step creates or repairs authority at runtime.

### 3.3 Permission lattice

`VIEW < EDIT < MANAGE` is an ordered capability lattice:

- `VIEW` satisfies only `VIEW`.
- `EDIT` satisfies `VIEW` and `EDIT`.
- `MANAGE` satisfies `VIEW`, `EDIT` and `MANAGE`.
- Multiple active grants resolve to the highest granted capability.
- Revoked/expired grants do not participate.
- V1 has no implicit allow and no explicit deny row. Absence of an active grant is denial.

The lattice is evaluated independently for each resource. It never crosses Organization, Project or Asset boundaries.

## 4. Resource permission semantics

### 4.1 Team Projects

| Permission | Allowed | Explicitly not allowed |
| --- | --- | --- |
| `VIEW` | Read the safe Project projection and Organization-local collaboration state | Read ungranted Assets, signed URLs, secrets or another Organization's data |
| `EDIT` | Includes `VIEW`; update permitted Project content through existing versioned Project APIs | Change Project creator/owner, Tenant, authority origin or permission grants |
| `MANAGE` | Includes `EDIT`; manage Project grants and Organization-local lifecycle state | Change canonical ownership, grant cross-Tenant users, mutate Billing/Credits or rewrite Legacy Workspace authority |

Project creator personal authority remains governed by the existing Project contract. Organization-mediated access always uses this Team permission contract.

### 4.2 Team Assets

| Permission | Allowed | Explicitly not allowed |
| --- | --- | --- |
| `VIEW` | Read safe Asset metadata and authorized delivery/preview through existing protected Asset delivery | Read another Tenant's object, raw storage credentials or ungranted Asset content |
| `EDIT` | Includes `VIEW`; attach/use the Asset in an authorized Team Project and edit Organization-local labels when separately implemented | Change binary content, Canonical Asset owner, Tenant, source Job, storage provider or lineage |
| `MANAGE` | Includes `EDIT`; manage Asset grants and Organization-local link lifecycle | Delete the Canonical Asset, transfer ownership, rewrite lineage or expose the Asset Tenant-wide |

Only a Canonical `READY` image/video/audio Asset with supported storage metadata and a non-null matching Tenant is eligible. A failed, deleted, Legacy tenant-null, URL-only, cross-user or cross-Tenant Asset cannot be linked.

### 4.3 No Project-to-Asset inheritance

An Asset reference inside a permitted Project is rendered as an unavailable/redacted reference until the caller also has an active Asset grant. Project `MANAGE` does not imply Asset `VIEW`, and Asset `MANAGE` does not imply Project access.

Linking an Asset to a Team Project is an organizational relationship only. It never creates an Asset permission grant. Link and grant are distinct, auditable mutations.

## 5. Data model proposal

This is a relational contract, not executable SQL. All identifiers are server-generated UUIDs. Every Organization child row carries `organization_id` and `tenant_id`, with composite same-scope foreign keys.

### 5.1 `organization_project_resources`

Purpose: explicit Team-native identity for one existing/new Project inside one Organization.

| Column | Contract |
| --- | --- |
| `id uuid primary key` | Opaque Team Project resource reference |
| `organization_id uuid not null` | Team-native Organization |
| `tenant_id uuid not null` | Immutable Organization Tenant |
| `project_id uuid not null` | FK to `studio_projects`; canonical creator remains unchanged |
| `authority_origin text not null` | Fixed `TEAM_NATIVE_RESOURCE_V1` |
| `status text not null` | `ACTIVE`, `ARCHIVED`, `REVOKED` |
| `created_at`, `created_by` | Server actor audit |
| `updated_at`, `updated_by`, `row_version` | Optimistic concurrency |
| `revoked_at`, `revoked_by` | Soft-revoke evidence |

Constraints:

- `UNIQUE (organization_id, project_id)` preserves one immutable Organization/Project identity.
- `(organization_id, tenant_id)` references the same Team-native Organization.
- Project Tenant must equal the row Tenant and carry the separately approved Team-native Project authority marker.
- `project_id`, `organization_id`, `tenant_id`, and `authority_origin` are immutable.
- A Project may have at most one active Team-native Organization link in v1.
- No existing Project is inserted automatically or by backfill.

Indexes:

- `(organization_id, status, created_at desc)`
- `(project_id, status)`
- `(tenant_id, status)`

### 5.2 `organization_project_permissions`

Purpose: explicit role/member permission on one Team Project resource.

| Column | Contract |
| --- | --- |
| `id uuid primary key` | Grant identity |
| `organization_id`, `tenant_id` | Composite Organization scope |
| `project_resource_id uuid not null` | FK to `organization_project_resources` |
| `grantee_type text not null` | `ROLE` or `MEMBER` |
| `grantee_role_id smallint null` | FK to Organization role catalog when `ROLE` |
| `grantee_member_id uuid null` | FK to same-Organization member when `MEMBER` |
| `permission_key text not null` | `VIEW`, `EDIT`, `MANAGE` |
| `status text not null` | `ACTIVE`, `REVOKED` |
| `granted_at`, `granted_by` | Actor evidence |
| `revoked_at`, `revoked_by` | Soft-revoke evidence |
| `row_version bigint not null` | Optimistic concurrency |

Exactly one grantee field must be non-null and match `grantee_type`. Member grantees must be active members of the same Organization/Tenant. Role grants are explicit per Project; Organization role membership alone is not a resource grant.

One active grant is allowed per `(project_resource_id, grantee_type, resolved_grantee_id, permission_key)`. Grant updates are revoke + append, not silent overwrite.

### 5.3 `organization_asset_resources`

Purpose: explicit Team-native identity for one eligible Canonical Asset inside one Organization.

| Column | Contract |
| --- | --- |
| `id uuid primary key` | Opaque Team Asset resource reference |
| `organization_id uuid not null` | Team-native Organization |
| `tenant_id uuid not null` | Immutable Organization Tenant |
| `asset_id uuid not null` | FK to Canonical `media_assets` |
| `project_resource_id uuid null` | Optional grouping relationship to a same-scope Team Project; creates no permission inheritance |
| `authority_origin text not null` | Fixed `TEAM_NATIVE_RESOURCE_V1` |
| `status text not null` | `ACTIVE`, `REVOKED` |
| `created_at`, `created_by` | Actor audit |
| `updated_at`, `updated_by`, `row_version` | Optimistic concurrency |
| `revoked_at`, `revoked_by` | Soft-revoke evidence |

Constraints:

- `UNIQUE (organization_id, asset_id)` preserves one immutable Organization/Asset identity.
- Asset must be Canonical `READY`, same Tenant, non-null Tenant, supported media type, canonical storage and carry the separately approved Team-native Asset authority marker.
- Optional Project relationship must reference the same Organization/Tenant.
- Asset owner, Tenant, source Job, storage identity and bytes remain immutable.
- No existing Asset is inserted automatically or by backfill.

Indexes:

- `(organization_id, status, created_at desc)`
- `(asset_id, status)`
- `(project_resource_id, status)`
- `(tenant_id, status)`

### 5.4 `organization_asset_permissions`

Purpose: explicit role/member permission on one Team Asset resource.

The columns and grantee XOR constraint mirror `organization_project_permissions`, with `asset_resource_id` replacing `project_resource_id` and permission keys `VIEW`, `EDIT`, `MANAGE`.

Member and role grants are explicit per Asset. An Organization-wide wildcard, Tenant grantee, email-domain grantee, Workspace-role grantee, `ALL_ASSETS` grant or inherited Project grant is prohibited.

### 5.5 Audit events

Every resource mutation and its audit event commit atomically. Required event types:

- `TEAM_PROJECT_RESOURCE_CREATED`
- `TEAM_PROJECT_RESOURCE_REVOKED`
- `TEAM_PROJECT_PERMISSION_GRANTED`
- `TEAM_PROJECT_PERMISSION_REVOKED`
- `TEAM_ASSET_RESOURCE_CREATED`
- `TEAM_ASSET_RESOURCE_REVOKED`
- `TEAM_ASSET_PERMISSION_GRANTED`
- `TEAM_ASSET_PERMISSION_REVOKED`
- `TEAM_ASSET_PROJECT_LINK_CHANGED`

Safe audit fields include event/resource/grant references, Organization/Tenant scope, actor, grantee type, role/member reference, permission, before/after status, idempotency fingerprint, correlation ID and timestamp.

Forbidden audit content includes Project content, prompts, Asset bytes, signed URLs, storage keys, Provider payloads, tokens, email addresses, Billing data, Credit metadata, SQL, stack and credentials.

## 6. Authorization and RLS proposal

### 6.1 Database policies

- `anon`: no access.
- `authenticated`: no direct writes; SELECT only through active same-Tenant Organization membership plus active explicit resource grant.
- `service_role`: repository access does not replace application authorization.
- All mutations use reviewed `SECURITY DEFINER` RPCs with fixed `search_path`, server-resolved actor/Tenant, locks, idempotency, version checks and atomic safe audit.
- A guessed resource/grant UUID outside visibility returns hidden-resource `404` before permission detail is revealed.

### 6.2 Grant administration

Grant administration requires both:

1. a Backend-projected Organization action (`PROJECT_MANAGE` or `ASSET_MANAGE`), and
2. resource eligibility authority: canonical owner/creator or an active resource `MANAGE` grant.

This prevents Organization Owner/Admin role from sweeping and sharing every Tenant resource. A platform Admin path, if ever required, needs a separate reviewed platform permission and is not part of this contract.

### 6.3 Revocation

- Revoking a member immediately removes role/member-grant access derived through that membership.
- Revoking a permission removes Organization-mediated access but never deletes the Project/Asset.
- Revoking a Team resource link makes all child grants ineffective and preserves them for audit.
- Re-activation requires a new reviewed mutation and cannot silently restore historical grants.
- Existing canonical owner/creator access remains under the existing personal authority contract.

## 7. Backend projection contract

The Frontend receives no raw role-to-permission mapping and performs no role inference.

### Project projection

```json
{
  "projectRef": "opaque",
  "display": { "name": "Launch concept", "status": "ACTIVE" },
  "effectivePermission": "EDIT",
  "availableActions": ["PROJECT_VIEW", "PROJECT_EDIT"],
  "assignableResourcePermissions": [],
  "assetReferenceSummary": { "visible": 2, "redacted": 1 }
}
```

### Asset projection

```json
{
  "assetRef": "opaque",
  "display": { "name": "Approved image", "mediaType": "image", "status": "READY" },
  "effectivePermission": "VIEW",
  "availableActions": ["ASSET_VIEW"],
  "assignableResourcePermissions": []
}
```

Safe projections omit canonical database IDs unless the opaque API reference is itself required for a subsequent authorized route. They always omit Tenant ID, storage key, signed URL at rest, owner user ID, raw permission rows, audit payload and Provider/source internals.

The Backend may issue short-lived protected delivery URLs only after current Asset permission revalidation. A stored or expired delivery URL is not authority.

## 8. API proposal

All routes require authentication, resolved Tenant, active Organization Membership, explicit resource permission and private/no-store responses. Mutations require `Idempotency-Key`; versioned mutations require `If-Match` or `expectedVersion`, never both.

### 8.1 Team Projects

- `GET /api/organizations/:organizationRef/projects` — list only Projects with effective explicit permission
- `POST /api/organizations/:organizationRef/projects` — create a new Team-native Project and creator `MANAGE` grant atomically
- `GET /api/organizations/:organizationRef/projects/:projectRef`
- `PATCH /api/organizations/:organizationRef/projects/:projectRef` — requires `EDIT`
- `DELETE /api/organizations/:organizationRef/projects/:projectRef` — soft-revoke Organization resource link; requires `MANAGE`
- `GET /api/organizations/:organizationRef/projects/:projectRef/permissions` — safe grant projection; requires `MANAGE`
- `POST /api/organizations/:organizationRef/projects/:projectRef/permissions` — explicit role/member grant; requires `MANAGE`
- `DELETE /api/organizations/:organizationRef/projects/:projectRef/permissions/:grantRef` — soft revoke; requires `MANAGE`

The create request accepts Project content only through the existing Project contract. It never accepts `tenantId`, owner/creator ID, authority origin, permission claims or Legacy Workspace identity from the Browser.

### 8.2 Team Assets

- `GET /api/organizations/:organizationRef/assets` — list only Assets with effective explicit permission
- `POST /api/organizations/:organizationRef/assets` — explicitly link one eligible Team-native owned/managed Canonical Asset and create the caller's `MANAGE` grant atomically; no wildcard/bulk Tenant import
- `GET /api/organizations/:organizationRef/assets/:assetRef`
- `POST /api/organizations/:organizationRef/assets/:assetRef/delivery` — short-lived protected delivery after permission revalidation
- `GET /api/organizations/:organizationRef/assets/:assetRef/permissions` — safe grant projection; requires `MANAGE`
- `POST /api/organizations/:organizationRef/assets/:assetRef/permissions` — explicit role/member grant; requires `MANAGE`
- `DELETE /api/organizations/:organizationRef/assets/:assetRef/permissions/:grantRef` — soft revoke; requires `MANAGE`
- `PATCH /api/organizations/:organizationRef/assets/:assetRef/project-link` — explicit grouping link only; creates no Project/Asset permission
- `DELETE /api/organizations/:organizationRef/assets/:assetRef` — soft-revoke Team resource link; never deletes Canonical Asset

### 8.3 Grant request

```json
{
  "grantee": { "type": "ROLE", "role": "MEMBER" },
  "permission": "VIEW",
  "expectedResourceVersion": 4
}
```

The alternative member grant uses an opaque `memberRef`. The server resolves Organization/Tenant identity and rejects unknown fields. Client-provided user ID, Tenant ID, Organization ID outside the route, email, Workspace role and effective permission are rejected.

### 8.4 Safe errors

| HTTP | Code | Contract |
| ---: | --- | --- |
| 400 | `TEAM_RESOURCE_REQUEST_INVALID` | Unknown field, invalid permission or unsupported resource state |
| 401 | `AUTH_REQUIRED` | Authentication missing/invalid |
| 403 | `TEAM_RESOURCE_PERMISSION_DENIED` | Visible resource but projected action denied |
| 404 | `TEAM_RESOURCE_NOT_FOUND` | Hidden, absent, cross-Tenant or cross-Organization resource/grant |
| 409 | `TEAM_RESOURCE_ALREADY_LINKED` | Active explicit link already exists |
| 409 | `TEAM_RESOURCE_GRANT_CONFLICT` | Same idempotency key/request identity conflict |
| 409 | `TEAM_RESOURCE_NOT_READY` | Asset/Project state no longer eligible |
| 412 | `TEAM_RESOURCE_VERSION_CONFLICT` | Optimistic version mismatch |
| 503 | `TEAM_RESOURCE_AUTHORITY_UNAVAILABLE` | Tenant/Organization/grant/RLS authority unavailable; fail closed |

Errors never disclose hidden resource existence, raw permission rows, storage/Provider details, Project content, signed URLs, SQL, stack or credentials.

## 9. Idempotency and concurrency

- Create/link/grant/revoke operations each have a stable operation fingerprint and unique idempotency receipt.
- Same key + same canonical request returns the original safe result without duplicate row/audit.
- Same key + different request returns immutable conflict.
- Resource and grant rows use row/advisory locks where needed plus `row_version` optimistic checks.
- Concurrent duplicate grants produce one active grant and one audit event.
- Revocation racing with a read fails closed at final authorization/delivery revalidation.
- No operation retries under a broader permission, another Organization or a Legacy authority path.

## 10. Legacy and migration boundary

P4.4 is design only. A future implementation must be additive and separately approved.

### Eligible future rollout

1. Add Team resource/link/grant tables without changing existing Project/Asset tables beyond separately reviewed immutable authority markers if required.
2. Keep all resource routes off by default.
3. Enable Team-native resource creation for an allowlisted Team-native Organization only.
4. Create only new Team resource rows through explicit authorized actions.
5. Do not inventory, import or backfill by Tenant, email domain, historical Job, Project owner, Asset owner, Workspace or Organization membership.
6. Run cross-Tenant, cross-Organization, permission, revocation, idempotency and privacy certification before any broader enablement.

### Legacy isolation

- Legacy Workspace Project routes remain authoritative for Legacy Projects.
- Legacy Asset library/owner routes remain authoritative for Legacy Assets.
- A Team-native route never mutates Legacy JSONL/Workspace authority or writes a compatibility mapping.
- No dual write exists between Legacy resource authority and Team resource authority.
- A Legacy resource or an existing resource without an approved Team-native authority marker is not Team-shareable in v1. A future opt-in conversion requires a separate immutable mapping/migration contract and explicit authorization.

## 11. Rollback contract

Rollback is authority disablement, not data deletion or reverse migration:

1. Set future Team resource route/creation flags off.
2. Stop Team Project/Asset link and permission mutations.
3. Stop Organization-mediated resource reads and protected delivery issuance.
4. Preserve Team resource/grant/audit rows read-only for investigation.
5. Preserve canonical Project/Asset ownership, Tenant, storage and lineage.
6. Preserve Legacy Workspace/Asset behavior unchanged.
7. Do not copy Team resource grants into Legacy authority.
8. Do not delete or rewrite Projects, Assets, Organization membership, Billing or Credits.

Previously issued short-lived delivery URLs expire normally and are not renewed after rollback.

## 12. Architecture validation matrix

Before implementation approval, fixtures must cover:

- Owner, Admin and Member outer authorization projections
- role grant and member grant for each `VIEW`, `EDIT`, `MANAGE` level
- lower permission cannot perform higher action
- no grant defaults to deny even for same-Tenant Organization member
- Organization Owner/Admin cannot sweep unlinked Tenant Projects or Assets
- Project permission does not reveal ungranted Asset
- Asset permission does not reveal Project
- same Tenant/different Organization denial
- different Tenant/guessed reference denial
- revoked/suspended Tenant or Organization Membership denial
- Project/Asset link and grant exactly-once behavior
- concurrent duplicate grant conflict protection
- grant revocation during delivery/read
- Canonical Asset READY, Tenant, storage and lineage checks
- failed/deleted/tenant-null/URL-only/cross-user/cross-Tenant Asset rejection
- Project creator and Asset owner remain unchanged
- safe projection excludes internal identity/storage/audit/provider data
- Legacy routes and resources unchanged
- resource route flags default off and rollback stops Team authority
- zero Billing, Stripe, Credit account or Credit ledger interaction

## 13. Production-change statement

| Surface | Changed by P4.4 |
| --- | :---: |
| Production schema/migration | No |
| Backend routes/runtime | No |
| Frontend routes/runtime | No |
| Team/Legacy authority | No |
| Legacy Workspace Projects | No |
| Legacy Assets | No |
| Billing/Stripe | No |
| Credit accounts/ledger | No |
| Existing Project/Asset data | No |

## 14. Readiness classification

- `TEAM_RESOURCE_CONTRACT_READY=YES`
- `PROJECT_PERMISSION_MODEL_READY=YES`
- `ASSET_PERMISSION_MODEL_READY=YES`
- `LEGACY_RESOURCE_ISOLATION_READY=YES`
- `PRODUCTION_CHANGE=NO`

These values certify the design candidate only. They do not authorize migration, implementation, deployment, feature enablement or production data access.
