# HR V2 security-remediated release handoff

## Candidate identity

- Branch: `codex/hr-v2-tanstack-security-remediation`
- Integrated RC base: `9dc64e24a9e2b5f109f316ba23922ff9b63d9ee9`
- Certified remediation source SHA: `317469c52af9553c0d5da5daacc7677a6b8dac6d`
- Backend compatibility target: `12ffa525af33f154f22fc7f0519acd7d55578907`, API42,
  Worker13, DB093
- Production deployment performed: **NO**
- Staging deployment performed: **NO**
- Backend/AWS/database modification performed: **NO**

## Security compatibility floor

Do not build or deploy this HR V2 line with TanStack packages below:

- `@tanstack/react-start@1.168.60`
- `@tanstack/start-server-core@1.169.39`

These are the first patched versions for critical reflected-XSS advisory
`GHSA-qx66-fv34-fjm8`. The exact certified dependency graph and validation evidence are in
`reports/hr-v2-tanstack-security-certification.md`.

## What is integrated

The candidate contains the full certified HR V2 release line, canonical Court report adapter,
invitation/default compatibility closure, inactive historical-role partial-patch fix, and the
TanStack Start security remediation. It preserves the same 27-route application surface and adds
only framework compatibility typing plus focused inert-rendering regression coverage.

## Required deployment order

1. Keep the compatible backend at or above SHA `12ffa525af33f154f22fc7f0519acd7d55578907`,
   API42, Worker13, and DB093.
2. Deploy certified remediation source SHA `317469c52af9553c0d5da5daacc7677a6b8dac6d` or
   its documentation-only descendant to the existing non-Production Amplify Staging lane.
3. Use `VITE_API_BASE_URL=https://staging-api.kairoid.com` and preserve the approved Staging auth
   configuration. Do not reuse the production-equivalent artifact produced during local checks.
4. Complete authenticated synthetic Staging QA for invitation omission/empty-list semantics,
   inactive historical role edits, active role change, explicit role clear, Court screen/print,
   Team acceptance deep link, password recovery, and Person hard refresh.
5. Confirm no console errors, unexpected 4xx/5xx, private-field leakage, duplicate report sections,
   token persistence, or executable payload reflection.
6. Only after those gates pass, prepare a founder-reviewed Production deployment approval.

Do not send a real Team invitation, mutate Production, or promote directly from this handoff
without separate approval.

## Certification summary

- Clean Node 22 install: **PASS**
- Focused security tests: **19/19 PASS**
- Full HR suite: **219/219 PASS**
- TypeScript: **PASS**
- ESLint: **PASS**, zero errors; six unchanged warnings
- Standard production build: **PASS**
- Production-equivalent Amplify build: **PASS**
- Direct Amplify SSR/deep links: **PASS**
- Artifact origin/secrets/source-map checks: **PASS**
- Target advisory in audit: **ABSENT**
- Production-tree critical advisories: **0**

## Scope and residual debt

- The active checkout's unrelated `HelpWidget.tsx` edit remains untouched.
- The backend repository, database, AWS resources, Staging, and Production remain untouched.
- No account, organization, invitation, email, or external-provider mutation occurred.
- The full npm audit retains one dev-only `shell-quote` critical advisory and additional non-target
  advisories; production-only audit has no critical finding. Address these in a separate reviewed
  dependency task.
- Existing Fast Refresh, client chunk-size, and Cloudflare/Wrangler warnings remain unchanged.

## Decision

**READY_FOR_STAGING_DEPLOYMENT**

The prior TanStack security release blocker is closed. The exact candidate still requires
authenticated Staging QA before any Production deployment approval.
