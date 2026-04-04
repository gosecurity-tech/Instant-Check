import { InternalRole, UserType } from '@/types/enums';
import type { AuthUser } from '@/types/auth';

// ============================================================
// Role hierarchy (higher index = more privileges)
// ============================================================
const ROLE_HIERARCHY: InternalRole[] = [
  InternalRole.CaseHandler,
  InternalRole.QAReviewer,
  InternalRole.ComplianceManager,
  InternalRole.SuperAdmin,
];

/**
 * Check if the user's role meets or exceeds the minimum required role.
 * Only meaningful for internal users.
 */
export function hasMinRole(user: AuthUser, minRole: InternalRole): boolean {
  if (user.userType !== UserType.Internal || !user.role) return false;
  return ROLE_HIERARCHY.indexOf(user.role) >= ROLE_HIERARCHY.indexOf(minRole);
}

// ============================================================
// Portal access guards
// ============================================================

export function isInternal(user: AuthUser): boolean {
  return user.userType === UserType.Internal;
}

export function isClient(user: AuthUser): boolean {
  return user.userType === UserType.Client;
}

export function isCandidate(user: AuthUser): boolean {
  return user.userType === UserType.Candidate;
}

export function isSuperAdmin(user: AuthUser): boolean {
  return isInternal(user) && user.role === InternalRole.SuperAdmin;
}

export function isComplianceManager(user: AuthUser): boolean {
  return isInternal(user) && hasMinRole(user, InternalRole.ComplianceManager);
}

// ============================================================
// Feature-level permission checks
// ============================================================

/** Can the user view the audit log? Compliance Manager+ only */
export function canViewAuditLog(user: AuthUser): boolean {
  return hasMinRole(user, InternalRole.ComplianceManager);
}

/** Can the user manage system settings (users, packages)? Super Admin only */
export function canManageSettings(user: AuthUser): boolean {
  return isSuperAdmin(user);
}

/** Can the user create/edit cases? Case Handler+ */
export function canManageCases(user: AuthUser): boolean {
  return hasMinRole(user, InternalRole.CaseHandler);
}

/** Can the user adjudicate (final review) cases? QA Reviewer+ */
export function canAdjudicateCases(user: AuthUser): boolean {
  return hasMinRole(user, InternalRole.QAReviewer);
}

/** Can the user manage client organisations? Compliance Manager+ */
export function canManageClients(user: AuthUser): boolean {
  return hasMinRole(user, InternalRole.ComplianceManager);
}

/** Can the user view DBS details? Compliance Manager+ only (mirrors RLS) */
export function canViewDbsDetails(user: AuthUser): boolean {
  return hasMinRole(user, InternalRole.ComplianceManager);
}

/** Can the user generate final reports? QA Reviewer+ */
export function canGenerateReports(user: AuthUser): boolean {
  return hasMinRole(user, InternalRole.QAReviewer);
}

// ============================================================
// Route → permission mapping (used by middleware & layouts)
// ============================================================

export type PortalType = 'internal' | 'client' | 'candidate' | 'auth' | 'public';

/**
 * Determine which portal a pathname belongs to.
 */
export function getPortalFromPath(pathname: string): PortalType {
  // Auth paths checked FIRST (before /client and /candidate prefix matches)
  if (pathname.startsWith('/login') || pathname.startsWith('/client-login') ||
      pathname.startsWith('/candidate-login') || pathname.startsWith('/forgot-password') ||
      pathname.startsWith('/reset-password') || pathname.startsWith('/auth')) {
    return 'auth';
  }
  // Client portal — all routes under /client/
  if (pathname.startsWith('/client/')) {
    return 'client';
  }
  // Candidate portal — all routes under /candidate/
  if (pathname.startsWith('/candidate/')) {
    return 'candidate';
  }
  // Internal portal — all top-level app routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/cases') ||
      pathname.startsWith('/clients') || pathname.startsWith('/candidates') ||
      pathname.startsWith('/reports') || pathname.startsWith('/audit') ||
      pathname.startsWith('/settings') || pathname.startsWith('/tasks')) {
    return 'internal';
  }
  return 'public';
}

/**
 * Check if a user type is allowed to access a given portal.
 */
export function canAccessPortal(userType: UserType, portal: PortalType): boolean {
  switch (portal) {
    case 'internal':
      return userType === UserType.Internal;
    case 'client':
      return userType === UserType.Client;
    case 'candidate':
      return userType === UserType.Candidate;
    case 'auth':
    case 'public':
      return true;
    default:
      return false;
  }
}

/**
 * Get the default redirect path for a user type after login.
 */
export function getDefaultRedirect(userType: UserType): string {
  switch (userType) {
    case UserType.Internal:
      return '/dashboard';
    case UserType.Client:
      return '/client/dashboard';
    case UserType.Candidate:
      return '/candidate/identity';
    default:
      return '/login';
  }
}

/**
 * Get the login path for a user type.
 */
export function getLoginPath(userType?: UserType): string {
  switch (userType) {
    case UserType.Client:
      return '/client-login';
    case UserType.Candidate:
      return '/candidate-login';
    default:
      return '/login';
  }
}
