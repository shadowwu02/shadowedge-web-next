# Team Plan v1-B Database Migration Proposal

Date: 2026-07-07

Status: proposal only. Do not run this SQL without a separate production SQL approval.

Reference:

- `docs/runbooks/team-plan-v1-organization-management-plan.md`

This runbook proposes the database shape for Team Plan / Organization support. It includes a review-only SQL draft, rollback plan, RLS notes, and transaction strategy. No SQL was executed, no production database was changed, and no application code was modified in this round.

## Goals

Support a reusable organization model for ShadowEdge, Gold-Tide, and NewBrand:

- 3 seat minimum.
- 15 seat standard maximum.
- Custom / contact support above 15 seats.
- Shared team credits.
- Owner/admin/member roles.
- Owner/admin invite and removal.
- Members can use team credits only after backend membership validation.
- Admin can inspect teams, members, team credits, and team jobs.

## Non-Goals

- Do not modify `profiles.credits_balance`.
- Do not modify personal credit behavior.
- Do not change generate/upload/billing logic in this phase.
- Do not backfill old jobs/assets/history into teams.
- Do not automate checkout/payment.
- Do not execute this SQL in production in v1-B.

## Proposed New Tables

### organizations

Team account and billing container.

Key fields:

- `id`
- `name`
- `slug`
- `brand`
- `status`
- `plan`
- `seat_min`
- `seat_limit`
- `custom_seat_limit`
- `credits_balance`
- `billing_mode`
- `billing_customer_id`
- `created_by`
- `metadata`

### organization_members

Membership and role mapping.

Key fields:

- `organization_id`
- `user_id`
- `role`
- `status`
- `invited_by`
- `joined_at`

### organization_invites

Invite acceptance flow.

Key fields:

- `organization_id`
- `email`
- `role`
- `token_hash`
- `status`
- `invited_by`
- `accepted_by`
- `expires_at`
- `accepted_at`
- `revoked_at`

Only `token_hash` should be stored. Never store raw invite tokens.

### organization_credit_ledger

Append-only team credit ledger.

Key fields:

- `organization_id`
- `user_id`
- `job_id`
- `amount`
- `type`
- `reason`
- `balance_before`
- `balance_after`
- `created_by`
- `metadata`

## Proposed Nullable Columns On Existing Tables

Nullable-first, no backfill:

- `generation_jobs.organization_id uuid null`
- `generation_jobs.billed_to text not null default 'personal'`
- `generation_jobs.billing_user_id uuid null`
- `generation_jobs.billing_organization_id uuid null`
- `media_assets.organization_id uuid null`
- `prompt_studio_projects.organization_id uuid null`, if the table exists.
- `remake_analysis_jobs.organization_id uuid null`, if the table exists.

Semantics:

- Existing rows remain personal with `organization_id null`.
- `user_id` remains actor/creator.
- `organization_id` is team visibility scope.
- `billed_to` records credit source.
- `billing_user_id` records personal billing subject when `billed_to='personal'`.
- `billing_organization_id` records team billing subject when `billed_to='organization'`.

## Review-Only SQL Draft

Important:

- This is intentionally embedded in the proposal runbook instead of being added as an executable migration file.
- Do not copy/paste to production without a separate SQL approval and final schema review.
- RLS policy blocks below are proposals and may need more conservative implementation in v1-B final migration.

