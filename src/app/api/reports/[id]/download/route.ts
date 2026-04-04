import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/reports/[id]/download
 * Generates a signed URL for downloading a report PDF from Supabase storage
 * and redirects to that signed URL.
 * 
 * Validates:
 * - User is authenticated
 * - Report exists
 * - Report status is 'ready'
 * - Storage path is set
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: reportId } = await params;

  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch report details
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('id, status, storage_path, storage_bucket, cases(case_reference)')
      .eq('id', reportId)
      .single();

    if (fetchError || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Check report status
    if (report.status !== 'ready') {
      return NextResponse.json(
        { error: `Report is ${report.status}. Only ready reports can be downloaded.` },
        { status: 400 }
      );
    }

    // Check storage path exists
    if (!report.storage_path) {
      return NextResponse.json(
        { error: 'Report storage path not set' },
        { status: 400 }
      );
    }

    // Generate signed URL (expires in 1 hour)
    const bucket = report.storage_bucket || 'reports';
    const path = report.storage_path;

    const { data, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600);

    if (signError || !data) {
      console.error('Failed to generate signed URL:', signError);
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      );
    }

    // Redirect to signed URL
    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
