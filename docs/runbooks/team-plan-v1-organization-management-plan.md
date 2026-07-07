# Team Plan v1-A Organization Management Plan

Date: 2026-07-07

Status: planning and code audit only.

This runbook designs a reusable Team Plan / Organization capability for ShadowEdge and future white-label properties such as Gold-Tide / NewBrand. No code, database, environment, billing, provider, upload, generation, deployment, or Admin production action was performed in this round.

## Scope

Team Plan v1 should support:

- Team subscriptions with 3 seats minimum.
- 15 seats maximum for self-serve or manually configured team plans.
- More than 15 seats routed to Custom / contact support.
- Shared team credits.
- Owner-managed invitations and member removal.
- Team members generating with team credits.
- Admin visibility into teams, members, credit usage, and team jobs.
- A model reusable across ShadowEdge, Gold-Tide, and NewBrand without coupling the organization model to one brand UI.

Out of scope for v1-A:

- No SQL migration.
- No backend route implementation.
- No generate or credit deduction changes.
- No payment automation.
- No team creation in production.
- No frontend code changes.
- No Admin code changes.

## Repositories Audited

Main frontend:

- `C:\Users\WEll\Documents\shadowedge-web-next`
- Auth and API client: `src/lib/auth.ts`, `src/lib/api.ts`, `src/lib/auth-api.ts`
- Assets: `src/lib/assets-api.ts`, `src/components/assets/AssetLibraryPage.tsx`
- History/account/pricing: `src/components/history/GlobalHistoryPage.tsx`, `src/components/account/AccountCreditsPage.tsx`, `src/components/pricing/PricingBillingPage.tsx`
- Image/video workspace surfaces and draft bridges were considered as later integration points.

Backend:

- `C:\Users\WILL\Documents\shadowedge-api`
- Auth: `routes/auth-proxy.js`
- Assets: `routes/assets.js`, `services/media-assets-service.js`, `sql/20260630_media_assets.sql`
- Image generation: `routes/image-v2.js`
- Video generation/history/upload: `routes/video.js`
- Admin: `routes/admin.js`, `middleware/admin-auth.js`
- Existing SQL inventory for media assets, prompt studio projects, remake analysis jobs, admin audit logs, shadow audit logs, and public API clients.

Admin frontend:

- `C:\Users\WEll\Documents\shadowedge-admin-next`
- Admin auth/API client: `src/lib/auth.ts`, `src/lib/admin-api.ts`
- Admin users/jobs/credits/refund surfaces: `src/app/(admin)/users`, `src/app/(admin)/jobs`, `src/components/admin/*`
- Existing Admin routes cover users, jobs, audit logs, credits adjustment, material issue refund, site settings, and shadow audit visibility.

## Current System Inventory

### User / Profile / Auth

Current user auth is Supabase JWT based:

- Main frontend stores Supabase access/refresh tokens in localStorage keys such as `shadowedge_auth_token`, `shadowedge_refresh_token`, and Supabase `sb-...auth-token`.
- Main API client attaches `Authorization: Bearer <access token>` through `apiRequest()`.
- Backend route-level `requireUser` helpers call `supabaseAdmin.auth.getUser(token)` and put the user on `req.seUser`.
- Profiles are personal-user records keyed by `profiles.id = auth.users.id`.
- `routes/auth-proxy.js` creates a profile with:
  - `id`
  - `email`
  - `display_name`
  - `avatar_url`
  - `plan`
  - `credits_balance`
  - `max_concurrency`
  - `status`
  - `is_admin`

Conclusion:

- Team context should not be encoded into auth tokens in v1.
- Keep existing personal auth tokens unchanged.
- Pass team context as request data or header only after backend can verify membership.
- Backend must derive authorization from `auth.users.id` plus `organization_members`, not from client-trusted `organization_id`.

### Credits

Current user credits are personal:

- `profiles.credits_balance` is the active balance.
- `credit_transactions` records user credit changes.
- Admin user credit adjustment updates `profiles.credits_balance` and writes `credit_transactions`.
- Image and video generation read the personal profile, check `credits_balance`, then call `create_generation_job_and_consume_credits`.
- Refunds call `refund_generation_job_credits`.
- Failed provider paths can refund the personal user job.

Conclusion:

- Team credits need a separate ledger and balance source.
- Do not overload `profiles.credits_balance` for team credits.
- Existing personal credits must remain backward-compatible and unaffected.
- Generate billing needs an explicit `billed_to = personal | organization` decision, stored on jobs and credit ledgers.

