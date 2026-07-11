# Multi-Tenant Phase G: Backend Foundation Implementation Plan

**Status:** Design only

**Scope:** Backend tenant context, RBAC, and tenant-safe read APIs

**Current tenants:** `shadowedge`, `gold-tide`
**Out of scope:** Code, SQL, schema creation, migration, database changes, deployment, and write operations

## References

- `docs/runbooks/multi-tenant-phase-f-backend-isolation-plan.md`
- `docs/runbooks/multi-tenant-phase-e-database-model-design-plan.md`
- `docs/runbooks/multi-tenant-rbac-phase-d-implementation-plan.md`

## Executive Decision

Phase G should establish the backend security boundary before Gold-Tide Admin is connected to production data. The implementation order is deliberately strict:

1. G1 establishes a trusted, fail-closed tenant context.
2. G2 authorizes that context with tenant-scoped RBAC.
3. G3 exposes new read-only APIs through tenant-filtered repositories and safe DTOs.

The existing `/api/admin/*` surface remains available only for the existing ShadowEdge internal Admin during migration. Gold-Tide Admin must use a separate `/api/tenant-admin/*` surface and must never rely on frontend filtering.

## Preconditions

Phase G implementation must not be enabled for production traffic until the following separately approved prerequisites exist:

- The Phase E tenant and RBAC data model has been implemented through a reviewed migration.
- The canonical tenants are `shadowedge` and `gold-tide`; `newbrand` is only a historical brand/config alias and must normalize to `gold-tide`, never to a third tenant.
- Admin identities have explicit tenant assignments and roles.
- Records exposed through tenant APIs have a trustworthy `tenant_id`, or are excluded as unknown.
- Historical records have documented mapping confidence; uncertain records are not guessed into Gold-Tide.
- The initial feature flag is disabled by default.
- Gold-Tide access remains read-only until isolation tests pass.

## 1. Implementation Scope

### G1: Tenant Context Middleware

G1 creates the trusted tenant context used by every later tenant-admin operation.

**Responsibilities**

- Authenticate the request using the existing JWT identity mechanism.
- Resolve the requested tenant from an approved server-side source.
- Normalize supported aliases, including mapping `newbrand` to `gold-tide` where historical configuration requires it.
- Verify that the tenant exists and is active.
- Verify that the authenticated identity has an active assignment to that tenant.
- Attach an immutable tenant context to the request.
- Reject missing, unknown, inactive, ambiguous, or unauthorized tenant context before any tenant data query.
- Record a sanitized authorization decision for auditing without logging tokens or secrets.

**Tenant selection rules**

- A `super_admin` may select an explicit tenant only through an approved internal workflow.
- A tenant administrator receives tenant scope from a server-side assignment, not from an untrusted client claim alone.
- Hostname, route parameter, header, or token metadata may identify a requested tenant, but none is sufficient without assignment verification.
- A missing tenant does not default to `shadowedge` and does not fall back to global access.
- Multiple tenant assignments require an explicit, authorized selection; the backend must not choose silently.

**Tenant context contents**

- Authenticated identity ID
- Canonical tenant ID and slug
- Tenant status
- Assignment ID and status
- Effective role IDs
- Effective permission set, populated by G2
- Request correlation ID

The context must not contain provider credentials, service-role credentials, payment configuration, raw tokens, or other secrets.

**G1 acceptance gate**

- Valid assignments produce the expected canonical tenant context.
- `newbrand` never creates or resolves to a separate tenant.
- Missing, unknown, inactive, and unauthorized tenant requests fail closed.
- No tenant repository runs before context resolution succeeds.
- Existing `/api/admin/*` behavior remains unchanged.
- The tenant-admin route group can be disabled independently.

### G2: RBAC Middleware

G2 authorizes actions inside the trusted G1 tenant context.

**Initial roles**

| Role | Scope | Initial capability |
|---|---|---|
| `super_admin` | Platform-wide internal administration | Existing internal Admin plus explicit tenant inspection |
| `tenant_admin` | One assigned tenant | Tenant users, jobs, usage, and credits read access |
| `support_admin` | One assigned tenant | Limited user/job support reads; no provider or cost data |
| `viewer` | One assigned tenant | Aggregate usage views only unless explicitly expanded |

**Initial permissions**

