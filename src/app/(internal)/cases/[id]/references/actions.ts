'use server';

import { requireInternalUser } from '@/lib/auth/server';
import {
  createReferenceRequest,
  sendReferenceRequest,
  sendReferenceReminder,
  markUnresponsive,
  markDeclined,
  flagDiscrepancy,
  verifyReference,
} from '@/lib/services/references';
import { recordAuditLog } from '@/lib/audit';

// ============================================================
// Create and send a reference request
// ============================================================
export async function createAndSendReference(data: {
  caseId: string;
  checkId: string;
  refereeId: string;
  organisationId: string;
}): Promise<{ error?: string; requestId?: string }> {
  try {
    const user = await requireInternalUser();

    const requestId = await createReferenceRequest({
      caseId: data.caseId,
      checkId: data.checkId,
      refereeId: data.refereeId,
      organisationId: data.organisationId,
    });

    const token = await sendReferenceRequest(requestId, user.id);

    await recordAuditLog(user, {
      action: 'reference.requested',
      entityType: 'reference_request',
      entityId: requestId,
      organisationId: data.organisationId,
      metadata: {
        case_id: data.caseId,
        check_id: data.checkId,
        referee_id: data.refereeId,
        token,
      },
    });

    return { requestId };
  } catch (error) {
    console.error('Create reference error:', error);
    return { error: error instanceof Error ? error.message : 'Failed to create reference request' };
  }
}

// ============================================================
// Resend reminder
// ============================================================
export async function resendReferenceReminder(
  requestId: string,
  organisationId: string,
): Promise<{ error?: string }> {
  try {
    const user = await requireInternalUser();

    await sendReferenceReminder(requestId);

    await recordAuditLog(user, {
      action: 'reference.reminder_sent',
      entityType: 'reference_request',
      entityId: requestId,
      organisationId,
      metadata: { request_id: requestId },
    });

    return {};
  } catch (error) {
    console.error('Send reminder error:', error);
    return { error: error instanceof Error ? error.message : 'Failed to send reminder' };
  }
}

// ============================================================
// Mark as unresponsive
// ============================================================
export async function markReferenceUnresponsive(
  requestId: string,
  organisationId: string,
): Promise<{ error?: string }> {
  try {
    const user = await requireInternalUser();

    await markUnresponsive(requestId);

    await recordAuditLog(user, {
      action: 'reference.requested',
      entityType: 'reference_request',
      entityId: requestId,
      organisationId,
      metadata: { action: 'marked_unresponsive' },
    });

    return {};
  } catch (error) {
    console.error('Mark unresponsive error:', error);
    return { error: error instanceof Error ? error.message : 'Failed to mark as unresponsive' };
  }
}

// ============================================================
// Mark as declined
// ============================================================
export async function markReferenceDeclined(
  requestId: string,
  organisationId: string,
): Promise<{ error?: string }> {
  try {
    const user = await requireInternalUser();

    await markDeclined(requestId);

    await recordAuditLog(user, {
      action: 'reference.requested',
      entityType: 'reference_request',
      entityId: requestId,
      organisationId,
      metadata: { action: 'marked_declined' },
    });

    return {};
  } catch (error) {
    console.error('Mark declined error:', error);
    return { error: error instanceof Error ? error.message : 'Failed to mark as declined' };
  }
}

// ============================================================
// Flag discrepancy
// ============================================================
export async function flagReferenceDiscrepancy(data: {
  requestId: string;
  notes: string;
  organisationId: string;
}): Promise<{ error?: string }> {
  try {
    const user = await requireInternalUser();

    await flagDiscrepancy(data.requestId, user.id, data.notes);

    await recordAuditLog(user, {
      action: 'reference.discrepancy_flagged',
      entityType: 'reference_request',
      entityId: data.requestId,
      organisationId: data.organisationId,
      metadata: { notes: data.notes },
    });

    return {};
  } catch (error) {
    console.error('Flag discrepancy error:', error);
    return { error: error instanceof Error ? error.message : 'Failed to flag discrepancy' };
  }
}

// ============================================================
// Verify reference
// ============================================================
export async function verifyReferenceRequest(
  requestId: string,
  organisationId: string,
): Promise<{ error?: string }> {
  try {
    const user = await requireInternalUser();

    await verifyReference(requestId);

    await recordAuditLog(user, {
      action: 'reference.response_received',
      entityType: 'reference_request',
      entityId: requestId,
      organisationId,
      metadata: { action: 'verified' },
    });

    return {};
  } catch (error) {
    console.error('Verify reference error:', error);
    return { error: error instanceof Error ? error.message : 'Failed to verify reference' };
  }
}
