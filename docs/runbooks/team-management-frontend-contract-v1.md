# Team Management P2 — Frontend UX and State Contract v1

Date: 2026-08-23

Status: `DESIGN_ONLY_NOT_PRODUCTION`

Dependencies:

- `team-management-design-v1.md`
- `team-management-db-contract-v1.md`
- `team-management-api-contract-v1.md`

This candidate designs `/team` UX and client state only. It implements no page, component, Backend route, migration, Billing flow, Stripe flow, Credit ledger flow or production change.

## 1. Product decisions

1. `/team` is the single customer-facing Organization administration entry.
2. The page has four primary sections: Overview, Members, Invitations and Permissions.
3. The Frontend displays Backend-returned `role`, `permissions`, `actions`, boundaries and per-resource allowed actions. It never derives authorization from `OWNER`, `ADMIN`, `MEMBER`, Workspace roles, localStorage or hidden controls.
4. Hiding/disabling a control is UX only. Backend authorization and RLS remain mandatory for every request.
5. Organization, member and invitation mutations use the P1 idempotency/version/error contracts.
6. Owner transfer and Organization archive are high-risk, separate experiences. Generic `RoleSelector` cannot assign Owner.
7. Tokens, token hashes, internal IDs and raw audit payloads are never rendered, copied, announced, persisted or sent to analytics.
8. Billing and Organization Credits appear only as disabled/unavailable boundaries until separately implemented. No placeholder button may imply a working payment or balance mutation.

## 2. Route and information architecture

### Primary route

`/team`

The route is authenticated. An unauthenticated visitor follows the existing safe sign-in return flow. It never embeds `tenantId`, member ID, invite ID or token in ordinary page query parameters.

### Page sections

| Section | Purpose | Primary data |
| --- | --- | --- |
| Overview | Organization identity, current role, safe counts and product boundaries | Organization detail + effective permissions |
| Members | Active/suspended member list and server-authorized role/remove actions | Members list + per-member actions |
| Invitations | Pending/expired/accepted summaries and invite action | Safe invitation list + create response |
| Permissions | Current caller's effective capability display | Permission response from Backend |

The selected section may be represented by a safe fragment such as `#members`; it is presentation state, not authorization state.

### Organization selection

- Zero visible Organizations: render Team empty state.
- One Organization: select it after list success.
- Multiple Organizations: `TeamHeader` renders a safe name/slug switcher using only list results.
- Selected Organization ID remains an in-memory query key. It is not displayed and is cleared on sign-out/Tenant change.
- Switching Organization cancels in-flight requests, clears Organization-scoped state, fetches new permissions and does not reuse member/invite data from the prior Organization.

## 3. Page structure

```text
TeamPage
├── TeamAccessBoundary
│   ├── TeamPageSkeleton
│   ├── TeamEmptyState
│   ├── TeamPermissionDeniedState
│   └── TeamUnavailableState
└── TeamWorkspace
    ├── TeamHeader
    │   ├── OrganizationSwitcher
    │   ├── CurrentRoleBadge
    │   └── ServerAuthorizedActions
    ├── TeamSectionNavigation
    ├── OrganizationOverview
    │   ├── OrganizationSummary
    │   ├── TeamBoundarySummary
    │   └── AuditPreview
    ├── MembersSection
    │   └── MemberList
    │       ├── MemberRow / MemberCard
    │       ├── RoleSelector
    │       └── RemoveMemberConfirmation
    ├── InvitationsSection
    │   ├── InvitationList
    │   └── InviteDialog
    └── PermissionsSection
        └── PermissionMatrix
```

Only one primary section is mounted as interactive content at a time on mobile. Desktop may keep Overview context visible beside the active management panel.

## 4. Component contracts

### 4.1 `TeamHeader`

Responsibilities:

- show Organization display name and safe status;
- provide Organization switcher when more than one is returned;
- show Backend-returned current role label (`Owner`, `Admin`, `Member`);
- expose action buttons only from Backend `actions` booleans;
- show Invite button only when `canInviteMembers=true`;
- keep Archive/Transfer actions in an Owner-only overflow group only when Backend returns them true.

