'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { declarationsSchema } from '@/lib/validators/domain';
import type { z } from 'zod';

type DeclarationsFormData = z.input<typeof declarationsSchema>;
import {
  getMyDeclarations,
  saveDeclarations,
  getSubmissionStatus,
} from '../actions';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  FormField,
  FormSection,
  FormActions,
  FormError,
  FormSuccess,
} from '@/components/forms/FormField';

interface DeclarationData {
  id?: string;
  candidate_id?: string;
  has_criminal_record?: boolean;
  criminal_details?: string | null;
  has_ccjs_or_bankruptcy?: boolean;
  financial_details?: string | null;
  has_health_conditions?: boolean;
  health_details?: string | null;
  declaration_confirmed?: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function CandidateDeclarationsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [existingData, setExistingData] = useState<DeclarationData | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    register,
    watch,
    setValue,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm<DeclarationsFormData>({
    resolver: zodResolver(declarationsSchema),
    defaultValues: {
      hasCriminalRecord: false,
      hasCcjsOrBankruptcy: false,
      hasHealthConditions: false,
      declarationConfirmed: false,
    },
  });

  // Load existing declarations and submission status
  useEffect(() => {
    async function loadData() {
      try {
        const [declarations, status] = await Promise.all([
          getMyDeclarations(),
          getSubmissionStatus(),
        ]);

        setHasSubmitted(status.hasSubmitted);

        if (declarations) {
          setExistingData(declarations);
          reset({
            hasCriminalRecord: declarations.has_criminal_record || false,
            criminalDetails: declarations.criminal_details || undefined,
            hasCcjsOrBankruptcy: declarations.has_ccjs_or_bankruptcy || false,
            financialDetails: declarations.financial_details || undefined,
            hasHealthConditions: declarations.has_health_conditions || false,
            healthDetails: declarations.health_details || undefined,
            declarationConfirmed: declarations.declaration_confirmed || false,
          });
        }
      } catch (err) {
        console.error('Failed to load declarations:', err);
        setSubmitError('Failed to load declarations');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [reset]);

  const onSubmit = async (data: DeclarationsFormData) => {
    setSubmitError(null);
    setSubmitSuccess(false);

    const result = await saveDeclarations(data as import('@/lib/validators/domain').DeclarationsInput);
    if (result.error) {
      setSubmitError(result.error);
    } else {
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 5000);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
      </div>
    );
  }

  const criminalRecordValue = watch('hasCriminalRecord');
  const financialValue = watch('hasCcjsOrBankruptcy');
  const healthValue = watch('hasHealthConditions');
  const confirmedValue = watch('declarationConfirmed');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Declarations</h2>
        <p className="mt-1 text-sm text-gray-500">
          Please answer the following declarations honestly. This information is
          handled in strict confidence.
        </p>
      </div>

      {hasSubmitted && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">Submitted.</span> Your declarations have been submitted and are no longer editable.
          </p>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <FormError message={submitError} />
            <FormSuccess message={submitSuccess ? 'Declarations saved successfully.' : null} />

            {/* Criminal Record Section */}
            <FormSection
              title="Criminal Record"
              description="Do you have any criminal convictions?"
            >
              <FormField
                label="Do you have any criminal convictions?"
                required
              >
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setValue('hasCriminalRecord', true);
                      setSubmitError(null);
                    }}
                    disabled={hasSubmitted}
                    className={cn(
                      'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                      criminalRecordValue === true
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300',
                      hasSubmitted && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setValue('hasCriminalRecord', false);
                      setSubmitError(null);
                    }}
                    disabled={hasSubmitted}
                    className={cn(
                      'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                      criminalRecordValue === false
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300',
                      hasSubmitted && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    No
                  </button>
                </div>
              </FormField>

              {criminalRecordValue && (
                <FormField
                  label="Please provide details"
                  error={errors.criminalDetails?.message}
                  required
                >
                  <Textarea
                    placeholder="Describe any criminal convictions, including dates and sentences..."
                    disabled={hasSubmitted}
                    {...register('criminalDetails')}
                    className="min-h-32"
                  />
                </FormField>
              )}
            </FormSection>

            {/* Financial Section */}
            <FormSection
              title="Financial History"
              description="Have you ever had County Court Judgments, Individual Voluntary Arrangements, or been declared bankrupt?"
            >
              <FormField
                label="Do you have any County Court Judgments (CCJs), Individual Voluntary Arrangements (IVAs), or have you ever been declared bankrupt?"
                required
              >
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setValue('hasCcjsOrBankruptcy', true);
                      setSubmitError(null);
                    }}
                    disabled={hasSubmitted}
                    className={cn(
                      'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                      financialValue === true
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300',
                      hasSubmitted && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setValue('hasCcjsOrBankruptcy', false);
                      setSubmitError(null);
                    }}
                    disabled={hasSubmitted}
                    className={cn(
                      'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                      financialValue === false
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300',
                      hasSubmitted && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    No
                  </button>
                </div>
              </FormField>

              {financialValue && (
                <FormField
                  label="Please provide details"
                  error={errors.financialDetails?.message}
                  required
                >
                  <Textarea
                    placeholder="Describe any CCJs, IVAs, or bankruptcy proceedings, including dates and amounts..."
                    disabled={hasSubmitted}
                    {...register('financialDetails')}
                    className="min-h-32"
                  />
                </FormField>
              )}
            </FormSection>

            {/* Health Conditions Section */}
            <FormSection
              title="Health Conditions"
              description="Do you have any health conditions that may affect your ability to perform the role?"
            >
              <FormField
                label="Do you have any health conditions that may affect your ability to perform the role?"
                required
              >
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setValue('hasHealthConditions', true);
                      setSubmitError(null);
                    }}
                    disabled={hasSubmitted}
                    className={cn(
                      'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                      healthValue === true
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300',
                      hasSubmitted && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setValue('hasHealthConditions', false);
                      setSubmitError(null);
                    }}
                    disabled={hasSubmitted}
                    className={cn(
                      'px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
                      healthValue === false
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300',
                      hasSubmitted && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    No
                  </button>
                </div>
              </FormField>

              {healthValue && (
                <FormField
                  label="Please provide details"
                  error={errors.healthDetails?.message}
                  required
                >
                  <Textarea
                    placeholder="Describe any health conditions that may be relevant to this role..."
                    disabled={hasSubmitted}
                    {...register('healthDetails')}
                    className="min-h-32"
                  />
                </FormField>
              )}
            </FormSection>

            {/* Confirmation Section */}
            <FormSection title="Confirmation">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="declaration_confirmed"
                  disabled={hasSubmitted}
                  {...register('declarationConfirmed')}
                  className={cn(
                    'mt-1 h-4 w-4 rounded border-gray-300 text-blue-600',
                    hasSubmitted && 'cursor-not-allowed opacity-50'
                  )}
                />
                <label
                  htmlFor="declaration_confirmed"
                  className={cn(
                    'text-sm font-medium text-gray-700',
                    hasSubmitted && 'opacity-50'
                  )}
                >
                  I confirm that all information provided is true and accurate to
                  the best of my knowledge.
                </label>
              </div>
              {errors.declarationConfirmed && (
                <p className="text-sm text-red-600">{errors.declarationConfirmed.message}</p>
              )}
            </FormSection>

            {/* Form Actions */}
            <FormActions>
              <a
                href="/candidate/referees"
                className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ← Referees
              </a>
              {!hasSubmitted && (
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Save Declarations
                </Button>
              )}
            </FormActions>
          </form>
        </CardContent>
      </Card>

      {/* Navigation Footer */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex justify-end">
          <a
            href="/candidate/review"
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Next: Review →
          </a>
        </div>
      </div>
    </div>
  );
}
