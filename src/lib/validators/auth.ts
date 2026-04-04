import { z } from 'zod';
import { UserType, InternalRole } from '@/types/enums';

// ============================================================
// Login schemas
// ============================================================

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const magicLinkSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;

// ============================================================
// Password reset schemas
// ============================================================

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ============================================================
// User invitation schemas
// ============================================================

export const inviteInternalUserSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .max(200, 'Name is too long'),
  role: z.nativeEnum(InternalRole, {
    error: 'Please select a valid role',
  }),
  organisationId: z.string().uuid('Invalid organisation ID'),
});
export type InviteInternalUserInput = z.infer<typeof inviteInternalUserSchema>;

export const inviteClientUserSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .max(200, 'Name is too long'),
  clientId: z.string().uuid('Invalid client ID'),
  organisationId: z.string().uuid('Invalid organisation ID'),
});
export type InviteClientUserInput = z.infer<typeof inviteClientUserSchema>;

export const inviteCandidateSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .max(200, 'Name is too long'),
  candidateId: z.string().uuid('Invalid candidate ID'),
  caseId: z.string().uuid('Invalid case ID'),
  organisationId: z.string().uuid('Invalid organisation ID'),
});
export type InviteCandidateInput = z.infer<typeof inviteCandidateSchema>;

// ============================================================
// Change password schema (for authenticated users)
// ============================================================

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      ),
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
