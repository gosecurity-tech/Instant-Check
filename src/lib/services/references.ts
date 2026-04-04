import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ReferenceRequestSummary } from '@/types/domain';
import { ReferenceStatus } from '@/types/enums';
import type { ReferenceType } from '@/types/enums';

// Local type definitions for reference workflow
export interface ReferenceResponseInput {
  respondentName: string;
  respondentEmail: string;
  respondentJobTitle?: string;
  candidateKnown: boolean;
  datesConfirmed: boolean;
  dateFromConfirmed?: string;
  dateToConfirmed?: string;
  jobTitleConfirmed?: string;
  reasonForLeaving?: string;
  performanceRating?: string;
  conductIssues: boolean;
  conductDetails?: string;
  wouldReemploy?: boolean;
  additionalComments?: string;
}

export interface ReferenceResponseData {
  id: string;
  respondent_name: string;
  respondent_email: string;
  respondent_job_title: string | null;
  candidate_known: boolean | null;
  dates_confirmed: boolean | null;
  date_from_confirmed: string | null;
  date_to_confirmed: string | null;
  job_title_confirmed: string | null;
  reason_for_leaving: string | null;
  performance_rating: string | null;
  conduct_issues: boolean;
  conduct_details: string | null;
  would_reemploy: boolean | null;
  additional_comments: string | null;
  has_discrepancies: boolean;
  discrepancy_notes: string | null;
  flagged_by: string | null;
  flagged_at: string | null;
  submitted_at: string;
}

export interface ReferenceRequestDetail {
  id: string;
  case_id: string;
  check_id: string;
  referee_id: string;
  organisation_id: string;
  token: string;
  token_expires_at: string;
  status: ReferenceStatus;
  sent_at: string | null;
  reminder_sent_at: string | null;
  reminder_count: number;
  received_at: string | null;
  sent_by: string | null;
  created_at: string;
  // Joined
  referee_name: string;
  referee_email: string;
  referee_phone: string | null;
  referee_organisation: string | null;
  reference_type: string;
  // Response if exists
  response: ReferenceResponseData | null;
}

export interface ReferenceStats {
  total: number;
  sent: number;
  received: number;
  verified: number;
  flagged: number;
  pending: number;
}

/**
 * List all reference requests for a case with summary details
 */
export async function listReferencesForCase(
  caseId: string
): Promise<ReferenceRequestSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reference_requests')
    .select(
      `
      id,
      check_id,
      referee_id,
      status,
      sent_at,
      reminder_count,
      reminder_sent_at,
      received_at,
      created_at,
      referees (
        full_name,
        email,
        organisation,
        reference_type
      )
    `
    )
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list references for case: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    case_check_id: row.check_id,
    referee_id: row.referee_id,
    status: row.status,
    referee_name: row.referees?.full_name || '',
    referee_email: row.referees?.email || '',
    organisation_name: row.referees?.organisation || null,
    reference_type: row.referees?.reference_type || '',
    sent_at: row.sent_at,
    reminder_count: row.reminder_count || 0,
    last_reminder_at: row.reminder_sent_at,
    received_at: row.received_at,
    created_at: row.created_at,
  })) as ReferenceRequestSummary[];
}

/**
 * List all reference requests for a specific check
 */
export async function listReferencesForCheck(
  checkId: string
): Promise<ReferenceRequestSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reference_requests')
    .select(
      `
      id,
      check_id,
      referee_id,
      status,
      sent_at,
      reminder_count,
      reminder_sent_at,
      received_at,
      created_at,
      referees (
        full_name,
        email,
        organisation,
        reference_type
      )
    `
    )
    .eq('check_id', checkId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(
      `Failed to list references for check: ${error.message}`
    );
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    case_check_id: row.check_id,
    referee_id: row.referee_id,
    status: row.status,
    referee_name: row.referees?.full_name || '',
    referee_email: row.referees?.email || '',
    organisation_name: row.referees?.organisation || null,
    reference_type: row.referees?.reference_type || '',
    sent_at: row.sent_at,
    reminder_count: row.reminder_count || 0,
    last_reminder_at: row.reminder_sent_at,
    received_at: row.received_at,
    created_at: row.created_at,
  })) as ReferenceRequestSummary[];
}