It does not compare `role === 'OWNER'`, infer permissions, display Organization UUID/Tenant ID, or keep selection in localStorage.

### 4.2 `MemberList`

Responsibilities:

- render safe name/avatar, Backend role/status label and join time;
- render table rows on desktop/tablet and cards on mobile;
- use opaque IDs only as internal React/query keys, never visible labels or copy targets;
- show `RoleSelector` only when that member's Backend `allowedActions.canChangeRole=true`;
- show Remove only when `allowedActions.canRemove=true`;
- never expose email, Credits, customer Tenant Membership, admin flags or private profile data unless a later API/privacy contract explicitly adds them.

Empty copy: “No members are available in this Organization yet.” The Owner created with the Organization should normally prevent a truly empty active Organization; if Backend returns zero active members, show an integrity-safe unavailable state rather than inventing an Owner.

### 4.3 `InviteDialog`

Fields:

- email input;
- role options supplied by Backend `inviteAssignableRoles` (`ADMIN`, `MEMBER`); Owner must never appear;
- submit/cancel.

Behavior:

- trap focus, restore focus to Invite button, support Escape before submission;
- normalize only for input presentation; Backend owns canonical normalization;
- generate one idempotency key per invite operation and retain it for an ambiguous same-operation retry;
- disable duplicate submit while pending;
- on `409 INVITATION_ALREADY_PENDING`, keep entered email, show conflict guidance and do not create a new key automatically;
- on success, close only after receipt, update/revalidate invitation list, announce success and clear sensitive input;
- never show or store plaintext token, token hash/HMAC, invite internal ID or delivery internals.

### 4.4 `RoleSelector`

Responsibilities:

- display current Backend-returned role;
- options come from per-member `allowedActions.assignableRoles`;
- submit only `ADMIN` or `MEMBER` plus expected row version/reason according to P1;
- exclude Owner; ownership transfer uses a separate Owner flow;
- keep existing value on error;
- on `412 MEMBER_VERSION_CONFLICT`, close edit mode, refresh member/permissions and explain that membership changed elsewhere.

It never derives assignable roles from the caller role and never optimistically grants new permissions before the successful response/refetch.

### 4.5 `PermissionMatrix`

This is a display matrix for the current caller, not a Frontend role engine.

- Rows and allowed/denied/disabled status come from Backend `permissionDisplay` or equivalent server projection.
- Group capabilities into Organization, Members, Projects, Assets and Credits.
- Display `Allowed`, `Not allowed`, or `Not available yet`; do not infer these states from role name.
- Organization Credits and Billing show `Not available yet` while the Backend boundary is false.
- Never display internal permission catalog IDs, RLS policy names, SQL function names or platform Admin permissions.

If the Backend returns only raw permission keys, the Frontend may localize labels for those exact keys, but it cannot synthesize missing role matrices or action authority.

### 4.6 `AuditPreview`

Purpose: show a short customer-safe activity summary, not an Admin audit viewer.

- Initial release may show safe success receipts from mutations completed in the current session: action label, safe actor label (“You”), result and timestamp.
- Durable cross-session preview requires a future safe `GET /api/organizations/:id/audit-preview` endpoint.
- If that endpoint is absent, hide the cross-session section; never query Admin logs or reconstruct audit from member/invite records.
- Never render raw `before_safe`/`after_safe`, audit JSON, internal IDs, correlation internals by default, token/hash, email list, IP, user agent, SQL, stack or credentials.
- A support details affordance may copy only the safe correlation ID after explicit user action.

## 5. Backend-driven permission display

### Authority rule

Frontend components consume:

```ts
type TeamCurrentAccess = {
  role: "OWNER" | "ADMIN" | "MEMBER";
  permissions: readonly string[];
  actions: {
    canInviteMembers: boolean;
    canRemoveMembers: boolean;
    canManageProjects: boolean;
    canManageAssets: boolean;
    canManageCreditPolicy: boolean;
    canTransferOwnership: boolean;
    canArchiveOrganization: boolean;
    canManageBilling: boolean;
  };
  boundaries: {
    organizationCreditsEnabled: boolean;
    billingEnabled: boolean;
  };
};
```

