# HR V2 integration release handoff

## Compatibility floor

- Frontend implementation SHA: `26f03ccca8c51775fb7253bb87a4850921f65b2e`
- Frontend branch: `codex/hr-v2-batch2`
- Frontend base SHA: `cac94fd865bcdea7f94543e732b488e3444f42eb`
- Minimum backend SHA: `5b6edb13c4b09c64a146d9759046fc182afeff3b`
- Minimum database schema: `092`
- Required public frontend route: `/team-invitations/accept?token={opaque_token}`
- Required Production email CTA shape:
  `https://hr.kairoid.com/team-invitations/accept?token={opaque_token}`

The frontend must not be promoted against a backend below this compatibility floor. The commit
containing this handoff is documentation-only; the exact frontend implementation SHA is recorded
above.

## Required deployment order

The Production integration sequence is exactly:

1. integrated backend source
2. DB092
3. compatible API/Worker
4. backend smoke
5. HR V2 frontend
6. authenticated HR smoke
7. real Team invitation email test

Do not reorder or combine the database/backend/frontend promotion gates.

## Backend smoke before frontend promotion

Verify authenticated behavior and permission failures for lifecycle, employment profile, job-role
CRUD, logo intent/confirm/read/remove, Verification Preferences, Team invitation create/resend,
and the structured report projection. Verify public lookup plus authenticated acceptance using a
non-Production test invitation. Confirm old Team tokens become invalid after resend and that no raw
token is returned or logged.

The exact endpoint inventory is recorded in `reports/hr-v2-batch2-certification.md`.

## Authenticated HR smoke after frontend promotion

- Mark a test person Ex-employee with a valid Last Working Day; confirm People and report refresh.
- Create/edit/deactivate a job role, assign it to a test person, and confirm organization-wide
  counts plus Invite Candidate `role_id` behavior.
- Upload, confirm, replace, display, and remove a test logo.
- Change Verification Preferences and verify they affect only a new invitation snapshot.
- Create and resend a Team invitation; verify truthful send state and old-link invalidation.
- Complete the acceptance flow through sign-in/signup with the invited email.
- Open an Interim and Final structured report, inspect every typed section and privacy masking, and
  save the same-model print view as PDF.
- Repeat key layout checks at desktop, smaller-laptop, and tablet widths with keyboard navigation.

## Remaining release blockers

1. Integrate and deploy backend SHA `5b6edb13c4b09c64a146d9759046fc182afeff3b` or a compatible
   descendant.
2. Apply and verify database schema `092`.
3. Deploy compatible API and Worker services, then complete backend smoke.
4. Promote this frontend only after those gates pass.
5. Complete authenticated HR smoke and one real Team invitation email test.

No Production deployment, AWS mutation, database access, email send, or external-provider call was
performed during frontend Batch 2 source certification.
