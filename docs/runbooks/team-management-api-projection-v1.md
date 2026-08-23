# Team Management P1.1 — Backend Permission Projection Contract v1

Date: 2026-08-23

Status: `DESIGN_ONLY_NOT_PRODUCTION`

Dependencies:

- `team-management-db-contract-v1.md`
- `team-management-api-contract-v1.md`
- `team-management-frontend-contract-v1.md`

This candidate specifies safe Backend projections required by the `/team` Frontend. It implements no API, route, repository, migration, production schema, RLS policy, Billing behavior, Credit account or Credit ledger change.

## 1. Projection decisions

1. Projection authority is server-side. Frontend never infers an action from `OWNER`, `ADMIN`, `MEMBER`, Workspace roles, cached state or hidden controls.
2. Member actions are target-specific: Backend evaluates caller, Organization, target member, both current statuses, Owner invariants and row versions.
3. Permission display is a presentation-safe projection of the effective Backend authorization result, not a downloadable permission database.
4. Invitation projection returns safe lifecycle status only. It never returns token, token hash/HMAC, email ciphertext, secret, raw invite row or raw audit data.
5. `canCreateOrganization` is calculated by Backend from authenticated customer/Tenant/product policy state. Authentication alone is not enough.
6. Every projection is Tenant- and Organization-scoped, private/no-store and bound to the authenticated user.
7. Projection booleans improve UX but do not authorize a mutation. The mutation route re-evaluates authorization and RLS.

## 2. Common projection envelope