### Image / Video Generate Deduction

Current generation flow is personal-user centric:

- `routes/image-v2.js`
  - Loads `profiles(id,email,credits_balance,status,max_concurrency)`.
  - Checks disabled status and concurrency.
  - Checks personal balance against cost.
  - Calls `create_generation_job_and_consume_credits`.
  - Provider submit happens only after DB job and credit consumption.
  - Refund calls `refund_generation_job_credits`.
- `routes/video.js`
  - Same pattern: load profile, check personal balance, call `create_generation_job_and_consume_credits`.
  - Video history is queried by `generation_jobs.user_id`.
  - Uploads create personal `media_assets` records.

Conclusion:

- Team Plan must not directly patch these flows in the first implementation step.
- A future team billing adapter should sit before the current `create_generation_job_and_consume_credits` path.
- The backend must validate membership and active seat before allowing `organization_id` billing.
- A new RPC or transactional service is likely needed to atomically create a job and consume team credits.

### History / Jobs / Assets Ownership

Current ownership is personal:

- `generation_jobs.user_id` is the primary owner for image/video/remake history.
- `media_assets.user_id` is the primary owner for the Asset Library.
- `prompt_studio_projects.user_id` is personal.
- `remake_analysis_jobs.user_id` is personal and may link `source_asset_id`.
- Asset RLS policies use `auth.uid() = user_id`.
- Frontend Global History merges image and video history from user-scoped endpoints.

Conclusion:

- Team-visible jobs/assets should add `organization_id` fields rather than replace `user_id`.
- Keep `user_id` as the actor/creator for audit, ownership, and legacy compatibility.
- Use `organization_id` as the billing/visibility scope when a job is created under a team.
- RLS and service-role queries need careful treatment so members can read team assets/jobs without exposing other teams.

### Pricing / Billing

Current pricing is mostly manual/contact-admin:

- Main pricing page has Essential, Pro, and Studio/Custom style plans.
- Gold-Tide/NewBrand has custom plan messaging.
- Checkout/payment automation is not currently the safe place to start Team Plan.

Conclusion:

- Team Plan v1 should be manually provisioned by Admin first.
- Pricing can advertise "Team, 3-15 seats, custom above 15" before payment automation.
- Payment automation should be a separate phase after team data and credit ledger are stable.

### Admin

Current Admin capabilities:

- Admin auth is Supabase JWT plus `ADMIN_EMAILS` or `profiles.is_admin=true` and active status.
- Admin users list reads `profiles`.
- Admin user detail reads `profiles`, recent `generation_jobs`, and `credit_transactions`.
- Admin jobs list reads `generation_jobs`, with status sync and material issue refund actions.
- Admin credit adjustment only handles personal user credits.
- Admin has no team/organization surface today.

Conclusion:

- Team Admin should be added as a separate surface, not forced into the existing User detail only.
- Admin Teams needs its own team list, detail, member list, ledger, and team jobs views.
- Existing user detail can later link to memberships, but should not become the source of truth for team operations.

### LocalStorage / Auth Token

Current auth storage is already broad and legacy-compatible.

Conclusion:

- Do not add organization membership into localStorage auth tokens.
- A selected team can be a non-secret UI preference, but it must never authorize usage by itself.
- Backend must re-check membership for every team-scoped write or billing request.

### Database Migration Risk

Team Plan needs schema changes. Risk areas:

- Jobs/assets/history currently rely on `user_id` ownership.
- Existing RPCs are personal-credit based.
- Credit refunds assume personal `credit_transactions`.
- RLS currently enforces personal ownership on tables such as `media_assets`.
- Team memberships and invites need status transitions and auditability.

Conclusion:

- Migration must be staged and rollbackable.
- Add nullable fields first.
- Backfill should not be required for existing users.
- Team credit deduction/refund should not be enabled until schema, service logic, and Admin audit are reviewed separately.

## Recommended Data Model

### organizations

Purpose: team account / billing container.

Suggested fields:

