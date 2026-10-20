# HR V2 npm 10 lockfile certification

## Certified source

- Repository: `kairo-hr-workspace`
- Branch: `codex/hr-v2-npm10-lockfile-fix`
- Starting lineage SHA: `bf49869cbcf9631f530839fbf91da2286a4682e2`
- Prior certified application source: `9a0ff267cdc0e84d6fe413b583a99eb861941dbc`
- Certified npm 10 lockfile source SHA: `6f2bfd6f9aad88e0d0c40c7a82f3fe8531eed824`
- Staging deployment performed: **NO**
- Production deployment performed: **NO**
- Backend, database, AWS, and application-data mutation performed: **NO**

The work was completed in a new isolated worktree. The active checkout, its unrelated
`HelpWidget.tsx` edit, the backend repository, and existing deployment worktrees were not changed.

## Root cause

AWS Amplify staging job `11` checked out the exact prior candidate but failed before build because
Node `22.18.0` with npm `10.9.3` rejected the npm-11-generated lockfile:

```text
Missing: lru-cache@11.5.3 from lock file
```

The application source and dependency manifest were valid. The incompatibility was limited to
lockfile representation across npm major versions.

## Toolchain

- Authoritative generation and certification: Node `22.18.0`, npm `10.9.3`
- Cross-check: Node `22.23.3`, npm `11.17.0`

The corrected lockfile was generated with npm `10.9.3`; npm 11 was used only to prove cross-version
clean-install and build compatibility and did not regenerate the lockfile.

## Lockfile-only delta

`package.json` is unchanged. No application source, test, script, build configuration, or direct
dependency declaration changed.

`package-lock.json` changed by `23` lines: `11` additions and `12` removals.

- Added `node_modules/nitro/node_modules/lru-cache@11.5.3` with its registry integrity, Node engine,
  optional, and peer metadata.
- Removed npm-11-only `libc` metadata from four optional platform package entries.
- Added packages: one nested lockfile relationship for `lru-cache@11.5.3`.
- Removed packages: none.
- Upgraded or downgraded dependencies: none.
- Direct dependency changes: none.

The Nitro nested entry is required by npm 10's lockfile validator. The resulting lockfile passes
both npm 10 and npm 11 clean installs.

## Security integrity

- `@tanstack/react-start`: one copy at `1.168.60`
- `@tanstack/start-server-core`: one copy at `1.169.39`
- Vulnerable duplicate TanStack versions: none
- `GHSA-qx66-fv34-fjm8` / `CVE-2026-102989` in production audit: absent
- `npm audit --omit=dev`: `1` low, `3` moderate, `10` high, `0` critical

The prior reflected-XSS remediation remains intact. Residual non-target audit findings are unchanged
release debt and were not broadened into this lockfile-only task.

## npm 10 authoritative validation

- Clean `npm ci`: **PASS**, `537` packages installed and `538` audited
- Focused XSS suite: **PASS**, `19/19` tests across `4` files
- Full HR suite: **PASS**, `219/219` tests across `43` files
- TypeScript: **PASS**, `tsc --noEmit`
- ESLint: **PASS**, zero errors and six unchanged Fast Refresh warnings
- Prettier: **PASS**
- Standard production build: **PASS**
- Amplify-equivalent build: **PASS** with `NITRO_PRESET=aws_amplify` and the Staging API origin
- `git diff --check`: **PASS**

The full suite retains the known non-failing jsdom navigation message. Build output retains the
existing client chunk-size and Cloudflare/Wrangler warnings.

## npm 11 cross-check

Using the same npm-10-generated lockfile after deleting only disposable `node_modules`:

- Clean `npm ci` under npm `11.17.0`: **PASS**, `531` packages installed and `532` audited
- Standard production build: **PASS**
- Amplify-equivalent build: **PASS**
- Tracked-file drift from npm 11: **NONE**

The worktree was returned to the authoritative Node `22.18.0` / npm `10.9.3` install after the
cross-check, and npm 10 clean install passed again.

## Release-behavior coverage

The full HR suite confirms no product behavior changed, including:

- Trust Invitation omitted defaults and explicit empty-list semantics
- inactive historical-role preservation, active role change, and explicit role clear
- employee lifecycle
- canonical Court source/remarks and report screen/print mapping
- Team invitation acceptance and password reset routes
- People and verification detail routing
- authentication/session/bootstrap and SSR routing coverage

## A-X result

- **A. Starting SHA:** `bf49869cbcf9631f530839fbf91da2286a4682e2`
- **B. Certified source SHA:** `6f2bfd6f9aad88e0d0c40c7a82f3fe8531eed824`
- **C. Branch:** `codex/hr-v2-npm10-lockfile-fix`
- **D. Node:** `22.18.0`
- **E. npm 10:** `10.9.3`
- **F. npm 11 cross-check:** `11.17.0` on Node `22.23.3`
- **G. `package.json` changed:** **NO**
- **H. Lockfile diff:** `23` lines (`11+`, `12-`)
- **I. Dependency delta:** one Nitro nested optional/peer lock relationship; no version changes
- **J. `lru-cache@11.5.3`:** present correctly under Nitro
- **K. npm 10 `npm ci`:** **PASS**
- **L. npm 11 `npm ci`:** **PASS**
- **M. Focused XSS:** **19/19 PASS**
- **N. Full HR:** **219/219 PASS**
- **O. TypeScript:** **PASS**
- **P. ESLint:** **PASS**, zero errors
- **Q. Prettier:** **PASS**
- **R. Production builds:** **PASS** under npm 10 and npm 11
- **S. Amplify builds:** **PASS** under npm 10 and npm 11
- **T. TanStack advisory:** **REMEDIATED; NOT PRESENT**
- **U. `git diff --check`:** **PASS**
- **V. Local/remote parity:** recorded after push
- **W. Worktree cleanliness:** recorded after documentation commit and push
- **X. Final status:** **READY_FOR_STAGING_RETRY**

## Decision

**READY_FOR_STAGING_RETRY**

The npm 10 reproducibility blocker is corrected without changing product behavior or declared
dependencies. Deploy this certified source SHA or its documentation-only descendant to the existing
HR Staging lane, then resume authenticated mutation QA. Production remains unchanged.