This type describes a response contract; P2 does not implement it.

Rules:

- Until `currentAccess` has loaded successfully, all mutation controls remain absent/disabled.
- A permissions fetch failure is not replaced by cached role inference; show `Permissions temporarily unavailable` and disable mutations.
- A successful mutation response does not authorize the next action locally. Revalidate permissions/member data.
- A `403` immediately closes the mutation control and refreshes current access.
- Organization switch, sign-out, auth refresh, Tenant change and membership conflict invalidate every Organization-scoped permission cache.
- Query cache keys include authenticated session fingerprint and Organization ID. No cross-user hydration of permission/member/invitation data.
- localStorage/sessionStorage/cookies must not persist roles, permissions, allowed actions, member data, invitation data or tokens.

### Role display

| Backend role | Customer label | UI meaning only |
| --- | --- | --- |
| `OWNER` | Owner | Organization owner label; action authority still comes from `actions` |
| `ADMIN` | Admin | Administrator label; never implies Owner actions |
| `MEMBER` | Member | Member label; never implies an inferred resource set |

Workspace roles remain separate and never appear in Organization `RoleSelector`.

## 6. State model

### 6.1 Page query state

```text
BOOTSTRAPPING_AUTH
  -> LOADING_ORGANIZATIONS
     -> EMPTY
     -> LOADING_ORGANIZATION
        -> READY
        -> NOT_VISIBLE
        -> PERMISSION_UNAVAILABLE
        -> UNAVAILABLE
```

| State | Trigger | UX |
| --- | --- | --- |
| `BOOTSTRAPPING_AUTH` | Auth not resolved | Stable shell skeleton; no Team data/actions |
| `LOADING_ORGANIZATIONS` | Organization list pending | Header/list skeleton with fixed dimensions |
| `EMPTY` | Successful empty list | Organization explanation and Create action only if Backend creation policy says allowed |
| `LOADING_ORGANIZATION` | Detail/permissions/member summary pending | Section skeleton; mutation controls absent |
| `READY` | Detail + effective permissions resolved | Render authorized sections/actions |
| `NOT_VISIBLE` | Safe 404 | Generic “Team not available”; clear selected Organization |
| `PERMISSION_UNAVAILABLE` | Permission authority failed | Keep safe already-loaded identity if appropriate; disable all mutations; Retry read only |
| `UNAVAILABLE` | Network/503 | Non-destructive Retry of same read; no write retry |

### 6.2 Collection state

Members and Invitations each use:

- `idle`
- `loading`
- `ready-with-items`
- `empty`
- `forbidden`
- `failed`
- `refreshing` (retain existing items with a non-blocking indicator)

A `forbidden` collection does not blank other successful sections. Overview and Permissions remain independently renderable when their own requests succeeded.

### 6.3 Mutation state

```text
IDLE -> SUBMITTING -> SUCCESS
                  -> VALIDATION_ERROR
                  -> PERMISSION_DENIED
                  -> CONFLICT
                  -> NETWORK_AMBIGUOUS
                  -> FAILED
```

- `SUBMITTING`: single submit, fixed idempotency key, controls disabled.
- `SUCCESS`: announce result, revalidate affected queries, do not display internal IDs.
- `PERMISSION_DENIED`: safe message, close unsafe control, refresh permissions.
- `CONFLICT`: retain user input where safe, show specific reconciliation action.
- `NETWORK_AMBIGUOUS`: do not generate a new key; offer “Check status”/safe same-operation retry only when P1 semantics support it.
- `FAILED`: no optimistic membership/role change remains.

### 6.4 Invitation display state

