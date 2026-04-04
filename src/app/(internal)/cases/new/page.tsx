import { requireInternalUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/PageHeader';
import { NewCaseForm } from './NewCaseForm';

export const metadata = { title: 'New Case — Instant Check' };

export default async function NewCasePage() {
  await requireInternalUser();

  const supabase = await createClient();

  // Query active clients
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, company_name')
    .eq('is_active', true)
    .order('company_name');

  if (clientsError) {
    throw new Error(`Failed to fetch clients: ${clientsError.message}`);
  }

  // Query active screening packages
  const { data: packages, error: packagesError } = await supabase
    .from('screening_packages')
    .select('id, name, check_types')
    .eq('is_active', true)
    .order('name');

  if (packagesError) {
    throw new Error(`Failed to fetch packages: ${packagesError.message}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Create New Case" backHref="/cases" />

      <NewCaseForm
        clients={clients || []}
        packages={packages || []}
      />
    </div>
  );
}
