-- ============================================================
-- STEP 7: Critical Database Functions
-- These guarantee atomicity for compliance-critical operations.
-- Every function: validates input, performs the write, logs to
-- audit_logs in a single transaction.
-- ============================================================

-- ============================================================
-- 1. transition_check_status
-- Validates allowed status transitions for a case check,
-- updates the status, logs to check_status_history and audit_logs.
-- ============================================================
CREATE OR REPLACE FUNCTION transition_check_status(
  p_check_id UUID,
  p_new_status check_status,
  p_actor_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_check RECORD;
  v_old_status check_status;
  v_allowed BOOLEAN := FALSE;
  v_history_id UUID;
BEGIN
  -- Lock the row for update
  SELECT cc.*, c.organisation_id
  INTO v_check
  FROM case_checks cc
  JOIN cases c ON c.id = cc.case_id
  WHERE cc.id = p_check_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Check not found: %', p_check_id;
  END IF;

  v_old_status := v_check.status;

  -- Validate allowed transitions
  v_allowed := CASE v_old_status
    WHEN 'not_started' THEN p_new_status IN ('in_progress', 'awaiting_candidate', 'not_applicable')
    WHEN 'awaiting_candidate' THEN p_new_status IN ('in_progress', 'not_applicable')
    WHEN 'in_progress' THEN p_new_status IN ('awaiting_third_party', 'needs_review', 'passed', 'failed', 'insufficient_evidence', 'complete')
    WHEN 'awaiting_third_party' THEN p_new_status IN ('in_progress', 'needs_review', 'passed', 'failed', 'insufficient_evidence')
    WHEN 'needs_review' THEN p_new_status IN ('in_progress', 'passed', 'failed', 'insufficient_evidence', 'complete')
    WHEN 'passed' THEN p_new_status IN ('complete', 'needs_review')
    WHEN 'failed' THEN p_new_status IN ('complete', 'needs_review')
    WHEN 'insufficient_evidence' THEN p_new_status IN ('in_progress', 'needs_review', 'complete')
    WHEN 'complete' THEN FALSE  -- Terminal state
    WHEN 'not_applicable' THEN FALSE  -- Terminal state
    ELSE FALSE
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %', v_old_status, p_new_status;
  END IF;

  -- Update the check
  UPDATE case_checks
  SET status = p_new_status,
      reviewed_by = CASE WHEN p_new_status IN ('passed', 'failed', 'insufficient_evidence', 'complete') THEN p_actor_id ELSE reviewed_by END,
      reviewed_at = CASE WHEN p_new_status IN ('passed', 'failed', 'insufficient_evidence', 'complete') THEN NOW() ELSE reviewed_at END,
      completed_at = CASE WHEN p_new_status = 'complete' THEN NOW() ELSE completed_at END,
      notes = COALESCE(p_notes, notes)
  WHERE id = p_check_id;

  -- Record in check_status_history
  INSERT INTO check_status_history (case_check_id, old_status, new_status, changed_by, notes)
  VALUES (p_check_id, v_old_status, p_new_status, p_actor_id, p_notes)
  RETURNING id INTO v_history_id;

  -- Audit log
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, organisation_id, metadata)
  VALUES (
    p_actor_id,
    'check.status_changed',
    'case_check',
    p_check_id,
    v_check.organisation_id,
    jsonb_build_object(
      'old_status', v_old_status::TEXT,
      'new_status', p_new_status::TEXT,
      'check_type', v_check.check_type::TEXT,
      'case_id', v_check.case_id,
      'notes', p_notes
    )
  );

  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. submit_candidate_data
