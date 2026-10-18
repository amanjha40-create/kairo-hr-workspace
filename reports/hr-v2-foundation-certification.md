# HR V2 Foundation Certification

Certification date: 2026-10-18
Branch: `codex/hr-v2-foundation`
Starting source: `dfedcb10113d11cee360bfa86762b5205c3fa3b6`
Implementation source: `83e578c41c88f7254168283951f9959467dcf870`
Production deployment: not performed

## Implemented

- Viewport-height application shell with independently scrolling main content and navigation.
- Pinned bottom-left account and organization controls.
- Removed global Invite Candidate header action and keyboard shortcut.
- Preserved People and Trust Invitations entry points.
- Person Profile now has exactly four tabs: Summary, Reference Checks, Shared Evidence, Internal Notes.
- Summary combines identity, authorized roster employment data, verification metrics, Passport preview, recent activity, and report actions.
- People directory displays roster-backed Role, Department, Status, and role counts for authorized Owner/Admin users.
- Former Employee and Last Working Day display when authoritative registry/roster data exists.
- Dedicated KairoID Verification Report viewer with loading, error, permission, retry, and empty-report handling.
- One canonical report adapter supplies the responsive viewer and browser print/PDF flow.
- Candidate invitation UI uses Role as the primary label, preserves backend `purpose`, and supplies an editable professional default message.
- Team invitation UI no longer claims an email was delivered when the backend only persisted the invitation.

## Sample Report Parity

The attached three-page `KairoID Sample Report.pdf` was inspected in full. The web report follows its core information hierarchy and semantics:

- KairoID identity, confidentiality marking, report title, update date, candidate header, report state, and safe report identifier.
- Prominent Trust Score area that remains unavailable when not shared.
- Executive outcome cards with distinct matched/confirmed/discrepancy/pending treatment.
- HR Review Required block driven by real outcomes.
- Declared-versus-verified detail tables when structured values exist.
- Evidence IDs and status without raw storage paths.
- Open items and the rule that reference non-response is not adverse.
- Footer language explaining scope, missing information, and privacy.

The viewer intentionally omits report sections that were not ordered or cannot be supported by the current contract. It does not hardcode sample data.

## PDF Architecture

V1 uses a print-optimized report generated from the same canonical `VerificationReportModel` and React report tree as the on-screen viewer. Browser Print / Save as PDF is the download mechanism. No second report mapper or backend PDF service was introduced.

## Focused Coverage

- Global Invite Candidate removal and pinned shell classes.
- Four-tab Person Profile architecture.
- Role, department, former-employee, and last-working-day rendering.
- Candidate Role payload compatibility and editable default message.
- Team invitation delivery truthfulness.
- Contact masking and safe evidence projection.
- Confirmed, discrepancy, pending/reference-awaiting outcomes.
- Interim and Final report state.
- HR review conditions and omission of unordered checks.

## Remaining Dependencies

See `reports/hr-v2-contract-audit.md`. The primary blockers are employee status mutation, logo storage, verification defaults, persistent custom roles, Team invitation email delivery, and richer structured report-result fields.

## Validation

- Node 22 full suite: 32 files and 143 tests passed.
- TypeScript: passed with no errors.
- ESLint: zero errors; six unchanged Fast Refresh warnings remain from the production baseline.
- Changed-file ESLint: passed with no warnings or errors.
- Prettier and `git diff --check`: passed.
- `NITRO_PRESET=aws_amplify npm run build`: passed and emitted the report client and SSR chunks.
- Direct requests against the generated Amplify compute server returned HTTP 200 for `/app/reports/person-test` and `/app/people/person-test`.
- Authenticated browser visual QA remains a pre-promotion check; no production deployment was attempted.

## Certification Boundary

- Backend source changed: no.
- Production backend or DB changed: no.
- HR production deployed: no.
- Existing production artifact remains unchanged.
- Authenticated browser visual QA is required before any future staging or production promotion.
