'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSubmissionStatus } from '../actions';
import { BallerineKYC } from '@/components/shared/BallerineKYC';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Shield,
  FileText,
  MapPin,
  Briefcase,
  Users,
} from 'lucide-react';

type VerificationState = 'pending' | 'verifying' | 'verified';

export default function CandidateIdentityPage() {
  const router = useRouter();
  const [verificationState, setVerificationState] =
    useState<VerificationState>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkSubmissionStatus() {
      try {
        const status = await getSubmissionStatus();
        if (status.hasSubmitted) {
          setVerificationState('verified');
        }
      } catch (err) {
        console.error('Error checking submission status:', err);
        setError('Failed to load status');
      } finally {
        setIsLoading(false);
      }
    }

    checkSubmissionStatus();
  }, []);

  const handleVerificationComplete = () => {
    setVerificationState('verified');
  };

  const handleVerificationError = (errorMsg: string) => {
    setError(errorMsg);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Identity Verification</h2>
          <p className="mt-2 text-sm text-gray-500">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Identity Verification</h2>
        <p className="mt-2 text-sm text-gray-500">
          Step 1 of your BS7858 screening process
        </p>
      </div>

      {/* Pending State */}
      {verificationState === 'pending' && (
        <>
          {/* Welcome Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Welcome to Instant Check
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                As part of your BS7858 screening, you'll need to provide:
              </p>
              <ul className="space-y-3 ml-2">
                <li className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">Identity verification</span> - Verify your identity with a government-issued document
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">5-year address history</span> - Complete with no gaps
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Briefcase className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">5-year activity history</span> - Employment, education, or other activities
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">Referee details</span> - At least one professional referee
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">Self-declarations</span> - Answer questions about your background
                  </span>
                </li>
              </ul>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <Button
                  onClick={() => setVerificationState('verifying')}
                  className="w-full rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Start Verification
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Verifying State */}
      {verificationState === 'verifying' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Document Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-6">
                Verify your identity by scanning an official document (passport, driving licence, or national ID) and taking a selfie. This uses secure, automated verification powered by Ballerine.
              </p>
              {error && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              <BallerineKYC
                onComplete={handleVerificationComplete}
                onError={handleVerificationError}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Verified State */}
      {verificationState === 'verified' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Identity Verified</span>
                <Badge className="bg-green-100 text-green-800">Complete</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Identity Verified
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Your identity document has been submitted for verification. You can now continue with the remaining sections of your application.
                </p>
              </div>
              <div className="pt-6">
                <Link
                  href="/candidate/address"
                  className="inline-flex rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Next: Address History →
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
