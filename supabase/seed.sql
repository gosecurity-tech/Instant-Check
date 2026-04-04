-- ============================================================
-- SEED DATA — Development / Staging Only
-- DO NOT run in production.
--
-- Creates a realistic test environment for Instant Check:
-- - 1 organisation
-- - 4 internal users (one per role)
-- - 2 client companies with 2 client users
-- - 3 screening packages
-- - 5 candidates with cases at various stages
-- ============================================================

-- Use service_role context (bypasses RLS)

-- ============================================================
-- 1. ORGANISATION
-- ============================================================
INSERT INTO organisations (id, name, slug, settings) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Instant Check Ltd', 'instant-check', '{"sla_default_days": 10, "data_retention_years": 7}');

-- ============================================================
-- 2. INTERNAL USERS
-- Note: auth.users records must be created via Supabase Auth API
-- (supabase.auth.admin.createUser). These records reference those IDs.
-- The UUIDs below are placeholders — replace with real auth user IDs
-- after running the user creation script.
-- ============================================================
INSERT INTO internal_users (id, organisation_id, email, full_name, role) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'admin@instantcheck.co.uk', 'Sarah Mitchell', 'super_admin'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'compliance@instantcheck.co.uk', 'James Thornton', 'compliance_manager'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'qa@instantcheck.co.uk', 'Emma Richards', 'qa_reviewer'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'handler@instantcheck.co.uk', 'David Cooper', 'case_handler');

-- ============================================================
-- 3. CLIENTS
-- ============================================================
INSERT INTO clients (id, organisation_id, name, registration_number, address_line_1, city, postcode, primary_contact_name, primary_contact_email, sla_days, is_active, created_by) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Sentinel Security Group', '08123456', '100 Aldersgate Street', 'London', 'EC1A 4HD', 'Mark Bevan', 'mark.bevan@sentinel-sec.co.uk', 10, true, 'b0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Fortress FM Ltd', '09876543', '50 Deansgate', 'Manchester', 'M3 2FF', 'Lisa Monroe', 'lisa.monroe@fortressfm.co.uk', 7, true, 'b0000000-0000-0000-0000-000000000001');

-- ============================================================
-- 4. CLIENT USERS
-- Same note as internal_users — auth.users records required first.
-- ============================================================
INSERT INTO client_users (id, client_id, organisation_id, email, full_name, is_primary) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'mark.bevan@sentinel-sec.co.uk', 'Mark Bevan', true),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'lisa.monroe@fortressfm.co.uk', 'Lisa Monroe', true);

-- ============================================================
-- 5. SCREENING PACKAGES
-- ============================================================
INSERT INTO screening_packages (id, organisation_id, name, description, is_active, created_by) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'BS7858 Full', 'Full BS7858 vetting — identity, 5-year history, DBS enhanced, references, right to work, declarations.', true, 'b0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'BS7858 Standard', 'Standard BS7858 — identity, 5-year history, DBS basic, references, right to work.', true, 'b0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Basic Pre-Employment', 'Basic check — identity verification, right to work, 2 references.', true, 'b0000000-0000-0000-0000-000000000001');

-- Set default packages for clients
UPDATE clients SET default_package_id = 'e0000000-0000-0000-0000-000000000001' WHERE id = 'c0000000-0000-0000-0000-000000000001';
UPDATE clients SET default_package_id = 'e0000000-0000-0000-0000-000000000002' WHERE id = 'c0000000-0000-0000-0000-000000000002';

-- ============================================================
-- 6. PACKAGE CHECKS
-- ============================================================

-- BS7858 Full (12 check types)
INSERT INTO package_checks (package_id, check_type, is_mandatory, sort_order) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'identity_verification', true, 1),
  ('e0000000-0000-0000-0000-000000000001', 'right_to_work', true, 2),
  ('e0000000-0000-0000-0000-000000000001', 'address_history', true, 3),
  ('e0000000-0000-0000-0000-000000000001', 'activity_history', true, 4),
  ('e0000000-0000-0000-0000-000000000001', 'employment_reference', true, 5),
  ('e0000000-0000-0000-0000-000000000001', 'dbs_enhanced', true, 6),
  ('e0000000-0000-0000-0000-000000000001', 'criminal_declaration', true, 7),
  ('e0000000-0000-0000-0000-000000000001', 'financial_declaration', true, 8),
  ('e0000000-0000-0000-0000-000000000001', 'credit_check', false, 9),
  ('e0000000-0000-0000-0000-000000000001', 'directorship_check', false, 10),
  ('e0000000-0000-0000-0000-000000000001', 'media_check', false, 11),
  ('e0000000-0000-0000-0000-000000000001', 'sanctions_check', false, 12);

