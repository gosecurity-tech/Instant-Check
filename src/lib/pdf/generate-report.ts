import PDFDocument from 'pdfkit';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * Data structures for the BS7858 report
 */
export interface CheckReportData {
  checkType: string;
  status: string;
  outcome: string | null;
  notes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface ReferenceReportData {
  refereeName: string;
  refereeEmail: string;
  organisation: string;
  status: string;
  receivedAt: string | null;
  flagged: boolean;
}

export interface RtwReportData {
  method: string;
  status: string;
  documentType: string | null;
  verified: boolean;
  expiryDate: string | null;
}

export interface DbsReportData {
  dbsType: string;
  status: string;
  certificateNumber: string | null;
  certificateDate: string | null;
  hasAdverse: boolean;
}

export interface ReportData {
  caseReference: string;
  candidateName: string;
  candidateEmail: string;
  clientName: string;
  packageName: string;
  caseStatus: string;
  caseOutcome: string | null;
  createdAt: string;
  completedAt: string | null;
  checks: CheckReportData[];
  references: ReferenceReportData[];
  rtwCheck: RtwReportData | null;
  dbsCheck: DbsReportData | null;
  adjudicationNotes: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
}

/**
 * Helper: Format date to 'DD MMM YYYY' format
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Helper: Add a section header with horizontal rule
 */
function addSectionHeader(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(1);
  doc.fontSize(14).font('Helvetica-Bold').text(title);
  doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke('#cccccc');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
}

/**
 * Gather all report data from Supabase
 * Uses admin client to bypass RLS
 */
export async function gatherReportData(caseId: string): Promise<ReportData> {
  const adminClient = createAdminClient();

  // Fetch case with candidate, client, and package details
  const { data: caseData, error: caseError } = await adminClient
    .from('cases')
    .select(
      `
      id,
      reference,
      status,
      outcome,
      created_at,
      completed_at,
      adjudication_notes,
      reviewed_by,
      reviewed_at,
      candidate_id,
      client_id,
      screening_package_id,
      candidates (id, full_name, email),
      clients (id, name),
      screening_packages (id, name)
    `
    )
    .eq('id', caseId)
    .single();

  if (caseError || !caseData) {
    throw new Error(`Failed to fetch case ${caseId}: ${caseError?.message}`);
  }

  // Extract nested data
  const candidate = caseData.candidates as any;
  const client = caseData.clients as any;
  const screeningPackage = caseData.screening_packages as any;

  // Fetch case checks
  const { data: checksData, error: checksError } = await adminClient
    .from('case_checks')
    .select('*')
    .eq('case_id', caseId);

  if (checksError) {
    throw new Error(`Failed to fetch checks: ${checksError.message}`);
  }

  const checks: CheckReportData[] = (checksData || []).map((check: any) => ({
    checkType: check.check_type || 'Unknown',
    status: check.status || 'pending',
    outcome: check.outcome,
    notes: check.notes,
    reviewedBy: check.reviewed_by,
    reviewedAt: check.reviewed_at
  }));

  // Fetch reference requests and responses
  const { data: refsData, error: refsError } = await adminClient
    .from('reference_requests')
    .select('*, reference_responses (*)')
    .eq('case_id', caseId);

  if (refsError) {
    throw new Error(`Failed to fetch references: ${refsError.message}`);
  }

  const references: ReferenceReportData[] = (refsData || []).map((ref: any) => {
    const response = ref.reference_responses?.[0];
    return {
      refereeName: ref.referee_name || 'Unknown',
      refereeEmail: ref.referee_email || 'N/A',
      organisation: ref.organisation || 'N/A',
      status: response?.status || ref.status || 'pending',
      receivedAt: response?.received_at,
      flagged: response?.flagged || false
    };
  });

  // Fetch right to work check
  const { data: rtwData, error: rtwError } = await adminClient
    .from('right_to_work_checks')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle();

  if (rtwError) {
    throw new Error(`Failed to fetch RTW check: ${rtwError.message}`);
  }

  const rtwCheck: RtwReportData | null = rtwData
    ? {
        method: rtwData.method || 'Unknown',
        status: rtwData.status || 'pending',
        documentType: rtwData.document_type,
        verified: rtwData.verified || false,
        expiryDate: rtwData.expiry_date
      }
    : null;

  // Fetch DBS check
  const { data: dbsData, error: dbsError } = await adminClient
    .from('dbs_checks')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle();

  if (dbsError) {
    throw new Error(`Failed to fetch DBS check: ${dbsError.message}`);
  }

  const dbsCheck: DbsReportData | null = dbsData
    ? {
        dbsType: dbsData.dbs_type || 'Unknown',
        status: dbsData.status || 'pending',
        certificateNumber: dbsData.certificate_number,
        certificateDate: dbsData.certificate_date,
        hasAdverse: dbsData.has_adverse || false
      }
    : null;

  return {
    caseReference: caseData.reference,
    candidateName: candidate?.full_name || 'Unknown',
    candidateEmail: candidate?.email || 'N/A',
    clientName: client?.name || 'Unknown',
    packageName: screeningPackage?.name || 'Unknown',
    caseStatus: caseData.status || 'unknown',
    caseOutcome: caseData.outcome,
    createdAt: caseData.created_at,
    completedAt: caseData.completed_at,
    checks,
    references,
    rtwCheck,
    dbsCheck,
    adjudicationNotes: caseData.adjudication_notes,
    reviewerName: caseData.reviewed_by,
    reviewedAt: caseData.reviewed_at
  };
}

/**
 * Generate a PDF report from the gathered data
 * Returns a Promise<Buffer> containing the PDF
 */
export async function generateReportPdf(data: ReportData): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const chunks: Uint8Array[] = [];

  doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));

  const pdfPromise = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  // ===== HEADER =====
  doc.fontSize(18).font('Helvetica-Bold').text('BS7858 Pre-Employment Screening Report');
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica').text(`Case Reference: ${data.caseReference}`);
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`);
  doc.moveTo(50, doc.y + 5).lineTo(545, doc.y + 5).stroke('#000000');
  doc.moveDown(1);

  // ===== CANDIDATE INFORMATION =====
  addSectionHeader(doc, 'Candidate Information');
  doc.text(`Name: ${data.candidateName}`);
  doc.text(`Email: ${data.candidateEmail}`);
  doc.text(`Client: ${data.clientName}`);
  doc.text(`Screening Package: ${data.packageName}`);

  // ===== CASE SUMMARY =====
  addSectionHeader(doc, 'Case Summary');
  doc.text(`Status: ${data.caseStatus.charAt(0).toUpperCase() + data.caseStatus.slice(1)}`);
  doc.text(`Outcome: ${data.caseOutcome ? data.caseOutcome.charAt(0).toUpperCase() + data.caseOutcome.slice(1) : 'Pending'}`);
  doc.text(`Created: ${formatDate(data.createdAt)}`);
  if (data.completedAt) {
    doc.text(`Completed: ${formatDate(data.completedAt)}`);
  }

  // ===== CHECKS SUMMARY =====
  addSectionHeader(doc, 'Screening Checks');
  if (data.checks && data.checks.length > 0) {
    // Table header
    doc.fontSize(9).font('Helvetica-Bold');
    let y = doc.y;
    doc.text('Check Type', 50, y);
    doc.text('Status', 200, y);
    doc.text('Outcome', 300, y);
    doc.text('Reviewed', 420, y);

    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke('#cccccc');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');

    // Table rows
    data.checks.forEach((check) => {
      const checkLabel = check.checkType.replace(/_/g, ' ');
      const statusLabel = check.status.charAt(0).toUpperCase() + check.status.slice(1);
      const outcomeLabel = check.outcome
        ? check.outcome.charAt(0).toUpperCase() + check.outcome.slice(1)
        : 'N/A';
      const reviewedLabel = check.reviewedBy ? 'Yes' : 'No';

      doc.text(checkLabel, 50);
      doc.text(statusLabel, 200, doc.y - 12);
      doc.text(outcomeLabel, 300, doc.y - 12);
      doc.text(reviewedLabel, 420, doc.y - 12);
      doc.moveDown(0.5);
    });
  } else {
    doc.text('No checks recorded.');
  }

  // ===== REFERENCE VERIFICATION =====
  addSectionHeader(doc, 'Reference Verification');
  if (data.references && data.references.length > 0) {
    // Table header
    doc.fontSize(9).font('Helvetica-Bold');
    let y = doc.y;
    doc.text('Referee', 50, y);
    doc.text('Organisation', 220, y);
    doc.text('Status', 400, y);
    doc.text('Flagged', 480, y);

    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke('#cccccc');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');

    // Table rows
    data.references.forEach((ref) => {
      const statusLabel = ref.status.charAt(0).toUpperCase() + ref.status.slice(1);
      const flaggedLabel = ref.flagged ? 'Yes' : 'No';

      doc.text(ref.refereeName, 50);
      doc.text(ref.organisation, 220, doc.y - 12);
      doc.text(statusLabel, 400, doc.y - 12);
      doc.text(flaggedLabel, 480, doc.y - 12);
      doc.moveDown(0.5);
    });
  } else {
    doc.text('No references recorded.');
  }

  // ===== RIGHT TO WORK =====
  addSectionHeader(doc, 'Right to Work Check');
  if (data.rtwCheck) {
    doc.text(`Method: ${data.rtwCheck.method}`);
    doc.text(`Status: ${data.rtwCheck.status.charAt(0).toUpperCase() + data.rtwCheck.status.slice(1)}`);
    if (data.rtwCheck.documentType) {
      doc.text(`Document Type: ${data.rtwCheck.documentType}`);
    }
    doc.text(`Verified: ${data.rtwCheck.verified ? 'Yes' : 'No'}`);
    if (data.rtwCheck.expiryDate) {
      doc.text(`Expiry Date: ${formatDate(data.rtwCheck.expiryDate)}`);
    }
  } else {
    doc.text('No right to work check recorded.');
  }

  // ===== DBS CHECK =====
  addSectionHeader(doc, 'DBS Check');
  if (data.dbsCheck) {
    doc.text(`Type: ${data.dbsCheck.dbsType}`);
    doc.text(`Status: ${data.dbsCheck.status.charAt(0).toUpperCase() + data.dbsCheck.status.slice(1)}`);
    if (data.dbsCheck.certificateNumber) {
      doc.text(`Certificate Number: ${data.dbsCheck.certificateNumber}`);
    }
    if (data.dbsCheck.certificateDate) {
      doc.text(`Certificate Date: ${formatDate(data.dbsCheck.certificateDate)}`);
    }
    doc.text(`Adverse Information: ${data.dbsCheck.hasAdverse ? 'Yes' : 'No'}`);
  } else {
    doc.text('No DBS check recorded.');
  }

  // ===== ADJUDICATION =====
  addSectionHeader(doc, 'Adjudication');
  if (data.caseOutcome) {
    doc.text(`Outcome: ${data.caseOutcome.charAt(0).toUpperCase() + data.caseOutcome.slice(1)}`);
  }
  if (data.reviewerName) {
    doc.text(`Reviewed By: ${data.reviewerName}`);
  }
  if (data.reviewedAt) {
    doc.text(`Reviewed: ${formatDate(data.reviewedAt)}`);
  }
  if (data.adjudicationNotes) {
    doc.moveDown(0.5);
    doc.text('Notes:');
    doc.text(data.adjudicationNotes, { width: 445 });
  }

  // ===== FOOTER =====
  doc.moveDown(2);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
  doc.moveDown(0.5);
  doc.fontSize(8).font('Helvetica');
  doc.text('Generated by Instant Check BS7858 Screening Platform');
  doc.text(`Report generated at ${new Date().toLocaleString('en-GB')}`);
  doc.moveDown(0.3);
  doc.text('CONFIDENTIAL - This report contains sensitive personal information and must be handled securely.');

  doc.end();
  return pdfPromise;
}