/**
 * Get full detail for a reference request including response data
 */
export async function getReferenceRequestById(
  requestId: string
): Promise<ReferenceRequestDetail | null> {
  const supabase = await createClient();

  const { data: request, error: requestError } = await supabase
    .from('reference_requests')
    .select(
      `
      id,
      case_id,
      check_id,
      referee_id,
      organisation_id,
      token,
      token_expires_at,
      status,
      sent_at,
      reminder_sent_at,
      reminder_count,
      received_at,
      sent_by,
      created_at,
      referees (
        full_name,
        email,
        phone,
        organisation,
        reference_type
      )
    `
    )
    .eq('id', requestId)
    .single();

  if (requestError) {
    if (requestError.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(
      `Failed to get reference request: ${requestError.message}`
    );
  }

  // Fetch response if it exists
  const { data: response } = await supabase
    .from('reference_responses')
    .select('*')
    .eq('request_id', requestId)
    .single();

  const referee = (request as any).referees || {};

  return {
    id: request.id,
    case_id: request.case_id,
    check_id: request.check_id,
    referee_id: request.referee_id,
    organisation_id: request.organisation_id,
    token: request.token,
    token_expires_at: request.token_expires_at,
    status: request.status,
    sent_at: request.sent_at,
    reminder_sent_at: request.reminder_sent_at,
    reminder_count: request.reminder_count || 0,
    received_at: request.received_at,
    sent_by: request.sent_by,
    created_at: request.created_at,
    referee_name: referee.full_name || '',
    referee_email: referee.email || '',
    referee_phone: referee.phone || null,
    referee_organisation: referee.organisation || null,
    reference_type: referee.reference_type || '',
    response: (response as ReferenceResponseData) || null,
  };
}

/**
 * Create a new reference request (draft status)
 */
export async function createReferenceRequest(data: {
  caseId: string;
  checkId: string;
  refereeId: string;
  organisationId: string;
}): Promise<string> {
  const supabase = await createClient();
  const token = crypto.randomUUID();
  const tokenExpiresAt = new Date();
  tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30);

  const { data: created, error } = await supabase
    .from('reference_requests')
    .insert({
      case_id: data.caseId,
      check_id: data.checkId,
      referee_id: data.refereeId,
      organisation_id: data.organisationId,
      token,
      token_expires_at: tokenExpiresAt.toISOString(),
      status: 'draft',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create reference request: ${error.message}`);
  }

  return created.id;
}

/**
 * Send a reference request
 */
export async function sendReferenceRequest(
  requestId: string,
  sentBy: string
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reference_requests')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_by: sentBy,
    })
    .eq('id', requestId)
    .select('token')
    .single();

  if (error) {
    throw new Error(`Failed to send reference request: ${error.message}`);
  }

  return data.token;
}

/**
 * Send a reminder for an existing reference request
 */
export async function sendReferenceReminder(
  requestId: string
): Promise<void> {
  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from('reference_requests')
    .select('reminder_count')
    .eq('id', requestId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch reference request: ${fetchError.message}`);
  }

  const newReminderCount = (current?.reminder_count || 0) + 1;

  const { error: updateError } = await supabase
    .from('reference_requests')
    .update({
      reminder_sent_at: new Date().toISOString(),
      reminder_count: newReminderCount,
      status: 'reminder_sent',
    })
    .eq('id', requestId);

  if (updateError) {
    throw new Error(
      `Failed to send reminder for reference: ${updateError.message}`
    );
  }
}

/**
 * Mark a reference request as unresponsive
 */
