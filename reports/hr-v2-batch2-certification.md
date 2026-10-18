# HR V2 frontend Batch 2 certification

## Certified source

- Frontend repository: `kairo-hr-workspace`
- Branch: `codex/hr-v2-batch2`
- Certified frontend implementation SHA: `26f03ccca8c51775fb7253bb87a4850921f65b2e`
- Certified Foundation base SHA: `cac94fd865bcdea7f94543e732b488e3444f42eb`
- Minimum backend SHA: `5b6edb13c4b09c64a146d9759046fc182afeff3b`
- Minimum backend schema: `092`
- Backend contract handoff: `kairo-backend-hr-v2/reports/hr-v2-backend-contract-handoff.md`

The commit containing this report is documentation-only. The immutable frontend implementation
certified by the checks below is the SHA recorded above.

## Delivered contract surfaces

- Employee lifecycle supports `ACTIVE -> EX_EMPLOYEE` with a required, real, non-future Last
  Working Day that cannot precede the joining date. Server validation remains authoritative.
- Reactivation is absent. Existing verification history, evidence, references, notes, reports,
  Candidate access, and Passport data are not mutated by the frontend.
- Organization roles use canonical list/create/update/deactivate contracts and backend-wide
  assignment counts. People employment profile and Trust Invitations use `role_id`; legacy
  `purpose` remains populated with the selected role name.
- Organization logo supports current display, presigned upload, confirmation, replacement,
  removal, MIME/size validation, manager permissions, and workspace identity presentation.
- Verification Preferences supports canonical read/replace, only the five writable V1 checks,
  reference count, dirty-state protection, permissions, and backend-default invitation behavior.
- Team invitations expose backend create/send/pending/failure/accepted/expired states and resend.
  The public token route preserves a safe internal return path through authentication and never
  logs or sends the token to analytics.
- Verification Report uses the authoritative structured projection through a thin frontend adapter
  for both screen and print. Backend status, Trust Score, Interim/Final, typed sections, open items,
  and HR review are retained; sensitive identity values are masked and metadata/internal notes are
  discarded.

## Exact backend endpoints used

| Method   | Path                                                                                  |
| -------- | ------------------------------------------------------------------------------------- |
| `PATCH`  | `/api/v1/organizations/{org_public_id}/people/{person_public_id}/lifecycle`           |
| `PATCH`  | `/api/v1/organizations/{org_public_id}/people/{person_public_id}/employment-profile`  |
| `GET`    | `/api/v1/organizations/{org_public_id}/job-roles`                                     |
| `POST`   | `/api/v1/organizations/{org_public_id}/job-roles`                                     |
| `PATCH`  | `/api/v1/organizations/{org_public_id}/job-roles/{role_public_id}`                    |
| `DELETE` | `/api/v1/organizations/{org_public_id}/job-roles/{role_public_id}`                    |
| `POST`   | `/api/v1/organizations/{org_public_id}/logo/upload-intents`                           |
| `POST`   | `/api/v1/organizations/{org_public_id}/logo/confirm`                                  |
| `GET`    | `/api/v1/organizations/{org_public_id}/logo`                                          |
| `DELETE` | `/api/v1/organizations/{org_public_id}/logo`                                          |
| `GET`    | `/api/v1/organizations/{org_public_id}/verification-preferences`                      |
| `PUT`    | `/api/v1/organizations/{org_public_id}/verification-preferences`                      |
| `POST`   | `/api/v1/organizations/{org_public_id}/invitations`                                   |
| `POST`   | `/api/v1/organizations/{org_public_id}/invitations/{invitation_public_id}/resend`     |
| `GET`    | `/api/v1/workspace/team-invitations/{token}`                                          |
| `POST`   | `/api/v1/workspace/team-invitations/{token}/accept`                                   |
| `GET`    | `/api/v1/organizations/{org_public_id}/people/{person_public_id}/verification-report` |

Frontend acceptance route: `/team-invitations/accept?token={opaque_token}`.

## Verification evidence

- Batch 2 focused tests: pass.
- Full HR regression: `43` files, `199` tests, all pass.
- TypeScript: pass (`tsc --noEmit`).
- ESLint: pass with zero errors. Six existing Fast Refresh warnings remain in shared baseline files.
- TypeScript/TSX Prettier check: pass. The pre-existing `src/styles.css` formatting warning is
  unchanged by Batch 2.
- Standard production build: pass.
- Amplify-equivalent build with `NITRO_PRESET=aws_amplify`: pass.
- Generated Amplify server direct-route checks: HTTP `200` for Team acceptance, Person detail, and
  Verification Report.
- Print/PDF: same canonical report model, `window.print()` action, print stylesheet, app chrome
  removal, and report page-break rules verified by source and tests.
- `git diff --check`: pass.

The Node test runtime emits an experimental localStorage warning and jsdom reports that navigation
to another document is not implemented. Neither is a test failure or Production runtime behavior.

## Boundaries

- HR Production deployment: not performed.
- Backend source: not changed.
- Production database: not accessed or changed.
- AWS: not accessed or changed.
- External email/provider calls: not made.
- Existing Production checkout and certified Foundation worktree: not changed.

## Release status

Source is a release candidate subject to the ordered integration rollout and authenticated smoke
checks in `reports/hr-v2-release-handoff.md`. It must not be deployed ahead of backend SHA
`5b6edb13c4b09c64a146d9759046fc182afeff3b` and schema `092`.
