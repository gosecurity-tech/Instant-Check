'use server';

import { requireInternalUser } from '@/lib/auth/server';
import { recordAuditLog } from '@/lib/audit';
import { createClient } from '@/lib/supabase/server';
import type { RtwCheckMethod } from '@/types/enums';

// ============================================================
// RTW Check Service Functions
// ============================================================

/**
 * Create a new RTW check
 */
async function createRtwCheck(
  caseId: string,
  checkId: string,
  candidateId: string,
  organisationId: string,
  checkMethod: RtwCheckMethod,
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('right_to_work_checks')
    .insert({
      case_id: caseId,
      check_id: checkId,
      candidate_id: candidateId,
      organisation_id: organisationId,
      check_method: checkMethod,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create RTW check: ${error.message}`);
  }

  return data.id;
}

/**
 * Submit RTW document
 */
async function submitRtwDocument(
  rtwCheckId: string,
  documentType: string,
  documentReference: string,
  expiryDate?: string,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('right_to_work_checks')
    .update({
      document_type: documentType,
      document_reference: documentReference,
      expiry_date: expiryDate || null,
      status: 'document_submitted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', rtwCheckId);

  if (error) {
    throw new Error(`Failed to submit RTW document: ${error.message}`);
  }
}

/**
 * Submit RTW share code
 */
async function submitShareCode(
  rtwCheckId: string,
  shareCode: string,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('right_to_work_checks')
    .update({
      share_code: shareCode,
      status: 'document_submitted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', rtwCheckId);

  if (error) {
    throw new Error(`Failed to submit RTW share code: ${error.message}`);
  }
}

/**
 * Start RTW review
 */
async function startRtwReview(rtwCheckId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('right_to_work_checks')
    .update({
      status: 'under_review',
      updated_at: new Date().toISOString(),
    })
    .eq('id', rtwCheckId);

  if (error) {
    throw new Error(`Failed to start RTW review: ${error.message}`);
  }
}

/**
 * Complete RTW review
 */
async function completeRtwReview(
  rtwCheckId: string,
  reviewedBy: string,
  verified: boolean,
  reviewNotes?: string,
  hasTimeLimit?: boolean,
  timeLimitEnd?: string,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('right_to_work_checks')
    .update({
      verified,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes || null,
      has_time_limit: hasTimeLimit || false,
      time_limit_end: timeLimitEnd || null,
      status: verified ? 'verified' : 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', rtwCheckId);

  if (error) {
    throw new Error(`Failed to complete RTW review: ${error.message}`);
  }
}

/**
 * Mark RTW check as expired
 */
async function markRtwExpired(rtwCheckId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('right_to_work_checks')
    .update({
      status: 'expired',
      updated_at: new Date().toISOString(),
    })
    .eq('id', rtwCheckId);

  if (error) {
    throw new Error(`Failed to mark RTW check as expired: ${error.message}`);
  }
}

// ============================================================
// Server Actions
// ============================================================

/**
 * Create a new RTW check
 */
export async function createRtwCheckAction(data: {
  caseId: string;
  checkId: string;
  candidateId: string;
  organisationId: string;
  checkMethod: RtwCheckMethod;
}): Promise<{ rtwCheckId?: string; error?: string }> {
  try {
    const user = await requireInternalUser();

    const rtwCheckId = await createRtwCheck(
      data.caseId,
      data.checkId,
      data.candidateId,
      data.organisationId,
      data.checkMethod,
    );

    await recordAuditLog(user, {
      action: 'rtw.created',
      entityType: 'right_to_work_check',
      entityId: rtwCheckId,
      organisationId: data.organisationId,
      metadata: {
        caseId: data.caseId,
        checkId: data.checkId,
        checkMethod: data.checkMethod,
      },
    });

    return { rtwCheckId };
  } catch (error) {
    console.error('Failed to create RTW check:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to create RTW check',
    };
  }
}

/**
 * Submit RTW document
 */
export async function submitRtwDocumentAction(data: {
  rtwCheckId: string;
  documentType: string;
  documentReference: string;
  expiryDate?: string;
  organisationId: string;
}): Promise<{ error?: string }> {
  try {
    const user = await requireInternalUser();

    await submitRtwDocument(
      data.rtwCheckId,
      data.documentType,
      data.documentReference,
      data.expiryDate,
    );

    await recordAuditLog(user, {
      action: 'rtw.document_submitted',
      entityType: 'right_to_work_check',
      entityId: data.rtwCheckId,
      organisationId: data.organisationId,
      metadata: {
        documentType: data.documentType,
        documentReference: data.documentReference,
        expiryDate: data.expiryDate,
      },
    });

    return {};
  } catch (error) {
    console.error('Failed to submit RTW document:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to submit RTW document',
    };
  }
}

/**
 * Submit RTW share code
 */
export async function submitRtwShareCodeAction(data: {
  rtwCheckId: string;
  shareCode: string;
  organisationId: string;
}): Promise<{ error?: string }> {
  try {
    const user = await requireInternalUser();

    await submitShareCode(data.rtwCheckId, data.shareCode);

    await recordAuditLog(user, {
      action: 'rtw.document_submitted',
      entityType: 'right_to_work_check',
      entityId: data.rtwCheckId,
      organisationId: data.organisationId,
      metadata: {
        shareCode: data.shareCode,
      },
    });

    return {};
  } catch (error) {
    console.error('Failed to submit RTW share code:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to submit RTW share code',
    };
  }
}

/**
 * Start RTW review
 */
export async function startRtwReviewAction(data: {
  rtwCheckId: string;
  organisationId: string;
}): Promise<{ error?: string }> {
  try {
    const user = await requireInternalUser();

    await startRtwReview(data.rtwCheckId);

    await recordAuditLog(user, {
      action: 'rtw.reviewed',
      entityType: 'right_to_work_check',
      entityId: data.rtwCheckId,
      organisationId: data.organisationId,
      metadata: {
        action: 'review_started',
      },
    });

    return {};
  } catch (error) {
    console.error('Failed to start RTW review:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to start RTW review',
    };
  }
}

/**
 * Complete RTW review
 */
export async function completeRtwReviewAction(data: {
  rtwCheckId: string;
  verified: boolean;
  reviewNotes?: string;
  hasTimeLimit?: boolean;
  timeLimitEnd?: string;
  organisationId: string;
}): Promise<{ error?: string }> {
  try {
    const user = await requireInternalUser();

    await completeRtwReview(
      data.rtwCheckId,
      user.id,
      data.verified,
      data.reviewNotes,
      data.hasTimeLimit,
      data.timeLimitEnd,
    );

    const auditAction = data.verified ? 'rtw.verified' : 'rtw.failed';

    await recordAuditLog(user, {
      action: auditAction,
      entityType: 'right_to_work_check',
      entityId: data.rtwCheckId,
      organisationId: data.organisationId,
      metadata: {
        verified: data.verified,
        hasTimeLimit: data.hasTimeLimit,
        timeLimitEnd: data.timeLimitEnd,
      },
    });

    return {};
  } catch (error) {
    console.error('Failed to complete RTW review:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to complete RTW review',
    };
  }
}

/**
 * Mark RTW check as expired
 */
export async function markRtwExpiredAction(data: {
  rtwCheckId: string;
  organisationId: string;
}): Promise<{ error?: string }> {
  try {
    const user = await requireInternalUser();

    await markRtwExpired(data.rtwCheckId);

    await recordAuditLog(user, {
      action: 'rtw.expired',
      entityType: 'right_to_work_check',
      entityId: data.rtwCheckId,
      organisationId: data.organisationId,
    });

    return {};
  } catch (error) {
    console.error('Failed to mark RTW check as expired:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to mark RTW check as expired',
    };
  }
}
