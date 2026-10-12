# HR Employment References V1 Certification

## 1. HR Starting SHA

- Repository: `kairo-hr-workspace`
- Starting branch: `codex/hr-workspace-v1-finalization`
- Starting SHA: `8b07f191d6dfed445a43a688b3eb98ec1fb3c3c3`
- Isolated implementation branch: `codex/hr-employment-references-v1`

## 2. HR Final SHA

- Runtime implementation SHA: `f0d00f2176298953123a77a92045de2ec92297e9`
- This SHA was fast-forwarded to `codex/hr-workspace-v1-finalization` and deployed by Amplify job `10`.
- The documentation commit that contains this report is intentionally separate and does not change runtime behavior.

## 3. Backend Handoff Used

- Certified backend SHA: `e3a034a08d48fb3a39f83f4d2f8c3bccc435bfee`
- Certified staging API: API239
- Certified database head: 087
- Live health reported the exact certified backend SHA before implementation.
- The named files `reports/employment-references-v1-hr-handoff.md` and
  `reports/employment-references-v1.md` were not present in the certified backend commit, fetched
  backend refs, or sibling clients. The implementation therefore used the certified OpenAPI,
  schemas, routes, service behavior, and backend tests as the authoritative contract. No endpoint,
  DTO field, enum, or state transition was invented.

Consumed public endpoints:

- `GET /api/v1/public/employer-verifications/{token}`
- `POST /api/v1/public/employer-verifications/{token}/verify`
- `POST /api/v1/public/employer-verifications/{token}/reject`
- `POST /api/v1/public/employer-verifications/{token}/request-clarification`
- `POST /api/v1/public/employer-verifications/{token}/references/manager-validation`

The frontend does not call
`POST /api/v1/public/employer-verifications/{token}/references/reporting-manager/invite`.

## 4. Magic Link Structure

The existing backend-generated link shape is preserved at
`/employer-verification/{token}`. The TanStack Start public route is outside the authenticated HR
shell, requires no account, supports direct SSR/deep-link loading, and follows this sequence:

1. Employment facts
2. HR reference
3. Reporting manager validation when nominated
4. Contact confirmation or correction when the relationship is confirmed
5. Concise review
6. Backend submission and separated outcome summary

Links without a reporting-manager nomination retain the employment plus HR-reference path and do
not render an empty manager step.

## 5. HR Reference

The same magic-link flow sends the backend-supported `hr_reference` object with:

- `status`: `completed` or `cannot_confirm`
- `eligible_for_rehire`: `yes`, `no`, or `prefer_not_to_answer`
- Optional factual comments, limited to 2,000 characters

The UI explicitly frames this as a concise factual reference, not a performance questionnaire.

## 6. Manager Validation

Candidate-provided manager details are displayed only when the workspace includes a nomination.
The UI maps every certified relationship enum to plain language and sends the backend nomination
ID unchanged. Negative relationship decisions use backend-owned `hr_cannot_confirm` provenance and
do not prevent factual employment confirmation.

For a renewed nomination on an already confirmed employment, the frontend uses the dedicated
manager-validation endpoint rather than replaying the idempotent employment verify action.

## 7. Contact Validation and Correction

Confirmed and former-manager relationships expose these certified choices:

- Confirm candidate-provided contact
- Correct permitted contact details
- Confirm the relationship without sharing contact information

Corrections support name, designation, work email, and optional E.164 phone. Values are trimmed,
emails are normalized to lowercase, common phone separators are removed, and either email or phone
is required for a correction. Raw API validation payloads are never shown.

## 8. Former-Manager Handling

`left_organization` is treated as a valid relationship confirmation. HR may confirm or correct a
permitted contact, or withhold contact while preserving the valid former-manager relationship.
The frontend does not invalidate employment or create invitation eligibility locally.

## 9. Review and Submit

The review page separately summarizes employment confirmation, HR-reference status, reporting
manager decision, and contact decision. A clear notice states that submission records employer-side
validation only and does not send a manager invitation.