| Backend status/error | UI status | Action |
| --- | --- | --- |
| `PENDING` | Pending | Show expiry time; no token |
| `ACCEPTED` | Accepted | Terminal, no repeat acceptance action |
| `EXPIRED` / HTTP 410 | Expired | Explain a new invite is required; do not reuse token |
| `REVOKED` | Revoked | Terminal |
| `409 INVITATION_ALREADY_PENDING` | Conflict | Show pending-invite guidance |
| `409 INVITATION_ALREADY_USED` | Already used | Refresh Organization membership; no retry loop |
| `404 INVITATION_NOT_FOUND` | Not available | Do not reveal token/email/Tenant mismatch |
| Success | Success | Safe confirmation, refresh list/members |

### 6.5 Permission denied

- `403` on a visible action: show inline safe permission message for that component, not a full-page crash.
- `404` for an invisible Organization/member/invite: show generic unavailable state and remove stale UI data.
- Never transform hidden `404` into a more revealing message.
- No control becomes enabled merely because a previous session or another Organization allowed it.

## 7. API dependency map

| Component/state | P1 API dependency | UX behavior |
| --- | --- | --- |
| Organization switcher/empty | `GET /api/organizations` | List/empty/loading/error |
| Create Organization | `POST /api/organizations` | Explicit operation, idempotent |
| Overview/Header | `GET /api/organizations/:id` | Name/status/current access |
| MemberList | `GET /api/organizations/:id/members` | Cursor list + safe member projection |
| InviteDialog | `POST /api/organizations/:id/invites` | Pending/success/conflict |
| Invite acceptance | `POST /api/organizations/invites/:token/accept` | Single-use acceptance states |
| Remove member | `DELETE /api/organizations/:id/members/:memberId` | Versioned soft revoke |
| RoleSelector | `PATCH /api/organizations/:id/members/:memberId/role` | Versioned role update |
| PermissionMatrix/actions | `GET /api/organizations/:id/permissions` | Backend-derived display/authority |

### P1.1 response dependencies required before Frontend implementation

P1 route shapes need safe read projections for a complete UX. These are contract dependencies, not Backend implementation in P2:

1. Member list items need server-derived `allowedActions.canChangeRole`, `allowedActions.canRemove`, and `allowedActions.assignableRoles`. Without them, `RoleSelector` and Remove remain hidden.
2. Permission response needs `permissionDisplay` and `inviteAssignableRoles`, or equivalent versioned safe fields. Frontend must not construct the role matrix.
3. Invitations section needs a safe paginated `GET /api/organizations/:id/invites` for Owner/Admin. It returns masked recipient label, role, status and expiry only—no token/hash/internal ID display contract.
4. Durable `AuditPreview` needs a separately reviewed safe read endpoint. It is optional; absence hides the cross-session preview.
5. Create availability in the zero-Organization state needs a Backend-returned product action such as `canCreateOrganization`; it cannot be inferred from authentication alone.

Until these dependencies exist, the P2 design is ready but `/team` implementation must remain off.

## 8. Invitation acceptance UX safety

- A delivery link may enter a dedicated `/team` invitation acceptance view, but token material remains memory-only.
- Never put the token in page text, React error output, analytics properties, breadcrumbs, localStorage, sessionStorage, logs, support clipboard or screenshots generated by the app.
- Scrub/refuse token-bearing URLs before analytics initialization.
- The acceptance request runs once per explicit user confirmation; no automatic retry/polling.
- After terminal success/expired/conflict response, replace browser history with clean `/team` and clear token memory.
- Refreshing after the token is cleared shows normal `/team`; it does not attempt acceptance again.

## 9. Responsive layout contract

### Desktop (`>= 1280px`)

- Maximum readable content width with fixed page gutters.
- `TeamHeader` spans full width.
- Left context rail: Organization Overview and safe boundaries.
- Main area: section navigation plus Members/Invitations/Permissions.
- MemberList uses a table with stable column widths; actions use a compact menu.
- Dialog maximum width 560px; no horizontal page overflow.

### Tablet (`768px–1279px`)

- Single main column with two-column Overview cards where space allows.
- Section navigation is horizontally scrollable within its own container, not the page.
- Members can remain a reduced-column table; secondary metadata moves into row details.
- Dialog remains centered with safe viewport margins.

