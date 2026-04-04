import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuditAction, AuditEntityType, AuditEntry } from '@/lib/audit';
import { recordAuditLog } from '@/lib/audit';

// Mock the Supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}));

describe('Audit Module', () => {
  describe('AuditAction type', () => {
    it('should include case-related actions', () => {
      const actions: AuditAction[] = [
        'case.created',
        'case.status_changed',
        'case.assigned',
        'case.reassigned',
        'case.adjudicated',
        'case.reopened',
        'case.cancelled',
      ];
      expect(actions).toBeDefined();
      expect(actions.length).toBe(7);
    });

    it('should include check-related actions', () => {
      const actions: AuditAction[] = [
        'check.status_changed',
        'check.evidence_uploaded',
        'check.reviewed',
        'check.decision_recorded',
      ];
      expect(actions).toBeDefined();
    });

    it('should include candidate-related actions', () => {
      const actions: AuditAction[] = [
        'candidate.invited',
        'candidate.submitted',
        'candidate.data_updated',
        'candidate.locked',
      ];
      expect(actions).toBeDefined();
    });

    it('should include document-related actions', () => {
      const actions: AuditAction[] = [
        'document.uploaded',
        'document.viewed',
        'document.deleted',
      ];
      expect(actions).toBeDefined();
    });

    it('should include reference-related actions', () => {
      const actions: AuditAction[] = [
        'reference.requested',
        'reference.reminder_sent',
        'reference.response_received',
        'reference.discrepancy_flagged',
      ];
      expect(actions).toBeDefined();
    });

    it('should include RTW-related actions', () => {
      const actions: AuditAction[] = [
        'rtw.created',
        'rtw.document_submitted',
        'rtw.reviewed',
        'rtw.verified',
        'rtw.failed',
        'rtw.expired',
      ];
      expect(actions).toBeDefined();
    });

    it('should include DBS-related actions', () => {
      const actions: AuditAction[] = [
        'dbs.created',
        'dbs.application_submitted',
        'dbs.id_verified',
        'dbs.sent_to_dbs',
        'dbs.received',
        'dbs.reviewed',
      ];
      expect(actions).toBeDefined();
    });

    it('should include user-related actions', () => {
      const actions: AuditAction[] = [
        'user_created',
        'user.role_changed',
        'user_deactivated',
        'user_reactivated',
        'user.login',
        'user.failed_login',
      ];
      expect(actions).toBeDefined();
    });

    it('should include client-related actions', () => {
      const actions: AuditAction[] = [
        'client.created',
        'client.updated',
        'client.package_changed',
        'client.user_added',
        'client.user_removed',
      ];
      expect(actions).toBeDefined();
    });

    it('should include report-related actions', () => {
      const actions: AuditAction[] = [
        'report.generated',
        'report.downloaded',
        'report.shared',
      ];
      expect(actions).toBeDefined();
    });

    it('should include system-related actions', () => {
      const actions: AuditAction[] = [
        'system.settings_changed',
        'system.sla_threshold_changed',
      ];
      expect(actions).toBeDefined();
    });
  });

  describe('AuditEntityType', () => {
    it('should include all expected entity types', () => {
      const types: AuditEntityType[] = [
        'case',
        'case_check',
        'candidate',
        'document',
        'reference_request',
        'reference_response',
        'internal_user',
        'client_user',
        'client',
        'report',
        'screening_package',
        'organisation',
        'right_to_work_check',
        'dbs_check',
        'system',
      ];
      expect(types).toBeDefined();
      expect(types.length).toBe(15);
    });
  });

  describe('AuditEntry interface', () => {
    it('should have required properties', () => {
      const entry: AuditEntry = {
        action: 'case.created',
        entityType: 'case',
        entityId: 'case-123',
      };
      expect(entry.action).toBe('case.created');
      expect(entry.entityType).toBe('case');
      expect(entry.entityId).toBe('case-123');
    });

    it('should support optional organisationId', () => {
      const entry: AuditEntry = {
        action: 'case.created',
        entityType: 'case',
        entityId: 'case-123',
        organisationId: 'org-123',
      };
      expect(entry.organisationId).toBe('org-123');
    });

    it('should support optional metadata', () => {
      const entry: AuditEntry = {
        action: 'case.status_changed',
        entityType: 'case',
        entityId: 'case-123',
        metadata: { oldStatus: 'new', newStatus: 'in_progress' },
      };
      expect(entry.metadata).toBeDefined();
      expect((entry.metadata as any).oldStatus).toBe('new');
    });
  });

  describe('recordAuditLog function', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should accept AuthUser actor', async () => {
      const actor = {
        id: 'user-123',
        email: 'user@example.com',
        userType: 'internal',
        role: 'super_admin',
        organisationId: 'org-123',
      };

      const entry: AuditEntry = {
        action: 'case.created',
        entityType: 'case',
        entityId: 'case-123',
      };

      await recordAuditLog(actor, entry);
      expect(recordAuditLog).toBeDefined();
    });

    it('should accept minimal actor with id and organisationId', async () => {
      const actor = {
        id: 'user-123',
        organisationId: 'org-123',
      };

      const entry: AuditEntry = {
        action: 'case.created',
        entityType: 'case',
        entityId: 'case-123',
      };

      await recordAuditLog(actor, entry);
      expect(recordAuditLog).toBeDefined();
    });

    it('should handle audit entries with metadata', async () => {
      const actor = { id: 'user-123', organisationId: 'org-123' };
      const entry: AuditEntry = {
        action: 'case.status_changed',
        entityType: 'case',
        entityId: 'case-123',
        metadata: {
          oldStatus: 'new',
          newStatus: 'in_progress',
        },
      };

      await recordAuditLog(actor, entry);
      expect(recordAuditLog).toBeDefined();
    });
  });
});
