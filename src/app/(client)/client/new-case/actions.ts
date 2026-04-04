'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { requireClientUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { createCase } from '@/lib/services/cases';

const createCaseSchema = z.object({
  client_id: z.string().uuid(),
  candidate_first_name: z.string().min(1),
  candidate_last_name: z.string().min(1),
  candidate_email: z.string().email(),
  candidate_phone: z.string().optional(),
  package_id: z.string().uuid(),
  notes: z.string().optional(),
});

type CreateCaseInput = z.infer<typeof createCaseSchema>;

export async function createCaseAction(
  input: CreateCaseInput
): Promise<{ error?: string }> {
  try {
    // Verify user is authenticated and is a client user
    const user = await requireClientUser();

    // Validate input
    const validatedInput = createCaseSchema.parse(input);

    // RLS: Ensure user's client matches the case client
    if (validatedInput.client_id !== user.clientId) {
      return { error: 'Unauthorized' };
    }

    const supabase = await createClient();

    // Create candidate
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidates')
      .insert({
        organisation_id: user.organisationId,
        first_name: validatedInput.candidate_first_name,
        last_name: validatedInput.candidate_last_name,
        email: validatedInput.candidate_email,
        phone: validatedInput.candidate_phone || null,
      })
      .select('id')
      .single();

    if (candidateError) {
      console.error('Candidate creation error:', candidateError);
      return { error: 'Failed to create candidate' };
    }

    const candidateId = (candidateData as { id: string }).id;

    // Create case via RPC
    const caseId = await createCase({
      clientId: validatedInput.client_id,
      candidateId,
      packageId: validatedInput.package_id,
      notes: validatedInput.notes,
    });

    redirect(`/client/cases/${caseId}`);
  } catch (err) {
    console.error('createCaseAction error:', err);
    if (err instanceof z.ZodError) {
      return { error: 'Invalid input' };
    }
    if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) {
      throw err; // Re-throw redirect errors
    }
    return { error: 'An error occurred while creating the case' };
  }
}
