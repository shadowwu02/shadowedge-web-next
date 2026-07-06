# Main-G1-H Asset Library v1 Phase Seal

Seal date: 2026-07-06

Scope: phase seal documentation only. No code changes, deployment, SQL execution, environment changes, provider calls, generation, upload, billing, auto run, smoke run, or push actions were performed.

## Phase Status

Main-G1 Asset Library v1 read-only route is sealed.

`/assets` is production deployed and smoke verified.

The page is read-only only.

The user-facing Asset Library v1 center is live.

Reuse actions remain deferred.

## Evidence

Remote main current hash:

```text
37fb51558f8f8aff6c8a9922ebefbd070c036e5a
```

Deployed hash:

```text
5cc1639fc50bff9abdf4cb7a397a02ab8ab2d36a
```

Deployment ID:

```text
dpl_8gVrbX8kuqyGZFcRarKt5oEQcdqi
```

Production domain:

```text
https://shadowedgeai.com
```

Route:

```text
/assets
```

Deploy result docs:

- `docs/runbooks/main-g1f-asset-library-route-deploy-result.md`

Deployment evidence summary:

- Vercel project: `shadowedge-web-next`
- Production domain: `https://shadowedgeai.com`
- `/assets` returned HTTP 200
- logged-in asset list loaded with 13 assets initially visible
- filters/search/manual refresh passed
- Open / Copy URL / Copy Job ID / Download were visible where applicable
- Reuse Image / Reuse Video were disabled/deferred
- no `/api/uploads/...` broken-image path was observed
- no raw metadata dump or token/secret text was visible
- regression smoke passed for:
  - `/workspace/image`
  - `/workspace/video`
  - `/history`
  - `/pricing`
  - `/sign-in`
- rollback was not needed

## Passed Safety Criteria

Passed:

- uses existing auth/API client
- calls only `GET /api/assets`
- no `POST`
- no `PATCH`
- no `PUT`
- no `DELETE`
- no SQL
- no env changes
- no provider call
- no Generate
- no upload
- no billing/refund
- no delete/rename/tag/favorite/batch action
- no Admin audit
- no Shadow VLM audit
- no raw metadata dump
- no token/secret display
- Reuse Image and Reuse Video disabled/deferred

## Current Limitations

Asset Library v1 intentionally does not include:

- delete
- rename
- tags
- folders
- favorites
- bulk actions
- project binding
- canvas binding
- last-used update
- asset detail route
- direct reuse bridge
- Global History Save-to-assets/reuse normalization

## Recommended Next Phases

Option A - Main-G1-I: Reuse draft bridge plan

- Define how assets route to Image/Video workspace drafts.
- Keep all reuse draft-only.
- Do not auto-generate.

Option B - Main-G1-J: Global History action consistency

- Add Save to Assets / reuse draft consistency to Global History.
- Keep actions draft-only or read-only where possible.
- Do not add direct rerun/generate.

Option C - Main-G2: Canvas persistence design

- Start after Asset Library v1 seal.
- Define project/canvas persistence without broad asset mutation.

Preferred path:

- Main-G1-I first if product priority is asset reuse.
- Main-G1-J first if product priority is history consistency.
- Do not start delete/rename/tags yet.

## Do Not Do Yet

Do not add:

- delete
- rename
- tags
- favorites
- hard delete files
- provider/rerun/Generate actions
- billing/refund from Asset Library
- batch operations
- Canvas write binding
- user-facing Shadow VLM adoption

## This Round Prohibited Actions

For Main-G1-H:

- do not deploy
- do not execute SQL
- do not modify env
- do not call provider
- do not Generate
- do not upload
- do not bill/credit
- do not run auto/smoke
- do not push unless explicitly instructed

## Seal Conclusion

Main-G1 Asset Library v1 can be considered sealed as a production-deployed, smoke-verified, read-only user asset center. Future phases should preserve the read-only safety boundary until a separate approval package explicitly authorizes draft reuse, history action normalization, or asset management writes.