- `users.read`
- `jobs.read`
- `usage.read`
- `credits.read`
- `credits.write` reserved for a later phase and not enabled in Phase G

**Responsibilities**

- Load active role assignments for the authenticated identity and resolved tenant.
- Expand roles into an effective permission set.
- Require an explicit permission for every tenant-admin route.
- Deny expired, disabled, revoked, cross-tenant, or incomplete assignments.
- Keep the existing global `is_admin` and email allowlist mechanisms out of the tenant authorization decision.
- Ensure that legacy global Admin authorization cannot bypass tenant scope on `/api/tenant-admin/*`.
- Make cache keys tenant- and identity-aware, with invalidation after assignment or role changes.

**G2 acceptance gate**

- Every tenant route declares and enforces a permission.
- A valid role in one tenant grants no access to another tenant.
- Removing an assignment revokes access within the documented cache window.
- `viewer` cannot reach user-level or job-level detail unless separately authorized.
- Permission denial returns a stable safe error without revealing whether another tenant's resource exists.

### G3: Tenant-Safe Read APIs

G3 adds a separate read-only API family backed by tenant-required repositories and safe DTOs.

**Responsibilities**

- Add `/api/tenant-admin/*` without replacing `/api/admin/*` during migration.
- Require G1 tenant context and G2 permission checks for every route.
- Require `tenant_id` as a non-optional repository input.
- Apply tenant filtering in the first database query, including count and aggregate queries.
- Use tenant-safe DTO builders with explicit field allowlists.
- Keep pagination, filtering, search, sorting, exports, and cache entries within tenant scope.
- Exclude records with unknown or untrusted tenant mapping.
- Return read-only data for Users, Jobs, and Usage only.

**G3 acceptance gate**

- Gold-Tide responses contain only `gold-tide` records.
- ShadowEdge tenant responses contain only `shadowedge` records.
- Counts, summaries, pages, filters, and detail routes agree with the same tenant boundary.
- No provider, internal cost, credential, VLM, storage, or diagnostic fields appear in tenant DTOs.
- All security validation in Section 5 passes before production enablement.

## 2. First Implementation Targets

### Auth Context

The auth context adapter should convert the existing verified JWT identity into a minimal internal identity object. It should be shared by G1 and G2 but remain separate from legacy global Admin authorization.

Required outcomes:

- Verified user identity
- Stable subject/user ID
- Authentication state
- Request correlation ID
- No trust in client-supplied role or tenant values

### Tenant Resolver

The tenant resolver should accept the authenticated identity plus an approved tenant hint, normalize the tenant slug, and verify tenant and assignment status. It must return one canonical tenant or deny the request.

Resolution priority must be documented before implementation. A recommended order is an explicit server-approved tenant selection, followed by a deployment/host mapping where applicable. Client headers may express intent but cannot establish authorization.

### Permission Checker

The permission checker should evaluate the resolved tenant assignment and effective role permissions against the permission declared by the route. Authorization must be deterministic, auditable, and deny by default.

The checker should distinguish operationally between unauthenticated, tenant context missing, assignment denied, and permission denied while returning client-safe errors that do not leak cross-tenant resource existence.

### Tenant DTO Builder

Tenant DTOs must be built from explicit allowlists rather than by removing fields from internal objects. Separate DTO families are required for internal Admin and tenant Admin.

Tenant DTOs must hide:

- Provider identity and routing details where not needed by the partner
- Provider request/job IDs and raw provider errors
- Internal model/provider diagnostics
- Provider costs, internal rates, margins, and profitability data
- API keys, tokens, credentials, signed secrets, and raw metadata
- VLM diagnostics and internal moderation/provider traces
- Storage bucket internals and service-role details

## 3. API Migration Strategy

### Keep Existing Internal APIs

`/api/admin/*` remains the ShadowEdge internal administration surface during Phase G. Its current behavior is not silently changed, and Gold-Tide Admin receives no access to it.

The existing surface remains a known risk until separately hardened. Keeping it during migration prevents an unsafe big-bang replacement, but route guards and deployment configuration must ensure it is unavailable to tenant-admin identities.

### Add Tenant APIs

The new `/api/tenant-admin/*` surface uses a separate router, middleware chain, repository layer, DTO family, tests, and Admin client types.

