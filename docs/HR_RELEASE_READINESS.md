# HR Workspace Release Readiness

## Source of truth

- Frontend repository: `kairo-hr-workspace`
- Validation branch: `codex/hr-workspace-v1-finalization`
- Branch commit validated for staging deployment: `83f547c` (`fix(build): restore Amplify npm 10 lockfile compatibility`)
- Current production frontend commit on Amplify `main`: `999be23` (`fix(hr): remove demo banner from production workspace`)

## Environment targets

- Validation frontend hostname: `https://hr-v1-finalization.d2lt5cu333z82d.amplifyapp.com`
- Validation hosting platform: AWS Amplify `WEB_COMPUTE`
- Validation backend hostname: `https://staging-api.kairoid.com`
- Production frontend hostname: `https://hr.kairoid.com`
- Production backend hostname: `https://api.kairoid.com`

## Validation results

### Local process and environment audit

- No stale Vite, Vitest, TypeScript, ESLint, or Nitro worker processes were running for this repository.
- Node version in local repo: `v26.4.0`
- npm version in local repo: `11.17.0`
- Open-file limit: `1048575`
- Temp directory health: healthy with available disk space.

### Clean-room validation

Fresh clone validation completed from `codex/hr-workspace-v1-finalization`.

- `npm ci`: passed
- `npm run typecheck`: passed
- `npm test`: passed (`65/65`)
- `VITE_APP_ENV=production VITE_ADMIN_DEMO_MODE=false VITE_API_BASE_URL=https://staging-api.kairoid.com NITRO_PRESET=aws_amplify npm run build`: passed

Repo-wide formatting backlog remains pre-existing and unchanged.

- `npm run lint`: fails on existing Prettier formatting violations across tracked source files
- `npx prettier --check .`: fails on existing formatting backlog in 21 files

### Route and contract checks

- `/onboarding` correctly hands off to `/app/setup`
- `/app/setup` is the single owner of organization setup persistence
- Employment verification search sends backend `search` query params
- Reviewer reassignment uses `organization_member_public_id`
- No stale Supabase imports remain in tracked runtime source
- No duplicate `* 2.ts` / `* 2.tsx` files remain

### Staging deployment

- Created Amplify branch environment: `codex/hr-workspace-v1-finalization`
- Amplify display name: `hr-v1-finalization`
- Amplify stage: `BETA`
- Branch environment variables:
  - `VITE_API_BASE_URL=https://staging-api.kairoid.com`
  - `VITE_MARKETING_WEBSITE_URL=https://kairoid.com`
- Initial staging deploy failed because Amplify npm `10.9.3` rejected the lockfile.
- Fixed with commit `83f547c` by restoring the missing `node_modules/nitro/node_modules/lru-cache@11.5.2` lockfile entry.
- Redeployed successfully on Sunday, August 2, 2026.

## Browser validation status

### Confirmed working

- Staging frontend root loads successfully at `https://hr-v1-finalization.d2lt5cu333z82d.amplifyapp.com`
- Public login page renders
- Public signup page renders
- Hiring team signup form fields, selects, and submit controls render correctly

### Blocked flows

Authenticated acceptance is currently blocked before OTP because browser requests from the HR frontend origin cannot reach the staging backend.

Confirmed failure:

- Browser submit on `/signup` shows toast: `Failed to fetch`
- Direct API probe to `POST /api/v1/auth/organization/signup/start` succeeds from CLI with the same payload
- Staging API CORS preflight rejects the staging frontend origin:
  - `Origin: https://hr-v1-finalization.d2lt5cu333z82d.amplifyapp.com`
  - Response: `HTTP/2 400`
  - Body: `Disallowed CORS origin`
- Staging API also rejects `Origin: https://hr.kairoid.com`

Because of that CORS restriction, the following browser validations could not proceed on staging:

- Organization signup completion
- Email OTP verification
- Login/logout/session recovery
- Organization onboarding
- Workspace bootstrap
- Dashboard
- People
- Trust Invitations
- Employment Verification
- Notifications
- Team
- Settings

## Accepted limitations

- Signup draft persistence still depends on backend continuation after email verification
- Trust invitation purpose/type narrowing remains client-side until backend filtering support exists

## Remaining blockers

### Blocking

- Staging/API: `staging-api.kairoid.com` does not allow any HR frontend origin in CORS, including both the dedicated Amplify validation hostname and `https://hr.kairoid.com`

### Non-blocking technical debt

- Existing repo-wide ESLint/Prettier formatting backlog remains and is unrelated to the lockfile fix or staging deployment

## Production confirmation

- Production frontend `https://hr.kairoid.com` was not modified during this validation recovery
- Production DNS was not changed
- Production backend was not modified
- Release acceptance was not executed against production
