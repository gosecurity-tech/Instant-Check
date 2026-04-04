'use server';

import { requireInternalUser } from '@/lib/auth/server';
import {
  createDbsCheck,
  submitDbsApplication,
  verifyDbsId,
  markSentToDbs,
  recordDbsReceived,
  completeDbsReview,
  disputeDbsResult,
} from '@/lib/services/dbs';
import { recordAuditLog } from '@/lib/audit';

// ============================================================
// Server Actions
// ============================================================

/**
 * Create a new DBS check
 */
export async function createDbsCheckAction(data: {
  caseId: string;
  checkId: string;
  candidateId: string;
  organisationId: string;
  dbsType: string;
}): Promise<{ dbsCheckId?: string; error?: string }> {
  try {
    const user = await requireInternalUser();

    const dbsCheckId = await createDbsCheck({
      caseId: data.caseId,
      checkId: data.checkId,
      candidateId: data.candidateId,
      organisationId: data.organisationId,
      dbsType: data.dbsType,
    });

    await recordAuditLog(user, {
      action: 'dbs.created',
      entityType: 'dbs_check',
      entityId: dbsCheckId,
      organisationId: data.organisationId,
      metadata: {
        caseId: data.caseId,
        checkId: data.checkId,
        dbsType: data.dbsType,
      },
    });

    return { dbsCheckId };
  } catch (error) {
    console.error('Failed to create DBS check:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to create DBS check',
    };
  }
}

/**
 * Submit DBS application
 */
export async function submitDbsApplicationAction(data: {
  dbsCheckId: string;
  applicationReference: string;
  organisationId: string;
}): Promise<{ error?: string }> {
  try {
    const user = await requireInternalUser();

    await submitDbsApplication(data.dbsCheckId, data.applicationReference);

    await recordAuditLog(user, {
      action: 'dbs.application_submitted',
      entityType: 'dbs_check',
      entityId: data.dbsCheckId,
      organisationId: data.organisationId,
      metadata: {
        applicationReference: data.applicationReference,
      },
    });

    return {};
  } catch (error) {
    console.error('Failed to submit DBS application:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to submit DBS application',
    };
  }
}

/**
 * Verify DBS ID
 */
export async function verifyDbsIdAction(data: {
  dbsCheckId: string;
  organisationId: string;
}): Promise<{ error?: string }> {
  try {
    const user = await requireInternalUser();

    await verifyDbsId(data.dbsCheckId);

    await recordAuditLog(user, {
      action: 'dbs.id_verified',
      entityType: 'dbs_check',
      entityId: data.dbsCheckId,
      organisationId: data.organisationId,
    });

    return {};
  } catch (error) {
    console.error('Failed to verify DBS ID:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to verify DBS ID',
    };
  }
}

/**
 * Mark DBS as sent to DBS service
 */
export async function markSentToDbsAction(data: {
  dbsCheckId: string;
  organisationId: string;
}): Promise<{ error?: string }> {
  try {
    const user = await requireInternalUser();

    await markSentToDbs(data.dbsCheckId);

    await recordAuditLog(user, {
      action: 'dbs.sent_to_dbs',
      entityType: 'dbs_check',
      entityId: data.dbsCheckId,
      organisationId: data.organisationId,
    });

    return {};
  } catch (error) {
    console.error('Failed to mark DBS check as sent:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to mark DBS check as sent',
    };
  }
}

/**
 * Record DBS certificate received
 */
export async function recordDbsReceivedAction(data: {
  dbsCheckId: string;
  certificateNumber: string;
  certificateDate: string;
  hasAdverse: boolean;
  adverseDetails?: string;
  organisationId: string;
}): Promise<{ error?: string }> {
  try {
    const user = await requireInternalUser();

    await recordDbsReceived(data.dbsCheckId, {
      certificateNumber: data.certificateNumber,
      certificateDate: data.certificateDate,
      hasAdverse: data.hasAdverse,
      adverseDetails: data.adverseDetails,
    });

    await recordAuditLog(user, {
      action: 'dbs.received',
      entityType: 'dbs_check',
      entityId: data.dbsCheckId,
      organisationId: data.organisationId,
      metadata: {
        certificateNumber: data.certificateNumber,
        certificateDate: data.certificateDate,
        hasAdverse: data.hasAdverse,
      },
    });

    return {};
  } catch (error) {
    console.error('Failed to record DBS received:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to record DBS received',
    };
  }
}

/**
 * Complete DBS review
 */
export async function completeDbsReviewAction(data: {
  dbsCheckId: string;
  clear: boolean;
  reviewNotes?: string;
  organisationId: string;
}): Promise<{ error?: string }> {
  try {
    const user = await requireInternalUser();

    await completeDbsReview(data.dbsCheckId, {
      reviewedBy: user.id,
      reviewNotes: data.reviewNotes,
      clear: data.clear,
    });

    await recordAuditLog(user, {
      action: 'dbs.reviewed',
      entityType: 'dbs_check',
      entityId: data.dbsCheckId,
      organisationId: data.organisationId,
      metadata: {
        clear: data.clear,
        reviewedBy: user.id,
      },
    });

    return {};
  } catch (error) {
    console.error('Failed to complete DBS review:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to complete DBS review',
    };
  }
}

/**
 * Dispute DBS result
 */
export async function disputeDbsResultAction(data: {
  dbsCheckId: string;
  notes: string;
  organisationId: string;
}): Promise<{ error?: string }> {
  try {
    const user = await requireInternalUser();

    await disputeDbsResult(data.dbsCheckId, data.notes);

    await recordAuditLog(user, {
      action: 'dbs.reviewed',
      entityType: 'dbs_check',
      entityId: data.dbsCheckId,
      organisationId: data.organisationId,
      metadata: {
        action: 'disputed',
        disputeNotes: data.notes,
      },
    });

    return {};
  } catch (error) {
    console.error('Failed to dispute DBS result:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to dispute DBS result',
    };
  }
}
