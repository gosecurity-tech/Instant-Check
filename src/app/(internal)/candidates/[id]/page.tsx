import { notFound } from 'next/navigation';
import { requireInternalUser } from '@/lib/auth/server';
import { getCandidateById } from '@/lib/services/candidates';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';

interface CandidateDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CandidateDetailPageProps) {
  const { id } = await params;
  const candidate = await getCandidateById(id);

  if (!candidate) {
    return { title: 'Candidate Not Found — Instant Check' };
  }

  return {
    title: `${candidate.first_name} ${candidate.last_name} — Instant Check`,
  };
}

/**
 * Format a date in en-GB locale
 */
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

/**
 * Format enum values: replace underscore with space and title case
 */
function formatEnumValue(value: string): string {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Mask national insurance number, showing only last 4 characters
 */
function maskNIN(nin: string | null | undefined): string {
  if (!nin) return '—';
  if (nin.length <= 4) return '****';
  return '*'.repeat(nin.length - 4) + nin.slice(-4);
}

export default async function CandidateDetailPage({ params }: CandidateDetailPageProps) {
  await requireInternalUser();

  const { id } = await params;
  const candidate = await getCandidateById(id);

  if (!candidate) {
    notFound();
  }

  const fullName = `${candidate.first_name} ${candidate.last_name}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={fullName}
        backHref="/candidates"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Personal Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <p className="mt-1 text-sm text-gray-900">{fullName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{candidate.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{candidate.phone || '—'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDate(candidate.date_of_birth)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">NI Number</label>
                  <p className="mt-1 text-sm text-gray-900">{maskNIN(candidate.national_insurance_number)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Current Address</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {candidate.current_address || '—'}
                  </p>
                </div>
              </div>
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-gray-700">Submission Status</label>
                <div className="mt-2">
                  {candidate.has_submitted ? (
                    <div className="space-y-1">
                      <StatusBadge status="complete" />
                      <p className="text-xs text-gray-600">
                        Submitted {formatDate(candidate.submitted_at)}
                      </p>
                    </div>
                  ) : (
                    <StatusBadge status="awaiting_candidate" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address History Card */}
          <Card>
            <CardHeader>
              <CardTitle>Address History</CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.addresses.length === 0 ? (
                <p className="text-sm text-gray-500">No address history recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-2 px-0 text-left font-medium text-gray-700">
                          Address
                        </th>
                        <th className="py-2 px-4 text-left font-medium text-gray-700">
                          From
                        </th>
                        <th className="py-2 px-4 text-left font-medium text-gray-700">
                          To
                        </th>
                        <th className="py-2 px-4 text-left font-medium text-gray-700">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {candidate.addresses
                        .sort(
                          (a, b) =>
                            new Date(b.date_from).getTime() - new Date(a.date_from).getTime()
                        )
                        .map((address) => (
                          <tr key={address.id}>
                            <td className="py-3 px-0 text-gray-900">
                              <div>
                                <p>{address.address_line_1}</p>
                                {address.address_line_2 && (
                                  <p className="text-gray-600">{address.address_line_2}</p>
                                )}
                                <p className="text-gray-600">
                                  {address.city}
                                  {address.county && `, ${address.county}`}
                                  <br />
                                  {address.postcode} {address.country}
                                </p>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-900 whitespace-nowrap">
                              {formatDate(address.date_from)}
                            </td>
                            <td className="py-3 px-4 text-gray-900 whitespace-nowrap">
                              {formatDate(address.date_to)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {address.is_current && (
                                <Badge variant="default">Current</Badge>
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

          {/* Activity History Card */}
          <Card>
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.activities.length === 0 ? (
                <p className="text-sm text-gray-500">No activity history recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-2 px-0 text-left font-medium text-gray-700">
                          Activity Type
                        </th>
                        <th className="py-2 px-4 text-left font-medium text-gray-700">
                          Organisation
                        </th>
                        <th className="py-2 px-4 text-left font-medium text-gray-700">
                          Job Title
                        </th>
                        <th className="py-2 px-4 text-left font-medium text-gray-700">
                          From
                        </th>
                        <th className="py-2 px-4 text-left font-medium text-gray-700">
                          To
                        </th>
                        <th className="py-2 px-4 text-left font-medium text-gray-700">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {candidate.activities
                        .sort(
                          (a, b) =>
                            new Date(b.date_from).getTime() - new Date(a.date_from).getTime()
                        )
                        .map((activity) => (
                          <tr key={activity.id}>
                            <td className="py-3 px-0 text-gray-900 whitespace-nowrap">
                              {formatEnumValue(activity.activity_type)}
                            </td>
                            <td className="py-3 px-4 text-gray-900">
                              {activity.organisation_name || '—'}
                            </td>
                            <td className="py-3 px-4 text-gray-900">
                              {activity.job_title || '—'}
                            </td>
                            <td className="py-3 px-4 text-gray-900 whitespace-nowrap">
                              {formatDate(activity.date_from)}
                            </td>
                            <td className="py-3 px-4 text-gray-900 whitespace-nowrap">
                              {formatDate(activity.date_to)}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {activity.is_current && (
                                <Badge variant="default">Current</Badge>
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

        {/* Right Column */}
        <div className="space-y-6">
          {/* Declarations Card */}
          <Card>
            <CardHeader>
              <CardTitle>Declarations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {candidate.declarations === null ? (
                <p className="text-sm text-gray-500">Not yet submitted</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Criminal Record
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {candidate.declarations.has_criminal_record ? 'Yes' : 'No'}
                    </p>
                    {candidate.declarations.has_criminal_record &&
                      candidate.declarations.criminal_details && (
                        <p className="mt-1 text-xs text-gray-600">
                          {candidate.declarations.criminal_details}
                        </p>
                      )}
                  </div>
                  <div className="border-t pt-4">
                    <label className="text-sm font-medium text-gray-700">
                      CCJs or Bankruptcy
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {candidate.declarations.has_ccjs_or_bankruptcy ? 'Yes' : 'No'}
                    </p>
                    {candidate.declarations.has_ccjs_or_bankruptcy &&
                      candidate.declarations.financial_details && (
                        <p className="mt-1 text-xs text-gray-600">
                          {candidate.declarations.financial_details}
                        </p>
                      )}
                  </div>
                  <div className="border-t pt-4">
                    <label className="text-sm font-medium text-gray-700">
                      Health Conditions
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {candidate.declarations.has_health_conditions ? 'Yes' : 'No'}
                    </p>
                    {candidate.declarations.has_health_conditions &&
                      candidate.declarations.health_details && (
                        <p className="mt-1 text-xs text-gray-600">
                          {candidate.declarations.health_details}
                        </p>
                      )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referees Card */}
          <Card>
            <CardHeader>
              <CardTitle>Referees</CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.referees.length === 0 ? (
                <p className="text-sm text-gray-500">No referees recorded.</p>
              ) : (
                <div className="space-y-4">
                  {candidate.referees.map((referee) => (
                    <div
                      key={referee.id}
                      className="border-b pb-4 last:border-b-0 last:pb-0"
                    >
                      <p className="text-sm font-medium text-gray-900">{referee.referee_name}</p>
                      <p className="text-xs text-gray-600">{formatEnumValue(referee.reference_type)}</p>
                      {referee.organisation_name && (
                        <p className="text-xs text-gray-600">{referee.organisation_name}</p>
                      )}
                      {referee.job_title && (
                        <p className="text-xs text-gray-600">{referee.job_title}</p>
                      )}
                      {referee.referee_email && (
                        <p className="text-xs text-blue-600 hover:underline">
                          {referee.referee_email}
                        </p>
                      )}
                      {referee.referee_phone && (
                        <p className="text-xs text-gray-600">{referee.referee_phone}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(referee.date_from)} – {formatDate(referee.date_to)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents Card */}
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.documents.length === 0 ? (
                <p className="text-sm text-gray-500">No documents uploaded.</p>
              ) : (
                <div className="space-y-3">
                  {candidate.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="border border-gray-200 rounded p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {doc.file_name}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {formatEnumValue(doc.document_type)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(doc.created_at)}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <StatusBadge status={doc.status} />
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
