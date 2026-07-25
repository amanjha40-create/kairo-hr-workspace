# Trust Invitations

This document describes the HR Workspace frontend integration for backend-owned Trust Invitations.

## Backend Endpoints Used

- `GET /api/v1/organizations/{org_public_id}/trust-invitations`
- `GET /api/v1/organizations/{org_public_id}/trust-invitations/summary`
- `POST /api/v1/organizations/{org_public_id}/trust-invitations`
- `GET /api/v1/trust-invitations/by-id/{trust_invitation_public_id}`
- `POST /api/v1/trust-invitations/{trust_invitation_public_id}/send`
- `POST /api/v1/trust-invitations/{trust_invitation_public_id}/resend`
- `POST /api/v1/trust-invitations/{trust_invitation_public_id}/cancel`
- `DELETE /api/v1/trust-invitations/{trust_invitation_public_id}`
- `GET /api/v1/workspace/bootstrap`

## Frontend Architecture

- `src/lib/api/trust-invitations.ts` owns the authenticated API calls and backend DTOs.
- `src/lib/queries/trust-invitations.ts` owns stable query keys, list/detail/summary queries, and lifecycle mutations.
- `src/lib/trust-invitations.ts` maps backend DTOs into the existing UI model used by the HR Workspace routes.
- `src/routes/app.invitations.tsx` is now backend-driven for list, filtering, counts, copy-link fetch, and lifecycle actions.
- `src/routes/app.invitations.$id.tsx` is now backend-driven for detail, timeline, status rendering, and lifecycle actions.
- `src/components/app/InviteEmployeeModal.tsx` now creates drafts and sent invitations through the backend contract.
- `src/lib/dashboard-context.tsx` no longer owns Trust Invitation records or Trust Invitation mutations.

## Lifecycle States

Backend statuses:

- `draft`
- `pending`
- `accepted`
- `cancelled`
- `expired`

Backend delivery states:

- `queued`
- `delivered`
- `opened`
- `failed`

HR Workspace display mapping:

- `draft` -> `Draft`
- `pending` + `opened` delivery -> `Opened`
- `pending` + any other delivery state -> `Sent`
- `accepted` -> `Accepted`
- `cancelled` -> `Cancelled`
- `expired` -> `Expired`

## Field Mapping

Backend -> frontend:

- `public_id` -> invitation route id
- `subject_name` -> candidate name
- `subject_email` -> candidate email
- `subject_phone` -> candidate phone
- `purpose` -> purpose
- `requested_verification_types` -> requested verification badges
- `message` -> candidate message
- `delivery_state` -> delivery badge text
- `created_at` -> created date
- `sent_at` -> sent date
- `expires_at` -> expiry date
- `accepted_at` -> accepted date
- `cancelled_at` -> cancelled date
- `related_verification_request_public_id` -> related verification reference text
- `invitation_url` -> canonical copyable link
- `timeline` -> detail activity feed

## Permission Rules

- Page access still depends on backend-derived `modify_invitation` permission from workspace bootstrap.
- Invitation creation depends on backend-derived `invite_candidate` permission.
- Send, resend, cancel, and delete actions are shown only when the current backend permission state allows them.
- Backend authorization remains authoritative for all mutations; frontend permission checks are advisory UI gating.

## Query Invalidation Strategy

All Trust Invitation mutations invalidate:

- Trust Invitation list queries
- Trust Invitation summary queries
- Trust Invitation detail queries for the mutated invitation
- workspace bootstrap query

This keeps the invitation list, detail route, overview KPIs, and permission-sensitive state consistent after refresh.

## Unsupported UI Actions

The legacy frontend exposed actions and fields that are not part of the current backend contract. These are no longer simulated.

- Expired invitation resend is intentionally unsupported because the backend rejects expired invitations as non-actionable.
- Internal reference is not persisted by the backend Trust Invitation contract.
- Department is not persisted by the backend Trust Invitation contract.
- Auto-reminder scheduling is not persisted by the backend Trust Invitation contract.

## Known Limitations

- Purpose and verification-type filters are narrowed in the frontend after loading the backend-sorted list because the current backend list contract does not expose dedicated filters for those fields.
- Route-level loading, empty, error, permission, create, detail, and query invalidation behaviors are covered by the focused Vitest suite added for Command 3; full authenticated refresh and re-login persistence still require environment validation against a deployed backend.
- Full staging validation for the deployed HR Workspace was not performed in this implementation pass and is expected to run separately.

## Staging Validation

Pending separate validation against the HR Workspace staging hostname and a real authenticated HR organization.

## Future Notification Integration

- The frontend currently invalidates workspace bootstrap after Trust Invitation mutations so later notification-center work can refresh any invitation-related notification surfaces without changing the Trust Invitation routes again.
