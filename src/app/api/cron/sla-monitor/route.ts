import { NextRequest, NextResponse } from 'next/server';
import {
  getOverdueCases,
  getApproachingSLACases,
  createSLABreachTask,
  createSLAWarningTask,
} from '@/lib/services/sla';
import { createNotification } from '@/lib/services/notifications';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * POST /api/cron/sla-monitor
 * Monitors SLA breaches and warnings for vetting cases
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
    let overdueCasesCount = 0;
    let warningCasesCount = 0;
    let tasksCreated = 0;
    let notificationsSent = 0;

    // Check for overdue cases (SLA breached)
    const overdueCases = await getOverdueCases();
    for (const caseItem of overdueCases) {
      overdueCasesCount++;

      // Create SLA breach task
      const taskId = await createSLABreachTask(
        caseItem.id,
        caseItem.organisation_id,
        caseItem.assigned_to || SYSTEM_USER_ID,
        SYSTEM_USER_ID
      );

      if (taskId) {
        tasksCreated++;
      }

      // Create notification for assigned user if applicable
      if (caseItem.assigned_to) {
        const notificationSent = await createNotification(
          caseItem.assigned_to,
          {
            title: `SLA Breach: Case ${caseItem.case_reference}`,
            body: `This case has exceeded its SLA deadline. Immediate attention required.`,
            link: `/cases/${caseItem.id}`,
          }
        );

        if (notificationSent) {
          notificationsSent++;
        }
      }
    }

    // Check for approaching SLA deadlines (warning)
    const approachingCases = await getApproachingSLACases(undefined, 3);
    for (const caseItem of approachingCases) {
      warningCasesCount++;

      // Create SLA warning task
      const taskId = await createSLAWarningTask(
        caseItem.id,
        caseItem.organisation_id,
        caseItem.assigned_to || SYSTEM_USER_ID,
        SYSTEM_USER_ID,
        caseItem.days_remaining
      );

      if (taskId) {
        tasksCreated++;
      }

      // Create notification for assigned user if applicable
      if (caseItem.assigned_to) {
        const notificationSent = await createNotification(
          caseItem.assigned_to,
          {
            title: `SLA Warning: Case ${caseItem.case_reference}`,
            body: `This case will breach SLA in ${caseItem.days_remaining} day(s). Please prioritize.`,
            link: `/cases/${caseItem.id}`,
          }
        );

        if (notificationSent) {
          notificationsSent++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      overdueCases: overdueCasesCount,
      warningCases: warningCasesCount,
      tasksCreated,
      notificationsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('SLA Monitor Error:', error);
    return NextResponse.json(
      {
        error: 'SLA monitor failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
