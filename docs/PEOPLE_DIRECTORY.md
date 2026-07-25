# People Directory

The HR Workspace People directory is now backed by the Organization People Registry.

## Backend endpoints

- `GET /api/v1/organizations/{org_public_id}/people`
- `GET /api/v1/organizations/{org_public_id}/people/{person_public_id}`
- `POST /api/v1/organizations/{org_public_id}/people/{person_public_id}/notes`
- `PATCH /api/v1/organizations/{org_public_id}/people/{person_public_id}/notes/{note_public_id}`
- `DELETE /api/v1/organizations/{org_public_id}/people/{person_public_id}/notes/{note_public_id}`

## Frontend coverage

- People list uses backend search and filters for relationship, invitation status, verification status, passport status, added by, and created-after windows.
- Overview People counts are derived from the People Registry summary instead of dashboard mock state.
- Person detail uses backend-owned passport preview, employment verifications, shared evidence, activity, and internal notes.
- Internal note create, edit, and delete actions invalidate People directory queries through React Query.

## Preserved UI states

- Loading
- Empty
- Retry
- Error
- Permission denied
- Not shared
- Expired
- Revoked

## Current limitations

- The approved UI does not include People list pagination controls, so the frontend query layer eagerly resolves all People pages behind the scenes to keep the current experience unchanged.
- The People Registry provides shared Trust Passport state and claims, but it does not expose a dedicated passport-open endpoint. The frontend keeps the existing passport surfaces within the person detail view.
- The People Registry does not expose a reminder action, so the People row reminder control remains non-actionable until a dedicated backend contract exists.
