'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UserType, InternalRole } from '@/types/enums';
import { getDefaultRedirect } from '@/lib/permissions';
import {
  loginSchema,
  magicLinkSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  inviteInternalUserSchema,
  inviteClientUserSchema,
  inviteCandidateSchema,
  type LoginInput,
  type MagicLinkInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type InviteInternalUserInput,
  type InviteClientUserInput,
  type InviteCandidateInput,
} from '@/lib/validators/auth';

// ============================================================
// Shared types for action responses
// ============================================================

export type ActionResult = {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
};

// ============================================================
// Sign In — Internal & Client (email/password)
// ============================================================

export async function signInWithPassword(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Generic message to prevent email enumeration
    return { success: false, error: 'Invalid email or password' };
  }

  return { success: true };
}

// ============================================================
// Sign In — Candidate (magic link / OTP)
// ============================================================

export async function signInWithMagicLink(
  input: MagicLinkInput,
  redirectUrl: string,
): Promise<ActionResult> {
  const parsed = magicLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: redirectUrl,
    },
  });

  if (error) {
    return { success: false, error: 'Unable to send magic link. Please try again.' };
  }

  return { success: true };
}

// ============================================================
// Sign Out
// ============================================================

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

// ============================================================
// Forgot Password — send reset email
// ============================================================

export async function sendPasswordReset(
  input: ForgotPasswordInput,
  redirectUrl: string,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: redirectUrl,
  });

  if (error) {
    // Don't reveal whether the email exists
    console.error('Password reset error:', error.message);
  }

  // Always return success to prevent email enumeration
  return { success: true };
}

// ============================================================
// Reset Password — set new password (after clicking reset link)
// ============================================================

export async function resetPassword(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: 'Unable to update password. Please try again.' };
  }

  return { success: true };
}

// ============================================================
// Invite Internal User (Super Admin only)
// Creates auth.users entry + internal_users row
// ============================================================

export async function inviteInternalUser(
  input: InviteInternalUserInput,
): Promise<ActionResult> {
  const parsed = inviteInternalUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Verify caller is Super Admin
  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();

  if (
    !caller ||
    caller.app_metadata?.user_type !== UserType.Internal ||
    caller.app_metadata?.role !== InternalRole.SuperAdmin
  ) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const admin = createAdminClient();
  const { email, fullName, role, organisationId } = parsed.data;

  // Create auth user with app_metadata
  const { data: newUser, error: createError } =
    await admin.auth.admin.createUser({
      email,
      email_confirm: true, // Auto-confirm — they'll set password via invite link
      user_metadata: { full_name: fullName },
      app_metadata: {
        user_type: UserType.Internal,
        role,
        organisation_id: organisationId,
      },
    });

  if (createError) {
    if (createError.message.includes('already been registered')) {
      return { success: false, error: 'A user with this email already exists' };
    }
    console.error('Create internal user error:', createError);
    return { success: false, error: 'Failed to create user' };
  }

  // Create the internal_users profile row
  const { error: profileError } = await admin
    .from('internal_users')
    .insert({
      id: newUser.user.id,
      organisation_id: organisationId,
      email,
      full_name: fullName,
      role,
      is_active: true,
    });

  if (profileError) {
    // Rollback: delete the auth user
    await admin.auth.admin.deleteUser(newUser.user.id);
    console.error('Create internal user profile error:', profileError);
    return { success: false, error: 'Failed to create user profile' };
  }

  // Send invite email so the user can set their password
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?redirectTo=/dashboard`,
  });

  if (inviteError) {
    console.error('Invite email error:', inviteError);
    // User is created but invite failed — don't rollback, admin can resend
  }

  // Log to audit
  await admin.from('audit_logs').insert({
    actor_id: caller.id,
    action: 'user_created',
    entity_type: 'internal_user',
    entity_id: newUser.user.id,
    organisation_id: organisationId,
    metadata: { email, role, full_name: fullName },
  });

  revalidatePath('/settings/users');
  return { success: true, data: { userId: newUser.user.id } };
}

// ============================================================
// Invite Client User (Compliance Manager+ only)
// Creates auth.users entry + client_users row
// ============================================================

export async function inviteClientUser(
  input: InviteClientUserInput,
): Promise<ActionResult> {
  const parsed = inviteClientUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Verify caller has permission (Compliance Manager+)
  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();

  if (
    !caller ||
    caller.app_metadata?.user_type !== UserType.Internal
  ) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const callerRole = caller.app_metadata?.role as InternalRole;
  const allowedRoles = [InternalRole.ComplianceManager, InternalRole.SuperAdmin];
  if (!allowedRoles.includes(callerRole)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const admin = createAdminClient();
  const { email, fullName, clientId, organisationId } = parsed.data;

  // Create auth user
  const { data: newUser, error: createError } =
    await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: {
        user_type: UserType.Client,
        role: 'client_user',
        organisation_id: organisationId,
        client_id: clientId,
      },
    });

  if (createError) {
    if (createError.message.includes('already been registered')) {
      return { success: false, error: 'A user with this email already exists' };
    }
    console.error('Create client user error:', createError);
    return { success: false, error: 'Failed to create user' };
  }

  // Create client_users profile row
  const { error: profileError } = await admin
    .from('client_users')
    .insert({
      id: newUser.user.id,
      client_id: clientId,
      organisation_id: organisationId,
      email,
      full_name: fullName,
      is_active: true,
    });

  if (profileError) {
    await admin.auth.admin.deleteUser(newUser.user.id);
    console.error('Create client user profile error:', profileError);
    return { success: false, error: 'Failed to create user profile' };
  }

  // Send invite
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?redirectTo=/client/dashboard`,
  });

  if (inviteError) {
    console.error('Client invite email error:', inviteError);
  }

  // Audit log
  await admin.from('audit_logs').insert({
    actor_id: caller.id,
    action: 'user_created',
    entity_type: 'client_user',
    entity_id: newUser.user.id,
    organisation_id: organisationId,
    metadata: { email, client_id: clientId, full_name: fullName },
  });

  revalidatePath('/clients');
  return { success: true, data: { userId: newUser.user.id } };
}

