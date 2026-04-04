import { createClient } from '@/lib/supabase/server';
import { requireInternalUser } from '@/lib/auth/server';
import { getSLAStats } from '@/lib/services/sla';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  // Get authenticated user
  const user = await requireInternalUser();

  if (!user || !user.organisationId) {
    return NextResponse.json(
      { error: 'Unauthorized or missing organization' },
      { status: 401 }
    );
  }

  try {
    const stats = await getSLAStats(user.organisationId);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching SLA stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SLA statistics' },
      { status: 500 }
    );
  }
}