```sql
-- Team Plan v1-B organization schema proposal.
-- REVIEW ONLY. DO NOT RUN WITHOUT SEPARATE SQL APPROVAL.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  brand text not null default 'shadowedge',
  status text not null default 'active'
    check (status in ('active', 'disabled', 'archived', 'pending')),
  plan text not null default 'team'
    check (plan in ('team', 'custom')),
  seat_min integer not null default 3
    check (seat_min >= 3 and seat_min <= 15),
  seat_limit integer not null default 15
    check (seat_limit >= 3 and seat_limit <= 15),
  custom_seat_limit integer null
    check (custom_seat_limit is null or custom_seat_limit > 15),
  credits_balance numeric not null default 0
    check (credits_balance >= 0),
  billing_mode text not null default 'manual'
    check (billing_mode in ('manual', 'stripe', 'custom')),
  billing_customer_id text,
  created_by uuid null references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_seat_min_lte_limit
    check (seat_min <= seat_limit)
);

create index if not exists organizations_brand_status_idx
  on public.organizations (brand, status, created_at desc);

create index if not exists organizations_created_by_idx
  on public.organizations (created_by, created_at desc);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member')),
  status text not null default 'active'
    check (status in ('active', 'removed', 'suspended', 'pending')),
  invited_by uuid null references auth.users(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists organization_members_org_user_unique_idx
  on public.organization_members (organization_id, user_id);

create index if not exists organization_members_user_status_idx
  on public.organization_members (user_id, status, organization_id);

create index if not exists organization_members_org_role_status_idx
  on public.organization_members (organization_id, role, status);

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member')),
  token_hash text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid not null references auth.users(id) on delete restrict,
  accepted_by uuid null references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_invites_org_status_idx
  on public.organization_invites (organization_id, status, created_at desc);

create index if not exists organization_invites_email_status_idx
  on public.organization_invites (lower(email), status, expires_at);

create table if not exists public.organization_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid null references auth.users(id) on delete set null,
  job_id uuid null,
  amount numeric not null,
  type text not null
    check (type in (
      'manual_topup',
      'admin_adjust',
      'generation_charge',
      'generation_refund',
      'migration_adjustment'
    )),
  reason text,
  balance_before numeric null,
  balance_after numeric null,
  created_by uuid null references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists organization_credit_ledger_org_created_idx
  on public.organization_credit_ledger (organization_id, created_at desc);

create index if not exists organization_credit_ledger_user_created_idx
  on public.organization_credit_ledger (user_id, created_at desc);

create index if not exists organization_credit_ledger_job_idx
  on public.organization_credit_ledger (job_id);

create index if not exists organization_credit_ledger_type_created_idx
  on public.organization_credit_ledger (type, created_at desc);

alter table public.generation_jobs
  add column if not exists organization_id uuid null references public.organizations(id) on delete set null,
  add column if not exists billed_to text not null default 'personal',
  add column if not exists billing_user_id uuid null references auth.users(id) on delete set null,
  add column if not exists billing_organization_id uuid null references public.organizations(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'generation_jobs_billed_to_check'
      and conrelid = 'public.generation_jobs'::regclass
  ) then
    alter table public.generation_jobs
      add constraint generation_jobs_billed_to_check
      check (billed_to in ('personal', 'organization'));
  end if;
end $$;

create index if not exists generation_jobs_organization_created_idx
  on public.generation_jobs (organization_id, created_at desc);

create index if not exists generation_jobs_billing_org_created_idx
  on public.generation_jobs (billing_organization_id, created_at desc);

create index if not exists generation_jobs_user_org_created_idx
  on public.generation_jobs (user_id, organization_id, created_at desc);

alter table public.media_assets
  add column if not exists organization_id uuid null references public.organizations(id) on delete set null;

create index if not exists media_assets_organization_created_idx
  on public.media_assets (organization_id, created_at desc);

create index if not exists media_assets_user_organization_created_idx
  on public.media_assets (user_id, organization_id, created_at desc);

do $$
begin
  if to_regclass('public.prompt_studio_projects') is not null then
    alter table public.prompt_studio_projects
      add column if not exists organization_id uuid null references public.organizations(id) on delete set null;

    create index if not exists prompt_studio_projects_organization_updated_idx
      on public.prompt_studio_projects (organization_id, updated_at desc);
  end if;

  if to_regclass('public.remake_analysis_jobs') is not null then
    alter table public.remake_analysis_jobs
      add column if not exists organization_id uuid null references public.organizations(id) on delete set null;

    create index if not exists remake_analysis_jobs_organization_created_idx
      on public.remake_analysis_jobs (organization_id, created_at desc);
  end if;
end $$;

-- RLS proposal only. Enable only after application service checks are implemented.
--
-- alter table public.organizations enable row level security;
-- alter table public.organization_members enable row level security;
-- alter table public.organization_invites enable row level security;
-- alter table public.organization_credit_ledger enable row level security;
--
-- create policy organizations_select_active_member
--   on public.organizations
--   for select
--   using (
--     exists (
--       select 1
--       from public.organization_members m
--       where m.organization_id = organizations.id
--         and m.user_id = auth.uid()
--         and m.status = 'active'
--     )
--   );
--
-- create policy organization_members_select_same_org
--   on public.organization_members
--   for select
--   using (
--     exists (
--       select 1
--       from public.organization_members m
--       where m.organization_id = organization_members.organization_id
--         and m.user_id = auth.uid()
--         and m.status = 'active'
--     )
--   );
--
-- Do not add team RLS to generation_jobs/media_assets in the first live migration
-- until user-facing team visibility requirements are finalized.
```

