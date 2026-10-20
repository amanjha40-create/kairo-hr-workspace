# HR V2 TanStack security certification

## Certified source

- Repository: `kairo-hr-workspace`
- Branch: `codex/hr-v2-tanstack-security-remediation`
- Integrated RC base: `9dc64e24a9e2b5f109f316ba23922ff9b63d9ee9`
- Certified remediation source SHA: `317469c52af9553c0d5da5daacc7677a6b8dac6d`
- Production deployment performed: **NO**
- Staging deployment performed: **NO**
- Backend, database, AWS, account, invitation, and email mutation performed: **NO**

The remediation was developed in an isolated worktree. The unrelated `HelpWidget.tsx` edit in the
active checkout and the prior release-integration worktree were not modified.

## Advisory and root cause

The release candidate used versions affected by TanStack's critical unauthenticated reflected-XSS
advisory [`GHSA-qx66-fv34-fjm8`](https://github.com/TanStack/router/security/advisories/GHSA-qx66-fv34-fjm8)
(`CVE-2026-102989`, CVSS 9.3). A malformed server-function payload could cause attacker-controlled
response-shaped data to be treated as an HTTP response. The upstream fix restricts client input to
public fields and validates responses at the server boundary.

Affected ranges and first patched versions from the advisory:

- `@tanstack/react-start`: `>=1.143.12 <1.168.60`; first patched `1.168.60`
- `@tanstack/start-server-core`: `>=1.143.12 <1.169.39`; first patched `1.169.39`

## Dependency remediation

The direct dependency was moved to the smallest patched compatible React Start release and pinned
exactly so a future install cannot drift below or across the reviewed release line.

| Package                        | Before   | Certified after |
| ------------------------------ | -------- | --------------- |
| `@tanstack/react-start`        | 1.168.11 | 1.168.60        |
| `@tanstack/start-server-core`  | 1.169.3  | 1.169.39        |
| `@tanstack/react-start-rsc`    | 0.1.11   | 0.1.59          |
| `@tanstack/react-start-server` | 1.167.8  | 1.167.46        |
| `@tanstack/react-start-client` | 1.168.3  | 1.168.39        |
| `@tanstack/start-client-core`  | n/a      | 1.170.34        |
| `@tanstack/start-plugin-core`  | 1.171.4  | 1.171.49        |
| `@tanstack/router-plugin`      | 1.168.11 | 1.168.42        |
| `@tanstack/react-router`       | 1.170.8  | 1.170.41        |
| `@tanstack/router-core`        | 1.171.6  | 1.171.34        |

`npm ls` and the lockfile each show one deduplicated copy of every package above. Neither affected
version remains. The unrelated malicious TanStack versions `1.167.68` and `1.167.71`, package
`@tanstack/setup`, and indicator `router_init.js` are absent.

The patched router now types root route errors as `unknown`. The root error component adopts the
official `ErrorComponentProps` type; this is a type-only compatibility adjustment and does not
change the error UX. The regenerated route tree contains the same 27-route set as the base and only
reflects deterministic generator ordering from the patched toolchain.

No other direct dependency changed. The root Prettier version remains `3.8.3`.

## Security regression coverage

Focused synthetic payload cases prove that untrusted values remain inert in the highest-risk HR
surfaces:

- public Team invitation organization name
- password reset query token, including non-rendering and no local/session storage persistence
- People search input
- candidate, organization, Court detail, evidence label, and note fields in structured reports

The application contains no `dangerouslySetInnerHTML`, direct `innerHTML`, or `document.write`
usage. The root error boundary and route metadata use static copy; public token-route error states do
not interpolate token values.

## Node 22 validation

- Runtime: Node `v22.23.3`
- Clean install: `npm ci` **PASS** (`531` packages installed; `532` audited)
- Focused security suite: **PASS**, `19/19` tests across `4` files
- Full HR suite: **PASS**, `219/219` tests across `43` files
- TypeScript: **PASS**, `tsc --noEmit`
- Full ESLint: **PASS**, zero errors and six unchanged Fast Refresh warnings
- Changed-file Prettier: **PASS**
- Standard production build: **PASS**
- Production-equivalent Amplify build: **PASS** with `NITRO_PRESET=aws_amplify`, production API,
  Google SSO disabled, and canonical marketing origin
- `git diff --check`: **PASS**

The test run's jsdom `Not implemented: navigation to another Document` output is an existing
non-failing environment message. Build output retains the existing client chunk-size and
Cloudflare/Wrangler warnings; neither is introduced by this remediation.

## Amplify SSR and artifact validation

The generated Amplify Node 22 compute server was queried directly. `/login`, `/app`, invitation
list/detail, People list/detail, verification detail, report detail, Team acceptance, password
reset, and People search deep links all resolved to HTTP 200 after expected canonical query
redirects. Synthetic script/image payloads in route and query data were not emitted as executable
markup, and no tested route returned 404 or 5xx.

The production-equivalent artifact contains:

- the intended `https://api.kairoid.com` API origin
- no staging or localhost API origin
- no synthetic test token
- no source maps
- no detected private key, AWS secret, database URL, Brevo key, or Supabase service-role material

No live Staging or Production request was made as evidence for this source certification.

## Audit result and residual debt

The target advisory and CVE are absent from both full and production-only `npm audit` results.
`npm audit --omit=dev` now reports `14` residual advisories (`1` low, `3` moderate, `10` high,
`0` critical), down from `22` production-tree advisories including `5` critical on the base.

The full audit reports one unrelated dev-only critical advisory in `shell-quote@1.10.0`, reached
through `@lovable.dev/vite-tanstack-config -> @tanstack/devtools-vite -> launch-editor`. It is not
present in the production dependency audit or Amplify runtime artifact. Remaining non-target
advisories should be remediated as separately scoped dependency work without a blind force upgrade.

## Decision

**READY_FOR_STAGING_DEPLOYMENT**

The critical TanStack Start reflected-XSS release blocker is remediated at the smallest reviewed
compatible version, regression coverage is present, and the exact source passes clean Node 22,
full-suite, SSR, and Amplify artifact certification. Production remains unchanged. Authenticated
Staging QA of this exact SHA remains the next release gate.
