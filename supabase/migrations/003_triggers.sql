-- ============================================================
-- MIGRATION 003: TRIGGER DEFINITIONS
-- ============================================================
-- This migration creates:
-- 1. Auto-update triggers for updated_at timestamps
-- 2. Case reference number sequence and generation trigger
-- ============================================================

-- ============================================================
-- SECTION 4: AUTO-UPDATED TIMESTAMPS TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
      AND table_name != 'audit_logs'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- SECTION 5: CASE REFERENCE NUMBER GENERATOR
-- ============================================================

CREATE SEQUENCE case_reference_seq START 1;

CREATE OR REPLACE FUNCTION generate_case_reference()
RETURNS TRIGGER AS $$
BEGIN
  NEW.reference_number := 'IC-' || EXTRACT(YEAR FROM now())::TEXT || '-' ||
                          LPAD(nextval('case_reference_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cases_reference
  BEFORE INSERT ON cases
  FOR EACH ROW
  WHEN (NEW.reference_number IS NULL)
  EXECUTE FUNCTION generate_case_reference();
