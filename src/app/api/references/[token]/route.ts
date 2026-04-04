import { NextResponse, type NextRequest } from 'next/server';
import { getReferenceByToken, submitReferenceResponse } from '@/lib/services/references';

/**
 * GET /api/references/[token]
 * Public endpoint — returns reference request info for the referee form.
 * No auth required — access controlled by token.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const data = await getReferenceByToken(token);

    if (!data) {
      return NextResponse.json(
        { error: 'This reference link is invalid, expired, or has already been submitted.' },
        { status: 404 },
      );
    }

    const { request: refRequest, candidate } = data;

    return NextResponse.json({
      request_id: refRequest.id,
      referee_name: refRequest.referee_name,
      referee_email: refRequest.referee_email,
      reference_type: refRequest.reference_type,
      organisation_name: refRequest.referee_organisation,
      candidate_name: candidate.full_name,
    });
  } catch (error) {
    console.error('Reference GET error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/references/[token]
 * Submit a completed reference response.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const body = await request.json();

    // Get IP address for audit trail
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') ?? '0.0.0.0';

    const responseId = await submitReferenceResponse(token, body, ip);

    return NextResponse.json({
      message: 'Reference submitted successfully. Thank you for your time.',
      responseId,
    });
  } catch (error) {
    console.error('Reference POST error:', error);
    const message = error instanceof Error ? error.message : 'Reference submission failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
