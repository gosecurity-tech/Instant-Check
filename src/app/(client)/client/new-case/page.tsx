import { requireClientUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/PageHeader';
import { ClientNewCaseForm } from './ClientNewCaseForm';

export const metadata = {
  title: 'Request New Case — Instant Check Client Portal',
};

export default async function NewCasePage() {
  const user = await requireClientUser();
  const supabase = await createClient();

  const { data: packages, error } = await supabase
    .from('screening_packages')
    .select('id, name, package_checks(check_type)')
    .eq('is_active', true)
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch packages: ${error.message}`);
  }

  const formattedPackages = (packages ?? []).map((pkg: any) => ({
    id: pkg.id,
    name: pkg.name,
    check_types: (pkg.package_checks ?? []).map((pc: any) => pc.check_type),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Request New Case"
        description="Create a new screening case for a candidate"
        backHref="/client/cases"
      />

      <ClientNewCaseForm packages={formattedPackages} clientId={user.clientId!} />
    </div>
  );
}
