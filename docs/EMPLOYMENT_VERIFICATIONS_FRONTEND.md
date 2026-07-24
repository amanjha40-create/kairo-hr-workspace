# Employment Verifications Frontend Integration

This document describes the HR Workspace frontend integration for Employment Verifications as of Friday, July 24, 2026.

## Scope

The Employment Verification experience is now driven by the backend contract under:

- `GET /api/v1/organizations/{organization_public_id}/verification-requests`
- `GET /api/v1/verification-requests/{verification_request_public_id}`
- `GET /api/v1/verification-requests/{verification_request_public_id}/timeline`
- `GET /api/v1/verification-requests/{verification_request_public_id}/evidence`
- `PUT /api/v1/verification-requests/{verification_request_public_id}/reviewer`
- `PUT /api/v1/verification-requests/{verification_request_public_id}/internal-note`
- `POST /api/v1/verification-requests/{verification_request_public_id}/request-information`
- `POST /api/v1/verification-requests/{verification_request_public_id}/verify`
- `POST /api/v1/verification-requests/{verification_request_public_id}/reject`
- `POST /api/v1/verification-requests/{verification_request_public_id}/cancel`
- `GET /api/v1/organizations/{organization_public_id}/members`

## Frontend Architecture

The frontend uses:

- `src/lib/api/verification-requests.ts` for authenticated API access
- `src/lib/api/organization-members.ts` for reviewer options
- `src/lib/queries/verification-requests.ts` for TanStack Query hooks and mutation invalidation
- `src/lib/employment-verifications.ts` for UI mapping, status normalization, and backend error handling

## User-Facing Coverage

The following views are backend-driven:

- Overview Employment Verification widgets
- Employment Verification inbox
- Employment Verification detail
- Timeline
- Evidence list and download links
- Reviewer assignment
- Internal notes
- Clarification
- Verify
- Reject
- Cancel

## State Handling

Every Employment Verification page supports:

- loading
- empty
- retry
- permission denied
- offline/network failure
- backend error

Errors are normalized through `getVerificationErrorMessage(...)`.

## Reviewer Assignment

The frontend sends:

```json
{
  "organization_member_public_id": "member_public_id"
}
```

The detail response still returns reviewer identity keyed by user. The frontend resolves the currently assigned reviewer against organization members by email so the assignment control stays aligned with the approved public-id contract.

## Query Invalidation

Verification mutations invalidate:

- all verification list queries
- verification detail
- verification timeline
- verification evidence

This keeps the inbox, overview widgets, and detail page synchronized after any mutation.

## Removed Mock Ownership

Employment Verification mock ownership has been removed from:

- `src/lib/dashboard-context.tsx`
- `src/lib/inbound-verifications.ts`
- verification routes that previously depended on local mutation state

## Notes

- The frontend does not invent unsupported verification actions.
- The old mock-only discrepancy and unable-to-verify branches are replaced by backend-supported `reject` and `cancel`.
- The frontend renders only backend-owned organization and target metadata.
