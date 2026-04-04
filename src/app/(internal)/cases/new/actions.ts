'use server';

import { redirect } from 'next/navigation';
import { requireInternalUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { createCaseSchema } from '@/lib/validators/domain';

interface CreateCaseActionInput {
  client_id: string;
  candidate_first_name: string;
  candidate_last_name: string;
  candidate_email: string;
  candidate_phone?: string;
  package_id: string;
  priority?: string;
  notes?: string;
}

export async function createCaseAction(
  data: CreateCaseActionInput,
): Promise<{ error?: string }> {
  const user = await requireInternalUser();

  const parsed = createCaseSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { error: firstError.message };
  }

  const supabase = await createClient();

  // First create candidate
  const { data: candidate, error: candidateError } = await supabase
    .from('candidates')
    .insert({
      organisation_id: user.organisationId,
      first_name: parsed.data.candidate_first_name,
      last_name: parsed.data.candidate_last_name,
      email: parsed.data.candidate_email,
      phone: parsed.data.candidate_phone ?? null,
    })
    .select('id')
    .single();

  if (candidateError) {
    return { error: `Failed to create candidate: ${candidateError.message}` };
  }

  // Then create case via RPC
  const { data: caseId, error: caseError } = await supabase.rpc(
    'create_case_with_checks',
    {
      p_client_id: parsed.data.client_id,
      p_candidate_id: candidate.id,
      p_package_id: parsed.data.package_id,
      p_created_by: user.id,
      p_priority: parsed.data.priority ?? 'standard',
      p_notes: parsed.data.notes ?? null,
    },
  );

  if (caseError) {
    // Rollback candidate creation
    await supabase.from('candidates').delete().eq('id', candidate.id);
    return { error: `Failed to create case: ${caseError.message}` };
  }

  redirect(`/cases/${caseId}`);
}
