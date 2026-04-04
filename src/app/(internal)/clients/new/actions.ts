'use server';

import { redirect } from 'next/navigation';
import { requireInternalUser } from '@/lib/auth/server';
import { createClientOrg } from '@/lib/services/clients';
import { createClientSchema } from '@/lib/validators/domain';

export async function createClientAction(formData: unknown) {
  const user = await requireInternalUser();

  // Validate input
  const validationResult = createClientSchema.safeParse(formData);
  if (!validationResult.success) {
    const errorMessage = validationResult.error.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new Error(`Validation failed: ${errorMessage}`);
  }

  const data = validationResult.data;

  try {
    const clientId = await createClientOrg({
      organisationId: user.organisationId,
      companyName: data.companyName,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      address: data.address,
      notes: data.notes,
    });

    redirect(`/clients/${clientId}`);
  } catch (error) {
    throw new Error(
      `Failed to create client: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
