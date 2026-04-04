import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { BallerineClient, mapBallerineStatusToCheckStatus } from '@/lib/ballerine';

/**
 * POST /api/webhooks/ballerine
 *
 * Receives webhook callbacks from Ballerine when an identity
 * verification flow completes, fails, or needs manual review.
 *
 * Flow:
 * 1. Candidate completes Ballerine KYC widget
 * 2. Ballerine processes documents + liveness
 * 3. Ballerine sends webhook here with result
 * 4. We update the case_check record with the verification outcome
 * 5. If all checks pass, the case status can auto-advance
 */
export async function POST(request: Request) {
  const headersList = await headers();

  // Verify webhook signature from Ballerine
  const signature = headersList.get('x-ballerine-signature');
  const webhookSecret = process.env.BALLERINE_WEBHOOK_SECRET;

  if (webhookSecret && signature !== webhookSecret) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const payload = await request.json();

    // Parse the Ballerine webhook payload
    const { flowRunId, status, caseId, candidateId, result } =
      BallerineClient.parseWebhookPayload(payload);

    if (!flowRunId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const checkStatus = mapBallerineStatusToCheckStatus(status);

    // Update the identity check record linked to this Ballerine flow
    if (caseId) {
      // Find the case_check record for identity verification on this case
      const { data: caseCheck, error: findError } = await supabase
        .from('case_checks')
        .select('id')
        .eq('case_id', caseId)
        .eq('check_type', 'identity_verification')
        .single();

      if (caseCheck && !findError) {
        // Update check status and store Ballerine result data
        await supabase
          .from('case_checks')
          .update({
            status: checkStatus,
            notes: JSON.stringify({
              ballerine_flow_run_id: flowRunId,
              verification_status: status,
              document_type: result?.documentType,
              document_number: result?.documentNumber,
              ocr_name: result
                ? `${result.firstName ?? ''} ${result.lastName ?? ''}`.trim()
                : null,
              date_of_birth: result?.dateOfBirth,
              nationality: result?.nationality,
              expiry_date: result?.expiryDate,
              liveness_score: result?.livenessScore,
              ocr_confidence: result?.ocrConfidence,
              risk_signals: result?.riskSignals,
            }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', caseCheck.id);

        // Log to audit trail
        await supabase.from('audit_logs').insert({
          action: 'identity_verification_result',
          entity_type: 'case_check',
          entity_id: caseCheck.id,
          metadata: {
            case_id: caseId,
            candidate_id: candidateId,
            ballerine_flow_run_id: flowRunId,
            verification_status: status,
            check_status: checkStatus,
          },
        });
      }
    }

    return NextResponse.json({ received: true, flowRunId, status: checkStatus });
  } catch (error) {
    console.error('Ballerine webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