-- BS7858 Standard (8 check types)
INSERT INTO package_checks (package_id, check_type, is_mandatory, sort_order) VALUES
  ('e0000000-0000-0000-0000-000000000002', 'identity_verification', true, 1),
  ('e0000000-0000-0000-0000-000000000002', 'right_to_work', true, 2),
  ('e0000000-0000-0000-0000-000000000002', 'address_history', true, 3),
  ('e0000000-0000-0000-0000-000000000002', 'activity_history', true, 4),
  ('e0000000-0000-0000-0000-000000000002', 'employment_reference', true, 5),
  ('e0000000-0000-0000-0000-000000000002', 'dbs_basic', true, 6),
  ('e0000000-0000-0000-0000-000000000002', 'criminal_declaration', true, 7),
  ('e0000000-0000-0000-0000-000000000002', 'financial_declaration', true, 8);

-- Basic Pre-Employment (3 check types)
INSERT INTO package_checks (package_id, check_type, is_mandatory, sort_order) VALUES
  ('e0000000-0000-0000-0000-000000000003', 'identity_verification', true, 1),
  ('e0000000-0000-0000-0000-000000000003', 'right_to_work', true, 2),
  ('e0000000-0000-0000-0000-000000000003', 'employment_reference', true, 3);

-- ============================================================
-- 7. CANDIDATES
-- ============================================================
INSERT INTO candidates (id, organisation_id, email, first_name, last_name, date_of_birth, phone, nationality, has_submitted, created_by) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'john.smith@email.com', 'John', 'Smith', '1990-03-15', '07700900001', 'British', true, 'b0000000-0000-0000-0000-000000000004'),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'sarah.jones@email.com', 'Sarah', 'Jones', '1988-11-22', '07700900002', 'British', true, 'b0000000-0000-0000-0000-000000000004'),
  ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'ahmed.hassan@email.com', 'Ahmed', 'Hassan', '1995-07-08', '07700900003', 'British', false, 'b0000000-0000-0000-0000-000000000004'),
  ('f0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'emma.williams@email.com', 'Emma', 'Williams', '1992-01-30', '07700900004', 'British', false, 'b0000000-0000-0000-0000-000000000004'),
  ('f0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'chen.wei@email.com', 'Wei', 'Chen', '1997-09-12', '07700900005', 'Chinese', false, 'b0000000-0000-0000-0000-000000000004');

-- ============================================================
-- 8. CASES (various statuses for testing)
-- ============================================================
INSERT INTO cases (id, organisation_id, client_id, candidate_id, package_id, reference_number, status, priority, assigned_to, sla_due_date, created_by) VALUES
  -- Case 1: Complete (John Smith for Sentinel)
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'IC-2026-00001', 'complete', 'standard', 'b0000000-0000-0000-0000-000000000004', '2026-04-01', 'b0000000-0000-0000-0000-000000000004'),
  -- Case 2: Under review (Sarah Jones for Sentinel)
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'IC-2026-00002', 'under_review', 'urgent', 'b0000000-0000-0000-0000-000000000004', '2026-04-05', 'b0000000-0000-0000-0000-000000000004'),
  -- Case 3: Awaiting candidate (Ahmed for Fortress)
  ('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 'IC-2026-00003', 'awaiting_candidate', 'standard', 'b0000000-0000-0000-0000-000000000004', '2026-04-10', 'b0000000-0000-0000-0000-000000000004'),
  -- Case 4: In progress (Emma for Sentinel)
  ('10000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'IC-2026-00004', 'in_progress', 'standard', 'b0000000-0000-0000-0000-000000000004', '2026-04-12', 'b0000000-0000-0000-0000-000000000004'),
  -- Case 5: New (Wei for Fortress)
  ('10000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000003', 'IC-2026-00005', 'new', 'critical', 'b0000000-0000-0000-0000-000000000004', '2026-04-08', 'b0000000-0000-0000-0000-000000000004');

-- Set outcome on complete case
UPDATE cases SET outcome = 'clear', adjudicated_by = 'b0000000-0000-0000-0000-000000000003', adjudicated_at = now(), completed_at = now() WHERE id = '10000000-0000-0000-0000-000000000001';

-- ============================================================
-- 9. CASE CHECKS (sample checks for cases 1 and 2)
-- ============================================================

-- Case 1 (complete) — all checks passed
INSERT INTO case_checks (case_id, organisation_id, check_type, status, outcome, is_mandatory, assigned_to, completed_at) VALUES
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'identity_verification', 'complete', 'clear', true, 'b0000000-0000-0000-0000-000000000004', now()),
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'right_to_work', 'complete', 'clear', true, 'b0000000-0000-0000-0000-000000000004', now()),
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'address_history', 'complete', 'clear', true, 'b0000000-0000-0000-0000-000000000004', now()),
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'employment_reference', 'complete', 'clear', true, 'b0000000-0000-0000-0000-000000000004', now()),
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'dbs_enhanced', 'complete', 'clear', true, 'b0000000-0000-0000-0000-000000000004', now());

