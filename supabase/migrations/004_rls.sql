-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- ============================================================
-- HELPER: Get current user's type from JWT
-- ============================================================
CREATE OR REPLACE FUNCTION auth.user_type()
RETURNS TEXT AS $$
  SELECT coalesce(
    (auth.jwt()->'app_metadata'->>'user_type'),
    ''
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- HELPER: Get current user's role from JWT
-- ============================================================
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT coalesce(
    (auth.jwt()->'app_metadata'->>'role'),
    ''
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- HELPER: Get current user's organisation_id from JWT
-- ============================================================
CREATE OR REPLACE FUNCTION auth.user_organisation_id()
RETURNS UUID AS $$
  SELECT (auth.jwt()->'app_metadata'->>'organisation_id')::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- HELPER: Check if current user is an internal user
-- ============================================================
CREATE OR REPLACE FUNCTION auth.is_internal()
RETURNS BOOLEAN AS $$
  SELECT auth.user_type() = 'internal';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- HELPER: Check if current user is a client user
-- ============================================================
CREATE OR REPLACE FUNCTION auth.is_client()
RETURNS BOOLEAN AS $$
  SELECT auth.user_type() = 'client';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- HELPER: Check if current user is a candidate
-- ============================================================
CREATE OR REPLACE FUNCTION auth.is_candidate()
RETURNS BOOLEAN AS $$
  SELECT auth.user_type() = 'candidate';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- HELPER: Check if current user has a specific minimum role
-- Role hierarchy: super_admin > compliance_manager > qa_reviewer > case_handler
-- ============================================================
CREATE OR REPLACE FUNCTION auth.has_min_role(required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  role_level INTEGER;
  required_level INTEGER;
  levels JSONB := '{
    "super_admin": 100,
    "compliance_manager": 80,
    "qa_reviewer": 60,
    "case_handler": 40
  }'::JSONB;
BEGIN
  role_level := coalesce((levels->>auth.user_role())::INTEGER, 0);
  required_level := coalesce((levels->>required_role)::INTEGER, 0);
  RETURN role_level >= required_level;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- HELPER: Get the candidate_id for the current auth user
-- Used by candidate RLS policies
-- ============================================================
CREATE OR REPLACE FUNCTION auth.candidate_id()
RETURNS UUID AS $$
  SELECT id FROM candidates WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- HELPER: Get the client_id for the current auth user
-- Used by client RLS policies
-- ============================================================
CREATE OR REPLACE FUNCTION auth.client_id()
RETURNS UUID AS $$
  SELECT client_id FROM client_users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE address_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE referees ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE right_to_work_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dbs_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES — ALL TABLES
-- ============================================================

-- 4.1 Organisations
CREATE POLICY organisations_select_internal ON organisations
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND id = auth.user_organisation_id()
  );

CREATE POLICY organisations_update_super_admin ON organisations
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND auth.user_role() = 'super_admin'
    AND id = auth.user_organisation_id()
  )
  WITH CHECK (
    auth.is_internal()
    AND auth.user_role() = 'super_admin'
    AND id = auth.user_organisation_id()
  );

-- 4.2 Internal Users
CREATE POLICY internal_users_select_internal ON internal_users
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND organisation_id = auth.user_organisation_id()
    AND deleted_at IS NULL
  );

CREATE POLICY internal_users_insert_super_admin ON internal_users
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND auth.user_role() = 'super_admin'
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY internal_users_update_super_admin ON internal_users
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND auth.user_role() = 'super_admin'
    AND organisation_id = auth.user_organisation_id()
  )
  WITH CHECK (
    auth.is_internal()
    AND auth.user_role() = 'super_admin'
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY internal_users_update_self ON internal_users
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND id = auth.uid()
  )
  WITH CHECK (
    auth.is_internal()
    AND id = auth.uid()
    AND role = (SELECT role FROM internal_users WHERE id = auth.uid())
  );

-- 4.3 Clients
CREATE POLICY clients_select_internal ON clients
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND organisation_id = auth.user_organisation_id()
    AND deleted_at IS NULL
  );

