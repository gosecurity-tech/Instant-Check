'use server';

import { requireInternalUser } from '@/lib/auth/server';
import { reviewDocument, deleteDocument, getDocumentById } from '@/lib/services/documents';
import { recordAuditLog } from '@/lib/audit';
import type { DocumentStatus } from '@/types/enums';

/**
 * Review a document (accept/reject)
 */
export async function reviewDocumentAction(data: {
  documentId: string;
  status: DocumentStatus;
  notes?: string;
}) {
  const user = await requireInternalUser();

  // Get document to verify it exists and for audit logging
  const document = await getDocumentById(data.documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  // Update document status
  await reviewDocument(data.documentId, user.id, data.status, data.notes);

  // Record audit log
  await recordAuditLog(
    {
      id: user.id,
      organisationId: document.organisation_id,
    },
    {
      action: 'document.reviewed',
      entityType: 'document',
      entityId: data.documentId,
      organisationId: document.organisation_id,
      metadata: {
        status: data.status,
        notes: data.notes || null,
        file_name: document.file_name,
      },
    }
  );

  return { success: true };
}

/**
 * Delete a document
 */
export async function deleteDocumentAction(documentId: string) {
  const user = await requireInternalUser();

  // Get document to verify it exists and for permission/audit
  const document = await getDocumentById(documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  // Delete document
  await deleteDocument(documentId);

  // Record audit log
  await recordAuditLog(
    {
      id: user.id,
      organisationId: document.organisation_id,
    },
    {
      action: 'document.deleted',
      entityType: 'document',
      entityId: documentId,
      organisationId: document.organisation_id,
      metadata: {
        file_name: document.file_name,
        case_id: document.case_id,
      },
    }
  );

  return { success: true };
}