- `id uuid primary key`
- `name text not null`
- `slug text unique null`
- `brand text not null default 'shadowedge'`
- `status text not null default 'active'`
- `plan text not null default 'team'`
- `seat_min integer not null default 3`
- `seat_limit integer not null default 15`
- `custom_seat_limit integer null`
- `credits_balance numeric not null default 0`
- `billing_mode text not null default 'manual'`
- `billing_customer_id text null`
- `created_by uuid references auth.users(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `archived_at timestamptz null`
- `metadata jsonb not null default '{}'::jsonb`

Notes:

- `seat_limit` must be 3-15 for standard Team.
- More than 15 should use `plan='custom'` or `custom_seat_limit`.
- `brand` allows ShadowEdge, Gold-Tide, and NewBrand reuse.

### organization_members

Purpose: user membership and role mapping.

Suggested fields:

- `id uuid primary key`
- `organization_id uuid not null references organizations(id)`
- `user_id uuid not null references auth.users(id)`
- `role text not null check (role in ('owner','admin','member'))`
- `status text not null default 'active'`
- `invited_by uuid null references auth.users(id)`
- `joined_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- unique active membership on `(organization_id, user_id)`

Rules:

- Organization must have at least one owner.
- Only owner/admin can invite.
- Only owner can remove another owner or change ownership.
- Removing a member disables future team credit usage but should not delete historical jobs.

### organization_invites

Purpose: invitation and accept flow.

Suggested fields:

