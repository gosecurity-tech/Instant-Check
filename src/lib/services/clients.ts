import { createClient } from '@/lib/supabase/server';
import type {
  ClientSummary,
  ClientDetail,
  ClientUserEntry,
  PaginatedResult,
  PaginationParams,
} from '@/types/domain';

// ============================================================
// List clients with pagination and search
// ============================================================

export async function listClients(
  params: PaginationParams & { search?: string; isActive?: boolean },
): Promise<PaginatedResult<ClientSummary>> {
  const supabase = await createClient();
  const { page = 1, pageSize = 25, sortBy = 'created_at', sortOrder = 'desc', search, isActive } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('clients')
    .select('*', { count: 'exact' });

  if (search) {
    query = query.or(`company_name.ilike.%${search}%,contact_name.ilike.%${search}%,contact_email.ilike.%${search}%`);
  }

  if (isActive !== undefined) {
    query = query.eq('is_active', isActive);
  }

  const { data, count, error } = await query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to);

  if (error) {
    console.error('listClients error:', error);
    throw new Error(`Failed to list clients: ${error.message}`);
  }

  const totalCount = count ?? 0;

  // Get case counts and user counts for each client
  const clientIds = (data ?? []).map((c: { id: string }) => c.id);

  const [caseCounts, userCounts] = await Promise.all([
    clientIds.length > 0
      ? supabase
          .from('cases')
          .select('client_id, status')
          .in('client_id', clientIds)
      : { data: [] },
    clientIds.length > 0
      ? supabase
          .from('client_users')
          .select('client_id')
          .in('client_id', clientIds)
          .eq('is_active', true)
      : { data: [] },
  ]);

  const casesByClient = new Map<string, { total: number; active: number }>();
  for (const c of (caseCounts.data ?? []) as Array<{ client_id: string; status: string }>) {
    const entry = casesByClient.get(c.client_id) ?? { total: 0, active: 0 };
    entry.total++;
    if (!['complete', 'cancelled'].includes(c.status)) entry.active++;
    casesByClient.set(c.client_id, entry);
  }

  const usersByClient = new Map<string, number>();
  for (const u of (userCounts.data ?? []) as Array<{ client_id: string }>) {
    usersByClient.set(u.client_id, (usersByClient.get(u.client_id) ?? 0) + 1);
  }

  const clients: ClientSummary[] = (data ?? []).map((row: Record<string, unknown>) => {
    const counts = casesByClient.get(row.id as string) ?? { total: 0, active: 0 };
    return {
      id: row.id as string,
      organisation_id: row.organisation_id as string,
      company_name: row.company_name as string,
      contact_name: row.contact_name as string,
      contact_email: row.contact_email as string,
      is_active: row.is_active as boolean,
      created_at: row.created_at as string,
      total_cases: counts.total,
      active_cases: counts.active,
      user_count: usersByClient.get(row.id as string) ?? 0,
    };
  });

  return {
    data: clients,
    count: totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

// ============================================================
// Get single client with full details
// ============================================================

export async function getClientById(clientId: string): Promise<ClientDetail | null> {
  const supabase = await createClient();

  const [clientResult, usersResult, packagesResult, caseCountResult] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).single(),
    supabase.from('client_users').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    supabase.from('screening_packages').select('*, package_checks(check_type)').eq('is_active', true),
    supabase.from('cases').select('id, status', { count: 'exact' }).eq('client_id', clientId),
  ]);

  if (clientResult.error) {
    if (clientResult.error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch client: ${clientResult.error.message}`);
  }

  const row = clientResult.data as Record<string, unknown>;
  const cases = (caseCountResult.data ?? []) as Array<{ status: string }>;
  const activeCases = cases.filter((c) => !['complete', 'cancelled'].includes(c.status)).length;

  const users: ClientUserEntry[] = ((usersResult.data ?? []) as Array<Record<string, unknown>>).map((u) => ({
    id: u.id as string,
    email: u.email as string,
    full_name: u.full_name as string,
    is_active: u.is_active as boolean,
    last_sign_in_at: (u.last_sign_in_at as string) ?? null,
    created_at: u.created_at as string,
  }));

  return {
    id: row.id as string,
    organisation_id: row.organisation_id as string,
    company_name: row.company_name as string,
    contact_name: row.contact_name as string,
    contact_email: row.contact_email as string,
    contact_phone: (row.contact_phone as string) ?? null,
    address: (row.address as string) ?? null,
    notes: (row.notes as string) ?? null,
    is_active: row.is_active as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    total_cases: caseCountResult.count ?? 0,
    active_cases: activeCases,
    user_count: users.filter((u) => u.is_active).length,
    users,
    packages: ((packagesResult.data ?? []) as Array<Record<string, unknown>>).map((p) => ({
      id: p.id as string,
      name: p.name as string,
      description: (p.description as string) ?? null,
      is_active: p.is_active as boolean,
      check_types: ((p.package_checks as Array<{ check_type: string }>) ?? []).map((pc) => pc.check_type) as never[],
      check_count: ((p.package_checks as Array<unknown>) ?? []).length,
      created_at: p.created_at as string,
    })),
  };
}

// ============================================================
// Create client
// ============================================================

export async function createClientOrg(data: {
  organisationId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
}): Promise<string> {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from('clients')
    .insert({
      organisation_id: data.organisationId,
      company_name: data.companyName,
      contact_name: data.contactName,
      contact_email: data.contactEmail,
      contact_phone: data.contactPhone,
      address: data.address,
      notes: data.notes,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create client: ${error.message}`);
  }

  return (result as { id: string }).id;
}

// ============================================================
// Update client
// ============================================================

export async function updateClient(
  clientId: string,
  data: Partial<{
    companyName: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    notes: string;
    isActive: boolean;
  }>,
): Promise<void> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (data.companyName !== undefined) updateData.company_name = data.companyName;
  if (data.contactName !== undefined) updateData.contact_name = data.contactName;
  if (data.contactEmail !== undefined) updateData.contact_email = data.contactEmail;
  if (data.contactPhone !== undefined) updateData.contact_phone = data.contactPhone;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;

  const { error } = await supabase
    .from('clients')
    .update(updateData)
    .eq('id', clientId);

  if (error) {
    throw new Error(`Failed to update client: ${error.message}`);
  }
}

// ============================================================
// Client dashboard stats
// ============================================================

export async function getClientDashboardStats(clientId: string): Promise<{
  totalCases: number;
  inProgress: number;
  completed: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('cases')
    .select('status')
    .eq('client_id', clientId);

  if (error) {
    throw new Error(`Failed to fetch client stats: ${error.message}`);
  }

  const cases = (data ?? []) as Array<{ status: string }>;

  return {
    totalCases: cases.length,
    inProgress: cases.filter((c) => !['complete', 'cancelled', 'new'].includes(c.status)).length,
    completed: cases.filter((c) => c.status === 'complete').length,
  };
}