CREATE POLICY clients_select_client ON clients
  FOR SELECT TO authenticated
  USING (
    auth.is_client()
    AND id = auth.client_id()
    AND deleted_at IS NULL
  );

CREATE POLICY clients_insert_internal ON clients
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY clients_update_internal ON clients
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND auth.has_min_role('compliance_manager')
    AND organisation_id = auth.user_organisation_id()
  )
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('compliance_manager')
    AND organisation_id = auth.user_organisation_id()
  );

-- 4.4 Client Users
CREATE POLICY client_users_select_internal ON client_users
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND organisation_id = auth.user_organisation_id()
    AND deleted_at IS NULL
  );

CREATE POLICY client_users_select_client ON client_users
  FOR SELECT TO authenticated
  USING (
    auth.is_client()
    AND client_id = auth.client_id()
    AND deleted_at IS NULL
  );

CREATE POLICY client_users_insert_internal ON client_users
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('compliance_manager')
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY client_users_update_internal ON client_users
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND auth.has_min_role('compliance_manager')
    AND organisation_id = auth.user_organisation_id()
  )
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('compliance_manager')
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY client_users_update_self ON client_users
  FOR UPDATE TO authenticated
  USING (
    auth.is_client()
    AND id = auth.uid()
  )
  WITH CHECK (
    auth.is_client()
    AND id = auth.uid()
  );

-- 4.5 Screening Packages
CREATE POLICY screening_packages_select_internal ON screening_packages
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND organisation_id = auth.user_organisation_id()
    AND deleted_at IS NULL
  );

CREATE POLICY screening_packages_select_client ON screening_packages
  FOR SELECT TO authenticated
  USING (
    auth.is_client()
    AND organisation_id = (SELECT organisation_id FROM client_users WHERE id = auth.uid())
    AND is_active = true
    AND deleted_at IS NULL
  );

CREATE POLICY screening_packages_insert_internal ON screening_packages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('compliance_manager')
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY screening_packages_update_internal ON screening_packages
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND auth.has_min_role('compliance_manager')
    AND organisation_id = auth.user_organisation_id()
  )
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('compliance_manager')
    AND organisation_id = auth.user_organisation_id()
  );

-- 4.5 Package Checks
CREATE POLICY package_checks_select_internal ON package_checks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM screening_packages sp
      WHERE sp.id = package_id
        AND sp.organisation_id = auth.user_organisation_id()
        AND sp.deleted_at IS NULL
    )
    AND (auth.is_internal() OR auth.is_client())
  );

CREATE POLICY package_checks_insert_internal ON package_checks
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('compliance_manager')
    AND EXISTS (
      SELECT 1 FROM screening_packages sp
      WHERE sp.id = package_id
        AND sp.organisation_id = auth.user_organisation_id()
    )
  );

CREATE POLICY package_checks_update_internal ON package_checks
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND auth.has_min_role('compliance_manager')
    AND EXISTS (
      SELECT 1 FROM screening_packages sp
      WHERE sp.id = package_id
        AND sp.organisation_id = auth.user_organisation_id()
    )
  )
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('compliance_manager')
    AND EXISTS (
      SELECT 1 FROM screening_packages sp
      WHERE sp.id = package_id
        AND sp.organisation_id = auth.user_organisation_id()
    )
  );

CREATE POLICY package_checks_delete_internal ON package_checks
  FOR DELETE TO authenticated
  USING (
    auth.is_internal()
    AND auth.has_min_role('compliance_manager')
    AND EXISTS (
      SELECT 1 FROM screening_packages sp
      WHERE sp.id = package_id
        AND sp.organisation_id = auth.user_organisation_id()
    )
  );

-- 4.6 Candidates
CREATE POLICY candidates_select_internal ON candidates
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND organisation_id = auth.user_organisation_id()
    AND deleted_at IS NULL
  );