### Mobile (`< 768px`)

- One column, full-width cards, no table overflow.
- Member rows become cards; actions are full-width and at least 44px high.
- `InviteDialog` becomes a full-screen sheet with safe keyboard handling.
- RoleSelector becomes an accessible native select or modal listbox.
- Primary action may be sticky inside the page safe area; it must not cover content or browser controls.
- Long Organization/member names wrap; internal IDs never become overflow fallback text.

All breakpoints preserve action availability exactly; responsive rendering cannot expose an action hidden by Backend permissions.

## 10. Accessibility and localization

- Semantic headings and landmarks; tabs follow WAI-ARIA tab pattern when implemented as tabs.
- Keyboard-accessible Organization switcher, menus, dialogs and role selector.
- Visible focus, focus trap/restore, Escape/cancel rules and `aria-live` success/error announcements.
- Status never relies on color alone.
- Loading skeletons have fixed dimensions and do not create repeated screen-reader announcements.
- Destructive archive/remove/transfer actions require explicit confirmation and clear target name, never an internal ID.
- Minimum 44px mobile controls and reduced-motion support.
- Every role, permission, error, empty state and time label is localized for ShadowEdge and Gold-Tide from one shared dictionary contract.
- Brand styling may differ; state, permission and security behavior may not fork.

## 11. Privacy and display contract

Never display or expose through DOM text, title, `data-*`, accessible label, toast, copied support text or analytics:

- invitation token or token hash/HMAC;
- raw invitation acceptance URL;
- Organization, Tenant, member, invite, audit or permission catalog internal IDs;
- raw audit payload or before/after JSON;
- full customer Tenant Membership data;
- JWT/session, SQL/RLS details, stack, credentials;
- Billing/Stripe secrets or Credit ledger metadata.

Internal opaque IDs may exist only in memory/network state as required for API calls and React/query identity. Error UI shows safe code/message and optional correlation ID.

## 12. UX architecture validation matrix

Before any implementation is approved, tests must cover:

- auth bootstrapping and sign-in return
- Organization loading, zero, one and multiple selection
- Organization switch cancels/clears prior scoped data
- permissions loading/failure leaves all mutations unavailable
- Owner/Admin/Member Backend fixtures render exactly their returned actions
- Member cannot reveal or trigger invite/remove/role actions
- Admin cannot mutate Owner or select Owner in RoleSelector
- member loading/empty/forbidden/failed/refreshing independently from Overview
- invite pending, expired, already pending, already used, hidden 404 and success
- ambiguous network retry reuses operation idempotency key
- 412 role conflict refreshes member and permissions
- no optimistic privilege elevation
- no token/hash/internal ID/raw audit payload in rendered output, storage, logs or analytics fixtures
- AuditPreview hides cross-session view without safe endpoint
- desktop/tablet/mobile layouts have no horizontal page overflow
- keyboard/focus/aria-live/localization behavior
- ShadowEdge/Gold-Tide state and permission parity
- no Billing, Credit, Backend, migration or production mutation

## 13. Implementation sequence

1. Obtain and validate P1.1 Backend safe response extensions; keep Team UI flag off.
2. Add typed API client and state/query keys with no storage persistence.
3. Implement read-only `/team` Overview and PermissionMatrix.
4. Implement MemberList and Invitations list read-only.
5. Add invite mutation behind per-Organization allowlist.
6. Add role/remove operations after conflict, Owner-protection and audit tests.
7. Add optional AuditPreview only after safe endpoint approval.
8. Validate responsive/accessibility/brand parity before wider enablement.

No step enables Billing or Organization Credits.

## 14. Candidate safety statement

- Frontend page/component implemented: `NO`
- Backend API implemented: `NO`
- Migration created/applied: `NO`
- Billing changed: `NO`
- Stripe changed: `NO`
- Credit ledger/balance changed: `NO`
- Customer Tenant Membership changed: `NO`
- Workspace role changed: `NO`
- Production changed: `NO`