| Proposed endpoint | Permission | Phase G purpose |
|---|---|---|
| `GET /api/tenant-admin/me` | Authenticated tenant assignment | Return safe tenant, role, and permission context |
| `GET /api/tenant-admin/users` | `users.read` | Paginated tenant member list |
| `GET /api/tenant-admin/users/:userId` | `users.read` | Tenant-scoped user detail |
| `GET /api/tenant-admin/jobs` | `jobs.read` | Paginated tenant generation/job list |
| `GET /api/tenant-admin/jobs/:jobId` | `jobs.read` | Safe tenant job detail |
| `GET /api/tenant-admin/usage/summary` | `usage.read` | Aggregate counts, outcomes, and net credits |
| `GET /api/tenant-admin/usage/timeseries` | `usage.read` | Tenant usage over time |
| `GET /api/tenant-admin/usage/models` | `usage.read` | Safe model-level aggregation without provider internals |

Endpoint naming may be adjusted to existing backend conventions, but the separate tenant-admin boundary and permission model should remain.

### Compatibility and Cutover

- ShadowEdge Admin continues using `/api/admin/*` initially.
- Gold-Tide Admin is built only against `/api/tenant-admin/*`.
- Shared Admin UI components may be reused, but API clients and DTO types remain distinct.
- No fallback from a failed tenant API request to a global Admin API is allowed.
- A future ShadowEdge tenant-mode UI may adopt tenant APIs after parity and security validation.

## 4. Read-Only MVP

### Users

The tenant user list is based on active `tenant_users` membership, not every global profile. A tenant user detail response should expose only partner-operational fields such as safe identity display, tenant membership status, tenant-scoped activity summary, and tenant-scoped credit presentation when trustworthy.

Global account relationships, other tenant memberships, internal flags, provider identities, and platform-wide credit values must not be exposed.

### Jobs

Job list and detail queries must require both the requested job ID and the resolved tenant ID. Safe fields may include request type, public model label, status/outcome, resolution, duration, timestamps, and tenant-scoped credit impact where available.

Provider routing, provider costs, raw errors, internal retries, provider job identifiers, API payloads, and storage internals remain hidden.

### Usage

Usage endpoints should read from tenant-stamped usage facts or validated tenant-scoped source views. Initial metrics may include request counts, success/failure outcomes, image/video split, safe model labels, net credits, and time trends.

Unknown provider, duration, or credit values should remain explicitly unknown rather than being inferred. Tenant admins receive no provider breakdown or internal cost analytics.

### MVP Exclusions

- Credit grants, deductions, refunds, or adjustments
- User suspension or deletion
- Job cancellation, retry, or provider rerouting
- Tenant settings changes
- Exports containing sensitive or cross-tenant fields
- Provider, cost, payment, VLM, storage, or diagnostic views

## 5. Security Validation

| Test area | Required scenario | Expected result |
|---|---|---|
| IDOR | Gold-Tide admin requests a known ShadowEdge user/job ID | Denied or safe not-found; no existence leak |
| Missing tenant | Authenticated request reaches tenant route without tenant context | Fails before any data query |
| Unknown tenant | Request supplies an unsupported tenant or alias | Denied; no fallback to global or ShadowEdge |
| Cross-tenant role | Valid Gold-Tide role requests ShadowEdge scope | Denied regardless of resource ID |
| Service role | Repository uses service-role client without required tenant filter | Test fails and query is not issued |
| DTO leakage | Source object contains provider, cost, key, VLM, or raw metadata fields | Tenant response omits all restricted fields |
| Count leakage | Pagination total or aggregate includes another tenant | Test fails; all counts remain tenant-scoped |
| Search leakage | Search term matches records in multiple tenants | Only current tenant results are returned |
| Cache leakage | Identical URL/filter is requested by different tenants | Cache keys and entries remain isolated |
| Role revocation | Assignment is disabled after a previous authorized request | Access is revoked within the defined cache window |
| Legacy bypass | Tenant identity calls `/api/admin/*` directly | Denied; no fallback or proxy path |
| Unknown history | Record has no trusted tenant mapping | Excluded from tenant response and reported for audit |

Security testing should cover route handlers, repositories, DTO serialization, pagination, aggregations, cache behavior, and direct URL access. Browser UI hiding is not evidence of isolation.