-- Case 2 (under review) — mixed status checks
INSERT INTO case_checks (case_id, organisation_id, check_type, status, outcome, is_mandatory, assigned_to) VALUES
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'identity_verification', 'complete', 'clear', true, 'b0000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'right_to_work', 'complete', 'clear', true, 'b0000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'employment_reference', 'needs_review', null, true, 'b0000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'dbs_enhanced', 'awaiting_third_party', null, true, 'b0000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'criminal_declaration', 'complete', 'clear', true, 'b0000000-0000-0000-0000-000000000004');

-- Case 4 (in progress) — early stage checks
INSERT INTO case_checks (case_id, organisation_id, check_type, status, is_mandatory, assigned_to) VALUES
  ('10000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'identity_verification', 'in_progress', true, 'b0000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'right_to_work', 'not_started', true, 'b0000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'address_history', 'not_started', true, 'b0000000-0000-0000-0000-000000000004');

-- ============================================================
-- 10. SAMPLE TASKS
-- ============================================================
INSERT INTO tasks (organisation_id, case_id, title, description, status, priority, assigned_to, due_date, created_by) VALUES
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Chase DBS result for Sarah Jones', 'DBS enhanced submitted 5 days ago. Follow up with DBS service.', 'pending', 'high', 'b0000000-0000-0000-0000-000000000004', '2026-04-05', 'b0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Review employment reference discrepancy', 'Referee dates differ from candidate-provided dates. Needs investigation.', 'pending', 'urgent', 'b0000000-0000-0000-0000-000000000004', '2026-04-04', 'b0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Send candidate invite to Ahmed Hassan', 'Magic link not yet sent. Client requesting urgent start.', 'in_progress', 'medium', 'b0000000-0000-0000-0000-000000000004', '2026-04-04', 'b0000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'Initiate checks for Wei Chen', 'New critical priority case from Fortress FM. Begin immediately.', 'pending', 'urgent', 'b0000000-0000-0000-0000-000000000004', '2026-04-03', 'b0000000-0000-0000-0000-000000000002');

-- ============================================================
-- 11. SAMPLE NOTES
-- ============================================================
INSERT INTO notes (case_id, organisation_id, content, is_internal, created_by) VALUES
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'All checks completed and verified. Clear outcome. Report generated and sent to client.', true, 'b0000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Employment reference shows a 2-month gap between roles that candidate did not declare. Following up.', true, 'b0000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Your vetting is progressing well. We are waiting for one final reference to come back.', false, 'b0000000-0000-0000-0000-000000000004');

-- ============================================================
-- Done. Sequence needs resetting after seeded reference_numbers.
-- ============================================================
SELECT setval('case_reference_seq', 5);
