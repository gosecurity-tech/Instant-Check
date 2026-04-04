'use server';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Mail, Phone, User } from 'lucide-react';
import { requireInternalUser } from '@/lib/auth/server';
import { getCaseById } from '@/lib/services/cases';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { PageHeader } from '@/components/shared/PageHeader';
import type {
  CaseDetail,
  CaseCheckDetail,
  StatusHistoryEntry,
} from '@/types/domain';

interface CaseDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Format date to UK format: "4 Apr 2026"
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format check type: "identity_verification" -> "Identity Verification"
 */
function formatCheckType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: CaseDetailPageProps) {
  const { id } = await params;
  return {
    title: `Case ${id} — Instant Check`,
  };
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  // Ensure user is authenticated as internal
  await requireInternalUser();

  // Get the case ID from params
  const { id } = await params;

  // Fetch case data
  const caseData = await getCaseById(id);
  if (!caseData) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={caseData.case_reference}
        backHref="/cases"
      />

      {/* Main 3-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column (col-span-2) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card 1: Case Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Case Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Case Reference */}
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase">
                    Case Reference
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {caseData.case_reference}
                  </p>
                </div>

                {/* Status */}
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase">
                    Status
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={caseData.status} />
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase">
                    Priority
                  </p>
                  <div className="mt-1">
                    <PriorityBadge priority={caseData.priority} />
                  </div>
                </div>

                {/* Outcome (if present) */}
                {caseData.outcome && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase">
                      Outcome
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={caseData.outcome} />
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <hr className="border-gray-200" />

              {/* Client and Package */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase">
                    Client
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {caseData.client_name || 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase">
                    Package
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {caseData.package_name || 'N/A'}
                  </p>
                </div>
              </div>

              {/* SLA Deadline */}
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase">
                  SLA Deadline
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {caseData.sla_deadline
                    ? formatDate(caseData.sla_deadline)
                    : 'No deadline'}
                </p>
              </div>

              {/* Assigned To */}
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase">
                  Assigned To
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {caseData.assigned_to_name || 'Unassigned'}
                </p>
              </div>

              {/* Notes (if present) */}
              {caseData.notes && (
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase">
                    Notes
                  </p>
                  <p className="mt-1 text-sm text-gray-700">{caseData.notes}</p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                <p>Created: {formatDate(caseData.created_at)}</p>
                <p>Updated: {formatDate(caseData.updated_at)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Candidate Information */}
          <Card>
            <CardHeader>
              <CardTitle>Candidate Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-600 uppercase">
                    Name
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                    {caseData.candidate.first_name}{' '}
                    {caseData.candidate.last_name}
                  </p>
                </div>
                <Link
                  href={`/candidates/${caseData.candidate.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  View Profile
                </Link>
              </div>

              {/* Email */}
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase">
                    Email
                  </p>
                  <a
                    href={`mailto:${caseData.candidate.email}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {caseData.candidate.email}
                  </a>
                </div>
              </div>

              {/* Phone (if present) */}
              {caseData.candidate.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase">
                      Phone
                    </p>
                    <a
                      href={`tel:${caseData.candidate.phone}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {caseData.candidate.phone}
                    </a>
                  </div>
                </div>
              )}

              {/* Date of Birth (if present) */}
              {caseData.candidate.date_of_birth && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs font-medium text-gray-600 uppercase">
                      Date of Birth
                    </p>
                    <p className="text-sm text-gray-900">
                      {formatDate(caseData.candidate.date_of_birth)}
                    </p>
                  </div>
                </div>
              )}

              {/* Submission Status */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs font-medium text-gray-600 uppercase">
                  Submission Status
                </p>
                <div className="mt-2 flex items-center space-x-2">
                  {caseData.candidate.has_submitted ? (
                    <>
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-sm text-green-700">Submitted</span>
                      {caseData.candidate.submitted_at && (
                        <span className="text-xs text-gray-500">
                          on {formatDate(caseData.candidate.submitted_at)}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-sm text-amber-700">Pending</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Checks Grid */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Checks</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {caseData.checks.map((check: CaseCheckDetail) => (
                <Card key={check.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">
                        {formatCheckType(check.check_type)}
                      </CardTitle>
                      <StatusBadge
                        status={check.status}
                        className="ml-2"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Check Status and Outcome */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600 uppercase">
                        Status
                      </span>
                      {check.outcome && (
                        <StatusBadge status={check.outcome} />
                      )}
                    </div>

                    {/* Required / Optional */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600 uppercase">
                        Type
                      </span>
                      <Badge
                        variant={
                          check.is_required ? 'default' : 'outline'
                        }
                      >
                        {check.is_required ? 'Required' : 'Optional'}
                      </Badge>
                    </div>

                    {/* Assigned To */}
                    <div>
                      <p className="text-xs font-medium text-gray-600 uppercase">
                        Assigned To
                      </p>
                      <p className="mt-1 text-sm text-gray-900">
                        {check.assigned_to_name || 'Unassigned'}
                      </p>
                    </div>

                    {/* Notes (if present) */}
                    {check.notes && (
                      <div className="border-t border-gray-200 pt-2">
                        <p className="text-xs font-medium text-gray-600 uppercase">
                          Notes
                        </p>
                        <p className="mt-1 text-xs text-gray-700">
                          {check.notes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right column (col-span-1) */}
        <div className="space-y-6">
          {/* Card: Case Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {caseData.status_history.length > 0 ? (
                  caseData.status_history.map(
                    (entry: StatusHistoryEntry, index: number) => (
                      <div key={entry.id} className="relative">
                        {/* Vertical line connector */}
                        {index < caseData.status_history.length - 1 && (
                          <div className="absolute left-2 top-6 h-6 w-0.5 bg-gray-200" />
                        )}

                        {/* Timeline dot */}
                        <div className="relative flex items-start space-x-3">
                          <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-600">
                              {formatDate(entry.created_at)}
                            </p>
                            <p className="mt-1 text-sm font-medium text-gray-900">
                              {entry.old_status ? (
                                <>
                                  <StatusBadge status={entry.old_status} /> →{' '}
                                  <StatusBadge status={entry.new_status} />
                                </>
                              ) : (
                                <>Created as {entry.new_status}</>
                              )}
                            </p>
                            {entry.changed_by_name && (
                              <p className="mt-1 text-xs text-gray-500">
                                by {entry.changed_by_name}
                              </p>
                            )}
                            {entry.notes && (
                              <p className="mt-1 text-xs text-gray-700 italic">
                                "{entry.notes}"
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ),
                  )
                ) : (
                  <p className="text-sm text-gray-500">No status history yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
