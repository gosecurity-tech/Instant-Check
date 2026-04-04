'use server';

import { redirect } from 'next/navigation';
import { requireCandidateUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import {
  addressSchema,
  activitySchema,
  declarationsSchema,
  refereeSchema,
  type AddressInput,
  type ActivityInput,
  type DeclarationsInput,
  type RefereeInput,
} from '@/lib/validators/domain';
import {
  validateAddressTimeline,
  validateActivityTimeline,
} from '@/lib/timeline';

// ============================================================
// Helper: Transform camelCase to snake_case
// ============================================================

function camelToSnake(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

// ============================================================
// 1. getMyAddresses()
// ============================================================

export async function getMyAddresses() {
  const user = await requireCandidateUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('address_history')
    .select('*')
    .eq('candidate_id', user.candidateId!)
    .is('deleted_at', null)
    .order('date_from', { ascending: false });

  if (error) {
    console.error('Error fetching addresses:', error);
    return [];
  }

  return data || [];
}

// ============================================================
// 2. saveAddress()
// ============================================================

export async function saveAddress(
  data: AddressInput & { id?: string },
): Promise<{ error?: string }> {
  try {
    const user = await requireCandidateUser();

    // Validate input
    const validated = addressSchema.safeParse(data);
    if (!validated.success) {
      const firstIssue = validated.error.issues[0];
      return { error: firstIssue?.message || 'Invalid address data' };
    }

    const supabase = await createClient();
    const snakeData = camelToSnake(validated.data);

    if (data.id) {
      // Update: verify ownership first
      const { data: existing } = await supabase
        .from('address_history')
        .select('candidate_id')
        .eq('id', data.id)
        .single();

      if (!existing || existing.candidate_id !== user.candidateId!) {
        return { error: 'Address not found or access denied' };
      }

      const { error: updateError } = await supabase
        .from('address_history')
        .update(snakeData)
        .eq('id', data.id);

      if (updateError) {
        console.error('Error updating address:', updateError);
        return { error: 'Failed to update address' };
      }
    } else {
      // Insert
      const insertData = {
        ...snakeData,
        candidate_id: user.candidateId!,
      };

      const { error: insertError } = await supabase
        .from('address_history')
        .insert(insertData);

      if (insertError) {
        console.error('Error inserting address:', insertError);
        return { error: 'Failed to save address' };
      }
    }

    return {};
  } catch (err) {
    console.error('Unexpected error in saveAddress:', err);
    return { error: 'An unexpected error occurred' };
  }
}

// ============================================================
// 3. deleteAddress()
// ============================================================

export async function deleteAddress(addressId: string): Promise<{ error?: string }> {
  try {
    const user = await requireCandidateUser();
    const supabase = await createClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('address_history')
      .select('candidate_id')
      .eq('id', addressId)
      .single();

    if (!existing || existing.candidate_id !== user.candidateId!) {
      return { error: 'Address not found or access denied' };
    }

    // Soft delete
    const { error } = await supabase
      .from('address_history')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', addressId);

    if (error) {
      console.error('Error deleting address:', error);
      return { error: 'Failed to delete address' };
    }

    return {};
  } catch (err) {
    console.error('Unexpected error in deleteAddress:', err);
    return { error: 'An unexpected error occurred' };
  }
}

// ============================================================
// 4. getMyActivities()
// ============================================================

export async function getMyActivities() {
  const user = await requireCandidateUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('activity_history')
    .select('*')
    .eq('candidate_id', user.candidateId!)
    .is('deleted_at', null)
    .order('date_from', { ascending: false });

  if (error) {
    console.error('Error fetching activities:', error);
    return [];
  }

  return data || [];
}

// ============================================================
// 5. saveActivity()
// ============================================================

export async function saveActivity(
  data: ActivityInput & { id?: string },
): Promise<{ error?: string }> {
  try {
    const user = await requireCandidateUser();

    // Validate input
    const validated = activitySchema.safeParse(data);
    if (!validated.success) {
      const firstIssue = validated.error.issues[0];
      return { error: firstIssue?.message || 'Invalid activity data' };
    }

    const supabase = await createClient();
    const snakeData = camelToSnake(validated.data);

    if (data.id) {
      // Update: verify ownership first
      const { data: existing } = await supabase
        .from('activity_history')
        .select('candidate_id')
        .eq('id', data.id)
        .single();

      if (!existing || existing.candidate_id !== user.candidateId!) {
        return { error: 'Activity not found or access denied' };
      }

      const { error: updateError } = await supabase
        .from('activity_history')
        .update(snakeData)
        .eq('id', data.id);

      if (updateError) {
        console.error('Error updating activity:', updateError);
        return { error: 'Failed to update activity' };
      }
    } else {
      // Insert
      const insertData = {
        ...snakeData,
        candidate_id: user.candidateId!,
      };

      const { error: insertError } = await supabase
        .from('activity_history')
        .insert(insertData);

      if (insertError) {
        console.error('Error inserting activity:', insertError);
        return { error: 'Failed to save activity' };
      }
    }

    return {};
  } catch (err) {
    console.error('Unexpected error in saveActivity:', err);
    return { error: 'An unexpected error occurred' };
  }
}

// ============================================================
// 6. deleteActivity()
// ============================================================

export async function deleteActivity(activityId: string): Promise<{ error?: string }> {
  try {
    const user = await requireCandidateUser();
    const supabase = await createClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('activity_history')
      .select('candidate_id')
      .eq('id', activityId)
      .single();

    if (!existing || existing.candidate_id !== user.candidateId!) {
      return { error: 'Activity not found or access denied' };
    }

    // Soft delete
    const { error } = await supabase
      .from('activity_history')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', activityId);

    if (error) {
      console.error('Error deleting activity:', error);
      return { error: 'Failed to delete activity' };
    }

    return {};
  } catch (err) {
    console.error('Unexpected error in deleteActivity:', err);
    return { error: 'An unexpected error occurred' };
  }
}

// ============================================================
// 7. getMyDeclarations()
// ============================================================

export async function getMyDeclarations() {
  const user = await requireCandidateUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('candidate_declarations')
    .select('*')
    .eq('candidate_id', user.candidateId!)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is OK
    console.error('Error fetching declarations:', error);
  }

  return data || null;
}

// ============================================================
// 8. saveDeclarations()
// ============================================================

export async function saveDeclarations(
  data: DeclarationsInput,
): Promise<{ error?: string }> {
  try {
    const user = await requireCandidateUser();

    // Validate input
    const validated = declarationsSchema.safeParse(data);
    if (!validated.success) {
      const firstIssue = validated.error.issues[0];
      return { error: firstIssue?.message || 'Invalid declarations data' };
    }

    const supabase = await createClient();
    const snakeData = camelToSnake(validated.data);

    // Upsert with candidate_id as conflict target
    const { error } = await supabase
      .from('candidate_declarations')
      .upsert(
        {
          ...snakeData,
          candidate_id: user.candidateId!,
        },
        {
          onConflict: 'candidate_id',
        },
      );

    if (error) {
      console.error('Error upserting declarations:', error);
      return { error: 'Failed to save declarations' };
    }

    return {};
  } catch (err) {
    console.error('Unexpected error in saveDeclarations:', err);
    return { error: 'An unexpected error occurred' };
  }
}

// ============================================================
// 9. getMyReferees()
// ============================================================

export async function getMyReferees() {
  const user = await requireCandidateUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('referees')
    .select('*')
    .eq('candidate_id', user.candidateId!)
    .is('deleted_at', null)
    .order('date_from', { ascending: false });

  if (error) {
    console.error('Error fetching referees:', error);
    return [];
  }

  return data || [];
}

// ============================================================
// 10. saveReferee()
// ============================================================

export async function saveReferee(
  data: RefereeInput & { id?: string },
): Promise<{ error?: string }> {
  try {
    const user = await requireCandidateUser();

    // Validate input
    const validated = refereeSchema.safeParse(data);
    if (!validated.success) {
      const firstIssue = validated.error.issues[0];
      return { error: firstIssue?.message || 'Invalid referee data' };
    }

    const supabase = await createClient();
    const snakeData = camelToSnake(validated.data);

    if (data.id) {
      // Update: verify ownership first
      const { data: existing } = await supabase
        .from('referees')
        .select('candidate_id')
        .eq('id', data.id)
        .single();

      if (!existing || existing.candidate_id !== user.candidateId!) {
        return { error: 'Referee not found or access denied' };
      }

      const { error: updateError } = await supabase
        .from('referees')
        .update(snakeData)
        .eq('id', data.id);

      if (updateError) {
        console.error('Error updating referee:', updateError);
        return { error: 'Failed to update referee' };
      }
    } else {
      // Insert
      const insertData = {
        ...snakeData,
        candidate_id: user.candidateId!,
      };

      const { error: insertError } = await supabase
        .from('referees')
        .insert(insertData);

      if (insertError) {
        console.error('Error inserting referee:', insertError);
        return { error: 'Failed to save referee' };
      }
    }

    return {};
  } catch (err) {
    console.error('Unexpected error in saveReferee:', err);
    return { error: 'An unexpected error occurred' };
  }
}

// ============================================================
// 11. deleteReferee()
// ============================================================

export async function deleteReferee(refereeId: string): Promise<{ error?: string }> {
  try {
    const user = await requireCandidateUser();
    const supabase = await createClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('referees')
      .select('candidate_id')
      .eq('id', refereeId)
      .single();

    if (!existing || existing.candidate_id !== user.candidateId!) {
      return { error: 'Referee not found or access denied' };
    }

    // Soft delete
    const { error } = await supabase
      .from('referees')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', refereeId);

    if (error) {
      console.error('Error deleting referee:', error);
      return { error: 'Failed to delete referee' };
    }

    return {};
  } catch (err) {
    console.error('Unexpected error in deleteReferee:', err);
    return { error: 'An unexpected error occurred' };
  }
}

// ============================================================
// 12. submitCandidateData()
// ============================================================

export async function submitCandidateData(): Promise<{ error?: string }> {
  try {
    const user = await requireCandidateUser();
    const supabase = await createClient();

    // Fetch all data for validation
    const [addressesRes, activitiesRes, declarationsRes, refereesRes, casesRes] = await Promise.all([
      supabase
        .from('address_history')
        .select('id, date_from, date_to, address_line_1')
        .eq('candidate_id', user.candidateId!)
        .is('deleted_at', null),
      supabase
        .from('activity_history')
        .select('id, date_from, date_to, organisation_name, activity_type')
        .eq('candidate_id', user.candidateId!)
        .is('deleted_at', null),
      supabase
        .from('candidate_declarations')
        .select('declaration_confirmed')
        .eq('candidate_id', user.candidateId!)
        .single(),
      supabase
        .from('referees')
        .select('id')
        .eq('candidate_id', user.candidateId!)
        .is('deleted_at', null),
      supabase
        .from('cases')
        .select('id')
        .eq('candidate_id', user.candidateId!)
        .limit(1)
        .single(),
    ]);

    // Check for query errors
    if (addressesRes.error) {
      console.error('Error fetching addresses for validation:', addressesRes.error);
      return { error: 'Failed to validate address history' };
    }
    if (activitiesRes.error) {
      console.error('Error fetching activities for validation:', activitiesRes.error);
      return { error: 'Failed to validate activity history' };
    }
    if (casesRes.error) {
      console.error('Error fetching case ID:', casesRes.error);
      return { error: 'No case found for this candidate' };
    }

    const addresses = addressesRes.data || [];
    const activities = activitiesRes.data || [];
    const declarations = declarationsRes.data;
    const referees = refereesRes.data || [];
    const caseId = casesRes.data?.id;

    // Validation 1: Address timeline covers 5 years
    if (addresses.length === 0) {
      return { error: 'Please add at least one address' };
    }
    const addressTimeline = validateAddressTimeline(addresses);
    if (!addressTimeline.isValid) {
      const gapsSummary = addressTimeline.gaps
        .map((g) => `${g.days} days from ${g.from} to ${g.to}`)
        .join('; ');
      return { error: `Address history incomplete. Gaps: ${gapsSummary}` };
    }

    // Validation 2: Activity timeline covers 5 years
    if (activities.length === 0) {
      return { error: 'Please add at least one activity or employment record' };
    }
    const activityTimeline = validateActivityTimeline(activities);
    if (!activityTimeline.isValid) {
      const gapsSummary = activityTimeline.gaps
        .map((g) => `${g.days} days from ${g.from} to ${g.to}`)
        .join('; ');
      return { error: `Activity history incomplete. Gaps: ${gapsSummary}` };
    }

    // Validation 3: Declarations exist and are confirmed
    if (!declarations || !declarations.declaration_confirmed) {
      return { error: 'Please complete and confirm all declarations' };
    }

    // Validation 4: At least 1 referee exists
    if (referees.length === 0) {
      return { error: 'Please add at least one referee' };
    }

    // Call RPC to submit candidate data
    const { error: rpcError } = await supabase.rpc('submit_candidate_data', {
      candidate_id: user.candidateId!,
      case_id: caseId,
    });

    if (rpcError) {
      console.error('Error calling submit_candidate_data RPC:', rpcError);
      return { error: 'Failed to submit candidate data' };
    }

    // Redirect to confirmation page
    redirect('/candidate/submitted');
  } catch (err) {
    console.error('Unexpected error in submitCandidateData:', err);
    return { error: 'An unexpected error occurred during submission' };
  }
}

// ============================================================
// 13. getSubmissionStatus()
// ============================================================

export async function getSubmissionStatus(): Promise<{
  hasSubmitted: boolean;
  submittedAt: string | null;
}> {
  try {
    const user = await requireCandidateUser();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('candidates')
      .select('has_submitted, submitted_at')
      .eq('id', user.candidateId!)
      .single();

    if (error) {
      console.error('Error fetching submission status:', error);
      return { hasSubmitted: false, submittedAt: null };
    }

    return {
      hasSubmitted: data?.has_submitted || false,
      submittedAt: data?.submitted_at || null,
    };
  } catch (err) {
    console.error('Unexpected error in getSubmissionStatus:', err);
    return { hasSubmitted: false, submittedAt: null };
  }
}
