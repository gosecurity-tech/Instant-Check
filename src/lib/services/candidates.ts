import { createClient } from '@/lib/supabase/server';
import type {
  CandidateSummary,
  CandidateDetail,
  AddressEntry,
  ActivityEntry,
  CandidateDeclarations,
  RefereeEntry,
  PaginatedResult,
  PaginationParams,
} from '@/types/domain';

/**
 * List candidates with pagination and optional search
 */
export async function listCandidates(
  params: PaginationParams & { search?: string }
): Promise<PaginatedResult<CandidateSummary>> {
  const supabase = await createClient();

  const {
    page = 1,
    pageSize = 20,
    search = '',
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = params;

  try {
    // Calculate range for pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Start with base query
    let query = supabase
      .from('candidates')
      .select('*', { count: 'exact' });

    // Apply search filter if provided
    if (search && search.trim()) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    // Apply sorting
    const orderValue = sortOrder === 'asc' ? { ascending: true } : { ascending: false };
    query = query.order(sortBy as string, orderValue);

    // Apply pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list candidates: ${error.message}`);
    }

    // Transform to CandidateSummary type
    const candidates: CandidateSummary[] = (data || []).map((item: any) => ({
      id: item.id,
      first_name: item.first_name,
      last_name: item.last_name,
      email: item.email,
      phone: item.phone,
      date_of_birth: item.date_of_birth,
      has_submitted: item.has_submitted,
      submitted_at: item.submitted_at,
      created_at: item.created_at,
    }));

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      data: candidates,
      count: totalCount,
      page,
      pageSize,
      totalPages,
    };
  } catch (error) {
    console.error('Error listing candidates:', error);
    throw error;
  }
}

/**
 * Get a single candidate with all related data
 * (addresses, activities, declarations, documents, referees)
 */
