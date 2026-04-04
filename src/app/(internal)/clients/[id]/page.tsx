import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireInternalUser } from '@/lib/auth/server';
import { getClientById } from '@/lib/services/clients';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ClientDetailPageProps) {
  const { id } = await params;
  const client = await getClientById(id);

  if (!client) {
    return { title: 'Client Not Found — Instant Check' };
  }

  return {
    title: `${client.company_name} — Instant Check`,
  };
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  await requireInternalUser();

  const { id } = await params;
  const client = await getClientById(id);

  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.company_name}
        backHref="/clients"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Company Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Company Name</label>
                  <p className="mt-1 text-sm text-gray-900">{client.company_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">
                    <Badge variant={client.is_active ? 'default' : 'destructive'}>
                      {client.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Primary Contact</label>
                  <p className="mt-1 text-sm text-gray-900">{client.contact_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Contact Email</label>
                  <p className="mt-1 text-sm text-gray-900">{client.contact_email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Contact Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{client.contact_phone || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Address</label>
                  <p className="mt-1 text-sm text-gray-900">{client.address || '—'}</p>
                </div>
              </div>
              {client.notes && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <p className="mt-1 text-sm text-gray-900">{client.notes}</p>
                </div>
              )}
              <div className="border-t pt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Created</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(client.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Updated</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(client.updated_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cases Card */}
          <Card>
            <CardHeader>
              <CardTitle>Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-sm font-medium text-gray-700">Total Cases</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{client.total_cases}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-sm font-medium text-gray-700">Active Cases</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{client.active_cases}</p>
                </div>
              </div>
              <div className="mt-4">
                <Link href={`/cases?clientId=${id}`}>
                  <Button variant="outline" className="w-full">
                    View Cases
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Users Card */}
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              {client.users.length === 0 ? (
                <p className="text-sm text-gray-500">No users assigned.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-2 px-0 text-left font-medium text-gray-700">Name</th>
                        <th className="py-2 px-2 text-left font-medium text-gray-700">Email</th>
                        <th className="py-2 px-2 text-left font-medium text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {client.users.map((user) => (
                        <tr key={user.id}>
                          <td className="py-2 px-0 text-gray-900">{user.full_name}</td>
                          <td className="py-2 px-2 text-gray-900 text-xs">{user.email}</td>
                          <td className="py-2 px-2">
                            <Badge variant={user.is_active ? 'default' : 'destructive'}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Screening Packages Card */}
          <Card>
            <CardHeader>
              <CardTitle>Screening Packages</CardTitle>
            </CardHeader>
            <CardContent>
              {client.packages.length === 0 ? (
                <p className="text-sm text-gray-500">No packages assigned.</p>
              ) : (
                <div className="space-y-3">
                  {client.packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="rounded-lg border border-gray-200 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{pkg.name}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {pkg.check_count} check{pkg.check_count !== 1 ? 's' : ''}
                          </p>
                          {pkg.description && (
                            <p className="text-xs text-gray-500 mt-1">{pkg.description}</p>
                          )}
                        </div>
                        <div className="shrink-0">
                          <Badge variant={pkg.is_active ? 'default' : 'destructive'}>
                            {pkg.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