CREATE POLICY candidates_select_client ON candidates
  FOR SELECT TO authenticated
  USING (
    auth.is_client()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.candidate_id = candidates.id
        AND c.client_id = auth.client_id()
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY candidates_select_self ON candidates
  FOR SELECT TO authenticated
  USING (
    auth.is_candidate()
    AND auth_user_id = auth.uid()
    AND deleted_at IS NULL
  );

CREATE POLICY candidates_insert_internal ON candidates
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY candidates_update_internal ON candidates
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND organisation_id = auth.user_organisation_id()
  )
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY candidates_update_self ON candidates
  FOR UPDATE TO authenticated
  USING (
    auth.is_candidate()
    AND auth_user_id = auth.uid()
    AND has_submitted = false
  )
  WITH CHECK (
    auth.is_candidate()
    AND auth_user_id = auth.uid()
  );

-- 4.7 Cases
CREATE POLICY cases_select_internal ON cases
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND organisation_id = auth.user_organisation_id()
    AND deleted_at IS NULL
  );

CREATE POLICY cases_select_client ON cases
  FOR SELECT TO authenticated
  USING (
    auth.is_client()
    AND client_id = auth.client_id()
    AND deleted_at IS NULL
  );

CREATE POLICY cases_select_candidate ON cases
  FOR SELECT TO authenticated
  USING (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
    AND deleted_at IS NULL
  );

CREATE POLICY cases_insert_internal ON cases
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY cases_insert_client ON cases
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_client()
    AND client_id = auth.client_id()
    AND organisation_id = (SELECT organisation_id FROM client_users WHERE id = auth.uid())
  );

CREATE POLICY cases_update_internal ON cases
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND organisation_id = auth.user_organisation_id()
  )
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND organisation_id = auth.user_organisation_id()
  );

-- 4.8 Case Status History
CREATE POLICY case_status_history_select_internal ON case_status_history
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
        AND c.organisation_id = auth.user_organisation_id()
    )
  );

CREATE POLICY case_status_history_select_client ON case_status_history
  FOR SELECT TO authenticated
  USING (
    auth.is_client()
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
        AND c.client_id = auth.client_id()
    )
  );

CREATE POLICY case_status_history_insert_authenticated ON case_status_history
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
        AND c.organisation_id = auth.user_organisation_id()
    )
  );

-- 4.9 Case Checks
CREATE POLICY case_checks_select_internal ON case_checks
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY case_checks_select_client ON case_checks
  FOR SELECT TO authenticated
  USING (
    auth.is_client()
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
        AND c.client_id = auth.client_id()
    )
  );

CREATE POLICY case_checks_select_candidate ON case_checks
  FOR SELECT TO authenticated
  USING (
    auth.is_candidate()
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
        AND c.candidate_id = auth.candidate_id()
    )
  );

CREATE POLICY case_checks_insert_internal ON case_checks
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY case_checks_update_internal ON case_checks
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND organisation_id = auth.user_organisation_id()
  )
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND organisation_id = auth.user_organisation_id()
  );

-- 4.10 Check Status History
CREATE POLICY check_status_history_select_internal ON check_status_history
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND EXISTS (
      SELECT 1 FROM case_checks cc
      WHERE cc.id = check_id
        AND cc.organisation_id = auth.user_organisation_id()
    )
  );

CREATE POLICY check_status_history_insert_internal ON check_status_history
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND EXISTS (
      SELECT 1 FROM case_checks cc
      WHERE cc.id = check_id
        AND cc.organisation_id = auth.user_organisation_id()
    )
  );

-- 4.11 Address History
CREATE POLICY address_history_select_internal ON address_history
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
        AND c.organisation_id = auth.user_organisation_id()
    )
  );

CREATE POLICY address_history_select_candidate ON address_history
  FOR SELECT TO authenticated
  USING (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
  );

CREATE POLICY address_history_insert_candidate ON address_history
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
    AND EXISTS (
      SELECT 1 FROM candidates cand
      WHERE cand.id = candidate_id
        AND cand.has_submitted = false
    )
  );

