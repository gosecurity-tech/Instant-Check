import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export async function sendEmail(params: SendEmailParams): Promise<{ id: string } | null> {
  try {
    const client = getResendClient();
    const fromAddress = process.env.EMAIL_FROM || 'noreply@instantcheck.co.uk';

    const result = await client.emails.send({
      from: fromAddress,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
      tags: params.tags,
    });

    if (result.error) {
      console.error('Email send error:', {
        error: result.error,
        to: params.to,
        subject: params.subject,
      });
      return null;
    }

    console.log('Email sent successfully:', {
      id: result.data?.id,
      to: params.to,
      subject: params.subject,
    });

    return { id: result.data?.id || '' };
  } catch (error) {
    console.error('Unexpected error sending email:', error);
    return null;
  }
}