## Constraints Summary

Organizations:

- `status in ('active','disabled','archived','pending')`
- `plan in ('team','custom')`
- `seat_min >= 3 and seat_min <= 15`
- `seat_limit >= 3 and seat_limit <= 15`
- `seat_min <= seat_limit`
- `custom_seat_limit is null or > 15`
- `credits_balance >= 0`
- `billing_mode in ('manual','stripe','custom')`

Members:

- `role in ('owner','admin','member')`
- `status in ('active','removed','suspended','pending')`
- unique `(organization_id, user_id)`

Invites:

- `role in ('owner','admin','member')`
- `status in ('pending','accepted','revoked','expired')`
- `token_hash unique`

Ledger:

- `type in ('manual_topup','admin_adjust','generation_charge','generation_refund','migration_adjustment')`
- append-only by application convention; enforce later with permissions and no update/delete routes.

Jobs:

- `billed_to in ('personal','organization')`

## Index Summary

New table indexes:

- `organizations(brand, status, created_at desc)`
- `organizations(created_by, created_at desc)`
- `organization_members(organization_id, user_id)` unique
- `organization_members(user_id, status, organization_id)`
- `organization_members(organization_id, role, status)`
- `organization_invites(organization_id, status, created_at desc)`
- `organization_invites(lower(email), status, expires_at)`
- `organization_credit_ledger(organization_id, created_at desc)`
- `organization_credit_ledger(user_id, created_at desc)`
- `organization_credit_ledger(job_id)`
- `organization_credit_ledger(type, created_at desc)`

Existing table indexes:

- `generation_jobs(organization_id, created_at desc)`
- `generation_jobs(billing_organization_id, created_at desc)`
- `generation_jobs(user_id, organization_id, created_at desc)`
- `media_assets(organization_id, created_at desc)`
- `media_assets(user_id, organization_id, created_at desc)`
- `prompt_studio_projects(organization_id, updated_at desc)`, if table exists.
- `remake_analysis_jobs(organization_id, created_at desc)`, if table exists.

## RLS / Policy Notes

This proposal should not weaken existing personal RLS.

Existing personal behavior:

- `media_assets` policies use `auth.uid() = user_id`.
- `prompt_studio_projects` policies use `auth.uid() = user_id`.
- `remake_analysis_jobs` policies use `auth.uid() = user_id`.

Recommended v1-B live posture:

- Create new tables and nullable columns.
- Keep existing personal RLS policies intact.
- Use backend service role for team API reads/writes.
- Enforce membership in backend service code first.
- Add user-facing team RLS only after visibility semantics are final.

Why conservative:

- Team assets/jobs can expose cross-member data.
- Owner/admin/member visibility may differ.
- A simple "active member can read all team rows" policy might be too broad for early v1.
- Backend service-role access can centralize authorization while the model stabilizes.

Future RLS direction:

- Organizations: active members can read.
- Members: active members can read same organization membership, with role-sensitive write routes in backend.
- Invites: owner/admin only through backend; direct client read may be unnecessary.
- Ledger: owner/admin read all; members may read own usage only, depending on product policy.
- Jobs/assets: either team-wide visibility or actor-only visibility with owner/admin override. Decide before enabling RLS.

## Migration Strategy

1. Nullable-first.
   - Add new team tables.
   - Add nullable `organization_id` and billing fields.
   - Do not require any existing row update.

2. No backfill.
   - Existing personal jobs/assets/history stay personal.
   - Existing rows keep `organization_id null`.
   - Existing personal generate and history APIs should behave the same.

3. Keep personal credits unchanged.
   - Do not alter `profiles.credits_balance`.
   - Do not alter current `credit_transactions`.
   - Team credits live in `organizations.credits_balance` plus `organization_credit_ledger`.

4. Manual provisioning first.
   - Admin creates organization and credits manually in later phases.
   - Checkout/payment automation remains out of scope.

