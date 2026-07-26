export type VerificationStatus =
  | "Pending"
  | "Under Review"
  | "Documents Requested"
  | "Verified"
  | "Rejected";

export type Relationship =
  | "Candidate"
  | "Future Employee"
  | "Employee"
  | "Former Employee"
  | "Contractor";

export type InvitationStatus =
  | "Not Invited"
  | "Draft"
  | "Sent"
  | "Opened"
  | "Accepted"
  | "Expired"
  | "Cancelled";

export type WorkspaceVerificationStatus =
  | "Not Started"
  | "Waiting for Candidate"
  | "In Verification"
  | "Clarification Required"
  | "Completed"
  | "Unable to Verify"
  | "Cancelled";

export type SharedPassportStatus =
  | "Not Shared"
  | "Active"
  | "Expiring Soon"
  | "Expired"
  | "Access Revoked";

export type ClaimStatus =
  | "Candidate-provided"
  | "Verification pending"
  | "Verified"
  | "Unable to verify";
