'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { ReferenceStatus } from '@/types/enums';
import {
  resendReferenceReminder,
  markReferenceUnresponsive,
  markReferenceDeclined,
  flagReferenceDiscrepancy,
  verifyReferenceRequest,
} from './actions';

// For draft references, we use sendReferenceRequest from the service
// which is called via the createAndSendReference server action.
// However, once a request exists (has an ID), we use the status-specific actions.

interface ReferenceActionsProps {
  requestId: string;
  status: ReferenceStatus;
  organisationId: string;
  caseId: string;
}

export function ReferenceActions({
  requestId,
  status,
  organisationId,
}: ReferenceActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagNotes, setFlagNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAction = (action: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const errorBanner = error ? (
    <p className="text-sm text-red-600 mt-2">{error}</p>
  ) : null;

  // Sent or reminder_sent: show Send Reminder, Mark Unresponsive, Mark Declined
  if (status === 'sent' || status === 'reminder_sent') {
    return (
      <div className="space-y-2">
        <Button
          onClick={() => handleAction(() => resendReferenceReminder(requestId, organisationId))}
          disabled={isPending}
          variant="outline"
          className="w-full"
          size="sm"
        >
          {isPending ? 'Sending...' : 'Send Reminder'}
        </Button>
        <Button
          onClick={() => handleAction(() => markReferenceUnresponsive(requestId, organisationId))}
          disabled={isPending}
          variant="outline"
          className="w-full"
          size="sm"
        >
          Mark Unresponsive
        </Button>
        <Button
          onClick={() => handleAction(() => markReferenceDeclined(requestId, organisationId))}
          disabled={isPending}
          variant="outline"
          className="w-full"
          size="sm"
        >
          Mark Declined
        </Button>
        {errorBanner}
      </div>
    );
  }

  // Received: show Verify and Flag Discrepancy
  if (status === 'received') {
    return (
      <>
        <div className="space-y-2">
          <Button
            onClick={() => handleAction(() => verifyReferenceRequest(requestId, organisationId))}
            disabled={isPending}
            className="w-full"
            size="sm"
          >
            {isPending ? 'Verifying...' : 'Verify Reference'}
          </Button>
          <Button
            onClick={() => setShowFlagDialog(true)}
            disabled={isPending}
            variant="outline"
            className="w-full text-amber-700 border-amber-300 hover:bg-amber-50"
            size="sm"
          >
            Flag Discrepancy
          </Button>
          {errorBanner}
        </div>

        {showFlagDialog && (
          <div className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-800">
              Describe the discrepancy found in this reference:
            </p>
            <Textarea
              placeholder="Enter details about the discrepancy..."
              value={flagNotes}
              onChange={(e) => setFlagNotes(e.target.value)}
              className="min-h-24"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowFlagDialog(false);
                  setFlagNotes('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending || !flagNotes.trim()}
                onClick={() => {
                  handleAction(() =>
                    flagReferenceDiscrepancy({
                      requestId,
                      notes: flagNotes,
                      organisationId,
                    }),
                  );
                  setShowFlagDialog(false);
                  setFlagNotes('');
                }}
              >
                {isPending ? 'Flagging...' : 'Flag Discrepancy'}
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Discrepancy flagged: show Verify button only
  if (status === 'discrepancy_flagged') {
    return (
      <div className="space-y-2">
        <Button
          onClick={() => handleAction(() => verifyReferenceRequest(requestId, organisationId))}
          disabled={isPending}
          className="w-full"
          size="sm"
        >
          {isPending ? 'Verifying...' : 'Verify Reference'}
        </Button>
        {errorBanner}
      </div>
    );
  }

  // Draft: no inline actions (send happens from the references list or detail page)
  if (status === 'draft') {
    return (
      <p className="text-xs text-gray-500 text-center py-2">
        Draft — send from references list
      </p>
    );
  }

  // Verified, unresponsive, declined: no actions
  return (
    <div className="text-center py-2">
      <p className="text-xs text-gray-500">No actions available</p>
    </div>
  );
}