CREATE POLICY address_history_update_candidate ON address_history
  FOR UPDATE TO authenticated
  USING (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
    AND EXISTS (
      SELECT 1 FROM candidates cand
      WHERE cand.id = candidate_id
        AND cand.has_submitted = false
    )
  )
  WITH CHECK (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
  );

CREATE POLICY address_history_delete_candidate ON address_history
  FOR DELETE TO authenticated
  USING (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
    AND EXISTS (
      SELECT 1 FROM candidates cand
      WHERE cand.id = candidate_id
        AND cand.has_submitted = false
    )
  );

CREATE POLICY address_history_insert_internal ON address_history
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
        AND c.organisation_id = auth.user_organisation_id()
    )
  );

CREATE POLICY address_history_update_internal ON address_history
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
        AND c.organisation_id = auth.user_organisation_id()
    )
  )
  WITH CHECK (
    auth.is_internal()
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
        AND c.organisation_id = auth.user_organisation_id()
    )
  );

-- 4.12 Activity History
CREATE POLICY activity_history_select_internal ON activity_history
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND EXISTS (
      SELECT 1 FROM cases c WHERE c.id = case_id
        AND c.organisation_id = auth.user_organisation_id()
    )
  );

CREATE POLICY activity_history_select_candidate ON activity_history
  FOR SELECT TO authenticated
  USING (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
  );

CREATE POLICY activity_history_insert_candidate ON activity_history
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
    AND EXISTS (
      SELECT 1 FROM candidates cand
      WHERE cand.id = candidate_id AND cand.has_submitted = false
    )
  );

CREATE POLICY activity_history_update_candidate ON activity_history
  FOR UPDATE TO authenticated
  USING (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
    AND EXISTS (
      SELECT 1 FROM candidates cand
      WHERE cand.id = candidate_id AND cand.has_submitted = false
    )
  )
  WITH CHECK (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
  );

CREATE POLICY activity_history_delete_candidate ON activity_history
  FOR DELETE TO authenticated
  USING (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
    AND EXISTS (
      SELECT 1 FROM candidates cand
      WHERE cand.id = candidate_id AND cand.has_submitted = false
    )
  );

CREATE POLICY activity_history_insert_internal ON activity_history
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND EXISTS (
      SELECT 1 FROM cases c WHERE c.id = case_id
        AND c.organisation_id = auth.user_organisation_id()
    )
  );

CREATE POLICY activity_history_update_internal ON activity_history
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND EXISTS (
      SELECT 1 FROM cases c WHERE c.id = case_id
        AND c.organisation_id = auth.user_organisation_id()
    )
  )
  WITH CHECK (
    auth.is_internal()
    AND EXISTS (
      SELECT 1 FROM cases c WHERE c.id = case_id
        AND c.organisation_id = auth.user_organisation_id()
    )
  );

-- 4.13 Referees
CREATE POLICY referees_select_internal ON referees
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND EXISTS (
      SELECT 1 FROM cases c WHERE c.id = case_id
        AND c.organisation_id = auth.user_organisation_id()
    )
  );

CREATE POLICY referees_select_candidate ON referees
  FOR SELECT TO authenticated
  USING (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
  );

CREATE POLICY referees_insert_candidate ON referees
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
    AND EXISTS (
      SELECT 1 FROM candidates cand
      WHERE cand.id = candidate_id AND cand.has_submitted = false
    )
  );

CREATE POLICY referees_update_candidate ON referees
  FOR UPDATE TO authenticated
  USING (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
    AND EXISTS (
      SELECT 1 FROM candidates cand
      WHERE cand.id = candidate_id AND cand.has_submitted = false
    )
  )
  WITH CHECK (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
  );

CREATE POLICY referees_delete_candidate ON referees
  FOR DELETE TO authenticated
  USING (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
    AND EXISTS (
      SELECT 1 FROM candidates cand
      WHERE cand.id = candidate_id AND cand.has_submitted = false
    )
  );

