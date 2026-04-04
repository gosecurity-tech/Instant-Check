import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export interface OverdueCase {
  id: string;
  organisation_id: string;
  case_reference: string;
  sla_due_date: string;
  days_overdue: number;
  status: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  client_name: string;
  candidate_name: string;
}

export interface ApproachingSLACase {
  id: string;
  organisation_id: string;
  case_reference: string;
  sla_due_date: string;
  days_remaining: number;
  status: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  client_name: string;
  candidate_name: string;
}

export interface SLAStats {
  totalActiveCases: number;
  overdueCount: number;
  approachingSlaCount: number;
  onTrackCount: number;
  averageDaysRemaining: number;
  breachRate: number;
}

const ACTIVE_CASE_STATUSES = [
  'new',
  'awaiting_candidate',
  'in_progress',
  'awaiting_third_party',
  'under_review',
];

function calculateDaysDifference(dateString: string): number {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Finds cases where sla_due_date < today and status is active
 */
export async function getOverdueCases(
  organisationId?: string
): Promise<OverdueCase[]> {
  const adminClient = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  let query = adminClient
    .from('cases')
    .select(
      `
      id,
      organisation_id,
      reference_number,
      sla_due_date,
      status,
      assigned_to,
      assigned_to_name:internal_users(display_name),
      client_name:clients(name),
      candidate_name:candidates(first_name)
    `
    )
    .lt('sla_due_date', today)
    .in('status', ACTIVE_CASE_STATUSES);

  if (organisationId) {
    query = query.eq('organisation_id', organisationId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching overdue cases:', error);
    return [];
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    organisation_id: item.organisation_id,
    case_reference: item.reference_number,
    sla_due_date: item.sla_due_date,
    days_overdue: calculateDaysDifference(item.sla_due_date),
    status: item.status,
    assigned_to: item.assigned_to,
    assigned_to_name: item.assigned_to_name?.[0]?.display_name || null,
    client_name: item.client_name?.[0]?.name || '',
    candidate_name: item.candidate_name?.[0]?.first_name || '',
  }));
}

/**
 * Finds cases where sla_due_date is within N days but not yet overdue
 */
export async function getApproachingSLACases(
  organisationId?: string,
  daysThreshold: number = 3
): Promise<ApproachingSLACase[]> {
  const adminClient = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysThreshold);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  let query = adminClient
    .from('cases')
    .select(
      `
      id,
      organisation_id,
      reference_number,
      sla_due_date,
      status,
      assigned_to,
      assigned_to_name:internal_users(display_name),
      client_name:clients(name),
      candidate_name:candidates(first_name)
    `
    )
    .gte('sla_due_date', today)
    .lte('sla_due_date', futureDateStr)
    .in('status', ACTIVE_CASE_STATUSES);

  if (organisationId) {
    query = query.eq('organisation_id', organisationId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching approaching SLA cases:', error);
    return [];
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    organisation_id: item.organisation_id,
    case_reference: item.reference_number,
    sla_due_date: item.sla_due_date,
    days_remaining: -calculateDaysDifference(item.sla_due_date),
    status: item.status,
    assigned_to: item.assigned_to,
    assigned_to_name: item.assigned_to_name?.[0]?.display_name || null,
    client_name: item.client_name?.[0]?.name || '',
    candidate_name: item.candidate_name?.[0]?.first_name || '',
  }));
}

/**
 * Returns dashboard SLA statistics
 */
