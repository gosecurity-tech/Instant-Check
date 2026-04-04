import { describe, it, expect } from 'vitest';
import {
  hasMinRole,
  canGenerateReports,
  canViewAuditLog,
  canManageSettings,
  getPortalFromPath,
  canAccessPortal,
} from '@/lib/permissions';
import { InternalRole, UserType } from '@/types/enums';
import type { AuthUser } from '@/types/auth';

const mockInternalUser = (role: InternalRole): AuthUser => ({
  id: 'user-123',
  email: 'user@example.com',
  userType: UserType.Internal,
  role,
  organisationId: 'org-123',
});

const mockClientUser = (): AuthUser => ({
  id: 'client-123',
  email: 'client@example.com',
  userType: UserType.Client,
  organisationId: 'org-123',
  clientId: 'client-id-123',
});

const mockCandidateUser = (): AuthUser => ({
  id: 'candidate-123',
  email: 'candidate@example.com',
  userType: UserType.Candidate,
  organisationId: 'org-123',
  candidateId: 'candidate-id-123',
});

describe('Permissions Module', () => {
  describe('hasMinRole', () => {
    it('should return true when user role meets minimum requirement', () => {
      const user = mockInternalUser(InternalRole.CaseHandler);
      expect(hasMinRole(user, InternalRole.CaseHandler)).toBe(true);
    });

    it('should return true when user role exceeds minimum requirement', () => {
      const user = mockInternalUser(InternalRole.SuperAdmin);
      expect(hasMinRole(user, InternalRole.CaseHandler)).toBe(true);
    });

    it('should return false when user role is below minimum requirement', () => {
      const user = mockInternalUser(InternalRole.CaseHandler);
      expect(hasMinRole(user, InternalRole.QAReviewer)).toBe(false);
    });

    it('should return false for non-internal users', () => {
      const user = mockClientUser();
      expect(hasMinRole(user, InternalRole.CaseHandler)).toBe(false);
    });
  });

  describe('canGenerateReports', () => {
    it('should return true for QAReviewer', () => {
      const user = mockInternalUser(InternalRole.QAReviewer);
      expect(canGenerateReports(user)).toBe(true);
    });

    it('should return true for ComplianceManager', () => {
      const user = mockInternalUser(InternalRole.ComplianceManager);
      expect(canGenerateReports(user)).toBe(true);
    });

    it('should return true for SuperAdmin', () => {
      const user = mockInternalUser(InternalRole.SuperAdmin);
      expect(canGenerateReports(user)).toBe(true);
    });

    it('should return false for CaseHandler', () => {
      const user = mockInternalUser(InternalRole.CaseHandler);
      expect(canGenerateReports(user)).toBe(false);
    });

    it('should return false for Client users', () => {
      const user = mockClientUser();
      expect(canGenerateReports(user)).toBe(false);
    });

    it('should return false for Candidate users', () => {
      const user = mockCandidateUser();
      expect(canGenerateReports(user)).toBe(false);
    });
  });

  describe('canViewAuditLog', () => {
    it('should return true for ComplianceManager', () => {
      const user = mockInternalUser(InternalRole.ComplianceManager);
      expect(canViewAuditLog(user)).toBe(true);
    });

    it('should return true for SuperAdmin', () => {
      const user = mockInternalUser(InternalRole.SuperAdmin);
      expect(canViewAuditLog(user)).toBe(true);
    });

    it('should return false for QAReviewer', () => {
      const user = mockInternalUser(InternalRole.QAReviewer);
      expect(canViewAuditLog(user)).toBe(false);
    });

    it('should return false for CaseHandler', () => {
      const user = mockInternalUser(InternalRole.CaseHandler);
      expect(canViewAuditLog(user)).toBe(false);
    });

    it('should return false for non-internal users', () => {
      const user = mockClientUser();
      expect(canViewAuditLog(user)).toBe(false);
    });
  });

  describe('canManageSettings', () => {
    it('should return true for SuperAdmin only', () => {
      const user = mockInternalUser(InternalRole.SuperAdmin);
      expect(canManageSettings(user)).toBe(true);
    });

    it('should return false for ComplianceManager', () => {
      const user = mockInternalUser(InternalRole.ComplianceManager);
      expect(canManageSettings(user)).toBe(false);
    });

    it('should return false for QAReviewer', () => {
      const user = mockInternalUser(InternalRole.QAReviewer);
      expect(canManageSettings(user)).toBe(false);
    });

    it('should return false for CaseHandler', () => {
      const user = mockInternalUser(InternalRole.CaseHandler);
      expect(canManageSettings(user)).toBe(false);
    });

    it('should return false for Client users', () => {
      const user = mockClientUser();
      expect(canManageSettings(user)).toBe(false);
    });
  });

  describe('getPortalFromPath', () => {
    it('should return internal for internal routes', () => {
      expect(getPortalFromPath('/dashboard')).toBe('internal');
      expect(getPortalFromPath('/cases')).toBe('internal');
      expect(getPortalFromPath('/clients')).toBe('internal');
      expect(getPortalFromPath('/audit')).toBe('internal');
      expect(getPortalFromPath('/settings')).toBe('internal');
    });

    it('should return client for client routes', () => {
      expect(getPortalFromPath('/client/dashboard')).toBe('client');
      expect(getPortalFromPath('/client/cases')).toBe('client');
    });

    it('should return candidate for candidate routes', () => {
      expect(getPortalFromPath('/candidate/identity')).toBe('candidate');
      expect(getPortalFromPath('/candidate/address')).toBe('candidate');
    });

    it('should return auth for auth routes', () => {
      expect(getPortalFromPath('/login')).toBe('auth');
      expect(getPortalFromPath('/client-login')).toBe('auth');
      expect(getPortalFromPath('/candidate-login')).toBe('auth');
      expect(getPortalFromPath('/forgot-password')).toBe('auth');
    });

    it('should return public for unknown routes', () => {
      expect(getPortalFromPath('/unknown')).toBe('public');
      expect(getPortalFromPath('/')).toBe('public');
    });
  });

  describe('canAccessPortal', () => {
    it('should allow internal users to access internal portal', () => {
      expect(canAccessPortal(UserType.Internal, 'internal')).toBe(true);
    });

    it('should prevent non-internal users from accessing internal portal', () => {
      expect(canAccessPortal(UserType.Client, 'internal')).toBe(false);
      expect(canAccessPortal(UserType.Candidate, 'internal')).toBe(false);
    });

    it('should allow client users to access client portal', () => {
      expect(canAccessPortal(UserType.Client, 'client')).toBe(true);
    });

    it('should prevent non-client users from accessing client portal', () => {
      expect(canAccessPortal(UserType.Internal, 'client')).toBe(false);
      expect(canAccessPortal(UserType.Candidate, 'client')).toBe(false);
    });

    it('should allow candidate users to access candidate portal', () => {
      expect(canAccessPortal(UserType.Candidate, 'candidate')).toBe(true);
    });

    it('should prevent non-candidate users from accessing candidate portal', () => {
      expect(canAccessPortal(UserType.Internal, 'candidate')).toBe(false);
      expect(canAccessPortal(UserType.Client, 'candidate')).toBe(false);
    });

    it('should allow all users to access auth portal', () => {
      expect(canAccessPortal(UserType.Internal, 'auth')).toBe(true);
      expect(canAccessPortal(UserType.Client, 'auth')).toBe(true);
      expect(canAccessPortal(UserType.Candidate, 'auth')).toBe(true);
    });

    it('should allow all users to access public portal', () => {
      expect(canAccessPortal(UserType.Internal, 'public')).toBe(true);
      expect(canAccessPortal(UserType.Client, 'public')).toBe(true);
      expect(canAccessPortal(UserType.Candidate, 'public')).toBe(true);
    });
  });
});
