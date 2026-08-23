# Team Management P1 — Backend API Contract v1

Date: 2026-08-23

Status: `DESIGN_ONLY_NOT_PRODUCTION`

Dependencies:

- `team-management-design-v1.md`
- `team-management-db-contract-v1.md`

This candidate designs Backend API behavior only. It adds no route implementation, migration, schema, production configuration, Billing action, Stripe action, Credit account or Credit ledger change.

## 1. API decisions

1. Every route requires authenticated user identity and authoritative active customer Tenant resolution.
2. Organization authorization is server-derived from active Organization membership and the normalized role-permission catalog.
3. Client input never supplies authoritative `userId`, `tenantId`, owner, permission set, balance, or Billing scope.
4. A resource outside the caller's visible Tenant/Organization scope returns `404`, preventing enumeration. A visible resource with insufficient action permission returns `403`.
5. Mutations are idempotent, version-aware, transactionally audited and fail closed.
6. Organization deletion means soft archive. There is no runtime hard-delete route.
7. Invitation tokens are random, hashed at rest, expiring, single-use, Organization/Tenant-bound and replay-protected.
8. Product Organization roles do not grant platform Admin access.
9. The existing JSONL Enterprise Organization routes are not a production database authority. The DB-backed routes must replace—not dual-write with—the JSONL writer after migration/RLS certification.

## 2. Transport and envelope

### Base behavior

- Base path: `/api`
- Content type: `application/json`
- Authentication: existing secure user session/Bearer contract; never accept identity in request body
- Cache: `Cache-Control: private, no-store`
- Correlation: server validates or creates a safe `X-Correlation-ID` and returns it
- Mutation idempotency: `Idempotency-Key` required for create/invite/accept/ownership/archive operations
- Optimistic concurrency: `If-Match: "<rowVersion>"` or an explicit `expectedVersion` field as defined by the route, never both
- Unknown request properties: rejected with `REQUEST_SCHEMA_INVALID`

