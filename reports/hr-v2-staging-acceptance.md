# HR V2 staging acceptance

## Outcome

**BLOCKED** before deployment and authenticated mutation QA.

The exact certified candidate was checked out successfully by AWS Amplify, but the build stopped at
`npm ci`. Deploy and verify never started, so the existing live Staging artifact remains unchanged.
No HR application data mutation or authenticated QA was performed.

## A-Z acceptance record

### A. Exact source SHA

`9a0ff267cdc0e84d6fe413b583a99eb861941dbc`

The candidate branch was clean, matched origin, and had `0/0` ahead/behind before deployment.

### B. Staging Amplify app and branch

- App: `kairo-hr-workspace`
- App ID: `d2lt5cu333z82d`
- Region: `us-east-1`
- Branch: `codex/hr-workspace-v1-finalization`
- Stage: `BETA`
- Domain: `https://hr-v1-finalization.d2lt5cu333z82d.amplifyapp.com`
- API environment: `VITE_API_BASE_URL=https://staging-api.kairoid.com`
- Auto-build: disabled

Production is the separate `main` branch and was not targeted.

### C. Pre-deploy staging SHA

- Pre-deploy staging Git ref: `3d5af03520ef0f4b35961a46b0abf01e85074520`
- Existing live Amplify job: `10`, `SUCCEED`
- Job 10 records `commitId=HEAD`; its deployment message identifies Employment References V1
  source `f0d00f2176298953123a77a92045de2ec92297e9`.

The staging Git ref was advanced normally, without force push, to the exact certified SHA before
starting the deployment job.

### D. Staging deployment job

- Job: `11`
- Requested commit: `9a0ff267cdc0e84d6fe413b583a99eb861941dbc`
- Result: `FAILED`
- Build: `FAILED`
- Deploy: `CANCELLED`
- Verify: `CANCELLED`

Amplify cloned and detached at the exact requested SHA. Node `22.18.0` and npm `10.9.3` were used.
`npm ci` then rejected the lockfile:

```text
Missing: lru-cache@11.5.3 from lock file
```

### E. Deployed SHA verification

**NOT DEPLOYED.** Job 11 failed before the deploy phase. The live Staging artifact remains job 10.

### F. Root and deep-link HTTP results

The pre-existing Staging root returned HTTP 200 before the attempted deployment. No post-deploy
deep-link result is claimed because no new artifact was deployed.

### G-P. Mutation and report scenarios

The following scenarios were not started because the required source was not live:

- untouched Trust Invitation defaults
- explicit `requested_verification_types: []`
- inactive-role department-only edit
- inactive-role joining-date-only edit
- active role change
- explicit role clear
- inactive-role assignment guard
- Court report screen rendering
- Court report print/PDF rendering
- Team invitation acceptance

No invitation was created or sent, and no email was triggered.

### Q. Auth, session, and deep-link result

**NOT RUN** against the certified candidate. No credentials, OTPs, session tokens, invitation
tokens, or reset tokens were requested, entered, read, or exposed.

### R. Console error count

Not applicable because authenticated browser QA did not begin.

### S. Unexpected network failure count

- Application/API failures: `0`
- Amplify build failures: `1`, the deterministic npm lockfile validation failure above

### T. Reflected-XSS smoke result

Not run live because the certified artifact was not deployed. The source certification remains
green with `19/19` focused XSS tests and `219/219` full HR tests.

### U. Staging API health

- Canonical `/api/v1/health/live`: HTTP 200
- Canonical `/api/v1/health/ready`: HTTP 200

The legacy bare `/live` and `/ready` paths return 404 and are not the current OpenAPI health
contract.

### V. Staging ECS health

- `kairo-staging-backend`: active, desired `1`, running `1`, pending `0`, task definition `251`
- `kairo-staging-resume-worker`: active, desired `1`, running `1`, pending `0`, task definition `20`

No scheduler or ECS configuration was changed.

### W. Production negative controls

- Production Amplify branch: `main`
- Production source/job remains job `14` at
  `81dc8d6baea9c14827e03cfb84b3f4adcc790cdd`
- Production job triggered: **NO**
- Production frontend/backend/database/data mutation: **NO**

### X. Staging mutations performed

- Staging Git ref fast-forwarded to the exact candidate SHA
- Amplify Staging job 11 started and failed before deploy
- Application records created: `0`
- Application records mutated: `0`
- Emails sent: `0`

### Y. Cleanup result

No application fixture cleanup was required because no fixture was created or mutated. The failed
Amplify job and staging Git ref are intentionally retained as deployment audit evidence.

### Z. Final recommendation

**BLOCKED**

## Root cause and exact next fix

The certified lockfile was generated and validated with npm `11.17.0`. Amplify's Node 22 image uses
npm `10.9.3`, whose lockfile validator requires Nitro's optional/peer nested
`lru-cache@11.5.3` entry. The failure reproduces locally with `npx npm@10.9.3 ci --dry-run`.

A disposable npm `10.9.3` lockfile regeneration outside the repository produced a narrowly scoped
23-line diff:

- add `node_modules/nitro/node_modules/lru-cache@11.5.3`
- normalize four optional platform package `libc` metadata entries
- no `package.json` or application source change

The disposable regenerated lock passes both npm `10.9.3` and npm `11.17.0` clean-install
validation. The next authorized command should regenerate only `package-lock.json` with npm
`10.9.3`, re-run the complete Node 22 certification, commit a new SHA, deploy that exact descendant
to Staging, and resume QA from Phase 2. Do not retry job 11 unchanged.
