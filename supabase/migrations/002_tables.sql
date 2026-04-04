-- ============================================================
-- MIGRATION 002: TABLE DEFINITIONS
-- ============================================================
-- This migration creates all tables in dependency order.
-- Tables are created so that parent tables exist before
-- foreign key references are made.
-- ============================================================

-- ============================================================
-- SECTION 2.1: ORGANISATIONS & USERS
-- ============================================================

CREATE TABLE organisations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  settings        JSONB DEFAULT '{}',
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE internal_users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  role            internal_role NOT NULL DEFAULT 'case_handler',
  phone           TEXT,
  is_active       BOOLEAN DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  name            TEXT NOT NULL,
  registration_number TEXT,
  address_line_1  TEXT,
  address_line_2  TEXT,
  city            TEXT,
  postcode        TEXT,
  country         TEXT DEFAULT 'GB',
  primary_contact_name  TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  default_package_id UUID,
  sla_days        INTEGER DEFAULT 10,
  contract_start  DATE,
  contract_end    DATE,
  is_active       BOOLEAN DEFAULT true,
  settings        JSONB DEFAULT '{}',
  created_by      UUID REFERENCES internal_users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE client_users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  is_primary      BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- ============================================================
-- SECTION 2.2: SCREENING PACKAGES
-- ============================================================

CREATE TABLE screening_packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  name            TEXT NOT NULL,
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_by      UUID REFERENCES internal_users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE package_checks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id      UUID NOT NULL REFERENCES screening_packages(id) ON DELETE CASCADE,
  check_type      check_type NOT NULL,
  is_mandatory    BOOLEAN DEFAULT true,
  sort_order      INTEGER DEFAULT 0,
  config          JSONB DEFAULT '{}',
  deleted_at      TIMESTAMPTZ,
  UNIQUE(package_id, check_type)
);

-- Add FK from clients.default_package_id now that the table exists
ALTER TABLE clients
  ADD CONSTRAINT clients_default_package_fk
  FOREIGN KEY (default_package_id) REFERENCES screening_packages(id);

-- ============================================================
-- SECTION 2.3: CASES & CANDIDATES
-- ============================================================

CREATE TABLE candidates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    UUID UNIQUE REFERENCES auth.users(id),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  email           TEXT NOT NULL,
  title           TEXT,
  first_name      TEXT NOT NULL,
  middle_names    TEXT,
  last_name       TEXT NOT NULL,
  preferred_name  TEXT,
  date_of_birth   DATE,
  phone           TEXT,
  national_insurance_number TEXT,
  nationality     TEXT,
  place_of_birth  TEXT,
  gender          TEXT,
  has_submitted   BOOLEAN DEFAULT false,
  submitted_at    TIMESTAMPTZ,
  consent_given   BOOLEAN DEFAULT false,
  consent_given_at TIMESTAMPTZ,
  consent_ip      INET,
  portal_token    TEXT UNIQUE,
  portal_token_expires_at TIMESTAMPTZ,
  created_by      UUID REFERENCES internal_users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE cases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  client_id       UUID NOT NULL REFERENCES clients(id),
  candidate_id    UUID NOT NULL REFERENCES candidates(id),
  package_id      UUID NOT NULL REFERENCES screening_packages(id),
  reference_number TEXT NOT NULL UNIQUE,
  status          case_status NOT NULL DEFAULT 'new',
  outcome         case_outcome,
  priority        case_priority NOT NULL DEFAULT 'standard',
  assigned_to     UUID REFERENCES internal_users(id),
  reviewed_by     UUID REFERENCES internal_users(id),
  adjudicated_by  UUID REFERENCES internal_users(id),
  adjudicated_at  TIMESTAMPTZ,
  outcome_notes   TEXT,
  sla_due_date    DATE,
  client_reference TEXT,
  tags            TEXT[] DEFAULT '{}',
  candidate_invited_at  TIMESTAMPTZ,
  candidate_submitted_at TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES internal_users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE case_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  from_status     case_status,
  to_status       case_status NOT NULL,
  changed_by      UUID NOT NULL REFERENCES auth.users(id),
  reason          TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SECTION 2.4: CHECKS
-- ============================================================

