// Barrel exports for auth module
export { getAuthUser, getOptionalUser, requireInternalUser, requireClientUser, requireCandidateUser } from './server';
export {
  signInWithPassword,
  signInWithMagicLink,
  signOut,
  sendPasswordReset,
  resetPassword,
  inviteInternalUser,
  inviteClientUser,
  sendCandidateMagicLink,
  resendInvite,
  deactivateUser,
  reactivateUser,
  type ActionResult,
} from './actions';