- `id uuid primary key`
- `organization_id uuid not null references organizations(id)`
- `email text not null`
- `role text not null default 'member'`
- `token_hash text not null unique`
- `status text not null default 'pending'`
- `invited_by uuid not null references auth.users(id)`
- `accepted_by uuid null references auth.users(id)`
- `expires_at timestamptz not null`
- `accepted_at timestamptz null`
- `revoked_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Rules:

- Store token hash only, never raw invite token.
- Accept flow must verify email match or require owner/admin override in a later phase.
- Pending invites should count toward seat capacity only if product chooses reserved seats. Recommendation: count active members plus pending invites to avoid over-inviting.

### organization_credit_ledger

Purpose: team credit source of truth and usage history.

Suggested fields:

- `id uuid primary key`
- `organization_id uuid not null references organizations(id)`
- `user_id uuid null references auth.users(id)`
- `job_id uuid null`
- `amount numeric not null`
- `type text not null`
- `reason text null`
- `balance_before numeric null`
- `balance_after numeric null`
- `created_by uuid null references auth.users(id)`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Suggested types:

- `manual_topup`
- `admin_adjust`
- `generation_charge`
- `generation_refund`
- `invite_bonus` if ever needed
- `migration_adjustment`

Rules:

- Team ledger must be append-only.
- Refunds must reference original `job_id`.
- Team balance updates must be transactional with ledger insert.

### Jobs / Assets / History Organization Fields

Add nullable fields in later migration phases:

- `generation_jobs.organization_id uuid null references organizations(id)`
- `generation_jobs.billed_to text not null default 'personal'`
- `generation_jobs.billing_user_id uuid null references auth.users(id)`
- `generation_jobs.billing_organization_id uuid null references organizations(id)`
- `media_assets.organization_id uuid null references organizations(id)`
- `prompt_studio_projects.organization_id uuid null references organizations(id)`
- `remake_analysis_jobs.organization_id uuid null references organizations(id)`

Recommended semantics:

- `user_id` remains creator/actor.
- `organization_id` means team-scoped visibility.
- `billed_to` records whether credits came from personal or team balance.
- Keep personal history behavior unchanged when `organization_id is null`.

## Recommended Roles

Owner:

- Manage billing/admin team settings.
- Invite/remove members.
- Promote/demote admins and members.
- View all team usage and jobs.
- Cannot be removed if they are the last owner.

Admin:

- Invite/remove members except owners.
- View team usage and jobs.
- Use team credits.
- Cannot change billing owner or remove last owner.

Member:

- Use team credits if active and team has balance.
- View own team jobs initially.
- Team-wide visibility can be deferred or limited.

## Seat Strategy

Recommended rules:

- Minimum 3 seats for Team Plan.
- Maximum 15 seats for standard Team Plan.
- More than 15 seats routes to Custom / contact support.
- Active members count against seats.
- Pending invites should count against seats to avoid overbooking.
- Owner/admin can revoke pending invites to free seats.
- Manual Admin provisioning in v1 should enforce the same min/max rules.

## Credits Strategy

### Personal Credits

Existing behavior remains:

- User has `profiles.credits_balance`.
- Personal generation consumes personal credits.
- Personal refund writes personal credit transaction.

### Team Credits

Team behavior:

- Organization has a team balance.
- Team ledger records every adjustment, charge, and refund.
- Generation can be billed to team only when the actor is an active member and the selected organization is active.
- Team credit use should not touch `profiles.credits_balance`.

### billed_to

Every generated job should eventually record:

- `billed_to='personal'` or `billed_to='organization'`
- `billing_user_id`
- `billing_organization_id`
- `organization_id` for team-scoped visibility

### Usage Ledger

Team usage reporting should come from:

- `organization_credit_ledger`
- `generation_jobs` filtered by `organization_id`
- user actor data from `generation_jobs.user_id`

## Frontend Page Recommendations

### Account / Team

Add an Account Team page or section:

- Current personal account summary.
- Team memberships.
- Active selected team.
- Team role.
- Team seats used/limit.
- Team credit balance.
- Invite and member management for owner/admin.

### Invite Members

Owner/admin flow:

- Enter email.
- Choose role: member/admin.
- Validate seat capacity.
- Send invite.
- Show pending invite list with revoke action.

### Team Members List

Display:

- Email/name.
- Role.
- Status.
- Joined date.
- Last usage summary if available.
- Remove/demote/promote actions based on current role.

### Workspace Team Selector

Workspaces should eventually show:

- Personal credits.
- Team credits for active membership.
- Selector: Personal / Team name.
- Clear copy: "Billing this generation to Team credits."

Safety:

- Selected team stored only as a UI preference.
- Generate request sends selected `organizationId`.
- Backend validates membership and active seat before any charge.

### Pricing Team Plan

Pricing should add:

- Team Plan.
- 3 seats included/minimum.
- Up to 15 seats.
- Shared credits.
- Custom for more than 15 seats.
- Contact support while payment automation is not available.

## Admin Page Recommendations

### Admin Teams

New Admin nav item:

- Team list.
- Search by team name, organization id, owner email, member email.
- Status filter.
- Brand filter.
- Seat usage.
- Credit balance.

### Team Detail

Display:

- Organization profile.
- Status/plan/brand.
- Owner(s).
- Seat count and limit.
- Credit balance.
- Recent ledger entries.
- Recent team jobs.

### Members

Display:

- Member list.
- Role.
- Status.
- Joined/invited dates.
- Invite source.
- Admin actions for manual support.

### Team Credits Ledger

Admin should support:

- Read ledger.
- Manual top-up/deduct with reason and audit log.
- No automatic payment linkage in v1.

### Team Jobs

Display:

- Jobs where `generation_jobs.organization_id = team_id`.
- Actor user.
- Billed amount.
- Status.
- Provider job id in sanitized form.
- Refund state.

## API Design Recommendations

Initial user-facing team APIs:

- `GET /api/teams`
  - Return teams where current user is active member.
- `POST /api/teams`
  - Owner/admin/manual beta creation, likely Admin-gated first.
- `GET /api/teams/:id`
  - Return team detail for active members.
- `POST /api/teams/:id/invites`
  - Owner/admin only.
- `POST /api/teams/invites/:token/accept`
  - Authenticated user accepts invite.
- `PATCH /api/teams/:id/members/:memberId`
  - Owner/admin role/status changes.
- `DELETE /api/teams/:id/members/:memberId`
  - Owner/admin remove/deactivate member.
- `GET /api/teams/:id/usage`
  - Team ledger and usage summary.

Admin APIs:

- `GET /api/admin/teams`
- `POST /api/admin/teams`
- `GET /api/admin/teams/:id`
- `PATCH /api/admin/teams/:id`
- `POST /api/admin/teams/:id/credits`
- `GET /api/admin/teams/:id/credits`
- `GET /api/admin/teams/:id/jobs`
- `GET /api/admin/teams/:id/members`

## Generate Billing Boundary

Do not directly modify generation logic in v1-A.

Future generate request shape:

```json
{
  "billingContext": {
    "billedTo": "personal | organization",
    "organizationId": "uuid-if-team"
  }
}
```

Backend requirements:

- Ignore client `organizationId` unless current user is an active member.
- Check organization active status.
- Check seat status.
- Check team balance.
- Check concurrency limits. Decide whether team concurrency is separate from personal concurrency.
- Transactionally create job and consume either personal or team credits.
- Store `organization_id`, `billed_to`, and actor `user_id`.
- Provider call must only happen after credit transaction succeeds.
- Refund must use original job billing context.

Anti-forgery rule:

- The client may request a team, but the backend must resolve whether the user can use it.
- Never trust localStorage selected team.
- Never trust role or seat count from the frontend.

## Data Model Compatibility

Existing rows:

- Keep `organization_id null`.
- Keep `billed_to='personal'`.
- Existing personal history remains unchanged.
- Existing Asset Library remains personal until team asset visibility is implemented.

White-label compatibility:

- Organizations include `brand`.
- Team APIs can filter by current brand/domain if needed.
- Avoid hardcoding ShadowEdge-only semantics into database model.

## Risk Points

Authorization:

- Members must not be able to charge another team's credits by guessing `organization_id`.
- Former members must lose team credit access immediately.
- Pending invite users must not use team credits before acceptance.

Credit integrity:

- Team credit charges/refunds must be atomic.
- Personal credits must not be deducted for team-billed jobs.
- Team credits must not be refunded to personal balance.

Existing users:

- Existing personal users and jobs must remain unchanged.
- Existing frontends must work when no team memberships exist.

White-label:

- Gold-Tide / NewBrand should not inherit ShadowEdge-only copy or settings in the data model.

Migration:

- Add nullable columns first.
- Add tables with RLS policies carefully.
- Do not backfill existing jobs into a team without a separate approval.
- Rollback should remove unused team tables/nullable fields before any live team billing data exists.

Billing/payment:

- Do not automate Stripe/payment in first team phase.
- Manual Admin provisioning is safer until credits and role boundaries are verified.

Privacy:

- Decide whether members can see all team jobs or only their own jobs.
- Admin/owner visibility can be broader than member visibility.

## Likely Files Affected Later

Backend:

- `routes/auth-proxy.js`
- `routes/image-v2.js`
- `routes/video.js`
- `routes/assets.js`
- `routes/admin.js`
- `services/media-assets-service.js`
- `services/concurrency-limit-service.js`
- New team service, likely `services/organization-service.js`
- New routes, likely `routes/teams.js`
- New SQL migrations for organizations, members, invites, team ledger, and nullable job/asset fields.

Main frontend:

- `src/lib/api.ts`
- `src/lib/auth-api.ts`
- `src/types/user.ts`
- New `src/lib/teams-api.ts`
- Account/team UI.
- Pricing UI.
- Image/video workspace billing context selector.
- History and Asset Library team filters in later phases.

Admin frontend:

- `src/lib/admin-api.ts`
- `src/types/admin.ts`
- Admin sidebar.
- New Admin Teams pages.
- Admin user detail membership links.
- Team ledger and team jobs tables.

## Phased Implementation

### Team Plan v1-A: docs / audit

Current phase.

- Complete planning and code audit.
- No code or database change.
- Define model, APIs, and risk boundaries.

### Team Plan v1-B: database migration proposal

- Draft SQL only.
- Tables: `organizations`, `organization_members`, `organization_invites`, `organization_credit_ledger`.
- Nullable fields on jobs/assets/project tables.
- RLS and rollback plan.
- No production SQL until separately approved.

### Team Plan v1-C: backend team read/write API

- Add Team service and user-facing team routes.
- Owner/admin/member checks.
- No generate billing changes yet.
- Admin-gated manual provisioning can start here if approved.

### Team Plan v1-D: invite accept flow

- Token-hash invite model.
- Accept/revoke/resend.
- Seat count enforcement.
- Email ownership checks.

### Team Plan v1-E: team credits ledger

- Admin team credit adjustments.
- Team balance reads.
- Append-only ledger.
- No provider/generate changes yet unless separately approved.

### Team Plan v1-F: workspace team selector

- Frontend selector for Personal vs Team.
- Store selected team as UI preference only.
- No billing switch until backend generation path supports it.

### Team Plan v1-G: generate billed_to team

- Backend validates membership and balance.
- Transactional team credit consumption.
- Store job billing context.
- Refund uses original billed context.
- Local and production smoke with strict caps.

### Team Plan v1-H: Admin Teams

- Admin teams list/detail.
- Members.
- Ledger.
- Team jobs.
- Audit logs for Admin team changes.

### Team Plan v1-I: smoke / safety review

- Personal generation unaffected.
- Team-billed generation works for active member.
- Removed member blocked.
- Other team id blocked.
- Refund returns to team ledger.
- Admin visibility safe.
- No white-label regression.

## Recommended Next Step

Proceed to Team Plan v1-B as a database migration proposal only.

Do not implement generate billing changes until:

- Team schema is reviewed.
- Membership authorization is implemented.
- Team ledger is transactional.
- Admin manual provisioning and audit are ready.

## Safety Confirmation

This v1-A round was docs/audit only:

- No code changes.
- No database changes.
- No SQL execution.
- No environment changes.
- No payment/provider/R2/Supabase/admin token changes.
- No generate/upload/credits logic changes.
- No deployment.
- No push.
- No generation, upload, or billing action.
