-- ============================================================
-- 4.17: DBS_CHECKS_SAFE VIEW — Column-level Access Control
-- ============================================================

-- View that hides adverse_details from non-compliance roles
CREATE OR REPLACE VIEW dbs_checks_safe AS
SELECT
  id, case_id, check_id, candidate_id, organisation_id,
  dbs_type, status, application_reference, certificate_number,
  certificate_date, has_adverse,
  CASE
    WHEN auth.has_min_role('compliance_manager') THEN adverse_details
    ELSE NULL
  END AS adverse_details,
  reviewed_by, reviewed_at, review_notes,
  created_at, updated_at, deleted_at
FROM dbs_checks;

-- ============================================================
-- STORAGE BUCKET CREATION
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false);

-- ============================================================
-- STORAGE BUCKET POLICIES — SECTION 5
-- ============================================================

-- ============================================================
-- BUCKET: documents
-- ============================================================

-- Candidates can upload to their own case path
CREATE POLICY storage_documents_insert_candidate
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.is_candidate()
    AND (storage.foldername(name))[2] IN (
      SELECT c.id::TEXT FROM cases c
      WHERE c.candidate_id = auth.candidate_id()
    )
  );

-- Candidates can read their own documents
CREATE POLICY storage_documents_select_candidate
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND auth.is_candidate()
    AND (storage.foldername(name))[2] IN (
      SELECT c.id::TEXT FROM cases c
      WHERE c.candidate_id = auth.candidate_id()
    )
  );

-- Internal users can read all documents in their org
CREATE POLICY storage_documents_select_internal
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND auth.is_internal()
    AND (storage.foldername(name))[1] = auth.user_organisation_id()::TEXT
  );

-- Internal users can upload documents
CREATE POLICY storage_documents_insert_internal
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.is_internal()
    AND (storage.foldername(name))[1] = auth.user_organisation_id()::TEXT
  );

-- ============================================================
-- BUCKET: evidence (internal only)
-- ============================================================

-- Internal users can read evidence files
CREATE POLICY storage_evidence_select_internal
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'evidence'
    AND auth.is_internal()
    AND (storage.foldername(name))[1] = auth.user_organisation_id()::TEXT
  );

-- Internal users with case_handler+ can upload evidence
CREATE POLICY storage_evidence_insert_internal
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'evidence'
    AND auth.is_internal()
    AND auth.has_min_role('case_handler')
    AND (storage.foldername(name))[1] = auth.user_organisation_id()::TEXT
  );

-- ============================================================
-- BUCKET: reports
-- ============================================================

-- Internal users can read reports
CREATE POLICY storage_reports_select_internal
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'reports'
    AND auth.is_internal()
    AND (storage.foldername(name))[1] = auth.user_organisation_id()::TEXT
  );

-- Client users can read reports for their org
CREATE POLICY storage_reports_select_client
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'reports'
    AND auth.is_client()
    AND (storage.foldername(name))[1] IN (
      SELECT cu.organisation_id::TEXT FROM client_users cu WHERE cu.id = auth.uid()
    )
  );

-- Internal users with qa_reviewer+ can upload reports
CREATE POLICY storage_reports_insert_internal
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'reports'
    AND auth.is_internal()
    AND auth.has_min_role('qa_reviewer')
    AND (storage.foldername(name))[1] = auth.user_organisation_id()::TEXT
  );