// ============================================================
// Send Candidate Magic Link
// Links existing candidate record to auth.users, then sends OTP
// ============================================================

export async function sendCandidateMagicLink(
  input: InviteCandidateInput,
): Promise<ActionResult> {
  const parsed = inviteCandidateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Verify caller is internal
  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();

  if (!caller || caller.app_metadata?.user_type !== UserType.Internal) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const admin = createAdminClient();
  const { email, fullName, candidateId, caseId, organisationId } = parsed.data;

  // Check if auth user already exists for this email
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u) => u.email === email);

  let authUserId: string;

  if (existingUser) {
    // Update existing user's app_metadata
    const { error: updateError } = await admin.auth.admin.updateUserById(
      existingUser.id,
      {
        app_metadata: {
          user_type: UserType.Candidate,
          role: 'candidate',
          organisation_id: organisationId,
          candidate_id: candidateId,
        },
      },
    );
    if (updateError) {
      console.error('Update candidate metadata error:', updateError);
      return { success: false, error: 'Failed to update candidate access' };
    }
    authUserId = existingUser.id;
  } else {
    // Create new auth user for candidate (no password — magic link only)
    const { data: newUser, error: createError } =
      await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: fullName },
        app_metadata: {
          user_type: UserType.Candidate,
          role: 'candidate',
          organisation_id: organisationId,
          candidate_id: candidateId,
        },
      });

    if (createError) {
      console.error('Create candidate auth user error:', createError);
      return { success: false, error: 'Failed to create candidate access' };
    }
    authUserId = newUser.user.id;
  }

  // Link the candidate record to the auth user
  const { error: linkError } = await admin
    .from('candidates')
    .update({ auth_user_id: authUserId })
    .eq('id', candidateId);

  if (linkError) {
    console.error('Link candidate to auth error:', linkError);
  }

  // Update case status to awaiting_candidate
  await admin
    .from('cases')
    .update({ status: 'awaiting_candidate' })
    .eq('id', caseId)
    .eq('status', 'new');

  // Send magic link OTP email
  const { error: otpError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?redirectTo=/candidate/identity`,
    },
  });

  if (otpError) {
    console.error('Magic link generation error:', otpError);
    return { success: false, error: 'Failed to send magic link email' };
  }

  // Audit log
  await admin.from('audit_logs').insert({
    actor_id: caller.id,
    action: 'candidate_invited',
    entity_type: 'candidate',
    entity_id: candidateId,
    organisation_id: organisationId,
    metadata: { email, case_id: caseId },
  });

  revalidatePath(`/cases/${caseId}`);
  return { success: true, data: { authUserId } };
}

// ============================================================
// Resend Invite
// ============================================================

export async function resendInvite(userId: string): Promise<ActionResult> {
  // Verify caller is internal
  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();

  if (!caller || caller.app_metadata?.user_type !== UserType.Internal) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const admin = createAdminClient();
  const { data: targetUser, error: fetchError } =
    await admin.auth.admin.getUserById(userId);

  if (fetchError || !targetUser?.user) {
    return { success: false, error: 'User not found' };
  }

  const userType = targetUser.user.app_metadata?.user_type as UserType;
  const redirectPath = getDefaultRedirect(userType);

  if (userType === UserType.Candidate) {
    // Resend magic link
    const { error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.user.email!,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?redirectTo=${redirectPath}`,
      },
    });
    if (error) return { success: false, error: 'Failed to resend magic link' };
  } else {
    // Resend invite for password-based users
    const { error } = await admin.auth.admin.inviteUserByEmail(
      targetUser.user.email!,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?redirectTo=${redirectPath}`,
      },
    );
    if (error) return { success: false, error: 'Failed to resend invite' };
  }

  return { success: true };
}

// ============================================================
// Deactivate User (Super Admin only)
// ============================================================

export async function deactivateUser(userId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();

  if (
    !caller ||
    caller.app_metadata?.user_type !== UserType.Internal ||
    caller.app_metadata?.role !== InternalRole.SuperAdmin
  ) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (caller.id === userId) {
    return { success: false, error: 'You cannot deactivate yourself' };
  }

  const admin = createAdminClient();

  // Get the user to determine type
  const { data: targetUser, error: fetchError } =
    await admin.auth.admin.getUserById(userId);

  if (fetchError || !targetUser?.user) {
    return { success: false, error: 'User not found' };
  }

  const userType = targetUser.user.app_metadata?.user_type as UserType;

  // Ban the auth user (prevents login)
  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: '876600h', // ~100 years
  });

  if (banError) {
    return { success: false, error: 'Failed to deactivate user' };
  }

  // Set is_active = false in the profile table
  const profileTable =
    userType === UserType.Internal ? 'internal_users' : 'client_users';

  await admin.from(profileTable).update({ is_active: false }).eq('id', userId);

  // Audit log
  await admin.from('audit_logs').insert({
    actor_id: caller.id,
    action: 'user_deactivated',
    entity_type: profileTable.replace('_users', '_user'),
    entity_id: userId,
    organisation_id: caller.app_metadata?.organisation_id,
    metadata: { email: targetUser.user.email },
  });

  revalidatePath('/settings/users');
  return { success: true };
}

// ============================================================
// Reactivate User (Super Admin only)
// ============================================================

export async function reactivateUser(userId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();

  if (
    !caller ||
    caller.app_metadata?.user_type !== UserType.Internal ||
    caller.app_metadata?.role !== InternalRole.SuperAdmin
  ) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const admin = createAdminClient();

  const { data: targetUser, error: fetchError } =
    await admin.auth.admin.getUserById(userId);

  if (fetchError || !targetUser?.user) {
    return { success: false, error: 'User not found' };
  }

  const userType = targetUser.user.app_metadata?.user_type as UserType;

  // Unban
  const { error: unbanError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  });

  if (unbanError) {
    return { success: false, error: 'Failed to reactivate user' };
  }

  const profileTable =
    userType === UserType.Internal ? 'internal_users' : 'client_users';

  await admin.from(profileTable).update({ is_active: true }).eq('id', userId);

  // Audit log
  await admin.from('audit_logs').insert({
    actor_id: caller.id,
    action: 'user_reactivated',
    entity_type: profileTable.replace('_users', '_user'),
    entity_id: userId,
    organisation_id: caller.app_metadata?.organisation_id,
    metadata: { email: targetUser.user.email },
  });

  revalidatePath('/settings/users');
  return { success: true };
}
