import { notFound } from 'next/navigation';
import { requireInternalUser } from '@/lib/auth/server';
import { getCaseById } from '@/lib/services/cases';
import {
  getCaseReadinessForReview,
  getCaseNotes,
  getAdjudicationHistory,
} from '@/lib/services/decisioning';
import { listReferencesForCase } from '@/lib/services/references';
import { getRtwCheckForCase } from '@/lib/services/rtw';
import { getDbsCheckForCase } from '@/lib/services/dbs';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { CaseStatus, ReferenceStatus } from '@/types/enums';
import { AdjudicationForm } from './AdjudicationForm';
import { CaseNotesPanel } from './CaseNotesPanel';
import { moveCaseToReviewAction } from './actions';

export const metadata = { title: 'Case Review' };

interface CaseReviewPageProps {
  params: Promise<{ id: string }>;
}

function formatCheckType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default async function CaseReviewPage({
  params,
}: CaseReviewPageProps) {
  await requireInternalUser();
  const { id: caseId } = await params;

  const [
    caseDetail,
    readiness,
    references,
    rtwCheck,
    dbsCheck,
    notes,
    history,
  ] = await Promise.all([
    getCaseById(caseId),
    getCaseReadinessForReview(caseId),
    listReferencesForCase(caseId),
    getRtwCheckForCase(caseId),
    getDbsCheckForCase(caseId),
    getCaseNotes(caseId),
    getAdjudicationHistory(caseId),
  ]);

  if (!caseDetail) {
    notFound();
  }

  const referenceStats = {
    total: references.length,
    sent: references.filter((r) => r.status === ReferenceStatus.Sent).length,
    received: references.filter((r) => r.status === ReferenceStatus.Received).length,
    verified: references.filter((r) => r.status === ReferenceStatus.Verified).length,
    flagged: references.filter((r) => r.status === ReferenceStatus.DiscrepancyFlagged).length,
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const progressPercent =
    readiness.totalChecks > 0
      ? Math.round((readiness.completedChecks / readiness.totalChecks) * 100)
      : 0;

  const canShowAdjudication =
    caseDetail.status === CaseStatus.UnderReview && readiness.isReady;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`QA Review: ${caseDetail.case_reference}`}
        description={caseDetail.candidate_name}
        backHref="/cases"
      />

      {/* Readiness Assessment Card */}
      <Card>
        <CardHeader>
          <CardTitle>Readiness Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Checks Complete
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {readiness.completedChecks} / {readiness.totalChecks}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-right text-xs text-gray-500">
              {progressPercent}% complete
            </div>
          </div>

          {!readiness.isReady ? (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertDescription className="text-amber-800">
                <div className="font-medium mb-2">
                  Incomplete Checks ({readiness.incompleteChecks.length})
                </div>
                <ul className="space-y-1">
                  {readiness.incompleteChecks.map((check) => (
                    <li key={check.id} className="flex items-center gap-2 text-sm">
                      <span>{formatCheckType(check.check_type)}</span>
                      <StatusBadge status={check.status} />
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800 font-medium">
                All checks complete — ready for adjudication
              </AlertDescription>
            </Alert>
          )}

          {readiness.suggestedOutcome && (
            <div className="pt-2 border-t border-gray-200">
              <div className="text-sm text-gray-600 mb-2">Suggested Outcome:</div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {readiness.suggestedOutcome.replace(/_/g, ' ')}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checks Summary Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Checks Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {readiness.checkSummary.map((check, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-gray-200 p-3 space-y-2"
              >
                <div className="font-medium text-sm text-gray-900">
                  {formatCheckType(check.check_type)}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={check.status} />
                  {check.outcome && (
                    <Badge variant="outline" className="text-xs">
                      {check.outcome}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Supplementary Checks Section */}
      <Card>
        <CardHeader>
          <CardTitle>Supplementary Checks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* RTW Check */}
          <div className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Right to Work</div>
                <div className="text-sm text-gray-500">RTW Verification</div>
              </div>
              <div className="flex items-center gap-2">
                {rtwCheck && (
                  <>
                    <StatusBadge status={rtwCheck.status} />
                    {rtwCheck.verified && (
                      <Badge className="bg-green-100 text-green-800">
                        Verified
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* DBS Check */}
          <div className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">DBS Check</div>
                <div className="text-sm text-gray-500">Disclosure and Barring Service</div>
              </div>
              <div className="flex items-center gap-2">
                {dbsCheck && (
                  <>
                    <StatusBadge status={dbsCheck.status} />
                    {dbsCheck.status === 'clear' && (
                      <Badge className="bg-green-100 text-green-800">Clear</Badge>
                    )}
                    {dbsCheck.status === 'adverse' && (
                      <Badge className="bg-red-100 text-red-800">Adverse</Badge>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* References */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">References</div>
                <div className="text-sm text-gray-500">
                  {referenceStats.total} total reference(s)
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">
                  {referenceStats.received} received
                </span>
                {referenceStats.flagged > 0 && (
                  <Badge className="bg-red-100 text-red-800">
                    {referenceStats.flagged} flagged
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Case Timeline/History Card */}
      <Card>
        <CardHeader>
          <CardTitle>Adjudication History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-sm text-gray-500">No adjudication history</div>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="border-l-2 border-gray-200 pl-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm text-gray-900">
                      {entry.action.replace(/\./g, ' ').replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(entry.created_at)}
                    </div>
                  </div>
                  {entry.actor_email && (
                    <div className="text-xs text-gray-600 mt-1">
                      by {entry.actor_email}
                    </div>
                  )}
                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {JSON.stringify(entry.metadata)
                        .replace(/[{}\"]/g, '')
                        .replace(/,/g, ', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Move to Review Button (if not already under review) */}
      {caseDetail.status === CaseStatus.InProgress && (
        <Card>
          <CardContent className="pt-6">
            <form action={moveCaseToReviewAction}>
              <input type="hidden" name="caseId" value={caseId} />
              <Button
                type="submit"
                variant="outline"
                className="w-full"
              >
                Move to Review
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Adjudication Form (only if ready and under review) */}
      {canShowAdjudication && (
        <AdjudicationForm
          caseId={caseId}
          suggestedOutcome={readiness.suggestedOutcome || null}
        />
      )}

      {/* Case Notes Panel */}
      <CaseNotesPanel caseId={caseId} initialNotes={notes} />
    </div>
  );
}
