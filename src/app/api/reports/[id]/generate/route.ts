import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractAuthUser } from '@/lib/auth-helpers';
import { canGenerateReports } from '@/lib/permissions';
import {
  createReportRecord,
  updateReportStatus,
} from '@/lib/services/reports';
import { recordAuditLog } from '@/lib/audit';

/**
 * POST /api/reports/[id]/generate
 * Generates a final vetting report PDF for a completed case.
 * 
 * Process:
 * 1. Authenticate user and check permissions (QA Reviewer+)
 * 2. Create initial report record with status 'generating'
 * 3. Gather report data from case and checks
 * 4. Generate PDF
 * 5. Upload PDF to Supabase storage
 * 6. Update report record with status 'ready', storage path, file size
 * 7. Record audit log
 * 
 * On error: updates report status to 'failed'
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: caseId } = await params;

  let reportId: string | null = null;

  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authUser = extractAuthUser(user);

    // Permission check
    if (!canGenerateReports(authUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create initial report record
    reportId = await createReportRecord(
      caseId,
      authUser.organisationId,
      authUser.id,
      'final_screening'
    );

    // Gather report data from case
    // TODO: Implement gatherReportData once case/check data structures are finalized
    const reportData = {
      caseId,
      caseReference: 'CASE-001', // placeholder
      candidateName: 'John Doe', // placeholder
      generatedAt: new Date().toISOString(),
    };

    // Generate PDF
    // TODO: Implement generateReportPdf once PDF generation is set up
    const pdfBuffer = Buffer.from('PDF content placeholder');

    // Upload to Supabase storage
    const admin = createAdminClient();
    const storagePath = `${authUser.organisationId}/${caseId}/${reportId}.pdf`;

    const { error: uploadError, data: uploadData } = await admin.storage
      .from('reports')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Update report record with ready status and file size
    const fileSize = pdfBuffer.length;
    await updateReportStatus(reportId, 'ready', storagePath, fileSize);

    // Record audit log
    await recordAuditLog(authUser, {
      action: 'report.generated',
      entityType: 'report',
      entityId: reportId,
      organisationId: authUser.organisationId,
      metadata: {
        caseId,
        reportType: 'final_screening',
        fileSize,
      },
    });

    return NextResponse.json(
      {
        reportId,
        status: 'ready',
        message: 'Report generated successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Report generation error:', error);

    // Mark report as failed if it was created
    if (reportId) {
      try {
        await updateReportStatus(reportId, 'failed');
      } catch (updateError) {
        console.error('Failed to update report status to failed:', updateError);
      }
    }

    return NextResponse.json(
      {
        error: 'Report generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
