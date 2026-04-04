import { UserType, InternalRole } from './enums';

/**
 * Shape of the JWT app_metadata we store in Supabase Auth.
 * Set during user creation / invite flow via the admin client.
 */
export interface AppMetadata {
  user_type: UserType;
  role?: InternalRole;          // Only set for internal users
  organisation_id: string;      // UUID — present on all users
  candidate_id?: string;        // UUID — only for candidate users
  client_id?: string;           // UUID — only for client users
}

/**
 * Minimal representation of the authenticated user
 * used throughout the app after extracting from Supabase session.
 */
export interface AuthUser {
  id: string;                   // Supabase auth.uid()
  email: string;
  userType: UserType;
  role?: InternalRole;
  organisationId: string;
  candidateId?: string;
  clientId?: string;
  fullName?: string;
}
