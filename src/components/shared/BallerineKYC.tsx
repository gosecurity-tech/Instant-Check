'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getBallerineConfig } from '@/lib/ballerine';

/**
 * Declare the global `BallerineSDK` type loaded via CDN script tag.
 * The SDK is loaded dynamically to avoid SSR issues and keep the
 * main bundle size small.
 */
declare global {
  interface Window {
    BallerineSDK?: {
      flows: {
        init: (config: Record<string, unknown>) => Promise<void>;
        openModal: (flowId: string, options: Record<string, unknown>) => void;
      };
    };
  }
}

interface BallerineKYCProps {
  /** Called when the verification flow completes successfully */
  onComplete?: (flowRunId: string) => void;
  /** Called if the user exits the flow early */
  onExit?: () => void;
  /** Called on any error during the flow */
  onError?: (error: string) => void;
  /** Candidate's email to prefill */
  candidateEmail?: string;
  /** Candidate's name to prefill */
  candidateName?: string;
}

type FlowStatus = 'idle' | 'loading' | 'active' | 'completed' | 'error';

const BALLERINE_CDN_URL =
  'https://cdn.ballerine.io/1.1.22/ballerine-sdk.umd.min.js';

/**
 * Load the Ballerine SDK script from CDN.
 * Returns a promise that resolves when the script is ready.
 */
function loadBallerineScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.BallerineSDK) {
      resolve();
      return;
    }

    const existing = document.querySelector(
      `script[src="${BALLERINE_CDN_URL}"]`,
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Ballerine SDK')),
      );
      return;
    }

    const script = document.createElement('script');
    script.src = BALLERINE_CDN_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Ballerine SDK'));
    document.head.appendChild(script);
  });
}

/**
 * Ballerine KYC Identity Verification Widget.
 *
 * Embeds the Ballerine Web UI SDK (loaded via CDN) to guide candidates through:
 * 1. Document selection (passport, driving licence, national ID)
 * 2. Document capture (front + back)
 * 3. Selfie / liveness check
 * 4. OCR extraction and verification
 *
 * Results are sent back via webhook to /api/webhooks/ballerine
 * and the flow run ID is stored on the case_check record.
 */
export function BallerineKYC({
  onComplete,
  onExit,
  onError,
  candidateEmail,
  candidateName,
}: BallerineKYCProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<FlowStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const initializedRef = useRef(false);

  const initFlow = useCallback(async () => {
    if (initializedRef.current || !containerRef.current) return;
    initializedRef.current = true;

    const config = getBallerineConfig();
    setStatus('loading');

    try {
      // Load SDK from CDN
      await loadBallerineScript();

      const sdk = window.BallerineSDK;
      if (!sdk) {
        throw new Error('Ballerine SDK failed to initialise');
      }

      await sdk.flows.init({
        uiConfig: {
          flows: {
            [config.kycFlowId]: {
              steps: [
                { name: 'welcome', id: 'welcome' },
                { name: 'document-selection', id: 'document-selection' },
                { name: 'document-photo', id: 'document-photo' },
                { name: 'check-document', id: 'check-document' },
                { name: 'selfie', id: 'selfie' },
                { name: 'check-selfie', id: 'check-selfie' },
                { name: 'loading', id: 'loading' },
                { name: 'final', id: 'final' },
              ],
              userInfo: {
                email: candidateEmail,
                firstName: candidateName?.split(' ')[0],
                lastName: candidateName?.split(' ').slice(1).join(' '),
              },
            },
          },
          general: {
            colors: {
              primary: config.theme?.primaryColor ?? '#1e40af',
            },
            borderRadius: config.theme?.borderRadius ?? '0.5rem',
            fonts: {
              name: config.theme?.fontFamily ?? 'Inter, system-ui, sans-serif',
            },
          },
        },
        endUserInfo: {
          id: candidateEmail ?? 'candidate',
        },
        backendConfig: {
          baseUrl: config.apiUrl,
          auth: {
            method: 'jwt',
            authorizationHeader: config.apiKey
              ? `Bearer ${config.apiKey}`
              : '',
          },
        },
      });

      sdk.flows.openModal(config.kycFlowId, {});
      setStatus('active');

      // Listen for flow completion events via postMessage
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'ballerine.flow.complete') {
          setStatus('completed');
          onComplete?.(event.data.flowRunId ?? 'unknown');
        }
        if (event.data?.type === 'ballerine.flow.exit') {
          onExit?.();
        }
        if (event.data?.type === 'ballerine.flow.error') {
          setStatus('error');
          setErrorMessage(event.data.message ?? 'Verification failed');
          onError?.(event.data.message ?? 'Verification failed');
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to load verification widget';
      setStatus('error');
      setErrorMessage(msg);
      onError?.(msg);
    }
  }, [candidateEmail, candidateName, onComplete, onExit, onError]);

  useEffect(() => {
    initFlow();
  }, [initFlow]);

  return (
    <div className="space-y-4">
      {status === 'loading' && (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-12">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-3 text-sm text-gray-500">
              Loading identity verification…
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h3 className="font-semibold text-red-800">Verification Error</h3>
          <p className="mt-1 text-sm text-red-700">
            {errorMessage ?? 'Something went wrong. Please try again.'}
          </p>
          <button
            onClick={() => {
              initializedRef.current = false;
              setStatus('idle');
              setErrorMessage(null);
              initFlow();
            }}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {status === 'completed' && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
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
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-green-800">
            Identity Verification Submitted
          </h3>
          <p className="mt-1 text-sm text-green-700">
            Your documents are being verified. This usually takes a few minutes.
          </p>
        </div>
      )}

      {/* SDK mounts its modal UI here */}
      <div ref={containerRef} id="ballerine-kyc-container" />
    </div>
  );
}
