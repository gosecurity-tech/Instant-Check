import { cn } from '@/lib/utils';
import {
  BallerineVerificationStatus,
  mapBallerineStatusToCheckStatus,
} from '@/lib/ballerine';
import { StatusBadge } from './StatusBadge';

interface VerificationData {
  flowRunId: string;
  status: BallerineVerificationStatus;
  documentType?: string;
  documentNumber?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  nationality?: string;
  expiryDate?: string;
  livenessScore?: number;
  ocrConfidence?: number;
  riskSignals?: string[];
  completedAt?: string;
}

interface IdentityVerificationStatusProps {
  verification: VerificationData | null;
  className?: string;
}

/**
 * Internal back-office component for reviewing Ballerine identity
 * verification results on a case. Shows document details, OCR output,
 * liveness score, and risk signals.
 *
 * Used on the case detail page by case handlers and QA reviewers.
 */
export function IdentityVerificationStatus({
  verification,
  className,
}: IdentityVerificationStatusProps) {
  if (!verification) {
    return (
      <div className={cn('rounded-xl border border-gray-200 bg-white p-6', className)}>
        <h3 className="font-semibold text-gray-900">Identity Verification</h3>
        <p className="mt-2 text-sm text-gray-500">
          No identity verification has been initiated for this candidate.
        </p>
      </div>
    );
  }

  const checkStatus = mapBallerineStatusToCheckStatus(verification.status);
  const isPending =
    verification.status === BallerineVerificationStatus.Pending ||
    verification.status === BallerineVerificationStatus.Processing;

  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-6', className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Identity Verification</h3>
        <StatusBadge status={checkStatus} />
      </div>

      <p className="mt-1 text-xs text-gray-400">
        Ballerine Flow: {verification.flowRunId}
      </p>

      {isPending && (
        <div className="mt-4 flex items-center gap-2 text-sm text-amber-700">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
          Verification in progress…
        </div>
      )}

      {!isPending && (
        <div className="mt-4 space-y-4">
          {/* Document details */}
          {verification.documentType && (
            <div>
              <h4 className="text-sm font-medium text-gray-700">
                Document Details
              </h4>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-gray-500">Type</dt>
                  <dd className="font-medium text-gray-900">
                    {verification.documentType}
                  </dd>
                </div>
                {verification.documentNumber && (
                  <div>
                    <dt className="text-gray-500">Number</dt>
                    <dd className="font-medium text-gray-900">
                      {verification.documentNumber}
                    </dd>
                  </div>
                )}
                {verification.firstName && (
                  <div>
                    <dt className="text-gray-500">Name (OCR)</dt>
                    <dd className="font-medium text-gray-900">
                      {verification.firstName} {verification.lastName}
                    </dd>
                  </div>
                )}
                {verification.dateOfBirth && (
                  <div>
                    <dt className="text-gray-500">Date of Birth</dt>
                    <dd className="font-medium text-gray-900">
                      {verification.dateOfBirth}
                    </dd>
                  </div>
                )}
                {verification.nationality && (
                  <div>
                    <dt className="text-gray-500">Nationality</dt>
                    <dd className="font-medium text-gray-900">
                      {verification.nationality}
                    </dd>
                  </div>
                )}
                {verification.expiryDate && (
                  <div>
                    <dt className="text-gray-500">Expiry</dt>
                    <dd className="font-medium text-gray-900">
                      {verification.expiryDate}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Confidence scores */}
          <div>
            <h4 className="text-sm font-medium text-gray-700">
              Verification Scores
            </h4>
            <div className="mt-2 flex gap-6">
              {verification.livenessScore != null && (
                <div className="text-sm">
                  <span className="text-gray-500">Liveness: </span>
                  <span
                    className={cn(
                      'font-semibold',
                      verification.livenessScore >= 0.8
                        ? 'text-green-600'
                        : verification.livenessScore >= 0.5
                          ? 'text-amber-600'
                          : 'text-red-600',
                    )}
                  >
                    {Math.round(verification.livenessScore * 100)}%
                  </span>
                </div>
              )}
              {verification.ocrConfidence != null && (
                <div className="text-sm">
                  <span className="text-gray-500">OCR Confidence: </span>
                  <span
                    className={cn(
                      'font-semibold',
                      verification.ocrConfidence >= 0.9
                        ? 'text-green-600'
                        : verification.ocrConfidence >= 0.7
                          ? 'text-amber-600'
                          : 'text-red-600',
                    )}
                  >
                    {Math.round(verification.ocrConfidence * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Risk signals */}
          {verification.riskSignals && verification.riskSignals.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-700">
                Risk Signals
              </h4>
              <ul className="mt-1 space-y-1">
                {verification.riskSignals.map((signal, i) => (
                  <li
                    key={i}
                    className="text-sm text-red-600 before:mr-2 before:content-['⚠']"
                  >
                    {signal}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {verification.completedAt && (
            <p className="text-xs text-gray-400">
              Completed: {new Date(verification.completedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