## 6. Rollback and Release Controls

### Feature Flag

The tenant-admin API family should be controlled by a backend feature flag that defaults off. Rollout should support enabling the router in a controlled environment and, where practical, enabling specific tenants or read modules independently.

The flag is a release control, not a security control. Middleware and tenant filters remain mandatory when enabled.

### API Isolation

- New routes live under a separate router and do not modify existing Admin route behavior.
- Gold-Tide Admin has no credentials or code path for `/api/admin/*`.
- Users, Jobs, and Usage modules can be disabled independently if a module fails validation.
- Cache namespaces are separate from global Admin caches.

### Non-Destructive Rollback

If an isolation or response problem is found:

1. Disable the affected tenant-admin module or the complete tenant-admin feature flag.
2. Revoke Gold-Tide Admin access without changing user or generation data.
3. Clear only tenant-admin cache namespaces if needed.
4. Preserve tenant assignments, audit records, and stamped operational data for investigation.
5. Keep the existing ShadowEdge internal Admin route available to authorized internal operators.

Rollback must not remove tenant IDs, delete historical records, merge tenants, or rewrite membership data. Any schema migration and its rollback require a separate reviewed plan.

## 7. Future Scope

### Credits Write

Credit writes should begin only after a tenant-specific credit account and immutable ledger are defined, idempotency is enforced, actor/reason/audit fields are mandatory, and cross-tenant balance tests pass. Phase G exposes no credit write endpoint.

### Settings

Future settings APIs may support tenant-safe brand and operational preferences. Provider credentials, platform pricing internals, storage credentials, payment configuration, and backend environment values remain platform-only.

### Admin Actions

User support actions, job actions, exports, and other mutations should be added one at a time with dedicated permissions, tenant-constrained repositories, audit events, idempotency where applicable, and rollback behavior.

## Implementation Order and Deliverables

### G0: Readiness Gate

- Confirm separately approved tenant/RBAC schema availability.
- Confirm trusted tenant mapping for the MVP data set.
- Confirm Gold-Tide admin assignments and role matrix.
- Confirm the tenant-admin feature flag is disabled.
- Freeze safe DTO field lists for Users, Jobs, and Usage.

### G1: Tenant Context

- Auth context adapter
- Tenant alias and status resolver
- Tenant membership/assignment verifier
- Immutable request tenant context
- Fail-closed errors and sanitized audit decisions
- Unit and integration tests for context resolution

### G2: RBAC

- Role assignment loader
- Permission expansion and checker
- Route permission declarations
- Assignment-aware cache and invalidation rules
- Role/permission denial test suite

### G3: Tenant-Safe Reads

- Isolated tenant-admin router
- Tenant-required Users, Jobs, and Usage repositories
- Tenant-safe DTO builders
- Pagination, search, aggregate, and cache isolation
- End-to-end security test matrix
- Controlled, read-only Gold-Tide pilot after approval

## Observability and Audit Requirements

The implementation should record sanitized events for authentication result, tenant resolution, role/permission decision, denied cross-tenant attempts, route, response class, and correlation ID. Logs must not include access tokens, refresh tokens, passwords, provider keys, service-role keys, raw generation prompts where unnecessary, or sensitive provider payloads.

Operational dashboards should distinguish authentication failures, missing tenant context, permission denials, unknown historical records, and server errors. A sudden increase in cross-tenant denials or unknown tenant data should block rollout expansion.

## Phase G Exit Criteria

Phase G is complete only when:

- Tenant context is established server-side and fails closed.
- RBAC is tenant-scoped and independent of the legacy global Admin check.
- Users, Jobs, and Usage APIs enforce tenant filtering in repositories.
- Gold-Tide DTOs expose no provider, cost, credential, VLM, storage, or diagnostic internals.
- All IDOR, missing-tenant, cross-tenant, service-role, DTO, cache, pagination, and aggregate tests pass.
- Gold-Tide Admin remains read-only.
- The tenant API can be disabled without destructive migration or impact to ShadowEdge internal Admin.
- Production activation, database migration, Admin UI work, and deployment remain separately approved phases.

## Explicit Non-Actions

This plan does not modify code, create SQL, create tables, migrate or backfill data, change the database, call production APIs, alter authentication, change permissions, deploy services, or expose Gold-Tide Admin access.