CREATE POLICY referees_insert_internal ON referees
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND EXISTS (
      SELECT 1 FROM cases c WHERE c.id = case_id
        AND c.organisation_id = auth.user_organisation_id()
    )
  );

CREATE POLICY referees_update_internal ON referees
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND EXISTS (
      SELECT 1 FROM cases c WHERE c.id = case_id
        AND c.organisation_id = auth.user_organisation_id()
    )
  )
  WITH CHECK (
    auth.is_internal()
    AND EXISTS (
      SELECT 1 FROM cases c WHERE c.id = case_id
        AND c.organisation_id = auth.user_organisation_id()
    )
  );

-- 4.14 Reference Requests
CREATE POLICY reference_requests_select_internal ON reference_requests
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY reference_requests_select_client ON reference_requests
  FOR SELECT TO authenticated
  USING (
    auth.is_client()
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id AND c.client_id = auth.client_id()
    )
  );

CREATE POLICY reference_requests_insert_internal ON reference_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY reference_requests_update_internal ON reference_requests
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND organisation_id = auth.user_organisation_id()
  )
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND organisation_id = auth.user_organisation_id()
  );

-- 4.15 Reference Responses
CREATE POLICY reference_responses_select_internal ON reference_responses
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND EXISTS (
      SELECT 1 FROM reference_requests rr
      WHERE rr.id = request_id
        AND rr.organisation_id = auth.user_organisation_id()
    )
  );

CREATE POLICY reference_responses_update_internal ON reference_responses
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND EXISTS (
      SELECT 1 FROM reference_requests rr
      WHERE rr.id = request_id
        AND rr.organisation_id = auth.user_organisation_id()
    )
  )
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND EXISTS (
      SELECT 1 FROM reference_requests rr
      WHERE rr.id = request_id
        AND rr.organisation_id = auth.user_organisation_id()
    )
  );

-- 4.16 Right to Work Checks
CREATE POLICY rtw_checks_select_internal ON right_to_work_checks
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY rtw_checks_insert_internal ON right_to_work_checks
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY rtw_checks_update_internal ON right_to_work_checks
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND organisation_id = auth.user_organisation_id()
  )
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND organisation_id = auth.user_organisation_id()
  );

-- 4.17 DBS Checks
CREATE POLICY dbs_checks_select_compliance ON dbs_checks
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND auth.has_min_role('compliance_manager')
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY dbs_checks_select_case_handler ON dbs_checks
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND auth.user_role() = 'case_handler'
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY dbs_checks_insert_compliance ON dbs_checks
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('compliance_manager')
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY dbs_checks_update_compliance ON dbs_checks
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND auth.has_min_role('compliance_manager')
    AND organisation_id = auth.user_organisation_id()
  )
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('compliance_manager')
    AND organisation_id = auth.user_organisation_id()
  );

-- 4.18 Documents
CREATE POLICY documents_select_internal ON documents
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND organisation_id = auth.user_organisation_id()
    AND deleted_at IS NULL
  );

CREATE POLICY documents_select_client ON documents
  FOR SELECT TO authenticated
  USING (
    auth.is_client()
    AND organisation_id = (SELECT organisation_id FROM client_users WHERE id = auth.uid())
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id AND c.client_id = auth.client_id()
    )
  );

CREATE POLICY documents_select_candidate ON documents
  FOR SELECT TO authenticated
  USING (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
    AND deleted_at IS NULL
  );

CREATE POLICY documents_insert_candidate ON documents
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
    AND uploaded_by = auth.uid()
  );

CREATE POLICY documents_insert_internal ON documents
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND organisation_id = auth.user_organisation_id()
    AND uploaded_by = auth.uid()
  );

CREATE POLICY documents_update_internal ON documents
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND organisation_id = auth.user_organisation_id()
  )
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND organisation_id = auth.user_organisation_id()
  );

-- 4.19 Notes
CREATE POLICY notes_select_internal ON notes
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND organisation_id = auth.user_organisation_id()
    AND deleted_at IS NULL
  );