CREATE TABLE case_checks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  check_type      check_type NOT NULL,
  status          check_status NOT NULL DEFAULT 'not_started',
  outcome         check_outcome,
  is_mandatory    BOOLEAN DEFAULT true,
  assigned_to     UUID REFERENCES internal_users(id),
  reviewed_by     UUID REFERENCES internal_users(id),
  reviewed_at     TIMESTAMPTZ,
  review_notes    TEXT,
  outcome_notes   TEXT,
  third_party_ref TEXT,
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  config          JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE check_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id        UUID NOT NULL REFERENCES case_checks(id) ON DELETE CASCADE,
  from_status     check_status,
  to_status       check_status NOT NULL,
  changed_by      UUID NOT NULL REFERENCES auth.users(id),
  reason          TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SECTION 2.5: ADDRESS HISTORY
-- ============================================================

CREATE TABLE address_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  address_type    address_type NOT NULL DEFAULT 'residential',
  address_line_1  TEXT NOT NULL,
  address_line_2  TEXT,
  city            TEXT NOT NULL,
  county          TEXT,
  postcode        TEXT NOT NULL,
  country         TEXT NOT NULL DEFAULT 'GB',
  date_from       DATE NOT NULL,
  date_to         DATE,
  is_current      BOOLEAN DEFAULT false,
  sort_order      INTEGER DEFAULT 0,
  verified        BOOLEAN DEFAULT false,
  verified_by     UUID REFERENCES internal_users(id),
  verified_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- ============================================================
-- SECTION 2.6: ACTIVITY HISTORY
-- ============================================================

CREATE TABLE activity_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  activity_type   activity_type NOT NULL,
  title           TEXT NOT NULL,
  organisation    TEXT,
  address_line_1  TEXT,
  address_line_2  TEXT,
  city            TEXT,
  postcode        TEXT,
  country         TEXT DEFAULT 'GB',
  date_from       DATE NOT NULL,
  date_to         DATE,
  is_current      BOOLEAN DEFAULT false,
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  reason_for_leaving TEXT,
  salary          TEXT,
  sort_order      INTEGER DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- ============================================================
-- SECTION 2.7: REFERENCES
-- ============================================================

CREATE TABLE referees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  activity_id     UUID REFERENCES activity_history(id),
  reference_type  reference_type NOT NULL,
  full_name       TEXT NOT NULL,
  job_title       TEXT,
  organisation    TEXT,
  email           TEXT NOT NULL,
  phone           TEXT,
  relationship    TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE reference_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  check_id        UUID NOT NULL REFERENCES case_checks(id) ON DELETE CASCADE,
  referee_id      UUID NOT NULL REFERENCES referees(id),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  token           TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMPTZ NOT NULL,
  status          reference_status NOT NULL DEFAULT 'draft',
  sent_at         TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  reminder_count  INTEGER DEFAULT 0,
  received_at     TIMESTAMPTZ,
  sent_by         UUID REFERENCES internal_users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reference_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL UNIQUE REFERENCES reference_requests(id),
  respondent_name TEXT NOT NULL,
  respondent_email TEXT NOT NULL,
  respondent_job_title TEXT,
  candidate_known     BOOLEAN,
  dates_confirmed     BOOLEAN,
  date_from_confirmed DATE,
  date_to_confirmed   DATE,
  job_title_confirmed TEXT,
  reason_for_leaving  TEXT,
  performance_rating  TEXT,
  conduct_issues      BOOLEAN DEFAULT false,
  conduct_details     TEXT,
  would_reemploy      BOOLEAN,
  additional_comments TEXT,
  has_discrepancies   BOOLEAN DEFAULT false,
  discrepancy_notes   TEXT,
  flagged_by          UUID REFERENCES internal_users(id),
  flagged_at          TIMESTAMPTZ,
  ip_address          INET,
  submitted_at        TIMESTAMPTZ DEFAULT now(),
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SECTION 2.8: RIGHT TO WORK
-- ============================================================

