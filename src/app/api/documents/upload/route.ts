import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadDocument } from '@/lib/services/documents';
import { recordAuditLog } from '@/lib/audit';
import type { DocumentType } from '@/types/enums';

/**
 * POST /api/documents/upload
 * Upload a document for a case
 *
 * Form data:
 * - file: File
 * - caseId: string
 * - documentType: DocumentType
 * - checkId?: string
 * - candidateId?: string
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organisationId from user metadata
    const organisationId = user.app_metadata?.organisation_id;
    if (!organisationId) {
      return NextResponse.json(
        { error: 'Organisation ID not found in user metadata' },
        { status: 400 }
      );
    }

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const caseId = formData.get('caseId') as string | null;
    const documentType = formData.get('documentType') as DocumentType | null;
    const checkId = formData.get('checkId') as string | null;
    const candidateId = formData.get('candidateId') as string | null;

    // Validate required fields
    if (!file || !caseId || !documentType) {
      return NextResponse.json(
        { error: 'Missing required fields: file, caseId, documentType' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload document
    const documentId = await uploadDocument({
      caseId,
      candidateId: candidateId || undefined,
      checkId: checkId || undefined,
      organisationId,
      documentType,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        buffer,
      },
      uploadedBy: user.id,
    });

    // Record audit log
    await recordAuditLog(
      {
        id: user.id,
        organisationId,
      },
      {
        action: 'document.uploaded',
        entityType: 'document',
        entityId: documentId,
        organisationId,
        metadata: {
          file_name: file.name,
          document_type: documentType,
          case_id: caseId,
        },
      }
    );

    return NextResponse.json({ id: documentId }, { status: 201 });
  } catch (error) {
    console.error('[UPLOAD ERROR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload document' },
      { status: 500 }
    );
  }
}
