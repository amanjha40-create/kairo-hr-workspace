# HR V2 controlled Production deployment

## Outcome

**HR V2 PRODUCTION DEPLOYMENT COMPLETE**

The certified HR V2 frontend was promoted to Production through a normal Git fast-forward and deployed by the existing AWS Amplify Production branch. The deployment changed no backend, database, AWS infrastructure, secret, IAM, network, or Production application data.

## A-AB deployment record

### A. Pre-deployment Production SHA

`81dc8d6baea9c14827e03cfb84b3f4adcc790cdd`

Amplify Production job `14` was `SUCCEED` on this exact checkout before promotion.

### B. Certified application source SHA

`6f2bfd6f9aad88e0d0c40c7a82f3fe8531eed824`

This is the certified runtime/package/config source. Its full certified suite was `219/219` tests across 43 files.

### C. Final Production SHA

`5db7a28a80692b1d3e6a7afa92adcd31dafcc299`

The final checkout is a direct descendant of the certified application source. The only changes after the certified SHA are:

- added `reports/hr-v2-npm10-lockfile-certification.md`
- updated `reports/hr-v2-release-handoff.md`

A targeted diff proved no change under `src`, `public`, `package.json`, `package-lock.json`, `amplify.yml`, `vite.config.ts`, `nitro.config.ts`, or `.env.example`.

### D. Release and promotion method

- fetched canonical `origin`
- proved `origin/main` was an ancestor of the certified source
- proved the certified source was an ancestor of the release tip
- promoted `81dc8d6...` to `5db7a28...` by a normal fast-forward push to `main`
- force push: No
- unrelated commits: None
- infrastructure/configuration mutation: None

### E. Amplify Production job

- App: `kairo-hr-workspace`
- App ID: `d2lt5cu333z82d`
- Branch: `main`
- Stage: `PRODUCTION`
- Job: `15`
- Result: `SUCCEED`

### F. Checkout SHA

Amplify job `15` checked out:

`5db7a28a80692b1d3e6a7afa92adcd31dafcc299`

### G. Node and npm versions

- Node.js: `v22.18.0`
- npm: `10.9.3`

### H. npm ci

**PASS.** Amplify completed `npm ci` under Node 22/npm 10 without the previous lockfile consistency failure.

The existing dependency-audit warnings remain advisory build output and did not fail installation or change the certified dependency tree.

### I. Build result

**PASS.** `NITRO_PRESET=aws_amplify npm run build` completed successfully using Nitro's `aws-amplify` preset.

### J. Deploy result

**PASS.** Amplify `DEPLOY` completed successfully.

### K. Verify result

**PASS.** Amplify `VERIFY` completed successfully.

### L. Production root HTTP

- `https://hr.kairoid.com/`: HTTP `200`
- `https://hr.kairoid.com/login`: HTTP `200`
- `https://api.kairoid.com/api/v1/health/live`: HTTP `200`
- `https://api.kairoid.com/api/v1/health/ready`: HTTP `200`

### M. Direct-route results

All route checks terminated at HTTP `200` and no hard refresh returned `404`:

- `/app`
- `/app/people`
- `/app/people/{existing_public_id}` through an authenticated direct refresh
- `/app/verifications`
- `/app/reports/{public_id}` route shell
- `/team-invitations/accept`
- `/forgot-password?reset_token={redacted}` completion shell

Canonical query normalization and authentication redirects returned expected intermediate `307` responses before their final HTTP `200` destinations.

### N. Authenticated bootstrap

**PASS** using an existing authorized Production Owner account.

- existing session recovered
- workspace bootstrap selected the existing organization
- Owner role rendered
- no new organization, account, password, or session was created or changed

### O. Dashboard

**PASS.** Overview, metrics, attention state, recent verification state, and recent activity rendered from the authenticated Production workspace.

### P. People

**PASS.** The directory loaded 99 existing records from the canonical Production projection. One existing person detail loaded read-only and passed a direct hard refresh with identity/employment, verification, passport, notes, and activity surfaces present.