CREATE TABLE right_to_work_checks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  check_id        UUID NOT NULL REFERENCES case_checks(id) ON DELETE CASCADE,
  candidate_id    UUID NOT NULL REFERENCES candidates(id),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  check_method    rtw_check_method NOT NULL,
  status          rtw_status NOT NULL DEFAULT 'not_started',
  document_type   TEXT,
  document_reference TEXT,
  share_code      TEXT,
  expiry_date     DATE,
  has_time_limit  BOOLEAN DEFAULT false,
  time_limit_end  DATE,
  reviewed_by     UUID REFERENCES internal_users(id),
  reviewed_at     TIMESTAMPTZ,
  review_notes    TEXT,
  verified        BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- ============================================================
-- SECTION 2.9: DBS CHECKS
-- ============================================================

CREATE TABLE dbs_checks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  check_id        UUID NOT NULL REFERENCES case_checks(id) ON DELETE CASCADE,
  candidate_id    UUID NOT NULL REFERENCES candidates(id),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  dbs_type        check_type NOT NULL,
  status          dbs_status NOT NULL DEFAULT 'not_started',
  application_reference TEXT,
  certificate_number TEXT,
  certificate_date DATE,
  has_adverse      BOOLEAN DEFAULT false,
  adverse_details  TEXT,
  reviewed_by      UUID REFERENCES internal_users(id),
  reviewed_at      TIMESTAMPTZ,
  review_notes     TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

-- ============================================================
-- SECTION 2.10: DOCUMENTS
-- ============================================================

CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  candidate_id    UUID REFERENCES candidates(id),
  check_id        UUID REFERENCES case_checks(id),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  document_type   document_type NOT NULL,
  status          document_status NOT NULL DEFAULT 'pending_review',
  file_name       TEXT NOT NULL,
  file_size       BIGINT,
  mime_type       TEXT,
  storage_path    TEXT NOT NULL,
  storage_bucket  TEXT NOT NULL DEFAULT 'documents',
  uploaded_by     UUID NOT NULL REFERENCES auth.users(id),
  reviewed_by     UUID REFERENCES internal_users(id),
  reviewed_at     TIMESTAMPTZ,
  review_notes    TEXT,
  expires_at      DATE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- ============================================================
-- SECTION 2.11: NOTES & TASKS
-- ============================================================

CREATE TABLE notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  check_id        UUID REFERENCES case_checks(id),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  content         TEXT NOT NULL,
  is_internal     BOOLEAN DEFAULT true,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  case_id         UUID REFERENCES cases(id),
  check_id        UUID REFERENCES case_checks(id),
  title           TEXT NOT NULL,
  description     TEXT,
  status          task_status NOT NULL DEFAULT 'pending',
  priority        task_priority NOT NULL DEFAULT 'medium',
  assigned_to     UUID REFERENCES internal_users(id),
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  completed_by    UUID REFERENCES internal_users(id),
  created_by      UUID NOT NULL REFERENCES internal_users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- ============================================================
-- SECTION 2.12: DECLARATIONS
-- ============================================================

CREATE TABLE candidate_declarations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  case_id         UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  declaration_type TEXT NOT NULL,
  has_declarations BOOLEAN NOT NULL DEFAULT false,
  details         TEXT,
  declared_at     TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- ============================================================
-- SECTION 2.13: AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisations(id),
  actor_id        UUID REFERENCES auth.users(id),
  actor_email     TEXT NOT NULL,
  actor_role      TEXT NOT NULL,
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID NOT NULL,
  metadata        JSONB DEFAULT '{}',
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SECTION 2.14: REPORTS
-- ============================================================

CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL REFERENCES cases(id),
  organisation_id UUID NOT NULL REFERENCES organisations(id),
  report_type     TEXT NOT NULL DEFAULT 'final_screening',
  status          report_status NOT NULL DEFAULT 'generating',
  storage_path    TEXT,
  storage_bucket  TEXT DEFAULT 'reports',
  file_size       BIGINT,
  generated_by    UUID REFERENCES auth.users(id),
  generated_at    TIMESTAMPTZ,
  version         INTEGER NOT NULL DEFAULT 1,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SECTION 2.15: NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  organisation_id UUID REFERENCES organisations(id),
  title           TEXT NOT NULL,
  body            TEXT,
  link            TEXT,
  is_read         BOOLEAN DEFAULT false,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SECTION 3: INDEXES
-- ============================================================

