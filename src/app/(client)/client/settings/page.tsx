import { requireClientUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'Settings — Instant Check Client Portal',
};

export default async function SettingsPage() {
  const user = await requireClientUser();
  const supabase = await createClient();

  // Fetch client details
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', user.clientId)
    .single();

  // Fetch client users
  const { data: clientUsers, error: usersError } = await supabase
    .from('client_users')
    .select('*')
    .eq('client_id', user.clientId!)
    .order('created_at');

  if (clientError) {
    console.error('Error fetching client:', clientError);
  }

  if (usersError) {
    console.error('Error fetching users:', usersError);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your company details and team members"
      />

      {/* Company Details */}
      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-600">Company Name</p>
              <p className="mt-1 text-gray-900">
                {clientData?.company_name || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Contact Name</p>
              <p className="mt-1 text-gray-900">
                {clientData?.contact_name || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Contact Email</p>
              <p className="mt-1 text-gray-900">
                {clientData?.contact_email || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Contact Phone</p>
              <p className="mt-1 text-gray-900">
                {clientData?.contact_phone || '—'}
              </p>
            </div>
          </div>
          {clientData?.address && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-600">Address</p>
              <p className="mt-1 text-gray-900 whitespace-pre-line">
                {clientData.address}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Users */}
      <Card>
        <CardHeader>
          <CardTitle>Team Users</CardTitle>
        </CardHeader>
        <CardContent>
          {!clientUsers || clientUsers.length === 0 ? (
            <p className="text-gray-500">No team members yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(clientUsers as any[]).map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {user.full_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{user.email}</td>
                      <td className="px-4 py-3">
                        {user.is_active ? (
                          <Badge className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">
                            Inactive
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
