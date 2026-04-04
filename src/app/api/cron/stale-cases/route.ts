import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/services/notifications';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
const STALE_THRESHOLD_DAYS = 14;

interface StaleCase {
  id: string;
  reference_number: string;
  assigned_to: string | null;
  updated_at: string;
  status: string;
}

/**
 * GET /api/cron/stale-cases
 * Identifies and creates tasks for cases with no activity for 14+ days
 * Called daily by Vercel Cron
 *
 * Security: Requires Authorization header with Bearer {CRON_SECRET}
 */
export async function GET(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Missing CRON_SECRET configuration' },
      { status: 500 }
    );
  }

  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader !== expectedAuth) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const admin = createAdminClient();
    let staleCasesCount = 0;
    let tasksCreated = 0;

    // Calculate threshold date (14 days ago)
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - STALE_THRESHOLD_DAYS);
    const thresholdISO = thresholdDate.toISOString();

    // Query for stale cases
    const { data: staleCases, error: caseError } = await admin
      .from('cases')
      .select(
        `
        id,
        reference_number,
        assigned_to,
        updated_at,
        status,
        organisation_id,
        internal_users!assigned_to (display_name),
        clients!client_id (name),
        candidates (full_name)
      `
      )
      .in('status', ['in_progress', 'awaiting_third_party'])
      .lt('updated_at', thresholdISO);

    if (caseError) {
      throw new Error(`Failed to query stale cases: ${caseError.message}`);
    }

    if (!staleCases || staleCases.length === 0) {
      return NextResponse.json({
        success: true,
        staleCases: 0,
        tasksCreated: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Process each stale case
    for (const caseItem of staleCases) {
      staleCasesCount++;

      const taskTitle = `Stale Case: ${caseItem.reference_number} — no activity for ${STALE_THRESHOLD_DAYS}+ days`;

      // Check for duplicate task
      const { data: existingTasks } = await admin
        .from('tasks')
        .select('id')
        .eq('case_id', caseItem.id)
        .ilike('title', 'Stale Case:%')
        .not('status', 'in', '("completed","cancelled")');

      // Only create if no existing stale case task
      if (!existingTasks || existingTasks.length === 0) {
        // Create task
        const { data: newTask, error: taskError } = await admin
          .from('tasks')
          .insert({
            case_id: caseItem.id,
            organisation_id: caseItem.organisation_id,
            title: taskTitle,
            description: `This case has not been updated for ${STALE_THRESHOLD_DAYS} or more days. Please review status and take appropriate action.`,
            priority: 'medium',
            status: 'open',
            assigned_to: caseItem.assigned_to,
            created_by: SYSTEM_USER_ID,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (!taskError && newTask) {
          tasksCreated++;

          // Create notification for assigned user if exists
          if (caseItem.assigned_to) {
            try {
              await createNotification(caseItem.assigned_to, {
                title: `Stale Case: ${caseItem.reference_number}`,
                body: `No activity for ${STALE_THRESHOLD_DAYS} days. Please review and update.`,
                link: `/cases/${caseItem.id}`,
              });
            } catch (notifError) {
              console.warn(
                `Failed to create notification for user ${caseItem.assigned_to}:`,
                notifError
              );
            }
          }
        } else if (taskError) {
          console.error(
            `Failed to create task for case ${caseItem.id}:`,
            taskError
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      staleCases: staleCasesCount,
      tasksCreated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Stale Cases Monitor Error:', error);
    return NextResponse.json(
      {
        error: 'Stale cases monitor failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
