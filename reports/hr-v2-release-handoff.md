# HR V2 npm10-reproducible release handoff

## Candidate identity

- Branch: `codex/hr-v2-npm10-lockfile-fix`
- Release-line starting SHA: `bf49869cbcf9631f530839fbf91da2286a4682e2`
- Certified lockfile/application source SHA: `6f2bfd6f9aad88e0d0c40c7a82f3fe8531eed824`
- Backend compatibility target: `12ffa525af33f154f22fc7f0519acd7d55578907`, API42,
  Worker13, DB093
- Staging deployment performed by this task: **NO**
- Production deployment performed: **NO**
- Backend/AWS/database modification performed: **NO**

## Reproducibility floor

The release lockfile is generated and authoritatively certified with:

- Node `22.18.0`
- npm `10.9.3`

It is also clean-install and build compatible with Node `22.23.3` and npm `11.17.0`. Amplify's npm
10 build image requires the committed Nitro nested `lru-cache@11.5.3` optional/peer entry. Do not
regenerate this lockfile with npm 11 without repeating npm 10 clean-install certification.

The exact diff and evidence are in `reports/hr-v2-npm10-lockfile-certification.md`.

## Security compatibility floor

Do not build or deploy this HR V2 line with TanStack packages below:

- `@tanstack/react-start@1.168.60`
- `@tanstack/start-server-core@1.169.39`

The target reflected-XSS advisory `GHSA-qx66-fv34-fjm8` remains absent. Each patched package has one
deduplicated installed copy, and the production dependency audit has zero critical findings.

## What is integrated

The candidate contains the full certified HR V2 release line, canonical Court report adapter,
invitation/default compatibility closure, inactive historical-role partial-patch fix, TanStack
Start security remediation, and npm-10-reproducible lockfile.

The reproducibility correction changes only `package-lock.json`: no application source, test,
manifest, script, route, dependency declaration, or product behavior changed.

## Prior Staging attempt

Amplify Staging job `11` attempted prior source `9a0ff267cdc0e84d6fe413b583a99eb861941dbc`
and failed during npm 10 lockfile validation before deploy. Deploy and verify were cancelled, no
authenticated QA ran, no application record changed, and Production remained untouched.

Do not retry job 11 unchanged. Use the new certified source above.

## Required deployment order

1. Keep the compatible backend at or above SHA `12ffa525af33f154f22fc7f0519acd7d55578907`,
   API42, Worker13, and DB093.
2. Fast-forward the existing HR Staging ref to certified source SHA
   `6f2bfd6f9aad88e0d0c40c7a82f3fe8531eed824` or its documentation-only descendant.
3. Deploy only the existing non-Production Amplify BETA branch with
   `VITE_API_BASE_URL=https://staging-api.kairoid.com`.
4. Confirm Amplify build, deploy, and verify succeed under its Node 22/npm 10 image.
5. Resume authenticated synthetic Staging QA for invitation omitted/empty-list semantics,
   historical inactive-role edits, active role change, explicit role clear, Court screen/print,
   Team acceptance, password recovery, and Person hard refresh.
6. Confirm no console errors, unexpected 4xx/5xx, private-field leakage, duplicate report sections,
   token persistence, or executable payload reflection.
7. Only after those gates pass, prepare a founder-reviewed Production deployment approval.

Do not send a real Team invitation, mutate Production, or promote directly from this handoff
without separate approval.

## Certification summary

- npm 10 clean install: **PASS**
- npm 11 clean-install cross-check: **PASS**
- Focused security tests: **19/19 PASS**
- Full HR suite: **219/219 PASS**
- TypeScript: **PASS**
- ESLint: **PASS**, zero errors; six unchanged warnings
- Prettier: **PASS**
- Standard production builds: **PASS** under npm 10 and npm 11
- Amplify-equivalent builds: **PASS** under npm 10 and npm 11
- `git diff --check`: **PASS**
- Target advisory: **ABSENT**
- Product source changes: **NONE**

## Scope and residual debt

- The active checkout's unrelated `HelpWidget.tsx` edit remains untouched.
- Backend, database, AWS resources, Staging, and Production remain untouched by this correction.
- No account, organization, invitation, email, or external-provider mutation occurred.
- Existing non-target npm advisories, Fast Refresh warnings, client chunk-size warning, and
  Cloudflare/Wrangler warning remain separately scoped release debt.

## Decision

**READY_FOR_STAGING_RETRY**

The npm 10 lockfile blocker is closed. Deploy the exact certified source to Staging and complete the
previously scoped authenticated QA before requesting Production approval.