CREATE POLICY notes_select_client ON notes
  FOR SELECT TO authenticated
  USING (
    auth.is_client()
    AND is_internal = false
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id AND c.client_id = auth.client_id()
    )
  );

CREATE POLICY notes_insert_internal ON notes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND organisation_id = auth.user_organisation_id()
    AND created_by = auth.uid()
  );

CREATE POLICY notes_update_internal ON notes
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND created_by = auth.uid()
    AND organisation_id = auth.user_organisation_id()
  )
  WITH CHECK (
    auth.is_internal()
    AND created_by = auth.uid()
    AND organisation_id = auth.user_organisation_id()
  );

-- 4.20 Tasks
CREATE POLICY tasks_select_internal ON tasks
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND organisation_id = auth.user_organisation_id()
    AND deleted_at IS NULL
  );

CREATE POLICY tasks_insert_internal ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY tasks_update_internal ON tasks
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND organisation_id = auth.user_organisation_id()
    AND (assigned_to = auth.uid() OR created_by = auth.uid() OR auth.has_min_role('compliance_manager'))
  )
  WITH CHECK (
    auth.is_internal()
    AND organisation_id = auth.user_organisation_id()
  );

-- 4.21 Candidate Declarations
CREATE POLICY declarations_select_internal ON candidate_declarations
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND EXISTS (
      SELECT 1 FROM cases c WHERE c.id = case_id
        AND c.organisation_id = auth.user_organisation_id()
    )
  );

CREATE POLICY declarations_select_candidate ON candidate_declarations
  FOR SELECT TO authenticated
  USING (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
  );

CREATE POLICY declarations_insert_candidate ON candidate_declarations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
    AND EXISTS (
      SELECT 1 FROM candidates cand
      WHERE cand.id = candidate_id AND cand.has_submitted = false
    )
  );

CREATE POLICY declarations_update_candidate ON candidate_declarations
  FOR UPDATE TO authenticated
  USING (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
    AND EXISTS (
      SELECT 1 FROM candidates cand
      WHERE cand.id = candidate_id AND cand.has_submitted = false
    )
  )
  WITH CHECK (
    auth.is_candidate()
    AND candidate_id = auth.candidate_id()
  );

CREATE POLICY declarations_insert_internal ON candidate_declarations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND EXISTS (
      SELECT 1 FROM cases c WHERE c.id = case_id
        AND c.organisation_id = auth.user_organisation_id()
    )
  );

-- 4.22 Audit Logs
CREATE POLICY audit_logs_insert_authenticated ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
  );

CREATE POLICY audit_logs_select_internal ON audit_logs
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND auth.has_min_role('compliance_manager')
    AND (
      organisation_id = auth.user_organisation_id()
      OR organisation_id IS NULL
    )
  );

-- 4.23 Reports
CREATE POLICY reports_select_internal ON reports
  FOR SELECT TO authenticated
  USING (
    auth.is_internal()
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY reports_select_client ON reports
  FOR SELECT TO authenticated
  USING (
    auth.is_client()
    AND EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id AND c.client_id = auth.client_id()
    )
    AND status = 'ready'
  );

CREATE POLICY reports_insert_internal ON reports
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('qa_reviewer')
    AND organisation_id = auth.user_organisation_id()
  );

CREATE POLICY reports_update_internal ON reports
  FOR UPDATE TO authenticated
  USING (
    auth.is_internal()
    AND auth.has_min_role('qa_reviewer')
    AND organisation_id = auth.user_organisation_id()
  )
  WITH CHECK (
    auth.is_internal()
    AND auth.has_min_role('qa_reviewer')
    AND organisation_id = auth.user_organisation_id()
  );

-- 4.24 Notifications
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY notifications_insert_internal ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.is_internal()
  );

CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- AUDIT LOG SAFETY: REVOKE UPDATE, DELETE AT GRANT LEVEL
-- ============================================================

REVOKE UPDATE, DELETE ON audit_logs FROM authenticated;
REVOKE UPDATE, DELETE ON audit_logs FROM anon;
