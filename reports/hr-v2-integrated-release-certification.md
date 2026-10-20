# HR V2 integrated release certification

## Certified source

- Repository: `kairo-hr-workspace`
- Branch: `codex/hr-v2-release-integration`
- Base SHA: `81dc8d6baea9c14827e03cfb84b3f4adcc790cdd`
- Certified source/test SHA: `9ad0bf76aa3b4d1696055792c252558f832afb7a`
- Current backend source audited read-only: `12ffa525af33f154f22fc7f0519acd7d55578907`
- Current backend deployment supplied by the release brief: API `kairo-backend:42`, Worker
  `kairo-resume-worker:13`, schema `093`

The branch was created in an isolated worktree. The active checkout's unrelated
`src/components/app/HelpWidget.tsx` modification was not reset, changed, or included.

## Integrated lineage

Git history proves that the release sources are a single ancestry-preserving line; no merge,
cherry-pick, squash, or conflict resolution was required:

1. `8ce365ef84372a35967648d269c696c3f8f3213e` - certified HR V2 Batch 2 tip
2. `54f8eb8` - canonical `court_record_search` adapter compatibility
3. `063fec012911235154b8403e4ee10c73c036648b` - final contract compatibility closure
4. `81dc8d6baea9c14827e03cfb84b3f4adcc790cdd` - inactive-role partial-patch correction
5. `9ad0bf76aa3b4d1696055792c252558f832afb7a` - joining-date inactive-role regression proof

`origin/main` and `origin/codex/hr-v2-b2-role-partial-patch-fix` already pointed to the same
integrated runtime source at the start of this work. The integration branch adds only the missing
joining-date regression case and these certification records.

## Files changed on the integration branch

- `src/test/routes/app.people.$id.route.test.tsx`
- `reports/hr-v2-integrated-release-certification.md`
- `reports/hr-v2-integrated-release-handoff.md`

No runtime application file, backend file, AWS resource, database, or Production environment was
changed.

## API42 / DB093 compatibility

Result: **PASS by read-only source contract audit** against the exact backend SHA above.

The current backend route, schema, and service definitions were inspected for:

- auth login/logout/refresh, organization signup, password recovery, sessions, and workspace
  bootstrap
- organization/member permissions, profile/settings, Team members and invitations
- Trust Invitation list/summary/create/detail/send/resend/cancel/delete
- People list/detail/notes, lifecycle, employment profile, job roles, and structured report
- verification inbox/detail/evidence/timeline/reviewer/internal notes/request-information and
  accept/verify/reject/cancel/unable-to-verify mutations
- Verification Preferences, organization logo, notifications, and account sessions
- employee roster import, mapping, rows, confirm, errors, registry listing, and canonical template
  download

No frontend/backend route or payload incompatibility was found. The attempted local OpenAPI export
from the immutable backend snapshot stopped before schema generation because the existing backend
environment lacks the optional `openpyxl` runtime dependency used by roster parsing. No backend
package was installed and no backend file was changed; compatibility conclusions use the exact
route/schema/service source at the authoritative SHA.

## Semantic regression results

### Trust Invitation defaults

- Untouched defaults omit `requested_verification_types`: **PASS**.
- An edited selection sends the explicit selected values: **PASS**.
- Explicit clear-all sends `requested_verification_types: []`: **PASS**.
- Omission and an empty list remain distinct: **PASS**.

### Employment role patching

- Historical inactive role plus department-only edit omits `role_id`: **PASS**.
- Historical inactive role plus joining-date-only edit omits `role_id`: **PASS**.
- The backend therefore preserves the unchanged historical assignment: **PASS by contract**.
- Selecting another active role sends its canonical ID: **PASS**.
- Explicit role clear sends `role_id: null`: **PASS**.
- Inactive roles cannot be newly selected: **PASS**.

### Court and structured report

- Canonical `court_record_search` summary maps to the backend `court_search` detail collection:
  **PASS**.
- Legacy `court_search` summaries remain compatible without duplicate Court sections: **PASS**.
- Source, remarks, status, evidence, limitations, and structured fields are retained: **PASS**.
- On-screen and print rendering use the same canonical report model: **PASS**.
- Identity values are defensively masked; provider tokens, raw metadata, and internal notes are not
  rendered: **PASS**.
- Trust Score, Interim/Final state, Open Items, HR Review, and neutral pending/awaiting/not-ordered
  states remain backend-authoritative: **PASS**.

### Employee lifecycle

- `ACTIVE -> EX_EMPLOYEE` is supported: **PASS**.
- Last Working Day is required, a real date, not future, and not before joining date: **PASS**.
- No unsupported Reactivate control is present: **PASS**.

