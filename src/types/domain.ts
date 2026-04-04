/**
 * Composite business types used across the application.
 * These represent the shapes of data after joins, not raw table rows.
 * Raw table types come from Supabase generated types (types/database.ts).
 */

import type {
  CaseStatus,
  CaseOutcome,
  CasePriority,
  CheckType,
  CheckStatus,
  CheckOutcome,
  ActivityType,
  DocumentType,
  DocumentStatus,
  ReferenceType,
  ReferenceStatus,
  InternalRole,
  TaskStatus,
  TaskPriority,
  ReportStatus,
  RtwCheckMethod,
  RtwStatus,
  DbsStatus,
} from './enums';

// ============================================================
// Case domain types
// ============================================================

export interface CaseSummary {
  id: string;
  case_reference: string;
  status: CaseStatus;
  outcome: CaseOutcome | null;
  priority: CasePriority;
  created_at: string;
  completed_at: string | null;
  // Joined fields
  candidate_name: string;
  candidate_email: string;
  client_name: string;
  package_name: string;
  assigned_to_name: string | null;
  check_count: number;
  completed_check_count: number;
}

export interface CaseDetail extends CaseSummary {
  organisation_id: string;
  client_id: string;
  candidate_id: string;
  package_id: string;
  assigned_to: string | null;
  created_by: string;
  sla_deadline: string | null;
  notes: string | null;
  updated_at: string;
  // Nested relations
  checks: CaseCheckDetail[];
  candidate: CandidateSummary;
  status_history: StatusHistoryEntry[];
}

export interface CaseCheckDetail {
  id: string;
  case_id: string;
  check_type: CheckType;
  status: CheckStatus;
  outcome: CheckOutcome | null;
  is_required: boolean;
  notes: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusHistoryEntry {
  id: string;
  old_status: string;
  new_status: string;
  changed_by: string;
  changed_by_name: string | null;
  notes: string | null;
  created_at: string;
}

// ============================================================
// Candidate domain types
// ============================================================

export interface CandidateSummary {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  has_submitted: boolean;
  submitted_at: string | null;
  created_at: string;
}

export interface CandidateDetail extends CandidateSummary {
  organisation_id: string;
  auth_user_id: string | null;
  national_insurance_number: string | null;
  current_address: string | null;
  updated_at: string;
  // Nested
  addresses: AddressEntry[];
  activities: ActivityEntry[];
  declarations: CandidateDeclarations | null;
  documents: DocumentEntry[];
  referees: RefereeEntry[];
}

export interface AddressEntry {
  id: string;
  candidate_id: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  county: string | null;
  postcode: string;
  country: string;
  date_from: string;
  date_to: string | null;
  is_current: boolean;
  created_at: string;
}

export interface ActivityEntry {
  id: string;
  candidate_id: string;
  activity_type: ActivityType;
  organisation_name: string | null;
  job_title: string | null;
  description: string | null;
  date_from: string;
  date_to: string | null;
  is_current: boolean;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
}

export interface CandidateDeclarations {
  id: string;
  candidate_id: string;
  has_criminal_record: boolean;
  criminal_details: string | null;
  has_ccjs_or_bankruptcy: boolean;
  financial_details: string | null;
  has_health_conditions: boolean;
  health_details: string | null;
  declaration_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentEntry {
  id: string;
  case_id: string;
  candidate_id: string | null;
  document_type: DocumentType;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: DocumentStatus;
  uploaded_by: string;
  reviewed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface RefereeEntry {
  id: string;
  candidate_id: string;
  reference_type: ReferenceType;
  referee_name: string;
  referee_email: string;
  referee_phone: string | null;
  organisation_name: string | null;
  job_title: string | null;
  relationship: string | null;
  date_from: string;
  date_to: string | null;
  created_at: string;
}

// ============================================================
// Client domain types
// ============================================================

export interface ClientSummary {
  id: string;
  organisation_id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  is_active: boolean;
  created_at: string;
  // Aggregates
  total_cases: number;
  active_cases: number;
  user_count: number;
}

export interface ClientDetail extends ClientSummary {
  contact_phone: string | null;
  address: string | null;
  notes: string | null;
  updated_at: string;
  // Nested
  users: ClientUserEntry[];
  packages: ScreeningPackageEntry[];
}

export interface ClientUserEntry {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  last_sign_in_at: string | null;
  created_at: string;
}

// ============================================================
// Screening package types
// ============================================================

export interface ScreeningPackageEntry {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  check_types: CheckType[];
  check_count: number;
  created_at: string;
}

// ============================================================
// Reference types
// ============================================================

export interface ReferenceRequestSummary {
  id: string;
  case_check_id: string;
  referee_id: string;
  status: ReferenceStatus;
  referee_name: string;
  referee_email: string;
  organisation_name: string | null;
  reference_type: ReferenceType;
  sent_at: string | null;
  reminder_count: number;
  last_reminder_at: string | null;
  received_at: string | null;
  created_at: string;
}

// ============================================================
// Task types
// ============================================================

export interface TaskEntry {
  id: string;
  case_id: string;
  case_reference: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string;
  assigned_to_name: string;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

// ============================================================
// Report types
// ============================================================

export interface ReportEntry {
  id: string;
  case_id: string;
  case_reference: string;
  report_type: string;
  status: ReportStatus;
  file_path: string | null;
  generated_by: string;
  generated_by_name: string;
  created_at: string;
}

// ============================================================
// Audit log types
// ============================================================

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  organisation_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// Right to Work types
// ============================================================

export interface RtwCheckSummary {
  id: string;
  case_id: string;
  check_id: string;
  candidate_id: string;
  organisation_id: string;
  check_method: RtwCheckMethod;
  status: RtwStatus;
  document_type: string | null;
  document_reference: string | null;
  share_code: string | null;
  expiry_date: string | null;
  has_time_limit: boolean;
  time_limit_end: string | null;
  verified: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RtwCheckDetail extends RtwCheckSummary {
  // Joined fields
  candidate_name: string;
  reviewer_name: string | null;
}

// ============================================================
// DBS Check types
// ============================================================

export interface DbsCheckSummary {
  id: string;
  case_id: string;
  check_id: string;
  candidate_id: string;
  organisation_id: string;
  dbs_type: string;
  status: DbsStatus;
  application_reference: string | null;
  certificate_number: string | null;
  certificate_date: string | null;
  has_adverse: boolean;
  adverse_details: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbsCheckDetail extends DbsCheckSummary {
  candidate_name: string;
  reviewer_name: string | null;
}

// ============================================================
// Dashboard aggregate types
// ============================================================

export interface InternalDashboardStats {
  activeCases: number;
  awaitingCandidate: number;
  underReview: number;
  completedThisMonth: number;
  overdueTasks: number;
  pendingReferences: number;
}

export interface ClientDashboardStats {
  totalCases: number;
  inProgress: number;
  completed: number;
  averageCompletionDays: number | null;
}

// ============================================================
// Pagination types
// ============================================================

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}
