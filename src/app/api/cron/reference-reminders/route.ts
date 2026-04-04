import { NextRequest, NextResponse } from 'next/server';
import { getPendingReferenceReminders, recordReminderSent } from '@/lib/services/notifications';
import { recordAuditLog } from '@/lib/audit';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * GET /api/cron/reference-reminders
 * Sends reference request reminders to referees
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
    let remindersProcessed = 0;
    const referenceIds: string[] = [];

    // Get pending reminders (3-7 days since request)
    const pendingReminders = await getPendingReferenceReminders(3, 7);

    for (const reminder of pendingReminders) {
      remindersProcessed++;
      referenceIds.push(reminder.id);

      // Log that a reminder would be sent (email sending is future integration)
      console.info(
        `[Reference Reminder] Would send email reminder for request ${reminder.id} to ${reminder.referee_email}`
      );

      // Record reminder as sent
      await recordReminderSent(reminder.id);

      // Record audit log
      await recordAuditLog(
        { id: SYSTEM_USER_ID },
        {
          action: 'reference.reminder_sent',
          entityType: 'reference_request',
          entityId: reminder.id,
          metadata: {
            reminder_sent_at: new Date().toISOString(),
            referee_email: reminder.referee_email,
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      remindersProcessed,
      referenceIds,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Reference Reminders Error:', error);
    return NextResponse.json(
      {
        error: 'Reference reminders failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
