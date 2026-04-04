import type { User } from '@supabase/supabase-js';
import { UserType, InternalRole } from '@/types/enums';
import type { AuthUser, AppMetadata } from '@/types/auth';

/**
 * Extract our AuthUser from the raw Supabase User object.
 * Reads user_type, role, organisation_id etc. from app_metadata.
 */
export function extractAuthUser(user: User): AuthUser {
  const meta = (user.app_metadata ?? {}) as Partial<AppMetadata>;

  return {
    id: user.id,
    email: user.email ?? '',
    userType: (meta.user_type as UserType) ?? UserType.Internal,
    role: meta.role as InternalRole | undefined,
    organisationId: meta.organisation_id ?? '',
    candidateId: meta.candidate_id,
    clientId: meta.client_id,
    fullName: user.user_metadata?.full_name,
  };
}
