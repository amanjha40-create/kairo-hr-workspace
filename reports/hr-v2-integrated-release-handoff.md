# HR V2 integrated release handoff

## Candidate identity

- Branch: `codex/hr-v2-release-integration`
- Runtime integration base: `81dc8d6baea9c14827e03cfb84b3f4adcc790cdd`
- Certified source/test SHA: `9ad0bf76aa3b4d1696055792c252558f832afb7a`
- Backend compatibility target: `12ffa525af33f154f22fc7f0519acd7d55578907`, API42,
  Worker13, DB093
- Production deployment performed: **NO**
- Backend/AWS/database modification performed: **NO**

## What is integrated

The candidate contains the full certified HR V2 Batch 2 feature line, canonical Court report
adapter, final invitation/default compatibility closure, and inactive historical-role partial-patch
fix. Git proves these changes are linear descendants, so no conflict resolution or duplicate
implementation was introduced.

The complete evidence, endpoint audit, exact checks, and current blockers are in
`reports/hr-v2-integrated-release-certification.md`.

## Promotion gates

1. Upgrade the vulnerable TanStack Start/server packages to versions outside
   `GHSA-qx66-fv34-fjm8`; review the resulting lockfile rather than applying a blind force fix.
2. Re-run clean Node 22 install, all `215+` tests, typecheck, lint, Prettier, standard build,
   Amplify build, dependency audit, deep links, and `git diff --check`.
3. Deploy the certified descendant to the existing non-Production Amplify Staging lane with
   `VITE_API_BASE_URL=https://staging-api.kairoid.com`.
4. Complete authenticated synthetic Staging QA for invitation omission/empty-list semantics,
   inactive historical role edits, active role change, explicit role clear, Court screen/print,
   Team acceptance deep link, and Person hard refresh.
5. Confirm no console errors, unexpected 4xx/5xx, private-field leakage, duplicate report sections,
   or token persistence. Do not send a real Team invitation without separate approval.
6. Only after those gates pass, prepare a founder-reviewed Production deployment approval. Do not
   deploy this branch directly from this handoff.

## Staging baseline

The existing Staging frontend and API are healthy and CORS-compatible, but Amplify job `10` serves
an older source line. The integrated V2 candidate was intentionally not deployed because this task
forbids changing AWS. Current live Staging behavior must not be cited as proof of this candidate.

## Rollback and scope

- The active checkout's unrelated `HelpWidget.tsx` edit remains untouched.
- The backend repository remains untouched.
- No Production frontend, account, organization, invitation, Candidate, or database record changed.
- No real email or external provider action occurred.
- If a later dependency upgrade regresses behavior, return to certified source/test SHA
  `9ad0bf76aa3b4d1696055792c252558f832afb7a`; do not roll back API42/DB093 from this frontend lane.

## Decision

The source lineage and business-contract integration are certified. Production promotion is
**BLOCKED** pending the security dependency upgrade and authenticated QA of the exact candidate on
Staging.
