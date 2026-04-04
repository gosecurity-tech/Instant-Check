'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adjudicationSchema } from '@/lib/validators/domain';
import type { z } from 'zod';
import { CaseOutcome } from '@/types/enums';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FormField, FormSection } from '@/components/forms/FormField';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { adjudicateCaseAction } from './actions';

type AdjudicationFormData = z.infer<typeof adjudicationSchema>;

interface AdjudicationFormProps {
  caseId: string;
  suggestedOutcome: string | null;
}

const outcomeDescriptions: Record<string, string> = {
  clear: 'No adverse findings',
  clear_with_advisory: 'Minor issues noted',
  insufficient_evidence: 'Unable to verify',
  adverse_information: 'Significant concerns',
  failed: 'Screening failed',
};

export function AdjudicationForm({
  caseId,
  suggestedOutcome,
}: AdjudicationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingData, setPendingData] = useState<AdjudicationFormData | null>(
    null
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<AdjudicationFormData>({
    resolver: zodResolver(adjudicationSchema),
    defaultValues: {
      outcome: (suggestedOutcome as CaseOutcome) || undefined,
      notes: '',
    },
  });

  const selectedOutcome = watch('outcome');

  const onSubmit = (data: AdjudicationFormData) => {
    setPendingData(data);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (!pendingData) return;

    startTransition(async () => {
      const result = await adjudicateCaseAction({
        caseId,
        outcome: pendingData.outcome,
        notes: pendingData.notes,
      });

      if ('error' in result) {
        console.error('Adjudication failed:', result.error);
      } else {
        setConfirmOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adjudication</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="Case Outcome">
            <div className="space-y-3">
              {Object.entries(CaseOutcome).map(([key, value]) => (
                <label
                  key={value}
                  className="flex items-start space-x-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    value={value}
                    {...register('outcome')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {key
                        .replace(/([A-Z])/g, ' $1')
                        .trim()
                        .split(/\s+/)
                        .map(
                          (w) => w.charAt(0).toUpperCase() + w.slice(1)
                        )
                        .join(' ')}
                    </div>
                    <div className="text-sm text-gray-600">
                      {outcomeDescriptions[value] || value}
                    </div>
                  </div>
                  {suggestedOutcome === value && (
                    <Badge variant="secondary">Suggested</Badge>
                  )}
                </label>
              ))}
            </div>
            {errors.outcome && (
              <div className="mt-2 text-sm text-red-600">
                {errors.outcome.message}
              </div>
            )}
          </FormSection>

          <FormSection title="Notes">
            <Textarea
              placeholder="Add any notes about this adjudication..."
              {...register('notes')}
              className="min-h-24"
            />
            {errors.notes && (
              <div className="mt-2 text-sm text-red-600">
                {errors.notes.message}
              </div>
            )}
          </FormSection>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="submit"
              disabled={isPending}
              className="gap-2"
            >
              {isPending && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              Submit Adjudication
            </Button>
          </div>
        </form>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Confirm Adjudication"
          description={`You are about to adjudicate this case as ${selectedOutcome ? selectedOutcome.replace(/_/g, ' ') : 'unknown'}. This action cannot be undone.`}
          confirmLabel="Adjudicate"
          cancelLabel="Cancel"
          variant="default"
          onConfirm={handleConfirm}
          loading={isPending}
        />
      </CardContent>
    </Card>
  );
}