-- ============================================================
-- FOREIGN KEY INDEXES
-- ============================================================
CREATE INDEX idx_internal_users_org ON internal_users(organisation_id);
CREATE INDEX idx_clients_org ON clients(organisation_id);
CREATE INDEX idx_client_users_client ON client_users(client_id);
CREATE INDEX idx_client_users_org ON client_users(organisation_id);
CREATE INDEX idx_candidates_org ON candidates(organisation_id);
CREATE INDEX idx_candidates_auth_user ON candidates(auth_user_id);
CREATE INDEX idx_cases_org ON cases(organisation_id);
CREATE INDEX idx_cases_client ON cases(client_id);
CREATE INDEX idx_cases_candidate ON cases(candidate_id);
CREATE INDEX idx_cases_assigned ON cases(assigned_to);
CREATE INDEX idx_cases_package ON cases(package_id);
CREATE INDEX idx_case_checks_case ON case_checks(case_id);
CREATE INDEX idx_case_checks_org ON case_checks(organisation_id);
CREATE INDEX idx_case_checks_assigned ON case_checks(assigned_to);
CREATE INDEX idx_address_history_candidate ON address_history(candidate_id);
CREATE INDEX idx_address_history_case ON address_history(case_id);
CREATE INDEX idx_activity_history_candidate ON activity_history(candidate_id);
CREATE INDEX idx_activity_history_case ON activity_history(case_id);
CREATE INDEX idx_referees_candidate ON referees(candidate_id);
CREATE INDEX idx_referees_case ON referees(case_id);
CREATE INDEX idx_reference_requests_case ON reference_requests(case_id);
CREATE INDEX idx_reference_requests_check ON reference_requests(check_id);
CREATE INDEX idx_reference_requests_org ON reference_requests(organisation_id);
CREATE INDEX idx_rtw_checks_case ON right_to_work_checks(case_id);
CREATE INDEX idx_rtw_checks_org ON right_to_work_checks(organisation_id);
CREATE INDEX idx_dbs_checks_case ON dbs_checks(case_id);
CREATE INDEX idx_dbs_checks_org ON dbs_checks(organisation_id);
CREATE INDEX idx_documents_case ON documents(case_id);
CREATE INDEX idx_documents_org ON documents(organisation_id);
CREATE INDEX idx_documents_candidate ON documents(candidate_id);
CREATE INDEX idx_documents_check ON documents(check_id);
CREATE INDEX idx_notes_case ON notes(case_id);
CREATE INDEX idx_notes_org ON notes(organisation_id);
CREATE INDEX idx_tasks_org ON tasks(organisation_id);
CREATE INDEX idx_tasks_case ON tasks(case_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_reports_case ON reports(case_id);
CREATE INDEX idx_reports_org ON reports(organisation_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- ============================================================
-- STATUS & QUERY PATTERN INDEXES
-- ============================================================
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_outcome ON cases(outcome) WHERE outcome IS NOT NULL;
CREATE INDEX idx_cases_priority ON cases(priority);
CREATE INDEX idx_cases_sla_due ON cases(sla_due_date) WHERE status NOT IN ('complete', 'cancelled');
CREATE INDEX idx_cases_created ON cases(created_at DESC);
CREATE INDEX idx_case_checks_status ON case_checks(status);
CREATE INDEX idx_case_checks_type ON case_checks(check_type);
CREATE INDEX idx_reference_requests_status ON reference_requests(status);
CREATE INDEX idx_reference_requests_token ON reference_requests(token);
CREATE INDEX idx_tasks_status ON tasks(status) WHERE status IN ('pending', 'in_progress');
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- ============================================================
-- COMPOSITE INDEXES
-- ============================================================
CREATE INDEX idx_cases_client_status_created
  ON cases(client_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_cases_assigned_status
  ON cases(assigned_to, status)
  WHERE deleted_at IS NULL AND status NOT IN ('complete', 'cancelled');

CREATE INDEX idx_case_checks_case_type
  ON case_checks(case_id, check_type);

CREATE INDEX idx_ref_requests_org_status
  ON reference_requests(organisation_id, status)
  WHERE status IN ('sent', 'reminder_sent');

-- ============================================================
-- AUDIT LOG INDEXES
-- ============================================================
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_org ON audit_logs(organisation_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action);

CREATE INDEX idx_audit_entity_created
  ON audit_logs(entity_type, entity_id, created_at DESC);
