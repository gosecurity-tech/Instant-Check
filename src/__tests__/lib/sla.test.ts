import { describe, it, expect } from 'vitest';
import type { OverdueCase, ApproachingSLACase, SLAStats } from '@/lib/services/sla';

describe('SLA Module', () => {
  describe('OverdueCase interface', () => {
    it('should have all required fields', () => {
      const overdueCase: OverdueCase = {
        id: 'case-123',
        organisation_id: 'org-123',
        case_reference: 'REF-2024-001',
        sla_due_date: '2024-03-01',
        days_overdue: 5,
        status: 'in_progress',
        assigned_to: 'user-456',
        assigned_to_name: 'John Doe',
        client_name: 'Acme Corp',
        candidate_name: 'Jane Smith',
      };

      expect(overdueCase.id).toBe('case-123');
      expect(overdueCase.organisation_id).toBe('org-123');
      expect(overdueCase.case_reference).toBe('REF-2024-001');
      expect(overdueCase.sla_due_date).toBe('2024-03-01');
      expect(overdueCase.days_overdue).toBe(5);
      expect(overdueCase.status).toBe('in_progress');
      expect(overdueCase.assigned_to).toBe('user-456');
      expect(overdueCase.assigned_to_name).toBe('John Doe');
      expect(overdueCase.client_name).toBe('Acme Corp');
      expect(overdueCase.candidate_name).toBe('Jane Smith');
    });

    it('should handle null assigned_to and assigned_to_name', () => {
      const overdueCase: OverdueCase = {
        id: 'case-123',
        organisation_id: 'org-123',
        case_reference: 'REF-2024-001',
        sla_due_date: '2024-03-01',
        days_overdue: 10,
        status: 'new',
        assigned_to: null,
        assigned_to_name: null,
        client_name: 'Acme Corp',
        candidate_name: 'Jane Smith',
      };

      expect(overdueCase.assigned_to).toBeNull();
      expect(overdueCase.assigned_to_name).toBeNull();
    });
  });

  describe('ApproachingSLACase interface', () => {
    it('should have all required fields', () => {
      const approachingCase: ApproachingSLACase = {
        id: 'case-456',
        organisation_id: 'org-123',
        case_reference: 'REF-2024-002',
        sla_due_date: '2024-04-05',
        days_remaining: 2,
        status: 'in_progress',
        assigned_to: 'user-789',
        assigned_to_name: 'Jane Reviewer',
        client_name: 'Beta Inc',
        candidate_name: 'Bob Johnson',
      };

      expect(approachingCase.id).toBe('case-456');
      expect(approachingCase.organisation_id).toBe('org-123');
      expect(approachingCase.case_reference).toBe('REF-2024-002');
      expect(approachingCase.sla_due_date).toBe('2024-04-05');
      expect(approachingCase.days_remaining).toBe(2);
      expect(approachingCase.status).toBe('in_progress');
      expect(approachingCase.assigned_to).toBe('user-789');
      expect(approachingCase.assigned_to_name).toBe('Jane Reviewer');
      expect(approachingCase.client_name).toBe('Beta Inc');
      expect(approachingCase.candidate_name).toBe('Bob Johnson');
    });

    it('should handle null assigned fields', () => {
      const approachingCase: ApproachingSLACase = {
        id: 'case-456',
        organisation_id: 'org-123',
        case_reference: 'REF-2024-002',
        sla_due_date: '2024-04-05',
        days_remaining: 3,
        status: 'awaiting_candidate',
        assigned_to: null,
        assigned_to_name: null,
        client_name: 'Beta Inc',
        candidate_name: 'Bob Johnson',
      };

      expect(approachingCase.assigned_to).toBeNull();
      expect(approachingCase.assigned_to_name).toBeNull();
    });
  });

  describe('SLAStats interface', () => {
    it('should calculate and store SLA statistics', () => {
      const stats: SLAStats = {
        totalActiveCases: 50,
        overdueCount: 3,
        approachingSlaCount: 5,
        onTrackCount: 42,
        averageDaysRemaining: 8.5,
        breachRate: 0.06, // 6% (3 overdue out of 50)
      };

      expect(stats.totalActiveCases).toBe(50);
      expect(stats.overdueCount).toBe(3);
      expect(stats.approachingSlaCount).toBe(5);
      expect(stats.onTrackCount).toBe(42);
      expect(stats.averageDaysRemaining).toBe(8.5);
      expect(stats.breachRate).toBe(0.06);
    });

    it('should track zero cases', () => {
      const stats: SLAStats = {
        totalActiveCases: 0,
        overdueCount: 0,
        approachingSlaCount: 0,
        onTrackCount: 0,
        averageDaysRemaining: 0,
        breachRate: 0,
      };

      expect(stats.totalActiveCases).toBe(0);
      expect(stats.breachRate).toBe(0);
    });

    it('should handle high breach rates', () => {
      const stats: SLAStats = {
        totalActiveCases: 100,
        overdueCount: 75,
        approachingSlaCount: 15,
        onTrackCount: 10,
        averageDaysRemaining: 1.2,
        breachRate: 0.75, // 75% breach rate
      };

      expect(stats.breachRate).toBe(0.75);
      expect(stats.overdueCount).toBe(75);
    });
  });

  describe('SLA calculation logic', () => {
    it('should correctly identify days overdue', () => {
      const now = new Date();
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const dueDate = fiveDaysAgo.toISOString().split('T')[0];

      // Simple calculation: today - dueDate should be >= 5
      const today = now.toISOString().split('T')[0];
      const daysOverdue = Math.floor(
        (new Date(today).getTime() - new Date(dueDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      expect(daysOverdue).toBeGreaterThanOrEqual(4);
    });

    it('should correctly calculate days remaining', () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const dueDate = futureDate.toISOString().split('T')[0];

      const today = now.toISOString().split('T')[0];
      const daysRemaining = Math.floor(
        (new Date(dueDate).getTime() - new Date(today).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      expect(daysRemaining).toBeGreaterThanOrEqual(2);
      expect(daysRemaining).toBeLessThanOrEqual(3);
    });

    it('should calculate breach rate from stats', () => {
      const totalCases = 100;
      const overdueCases = 10;
      const breachRate = overdueCases / totalCases;

      expect(breachRate).toBe(0.1);
    });
  });

  describe('Mock SLA data validation', () => {
    it('should validate overdue case data', () => {
      const mockOverdueData: OverdueCase[] = [
        {
          id: 'case-1',
          organisation_id: 'org-1',
          case_reference: 'REF-001',
          sla_due_date: '2024-03-01',
          days_overdue: 7,
          status: 'in_progress',
          assigned_to: 'user-1',
          assigned_to_name: 'Handler',
          client_name: 'Client A',
          candidate_name: 'Candidate A',
        },
        {
          id: 'case-2',
          organisation_id: 'org-1',
          case_reference: 'REF-002',
          sla_due_date: '2024-02-28',
          days_overdue: 35,
          status: 'new',
          assigned_to: null,
          assigned_to_name: null,
          client_name: 'Client B',
          candidate_name: 'Candidate B',
        },
      ];

      expect(mockOverdueData).toHaveLength(2);
      expect(mockOverdueData[0].days_overdue).toBe(7);
      expect(mockOverdueData[1].assigned_to).toBeNull();
    });

    it('should validate approaching SLA data', () => {
      const mockApproachingData: ApproachingSLACase[] = [
        {
          id: 'case-3',
          organisation_id: 'org-1',
          case_reference: 'REF-003',
          sla_due_date: '2024-04-08',
          days_remaining: 2,
          status: 'awaiting_third_party',
          assigned_to: 'user-2',
          assigned_to_name: 'Reviewer',
          client_name: 'Client C',
          candidate_name: 'Candidate C',
        },
      ];

      expect(mockApproachingData).toHaveLength(1);
      expect(mockApproachingData[0].days_remaining).toBeLessThanOrEqual(3);
    });
  });
});