export async function getSLAStats(organisationId?: string): Promise<SLAStats> {
  const adminClient = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  let baseQuery = adminClient
    .from('cases')
    .select('id, sla_due_date, status', { count: 'exact' })
    .in('status', ACTIVE_CASE_STATUSES);

  if (organisationId) {
    baseQuery = baseQuery.eq('organisation_id', organisationId);
  }

  const { data: allCases, count: totalActiveCases } = await baseQuery;

  let overdueCount = 0;
  let approachingSlaCount = 0;
  let daysRemainingSum = 0;

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 3);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  (allCases || []).forEach((caseItem: any) => {
    const daysDiff = calculateDaysDifference(caseItem.sla_due_date);
    if (daysDiff > 0) {
      overdueCount++;
    } else if (
      caseItem.sla_due_date >= today &&
      caseItem.sla_due_date <= futureDateStr
    ) {
      approachingSlaCount++;
      daysRemainingSum += -daysDiff;
    }
  });

  const onTrackCount =
    (totalActiveCases || 0) - overdueCount - approachingSlaCount;
  const averageDaysRemaining =
    approachingSlaCount > 0 ? Math.round(daysRemainingSum / approachingSlaCount) : 0;
  const breachRate =
    (totalActiveCases || 0) > 0
      ? Math.round((overdueCount / (totalActiveCases || 1)) * 100)
      : 0;

  return {
    totalActiveCases: totalActiveCases || 0,
    overdueCount,
    approachingSlaCount,
    onTrackCount,
    averageDaysRemaining,
    breachRate,
  };
}

/**
 * Creates an urgent SLA breach task, avoiding duplicates
 */
export async function createSLABreachTask(
  caseId: string,
  organisationId: string,
  assignedTo: string,
  createdBy: string
): Promise<string | null> {
  const adminClient = createAdminClient();

  // Get case reference number
  const { data: caseData } = await adminClient
    .from('cases')
    .select('reference_number')
    .eq('id', caseId)
    .single();

  if (!caseData) {
    console.error('Case not found:', caseId);
    return null;
  }

  const referenceNumber = caseData.reference_number;

  // Check for existing breach task
  const { data: existingTask } = await adminClient
    .from('tasks')
    .select('id')
    .eq('case_id', caseId)
    .ilike('title', 'SLA BREACH%')
    .not('status', 'in', '(completed,cancelled)');

  if (existingTask && existingTask.length > 0) {
    return existingTask[0].id;
  }

  const today = new Date().toISOString().split('T')[0];

  const { data: newTask, error } = await adminClient
    .from('tasks')
    .insert({
      organisation_id: organisationId,
      case_id: caseId,
      title: `SLA BREACH: Case ${referenceNumber}`,
      status: 'in_progress',
      priority: 'urgent',
      assigned_to: assignedTo,
      due_date: today,
      created_by: createdBy,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating SLA breach task:', error);
    return null;
  }

  return newTask?.id || null;
}

/**
 * Creates an SLA warning task, avoiding duplicates
 */
export async function createSLAWarningTask(
  caseId: string,
  organisationId: string,
  assignedTo: string,
  createdBy: string,
  daysRemaining: number
): Promise<string | null> {
  const adminClient = createAdminClient();

  // Get case reference number and SLA due date
  const { data: caseData } = await adminClient
    .from('cases')
    .select('reference_number, sla_due_date')
    .eq('id', caseId)
    .single();

  if (!caseData) {
    console.error('Case not found:', caseId);
    return null;
  }

  const referenceNumber = caseData.reference_number;
  const slaDate = caseData.sla_due_date;

  // Check for existing warning task
  const { data: existingTask } = await adminClient
    .from('tasks')
    .select('id')
    .eq('case_id', caseId)
    .ilike('title', 'SLA Warning%')
    .not('status', 'in', '(completed,cancelled)');

  if (existingTask && existingTask.length > 0) {
    return existingTask[0].id;
  }

  const { data: newTask, error } = await adminClient
    .from('tasks')
    .insert({
      organisation_id: organisationId,
      case_id: caseId,
      title: `SLA Warning: Case ${referenceNumber} due in ${daysRemaining} days`,
      status: 'in_progress',
      priority: 'high',
      assigned_to: assignedTo,
      due_date: slaDate,
      created_by: createdBy,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating SLA warning task:', error);
    return null;
  }

  return newTask?.id || null;
}
