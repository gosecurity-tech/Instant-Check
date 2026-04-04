/**
 * Ballerine KYC/KYB Configuration
 *
 * Ballerine provides open-source identity verification infrastructure.
 * We use it for the candidate identity proofing step of BS7858 vetting:
 *   - Document capture (passport, driving licence, national ID)
 *   - Liveness detection (selfie match)
 *   - OCR extraction of document fields
 *
 * Self-hosted via Docker Compose alongside the main app,
 * or connect to Ballerine Cloud for managed infrastructure.
 */

export interface BallerineConfig {
  /** Base URL of the Ballerine workflow service */
  apiUrl: string;
  /** Flow ID for the KYC identity verification flow */
  kycFlowId: string;
  /** Optional: API key if using Ballerine Cloud */
  apiKey?: string;
  /** Theme overrides to match Instant Check branding */
  theme?: BallerineTheme;
}

export interface BallerineTheme {
  primaryColor: string;
  borderRadius: string;
  fontFamily: string;
}

/**
 * Default configuration — reads from env vars.
 * BALLERINE_API_URL: URL of the self-hosted Ballerine workflow service
 * BALLERINE_KYC_FLOW_ID: ID of the configured KYC flow
 * BALLERINE_API_KEY: Optional API key for Ballerine Cloud
 */
export function getBallerineConfig(): BallerineConfig {
  return {
    apiUrl: process.env.NEXT_PUBLIC_BALLERINE_API_URL ?? 'http://localhost:3500',
    kycFlowId: process.env.NEXT_PUBLIC_BALLERINE_KYC_FLOW_ID ?? 'kyc-identity-verification',
    apiKey: process.env.BALLERINE_API_KEY,
    theme: {
      primaryColor: '#1e40af',   // Instant Check blue
      borderRadius: '0.5rem',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
  };
}

/**
 * Ballerine verification statuses mapped to our internal check system.
 */
export enum BallerineVerificationStatus {
  Pending = 'pending',
  Processing = 'processing',
  Approved = 'approved',
  Rejected = 'rejected',
  NeedsReview = 'needs_review',
  Expired = 'expired',
}

/**
 * Map Ballerine verification result to our CheckStatus enum values.
 */
export function mapBallerineStatusToCheckStatus(
  ballerineStatus: BallerineVerificationStatus,
): string {
  switch (ballerineStatus) {
    case BallerineVerificationStatus.Approved:
      return 'passed';
    case BallerineVerificationStatus.Rejected:
      return 'failed';
    case BallerineVerificationStatus.NeedsReview:
      return 'needs_review';
    case BallerineVerificationStatus.Processing:
      return 'in_progress';
    case BallerineVerificationStatus.Expired:
      return 'failed';
    case BallerineVerificationStatus.Pending:
    default:
      return 'awaiting_candidate';
  }
}
