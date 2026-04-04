'use client';

import { useMemo } from 'react';
import { useAuthContext } from '@/components/providers/AuthProvider';
import {
  hasMinRole,
  isInternal,
  isClient,
  isCandidate,
  isSuperAdmin,
  canViewAuditLog,
  canManageSettings,
  canManageCases,
  canAdjudicateCases,
  canManageClients,
  canViewDbsDetails,
  canGenerateReports,
} from '@/lib/permissions';
import { InternalRole } from '@/types/enums';

// ============================================================
// Permission check hook
// Returns a memoised object of boolean permissions for the
// current user. Re-computes only when the user changes.
// ============================================================

export interface UserPermissions {
  // Portal checks
  isInternal: boolean;
  isClient: boolean;
  isCandidate: boolean;
  isSuperAdmin: boolean;
  isAuthenticated: boolean;

  // Feature permissions
  canViewAuditLog: boolean;
  canManageSettings: boolean;
  canManageCases: boolean;
  canAdjudicateCases: boolean;
  canManageClients: boolean;
  canViewDbsDetails: boolean;
  canGenerateReports: boolean;

  // Role hierarchy check
  hasMinRole: (role: InternalRole) => boolean;
}

export function usePermissions(): UserPermissions {
  const { user } = useAuthContext();

  return useMemo<UserPermissions>(() => {
    if (!user) {
      return {
        isInternal: false,
        isClient: false,
        isCandidate: false,
        isSuperAdmin: false,
        isAuthenticated: false,
        canViewAuditLog: false,
        canManageSettings: false,
        canManageCases: false,
        canAdjudicateCases: false,
        canManageClients: false,
        canViewDbsDetails: false,
        canGenerateReports: false,
        hasMinRole: () => false,
      };
    }

    return {
      isInternal: isInternal(user),
      isClient: isClient(user),
      isCandidate: isCandidate(user),
      isSuperAdmin: isSuperAdmin(user),
      isAuthenticated: true,
      canViewAuditLog: canViewAuditLog(user),
      canManageSettings: canManageSettings(user),
      canManageCases: canManageCases(user),
      canAdjudicateCases: canAdjudicateCases(user),
      canManageClients: canManageClients(user),
      canViewDbsDetails: canViewDbsDetails(user),
      canGenerateReports: canGenerateReports(user),
      hasMinRole: (role: InternalRole) => hasMinRole(user, role),
    };
  }, [user]);
}