No person, role, employment record, note, or lifecycle state was created or mutated.

### Q. Trust Invitations

**PASS.** The authenticated Trust Invitations list rendered without an error boundary. No invitation was created, resent, cancelled, deleted, or accepted.

### R. Verification inbox

**PASS.** The authenticated Employment Verification inbox rendered without an error boundary. No verification or reviewer state was mutated.

### S. Team

**PASS.** The authenticated Team members/invitations surface rendered read-only. The public acceptance shell resolved on `https://hr.kairoid.com/team-invitations/accept`, showed a truthful incomplete-link state without a token, and retained `noindex, nofollow` plus `no-referrer` metadata.

No Team invitation, role, suspension, ownership, or membership mutation occurred.

### T. Structured report

**NOT EXERCISED IN PRODUCTION SMOKE.** The current authorized organization exposes no safe existing verification/report link. The direct report route shell returned HTTP `200`, and the full structured report, Court adapter, privacy masking, and print/PDF behavior remain covered by certified staging acceptance.

Production also has no current Job Role fixture, so inactive historical-role rendering and the inactive-assignment guard were not exercised. Their certified staging evidence remains authoritative.

### U. Console errors and warnings

- authenticated workspace console errors: `0`
- authenticated workspace console warnings: `0`
- Team invitation shell console errors: `0`
- password-reset completion shell console errors: `0`

### V. Unexpected 4xx and 5xx

- unexpected application/API `4xx`: `0`
- unexpected application/API `5xx`: `0`
- expected canonical/auth redirects: present and terminated at HTTP `200`
- deliberate source-map probe: HTTP `404`, as required

### W. Security and privacy

**PASS.**

- Production Amplify uses app-level `VITE_API_BASE_URL=https://api.kairoid.com`
- the deployed client bundle contains the Production API origin
- staging API/Amplify origins are absent from the deployed client bundle
- no localhost API fallback is present; a TanStack Router internal null-origin fallback string is not an API endpoint
- `@tanstack/react-start` resolves to `1.168.60`
- `@tanstack/start-server-core` resolves to `1.169.39`
- GHSA-qx66-fv34-fjm8 / CVE-2026-102989 remediation is present in the deployed lock lineage
- focused reflected-XSS certification remains `19/19` passing
- deployed JavaScript source map returned `404` and the bundle has no `sourceMappingURL` comment
- no common AWS/private-key/live-secret pattern was found in the deployed entry bundle
- no invitation token, reset token, credential, session token, or private evidence URL was printed or logged
- no reflected-XSS execution was observed

### X. Backend and infrastructure negative controls

Production remained unchanged after frontend deployment:

- backend: `kairo-backend:42`, desired/running/pending `1/1/0`
- worker: `kairo-resume-worker:13`, desired/running/pending `1/1/0`
- database: Alembic `093`
- ECS rollout: No
- database migration: No
- backend source change: No
- IAM/secret/ALB/network change: No

### Y. Production data mutations

`0`

The smoke used read-only navigation and existing authorized records only.

### Z. External messages and provider calls

- email sends: `0`
- SMS sends: `0`
- Team invitations: `0`
- external verification/provider calls: `0`

### AA. Git parity and cleanliness

- Production `main`: `5db7a28a80692b1d3e6a7afa92adcd31dafcc299`
- `origin/main`: same SHA
- Production checkout: same SHA
- ahead/behind: `0/0`
- force push: No
- deployment worktree: clean after report commit
- required deployment report is maintained on the documentation-only branch `codex/hr-v2-production-deployment-report` so it cannot trigger a second Production build

### AB. Remaining defects

None blocking this controlled HR V2 Production release.

Data-dependent inactive-role and structured Court-report rendering were not exercised in Production because no safe existing fixture was available. This is not a failure; certified staging evidence covers those scenarios.

## Final status

`HR V2 PRODUCTION DEPLOYMENT COMPLETE`
