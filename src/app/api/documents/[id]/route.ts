import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDocumentById, getDocumentDownloadUrl, deleteDocument } from '@/lib/services/documents';
import { recordAuditLog } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/documents/[id]
 * Redirect to signed download URL for the document
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get document
    const document = await getDocumentById(id);
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Get signed URL
    const signedUrl = await getDocumentDownloadUrl(id);

    // Record audit log
    await recordAuditLog(
      {
        id: user.id,
        organisationId: document.organisation_id,
      },
      {
        action: 'document.viewed',
        entityType: 'document',
        entityId: id,
        organisationId: document.organisation_id,
      }
    );

    // Redirect to signed URL
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error('[DOWNLOAD ERROR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download document' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/[id]
 * Soft delete a document
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get document
    const document = await getDocumentById(id);
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check permission: user must be internal or the uploader
    const userType = user.app_metadata?.user_type;
    if (userType !== 'internal' && document.uploaded_by !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this document' },
        { status: 403 }
      );
    }

    // Delete document
    await deleteDocument(id);

    // Record audit log
    await recordAuditLog(
      {
        id: user.id,
        organisationId: document.organisation_id,
      },
      {
        action: 'document.deleted',
        entityType: 'document',
        entityId: id,
        organisationId: document.organisation_id,
        metadata: {
          file_name: document.file_name,
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE ERROR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete document' },
      { status: 500 }
    );
  }
}