export async function getCandidateById(candidateId: string): Promise<CandidateDetail | null> {
  const supabase = await createClient();

  try {
    // Fetch main candidate data
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (candidateError) {
      if (candidateError.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw new Error(`Failed to fetch candidate: ${candidateError.message}`);
    }

    if (!candidateData) {
      return null;
    }

    // Fetch all related data in parallel
    const [
      { data: addresses },
      { data: activities },
      { data: declarationsData },
      { data: documents },
      { data: referees },
    ] = await Promise.all([
      supabase.from('candidate_addresses').select('*').eq('candidate_id', candidateId),
      supabase.from('candidate_activities').select('*').eq('candidate_id', candidateId),
      supabase.from('candidate_declarations').select('*').eq('candidate_id', candidateId),
      supabase.from('documents').select('*').eq('candidate_id', candidateId),
      supabase.from('candidate_referees').select('*').eq('candidate_id', candidateId),
    ]);

    // Transform to CandidateDetail type
    const candidateDetail: CandidateDetail = {
      id: candidateData.id,
      first_name: candidateData.first_name,
      last_name: candidateData.last_name,
      email: candidateData.email,
      phone: candidateData.phone,
      date_of_birth: candidateData.date_of_birth,
      has_submitted: candidateData.has_submitted,
      submitted_at: candidateData.submitted_at,
      created_at: candidateData.created_at,
      organisation_id: candidateData.organisation_id,
      auth_user_id: candidateData.auth_user_id,
      national_insurance_number: candidateData.national_insurance_number,
      current_address: candidateData.current_address,
      updated_at: candidateData.updated_at,
      addresses: (addresses || []) as AddressEntry[],
      activities: (activities || []) as ActivityEntry[],
      declarations:
        declarationsData && declarationsData.length > 0
          ? (declarationsData[0] as CandidateDeclarations)
          : null,
      documents: documents || [],
      referees: (referees || []) as RefereeEntry[],
    };

    return candidateDetail;
  } catch (error) {
    console.error('Error fetching candidate:', error);
    throw error;
  }
}

/**
 * Create a new candidate
 */
export async function createCandidate(data: {
  organisationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
}): Promise<string> {
  const supabase = await createClient();

  try {
    const { data: result, error } = await supabase
      .from('candidates')
      .insert({
        organisation_id: data.organisationId,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone || null,
        date_of_birth: data.dateOfBirth || null,
        has_submitted: false,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create candidate: ${error.message}`);
    }

    if (!result?.id) {
      throw new Error('Candidate creation returned no ID');
    }

    return result.id;
  } catch (error) {
    console.error('Error creating candidate:', error);
    throw error;
  }
}

/**
 * Submit candidate data using Postgres RPC function
 */
export async function submitCandidateData(caseId: string, candidateId: string): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase.rpc('submit_candidate_data', {
      p_case_id: caseId,
      p_candidate_id: candidateId,
    });

    if (error) {
      throw new Error(`Failed to submit candidate data: ${error.message}`);
    }
  } catch (error) {
    console.error('Error submitting candidate data:', error);
    throw error;
  }
}

// ============================================================
// Address history CRUD
// ============================================================

/**
 * Get address history for a candidate
 */
export async function getAddressHistory(candidateId: string): Promise<AddressEntry[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('candidate_addresses')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('date_from', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch address history: ${error.message}`);
    }

    return (data || []) as AddressEntry[];
  } catch (error) {
    console.error('Error fetching address history:', error);
    throw error;
  }
}

/**
 * Add an address entry for a candidate
 */
export async function addAddress(
  candidateId: string,
  data: Omit<AddressEntry, 'id' | 'candidate_id' | 'created_at'>
): Promise<string> {
  const supabase = await createClient();

  try {
    const { data: result, error } = await supabase
      .from('candidate_addresses')
      .insert({
        candidate_id: candidateId,
        ...data,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to add address: ${error.message}`);
    }

    if (!result?.id) {
      throw new Error('Address creation returned no ID');
    }

    return result.id;
  } catch (error) {
    console.error('Error adding address:', error);
    throw error;
  }
}

/**
 * Update an address entry
 */
export async function updateAddress(
  addressId: string,
  data: Partial<Omit<AddressEntry, 'id' | 'candidate_id' | 'created_at'>>
): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('candidate_addresses')
      .update(data)
      .eq('id', addressId);

    if (error) {
      throw new Error(`Failed to update address: ${error.message}`);
    }
  } catch (error) {
    console.error('Error updating address:', error);
    throw error;
  }
}

/**
 * Delete an address entry
 */
export async function deleteAddress(addressId: string): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('candidate_addresses')
      .delete()
      .eq('id', addressId);

    if (error) {
      throw new Error(`Failed to delete address: ${error.message}`);
    }
  } catch (error) {
    console.error('Error deleting address:', error);
    throw error;
  }
}

// ============================================================
// Activity history CRUD
// ============================================================

/**
 * Get activity history for a candidate
 */
export async function getActivityHistory(candidateId: string): Promise<ActivityEntry[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('candidate_activities')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('date_from', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch activity history: ${error.message}`);
    }

    return (data || []) as ActivityEntry[];
  } catch (error) {
    console.error('Error fetching activity history:', error);
    throw error;
  }
}

/**
 * Add an activity entry for a candidate
 */
export async function addActivity(
  candidateId: string,
  data: Omit<ActivityEntry, 'id' | 'candidate_id' | 'created_at'>
): Promise<string> {
  const supabase = await createClient();

  try {
    const { data: result, error } = await supabase
      .from('candidate_activities')
      .insert({
        candidate_id: candidateId,
        ...data,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to add activity: ${error.message}`);
    }

    if (!result?.id) {
      throw new Error('Activity creation returned no ID');
    }

    return result.id;
  } catch (error) {
    console.error('Error adding activity:', error);
    throw error;
  }
}

/**
 * Update an activity entry
 */
export async function updateActivity(
  activityId: string,
  data: Partial<Omit<ActivityEntry, 'id' | 'candidate_id' | 'created_at'>>
): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('candidate_activities')
      .update(data)
      .eq('id', activityId);

    if (error) {
      throw new Error(`Failed to update activity: ${error.message}`);
    }
  } catch (error) {
    console.error('Error updating activity:', error);
    throw error;
  }
}

/**
 * Delete an activity entry
 */
export async function deleteActivity(activityId: string): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('candidate_activities')
      .delete()
      .eq('id', activityId);

    if (error) {
      throw new Error(`Failed to delete activity: ${error.message}`);
    }
  } catch (error) {
    console.error('Error deleting activity:', error);
    throw error;
  }
}

// ============================================================
// Declarations CRUD
// ============================================================

/**
 * Get declarations for a candidate
 */
export async function getDeclarations(
  candidateId: string
): Promise<CandidateDeclarations | null> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('candidate_declarations')
      .select('*')
      .eq('candidate_id', candidateId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw new Error(`Failed to fetch declarations: ${error.message}`);
    }

    return (data || null) as CandidateDeclarations | null;
  } catch (error) {
    console.error('Error fetching declarations:', error);
    throw error;
  }
}

/**
 * Save declarations for a candidate (upsert)
 */
export async function saveDeclarations(
  candidateId: string,
  data: Omit<CandidateDeclarations, 'id' | 'candidate_id' | 'created_at' | 'updated_at'>
): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('candidate_declarations')
      .upsert(
        {
          candidate_id: candidateId,
          ...data,
        },
        {
          onConflict: 'candidate_id',
        }
      );

    if (error) {
      throw new Error(`Failed to save declarations: ${error.message}`);
    }
  } catch (error) {
    console.error('Error saving declarations:', error);
    throw error;
  }
}

// ============================================================
// Referees CRUD
// ============================================================

/**
 * Get referees for a candidate
 */
export async function getReferees(candidateId: string): Promise<RefereeEntry[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('candidate_referees')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch referees: ${error.message}`);
    }

    return (data || []) as RefereeEntry[];
  } catch (error) {
    console.error('Error fetching referees:', error);
    throw error;
  }
}

/**
 * Add a referee entry for a candidate
 */
export async function addReferee(
  candidateId: string,
  data: Omit<RefereeEntry, 'id' | 'candidate_id' | 'created_at'>
): Promise<string> {
  const supabase = await createClient();

  try {
    const { data: result, error } = await supabase
      .from('candidate_referees')
      .insert({
        candidate_id: candidateId,
        ...data,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to add referee: ${error.message}`);
    }

    if (!result?.id) {
      throw new Error('Referee creation returned no ID');
    }

    return result.id;
  } catch (error) {
    console.error('Error adding referee:', error);
    throw error;
  }
}

/**
 * Update a referee entry
 */
export async function updateReferee(
  refereeId: string,
  data: Partial<Omit<RefereeEntry, 'id' | 'candidate_id' | 'created_at'>>
): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('candidate_referees')
      .update(data)
      .eq('id', refereeId);

    if (error) {
      throw new Error(`Failed to update referee: ${error.message}`);
    }
  } catch (error) {
    console.error('Error updating referee:', error);
    throw error;
  }
}

/**
 * Delete a referee entry
 */
export async function deleteReferee(refereeId: string): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('candidate_referees')
      .delete()
      .eq('id', refereeId);

    if (error) {
      throw new Error(`Failed to delete referee: ${error.message}`);
    }
  } catch (error) {
    console.error('Error deleting referee:', error);
    throw error;
  }
}
