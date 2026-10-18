# HR V2 Contract Audit

Audit date: 2026-10-18
Frontend baseline: `dfedcb10113d11cee360bfa86762b5205c3fa3b6` (`origin/main`)
Production baseline: `dfedcb10113d11cee360bfa86762b5205c3fa3b6`
Lineage: exact production lineage
Audit boundary: frontend implementation only; backend and production were not changed.

## Classification

| #   | Requirement                    | Classification                | Frontend status                               | Backend support                                                                             | Implementation status                                                       | Blocker / next action                                                       |
| --- | ------------------------------ | ----------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Update employee to Ex-employee | B for display; D for mutation | People already maps `former_employee`         | Roster import can set `employment_status`; no person/roster profile update endpoint         | Former Employee is displayed from authoritative registry state              | Add authorized person employment-status mutation; preserve history          |
| 2   | Require Last Working Day       | B for display; D for mutation | No edit control existed                       | Roster profile returns `exit_date`; no update endpoint                                      | Last Working Day is displayed for former employees when supplied            | Backend mutation must atomically require status + last working day          |
| 3   | Verification Report            | C                             | No HR report route existed                    | Person, verification detail, timeline, and evidence endpoints exist                         | Dedicated data-driven viewer and printable V1 report added                  | Structured result fields remain limited by each check contract              |
| 4   | Four Person tabs               | A                             | Six tabs existed                              | No backend change required                                                                  | Exactly Summary, Reference Checks, Shared Evidence, Internal Notes          | Complete                                                                    |
| 5   | Remove global Invite Candidate | A                             | Header CTA and `N` shortcut existed           | No backend change required                                                                  | Removed from shell; People and Trust Invitations remain                     | Complete                                                                    |
| 6   | Improve invite flow            | B                             | Message was blank/optional; field was Purpose | Trust Invitation supports `purpose`, `message`, requested checks                            | Role selector plus editable professional default message added              | Add an explicit backend `role` field later if role and purpose diverge      |
| 7   | Organization logo              | D                             | Settings showed truthful unavailable state    | No logo field, upload, replace, or delete contract                                          | No deceptive control added                                                  | Add storage-backed logo API and safe URL abstraction                        |
| 8   | Verification Preferences       | D                             | Settings showed truthful unavailable state    | `verification_capabilities` describes organization capabilities, not default ordered checks | No persistence was inferred or repurposed                                   | Add explicit organization default-check policy contract                     |
| 9   | Role-wise counts               | B                             | Not shown                                     | Authorized roster employee list includes `designation`                                      | Counts derived from complete backend roster data for Owner/Admin            | Consider aggregate endpoint only if roster scale requires it                |
| 10  | Create New Role                | D                             | No persistent role UI                         | No organization role entity or CRUD                                                         | No fake role control added                                                  | `BACKEND_ROLE_ENTITY_REQUIRED`                                              |
| 11  | Role instead of Purpose        | B                             | Purpose was primary label                     | Backend still persists free-text `purpose`                                                  | UI uses Role and serializes it unchanged to `purpose`                       | Migrate to explicit role field only with backward-compatible backend change |
| 12  | Department in People           | B                             | Not shown                                     | Authorized roster employee list includes `department`                                       | Directory and Summary display authoritative roster department               | Non-manager users remain blank because roster endpoint is manager-only      |
| 13  | Team invitation delivery       | D                             | UI claimed sent/resent                        | Create/resend only persist/refresh invitation records; no dispatch or token generation      | UI now says created/validity refreshed and discloses no email delivery      | Backend must generate acceptance link/token and dispatch/track email        |
| 14  | Sidebar bottom section         | A                             | Sidebar and page shared viewport scrolling    | No backend change required                                                                  | Viewport shell, independent navigation/main scrolling, pinned account block | Complete; browser viewport QA still recommended                             |

## Current Contracts Used

- `GET /api/v1/organizations/{org_public_id}/people/{person_public_id}`
- `GET /api/v1/organizations/{org_public_id}/roster/employees`
- `GET /api/v1/verification-requests/{request_public_id}`
- `GET /api/v1/verification-requests/{request_public_id}/timeline`
- `GET /api/v1/verification-requests/{request_public_id}/evidence`
- `POST /api/v1/organizations/{org_public_id}/trust-invitations`
- `POST /api/v1/organizations/{org_public_id}/invitations`
- `POST /api/v1/organizations/{org_public_id}/invitations/{invitation_public_id}/resend`

## Report Contract Findings

The report uses one canonical frontend model. It combines organization-person identity and consented Passport claims with each linked verification request, timeline, and authorized evidence record.

Supported truthfully now:

- Interim and Final state based on terminal backend request states.
- Confirmed, Details matched, Discrepancy, Pending, Awaiting response, Unable to verify, and Rejected outcomes.
- Employment declared fields and education declared fields where present.
- Safe evidence IDs, filenames, status, and dates without raw storage paths.
- Trust Score only when explicitly shared as a Passport claim.
- HR Review Required for pending, discrepant, rejected, or unable outcomes.
- Privacy masking for email and phone.
- Print-to-PDF from the same model and report DOM used by the viewer.

Partial or backend-dependent:

- Structured employer-confirmed values are only displayed when returned in evidence values.
- Structured reference relationship, strengths, development areas, rehire response, and comments are not present in the organization People/report contract.
- Address and court-search request types/results are not canonical verification request fields; they are omitted rather than implied.
- Identity declared-versus-document fields depend on structured evidence values.
- Trust Score is not available unless the Candidate has shared it with the organization.

## Permissions

- Person, report, evidence, and notes retain the existing `modify_person` permission boundary.
- Roster role/department/employee metadata is requested only for Owner/Admin memberships.
- Invitations retain `invite_candidate`.
- Team actions retain `manage_team`; ownership transfer remains dedicated.
- Unsupported logo, role CRUD, status mutation, and verification policy controls are not exposed.

## Exact Backend Dependencies

1. Authorized organization-person employment profile update endpoint for status and last working day, with atomic validation and history preservation.
2. Organization logo upload/read/replace/delete contract with safe URLs and file validation.
3. Organization verification-default policy contract separate from `verification_capabilities`.
4. Organization role entity and CRUD if custom roles are required.
5. Team invitation token/link generation, transactional email dispatch, delivery state, and acceptance path.
6. Structured report result fields for employer-confirmed, identity-document, education-confirmed, reference response, address, and court-search data.
