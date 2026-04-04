import { createClient } from '@/lib/supabase/server';
import type {
  CaseSummary,
  CaseDetail,
  CaseCheckDetail,
  StatusHistoryEntry,
  PaginatedResult,
  PaginationParams,
  FilterParams,
} from '@/types/domain';
import { CaseStatus, CasePriority } from '@/types/enums';

// ============================================================
// List cases with pagination, filtering, and search
// ============================================================

export async function listCases(
  params: PaginationParams &
    FilterParams & {
      clientId?: string;
      assignedTo?: string;
      status?: CaseStatus;
    },
): Promise<PaginatedResult<CaseSummary>> {
  const supabase = await createClient();
  const {
    page = 1,
    pageSize = 25,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc',
    clientId,
    assignedTo,
    status,
  } = params;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('cases')
    .select(
      '*, candidates(first_name, last_name, email), clients(company_name), screening_packages(name)',
      { count: 'exact' },
    );

  if (clientId) query = query.eq('client_id', clientId);
  if (assignedTo) query = query.eq('assigned_to', assignedTo);
  if (status) query = query.eq('status', status);

  if (search?.trim()) {
    query = query.or(`case_reference.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to list cases: ${error.message}`);
  }

  const totalCount = count ?? 0;

  // Get check counts per case
  const caseIds = (data ?? []).map((c: Record<string, unknown>) => c.id as string);
  let checkCounts = new Map<string, { total: number; completed: number }>();

  if (caseIds.length > 0) {
    const { data: checks } = await supabase
      .from('case_checks')
      .select('case_id, status')
      .in('case_id', caseIds);

    for (const c of (checks ?? []) as Array<{ case_id: string; status: string }>) {
      const entry = checkCounts.get(c.case_id) ?? { total: 0, completed: 0 };
      entry.total++;
      if (['complete', 'passed', 'failed', 'not_applicable'].includes(c.status)) entry.completed++;
      checkCounts.set(c.case_id, entry);
    }
  }

  const cases: CaseSummary[] = (data ?? []).map((row: Record<string, unknown>) => {
    const candidate = row.candidates as Record<string, unknown> | null;
    const client = row.clients as Record<string, unknown> | null;
    const pkg = row.screening_packages as Record<string, unknown> | null;
    const counts = checkCounts.get(row.id as string) ?? { total: 0, completed: 0 };

    return {
      id: row.id as string,
      case_reference: row.case_reference as string,
      status: row.status as CaseStatus,
      outcome: row.outcome as CaseSummary['outcome'],
      priority: row.priority as CasePriority,
      created_at: row.created_at as string,
      completed_at: (row.completed_at as string) ?? null,
      candidate_name: candidate
        ? `${candidate.first_name ?? ''} ${candidate.last_name ?? ''}`.trim()
        : '',
      candidate_email: (candidate?.email as string) ?? '',
      client_name: (client?.company_name as string) ?? '',
      package_name: (pkg?.name as string) ?? '',
      assigned_to_name: null, // Populated separately if needed
      check_count: counts.total,
      completed_check_count: counts.completed,
    };
  });

  return {
    data: cases,
    count: totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

// ============================================================
// Get single case with all related data
// ============================================================

export async function getCaseById(caseId: string): Promise<CaseDetail | null> {
  const supabase = await createClient();

  const [caseResult, checksResult, historyResult] = await Promise.all([
    supabase
      .from('cases')
      .select('*, candidates(*), clients(company_name), screening_packages(name)')
      .eq('id', caseId)
      .single(),
    supabase
      .from('case_checks')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true }),
    supabase
      .from('case_status_history')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true }),
  ]);

  if (caseResult.error) {
    if (caseResult.error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch case: ${caseResult.error.message}`);
  }

  const row = caseResult.data as Record<string, unknown>;
  const candidate = row.candidates as Record<string, unknown> | null;
  const client = row.clients as Record<string, unknown> | null;
  const pkg = row.screening_packages as Record<string, unknown> | null;

  const checks: CaseCheckDetail[] = ((checksResult.data ?? []) as Array<Record<string, unknown>>).map((c) => ({
    id: c.id as string,
    case_id: c.case_id as string,
    check_type: c.check_type as CaseCheckDetail['check_type'],
    status: c.status as CaseCheckDetail['status'],
    outcome: (c.outcome as CaseCheckDetail['outcome']) ?? null,
    is_required: c.is_required as boolean,
    notes: (c.notes as string) ?? null,
    assigned_to: (c.assigned_to as string) ?? null,
    assigned_to_name: null,
    reviewed_by: (c.reviewed_by as string) ?? null,
    reviewed_by_name: null,
    reviewed_at: (c.reviewed_at as string) ?? null,
    started_at: (c.started_at as string) ?? null,
    completed_at: (c.completed_at as string) ?? null,
    created_at: c.created_at as string,
    updated_at: c.updated_at as string,
  }));

  const statusHistory: StatusHistoryEntry[] = ((historyResult.data ?? []) as Array<Record<string, unknown>>).map((h) => ({
    id: h.id as string,
    old_status: h.old_status as string,
    new_status: h.new_status as string,
    changed_by: h.changed_by as string,
    changed_by_name: null,
    notes: (h.notes as string) ?? null,
    created_at: h.created_at as string,
  }));

  const completedChecks = checks.filter((c) =>
    ['complete', 'passed', 'failed', 'not_applicable'].includes(c.status),
  ).length;

  return {
    id: row.id as string,
    case_reference: row.case_reference as string,
    status: row.status as CaseStatus,
    outcome: row.outcome as CaseDetail['outcome'],
    priority: row.priority as CasePriority,
    created_at: row.created_at as string,
    completed_at: (row.completed_at as string) ?? null,
    candidate_name: candidate
      ? `${candidate.first_name ?? ''} ${candidate.last_name ?? ''}`.trim()
      : '',
    candidate_email: (candidate?.email as string) ?? '',
    client_name: (client?.company_name as string) ?? '',
    package_name: (pkg?.name as string) ?? '',
    assigned_to_name: null,
    check_count: checks.length,
    completed_check_count: completedChecks,
    organisation_id: row.organisation_id as string,
    client_id: row.client_id as string,
    candidate_id: row.candidate_id as string,
    package_id: row.package_id as string,
    assigned_to: (row.assigned_to as string) ?? null,
    created_by: row.created_by as string,
    sla_deadline: (row.sla_deadline as string) ?? null,
    notes: (row.notes as string) ?? null,
    updated_at: row.updated_at as string,
    checks,
    candidate: {
      id: (candidate?.id as string) ?? '',
      first_name: (candidate?.first_name as string) ?? '',
      last_name: (candidate?.last_name as string) ?? '',
      email: (candidate?.email as string) ?? '',
      phone: (candidate?.phone as string) ?? null,
      date_of_birth: (candidate?.date_of_birth as string) ?? null,
      has_submitted: (candidate?.has_submitted as boolean) ?? false,
      submitted_at: (candidate?.submitted_at as string) ?? null,
      created_at: (candidate?.created_at as string) ?? '',
    },
    status_history: statusHistory,
  };
}

// ============================================================
// Create case via Postgres RPC
// ============================================================

export async function createCase(data: {
  clientId: string;
  candidateId: string;
  packageId: string;
  priority?: CasePriority;
  notes?: string;
}): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: result, error } = await supabase.rpc('create_case_with_checks', {
    p_client_id: data.clientId,
    p_candidate_id: data.candidateId,
    p_package_id: data.packageId,
    p_created_by: user.id,
    p_priority: data.priority ?? 'standard',
    p_notes: data.notes ?? null,
  });

  if (error) {
    throw new Error(`Failed to create case: ${error.message}`);
  }

  return result as string;
}

// ============================================================
// Transition case status via RPC
// ============================================================

export async function transitionCaseStatus(
  caseId: string,
  newStatus: CaseStatus,
  notes?: string,
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.rpc('transition_case_status', {
    p_case_id: caseId,
    p_new_status: newStatus,
    p_actor_id: user.id,
    p_notes: notes ?? null,
  });

  if (error) {
    throw new Error(`Failed to transition case status: ${error.message}`);
  }
}

// ============================================================
// Assign case
// ============================================================

export async function assignCase(caseId: string, assignedTo: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('cases')
    .update({ assigned_to: assignedTo })
    .eq('id', caseId);

  if (error) {
    throw new Error(`Failed to assign case: ${error.message}`);
  }
}

// ============================================================
// Dashboard stats
// ============================================================

export async function getCaseDashboardStats(): Promise<{
  activeCases: number;
  awaitingCandidate: number;
  underReview: number;
  completedThisMonth: number;
}> {
  const supabase = await createClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [activeRes, awaitingRes, reviewRes, completedRes] = await Promise.all([
    supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .not('status', 'in', '(complete,cancelled)'),
    supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'awaiting_candidate'),
    supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'under_review'),
    supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'complete')
      .gte('completed_at', monthStart),
  ]);

  return {
    activeCases: activeRes.count ?? 0,
    awaitingCandidate: awaitingRes.count ?? 0,
    underReview: reviewRes.count ?? 0,
    completedThisMonth: completedRes.count ?? 0,
  };
}
