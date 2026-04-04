import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireCandidateUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export const metadata = { title: 'Submission Complete — Instant Check' };

export default async function CandidateSubmittedPage() {
  const user = await requireCandidateUser();
  const supabase = await createClient();

  // Check submission status
  const { data: candidateData, error: candidateError } = await supabase
    .from('candidates')
    .select('has_submitted, submitted_at')
    .eq('id', user.candidateId!)
    .single();

  if (candidateError || !candidateData?.has_submitted) {
    redirect('/candidate/identity');
  }

  // Get case reference and status
  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .select('case_reference, status')
    .eq('candidate_id', user.candidateId!)
    .limit(1)
    .single();

  const caseReference = caseData?.case_reference || 'N/A';
  const submittedAt = candidateData?.submitted_at
    ? new Date(candidateData.submitted_at).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  return (
    <div className="space-y-6">
      {/* Success Summary */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Submission Complete
            </h1>
            <p className="mt-3 text-base text-gray-600">
              Your information has been submitted for case{' '}
              <span className="font-semibold">{caseReference}</span>
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 text-left">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">Submitted at:</span>
            </p>
            <p className="mt-2 text-base text-gray-900">{submittedAt}</p>
          </div>
        </CardContent>
      </Card>

      {/* What Happens Next */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What Happens Next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Your vetting application is now being processed. Here's what you can expect:
          </p>
          <ul className="space-y-3">
            <li className="flex gap-3 text-sm">
              <span className="flex-shrink-0 rounded-full bg-blue-100 h-6 w-6 flex items-center justify-center font-medium text-blue-600">
                1
              </span>
              <span className="text-gray-600">
                <span className="font-medium text-gray-900">Identity verification</span> - Your documents will be reviewed and verified
              </span>
            </li>
            <li className="flex gap-3 text-sm">
              <span className="flex-shrink-0 rounded-full bg-blue-100 h-6 w-6 flex items-center justify-center font-medium text-blue-600">
                2
              </span>
              <span className="text-gray-600">
                <span className="font-medium text-gray-900">Referee contact</span> - We'll contact your referees to verify your employment history
              </span>
            </li>
            <li className="flex gap-3 text-sm">
              <span className="flex-shrink-0 rounded-full bg-blue-100 h-6 w-6 flex items-center justify-center font-medium text-blue-600">
                3
              </span>
              <span className="text-gray-600">
                <span className="font-medium text-gray-900">Background checks</span> - We'll verify your address and activity history
              </span>
            </li>
            <li className="flex gap-3 text-sm">
              <span className="flex-shrink-0 rounded-full bg-blue-100 h-6 w-6 flex items-center justify-center font-medium text-blue-600">
                4
              </span>
              <span className="text-gray-600">
                <span className="font-medium text-gray-900">Final review</span> - You'll be notified of the outcome via email
              </span>
            </li>
          </ul>
          <p className="text-xs text-gray-500 mt-6">
            This process typically takes 5-10 business days. If we need any clarification,
            we'll contact you immediately using the email address on your application.
          </p>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <div className="flex justify-center pt-4">
        <Link href="/api/auth/logout">
          <Button className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Sign Out
          </Button>
        </Link>
      </div>
    </div>
  );
}