### Success envelope

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "correlationId": "safe-correlation-id"
  }
}
```

List responses add an opaque cursor:

```json
{
  "ok": true,
  "data": {
    "items": [],
    "pageInfo": {
      "nextCursor": null,
      "hasNextPage": false
    }
  },
  "meta": {
    "correlationId": "safe-correlation-id"
  }
}
```

### Error envelope

```json
{
  "ok": false,
  "error": {
    "code": "ORGANIZATION_PERMISSION_DENIED",
    "message": "You do not have permission to perform this Organization action.",
    "correlationId": "safe-correlation-id"
  }
}
```

Never return SQLSTATE, raw database/RLS text, JWT, stack, invitation token/hash, email ciphertext, provider data, Billing secret or full internal audit payload.

## 3. Authentication and authorization pipeline

Every request follows this order:

1. `requireUser` validates the production user session. Failure: `401 AUTH_REQUIRED`.
2. Resolve exactly one active `customer_tenant_membership` for the authenticated user. Missing/ambiguous/inactive evidence fails closed before Organization lookup.
3. Parse and validate route/body/header schema.
4. Load Organization inside the resolved Tenant only. Do not query globally and filter afterward.
5. Resolve active `organization_members` row and effective role permissions.
6. Enforce the route permission and special Owner invariants.
7. Execute repository/RPC operation inside the same Tenant/Organization scope.
8. RLS independently revalidates `auth.uid()`, Tenant, active membership and permission.
9. Mutation and immutable audit event commit atomically.
10. Return a safe projection and correlation ID.

Application authorization remains mandatory even when the server repository uses `service_role`; service credentials never replace the route permission check.

## 4. Shared schemas

### Organization summary

```json
{
  "id": "uuid",
  "slug": "design-studio",
  "name": "Design Studio",
  "status": "ACTIVE",
  "role": "OWNER",
  "permissions": ["ORGANIZATION_VIEW"],
  "memberCount": 1,
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "rowVersion": 1
}
```

The response omits `tenantId` unless a trusted internal client contract explicitly needs it. Tenant is resolved, not selected.

### Member summary

```json
{
  "memberId": "uuid",
  "displayName": "Safe display name",
  "avatarUrl": null,
  "role": "MEMBER",
  "status": "ACTIVE",
  "joinedAt": "ISO-8601",
  "rowVersion": 1,
  "isCurrentUser": false
}
```

Member lists do not expose email by default, Credits, customer Tenant Membership ID, admin status, provider usage, Billing data or private profile fields.

### Role values

- `OWNER`
- `ADMIN`
- `MEMBER`

No route accepts current Workspace roles (`MANAGER`, `CREATOR`, `REVIEWER`, `VIEWER`) as Organization roles.

## 5. Organization routes

### 5.1 `POST /api/organizations`

Purpose: explicitly create an Organization in the caller's resolved active Tenant and make the caller its single Owner.

Authentication: required.

Authorization: active customer Tenant member plus future product entitlement policy. There is no pre-existing Organization role; successful creation establishes `OWNER`.

Headers:

- `Idempotency-Key`: required, 16–200 safe characters

Request:

```json
{
  "name": "Design Studio",
  "slug": "design-studio"
}
```

Rules:

- `name`: 1–160 normalized characters.
- `slug`: optional; if absent, server proposes a normalized slug and resolves collisions without disclosing another Tenant.
- Reject `tenantId`, `ownerId`, `role`, `permissions`, `credits`, `plan`, `billingCustomerId` and unknown fields.
- Organization, Owner membership and `ORGANIZATION_CREATED` audit event commit atomically.
- Same idempotency key + same normalized request returns the original result; key reuse with a different request returns `409 IDEMPOTENCY_CONFLICT`.

Success: `201` for first creation, `200` for idempotent replay.

Response data:

```json
{
  "organization": { "id": "uuid", "slug": "design-studio", "name": "Design Studio", "status": "ACTIVE", "rowVersion": 1 },
  "currentAccess": { "role": "OWNER", "permissions": ["ORGANIZATION_VIEW", "MEMBER_INVITE"] },
  "created": true
}
```

### 5.2 `GET /api/organizations`

Purpose: list only Organizations where the caller has an active membership inside the resolved Tenant.

Query:

- `status=ACTIVE|SUSPENDED|ARCHIVED`, optional and allowlisted
- `limit`, default 25, maximum 100
- `cursor`, opaque server cursor

Do not accept `userId`, `tenantId`, arbitrary member IDs or email search.

Success: `200`, cursor-paginated Organization summaries. An empty visible set returns an empty list, not another Tenant's Organizations.

### 5.3 `GET /api/organizations/:id`

Permission: `ORGANIZATION_VIEW`.

Success response data:

```json
{
  "organization": { "id": "uuid", "slug": "design-studio", "name": "Design Studio", "status": "ACTIVE", "rowVersion": 3 },
  "currentAccess": { "role": "ADMIN", "permissions": ["ORGANIZATION_VIEW", "MEMBER_INVITE"] },
  "counts": { "members": 8 },
  "boundaries": { "billingEnabled": false, "organizationCreditsEnabled": false }
}
```

Outside visible scope: `404 ORGANIZATION_NOT_FOUND`.

### 5.4 `DELETE /api/organizations/:id` (required Owner lifecycle route)

Purpose: soft archive, never physical deletion.

Permission: `OWNER` plus `ORGANIZATION_MANAGE`; step-up authentication required. Admin/Member forbidden.

Headers: `Idempotency-Key`, `If-Match` required.

Request:

```json
{
  "reason": "No longer needed"
}
```

Success: `200` with `status="ARCHIVED"`, archive timestamp and incremented version. Existing members, Assets, Projects, audit and any future financial history remain intact. No Stripe/Billing/Credit action occurs.

### 5.5 `POST /api/organizations/:id/ownership-transfer` (required Owner lifecycle route)

Permission: Owner only, step-up authentication.

Headers: `Idempotency-Key`, `If-Match` required.

Request:

```json
{
  "targetMemberId": "uuid",
  "reason": "Ownership handoff"
}
```

The target must be an active same-Organization Admin/Member. The transaction changes target to Owner and previous Owner to Admin, preserves exactly one active Owner, increments member versions, and writes one `OWNERSHIP_TRANSFERRED` audit event. A generic role PATCH cannot create Owner.

## 6. Member and invitation routes

### 6.1 `GET /api/organizations/:id/members`

Permission: `MEMBER_VIEW`.

Query: `status`, `role`, `limit<=100`, opaque `cursor`. No cross-Organization search and no raw email search.

Success: `200` with safe Member summaries. RLS restricts the query to the requested visible Organization and resolved Tenant.

### 6.2 `POST /api/organizations/:id/invites`

Permission: `MEMBER_INVITE` (`OWNER`, `ADMIN`).

Headers: `Idempotency-Key` required.

Request:

```json
{
  "email": "invitee@example.com",
  "role": "MEMBER"
}
```

Rules:

- Role may be `ADMIN` or `MEMBER`, never `OWNER`.
- Server normalizes email, computes a versioned HMAC, generates at least 256 bits of random token entropy, stores only the token hash/HMAC, and sets a server-controlled expiry (default 72 hours, maximum 7 days).
- The token is passed once to the restricted delivery adapter; it is not returned to normal Frontend/Admin responses and is never logged.
- The route checks an existing active member and active pending invite transactionally.
- It does not create an auth user or customer Tenant Membership.
- Same idempotency key/request returns the original invite summary; duplicate active invite returns `409 INVITATION_ALREADY_PENDING`.

Success `201`:

```json
{
  "invite": {
    "inviteId": "uuid",
    "role": "MEMBER",
    "status": "PENDING",
    "expiresAt": "ISO-8601"
  },
  "delivery": { "status": "QUEUED" }
}
```

No response contains the email hash, ciphertext, plaintext token, token hash or Tenant ID.

### 6.3 `POST /api/organizations/invites/:token/accept`

Purpose: authenticated single-use invitation acceptance through the requested public contract.

Security note: because the token is in the path, reverse proxy, application access logs, tracing, analytics and error reporting must redact the entire token segment before this route can be enabled. Set `Referrer-Policy: no-referrer` and `Cache-Control: no-store`. A future body-token route is preferable, but this contract retains the required path.

Authentication: required before token resolution.

Headers: `Idempotency-Key` required.

Request body: empty object only.

Atomic acceptance:

1. Hash/HMAC the presented token with the configured key/version; never query plaintext.
2. Lock the invite row by token hash.
3. Validate `PENDING`, expiry, Organization active, token unused, and requested role not Owner.
4. Match authenticated user's verified normalized email to `target_email_hash`.
5. Resolve the user's active customer Tenant and require exact invite `tenant_id` match.
6. Ensure the user is not active in the Organization or reactivate only an allowed historical membership row.
7. Mark invite `ACCEPTED`, create/reactivate member and append audit events in one transaction.
8. Persist token-consumed evidence; a replay cannot create another member or event.

Success: `200` for first acceptance and safe idempotent replay with the same key.

Invalid/unrecognized token: `404 INVITATION_NOT_FOUND`.

Expired token: `410 INVITATION_EXPIRED`.

Previously consumed token with a different idempotency key: `409 INVITATION_ALREADY_USED` without revealing the accepting user.

Wrong authenticated email or Tenant: `404 INVITATION_NOT_FOUND`, preventing target enumeration.

### 6.4 `DELETE /api/organizations/:id/members/:memberId`

Permission: `MEMBER_REMOVE` (`OWNER`, `ADMIN`).

Headers: `Idempotency-Key`, `If-Match` required.

Request:

```json
{
  "reason": "Access no longer required"
}
```

Rules:

- Soft revoke the member; never delete history.
- Admin cannot revoke Owner. Owner cannot revoke the last Owner through this route.
- Self-leave is allowed for Admin/Member but not the last Owner.
- Revocation blocks future Organization/resource/Credit use immediately.
- It does not revoke or modify customer Tenant Membership, personal Credits, canonical ownership or historical Project/Asset attribution.

Success: `200` with revoked Member summary and incremented version. Idempotent replay returns the same terminal result.

### 6.5 `PATCH /api/organizations/:id/members/:memberId/role`

Permission: `MEMBER_REMOVE` plus Organization member administration policy (`OWNER`, `ADMIN`).

Headers: `If-Match` required.

Request:

```json
{
  "role": "ADMIN",
  "reason": "Project administration responsibility"
}
```

Rules:

- Generic role changes accept only `ADMIN` or `MEMBER`.
- Member cannot change any role or elevate itself.
- Admin cannot mutate Owner and cannot assign Owner.
- Owner assignment is possible only through ownership-transfer route.
- Target must be active, same Tenant and same Organization.
- Version conflict returns `412 MEMBER_VERSION_CONFLICT`.

Success: `200` with safe Member summary and effective permissions. No Workspace role is changed.

## 7. Permission route

### `GET /api/organizations/:id/permissions`

Permission: `ORGANIZATION_VIEW`.

The route returns only the current caller's effective Organization permissions and safe action flags. It accepts no `userId`, `memberId`, role override or resource ID.

Success:

```json
{
  "organizationId": "uuid",
  "role": "MEMBER",
  "permissions": [
    "ORGANIZATION_VIEW",
    "MEMBER_VIEW",
    "PROJECT_VIEW",
    "PROJECT_CREATE",
    "ASSET_VIEW",
    "ASSET_SHARE",
    "GENERATE_WITH_ORGANIZATION_CREDITS"
  ],
  "actions": {
    "canInviteMembers": false,
    "canRemoveMembers": false,
    "canManageProjects": false,
    "canManageAssets": false,
    "canManageCreditPolicy": false,
    "canTransferOwnership": false,
    "canManageBilling": false
  },
  "boundaries": {
    "organizationCreditsEnabled": false,
    "billingEnabled": false
  }
}
```

Permissions come from `organization_members -> organization_roles -> organization_role_permissions -> organization_permissions`; they are never calculated from client state or Workspace role.

`canManageBilling` is always false in P1. Future Owner Billing authority requires a separately reviewed permission catalog migration, Billing API contract and Stripe integration. This P1 route does not invent or enable Billing permission.

## 8. Permission matrix

| Route/action | Owner | Admin | Member | Special boundary |
| --- | :---: | :---: | :---: | --- |
| Create Organization | Yes | n/a | n/a | Active Tenant customer becomes Owner; product entitlement may gate later |
| List/get visible Organization | Yes | Yes | Yes | Only active same-Organization membership |
| Archive Organization | Yes | No | No | Soft archive + step-up auth |
| Transfer Owner | Yes | No | No | Dedicated route; exactly one Owner |
| List members | Yes | Yes | Yes | Safe projection |
| Invite Admin/Member | Yes | Yes | No | Cannot invite Owner |
| Remove Member | Yes | Yes | No | Admin cannot remove Owner |
| Change Admin/Member role | Yes | Yes | No | Admin cannot mutate/assign Owner |
| View allowed shared resources | Yes | Yes | Yes | Separate explicit resource permission required |
| Manage all Project permissions | Yes | Yes | No | Future resource API, not implemented here |
| Manage all Asset permissions | Yes | Yes | No | Future resource API, canonical owner unchanged |
| View Organization Credit balance | Yes | Yes | No | Future and disabled |
| Manage Organization Credit policy | Yes | Yes | No | Future policy only; no balance/Billing mutation |
| Manage Billing | Future Owner only | No | No | Not seeded, returned or enabled in P1 |

Self-elevation, cross-Tenant access, cross-Organization access, guessed Organization IDs and role data from Browser state are always denied.

## 9. Error contract

| HTTP | Safe code | When used |
| ---: | --- | --- |
| 400 | `REQUEST_SCHEMA_INVALID` | Invalid/unknown fields, malformed UUID, bad role/name/slug |
| 401 | `AUTH_REQUIRED` | Missing/invalid user authentication |
| 403 | `ORGANIZATION_PERMISSION_DENIED` | Resource is visible but caller lacks the requested action permission |
| 404 | `ORGANIZATION_NOT_FOUND` | Organization outside resolved Tenant/member visibility or absent |
| 404 | `MEMBER_NOT_FOUND` | Member outside visible Organization or absent |
| 404 | `INVITATION_NOT_FOUND` | Unknown token or email/Tenant mismatch |
| 409 | `ORGANIZATION_SLUG_CONFLICT` | Active slug already exists inside caller Tenant |
| 409 | `INVITATION_ALREADY_PENDING` | Same Organization/email has an active invite |
| 409 | `INVITATION_ALREADY_USED` | Valid token was already consumed; no identity disclosure |
| 409 | `MEMBER_ALREADY_ACTIVE` | Invite target is already active in Organization |
| 409 | `IDEMPOTENCY_CONFLICT` | Same key reused for different canonical request |
| 409 | `LAST_OWNER_REQUIRED` | Operation would leave no active Owner |
| 410 | `INVITATION_EXPIRED` | Valid invite is terminally expired |
| 412 | `MEMBER_VERSION_CONFLICT` | `If-Match` does not equal current row version |
| 429 | `ORGANIZATION_RATE_LIMITED` | Safe per-user/Tenant/Organization mutation limit |
| 503 | `ORGANIZATION_AUTHORITY_UNAVAILABLE` | Tenant, DB, RLS or permission authority unavailable; fail closed |

Do not translate `404` to `403` for hidden resources, and do not reveal whether a hidden Organization/member/invite exists.

## 10. Audit event contract

Mutation and audit event commit in one transaction. A successful business mutation without audit is a transaction failure. Idempotent replay does not append a duplicate event.

Required events:

- `ORGANIZATION_CREATED`
- `ORGANIZATION_ARCHIVED`
- `ORGANIZATION_INVITE_CREATED`
- `ORGANIZATION_INVITE_ACCEPTED`
- `ORGANIZATION_MEMBER_ADDED`
- `ORGANIZATION_MEMBER_REACTIVATED`
- `ORGANIZATION_MEMBER_REVOKED`
- `ORGANIZATION_MEMBER_ROLE_CHANGED`
- `ORGANIZATION_OWNERSHIP_TRANSFERRED`

Safe event fields:

- event ID/type
- Organization/Tenant scope IDs
- authenticated actor ID
- target type/ID
- safe before/after role or status
- reason code, not unbounded free-form secrets
- idempotency fingerprint
- correlation ID
- timestamp

Forbidden audit content:

- plaintext invitation token or token hash
- full email or email list
- email ciphertext/HMAC
- JWT/session data
- IP unless existing privacy policy explicitly approves a truncated/security field
- Asset signed URL/content, prompt, Provider payload, SQL, stack, credentials
- Billing/Stripe secrets or card data

High-risk denied attempts may emit a separate rate-limited security log with safe category and Organization fingerprint; they never write a successful business event.

## 11. RLS boundary

API authorization and RLS are both required:

- Organization reads: active member + `ORGANIZATION_VIEW` + resolved Tenant match.
- Member reads: active same-Organization member + `MEMBER_VIEW`.
- Invites: Owner/Admin permission; acceptance uses a restricted token RPC plus authenticated email/Tenant checks.
- Member removal/role change: dedicated RPC validates caller role, target role, version and last-Owner invariant.
- No direct authenticated table writes.
- `anon` has no table access.
- Service-role repository queries still receive pre-resolved actor/Tenant scope and cannot accept Browser identity fields.

RLS ambiguity, missing active customer Tenant membership, permission catalog drift or database errors return fail-closed safe errors. No endpoint falls back to JSONL authority, Browser roles, Tenant-wide access or Workspace permissions.

## 12. Migration dependency and authority cutover

This API must remain unmounted until all of the following are separately completed:

1. The reviewed Team DB migration exists and has passed dry-run, rollback and RLS tests.
2. Required role/permission seeds exactly match the API contract.
3. DB-backed repository and transactional RPCs pass cross-Tenant, cross-Organization, idempotency, last-Owner and invite replay tests.
4. Safe audit writes are atomic with every mutation.
5. Production feature flags default off.

Current Backend already mounts Enterprise JSONL-backed handlers at `/api/organizations`. Cutover rule:

- never mount the new DB writer alongside the JSONL writer for the same route;
- never dual-write Organization/membership authority;
- shadow comparison may read both stores but cannot authorize or mutate from the shadow result;
- choose one authoritative router per request through an off-by-default server flag;
- enable DB reads before DB writes for one allowlisted Tenant;
- disable JSONL mutation paths before enabling DB mutation paths;
- rollback disables the DB router/write flag and preserves DB audit/data read-only; it does not copy DB state back into JSONL.

No existing customer Tenant Membership, Workspace role, Credit ledger, Asset, Project, Billing or Stripe data is migrated by this API phase.

## 13. API architecture validation matrix

Before implementation approval, fixtures must cover:

- authenticated create -> single Organization + Owner + audit; idempotent replay unchanged
- unauthenticated -> 401
- active Tenant customer but non-member -> hidden Organization 404
- same Tenant/different Organization -> 404
- different Tenant/guessed UUID -> 404 before resource read
- Owner/Admin/Member permission matrix
- Member self-elevation -> 403
- Admin attempts Owner assignment/removal -> 403/409
- last Owner revoke/archive/leave protections
- invite token entropy/hash-at-rest/log redaction
- invite expiry, single use, replay, wrong email, wrong Tenant and duplicate pending conflict
- member revoke immediately blocks reads/writes but preserves history
- role change optimistic concurrency conflict
- audit exactly once and privacy redaction
- database/RLS/permission authority unavailable -> fail closed
- JSONL and DB writers never active concurrently
- no Billing, Stripe, personal Credit or customer Tenant Membership mutation

## 14. Candidate safety statement

- Backend route implemented: `NO`
- Migration created/applied: `NO`
- Production schema changed: `NO`
- JSONL/DB authority changed: `NO`
- Organization/member/invite created: `NO`
- Billing changed: `NO`
- Stripe changed: `NO`
- Credit ledger changed: `NO`
- Credit balance changed: `NO`
- Customer Tenant Membership changed: `NO`
- Workspace role changed: `NO`
- Production changed: `NO`
