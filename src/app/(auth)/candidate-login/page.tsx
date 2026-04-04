'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInWithMagicLink } from '@/lib/auth/actions';
import { magicLinkSchema, type MagicLinkInput } from '@/lib/validators/auth';

export default function CandidateLoginPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<MagicLinkInput>({
    resolver: zodResolver(magicLinkSchema),
  });

  async function onSubmit(data: MagicLinkInput) {
    setServerError(null);

    const redirectUrl = `${window.location.origin}/auth/callback`;
    const result = await signInWithMagicLink(data, redirectUrl);

    if (!result.success) {
      setServerError(result.error ?? 'Something went wrong');
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          Check your email
        </h2>
        <p className="text-sm text-gray-500">
          We&apos;ve sent a magic link to{' '}
          <strong>{getValues('email')}</strong>. Click the link in your email to
          sign in and complete your vetting submission.
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-6 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <>
      <h2 className="mb-2 text-lg font-semibold text-gray-900">
        Candidate Access
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        Enter the email address provided to your employer. We&apos;ll send you a
        secure link — no password needed.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="candidate@email.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Sending link…' : 'Send magic link'}
        </button>
      </form>
    </>
  );
}
