import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ReportStatus } from '@/types/enums';

/**
 * Report summary for list views and dashboard
 */
export interface ReportSummary {
  id: string;
  case_id: string;
  case_reference: string;
  candidate_name: string;
  organisation_id: string;
  report_type: string;
  status: string;
  version: number;
  generated_by: string | null;
  generated_at: string | null;
  file_size: number | null;
  created_at: string;
}

/**
 * Full report details including storage and metadata
 */
export interface ReportDetail extends ReportSummary {
  storage_path: string | null;
  storage_bucket: string;
  metadata: Record<string, unknown>;
}

/**
 * Dashboard statistics for reports
 */
export interface ReportStats {
  totalReports: number;
  readyCount: number;
  generatingCount: number;
  failedCount: number;
  reportsThisMonth: number;
}

/**
 * Parameters for listing reports
 */
interface ListReportsParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  reportType?: string;
  organisationId?: string;
  caseId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response for report lists
 */
interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
}

/**
 * Download URL response
 */
interface DownloadUrlResponse {
  url: string;
  filename: string;
}

/**
 * Get a paginated, filterable list of reports
 * Joins with cases table for case_reference and candidate_name
 * Searches against case_reference, orders by created_at DESC by default
 */
export async function listReports(
  params: ListReportsParams
): Promise<PaginatedResponse<ReportSummary>> {
  const supabase = await createClient();

  const {
    page,
    pageSize,
    search,
    status,
    reportType,
    organisationId,
    caseId,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = params;

  const offset = (page - 1) * pageSize;

  // Build the query
  let query = supabase
    .from('reports')
    .select(
      `
      id,
      case_id,
      organisation_id,
      report_type,
      status,
      version,
      generated_by,
      generated_at,
      file_size,
      created_at,
      cases!inner(case_reference, candidate_name)
    `,
      { count: 'exact' }
    );

  // Apply filters
  if (status) {
    query = query.eq('status', status);
  }

  if (reportType) {
    query = query.eq('report_type', reportType);
  }

  if (organisationId) {
    query = query.eq('organisation_id', organisationId);
  }

  if (caseId) {
    query = query.eq('case_id', caseId);
  }

  if (search) {
    query = query.ilike('cases.case_reference', `%${search}%`);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list reports: ${error.message}`);
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Transform response to flatten case data
  const transformedData: ReportSummary[] = (data || []).map((row: any) => ({
    id: row.id,
    case_id: row.case_id,
    case_reference: row.cases.case_reference,
    candidate_name: row.cases.candidate_name,
    organisation_id: row.organisation_id,
    report_type: row.report_type,
    status: row.status,
    version: row.version,
    generated_by: row.generated_by,
    generated_at: row.generated_at,
    file_size: row.file_size,
    created_at: row.created_at,
  }));

  return {
    data: transformedData,
    page,
    pageSize,
    totalPages,
    totalCount,
  };
}

/**
 * Get a single report by ID with full details
 * Includes case information from the join
 */
export async function getReportById(reportId: string): Promise<ReportDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reports')
    .select(
      `
      id,
      case_id,
      organisation_id,
      report_type,
      status,
      version,
      generated_by,
      generated_at,
      file_size,
      storage_path,
      storage_bucket,
      metadata,
      created_at,
      cases(case_reference, candidate_name)
    `
    )
    .eq('id', reportId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get report: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const report: ReportDetail = {
    id: data.id,
    case_id: data.case_id,
    case_reference: (data.cases as any).case_reference,
    candidate_name: (data.cases as any).candidate_name,
    organisation_id: data.organisation_id,
    report_type: data.report_type,
    status: data.status,
    version: data.version,
    generated_by: data.generated_by,
    generated_at: data.generated_at,
    file_size: data.file_size,
    storage_path: data.storage_path,
    storage_bucket: data.storage_bucket,
    metadata: data.metadata || {},
    created_at: data.created_at,
  };

  return report;
}

/**
 * Create an initial report record with status 'generating'
 */
export async function createReportRecord(
  caseId: string,
  organisationId: string,
  generatedBy: string,
  reportType: string = 'final_screening'
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reports')
    .insert({
      case_id: caseId,
      organisation_id: organisationId,
      report_type: reportType,
      status: 'generating',
      generated_by: generatedBy,
      storage_bucket: 'reports',
      version: 1,
      metadata: {},
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create report record: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to create report record: no data returned');
  }

  return data.id;
}

/**
 * Update report status after generation
 * Sets generated_at timestamp when status becomes 'ready'
 */
export async function updateReportStatus(
  reportId: string,
  status: string,
  storagePath?: string,
  fileSize?: number
): Promise<void> {
  const supabase = await createClient();

  const updateData: any = {
    status,
  };

  if (status === 'ready') {
    updateData.generated_at = new Date().toISOString();
  }

  if (storagePath) {
    updateData.storage_path = storagePath;
  }

  if (fileSize !== undefined) {
    updateData.file_size = fileSize;
  }

  const { error } = await supabase
    .from('reports')
    .update(updateData)
    .eq('id', reportId);

  if (error) {
    throw new Error(`Failed to update report status: ${error.message}`);
  }
}

/**
 * Get a signed download URL for a report from Supabase storage
 * Returns null if report not found or storage path not set
 * URL expires in 1 hour
 */
export async function getReportDownloadUrl(
  reportId: string
): Promise<DownloadUrlResponse | null> {
  const supabase = await createClient();

  const { data: report, error } = await supabase
    .from('reports')
    .select('storage_path, storage_bucket, cases(case_reference)')
    .eq('id', reportId)
    .single();

  if (error || !report) {
    return null;
  }

  if (!report.storage_path) {
    return null;
  }

  const bucket = report.storage_bucket || 'reports';
  const path = report.storage_path;

  try {
    const { data, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600);

    if (signError || !data) {
      return null;
    }

    const filename = `report-${(report.cases as any).case_reference}.pdf`;

    return {
      url: data.signedUrl,
      filename,
    };
  } catch {
    return null;
  }
}

/**
 * Get all reports for a specific case
 * Ordered by version DESC (newest first)
 */
export async function listReportsForCase(caseId: string): Promise<ReportSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reports')
    .select(
      `
      id,
      case_id,
      organisation_id,
      report_type,
      status,
      version,
      generated_by,
      generated_at,
      file_size,
      created_at,
      cases(case_reference, candidate_name)
    `
    )
    .eq('case_id', caseId)
    .order('version', { ascending: false });

  if (error) {
    throw new Error(`Failed to list reports for case: ${error.message}`);
  }

  const reports: ReportSummary[] = (data || []).map((row: any) => ({
    id: row.id,
    case_id: row.case_id,
    case_reference: row.cases.case_reference,
    candidate_name: row.cases.candidate_name,
    organisation_id: row.organisation_id,
    report_type: row.report_type,
    status: row.status,
    version: row.version,
    generated_by: row.generated_by,
    generated_at: row.generated_at,
    file_size: row.file_size,
    created_at: row.created_at,
  }));

  return reports;
}

/**
 * Get dashboard statistics for reports
 * If organisationId is provided, filters to that organisation
 */
export async function getReportStats(organisationId?: string): Promise<ReportStats> {
  const adminClient = createAdminClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Query all reports, optionally filtered by organisation
  let allReportsQuery = adminClient
    .from('reports')
    .select('status, created_at', { count: 'exact' });

  if (organisationId) {
    allReportsQuery = allReportsQuery.eq('organisation_id', organisationId);
  }

  const { data: allReports, count: totalCount } = await allReportsQuery;

  if (!allReports) {
    return {
      totalReports: totalCount || 0,
      readyCount: 0,
      generatingCount: 0,
      failedCount: 0,
      reportsThisMonth: 0,
    };
  }

  const readyCount = allReports.filter((r: any) => r.status === 'ready').length;
  const generatingCount = allReports.filter((r: any) => r.status === 'generating').length;
  const failedCount = allReports.filter((r: any) => r.status === 'failed').length;
  const reportsThisMonth = allReports.filter(
    (r: any) => new Date(r.created_at) >= new Date(monthStart)
  ).length;

  return {
    totalReports: totalCount || 0,
    readyCount,
    generatingCount,
    failedCount,
    reportsThisMonth,
  };
}