5. Feature gates at service layer.
   - Do not expose team billing until backend membership, ledger, and transactional charge functions are implemented.

## Future Transaction Strategy

Team credit charge/refund must be transactional.

Future charge function should:

- Accept actor user id, organization id, job payload, and cost.
- Verify active organization.
- Verify actor has active membership.
- Verify member status is active.
- Verify pending invite is not enough for access.
- Verify balance is sufficient.
- Decrement `organizations.credits_balance`.
- Insert `organization_credit_ledger` row with negative amount.
- Insert `generation_jobs` row with:
  - `user_id = actor`
  - `organization_id = organization`
  - `billed_to = 'organization'`
  - `billing_organization_id = organization`
  - `billing_user_id = null`
- Return job id and balance.

Future refund function should:

- Load original job billing context.
- If `billed_to='organization'`, credit `organizations.credits_balance`.
- Insert positive ledger row referencing the original job.
- Never refund team charges to `profiles.credits_balance`.
- Never insert a personal `credit_transactions` row for team-billed refunds, except maybe an Admin audit reference.

Potential function names:

- `create_generation_job_and_consume_team_credits`
- `refund_generation_job_team_credits`

Alternative:

- Implement transaction in backend service with Supabase RPC for atomic DB operations.

Recommendation:

- Use RPC for the final charge/refund atomicity. Avoid multi-step application-only balance updates.

## Rollback Plan

Safe rollback before live team data:

```sql
-- REVIEW ONLY. Do not run without separate SQL approval.

alter table if exists public.remake_analysis_jobs
  drop column if exists organization_id;

alter table if exists public.prompt_studio_projects
  drop column if exists organization_id;

alter table if exists public.media_assets
  drop column if exists organization_id;

alter table if exists public.generation_jobs
  drop column if exists billing_organization_id,
  drop column if exists billing_user_id,
  drop column if exists billed_to,
  drop column if exists organization_id;

drop table if exists public.organization_credit_ledger;
drop table if exists public.organization_invites;
drop table if exists public.organization_members;
drop table if exists public.organizations;
```

If live team data exists:

- Do not directly drop.
- Freeze team write paths.
- Export organizations, members, invites, ledger, and team-linked jobs/assets.
- Reconcile team credit balances.
- Decide whether to migrate team jobs back to personal or keep archival tables.
- Only then perform a separately approved rollback.

## Risk Points

Authorization:

- Users must not be able to forge `organization_id`.
- Removed/suspended members must not use team credits.
- Pending invites must not use team credits.
- Cross-team reads must be blocked.

Credit safety:

- Team charge and ledger insert must be atomic.
- Team refund must return to team balance, not personal balance.
- Personal credit flow must not regress.
- Team balance must not go negative.

Migration safety:

- Existing personal rows must remain valid.
- Existing RLS must not be weakened.
- Nullable fields must avoid backfill requirements.
- Rollback must be blocked after live team data unless exported/frozen.

Product safety:

- More than 15 seats should require Custom flow.
- Payment automation should wait.
- Admin manual provisioning needs audit logs.

White-label safety:

- `brand` must stay data-driven.
- Gold-Tide/NewBrand should not inherit ShadowEdge-only copy or Admin assumptions.

## Validation Needed Before Real Migration

Before running a real SQL migration:

- Confirm live `generation_jobs` schema and any existing constraints.
- Confirm `prompt_studio_projects` exists in production.
- Confirm `remake_analysis_jobs` exists in production.
- Confirm no table uses conflicting `organization_id`.
- Confirm current RLS policies.
- Run migration on staging or local clone.
- Verify personal image/video generation still works.
- Verify personal assets/history remain visible.
- Verify existing Admin users/jobs/credits still load.

## Next Step Recommendation

Proceed to Team Plan v1-C only after a separate review of this migration proposal.

Recommended next action:

- Prepare final SQL migration approval package.
- Keep SQL execution separate from API implementation.
- Do not add team billing to generate until the membership and ledger service is implemented.

## This Round Safety Confirmation

This v1-B round was proposal-only:

- No SQL executed.
- No production database changed.
- No deployment.
- No push.
- No environment changes.
- No payment/provider/R2/Supabase/admin token changes.
- No generate/upload/credits/billing logic changes.
- No frontend feature changes.
- No Admin feature changes.
- No generation, upload, checkout, or billing action.
