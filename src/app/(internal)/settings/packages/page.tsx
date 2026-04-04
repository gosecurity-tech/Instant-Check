import { requireInternalUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

export const metadata = { title: 'Screening Packages — Instant Check' };

interface PackageCheck {
  id: string;
  package_id: string;
  check_type: string;
  is_mandatory: boolean;
  sort_order: number;
}

interface ScreeningPackage {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  package_checks: PackageCheck[];
}

function formatCheckType(checkType: string): string {
  return checkType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default async function PackagesSettingsPage() {
  // Require internal user authentication
  await requireInternalUser();

  // Fetch screening packages with their checks
  const supabase = await createClient();

  const { data: packages, error } = await supabase
    .from('screening_packages')
    .select(
      `
      id,
      name,
      description,
      is_active,
      created_at,
      package_checks (
        id,
        package_id,
        check_type,
        is_mandatory,
        sort_order
      )
    `
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching packages:', error);
  }

  const screeningPackages: ScreeningPackage[] = (packages ?? []).map(
    (pkg: any) => ({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      is_active: pkg.is_active,
      created_at: pkg.created_at,
      package_checks: (pkg.package_checks ?? []).sort(
        (a: PackageCheck, b: PackageCheck) => a.sort_order - b.sort_order
      ),
    })
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Screening Packages"
        description="Manage check packages for vetting"
      />

      {screeningPackages.length === 0 ? (
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title="No screening packages"
          description="Start by creating your first screening package"
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {screeningPackages.map((pkg) => (
            <Card key={pkg.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{pkg.name}</CardTitle>
                    {pkg.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {pkg.description}
                      </p>
                    )}
                  </div>
                  <StatusBadge
                    status={pkg.is_active ? 'active' : 'inactive'}
                    className="whitespace-nowrap"
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Check Types
                    </p>
                    {pkg.package_checks.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {pkg.package_checks.map((check) => (
                          <Badge
                            key={check.id}
                            variant="secondary"
                            className="text-xs"
                          >
                            {formatCheckType(check.check_type)}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No checks assigned
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