export async function markUnresponsive(requestId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('reference_requests')
    .update({
      status: 'unresponsive',
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(`Failed to mark reference as unresponsive: ${error.message}`);
  }
}

/**
 * Mark a reference request as declined
 */
export async function markDeclined(requestId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('reference_requests')
    .update({
      status: 'declined',
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(`Failed to mark reference as declined: ${error.message}`);
  }
}

/**
 * Flag a reference for discrepancy and update notes
 */
export async function flagDiscrepancy(
  requestId: string,
  flaggedBy: string,
  notes: string
): Promise<void> {
  const supabase = await createClient();

  // Update response record
  const { error: responseError } = await supabase
    .from('reference_responses')
    .update({
      has_discrepancies: true,
      discrepancy_notes: notes,
      flagged_by: flaggedBy,
      flagged_at: new Date().toISOString(),
    })
    .eq('request_id', requestId);

  if (responseError) {
    throw new Error(
      `Failed to update reference response: ${responseError.message}`
    );
  }

  // Update request status
  const { error: requestError } = await supabase
    .from('reference_requests')
    .update({
      status: 'discrepancy_flagged',
    })
    .eq('id', requestId);

  if (requestError) {
    throw new Error(
      `Failed to flag reference discrepancy: ${requestError.message}`
    );
  }
}

/**
 * Mark a reference as verified
 */
export async function verifyReference(requestId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('reference_requests')
    .update({
      status: 'verified',
    })
    .eq('id', requestId);

  if (error) {
    throw new Error(`Failed to verify reference: ${error.message}`);
  }
}

/**
 * Get reference request by token (public endpoint - admin client)
 * Validates token expiry and status
 */
export async function getReferenceByToken(token: string): Promise<{
  request: ReferenceRequestDetail;
  candidate: { id: string; full_name: string; email: string };
} | null> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: request, error: requestError } = await supabase
    .from('reference_requests')
    .select(
      `
      id,
      case_id,
      check_id,
      referee_id,
      organisation_id,
      token,
      token_expires_at,
      status,
      sent_at,
      reminder_sent_at,
      reminder_count,
      received_at,
      sent_by,
      created_at,
      cases (
        candidate_id,
        candidates (
          id,
          full_name,
          email
        )
      ),
      referees (
        full_name,
        email,
        phone,
        organisation,
        reference_type
      )
    `
    )
    .eq('token', token)
    .single();

  if (requestError) {
    if (requestError.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get reference by token: ${requestError.message}`);
  }

  // Validate token expiry
  if (request.token_expires_at && request.token_expires_at < now) {
    return null; // Token expired
  }

  // Validate status
  if (request.status !== 'sent' && request.status !== 'reminder_sent') {
    return null; // Request not in valid state
  }

  const caseData = (request as any).cases || {};
  const candidateData = caseData.candidates || {};
  const referee = (request as any).referees || {};

  return {
    request: {
      id: request.id,
      case_id: request.case_id,
      check_id: request.check_id,
      referee_id: request.referee_id,
      organisation_id: request.organisation_id,
      token: request.token,
      token_expires_at: request.token_expires_at,
      status: request.status,
      sent_at: request.sent_at,
      reminder_sent_at: request.reminder_sent_at,
      reminder_count: request.reminder_count || 0,
      received_at: request.received_at,
      sent_by: request.sent_by,
      created_at: request.created_at,
      referee_name: referee.full_name || '',
      referee_email: referee.email || '',
      referee_phone: referee.phone || null,
      referee_organisation: referee.organisation || null,
      reference_type: referee.reference_type || '',
      response: null,
    },
    candidate: {
      id: candidateData.id || '',
      full_name: candidateData.full_name || '',
      email: candidateData.email || '',
    },
  };
}

/**
 * Submit a reference response (public endpoint - admin client)
 * Validates token and creates response record
 */
export async function submitReferenceResponse(
  token: string,
  data: ReferenceResponseInput,
  ipAddress: string
): Promise<string> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Validate token first
  const { data: request, error: requestError } = await supabase
    .from('reference_requests')
    .select('id, token_expires_at, status')
    .eq('token', token)
    .single();

  if (requestError || !request) {
    throw new Error('Invalid reference token');
  }

  if (request.token_expires_at < now) {
    throw new Error('Reference token has expired');
  }

  if (request.status !== 'sent' && request.status !== 'reminder_sent') {
    throw new Error('Reference request is not in valid state for submission');
  }

  // Create response record
  const { data: response, error: responseError } = await supabase
    .from('reference_responses')
    .insert({
      request_id: request.id,
      respondent_name: data.respondentName,
      respondent_email: data.respondentEmail,
      respondent_job_title: data.respondentJobTitle || null,
      candidate_known: data.candidateKnown,
      dates_confirmed: data.datesConfirmed,
      date_from_confirmed: data.dateFromConfirmed || null,
      date_to_confirmed: data.dateToConfirmed || null,
      job_title_confirmed: data.jobTitleConfirmed || null,
      reason_for_leaving: data.reasonForLeaving || null,
      performance_rating: data.performanceRating || null,
      conduct_issues: data.conductIssues,
      conduct_details: data.conductDetails || null,
      would_reemploy: data.wouldReemploy || null,
      additional_comments: data.additionalComments || null,
      ip_address: ipAddress,
    })
    .select('id')
    .single();

  if (responseError) {
    throw new Error(
      `Failed to submit reference response: ${responseError.message}`
    );
  }

  // Update request status to received
  const { error: updateError } = await supabase
    .from('reference_requests')
    .update({
      status: 'received',
      received_at: now,
    })
    .eq('id', request.id);

  if (updateError) {
    throw new Error(
      `Failed to update reference request status: ${updateError.message}`
    );
  }

  return response.id;
}

/**
 * Get reference response for a request
 */
export async function getReferenceResponse(
  requestId: string
): Promise<ReferenceResponseData | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reference_responses')
    .select('*')
    .eq('request_id', requestId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get reference response: ${error.message}`);
  }

  return data as ReferenceResponseData;
}