Factual corrections use the certified clarification or discrepancy endpoints. The backend contract
does not provide editable corrected employment fields, so the frontend does not fabricate them.

## 10. Backend-State Rendering

The result view keeps four independent outcomes:

- Employment
- HR Reference
- Reporting Manager
- Manager Reference

Manager-reference labels are rendered from backend status, including `ready_to_invite`,
`invitation_sent`, `completed`, `declined`, `needs_review`, and `expired`. A confirmed employer
response that enters `pending_admin_quality_review` is shown as awaiting KairoID quality review,
not as final verification.

## 11. Privacy

- Public calls omit authentication credentials and use `cache: no-store`.
- Requests use `credentials: omit` and `referrerPolicy: no-referrer`.
- The route declares `noindex, nofollow, noarchive` and `no-referrer` metadata.
- Tokens are URL-encoded for requests and are not rendered, logged, or persisted.
- Internal IDs, raw storage details, fraud flags, and raw backend errors are not displayed.
- The page reminds recipients not to forward the private link.

## 12. Accessibility

- Semantic headings, definition lists, fieldsets, legends, native radios, and labelled controls are
  used throughout.
- Validation errors use `role=alert`, `aria-invalid`, and `aria-describedby` associations.
- Progress uses an accessible navigation landmark and `aria-current=step`.
- Loading uses `role=status`.
- The completion view remains understandable without color alone.
- Automated coverage renders the flow at a 375px viewport with 200% root text size and verifies
  labelled controls and navigation remain available.

## 13. Tests

Focused contract and behavior tests cover:

1. Employment only with no manager nomination
2. Manager confirmed with candidate-provided contact
3. Corrected manager contact
4. HR cannot confirm manager
5. Worked at the employer but was not the manager
6. Manager not recognized
7. Former manager
8. HR cannot share contact
9. Invalid corrected email and phone
10. Employment confirmed independently of a negative manager decision
11. Backend manager invitation readiness rendering
12. Expired and revoked/invalid links
13. Already-completed links
14. Responsive mobile presentation
15. Large text and accessible controls

Results:

- Focused route suite: 15/15 passed
- Focused API/helper/UI suites: 23/23 passed
- Full HR suite: 27 files, 127/127 tests passed
- TypeScript: passed with zero errors
- ESLint: zero errors; six unchanged repository Fast Refresh warnings outside this feature
- Prettier: passed
- `git diff --check`: passed
- AWS Amplify staging build: passed

## 14. Staging Deployment

- Amplify app: `d2lt5cu333z82d`
- Branch: `codex/hr-workspace-v1-finalization`
- Display name: `hr-v1-finalization`
- Job: `10`
- Result: `SUCCEED`
- Runtime source SHA: `f0d00f2176298953123a77a92045de2ec92297e9`
- API environment: `https://staging-api.kairoid.com`
- Production was not changed.

## 15. Browser and Mobile QA

Live staging checks used the deployed public route with a deterministic invalid token and performed
no mutation:

- Frontend direct route: HTTP 200
- API response: expected HTTP 404
- Staging origin CORS: allowed
- Safe invalid/revoked message: passed
- `noindex` and `no-referrer` metadata: passed
- Console warnings/errors: none
- 375px viewport: no horizontal overflow
- Amplify SSR direct-load smoke: HTTP 200 with the secure loading shell

Successful, negative, completion, correction, and manager-only mutations were certified with
deterministic frontend tests. No live manager invitation or email was triggered.

## 16. Real-Email Gate Status

Not run by design. This phase does not call the manager-invitation endpoint and sent no real
reporting-manager email. A separately approved controlled staging email test is the next gate.

## 17. Remaining Blocker

No blocker remains for the HR Employment References V1 frontend or staging UI certification. The
controlled real-manager-email gate remains intentionally pending and requires separate approval.
The missing named handoff report should be restored by the backend documentation owner for future
traceability, but the certified API contract was sufficient and no backend correction was required.
