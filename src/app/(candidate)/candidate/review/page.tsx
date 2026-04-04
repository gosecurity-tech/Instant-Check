'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getMyAddresses,
  getMyActivities,
  getMyDeclarations,
  getMyReferees,
  getSubmissionStatus,
  submitCandidateData,
} from '../actions';
import { validateAddressTimeline, validateActivityTimeline } from '@/lib/timeline';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Address {
  id: string;
  flat_number?: string;
  building_name?: string;
  street_number?: string;
  street_name: string;
  town_city: string;
  postcode: string;
  country: string;
  date_from: string;
  date_to?: string;
}

interface Activity {
  id: string;
  activity_type: string;
  employer_name?: string;
  job_title?: string;
  organisation_name?: string;
  start_date: string;
  end_date?: string;
}

interface Referee {
  id: string;
  name: string;
  referee_type: string;
  email: string;
}

interface Declarations {
  id: string;
  unspent_convictions: boolean;
  unspent_convictions_details?: string;
  subject_sanctions: boolean;
  subject_sanctions_details?: string;
  restraining_order: boolean;
  restraining_order_details?: string;
  subject_enquiries: boolean;
  subject_enquiries_details?: string;
  declaration_confirmed: boolean;
}

export default function CandidateReviewPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [declarations, setDeclarations] = useState<Declarations | null>(null);

  const [addressValid, setAddressValid] = useState(false);
  const [activityValid, setActivityValid] = useState(false);
  const [refereesValid, setRefereesValid] = useState(false);
  const [declarationsValid, setDeclarationsValid] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [
          addressesData,
          activitiesData,
          declarationsData,
          refereesData,
          submissionStatus,
        ] = await Promise.all([
          getMyAddresses(),
          getMyActivities(),
          getMyDeclarations(),
          getMyReferees(),
          getSubmissionStatus(),
        ]);

        if (submissionStatus.hasSubmitted) {
          router.push('/candidate/submitted');
          return;
        }

        setAddresses(addressesData);
        setActivities(activitiesData);
        setDeclarations(declarationsData);
        setReferees(refereesData);

        // Validate address timeline
        if (addressesData.length > 0) {
          const addrTimeline = validateAddressTimeline(addressesData);
          setAddressValid(addrTimeline.isValid);
        }

        // Validate activity timeline
        if (activitiesData.length > 0) {
          const actTimeline = validateActivityTimeline(activitiesData);
          setActivityValid(actTimeline.isValid);
        }

        // Validate referees
        setRefereesValid(refereesData.length >= 1);

        // Validate declarations
        setDeclarationsValid(
          declarationsData !== null && declarationsData.declaration_confirmed === true,
        );
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load review data');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [router]);

  const canSubmit =
    addressValid && activityValid && refereesValid && declarationsValid;

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    const result = await submitCandidateData();
    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Review Your Submission</h2>
          <p className="mt-2 text-sm text-gray-500">
            Loading your information...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Review Your Submission</h2>
        <p className="mt-2 text-sm text-gray-500">
          Please review all information before submitting. You will not be able to
          make changes after submission.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submission Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            {addressValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <span
              className={cn(
                'text-sm',
                addressValid ? 'text-gray-900 font-medium' : 'text-gray-600',
              )}
            >
              Address history covers 5 years
            </span>
          </div>

          <div className="flex items-center gap-3">
            {activityValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <span
              className={cn(
                'text-sm',
                activityValid ? 'text-gray-900 font-medium' : 'text-gray-600',
              )}
            >
              Activity history covers 5 years
            </span>
          </div>

          <div className="flex items-center gap-3">
            {refereesValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <span
              className={cn(
                'text-sm',
                refereesValid ? 'text-gray-900 font-medium' : 'text-gray-600',
              )}
            >
              At least 1 referee provided
            </span>
          </div>

          <div className="flex items-center gap-3">
            {declarationsValid ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <span
              className={cn(
                'text-sm',
                declarationsValid ? 'text-gray-900 font-medium' : 'text-gray-600',
              )}
            >
              Declarations completed and confirmed
            </span>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Address History</span>
            {addressValid ? (
              <Badge className="bg-green-100 text-green-800">Complete</Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800">Incomplete</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {addresses.length === 0 ? (
            <p className="text-sm text-gray-500">No addresses added</p>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div key={addr.id} className="border-l-4 border-blue-200 pl-4 py-2">
                  <p className="font-medium text-gray-900">
                    {addr.flat_number || ''}{addr.flat_number && ' '}{addr.building_name || ''}
                    {addr.building_name && ', '}
                    {addr.street_number || ''}{addr.street_number && ' '}{addr.street_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {addr.town_city}, {addr.postcode}, {addr.country}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(addr.date_from).toLocaleDateString('en-GB')} to{' '}
                    {addr.date_to
                      ? new Date(addr.date_to).toLocaleDateString('en-GB')
                      : 'Present'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Activity History</span>
            {activityValid ? (
              <Badge className="bg-green-100 text-green-800">Complete</Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800">Incomplete</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-gray-500">No activities added</p>
          ) : (
            <div className="space-y-3">
              {activities.map((act) => (
                <div key={act.id} className="border-l-4 border-blue-200 pl-4 py-2">
                  <p className="font-medium text-gray-900">
                    {act.activity_type === 'employment' && act.job_title}
                    {act.activity_type === 'self-employment' && `Self-employed - ${act.organisation_name || 'N/A'}`}
                    {act.activity_type === 'unemployment' && 'Unemployed'}
                    {act.activity_type === 'education' && 'Education'}
                    {act.activity_type === 'training' && 'Training'}
                    {act.activity_type === 'other' && act.organisation_name}
                  </p>
                  {act.activity_type === 'employment' && act.employer_name && (
                    <p className="text-sm text-gray-600">{act.employer_name}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(act.start_date).toLocaleDateString('en-GB')} to{' '}
                    {act.end_date
                      ? new Date(act.end_date).toLocaleDateString('en-GB')
                      : 'Present'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Referees</span>
            {refereesValid ? (
              <Badge className="bg-green-100 text-green-800">Complete</Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800">Incomplete</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {referees.length === 0 ? (
            <p className="text-sm text-gray-500">No referees added</p>
          ) : (
            <div className="space-y-3">
              {referees.map((ref) => (
                <div key={ref.id} className="border-l-4 border-blue-200 pl-4 py-2">
                  <p className="font-medium text-gray-900">{ref.name}</p>
                  <p className="text-sm text-gray-600 capitalize">
                    {ref.referee_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{ref.email}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Declarations</span>
            {declarationsValid ? (
              <Badge className="bg-green-100 text-green-800">Complete</Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800">Incomplete</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!declarations ? (
            <p className="text-sm text-gray-500">No declarations completed</p>
          ) : (
            <div className="space-y-4">
              <div className="border-l-4 border-blue-200 pl-4 py-2">
                <p className="font-medium text-gray-900">
                  Unspent Criminal Convictions
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {declarations.unspent_convictions ? 'Yes' : 'No'}
                </p>
                {declarations.unspent_convictions &&
                  declarations.unspent_convictions_details && (
                    <p className="text-xs text-gray-500 mt-2">
                      {declarations.unspent_convictions_details}
                    </p>
                  )}
              </div>

              <div className="border-l-4 border-blue-200 pl-4 py-2">
                <p className="font-medium text-gray-900">Subject to Sanctions</p>
                <p className="text-sm text-gray-600 mt-1">
                  {declarations.subject_sanctions ? 'Yes' : 'No'}
                </p>
                {declarations.subject_sanctions &&
                  declarations.subject_sanctions_details && (
                    <p className="text-xs text-gray-500 mt-2">
                      {declarations.subject_sanctions_details}
                    </p>
                  )}
              </div>

              <div className="border-l-4 border-blue-200 pl-4 py-2">
                <p className="font-medium text-gray-900">Subject to Restraining Order</p>
                <p className="text-sm text-gray-600 mt-1">
                  {declarations.restraining_order ? 'Yes' : 'No'}
                </p>
                {declarations.restraining_order &&
                  declarations.restraining_order_details && (
                    <p className="text-xs text-gray-500 mt-2">
                      {declarations.restraining_order_details}
                    </p>
                  )}
              </div>

              <div className="border-l-4 border-blue-200 pl-4 py-2">
                <p className="font-medium text-gray-900">Subject to Enquiries</p>
                <p className="text-sm text-gray-600 mt-1">
                  {declarations.subject_enquiries ? 'Yes' : 'No'}
                </p>
                {declarations.subject_enquiries &&
                  declarations.subject_enquiries_details && (
                    <p className="text-xs text-gray-500 mt-2">
                      {declarations.subject_enquiries_details}
                    </p>
                  )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-900">
                  {declarations.declaration_confirmed
                    ? '✓ Declarations confirmed'
                    : '✗ Declarations not confirmed'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between gap-4 pt-6">
        <Link
          href="/candidate/declarations"
          className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← Declarations
        </Link>

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Application'}
        </Button>
      </div>
    </div>
  );
}