## Validation evidence

- Runtime: Node `v22.23.3`
- Clean install: `npm ci` **PASS** (`554` packages installed; `555` audited)
- Focused contract suite: **PASS**, `42/42` tests across `5` files
- Full HR suite: **PASS**, `215/215` tests across `43` files
- TypeScript: **PASS**, `tsc --noEmit`
- Changed-file ESLint: **PASS**, zero warnings/errors
- Full ESLint: **PASS**, zero errors and six unchanged Fast Refresh warnings
- Changed-file Prettier check: **PASS**
- Standard production build: **PASS**
- Amplify build (`NITRO_PRESET=aws_amplify`): **PASS**
- `git diff --check`: **PASS**

The full test run emits jsdom's expected `Not implemented: navigation to another Document` message;
it is not a failed assertion or a browser runtime exception.

## SSR and deep-link results

The generated Amplify Node 22 compute server was started locally and queried directly.

| Route                                              | Result                                  |
| -------------------------------------------------- | --------------------------------------- |
| `/login`                                           | HTTP 200                                |
| `/app`                                             | HTTP 200                                |
| `/app/invitations`                                 | canonical query redirect, then HTTP 200 |
| `/app/invitations/test-invitation-id`              | canonical query redirect, then HTTP 200 |
| `/app/people`                                      | canonical query redirect, then HTTP 200 |
| `/app/people/test-person-id`                       | HTTP 200                                |
| `/app/verifications/test-verification-id`          | HTTP 200                                |
| `/team-invitations/accept?token=opaque-test-token` | HTTP 200                                |
| `/app/reports/test-person-id`                      | HTTP 200                                |
| `/forgot-password?reset_token=opaque-test-token`   | HTTP 200                                |

No route returned 404 or 5xx. Canonical filter redirects preserve route identity, and router-based
navigation/back behavior remains covered by the existing route tests.

## Staging environment and QA

Read-only environment checks on 20 October 2026:

- Amplify app: `d2lt5cu333z82d`
- Staging branch: `codex/hr-workspace-v1-finalization`
- Staging URL: `https://hr-v1-finalization.d2lt5cu333z82d.amplifyapp.com`
- API: `https://staging-api.kairoid.com`
- Frontend root: HTTP 200
- Existing Person deep link: HTTP 200
- API `/live`: HTTP 200
- API `/ready`: HTTP 200
- CORS preflight from the staging frontend origin: HTTP 200 with the expected allow-origin and
  credential headers
- Latest existing Amplify job: `10`, successful, deploying the older Employment References V1
  source rather than this V2 candidate

The command prohibits changing AWS, and the integrated branch has not been deployed to Staging.
Consequently QA1-QA10 were **not mutated live** and are not claimed as passed. Their contract and UI
semantics pass automated tests and local Amplify SSR checks; authenticated V2 Staging mutation QA
remains a required promotion gate. No email was sent.

## Privacy and security

- No access, refresh, invitation, reset, password, or OTP value is logged by the audited flows.
- Team invitation acceptance is `noindex, nofollow` and `no-referrer`; only synthetic opaque test
  values were used in local deep-link checks.
- Password reset tokens are parsed from the URL and are not persisted.
- Report mapping excludes backend metadata/internal notes and masks sensitive identity fields.
- No Production data was read or mutated by this task.

`npm audit --omit=dev` reports **22 production-tree advisories** (2 low, 4 moderate, 11 high,
5 critical). Most importantly, the locked `@tanstack/react-start@1.168.11` and
`@tanstack/start-server-core@1.169.3` fall within the affected range for the critical
unauthenticated reflected-XSS advisory `GHSA-qx66-fv34-fjm8`. This integration task did not perform
an unscoped framework upgrade.

## Remaining warnings and debt

1. Upgrade the TanStack Start/server dependency line to a non-vulnerable compatible release, then
   repeat the full Node 22, SSR, and security validation. This is a Production approval blocker.
2. Deploy this candidate to the existing Staging lane under separate AWS/deployment approval and
   complete authenticated QA1-QA10 with synthetic fixtures. This is a Production approval blocker.
3. Review and remediate the remaining npm runtime advisories without using a blind force upgrade.
4. Six pre-existing Fast Refresh lint warnings and the client chunk-size warning remain unchanged.

## Final status

**BLOCKED**

The integrated source is coherent and staging-ready, but it is not yet
`READY_FOR_PRODUCTION_DEPLOYMENT_APPROVAL` because the current SSR dependency line has a critical
security advisory and the exact candidate has not received authenticated Staging mutation QA.