Every projection response uses the P1 safe envelope and adds an explicit version:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "correlationId": "safe-correlation-id",
    "projectionVersion": "team-management-projection-v1"
  }
}
```

Headers:

- `Cache-Control: private, no-store`
- `Vary: Authorization, Cookie`
- safe `X-Correlation-ID`

The projection must not be placed in a public/shared CDN cache, service worker offline cache, localStorage or sessionStorage.

## 3. Member Projection

### API dependencies

- `GET /api/organizations/:id/members`
- successful responses from member removal and role-change routes return the same Member Projection shape

### Schema

```ts
type OrganizationMemberProjectionV1 = {
  memberRef: string;
  identityDisplay: {
    displayName: string;
    initials: string;
    avatarUrl: string | null;
    isCurrentUser: boolean;
  };
  role: "OWNER" | "ADMIN" | "MEMBER";
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
  joinedAt: string;
  rowVersion: number;
  allowedActions: {
    canChangeRole: boolean;
    assignableRoles: Array<"ADMIN" | "MEMBER">;
    canRemove: boolean;
    canViewSharedResources: boolean;
    canManageProjects: boolean;
    canManageAssets: boolean;
  };
};
```

`memberRef` is an opaque API reference required by member mutation routes. It may map to a membership UUID but is never shown as identity, copied, logged by Frontend analytics or used for permission inference.

### Identity display

- `displayName` is a server-sanitized public profile display label. If unavailable, use a localized neutral label such as “Team member”; never fall back to UUID/email.
- `initials` is server-produced from safe display data and contains at most two grapheme clusters.
- `avatarUrl` is either null or an approved safe application URL; never a signed private Asset URL.
- Member Projection does not return email, customer Tenant Membership ID, Tenant ID, Credits, Billing, platform Admin status, Provider usage or private profile metadata.

### Backend computation of `allowedActions`

Backend computes each member row independently using:

- authenticated caller and resolved active customer Tenant;
- active caller Organization membership;
- effective normalized role permissions;
- Organization active status;
- target member role/status/version;
- Owner/last-Owner constraints;
- same-Organization and same-Tenant checks;
- future resource policy availability.

Required invariants:

- A Member always receives `canChangeRole=false`, `assignableRoles=[]`, `canRemove=false` for every target.
- An Admin cannot change/remove Owner and can never assign Owner.
- An Owner uses ownership-transfer, not RoleSelector, to create a new Owner.
- `assignableRoles` contains only roles legal for this caller/target at response time.
- A caller may remove itself only when Backend returns `canRemove=true`; last Owner remains false.
- Suspended/revoked caller or Organization returns no actionable projection.
- A projection cannot authorize a later request after role/status/version changes; mutation re-checks.

### List response

```json
{
  "items": [
    {
      "memberRef": "opaque-member-reference",
      "identityDisplay": {
        "displayName": "Avery",
        "initials": "AV",
        "avatarUrl": null,
        "isCurrentUser": false
      },
      "role": "MEMBER",
      "status": "ACTIVE",
      "joinedAt": "ISO-8601",
      "rowVersion": 4,
      "allowedActions": {
        "canChangeRole": true,
        "assignableRoles": ["ADMIN", "MEMBER"],
        "canRemove": true,
        "canViewSharedResources": true,
        "canManageProjects": false,
        "canManageAssets": false
      }
    }
  ],
  "pageInfo": {
    "nextCursor": null,
    "hasNextPage": false
  }
}
```

## 4. Permission Projection

### API dependency

`GET /api/organizations/:id/permissions`

### Schema

```ts
type OrganizationPermissionProjectionV1 = {
  role: "OWNER" | "ADMIN" | "MEMBER";
  permissionDisplay: Array<{
    permissionKey: string;
    groupKey: "organization" | "members" | "projects" | "assets" | "credits" | "billing";
    labelKey: string;
    descriptionKey: string;
    state: "ALLOWED" | "DENIED" | "UNAVAILABLE";
  }>;
  availableActions: {
    canInviteMembers: boolean;
    canRemoveMembers: boolean;
    canManageProjects: boolean;
    canManageAssets: boolean;
    canViewCreditBalance: boolean;
    canManageCreditPolicy: boolean;
    canTransferOwnership: boolean;
    canArchiveOrganization: boolean;
    canManageBilling: boolean;
  };
  assignableRoles: {
    invite: Array<"ADMIN" | "MEMBER">;
    memberRoleChange: Array<"ADMIN" | "MEMBER">;
  };
  boundaries: {
    organizationCreditsEnabled: boolean;
    billingEnabled: boolean;
  };
};
```

### Projection rules

- `permissionDisplay` order and state are produced by Backend from the effective catalog and product boundary.
- `labelKey`/`descriptionKey` are allowlisted localization keys, not arbitrary database text or secrets.
- `ALLOWED` means effective permission exists and the capability is implemented/enabled.
- `DENIED` means the visible caller lacks permission.
- `UNAVAILABLE` means permission may conceptually exist but the capability is not implemented/enabled.
- Organization Credits and Billing remain `UNAVAILABLE`; `canManageBilling=false` and `billingEnabled=false` in P1.1.
- `availableActions` is caller-wide convenience projection. Target-specific member actions still come from each Member Projection and take precedence.
- `assignableRoles.invite` and `.memberRoleChange` never contain `OWNER`.
- Frontend localizes exact keys and renders states; it does not derive missing permission rows or action booleans.
- Do not return role catalog IDs, permission catalog IDs, RLS policy/function names, SQL, platform Admin permissions or another role's effective projection.

### Example

```json
{
  "role": "ADMIN",
  "permissionDisplay": [
    {
      "permissionKey": "MEMBER_INVITE",
      "groupKey": "members",
      "labelKey": "team.permissions.memberInvite.label",
      "descriptionKey": "team.permissions.memberInvite.description",
      "state": "ALLOWED"
    },
    {
      "permissionKey": "BILLING_MANAGE",
      "groupKey": "billing",
      "labelKey": "team.permissions.billingManage.label",
      "descriptionKey": "team.permissions.billingManage.description",
      "state": "UNAVAILABLE"
    }
  ],
  "availableActions": {
    "canInviteMembers": true,
    "canRemoveMembers": true,
    "canManageProjects": true,
    "canManageAssets": true,
    "canViewCreditBalance": false,
    "canManageCreditPolicy": false,
    "canTransferOwnership": false,
    "canArchiveOrganization": false,
    "canManageBilling": false
  },
  "assignableRoles": {
    "invite": ["ADMIN", "MEMBER"],
    "memberRoleChange": ["ADMIN", "MEMBER"]
  },
  "boundaries": {
    "organizationCreditsEnabled": false,
    "billingEnabled": false
  }
}
```

`BILLING_MANAGE` in the display example is a safe unavailable UX concept, not an activated permission catalog row or Billing authorization.

## 5. Invitation Projection

### API dependencies

- new safe read projection: `GET /api/organizations/:id/invites`
- `POST /api/organizations/:id/invites` returns the created Invitation Projection

Authorization:

- Organization must be visible in the resolved Tenant.
- Caller must have `MEMBER_INVITE`; otherwise visible Organization returns `403`.
- Hidden/cross-Tenant/cross-Organization scope returns `404`.

### Status values

- `PENDING`
- `EXPIRED`
- `ACCEPTED`

`REVOKED` may be added only when a revoke API/UX contract is approved; it is not synthesized in P1.1.

### Schema

```ts
type OrganizationInvitationProjectionV1 = {
  inviteRef: string;
  recipientDisplay: string;
  role: "ADMIN" | "MEMBER";
  status: "PENDING" | "EXPIRED" | "ACCEPTED";
  createdAt: string;
  expiresAt: string;
  terminalAt: string | null;
  allowedActions: {
    canReinvite: boolean;
  };
};
```

Projection rules:

- `inviteRef` is an opaque API/UI key, not a raw token, token hash or database identity display. Frontend never renders or copies it.
- `recipientDisplay` is a server-masked label such as `a***@example.com`; full email is not required for the list.
- `EXPIRED` is computed by Backend from immutable expiry/status evidence, never by Frontend clock alone. Frontend may update countdown presentation but refetches before action.
- `ACCEPTED` contains no accepting user identity; MemberList is the membership source.
- `canReinvite` is Backend-computed and false for active Pending/Accepted, insufficient permission or unavailable delivery.
- Cursor sorting uses server state, not exposed IDs.

Forbidden response fields/content:

- plaintext token or acceptance URL;
- token hash/HMAC, HMAC key version or secret;
- target email HMAC/ciphertext;
- raw invitation row, raw metadata or audit payload;
- Tenant ID, customer Tenant Membership ID, inviter/acceptor internal IDs;
- delivery provider payload, credential, stack or SQL.

### List request/response

Query:

- `status=PENDING|EXPIRED|ACCEPTED`, optional
- `limit`, default 25, maximum 100
- opaque `cursor`

Response:

```json
{
  "items": [
    {
      "inviteRef": "opaque-invite-reference",
      "recipientDisplay": "a***@example.com",
      "role": "MEMBER",
      "status": "PENDING",
      "createdAt": "ISO-8601",
      "expiresAt": "ISO-8601",
      "terminalAt": null,
      "allowedActions": { "canReinvite": false }
    }
  ],
  "pageInfo": {
    "nextCursor": null,
    "hasNextPage": false
  }
}
```

## 6. Organization Capability Projection

### API dependency

Extend `GET /api/organizations` data with top-level capability:

```ts
type OrganizationListCapabilitiesV1 = {
  canCreateOrganization: boolean;
  createAvailability: "ALLOWED" | "DENIED" | "UNAVAILABLE";
  createDisplayReasonKey: string | null;
};
```

Example:

```json
{
  "items": [],
  "capabilities": {
    "canCreateOrganization": true,
    "createAvailability": "ALLOWED",
    "createDisplayReasonKey": null
  },
  "pageInfo": {
    "nextCursor": null,
    "hasNextPage": false
  }
}
```

Backend evaluates:

- authenticated active profile;
- exactly one active customer Tenant Membership;
- Tenant active status;
- product feature flag/entitlement policy when implemented;
- Organization creation limit/rate policy;
- DB/RLS/migration authority availability.

Rules:

- The Frontend cannot replace this with `organizations.length === 0`, role, plan label or local feature flag.
- If policy/authority is unavailable, return `canCreateOrganization=false`, `createAvailability="UNAVAILABLE"`; do not optimistically allow creation.
- `createDisplayReasonKey` is an allowlisted safe localization key. It never contains Billing detail, SQL, internal plan/feature IDs or Tenant identity.
- This capability does not mutate Billing, subscribe a plan, allocate Credits or create an Organization.

## 7. Projection consistency and invalidation

- Projection version is immutable for response-shape compatibility.
- Member/Permission/Invitation projections use the same transactionally consistent Organization membership/role snapshot where possible.
- A successful invite, accept, member revoke, role change, ownership transfer or Organization archive invalidates all affected Organization projection caches.
- Permission projection is actor-specific; Member Projection actions are actor-and-target-specific.
- Cache keys include authenticated session fingerprint, resolved Tenant fingerprint, Organization reference, target reference where applicable, projection version and relevant row version.
- Sign-out, token refresh to another user, Tenant resolution change or Organization switch clears all projection data.
- Stale-while-revalidate may retain safe read text but must disable mutations until fresh action projection is available.
- No projection is persisted in browser storage or shared across users/Organizations.

## 8. Security and RLS compatibility

### Tenant isolation

- Resolve active Tenant from authenticated user before any Organization query.
- Every repository/RPC query carries the resolved Tenant and Organization composite scope.
- A guessed Organization/member/invite reference from another Tenant returns `404` without evidence lookup leakage.

### Organization isolation

- Active customer Tenant Membership alone is insufficient.
- Caller requires active Organization membership for detail/member/permission access.
- Invitation list additionally requires `MEMBER_INVITE`.
- Member actions are calculated only against targets in the same visible Organization.
- No projection lists Tenant-wide members, Assets, Projects or invitations.

### RLS compatibility

- API authorization and RLS both validate `auth.uid()`, resolved Tenant, active Organization membership and route permission.
- Projection repositories do not bypass RLS semantics when using service role; application checks remain mandatory.
- `anon` has no projection table access.
- Missing/ambiguous Tenant, Organization membership, permission catalog drift, RLS/database error or projection computation error fails closed.

### 403/404 contract

| Situation | HTTP | Safe code |
| --- | ---: | --- |
| Not authenticated | 401 | `AUTH_REQUIRED` |
| Organization hidden/absent/cross-Tenant | 404 | `ORGANIZATION_NOT_FOUND` |
| Member hidden/absent/cross-Organization | 404 | `MEMBER_NOT_FOUND` |
| Visible Organization but invitation list permission missing | 403 | `ORGANIZATION_PERMISSION_DENIED` |
| Visible member but requested mutation action unavailable | 403 | `ORGANIZATION_PERMISSION_DENIED` |
| Projection authority unavailable | 503 | `ORGANIZATION_PROJECTION_UNAVAILABLE` |

Do not reveal which Tenant/Organization/target caused a hidden `404`. Do not convert an unavailable authority into permissive defaults.

## 9. Projection audit contract

Required event names:

- `member_viewed`
- `invite_created`
- `role_changed`
- `permission_changed`

### `member_viewed`

- Emitted for an authorized member-list view, not once per member row.
- Records Organization/Tenant scope, actor, correlation ID, timestamp, safe result-count bucket and filter category.
- Never records the returned identities, member IDs, display names, emails or full filter payload.
- Rate-limited/deduplicated per actor + Organization + safe filter + short time window to avoid audit amplification.
- A failed audit sink must follow the reviewed security-observability policy; it must not silently widen the read result.

### `invite_created`

- Mutation audit emitted atomically with invite creation.
- Records actor, Organization/Tenant scope, safe assigned role, expiry policy/version, correlation/idempotency fingerprint and timestamp.
- Never records email, recipient display, token/hash/HMAC, delivery payload or secret.

### `role_changed`

- Mutation audit emitted atomically with successful member role change.
- Records actor, Organization/Tenant scope, target member reference in restricted audit storage, safe before/after role, version and correlation/idempotency evidence.
- Does not emit for failed/denied requests or optimistic Frontend state.

### `permission_changed`

- Reserved for a reviewed system role-permission catalog migration or future authorized custom-permission mutation.
- It is not emitted by `GET /permissions`, UI display changes, localization changes or member role changes (`role_changed` already covers those).
- Records platform/migration actor, catalog version, safe permission diff fingerprint, reason and timestamp; never raw SQL or migration secrets.
- P1.1 provides no runtime route that can emit this event.

Projection/audit responses never expose raw audit payloads. Frontend `AuditPreview` remains limited to safe receipts or a future separately reviewed endpoint.

## 10. Error and conflict behavior

- Projection schema validation failure: `503 ORGANIZATION_PROJECTION_INVALID`; disable mutations and do not infer.
- Permission catalog version mismatch: `503 ORGANIZATION_PERMISSION_PROJECTION_STALE`; refetch after server reconciliation, no Browser fallback.
- Member row version conflict remains P1 `412 MEMBER_VERSION_CONFLICT`; refresh Member and Permission projections.
- Invitation pending/used conflicts remain P1 `409`; refresh Invitation/Member projections.
- Network ambiguity on a read may retry safely. Network ambiguity on a mutation follows the original idempotency key contract.
- Unknown fields/status/role in a Backend response fail closed in the typed client and render safe unavailable state.

## 11. Frontend implementation readiness

This P1.1 contract closes the P2 specification gaps:

- MemberList and RoleSelector receive target-specific Backend `allowedActions`.
- PermissionMatrix receives `permissionDisplay`, `availableActions` and `assignableRoles`.
- Invitations receives safe Pending/Expired/Accepted projections.
- Team empty state receives Backend `canCreateOrganization`.

Therefore Frontend implementation against typed fixtures/contracts is unblocked at design level.

Runtime integration and production enablement remain blocked until DB migration, Backend projection implementation, RLS/security tests and controlled deployment are separately approved. No current production Frontend may assume these endpoints already exist.

## 12. Projection validation matrix

Before Backend implementation approval, tests must cover:

- Owner/Admin/Member caller × Owner/Admin/Member target allowedActions matrix
- Member self-elevation and all member administration false
- Admin cannot mutate/remove Owner and assignableRoles excludes Owner
- last Owner removal/role-change false
- suspended/revoked caller produces no actions
- member safe identity fallback never exposes UUID/email
- Permission display exact ALLOWED/DENIED/UNAVAILABLE states from Backend fixtures
- Billing/Credits remain unavailable and false
- invitation Pending/Expired/Accepted server classification
- invitation response contains no token/hash/HMAC/secret/raw row/email ciphertext
- canCreateOrganization allowed/denied/unavailable from Backend policy
- cross-Tenant and cross-Organization references return hidden 404
- visible invitation list without permission returns 403
- RLS/database/permission authority unavailable fails closed
- cache invalidation after invite/role/remove/ownership changes
- audit event privacy and dedup semantics for all four named events
- no Migration, Billing, Credit ledger or production mutation

## 13. Candidate safety statement

- Projection API implemented: `NO`
- Backend route/repository changed: `NO`
- Migration created/applied: `NO`
- Production schema/RLS changed: `NO`
- Billing/Stripe changed: `NO`
- Credit ledger/balance changed: `NO`
- Customer Tenant Membership changed: `NO`
- Organization/member/invite data changed: `NO`
- Production changed: `NO`
