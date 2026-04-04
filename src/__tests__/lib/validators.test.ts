import { describe, it, expect } from 'vitest';
import {
  adjudicationSchema,
  caseNoteSchema,
  rtwCreateSchema,
  dbsApplicationSchema,
  referenceResponseSchema,
} from '@/lib/validators/domain';
import { CaseOutcome, RtwCheckMethod } from '@/types/enums';

describe('Validators - Domain Schemas', () => {
  describe('adjudicationSchema', () => {
    it('should pass with valid data', () => {
      const data = {
        outcome: CaseOutcome.Clear,
        notes: 'All checks passed successfully',
      };
      const result = adjudicationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should fail when outcome is missing', () => {
      const data = {
        notes: 'Some notes',
      };
      const result = adjudicationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should fail with invalid outcome value', () => {
      const data = {
        outcome: 'invalid_outcome',
        notes: 'Some notes',
      };
      const result = adjudicationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept all valid CaseOutcome values', () => {
      const outcomes = [
        CaseOutcome.Clear,
        CaseOutcome.ClearWithAdvisory,
        CaseOutcome.InsufficientEvidence,
        CaseOutcome.AdverseInformation,
        CaseOutcome.Failed,
      ];

      outcomes.forEach((outcome) => {
        const data = { outcome };
        const result = adjudicationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('caseNoteSchema', () => {
    it('should pass with valid data', () => {
      const data = {
        content: 'This is a valid case note',
        isInternal: true,
      };
      const result = caseNoteSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should fail when content is empty', () => {
      const data = {
        content: '',
        isInternal: true,
      };
      const result = caseNoteSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should fail when content is missing', () => {
      const data = {
        isInternal: true,
      };
      const result = caseNoteSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should use isInternal default of true', () => {
      const data = {
        content: 'A note without specifying isInternal',
      };
      const result = caseNoteSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isInternal).toBe(true);
      }
    });
  });

  describe('rtwCreateSchema', () => {
    it('should pass with valid check method', () => {
      const data = {
        checkMethod: RtwCheckMethod.ManualDocument,
      };
      const result = rtwCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should fail when checkMethod is missing', () => {
      const data = {};
      const result = rtwCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should fail with invalid check method', () => {
      const data = {
        checkMethod: 'invalid_method',
      };
      const result = rtwCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept all valid RtwCheckMethod values', () => {
      const methods = [
        RtwCheckMethod.ManualDocument,
        RtwCheckMethod.Idvt,
        RtwCheckMethod.EmployerCheckingService,
        RtwCheckMethod.ShareCode,
      ];

      methods.forEach((method) => {
        const data = { checkMethod: method };
        const result = rtwCreateSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('dbsApplicationSchema', () => {
    it('should pass with valid data', () => {
      const data = {
        applicationReference: 'DBS-2024-001',
      };
      const result = dbsApplicationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should fail when applicationReference is missing', () => {
      const data = {};
      const result = dbsApplicationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should fail with empty application reference', () => {
      const data = {
        applicationReference: '',
      };
      const result = dbsApplicationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject reference exceeding max length', () => {
      const data = {
        applicationReference: 'A'.repeat(201),
      };
      const result = dbsApplicationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('referenceResponseSchema', () => {
    const validData = {
      respondentName: 'John Doe',
      respondentEmail: 'john@example.com',
      respondentJobTitle: 'Manager',
      candidateKnown: true,
      datesConfirmed: true,
    };

    it('should pass with valid data', () => {
      const result = referenceResponseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should fail when respondentName is missing', () => {
      const data = { ...validData };
      delete (data as any).respondentName;
      const result = referenceResponseSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should fail with invalid email', () => {
      const data = {
        ...validData,
        respondentEmail: 'invalid-email',
      };
      const result = referenceResponseSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should fail when candidateKnown is missing', () => {
      const data = { ...validData };
      delete (data as any).candidateKnown;
      const result = referenceResponseSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const data = {
        respondentName: 'Jane Smith',
        respondentEmail: 'jane@example.com',
        candidateKnown: true,
        datesConfirmed: false,
      };
      const result = referenceResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});
