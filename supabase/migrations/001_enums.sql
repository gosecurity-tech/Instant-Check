-- ============================================================
-- MIGRATION 001: ENUM DEFINITIONS
-- ============================================================
-- This migration creates all enum types used throughout the schema.
-- Enums enforce type safety at the database level and ensure
-- consistent vocabulary across the application.
-- ============================================================

-- ============================================================
-- USER & ROLE ENUMS
-- ============================================================

CREATE TYPE user_type AS ENUM (
  'internal',
  'client',
  'candidate'
);

CREATE TYPE internal_role AS ENUM (
  'super_admin',
  'compliance_manager',
  'case_handler',
  'qa_reviewer'
);

-- ============================================================
-- CASE & CHECK ENUMS
-- ============================================================

CREATE TYPE case_status AS ENUM (
  'new',                    -- just created, candidate not yet invited
  'awaiting_candidate',     -- magic link sent, waiting for candidate to complete portal
  'in_progress',            -- candidate submitted, checks being processed
  'awaiting_third_party',   -- blocked on external response (reference, DBS)
  'under_review',           -- all checks done, awaiting QA / adjudication
  'complete',               -- final outcome recorded
  'on_hold',                -- paused (client request, compliance issue)
  'cancelled'               -- cancelled before completion
);

CREATE TYPE case_outcome AS ENUM (
  'clear',
  'clear_with_advisory',
  'insufficient_evidence',
  'adverse_information',
  'failed'
);

CREATE TYPE case_priority AS ENUM (
  'standard',
  'urgent',
  'critical'
);

CREATE TYPE check_type AS ENUM (
  'identity_verification',
  'right_to_work',
  'address_history',
  'activity_history',
  'employment_reference',
  'education_reference',
  'character_reference',
  'dbs_basic',
  'dbs_standard',
  'dbs_enhanced',
  'credit_check',
  'directorship_check',
  'media_check',
  'sanctions_check',
  'criminal_declaration',
  'financial_declaration',
  'health_declaration'
);

CREATE TYPE check_status AS ENUM (
  'not_started',
  'awaiting_candidate',
  'in_progress',
  'awaiting_third_party',
  'needs_review',
  'passed',
  'failed',
  'insufficient_evidence',
  'complete',
  'not_applicable'
);

CREATE TYPE check_outcome AS ENUM (
  'clear',
  'adverse',
  'advisory',
  'insufficient',
  'not_applicable'
);

-- ============================================================
-- CANDIDATE & TIMELINE ENUMS
-- ============================================================

CREATE TYPE activity_type AS ENUM (
  'employed',
  'self_employed',
  'unemployed',
  'education',
  'travel',
  'career_break',
  'maternity_paternity',
  'volunteering',
  'other'
);

CREATE TYPE address_type AS ENUM (
  'residential',
  'correspondence',
  'previous'
);

-- ============================================================
-- DOCUMENT & EVIDENCE ENUMS
-- ============================================================

CREATE TYPE document_type AS ENUM (
  'passport',
  'driving_licence',
  'national_id',
  'birth_certificate',
  'utility_bill',
  'bank_statement',
  'council_tax_bill',
  'tenancy_agreement',
  'mortgage_statement',
  'p45',
  'p60',
  'payslip',
  'employment_contract',
  'education_certificate',
  'professional_certificate',
  'dbs_certificate',
  'right_to_work_evidence',
  'reference_response',
  'other'
);

CREATE TYPE document_status AS ENUM (
  'pending_review',
  'accepted',
  'rejected',
  'expired'
);

-- ============================================================
-- REFERENCE ENUMS
-- ============================================================

CREATE TYPE reference_type AS ENUM (
  'employment',
  'education',
  'character',
  'landlord'
);

CREATE TYPE reference_status AS ENUM (
  'draft',
  'sent',
  'reminder_sent',
  'received',
  'discrepancy_flagged',
  'verified',
  'unresponsive',
  'declined'
);

-- ============================================================
-- RIGHT TO WORK ENUMS
-- ============================================================

CREATE TYPE rtw_check_method AS ENUM (
  'manual_document',
  'idvt',                -- Identity Document Validation Technology
  'employer_checking_service',
  'share_code'
);

CREATE TYPE rtw_status AS ENUM (
  'not_started',
  'document_submitted',
  'under_review',
  'verified',
  'failed',
  'expired'
);

-- ============================================================
-- DBS ENUMS
-- ============================================================

CREATE TYPE dbs_status AS ENUM (
  'not_started',
  'application_submitted',
  'id_verified',
  'sent_to_dbs',
  'received',
  'clear',
  'adverse',
  'disputed'
);

-- ============================================================
-- TASK & NOTIFICATION ENUMS
-- ============================================================

CREATE TYPE task_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE task_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- ============================================================
-- REPORT ENUM
-- ============================================================

CREATE TYPE report_status AS ENUM (
  'generating',
  'ready',
  'failed',
  'archived'
);
