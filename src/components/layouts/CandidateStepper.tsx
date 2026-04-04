'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';

const STEPS = [
  { label: 'Identity', href: '/candidate/identity', step: 1 },
  { label: 'Addresses', href: '/candidate/address', step: 2 },
  { label: 'Activity', href: '/candidate/activity', step: 3 },
  { label: 'Referees', href: '/candidate/referees', step: 4 },
  { label: 'Declarations', href: '/candidate/declarations', step: 5 },
  { label: 'Review', href: '/candidate/review', step: 6 },
] as const;

function getActiveStep(pathname: string): number {
  const match = STEPS.find(
    (s) => pathname === s.href || pathname.startsWith(`${s.href}/`),
  );
  return match?.step ?? 0;
}

export function CandidateStepper() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const activeStep = getActiveStep(pathname);

  // If candidate has submitted, show submitted state
  if (pathname === '/candidate/submitted') {
    return null; // No stepper on the submitted page
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/candidate-login');
    router.refresh();
  }

  return (
    <div className="border-b border-gray-200 bg-white">
      {/* Header bar */}
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
        <span className="text-lg font-bold text-gray-900">
          Instant<span className="text-blue-600">Check</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden sm:inline">
            {user?.fullName ?? user?.email}
          </span>
          <button
            onClick={handleSignOut}
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Step indicator */}
      <div className="mx-auto max-w-3xl px-6 pb-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const isActive = step.step === activeStep;
            const isComplete = step.step < activeStep;
            const isLast = idx === STEPS.length - 1;

            return (
              <div key={step.href} className="flex flex-1 items-center">
                <Link
                  href={step.href}
                  className="flex flex-col items-center gap-1"
                >
                  {/* Circle */}
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                      isActive && 'bg-blue-600 text-white',
                      isComplete && 'bg-green-500 text-white',
                      !isActive && !isComplete && 'bg-gray-200 text-gray-500',
                    )}
                  >
                    {isComplete ? '✓' : step.step}
                  </div>
                  {/* Label */}
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isActive ? 'text-blue-600' : 'text-gray-500',
                    )}
                  >
                    {step.label}
                  </span>
                </Link>

                {/* Connector line */}
                {!isLast && (
                  <div
                    className={cn(
                      'mx-2 h-0.5 flex-1',
                      isComplete ? 'bg-green-500' : 'bg-gray-200',
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