-- Called when a candidate clicks "Submit" on the review page.
-- Validates 5-year timeline completeness, locks candidate input,
-- transitions case status and relevant checks.
-- ============================================================
CREATE OR REPLACE FUNCTION submit_candidate_data(
  p_case_id UUID,
  p_candidate_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_case RECORD;
  v_candidate RECORD;
  v_address_months INT;
  v_activity_months INT;
  v_five_years_months CONSTANT INT := 60;
BEGIN
  -- Lock case row
  SELECT * INTO v_case
  FROM cases
  WHERE id = p_case_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Case not found: %', p_case_id;
  END IF;

  IF v_case.status NOT IN ('awaiting_candidate', 'new') THEN
    RAISE EXCEPTION 'Case is not awaiting candidate submission. Current status: %', v_case.status;
  END IF;

  -- Lock candidate row
  SELECT * INTO v_candidate
  FROM candidates
  WHERE id = p_candidate_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidate not found: %', p_candidate_id;
  END IF;

  IF v_candidate.has_submitted THEN
    RAISE EXCEPTION 'Candidate has already submitted';
  END IF;

  -- Validate 5-year address history coverage
  SELECT COALESCE(SUM(
    EXTRACT(YEAR FROM AGE(COALESCE(date_to, CURRENT_DATE), date_from)) * 12 +
    EXTRACT(MONTH FROM AGE(COALESCE(date_to, CURRENT_DATE), date_from))
  ), 0)
  INTO v_address_months
  FROM address_history
  WHERE candidate_id = p_candidate_id;

  IF v_address_months < v_five_years_months THEN
    RAISE EXCEPTION 'Address history does not cover 5 years. Coverage: % months', v_address_months;
  END IF;

  -- Validate 5-year activity history coverage
  SELECT COALESCE(SUM(
    EXTRACT(YEAR FROM AGE(COALESCE(date_to, CURRENT_DATE), date_from)) * 12 +
    EXTRACT(MONTH FROM AGE(COALESCE(date_to, CURRENT_DATE), date_from))
  ), 0)
  INTO v_activity_months
  FROM activity_history
  WHERE candidate_id = p_candidate_id;

  IF v_activity_months < v_five_years_months THEN
    RAISE EXCEPTION 'Activity history does not cover 5 years. Coverage: % months', v_activity_months;
  END IF;

  -- Lock candidate input
  UPDATE candidates
  SET has_submitted = TRUE,
      submitted_at = NOW()
  WHERE id = p_candidate_id;

  -- Transition case to in_progress
  UPDATE cases
  SET status = 'in_progress'
  WHERE id = p_case_id;

  -- Record case status change
  INSERT INTO case_status_history (case_id, old_status, new_status, changed_by, notes)
  VALUES (p_case_id, v_case.status, 'in_progress', v_candidate.auth_user_id, 'Candidate submitted data');

  -- Transition relevant checks from awaiting_candidate to in_progress
  UPDATE case_checks
  SET status = 'in_progress'
  WHERE case_id = p_case_id
    AND status = 'awaiting_candidate';

  -- Audit log
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, organisation_id, metadata)
  VALUES (
    v_candidate.auth_user_id,
    'candidate.submitted',
    'candidate',
    p_candidate_id,
    v_case.organisation_id,
    jsonb_build_object(
      'case_id', p_case_id,
      'address_months', v_address_months,
      'activity_months', v_activity_months
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. adjudicate_case
-- Final review decision. Sets case outcome, marks complete,
-- generates comprehensive audit entry.
-- ============================================================
CREATE OR REPLACE FUNCTION adjudicate_case(
  p_case_id UUID,
  p_outcome case_outcome,
  p_reviewer_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_case RECORD;
  v_incomplete_checks INT;
  v_check_summary JSONB;
BEGIN
  -- Lock case
  SELECT * INTO v_case
  FROM cases
  WHERE id = p_case_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Case not found: %', p_case_id;
  END IF;

  IF v_case.status <> 'under_review' THEN
    RAISE EXCEPTION 'Case must be under_review to adjudicate. Current status: %', v_case.status;
  END IF;

  -- Check for incomplete checks (not terminal states)
  SELECT COUNT(*)
  INTO v_incomplete_checks
  FROM case_checks
  WHERE case_id = p_case_id
    AND status NOT IN ('complete', 'passed', 'failed', 'insufficient_evidence', 'not_applicable');

  IF v_incomplete_checks > 0 THEN
    RAISE EXCEPTION '% checks are not yet complete', v_incomplete_checks;
  END IF;

  -- Build check summary for audit
  SELECT jsonb_agg(
    jsonb_build_object(
      'check_type', check_type::TEXT,
      'status', status::TEXT,
      'outcome', outcome::TEXT
    )
  )
  INTO v_check_summary
  FROM case_checks
  WHERE case_id = p_case_id;

  -- Set outcome and mark complete
  UPDATE cases
  SET status = 'complete',
      outcome = p_outcome,
      completed_at = NOW()
  WHERE id = p_case_id;

  -- Case status history
  INSERT INTO case_status_history (case_id, old_status, new_status, changed_by, notes)
  VALUES (p_case_id, 'under_review', 'complete', p_reviewer_id, p_notes);

  -- Comprehensive audit log
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, organisation_id, metadata)
  VALUES (
    p_reviewer_id,
    'case.adjudicated',
    'case',
    p_case_id,
    v_case.organisation_id,
    jsonb_build_object(
      'outcome', p_outcome::TEXT,
      'case_reference', v_case.case_reference,
      'client_id', v_case.client_id,
      'candidate_id', v_case.candidate_id,
      'notes', p_notes,
      'check_summary', v_check_summary
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. create_case_with_checks
-- Creates a case, links candidate, and generates all checks
-- from the screening package template.
-- ============================================================
CREATE OR REPLACE FUNCTION create_case_with_checks(
  p_client_id UUID,
  p_candidate_id UUID,
  p_package_id UUID,
  p_created_by UUID,
  p_priority case_priority DEFAULT 'standard',
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_case_id UUID;
  v_client RECORD;
  v_package RECORD;
  v_check RECORD;
  v_org_id UUID;
BEGIN
  -- Get client info (includes organisation_id)
  SELECT * INTO v_client
  FROM clients
  WHERE id = p_client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client not found: %', p_client_id;
  END IF;

  v_org_id := v_client.organisation_id;

  -- Get package info
  SELECT * INTO v_package
  FROM screening_packages
  WHERE id = p_package_id AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Screening package not found or inactive: %', p_package_id;
  END IF;

  -- Create the case
  INSERT INTO cases (
    organisation_id,
    client_id,
    candidate_id,
    package_id,
    status,
    priority,
    created_by
  )
  VALUES (
    v_org_id,
    p_client_id,
    p_candidate_id,
    p_package_id,
    'new',
    p_priority,
    p_created_by
  )
  RETURNING id INTO v_case_id;

  -- Create checks from package template
  FOR v_check IN
    SELECT check_type, is_required
    FROM package_checks
    WHERE package_id = p_package_id
  LOOP
    INSERT INTO case_checks (
      case_id,
      check_type,
      status,
      is_required
    )
    VALUES (
      v_case_id,
      v_check.check_type,
      'not_started',
      v_check.is_required
    );
  END LOOP;

  -- Case status history (initial entry)
  INSERT INTO case_status_history (case_id, old_status, new_status, changed_by, notes)
  VALUES (v_case_id, 'new', 'new', p_created_by, 'Case created');

  -- Audit log
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, organisation_id, metadata)
  VALUES (
    p_created_by,
    'case.created',
    'case',
    v_case_id,
    v_org_id,
    jsonb_build_object(
      'client_id', p_client_id,
      'candidate_id', p_candidate_id,
      'package_id', p_package_id,
      'package_name', v_package.name,
      'priority', p_priority::TEXT,
      'notes', p_notes
    )
  );

  RETURN v_case_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. transition_case_status
-- General case status transition with validation.
-- Used for moving cases through the workflow (excluding
-- adjudication which has its own function).
-- ============================================================
CREATE OR REPLACE FUNCTION transition_case_status(
  p_case_id UUID,
  p_new_status case_status,
  p_actor_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_case RECORD;
  v_old_status case_status;
  v_allowed BOOLEAN := FALSE;
BEGIN
  -- Lock the row
  SELECT * INTO v_case
  FROM cases
  WHERE id = p_case_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Case not found: %', p_case_id;
  END IF;

  v_old_status := v_case.status;

  -- Validate allowed transitions
  v_allowed := CASE v_old_status
    WHEN 'new' THEN p_new_status IN ('awaiting_candidate', 'cancelled')
    WHEN 'awaiting_candidate' THEN p_new_status IN ('in_progress', 'on_hold', 'cancelled')
    WHEN 'in_progress' THEN p_new_status IN ('awaiting_third_party', 'under_review', 'on_hold', 'cancelled')
    WHEN 'awaiting_third_party' THEN p_new_status IN ('in_progress', 'under_review', 'on_hold')
    WHEN 'under_review' THEN p_new_status IN ('in_progress', 'complete')  -- complete only via adjudicate_case
    WHEN 'on_hold' THEN p_new_status IN ('in_progress', 'awaiting_candidate', 'cancelled')
    WHEN 'complete' THEN FALSE  -- Terminal
    WHEN 'cancelled' THEN FALSE  -- Terminal
    ELSE FALSE
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid case status transition: % -> %', v_old_status, p_new_status;
  END IF;

  -- Update case
  UPDATE cases
  SET status = p_new_status
  WHERE id = p_case_id;

  -- Status history
  INSERT INTO case_status_history (case_id, old_status, new_status, changed_by, notes)
  VALUES (p_case_id, v_old_status, p_new_status, p_actor_id, p_notes);

  -- Audit log
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, organisation_id, metadata)
  VALUES (
    p_actor_id,
    'case.status_changed',
    'case',
    p_case_id,
    v_case.organisation_id,
    jsonb_build_object(
      'old_status', v_old_status::TEXT,
      'new_status', p_new_status::TEXT,
      'case_reference', v_case.case_reference,
      'notes', p_notes
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Grant execute to authenticated users (RLS on underlying tables
-- still applies for non-SECURITY DEFINER parts)
-- ============================================================
GRANT EXECUTE ON FUNCTION transition_check_status TO authenticated;
GRANT EXECUTE ON FUNCTION submit_candidate_data TO authenticated;
GRANT EXECUTE ON FUNCTION adjudicate_case TO authenticated;
GRANT EXECUTE ON FUNCTION create_case_with_checks TO authenticated;
GRANT EXECUTE ON FUNCTION transition_case_status TO authenticated;