/**
 * List all pending references for an organisation
 */
export async function listPendingReferences(
  organisationId: string
): Promise<ReferenceRequestSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reference_requests')
    .select(
      `
      id,
      check_id,
      referee_id,
      status,
      sent_at,
      reminder_count,
      reminder_sent_at,
      received_at,
      created_at,
      referees (
        full_name,
        email,
        organisation,
        reference_type
      )
    `
    )
    .eq('organisation_id', organisationId)
    .in('status', ['sent', 'reminder_sent'])
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(
      `Failed to list pending references: ${error.message}`
    );
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    case_check_id: row.check_id,
    referee_id: row.referee_id,
    status: row.status,
    referee_name: row.referees?.full_name || '',
    referee_email: row.referees?.email || '',
    organisation_name: row.referees?.organisation || null,
    reference_type: row.referees?.reference_type || '',
    sent_at: row.sent_at,
    reminder_count: row.reminder_count || 0,
    last_reminder_at: row.reminder_sent_at,
    received_at: row.received_at,
    created_at: row.created_at,
  })) as ReferenceRequestSummary[];
}

/**
 * Get reference statistics for a case
 */
export async function getReferenceStats(caseId: string): Promise<ReferenceStats> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reference_requests')
    .select('status')
    .eq('case_id', caseId);

  if (error) {
    throw new Error(`Failed to get reference stats: ${error.message}`);
  }

  const statuses = (data || []).map((row: any) => row.status);

  return {
    total: statuses.length,
    sent: statuses.filter(s => s === 'sent').length,
    received: statuses.filter(s => s === 'received').length,
    verified: statuses.filter(s => s === 'verified').length,
    flagged: statuses.filter(s => s === 'discrepancy_flagged').length,
    pending: statuses.filter(s => s === 'sent' || s === 'reminder_sent').length,
  };
}
