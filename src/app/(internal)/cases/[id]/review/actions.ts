'use server';

import { requireInternalUser } from '@/lib/auth/server';
import {
  moveCaseToReview,
  adjudicateCase,
  reopenCase,
  addCaseNote,
} from '@/lib/services/decisioning';
import { recordAuditLog } from '@/lib/audit';
import type { CaseOutcome } from '@/types/enums';

/**
 * Move a case from in_progress to under_review status
 */
export async function moveCaseToReviewAction(formData: FormData): Promise<void> {
  const caseId = formData.get('caseId') as string;
  if (!caseId) {
    console.error('[moveCaseToReviewAction] Missing caseId');
    return;
  }

  try {
    const user = await requireInternalUser();

    await moveCaseToReview(caseId, user.id);

    await recordAuditLog(user, {
      action: 'case.status_changed',
      entityType: 'case',
      entityId: caseId,
      organisationId: user.organisationId,
      metadata: {
        from_status: 'in_progress',
        to_status: 'under_review',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[moveCaseToReviewAction]', message);
  }
}

/**
 * Adjudicate a case with a final outcome
 * The adjudicate_case RPC already creates its own audit log, so we don't duplicate
 */
export async function adjudicateCaseAction(data: {
  caseId: string;
  outcome: CaseOutcome;
  notes?: string;
}) {
  try {
    const user = await requireInternalUser();

    await adjudicateCase(
      data.caseId,
      data.outcome,
      user.id,
      data.notes
    );

    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[adjudicateCaseAction]', message);
    return { error: message };
  }
}

/**
 * Reopen a case from under_review back to in_progress
 */
export async function reopenCaseAction(data: {
  caseId: string;
  notes?: string;
}) {
  try {
    const user = await requireInternalUser();

    await reopenCase(data.caseId, user.id, data.notes);

    await recordAuditLog(user, {
      action: 'case.reopened',
      entityType: 'case',
      entityId: data.caseId,
      organisationId: user.organisationId,
      metadata: {
        reason: data.notes || 'No reason provided',
      },
    });

    return {};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[reopenCaseAction]', message);
    return { error: message };
  }
}

/**
 * Add an internal or external note to a case
 */
export async function addCaseNoteAction(data: {
  caseId: string;
  content: string;
  isInternal?: boolean;
}) {
  try {
    const user = await requireInternalUser();

    const noteId = await addCaseNote(
      data.caseId,
      data.content,
      user.id,
      data.isInternal ?? true
    );

    return { noteId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[addCaseNoteAction]', message);
    return { error: message };
  }
}
