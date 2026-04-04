import { getBallerineConfig, type BallerineVerificationStatus } from './config';

/**
 * Server-side Ballerine API client.
 * Used by API routes and server actions to interact with the
 * Ballerine workflow service (self-hosted or cloud).
 *
 * NOT for use in client components — use the SDK widget instead.
 */

interface CreateFlowRunParams {
  /** The candidate's case ID in our system */
  caseId: string;
  /** Candidate email for the verification flow */
  candidateEmail: string;
  /** Candidate full name */
  candidateName: string;
  /** Our internal candidate ID */
  candidateId: string;
  /** Organisation ID for multi-tenant scoping */
  organisationId: string;
}

interface FlowRunResponse {
  id: string;
  status: BallerineVerificationStatus;
  createdAt: string;
  result?: VerificationResult;
}

interface VerificationResult {
  documentType?: string;
  documentNumber?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  nationality?: string;
  expiryDate?: string;
  livenessScore?: number;
  ocrConfidence?: number;
  verificationDecision: BallerineVerificationStatus;
  riskSignals: string[];
}

export class BallerineClient {
  private apiUrl: string;
  private apiKey?: string;
  private kycFlowId: string;

  constructor() {
    const config = getBallerineConfig();
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.kycFlowId = config.kycFlowId;
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      h['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return h;
  }

  /**
   * Create a new KYC verification flow run for a candidate.
   * Returns the flow run ID which we store against the case_check record.
   */
  async createVerificationFlow(params: CreateFlowRunParams): Promise<FlowRunResponse> {
    const response = await fetch(
      `${this.apiUrl}/api/v1/external/workflows/run`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          workflowDefinitionId: this.kycFlowId,
          context: {
            entity: {
              type: 'individual',
              data: {
                email: params.candidateEmail,
                firstName: params.candidateName.split(' ')[0],
                lastName: params.candidateName.split(' ').slice(1).join(' '),
              },
            },
            metadata: {
              // Custom metadata linking back to our system
              caseId: params.caseId,
              candidateId: params.candidateId,
              organisationId: params.organisationId,
              source: 'instant-check',
            },
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Ballerine API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Get the current status and result of a verification flow run.
   */
  async getVerificationStatus(flowRunId: string): Promise<FlowRunResponse> {
    const response = await fetch(
      `${this.apiUrl}/api/v1/external/workflows/${flowRunId}`,
      {
        method: 'GET',
        headers: this.headers,
      },
    );

    if (!response.ok) {
      throw new Error(
        `Ballerine API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Handle webhook callback from Ballerine when a verification completes.
   * Called by our /api/webhooks/ballerine route.
   */
  static parseWebhookPayload(payload: Record<string, unknown>): {
    flowRunId: string;
    status: BallerineVerificationStatus;
    caseId?: string;
    candidateId?: string;
    result?: VerificationResult;
  } {
    return {
      flowRunId: payload.id as string,
      status: payload.status as BallerineVerificationStatus,
      caseId: (payload.context as Record<string, unknown>)?.metadata
        ? ((payload.context as Record<string, Record<string, string>>).metadata.caseId)
        : undefined,
      candidateId: (payload.context as Record<string, unknown>)?.metadata
        ? ((payload.context as Record<string, Record<string, string>>).metadata.candidateId)
        : undefined,
      result: payload.result as VerificationResult | undefined,
    };
  }
}
